const { ethers } = require("ethers");
const { google } = require("googleapis");

const { loadConfig } = require("./src/config");
const { createReadContracts } = require("./src/contracts");
const { createDividendProcessor } = require("./src/dividend-processor");
const { createEventProcessor } = require("./src/event-processor");
const { createEventSources } = require("./src/event-sources");
const { createGoogleSheetsStore } = require("./src/google-sheets");

async function main() {
  require("dotenv").config();

  const config = loadConfig();

  const provider = new ethers.JsonRpcProvider(config.sepoliaRpcUrl);
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({
    version: "v4",
    auth,
  });
  const store = createGoogleSheetsStore({
    sheets,
    spreadsheetId: config.spreadsheetId,
  });

  await store.ensureSpreadsheetTabs();

  const contracts = await createReadContracts(config, provider);
  const eventSources = createEventSources({ contracts, config });
  const eventProcessor = createEventProcessor({
    provider,
    eventSources,
    store,
    eventConfirmations: config.eventConfirmations,
    eventBlockRange: config.eventBlockRange,
    oracleStartBlock: config.oracleStartBlock,
  });

  await eventProcessor.processEventLogs();
  setInterval(eventProcessor.processEventLogs, config.eventPollIntervalMs);

  if (config.dividendPoolAddress && config.oraclePrivateKey) {
    const oracleSigner = new ethers.Wallet(config.oraclePrivateKey, provider);
    const dividendPool = contracts.dividendPool.connect(oracleSigner);
    const dividendProcessor = createDividendProcessor({
      dividendPool,
      provider,
      dividendPayoutBatchSize: config.dividendPayoutBatchSize,
    });

    dividendProcessor.processDividends();
    setInterval(dividendProcessor.processDividends, 15_000);
  } else {
    console.log("Dividend period automation is not configured.");
  }

  console.log("Blockchain Output Oracle started...");
  console.log(
    `Polling Sepolia events with ${config.eventConfirmations} block confirmations.`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(
      "Failed to start oracle:",
      error.shortMessage ?? error.message,
    );
    process.exitCode = 1;
  });
}

module.exports = {
  main,
};
