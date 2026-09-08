const { ethers } = require("ethers");

const producerWholesalerAbi = [
  "event ProductSold(uint256 indexed productId, address indexed producer, address indexed wholesaler, uint256 quantity, uint256 totalPrice, uint256 dividendFee, address dividendPool)",
];

const wholesalerRetailerAbi = [
  "event ProductSold(uint256 indexed productId, address indexed wholesaler, address indexed retailer, uint256 quantity, uint256 totalPrice, uint256 dividendFee, address dividendPool)",
];

const retailerConsumerAbi = [
  "event ProductSold(uint256 indexed productId, address indexed retailer, address indexed consumer, uint256 quantity, uint256 totalPrice, uint256 dividendFee, address dividendPool)",
];

const tokenSaleAbi = [
  "event TokensPurchased(address indexed investor, uint256 tokenAmount, uint256 paymentWei)",
];

const dividendPoolAbi = [
  "event PeriodDurationChanged(uint256 previousDuration, uint256 newDuration)",
  "event DividendPeriodClosed(uint256 indexed period, uint256 periodDuration, uint256 indexed snapshotBlock, uint256 dividendFund, uint256 eligibleSnapshotSupply, uint256 startedAt, uint256 closedAt)",
  "event DividendPaid(uint256 indexed period, address indexed investor, uint256 amount)",
  "event DividendDeferred(uint256 indexed period, address indexed investor, uint256 amount)",
  "function token() view returns (address)",
  "function tokenSale() view returns (address)",
  "function setPeriodDuration(uint256 newDuration)",
  "function closeDividendPeriod()",
  "function payDividendBatch(uint256 maxInvestors) returns (uint256 processedInvestors, uint256 totalPaid)",
  "function periodDuration() view returns (uint256)",
  "function currentPeriodDuration() view returns (uint256)",
  "function nextPeriodCloseAt() view returns (uint256)",
  "function payoutInvestorCount() view returns (uint256)",
  "function payoutCursor() view returns (uint256)",
];

const tokenAbi = [
  "function holderCount() view returns (uint256)",
  "function holderAt(uint256 index) view returns (address)",
  "function getPastVotes(address account, uint256 timepoint) view returns (uint256)",
];

function createOptionalContract({
  address,
  variableName,
  abi,
  runner,
  logger,
}) {
  if (!address) {
    logger.log(
      `${variableName} is not configured; its events will be skipped.`,
    );
    return null;
  }

  if (!ethers.isAddress(address)) {
    throw new Error(`${variableName} must contain a valid Ethereum address.`);
  }

  return new ethers.Contract(address, abi, runner);
}

async function createReadContracts(config, provider, logger = console) {
  const contracts = {
    producerWholesaler: createOptionalContract({
      address: config.producerWholesalerAddress,
      variableName: "PRODUCER_WHOLESALER_ADDRESS",
      abi: producerWholesalerAbi,
      runner: provider,
      logger,
    }),
    wholesalerRetailer: createOptionalContract({
      address: config.wholesalerRetailerAddress,
      variableName: "WHOLESALER_RETAILER_ADDRESS",
      abi: wholesalerRetailerAbi,
      runner: provider,
      logger,
    }),
    retailerConsumer: createOptionalContract({
      address: config.retailerConsumerAddress,
      variableName: "RETAILER_CONSUMER_ADDRESS",
      abi: retailerConsumerAbi,
      runner: provider,
      logger,
    }),
    tokenSale: createOptionalContract({
      address: config.tokenSaleAddress,
      variableName: "TOKEN_SALE_ADDRESS",
      abi: tokenSaleAbi,
      runner: provider,
      logger,
    }),
    dividendPool: createOptionalContract({
      address: config.dividendPoolAddress,
      variableName: "DIVIDEND_POOL_ADDRESS",
      abi: dividendPoolAbi,
      runner: provider,
      logger,
    }),
  };

  contracts.token = await createTokenContract(contracts.dividendPool, provider);

  return contracts;
}

async function createTokenContract(dividendPool, provider) {
  if (!dividendPool) {
    return null;
  }

  return new ethers.Contract(await dividendPool.token(), tokenAbi, provider);
}

module.exports = {
  createReadContracts,
  createTokenContract,
};
