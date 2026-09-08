const spreadsheetTabs = {
  ValueChain: {
    lastColumn: "O",
    headers: [
      "Event Recorded At",
      "Stage",
      "Event",
      "Product ID",
      "Seller Address",
      "Buyer Address",
      "Quantity",
      "Product Price (ETH)",
      "Product Price (Wei)",
      "Dividend Fee (ETH)",
      "Dividend Fee (Wei)",
      "Dividend Pool Contract Address",
      "Transaction Hash",
      "Block Number",
      "Event ID",
    ],
  },
  Investments: {
    lastColumn: "J",
    headers: [
      "Event Recorded At",
      "Event",
      "Investor Address",
      "Token Amount (KTU)",
      "Payment (ETH)",
      "Payment (Wei)",
      "Token Sale Contract Address",
      "Block Number",
      "Transaction Hash",
      "Event ID",
    ],
  },
  DividendPeriods: {
    lastColumn: "N",
    headers: [
      "Event Recorded At",
      "Event",
      "Period ID",
      "Period Duration (Seconds)",
      "Period Started At",
      "Period Closed At",
      "Period-End Balance Block",
      "Dividend Fund (ETH)",
      "Dividend Fund (Wei)",
      "All KTU Tokens Sold to Date",
      "Period Investors Count",
      "Block Number",
      "Transaction Hash",
      "Event ID",
    ],
  },
  DividendPayments: {
    lastColumn: "J",
    headers: [
      "Event Recorded At",
      "Event",
      "Period ID",
      "Investor Address",
      "Amount Paid (ETH)",
      "Amount Paid (Wei)",
      "Dividend Pool Contract Address",
      "Block Number",
      "Transaction Hash",
      "Event ID",
    ],
  },
  OracleState: {
    lastColumn: "B",
    headers: ["Key", "Value"],
  },
};

const eventTabNames = [
  "ValueChain",
  "Investments",
  "DividendPeriods",
  "DividendPayments",
];
const lastProcessedBlockKey = "lastProcessedBlock";

function arraysEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function columnLetter(columnNumber) {
  let value = columnNumber;
  let result = "";

  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }

  return result;
}

function eventId(log) {
  return `${log.address.toLowerCase()}:${log.transactionHash}:${log.index}`;
}

async function addEventRow(tabName, row, log, recordedEventIds, appendRow) {
  const id = eventId(log);
  const tabEventIds = recordedEventIds.get(tabName);

  if (tabEventIds.has(id)) {
    return;
  }

  await appendRow(tabName, [...row, id]);
  tabEventIds.add(id);
}

function createGoogleSheetsStore({ sheets, spreadsheetId, logger = console }) {
  async function ensureSpreadsheetTabs() {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    });

    const existingTabs = new Set(
      spreadsheet.data.sheets.map((sheet) => sheet.properties.title),
    );
    const missingTabs = Object.keys(spreadsheetTabs).filter(
      (tabName) => !existingTabs.has(tabName),
    );

    if (missingTabs.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: missingTabs.map((tabName) => ({
            addSheet: {
              properties: {
                title: tabName,
              },
            },
          })),
        },
      });
    }

    await Promise.all(
      Object.entries(spreadsheetTabs).map(async ([tabName, configuration]) => {
        const headerRange = `${tabName}!A1:${configuration.lastColumn}1`;
        const currentHeader = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: headerRange,
        });
        const currentHeaders = currentHeader.data.values?.[0] ?? [];

        if (arraysEqual(currentHeaders, configuration.headers)) {
          return;
        }

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: headerRange,
          valueInputOption: "RAW",
          requestBody: {
            values: [configuration.headers],
          },
        });
      }),
    );
  }

  async function appendRow(tabName, row) {
    const configuration = spreadsheetTabs[tabName];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tabName}!A:${configuration.lastColumn}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [row],
      },
    });

    logger.log(`Google Sheets row added to ${tabName}:`);
    logger.log(row);
  }

  async function loadRecordedEventIds() {
    const entries = await Promise.all(
      eventTabNames.map(async (tabName) => {
        const configuration = spreadsheetTabs[tabName];
        const eventIdColumn = configuration.headers.indexOf("Event ID") + 1;
        const column = columnLetter(eventIdColumn);
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${tabName}!${column}2:${column}`,
        });

        return [
          tabName,
          new Set((response.data.values ?? []).flat().filter(Boolean)),
        ];
      }),
    );

    return new Map(entries);
  }

  async function getLastProcessedBlock() {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "OracleState!A2:B2",
    });
    const [key, value] = response.data.values?.[0] ?? [];

    if (key !== lastProcessedBlockKey || value === undefined) {
      return null;
    }

    const blockNumber = Number.parseInt(value, 10);

    if (!Number.isSafeInteger(blockNumber) || blockNumber < -1) {
      throw new Error("OracleState contains an invalid last processed block.");
    }

    return blockNumber;
  }

  async function setLastProcessedBlock(blockNumber) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "OracleState!A2:B2",
      valueInputOption: "RAW",
      requestBody: {
        values: [[lastProcessedBlockKey, blockNumber.toString()]],
      },
    });
  }

  return {
    addEventRow: (tabName, row, log, recordedEventIds) =>
      addEventRow(tabName, row, log, recordedEventIds, appendRow),
    appendRow,
    ensureSpreadsheetTabs,
    getLastProcessedBlock,
    loadRecordedEventIds,
    setLastProcessedBlock,
  };
}

module.exports = {
  addEventRow,
  columnLetter,
  createGoogleSheetsStore,
  eventId,
  spreadsheetTabs,
};
