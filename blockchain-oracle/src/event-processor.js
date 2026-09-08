async function queryEventRange(eventSources, fromBlock, toBlock) {
  const eventGroups = await Promise.all(
    eventSources.map(async (source) => {
      const filter = source.contract.filters[source.eventName]();
      const logs = await source.contract.queryFilter(
        filter,
        fromBlock,
        toBlock,
      );

      return logs.map((log) => ({ log, source }));
    }),
  );

  return eventGroups.flat().sort((left, right) => {
    if (left.log.blockNumber !== right.log.blockNumber) {
      return left.log.blockNumber - right.log.blockNumber;
    }

    return left.log.index - right.log.index;
  });
}

function createEventProcessor({
  provider,
  eventSources,
  store,
  eventConfirmations,
  eventBlockRange,
  oracleStartBlock,
  logger = console,
}) {
  let isProcessingEvents = false;

  async function processEventLogs() {
    if (isProcessingEvents || eventSources.length === 0) {
      return;
    }

    isProcessingEvents = true;

    try {
      const latestBlock = await provider.getBlockNumber();
      const confirmedBlock = latestBlock - eventConfirmations;

      if (confirmedBlock < 0) {
        return;
      }

      let lastProcessedBlock = await store.getLastProcessedBlock();

      if (lastProcessedBlock === null) {
        lastProcessedBlock =
          oracleStartBlock === null ? confirmedBlock : oracleStartBlock - 1;
        await store.setLastProcessedBlock(lastProcessedBlock);

        logger.log(
          oracleStartBlock === null
            ? `Event checkpoint initialized at block ${lastProcessedBlock}. Set ORACLE_START_BLOCK to backfill older events.`
            : `Event backfill initialized at block ${oracleStartBlock}.`,
        );
      }

      if (lastProcessedBlock >= confirmedBlock) {
        return;
      }

      const recordedEventIds = await store.loadRecordedEventIds();

      while (lastProcessedBlock < confirmedBlock) {
        const fromBlock = lastProcessedBlock + 1;
        const toBlock = Math.min(
          fromBlock + eventBlockRange - 1,
          confirmedBlock,
        );
        const events = await queryEventRange(eventSources, fromBlock, toBlock);

        for (const { log, source } of events) {
          await store.addEventRow(
            source.tabName,
            await source.toRow(log),
            log,
            recordedEventIds,
          );
        }

        await store.setLastProcessedBlock(toBlock);
        lastProcessedBlock = toBlock;
        logger.log(`Processed confirmed event blocks ${fromBlock}-${toBlock}.`);
      }
    } catch (error) {
      logger.error(
        "Failed to process blockchain events:",
        error.shortMessage ?? error.message,
      );
    } finally {
      isProcessingEvents = false;
    }
  }

  return {
    processEventLogs,
  };
}

module.exports = {
  createEventProcessor,
  queryEventRange,
};
