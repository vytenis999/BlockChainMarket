# BlockChainPR

Decentralized commerce and investment system running on the Ethereum Sepolia test network. Supply chain participants settle transactions in ETH, while the system's ERC-20 investment token, `KTUToken` (`KTU`), represents investment ownership and grants dividend rights. A Node.js oracle monitors sale events, records them in Google Sheets, and initiates periodic dividend payouts.

## Technologies

- Solidity 0.8.36
- OpenZeppelin Contracts 5.6.1
- Ethereum Sepolia
- Node.js
- ethers.js 6
- Google Sheets API

## Project Structure

```text
BlockChainPR/
|-- contracts/
|   |-- DividendPool.sol
|   |-- MarketplaceBase.sol
|   |-- TokenSale.sol
|   |-- KTUToken.sol
|   |-- ProducerWholesaler.sol
|   |-- WholesalerRetailer.sol
|   `-- RetailerConsumer.sol
|-- blockchain-oracle/
|   |-- src/
|   |   |-- config.js
|   |   |-- contracts.js
|   |   |-- dividend-processor.js
|   |   |-- event-processor.js
|   |   |-- event-sources.js
|   |   `-- google-sheets.js
|   |-- oracle.js
|   |-- package.json
|   |-- credentials.json
|   `-- .env
|-- SETUP.md
|-- SETUP_LT.md
|-- REMIX_TEST_SCENARIO.md
|-- REMIX_TEST_SCENARIO_LT.md
|-- README_LT.md
`-- README.md
```

## Smart Contracts

| Contract                 | Purpose                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `KTUToken.sol`           | OpenZeppelin ERC-20 investment token with an initial supply of 1,000,000 KTU tokens, burning, and ERC20Votes balance checkpoints. |
| `TokenSale.sol`          | Sells KTU tokens transferred to the contract in advance in exchange for ETH.                                                      |
| `DividendPool.sol`       | Collects 5% ETH fees, records KTU token balance snapshots, and periodically transfers ETH directly to investors.                  |
| `MarketplaceBase.sol`    | Abstract marketplace contract base with shared offer, price, inventory, and ETH payment management.                               |
| `ProducerWholesaler.sol` | Manages producer offers and sales to wholesalers.                                                                                 |
| `WholesalerRetailer.sol` | Manages wholesaler offers and sales to retailers.                                                                                 |
| `RetailerConsumer.sol`   | Manages retailer offers and sales to consumers.                                                                                   |

`MarketplaceBase` is not deployed separately. `ProducerWholesaler`, `WholesalerRetailer`, and `RetailerConsumer` inherit the shared marketplace logic, but they are deployed as three independent contracts and can be extended with different features. Each contract stores its own offers independently. The product ID is an identifier agreed upon by the participants; the contracts do not verify the physical product's origin, condition, or quantity purchased at an earlier stage.

## Supply Chain

```text
Producer -> Wholesaler -> Retailer -> Consumer
```

At each sale stage:

1. The seller lists the available product quantity and unit price.
2. The buyer obtains the payment amount in wei through `calculatePayment`.
3. The buyer calls `buyProduct` and passes the returned `totalPayment` as the transaction's ETH `value`.
4. The full product price is transferred to the seller in ETH. An additional dividend fee of 5% of the product price, rounded down to whole wei, is sent to `DividendPool`.
5. The oracle monitoring the sale event records the transaction in Google Sheets.

## Investment and Dividends

An investor buys KTU tokens with ETH through `TokenSale.buyTokens(wholeTokenAmount)`, which takes a whole number of tokens. The KTU investment token uses OpenZeppelin's ERC-20 implementation and supports `ERC20Permit` and `ERC20Votes` checkpoints. Its initial supply is 1,000,000 KTU tokens, with no further minting; `burn` and `burnFrom` can reduce the total supply. Each KTU token holder's voting power is automatically delegated to that same address, so their `getPastVotes` value matches their KTU token balance at the selected historical block.

The fund for each closed period is distributed according to the following formula:

```text
investor dividend = period ETH pool * investor KTU token balance at snapshot block / eligible KTU token supply at snapshot block
```

Each payout is rounded down to whole wei. Once all payout batches are processed, any rounding remainder becomes available for a later period.

When a period is closed, `DividendPool` records the previous block and reads balances through `getPastVotes`. The eligible supply is the total KTU token supply at that block minus the unsold KTU token balance held by `TokenSale`. Tokens awaiting sale therefore do not dilute investor dividends.

When KTU tokens are transferred to another address, future dividend rights pass to the recipient. The payout for an already closed period does not change because it belongs to the address that held KTU tokens at the recorded snapshot block.

The initial period duration is 3 minutes. The administrator can change it by calling `setPeriodDuration(newDuration)` and specifying the new duration in seconds. The value must be greater than zero. The new duration applies only to the next period, so the end time of a period already in progress does not change. A period is closed through the public `closeDividendPeriod` method. The next closing time can be read from `nextPeriodCloseAt()`. If a 3-minute period started at 10:00 but was not closed until 10:07, the next period is considered to have started at 10:06 rather than 10:07. This preserves the original period schedule. Even if several configured intervals pass before closure, the contract closes only one dividend period. Separate dividend periods are not created for the other elapsed intervals.

The oracle closes the period and calls `payDividendBatch` to attempt direct ETH transfers to investors' wallets. Each batch processes up to 50 addresses from the historical holder list. Batches reduce the computational cost of a single transaction. A new period cannot be closed until all addresses for the previous period have been processed.

If an ETH transfer fails without reverting the batch transaction, the amount is reserved in `deferredDividends` and a `DividendDeferred` event is emitted. Once the batches are complete, a new period can be closed even if deferred amounts remain unclaimed. The oracle does not automatically retry these amounts. An investor can call `claimDividend` to claim their deferred amounts and any unpaid dividend from the current closed period.

Ethereum does not execute functions on a timer by itself, so the oracle process must run continuously and its wallet must hold Sepolia ETH for transaction fees. If the eligible KTU token supply at the snapshot block is zero, the collected fees remain available in the pool for a later period with eligible holders.

## Setup and Running

For environment requirements, contract compilation and deployment, Google Sheets configuration, oracle settings, and startup instructions, see [SETUP.md](SETUP.md). For the complete manual Sepolia acceptance flow, see [REMIX_TEST_SCENARIO.md](REMIX_TEST_SCENARIO.md).

## Security and Limitations

- `.env` and `credentials.json` are secret files. They must not be published or committed to Git history; leaked RPC and Service Account keys must be revoked and regenerated immediately.
- The initial 3-minute dividend period is suitable for demonstrations, but on a live network the administrator should increase it through a `setPeriodDuration` transaction.
- The oracle wallet pays the transaction fees for direct payouts. As the number of investors grows, processing all batches may take longer than the configured period; in that case, the next period is closed only after the previous batches have been processed. Deferred amounts do not block the next period.
- The KTU token holder list retains all historical recipients, so processing it becomes more expensive as it grows, even for addresses that no longer hold KTU tokens. A larger system should consider a claim-based design, but this would require contract changes: the current contract still requires all batch addresses to be processed before the next period can close.
- The `ERC20Votes` snapshot records the previous block. A KTU token transfer in the same block as the period closure affects only the next period.
- The seller specifies the offered quantity. The contracts do not verify physical inventory, product delivery, or product condition.
- The oracle restores events from the `OracleState` checkpoint. A suitable `ORACLE_START_BLOCK` must be specified for the initial historical import; a block that is too old increases the number of RPC requests.

## License

The Solidity files are licensed under the MIT License. The oracle package is licensed under the ISC License.
