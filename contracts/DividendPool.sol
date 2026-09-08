// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

interface IKTUTokenDividendPool {
    function getPastVotes(
        address account,
        uint256 timepoint
    ) external view returns (uint256);

    function getPastTotalSupply(
        uint256 timepoint
    ) external view returns (uint256);

    function holderCount() external view returns (uint256);

    function holderAt(uint256 index) external view returns (address);
}

contract DividendPool is ReentrancyGuard {
    IKTUTokenDividendPool public immutable token;

    address public immutable administrator;
    address public tokenSale;

    uint256 public constant MAX_PAYOUT_BATCH_SIZE = 50;

    uint256 public currentPeriod;
    uint256 public periodDuration;
    uint256 public currentPeriodDuration;
    uint256 public periodStartedAt;
    uint256 public snapshotBlock;
    uint256 public periodFund;
    uint256 public eligibleSnapshotSupply;
    uint256 public periodRemaining;

    /// @dev `accountedEtherBalance` reserves the active period's unpaid fund
    /// and all deferred dividends. Successful transfers and released rounding
    /// remainders reduce it; failed transfers remain reserved until claimed.
    uint256 public accountedEtherBalance;
    uint256 public payoutInvestorCount;
    uint256 public payoutCursor;

    mapping(address => uint256) public lastPaidPeriod;
    mapping(address => uint256) public deferredDividends;

    event TokenSaleConfigured(address indexed tokenSale);

    event PeriodDurationChanged(uint256 previousDuration, uint256 newDuration);

    event DividendReceived(address indexed sender, uint256 amount);

    event DividendPeriodClosed(
        uint256 indexed period,
        uint256 periodDuration,
        uint256 indexed snapshotBlock,
        uint256 dividendFund,
        uint256 eligibleSnapshotSupply,
        uint256 startedAt,
        uint256 closedAt
    );

    event DividendPaid(
        uint256 indexed period,
        address indexed investor,
        uint256 amount
    );

    event DividendDeferred(
        uint256 indexed period,
        address indexed investor,
        uint256 amount
    );

    event DividendBatchPaid(
        uint256 indexed period,
        uint256 fromInvestorIndex,
        uint256 toInvestorIndex,
        uint256 totalPaid
    );

    constructor(address _tokenAddress) {
        require(_tokenAddress != address(0), "Invalid token address");

        token = IKTUTokenDividendPool(_tokenAddress);
        administrator = msg.sender;
        periodDuration = 3 minutes;
        currentPeriodDuration = periodDuration;
        periodStartedAt = block.timestamp;
    }

    receive() external payable {
        emit DividendReceived(msg.sender, msg.value);
    }

    modifier onlyAdministrator() {
        require(
            msg.sender == administrator,
            "Only administrator can perform this action"
        );
        _;
    }

    function setTokenSale(address _tokenSale) external onlyAdministrator {
        require(_tokenSale != address(0), "Invalid token sale address");

        require(tokenSale == address(0), "Token sale already configured");

        tokenSale = _tokenSale;

        emit TokenSaleConfigured(_tokenSale);
    }

    function setPeriodDuration(
        uint256 _newDuration
    ) external onlyAdministrator {
        require(_newDuration > 0, "Period duration must be greater than zero");

        uint256 previousDuration = periodDuration;
        periodDuration = _newDuration;

        emit PeriodDurationChanged(previousDuration, _newDuration);
    }

    function closeDividendPeriod() external {
        require(tokenSale != address(0), "Token sale is not configured");

        require(
            payoutCursor == payoutInvestorCount,
            "Previous dividend payout is incomplete"
        );

        require(
            block.timestamp >= periodStartedAt + currentPeriodDuration,
            "Dividend period is still active"
        );

        require(
            address(this).balance >= accountedEtherBalance,
            "Dividend pool balance is inconsistent"
        );

        uint256 periodCount =
            (block.timestamp - periodStartedAt) / currentPeriodDuration;
        uint256 closedPeriodStartedAt = periodStartedAt;
        uint256 closedPeriodDuration = currentPeriodDuration;
        periodStartedAt += periodCount * currentPeriodDuration;
        currentPeriodDuration = periodDuration;

        currentPeriod += 1;
        snapshotBlock = block.number - 1;

        uint256 snapshotSupply = token.getPastTotalSupply(snapshotBlock);
        uint256 unsoldTokenSupply = token.getPastVotes(
            tokenSale,
            snapshotBlock
        );

        eligibleSnapshotSupply = snapshotSupply - unsoldTokenSupply;

        uint256 availableFund = address(this).balance - accountedEtherBalance;

        if (availableFund > 0 && eligibleSnapshotSupply > 0) {
            periodFund = availableFund;
            periodRemaining = availableFund;
            accountedEtherBalance += availableFund;
            payoutInvestorCount = token.holderCount();
            payoutCursor = 0;
        } else {
            periodFund = 0;
            periodRemaining = 0;
            payoutInvestorCount = 0;
            payoutCursor = 0;
        }

        emit DividendPeriodClosed(
            currentPeriod,
            closedPeriodDuration,
            snapshotBlock,
            periodFund,
            eligibleSnapshotSupply,
            closedPeriodStartedAt,
            block.timestamp
        );
    }

    function payDividendBatch(
        uint256 _maxInvestors
    )
        external
        nonReentrant
        returns (uint256 processedInvestors, uint256 totalPaid)
    {
        require(
            _maxInvestors > 0 && _maxInvestors <= MAX_PAYOUT_BATCH_SIZE,
            "Invalid payout batch size"
        );

        require(
            payoutCursor < payoutInvestorCount,
            "No dividend payout pending"
        );

        uint256 fromInvestorIndex = payoutCursor;
        uint256 toInvestorIndex = fromInvestorIndex + _maxInvestors;

        if (toInvestorIndex > payoutInvestorCount) {
            toInvestorIndex = payoutInvestorCount;
        }

        payoutCursor = toInvestorIndex;

        for (
            uint256 index = fromInvestorIndex;
            index < toInvestorIndex;
            index++
        ) {
            totalPaid += _payDividend(token.holderAt(index));
        }

        processedInvestors = toInvestorIndex - fromInvestorIndex;

        if (payoutCursor == payoutInvestorCount) {
            _releaseRoundingRemainder();
        }

        emit DividendBatchPaid(
            currentPeriod,
            fromInvestorIndex,
            toInvestorIndex,
            totalPaid
        );
    }

    function claimDividend() external nonReentrant returns (uint256) {
        uint256 amount = deferredDividends[msg.sender];
        deferredDividends[msg.sender] = 0;

        amount += _allocateCurrentDividend(msg.sender);

        require(amount > 0, "No dividend available");

        accountedEtherBalance -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");

        require(success, "Dividend transfer failed");

        emit DividendPaid(currentPeriod, msg.sender, amount);

        return amount;
    }

    function pendingDividend(
        address _investor
    ) external view returns (uint256) {
        uint256 amount = deferredDividends[_investor];

        if (
            periodFund == 0 ||
            lastPaidPeriod[_investor] == currentPeriod ||
            _investor == tokenSale
        ) {
            return amount;
        }

        uint256 investorBalance = token.getPastVotes(_investor, snapshotBlock);

        return
            amount +
            Math.mulDiv(periodFund, investorBalance, eligibleSnapshotSupply);
    }

    function nextPeriodCloseAt() external view returns (uint256) {
        return periodStartedAt + currentPeriodDuration;
    }

    function _payDividend(address _investor) internal returns (uint256) {
        uint256 amount = _allocateCurrentDividend(_investor);

        if (amount == 0) {
            return 0;
        }

        (bool success, ) = payable(_investor).call{value: amount}("");

        if (success) {
            accountedEtherBalance -= amount;

            emit DividendPaid(currentPeriod, _investor, amount);

            return amount;
        }

        deferredDividends[_investor] += amount;

        emit DividendDeferred(currentPeriod, _investor, amount);

        return 0;
    }

    function _allocateCurrentDividend(
        address _investor
    ) internal returns (uint256) {
        if (
            periodFund == 0 ||
            lastPaidPeriod[_investor] == currentPeriod ||
            _investor == tokenSale
        ) {
            return 0;
        }

        lastPaidPeriod[_investor] = currentPeriod;

        uint256 investorBalance = token.getPastVotes(_investor, snapshotBlock);

        uint256 amount = Math.mulDiv(
            periodFund,
            investorBalance,
            eligibleSnapshotSupply
        );

        periodRemaining -= amount;

        return amount;
    }

    function _releaseRoundingRemainder() internal {
        uint256 roundingRemainder = periodRemaining;

        if (roundingRemainder == 0) {
            return;
        }

        periodRemaining = 0;
        accountedEtherBalance -= roundingRemainder;
    }
}
