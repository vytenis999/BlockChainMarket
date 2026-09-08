# BlockChainPR Setup

[Lietuviška versija](SETUP_LT.md)

This guide prepares the smart contracts and the blockchain oracle for the Ethereum Sepolia test network. Use test ETH only.

## 1. Prerequisites

Install or prepare:

- [Node.js 24 LTS](https://nodejs.org/en/download), including npm. Hardhat 3 requires Node.js 22.13.0 or later, but Node.js 24 LTS is the recommended version for the entire project.
- [MetaMask](https://metamask.io/download/) with the Sepolia test network visible and enough test ETH for deployments and transactions.
- [Remix IDE](https://remix.ethereum.org/) for deploying the contracts. This repository does not contain a Sepolia deployment script or a Hardhat network configuration.
- A Sepolia JSON-RPC URL from [Infura](https://www.infura.io/).
- A Google Cloud project, a Google spreadsheet, and permission to create a Service Account for the oracle.

Check the local runtime in PowerShell:

```powershell
node --version
npm --version
```

The Node.js version should be `v24.x`. The project is already initialized, so do not run `hardhat --init`.

## 2. Install and Check the Smart Contract Project

Open PowerShell in the repository root and run:

```powershell
npm install
npm run compile
npm run format:check
```

These commands:

- install Hardhat, OpenZeppelin Contracts, ethers.js, and the formatting tools;
- compile the Solidity 0.8.36 contracts into `artifacts/`;
- check the formatting of files under `contracts/`.

## 3. Prepare MetaMask and Sepolia

1. In MetaMask, open the network list and enable **Show test networks**.
2. Select **Sepolia**.
3. Create or select five accounts and name them **Producer**, **Wholesaler**,
   **Retailer**, **Consumer**, and **Oracle**.
4. Fund them with test ETH using the [Sepolia PoW Faucet](https://sepolia-faucet.pk910.de/#/). Testnet ETH has no real-world value.
5. Use a dedicated oracle account with only a small test ETH balance. It pays gas for period-closing and dividend-payout transactions.

For the complete five-account demonstration and exact example values, follow [REMIX_TEST_SCENARIO.md](REMIX_TEST_SCENARIO.md).

## 4. Deploy the Contracts

The current project compiles locally with Hardhat but deploys to Sepolia manually through Remix.

1. Open Remix and add all files from `contracts/`.
2. Compile them with Solidity `0.8.36`.
3. In **Deploy & Run Transactions**, choose **Browser Extension**, connect MetaMask, and verify that Sepolia and the intended account are selected.
4. Deploy `KTUToken` without constructor arguments. Save its address and deployment block.
5. Deploy `DividendPool`, passing the `KTUToken` address.
6. Deploy `TokenSale`, passing the `KTUToken` address and the price of one whole KTU token in wei.
7. Call `DividendPool.setTokenSale`, passing the `TokenSale` address. This can be done only once.
8. Transfer the KTU token inventory intended for investors to the `TokenSale` address.
9. Deploy `ProducerWholesaler` from the producer account, passing the `DividendPool` address.
10. Deploy `WholesalerRetailer` from the wholesaler account, passing the `DividendPool` address.
11. Deploy `RetailerConsumer` from the retailer account, passing the `DividendPool` address.

Record these values for the oracle:

- `TOKEN_SALE_ADDRESS`
- `PRODUCER_WHOLESALER_ADDRESS`
- `WHOLESALER_RETAILER_ADDRESS`
- `RETAILER_CONSUMER_ADDRESS`
- `DIVIDEND_POOL_ADDRESS`
- the earliest deployment block, used as `ORACLE_START_BLOCK` when importing historical events

The KTU token address is not stored in `.env`; the oracle obtains it from `DividendPool` when the pool address is configured.

## 5. Prepare Google Cloud and Google Sheets

1. Create or select a project in the [Google Cloud console](https://console.cloud.google.com/).
2. [Enable the Google Sheets API](https://console.cloud.google.com/flows/enableapi?apiid=sheets.googleapis.com) for that project.
3. Open **IAM & Admin > Service Accounts**, select **Create service account**, enter a name such as `blockchain-oracle`, and click **Create and continue**. Under **Grant this service account access to project**, do not assign a role because access is granted by sharing the Google spreadsheet itself. Select **Continue**, then **Done**.
4. Open the Service Account, select **Keys > Add key > Create new key**, choose **JSON**, and download the key.
5. Move the downloaded file to the `blockchain-oracle/` directory and rename it to `credentials.json` (the downloaded file usually has an automatically generated name). Do not leave another copy in the Downloads directory. Never commit or share `credentials.json`.
6. Open the JSON file locally and find its `client_email` value.
7. Create or select a Google spreadsheet and share it with that email address as **Editor**.
8. Copy the spreadsheet ID from its URL. In `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`, the value between `/d/` and `/edit` is `GOOGLE_SHEET_ID`.

## 6. Install the Oracle

From the repository root, run:

```powershell
Set-Location blockchain-oracle
npm install
```

The oracle is a long-running Node.js terminal process. It does not provide a browser interface.

## 7. Configure `.env`

Create `blockchain-oracle/.env` by copying the provided template. In PowerShell, run:

```powershell
Copy-Item .env.example .env
```

Then open `blockchain-oracle/.env` and replace the placeholders:

```dotenv
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
GOOGLE_SHEET_ID=YOUR_SPREADSHEET_ID
TOKEN_SALE_ADDRESS=0x...
PRODUCER_WHOLESALER_ADDRESS=0x...
WHOLESALER_RETAILER_ADDRESS=0x...
RETAILER_CONSUMER_ADDRESS=0x...
DIVIDEND_POOL_ADDRESS=0x...
ORACLE_PRIVATE_KEY=0x...
DIVIDEND_PAYOUT_BATCH_SIZE=20
ORACLE_EVENT_CONFIRMATIONS=6
ORACLE_EVENT_BLOCK_RANGE=1000
ORACLE_EVENT_POLL_INTERVAL_MS=15000
# ORACLE_START_BLOCK=1234567
```

### Required Values

| Variable          | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| `SEPOLIA_RPC_URL` | A working Sepolia JSON-RPC endpoint.                       |
| `GOOGLE_SHEET_ID` | The ID of the spreadsheet shared with the Service Account. |

#### How to get `SEPOLIA_RPC_URL`

1. Create an account on the [Infura](https://www.infura.io/) website.
2. Create a new Ethereum project or application in the Infura dashboard.
3. Select **Sepolia** as the network and open the project's API or endpoint settings.
4. Copy the complete HTTPS JSON-RPC URL. It usually looks like `https://sepolia.infura.io/v3/PROJECT_ID`.
5. Add the copied URL to `.env`, for example: `SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/PROJECT_ID`. Do not publish this URL because it may contain a project ID or API key.

#### How to get `GOOGLE_SHEET_ID`

1. Open the Google spreadsheet that you shared with the Service Account's `client_email` address in section 5.
2. Find a URL similar to `https://docs.google.com/spreadsheets/d/1AbC...XyZ/edit#gid=0` in the browser address bar.
3. Copy only the value between `/d/` and `/edit`. In this example, it is `1AbC...XyZ`; `gid=0` is not part of the spreadsheet ID.
4. Add it to `.env`, for example: `GOOGLE_SHEET_ID=1AbC...XyZ`.

The process stops during startup if either value is missing or blank.

### Contract and Signer Values

| Variable                      | Description                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `TOKEN_SALE_ADDRESS`          | Enables `TokensPurchased` event collection.                                           |
| `PRODUCER_WHOLESALER_ADDRESS` | Enables producer-to-wholesaler sale collection.                                       |
| `WHOLESALER_RETAILER_ADDRESS` | Enables wholesaler-to-retailer sale collection.                                       |
| `RETAILER_CONSUMER_ADDRESS`   | Enables retailer-to-consumer sale collection.                                         |
| `DIVIDEND_POOL_ADDRESS`       | Enables dividend event collection and, with a private key, dividend automation.       |
| `ORACLE_PRIVATE_KEY`          | Private key of the dedicated Sepolia oracle account that signs dividend transactions. |

#### How to get `ORACLE_PRIVATE_KEY`

1. In MetaMask, select the dedicated **Oracle** account created in section 3. Do not use your main wallet or an account that holds real funds.
2. Open the account menu, select **Account details**, then **Show private key**, and confirm with your MetaMask password.
3. Copy the displayed private key only into the local `blockchain-oracle/.env` file, for example: `ORACLE_PRIVATE_KEY=0x...`. If the copied value does not start with `0x`, add the prefix.
4. Ensure that the selected account is used on Sepolia and has a small amount of test ETH for transaction fees.

Never send the private key to anyone, upload it to cloud storage, or commit it to Git. Anyone who obtains this key can fully control the oracle account.

Contract addresses are optional in the configuration loader, and a missing address only disables that event source. Configure all five addresses for the complete project. Automatic period closing and batch payouts run only when both `DIVIDEND_POOL_ADDRESS` and `ORACLE_PRIVATE_KEY` are present. Event collection can run without the private key, but automatic dividend period closing and dividend payouts will not be performed in that case.

### Processing Values

| Variable                        | Default | Valid values              | Description                                                                                                                                     |
| ------------------------------- | ------: | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `DIVIDEND_PAYOUT_BATCH_SIZE`    |    `20` | `1` to `50`               | Maximum investors processed in one payout transaction.                                                                                          |
| `ORACLE_EVENT_CONFIRMATIONS`    |     `6` | Integer `0` or greater    | How many new blocks must be added after an event before the oracle reads it. This prevents errors if the latest part of the blockchain changes. |
| `ORACLE_EVENT_BLOCK_RANGE`      |  `1000` | Integer `1` or greater    | Maximum blocks queried in one range.                                                                                                            |
| `ORACLE_EVENT_POLL_INTERVAL_MS` | `15000` | Integer `1000` or greater | Delay between event polling runs in milliseconds.                                                                                               |
| `ORACLE_START_BLOCK`            |   unset | Integer `0` or greater    | Block from which existing events are first read and written to the Google spreadsheet.                                                          |

Dividend processing checks run every 15 seconds independently of `ORACLE_EVENT_POLL_INTERVAL_MS`.

### Choose the Initial Event Block

- Open [Sepolia Etherscan](https://sepolia.etherscan.io/) and search for the address of the contract deployed first. If you deployed the contracts in the order specified in this guide, this is the `KTUToken` address.
- On the contract page, find **Contract Creator** and open the contract creation transaction shown next to it.
- Copy the **Block** number from the transaction details and add it to `.env`, for example, `ORACLE_START_BLOCK=1234567`.
- To collect only new events, leave `ORACLE_START_BLOCK` unset. On the first run, the oracle records the current confirmed block as processed and starts with the following block.
- To import existing events, set `ORACLE_START_BLOCK` to the earliest contract deployment block before the first run.
- A saved `lastProcessedBlock` value in the `OracleState` sheet takes precedence over `ORACLE_START_BLOCK`. Use a new spreadsheet or remove the existing checkpoint before an intentional fresh import.
- After a successful historical import, remove `ORACLE_START_BLOCK` from `.env`; later runs resume from `OracleState`.

## 8. Start and Verify the Oracle

Run this command from `blockchain-oracle/`:

```powershell
npm start
```

On startup, the oracle validates the configuration, connects to Sepolia, authenticates with Google, creates missing sheet tabs, processes confirmed events once, and starts polling. With the pool address and private key configured, it also checks dividend processing immediately and then every 15 seconds.

A successful start logs messages similar to:

```text
Blockchain Output Oracle started...
Polling Sepolia events with 6 block confirmations.
```

The spreadsheet will contain these tabs:

| Sheet              | Contents                                                   |
| ------------------ | ---------------------------------------------------------- |
| `ValueChain`       | `ProductSold` events from the three marketplaces.          |
| `Investments`      | `TokensPurchased` events.                                  |
| `DividendPeriods`  | Closed periods and their snapshots.                        |
| `DividendPayments` | Successful and deferred dividend events.                   |
| `OracleState`      | Event identifiers and the last completely processed block. |

Keep the terminal process running for continuous monitoring. Stop it with `Ctrl+C`. Restarting is safe: the oracle resumes from `OracleState`, and event IDs prevent duplicate rows.

## 9. Troubleshooting

| Problem                                                          | Check                                                                                                                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hardhat reports an unsupported Node.js version                   | Install Node.js 24 LTS and reopen the terminal. Verify with `node --version`.                                                                                              |
| `Missing required configuration`                                 | Set non-empty `SEPOLIA_RPC_URL` and `GOOGLE_SHEET_ID` values in `blockchain-oracle/.env`.                                                                                  |
| Invalid Ethereum address                                         | Copy the deployed Sepolia contract address again and ensure it starts with `0x` and contains 40 hexadecimal address characters.                                            |
| `credentials.json` cannot be read or Google authentication fails | Confirm the JSON key is named exactly `credentials.json` and is located directly under `blockchain-oracle/`. A newly created key can take about a minute to become usable. |
| Google Sheets returns a permission error                         | Share the target spreadsheet with the exact `client_email` from `credentials.json` as Editor and verify `GOOGLE_SHEET_ID`.                                                 |
| Dividend transactions fail                                       | Verify that `ORACLE_PRIVATE_KEY` belongs to the intended Sepolia account and that the account has enough test ETH for gas.                                                 |
| Historical events are not imported                               | Check whether `OracleState` already contains `lastProcessedBlock`; that checkpoint overrides `ORACLE_START_BLOCK`.                                                         |
| No events appear immediately                                     | Wait until the events have the configured number of block confirmations and the next polling run completes.                                                                |

## 10. Security

- Never commit `.env`, `credentials.json`, private keys, or RPC credentials. The repository `.gitignore` excludes these local files.
- Use dedicated oracle and Google Service Account identities with the minimum required access.
- If a private key or Service Account key is exposed, revoke or delete it immediately and create a replacement. Removing it from the latest Git revision is not sufficient if it entered Git history.
- Keep only test ETH in the oracle wallet.

## Official References

- [Node.js downloads and LTS releases](https://nodejs.org/en/download)
- [Hardhat 3 getting started and Node.js requirements](https://hardhat.org/docs/getting-started/)
- [Show test networks in MetaMask](https://support.metamask.io/configure/networks/how-to-view-testnets-in-metamask/)
- [Enable and use the Google Sheets API](https://developers.google.com/workspace/sheets/api/quickstart/nodejs)
- [Create and delete Service Account keys](https://docs.cloud.google.com/iam/docs/keys-create-delete)
- [Service Account key security best practices](https://docs.cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)
