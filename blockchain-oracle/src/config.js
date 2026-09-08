const requiredConfigurationNames = ["SEPOLIA_RPC_URL", "GOOGLE_SHEET_ID"];

function validateRequiredConfiguration(environment) {
  const missingNames = requiredConfigurationNames.filter(
    (name) =>
      typeof environment[name] !== "string" || environment[name].trim() === "",
  );

  if (missingNames.length > 0) {
    throw new Error(
      `Missing required configuration: ${missingNames.join(", ")}.`,
    );
  }
}

function parseIntegerConfiguration(
  environment,
  name,
  fallback,
  minimum,
  maximum,
) {
  const value = Number.parseInt(environment[name] ?? fallback, 10);

  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    (maximum !== undefined && value > maximum)
  ) {
    const maximumText = maximum === undefined ? "" : ` and ${maximum}`;
    throw new Error(`${name} must be between ${minimum}${maximumText}.`);
  }

  return value;
}

function loadConfig(environment = process.env) {
  validateRequiredConfiguration(environment);

  return {
    sepoliaRpcUrl: environment.SEPOLIA_RPC_URL.trim(),
    spreadsheetId: environment.GOOGLE_SHEET_ID.trim(),
    tokenSaleAddress: environment.TOKEN_SALE_ADDRESS,
    producerWholesalerAddress: environment.PRODUCER_WHOLESALER_ADDRESS,
    wholesalerRetailerAddress: environment.WHOLESALER_RETAILER_ADDRESS,
    retailerConsumerAddress: environment.RETAILER_CONSUMER_ADDRESS,
    dividendPoolAddress: environment.DIVIDEND_POOL_ADDRESS,
    oraclePrivateKey: environment.ORACLE_PRIVATE_KEY,
    dividendPayoutBatchSize: parseIntegerConfiguration(
      environment,
      "DIVIDEND_PAYOUT_BATCH_SIZE",
      "20",
      1,
      50,
    ),
    eventConfirmations: parseIntegerConfiguration(
      environment,
      "ORACLE_EVENT_CONFIRMATIONS",
      "6",
      0,
    ),
    eventBlockRange: parseIntegerConfiguration(
      environment,
      "ORACLE_EVENT_BLOCK_RANGE",
      "1000",
      1,
    ),
    eventPollIntervalMs: parseIntegerConfiguration(
      environment,
      "ORACLE_EVENT_POLL_INTERVAL_MS",
      "15000",
      1000,
    ),
    oracleStartBlock: environment.ORACLE_START_BLOCK
      ? parseIntegerConfiguration(
          environment,
          "ORACLE_START_BLOCK",
          undefined,
          0,
        )
      : null,
  };
}

module.exports = {
  loadConfig,
  parseIntegerConfiguration,
};
