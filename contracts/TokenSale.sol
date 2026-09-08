// SPDX-License-Identifier: MIT
pragma solidity ^0.8.36;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IKTUTokenSale {
    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

contract TokenSale is ReentrancyGuard {
    IKTUTokenSale public immutable token;

    address public immutable administrator;

    uint256 public constant TOKEN_UNIT = 10 ** 18;
    uint256 public tokenPriceWei;
    uint256 public totalTokensSold;
    uint256 public totalInvestedWei;

    mapping(address => uint256) public purchasedTokens;
    mapping(address => uint256) public investedWei;

    event TokensPurchased(
        address indexed investor,
        uint256 tokenAmount,
        uint256 paymentWei
    );

    event TokenPriceChanged(uint256 previousPriceWei, uint256 newPriceWei);

    event SaleProceedsWithdrawn(address indexed recipient, uint256 amountWei);

    event UnsoldTokensWithdrawn(address indexed recipient, uint256 tokenAmount);

    constructor(address _tokenAddress, uint256 _tokenPriceWei) {
        require(_tokenAddress != address(0), "Invalid token address");

        require(_tokenPriceWei > 0, "Token price must be greater than zero");

        token = IKTUTokenSale(_tokenAddress);
        administrator = msg.sender;
        tokenPriceWei = _tokenPriceWei;
    }

    modifier onlyAdministrator() {
        require(
            msg.sender == administrator,
            "Only administrator can perform this action"
        );
        _;
    }

    function buyTokens(
        uint256 wholeTokenAmount
    ) external payable nonReentrant returns (uint256) {
        require(wholeTokenAmount > 0, "Amount must be greater than zero");

        uint256 paymentWei = wholeTokenAmount * tokenPriceWei;

        require(msg.value == paymentWei, "Incorrect ETH payment");

        uint256 tokenAmount = wholeTokenAmount * TOKEN_UNIT;

        require(
            token.balanceOf(address(this)) >= tokenAmount,
            "Not enough KTU available"
        );

        purchasedTokens[msg.sender] += tokenAmount;
        investedWei[msg.sender] += paymentWei;
        totalTokensSold += tokenAmount;
        totalInvestedWei += paymentWei;

        require(token.transfer(msg.sender, tokenAmount), "KTU transfer failed");

        emit TokensPurchased(msg.sender, tokenAmount, paymentWei);

        return tokenAmount;
    }

    function setTokenPriceWei(uint256 _newPriceWei) external onlyAdministrator {
        require(_newPriceWei > 0, "Token price must be greater than zero");

        uint256 previousPriceWei = tokenPriceWei;
        tokenPriceWei = _newPriceWei;

        emit TokenPriceChanged(previousPriceWei, _newPriceWei);
    }

    function withdrawSaleProceeds(
        address payable _recipient
    ) external onlyAdministrator nonReentrant {
        require(_recipient != address(0), "Invalid recipient");

        uint256 amountWei = address(this).balance;

        require(amountWei > 0, "No sale proceeds available");

        (bool success, ) = _recipient.call{value: amountWei}("");

        require(success, "ETH withdrawal failed");

        emit SaleProceedsWithdrawn(_recipient, amountWei);
    }

    function withdrawUnsoldTokens(
        address _recipient,
        uint256 _tokenAmount
    ) external onlyAdministrator nonReentrant {
        require(_recipient != address(0), "Invalid recipient");

        require(_tokenAmount > 0, "Token amount must be greater than zero");

        require(
            token.transfer(_recipient, _tokenAmount),
            "KTU transfer failed"
        );

        emit UnsoldTokensWithdrawn(_recipient, _tokenAmount);
    }
}
