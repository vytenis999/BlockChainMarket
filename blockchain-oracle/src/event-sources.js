const { ethers } = require("ethers");

async function countSnapshotEligibleInvestors({
  dividendPool,
  token,
  snapshotBlock,
  eventBlock,
}) {
  const [holderCount, tokenSaleAddress] = await Promise.all([
    token.holderCount({ blockTag: eventBlock }),
    dividendPool.tokenSale({ blockTag: eventBlock }),
  ]);
  const tokenSale = tokenSaleAddress.toLowerCase();
  const investorVotes = await Promise.all(
    Array.from({ length: Number(holderCount) }, async (_, index) => {
      const holder = await token.holderAt(index, { blockTag: eventBlock });

      if (holder.toLowerCase() === tokenSale) {
        return 0n;
      }

      return token.getPastVotes(holder, snapshotBlock, {
        blockTag: eventBlock,
      });
    }),
  );

  return investorVotes.filter((votes) => votes > 0n).length;
}

function createEventSources({
  contracts,
  config,
  now = () => new Date().toISOString(),
}) {
  const {
    producerWholesaler,
    wholesalerRetailer,
    retailerConsumer,
    tokenSale,
    dividendPool,
    token,
  } = contracts;

  return [
    producerWholesaler && {
      contract: producerWholesaler,
      eventName: "ProductSold",
      tabName: "ValueChain",
      toRow: (log) => [
        now(),
        "ProducerWholesaler",
        "ProductSold",
        log.args.productId.toString(),
        log.args.producer,
        log.args.wholesaler,
        log.args.quantity.toString(),
        ethers.formatEther(log.args.totalPrice),
        log.args.totalPrice.toString(),
        ethers.formatEther(log.args.dividendFee),
        log.args.dividendFee.toString(),
        log.args.dividendPool,
        log.transactionHash,
        log.blockNumber.toString(),
      ],
    },
    wholesalerRetailer && {
      contract: wholesalerRetailer,
      eventName: "ProductSold",
      tabName: "ValueChain",
      toRow: (log) => [
        now(),
        "WholesalerRetailer",
        "ProductSold",
        log.args.productId.toString(),
        log.args.wholesaler,
        log.args.retailer,
        log.args.quantity.toString(),
        ethers.formatEther(log.args.totalPrice),
        log.args.totalPrice.toString(),
        ethers.formatEther(log.args.dividendFee),
        log.args.dividendFee.toString(),
        log.args.dividendPool,
        log.transactionHash,
        log.blockNumber.toString(),
      ],
    },
    retailerConsumer && {
      contract: retailerConsumer,
      eventName: "ProductSold",
      tabName: "ValueChain",
      toRow: (log) => [
        now(),
        "RetailerConsumer",
        "ProductSold",
        log.args.productId.toString(),
        log.args.retailer,
        log.args.consumer,
        log.args.quantity.toString(),
        ethers.formatEther(log.args.totalPrice),
        log.args.totalPrice.toString(),
        ethers.formatEther(log.args.dividendFee),
        log.args.dividendFee.toString(),
        log.args.dividendPool,
        log.transactionHash,
        log.blockNumber.toString(),
      ],
    },
    tokenSale && {
      contract: tokenSale,
      eventName: "TokensPurchased",
      tabName: "Investments",
      toRow: (log) => [
        now(),
        "TokensPurchased",
        log.args.investor,
        ethers.formatUnits(log.args.tokenAmount, 18),
        ethers.formatEther(log.args.paymentWei),
        log.args.paymentWei.toString(),
        config.tokenSaleAddress,
        log.blockNumber.toString(),
        log.transactionHash,
      ],
    },
    dividendPool &&
      token && {
        contract: dividendPool,
        eventName: "DividendPeriodClosed",
        tabName: "DividendPeriods",
        toRow: async (log) => {
          const investorCount = await countSnapshotEligibleInvestors({
            dividendPool,
            token,
            snapshotBlock: log.args.snapshotBlock,
            eventBlock: log.blockNumber,
          });

          return [
            now(),
            "DividendPeriodClosed",
            log.args.period.toString(),
            log.args.periodDuration.toString(),
            new Date(Number(log.args.startedAt) * 1000).toISOString(),
            new Date(Number(log.args.closedAt) * 1000).toISOString(),
            log.args.snapshotBlock.toString(),
            ethers.formatEther(log.args.dividendFund),
            log.args.dividendFund.toString(),
            ethers.formatUnits(log.args.eligibleSnapshotSupply, 18),
            investorCount.toString(),
            log.blockNumber.toString(),
            log.transactionHash,
          ];
        },
      },
    ...["DividendPaid", "DividendDeferred"].map(
      (eventName) =>
        dividendPool && {
          contract: dividendPool,
          eventName,
          tabName: "DividendPayments",
          toRow: (log) => [
            now(),
            eventName,
            log.args.period.toString(),
            log.args.investor,
            ethers.formatEther(log.args.amount),
            log.args.amount.toString(),
            config.dividendPoolAddress,
            log.blockNumber.toString(),
            log.transactionHash,
          ],
        },
    ),
  ].filter(Boolean);
}

module.exports = {
  countSnapshotEligibleInvestors,
  createEventSources,
};
