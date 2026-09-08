function createDividendProcessor({
  dividendPool,
  provider,
  dividendPayoutBatchSize,
  logger = console,
}) {
  let isProcessingDividends = false;

  async function payPendingDividendBatches() {
    let [payoutCursor, payoutInvestorCount] = await Promise.all([
      dividendPool.payoutCursor(),
      dividendPool.payoutInvestorCount(),
    ]);

    while (payoutCursor < payoutInvestorCount) {
      const transaction = await dividendPool.payDividendBatch(
        dividendPayoutBatchSize,
      );
      const receipt = await transaction.wait();

      logger.log(`Dividend batch paid: ${receipt.hash}`);

      [payoutCursor, payoutInvestorCount] = await Promise.all([
        dividendPool.payoutCursor(),
        dividendPool.payoutInvestorCount(),
      ]);
    }
  }

  async function processDividends() {
    if (isProcessingDividends) {
      return;
    }

    isProcessingDividends = true;

    try {
      await payPendingDividendBatches();

      const [nextCloseAt, latestBlock] = await Promise.all([
        dividendPool.nextPeriodCloseAt(),
        provider.getBlock("latest"),
      ]);

      if (BigInt(latestBlock.timestamp) < nextCloseAt) {
        return;
      }

      const transaction = await dividendPool.closeDividendPeriod();
      const receipt = await transaction.wait();

      logger.log(`Dividend period closed: ${receipt.hash}`);

      await payPendingDividendBatches();
    } catch (error) {
      logger.error(
        "Failed to process dividends:",
        error.shortMessage ?? error.message,
      );
    } finally {
      isProcessingDividends = false;
    }
  }

  return {
    payPendingDividendBatches,
    processDividends,
  };
}

module.exports = {
  createDividendProcessor,
};
