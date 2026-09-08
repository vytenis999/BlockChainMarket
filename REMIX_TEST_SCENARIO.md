# Remix Sepolia Manual Test Scenario

This scenario tests the complete KTU token investment, three-stage supply chain,
balance snapshot, batch payout, manual claim, administrator withdrawal, and
oracle flows on Sepolia. Use test ETH only.

Use newly deployed contracts and keep the oracle stopped until section 10.
Before completing section 8, do not make additional purchases, deposits,
token transfers, burns, or period closures beyond those specified below.
The expected balances assume that all investor wallets accept ETH transfers.

## 1. Accounts and roles

Use the five MetaMask accounts below. Record each full address before starting.

| MetaMask account | Role                                                        | Responsibility                                                            |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| Producer         | Producer and KTU token investor                             | Deploys and sells through `ProducerWholesaler`                            |
| Wholesaler       | KTU token deployer, sale/pool administrator, and wholesaler | Deploys `KTUToken`, `DividendPool`, `TokenSale`, and `WholesalerRetailer` |
| Retailer         | Retailer and KTU token investor                             | Deploys and sells through `RetailerConsumer`                              |
| Consumer         | Consumer and KTU token investor                             | Buys from `RetailerConsumer`                                              |
| Oracle           | Automation account                                          | Closes dividend periods and pays batches; never deploys a contract        |

Fund every account with enough Sepolia ETH for gas. The Producer, Wholesaler,
Retailer, and Consumer also need the small purchase amounts shown below. Keep
only a small amount of test ETH in the Oracle account.

## 2. Remix preparation

1. Open Remix, add all files from `contracts/`, and compile with Solidity
   `0.8.36`.
2. In **Deploy & Run Transactions**, select **Browser Extension** as the
   environment and **MetaMask** as the wallet.
3. Confirm that Remix displays the expected MetaMask account address and that
   MetaMask is connected to Sepolia before every deployment and transaction.
4. Enter ETH amounts and prices in function parameters in wei. `buyTokens`
   takes a whole number of KTU tokens; ERC-20 `transfer`, `approve`, and `burn`, as
   well as `withdrawUnsoldTokens`, take the token's smallest units. Product
   IDs, quantities, addresses, and durations in seconds are not wei values.
5. For payable calls, enter the ETH amount separately in **VALUE** and select
   `Wei` or `Ether` as specified. After every payable call, reset **VALUE**
   to `0`. Check that it is `0` before every deployment and nonpayable call,
   including `listProduct`, `transfer`, `closeDividendPeriod`,
   `payDividendBatch`, and `claimDividend`.

Never paste a private key into Remix. A contract address is not an account
address; copy each deployed address carefully.

## 3. Deploy the investment contracts

Select the **Wholesaler** account in MetaMask for this entire section.

1. Deploy `KTUToken` with no constructor arguments. Save its address as
   `TOKEN_ADDRESS`.
2. On `KTUToken`, verify:
   - `name()` = `KTUToken`
   - `symbol()` = `KTU`
   - `totalSupply()` = `1000000000000000000000000`
   - `balanceOf(WHOLESALER_ADDRESS)` =
     `1000000000000000000000000`
3. Deploy `DividendPool` with `TOKEN_ADDRESS`. Save its address as
   `DIVIDEND_POOL_ADDRESS`.
4. Verify `administrator()` is the Wholesaler address, `periodDuration()` is
   `180`, and `currentPeriodDuration()` is `180`.
5. Call `setPeriodDuration(300)` from Wholesaler. Verify `periodDuration()` is
   now `300`, while `currentPeriodDuration()` remains `180`. The first period
   keeps its original three-minute duration.
6. Deploy `TokenSale` with these constructor arguments:

   ```text
   TOKEN_ADDRESS,10000000000000
   ```

   This sets the price to `0.00001 ETH` per whole KTU token.

7. Save the deployed address as `TOKEN_SALE_ADDRESS` and verify its
   `administrator()` is Wholesaler.
8. On `DividendPool`, call `setTokenSale(TOKEN_SALE_ADDRESS)`. Verify
   `tokenSale()` returns that address.
9. On `KTUToken`, transfer the full supply to the sale by calling:

   ```text
   transfer(TOKEN_SALE_ADDRESS, 1000000000000000000000000)
   ```

10. Verify `balanceOf(TOKEN_SALE_ADDRESS)` is
    `1000000000000000000000000` and `balanceOf(WHOLESALER_ADDRESS)` is `0`.

Expected result: Wholesaler controls the token price, sale withdrawals,
dividend-period configuration, and the initial token inventory. `KTUToken`
itself has no privileged administrator functions after deployment. Unsold
tokens held by `TokenSale` will be excluded from dividend calculations.

## 4. Buy KTU tokens

For each purchase, select the stated account and open the deployed `TokenSale`.
If Remix only allows `wei`, enter the integer from the **VALUE in wei** column
into the **VALUE** field, select `wei`, and call `buyTokens` with the shown
function input.

| Account  | `buyTokens` input | VALUE in ETH |       VALUE in wei | Remix unit | Expected KTU token balance |
| -------- | ----------------: | -----------: | -----------------: | ---------: | -------------------------: |
| Producer |             `100` |      `0.001` | `1000000000000000` |      `wei` |    `100000000000000000000` |
| Retailer |             `200` |      `0.002` | `2000000000000000` |      `wei` |    `200000000000000000000` |
| Consumer |             `300` |      `0.003` | `3000000000000000` |      `wei` |    `300000000000000000000` |

Do not enter the expected KTU token balance in Remix's VALUE field. For example,
Producer enters `100` in `buyTokens`, enters `1000000000000000` in VALUE, and
selects `wei`. MetaMask should show a transfer of approximately `0.001 ETH`
plus gas.

Verify after all purchases:

- `TokenSale.totalTokensSold()` = `600000000000000000000`, which means
  **600 KTU tokens** because the KTU token uses 18 decimal places.
- `TokenSale.totalInvestedWei()` = `6000000000000000`, which means
  **0.006 ETH** received by `TokenSale`.
- `TokenSale.purchasedTokens(address)` and `investedWei(address)` match each
  row above.
- `KTUToken.delegates(address)` returns the same address for each investor.
- `KTUToken.balanceOf(TOKEN_SALE_ADDRESS)` =
  `999400000000000000000000`, which means **999,400 KTU tokens remain unsold** in
  `TokenSale`. This is a KTU token balance, not an ETH balance.

Remix displays ERC-20 balances in the token's smallest units. For the KTU token,
one `KTU` token equals `1000000000000000000` smallest token units. ETH values use wei instead:
`1 ETH = 1000000000000000000 wei`.

## 5. Deploy the three marketplaces

The deploying account becomes the immutable seller. Pass only
`DIVIDEND_POOL_ADDRESS` to each constructor.

1. Select **Producer** and deploy `ProducerWholesaler`. Save the address as
   `PRODUCER_WHOLESALER_ADDRESS`. Verify `producer()` is Producer.
2. Select **Wholesaler** and deploy `WholesalerRetailer`. Save the address as
   `WHOLESALER_RETAILER_ADDRESS`. Verify `wholesaler()` is Wholesaler.
3. Select **Retailer** and deploy `RetailerConsumer`. Save the address as
   `RETAILER_CONSUMER_ADDRESS`. Verify `retailer()` is Retailer.
4. On all three contracts, verify `dividendPool()` returns
   `DIVIDEND_POOL_ADDRESS` and `DIVIDEND_FEE_PERCENT()` returns `5`.

## 6. Execute the real supply-chain scenario

Use product ID `1` at every stage. A listing in one marketplace is independent
from a listing in another marketplace.

### Producer sells to Wholesaler

1. Select **Producer** and call on `ProducerWholesaler`:

   ```text
   listProduct(1, 10, 1000000000000000)
   ```

2. Call `getListing(1)` and expect unit price `1000000000000000`, quantity
   `10`, and `active = true`.
3. Optionally exercise the price setter by calling
   `setWholesalePrice(1, 1000000000000000)`.
4. Call `calculatePayment(1, 10)` and expect:
   - `productPrice` = `10000000000000000` (`0.01 ETH`)
   - `dividendFee` = `500000000000000` (`0.0005 ETH`)
   - `totalPayment` = `10500000000000000` (`0.0105 ETH`)
5. Select **Wholesaler**, enter `10500000000000000` in the VALUE field,
   select `wei`, and call `buyProduct(1, 10)`. This equals `0.0105 ETH`.
6. Verify the listing quantity is `0` and `active = false`. The Producer
   receives exactly `0.01 ETH`, and the pool receives `0.0005 ETH`.
   Wholesaler pays the purchase transaction fee separately.

### Wholesaler sells to Retailer

1. Select **Wholesaler** and call on `WholesalerRetailer`:

   ```text
   listProduct(1, 8, 2000000000000000)
   ```

2. Optionally call `setRetailPrice(1, 2000000000000000)`.
3. Call `calculatePayment(1, 8)` and expect:
   - `productPrice` = `16000000000000000` (`0.016 ETH`)
   - `dividendFee` = `800000000000000` (`0.0008 ETH`)
   - `totalPayment` = `16800000000000000` (`0.0168 ETH`)
4. Select **Retailer**, enter `16800000000000000` in the VALUE field,
   select `wei`, and call `buyProduct(1, 8)`. This equals `0.0168 ETH`.
5. Verify the listing is inactive. Wholesaler receives exactly `0.016 ETH`,
   and the pool receives `0.0008 ETH`. Retailer pays the purchase transaction
   fee separately.

### Retailer sells to Consumer

1. Select **Retailer** and call on `RetailerConsumer`:

   ```text
   listProduct(1, 5, 3000000000000000)
   ```

2. Optionally call `setProductPrice(1, 3000000000000000)`.
3. Call `calculatePayment(1, 5)` and expect:
   - `productPrice` = `15000000000000000` (`0.015 ETH`)
   - `dividendFee` = `750000000000000` (`0.00075 ETH`)
   - `totalPayment` = `15750000000000000` (`0.01575 ETH`)
4. Select **Consumer**, enter `15750000000000000` in the VALUE field,
   select `wei`, and call `buyProduct(1, 5)`. This equals `0.01575 ETH`.
5. Verify the listing is inactive. Retailer receives exactly `0.015 ETH`,
   and the pool receives `0.00075 ETH`. Consumer pays the purchase transaction
   fee separately.

After all three sales, the balance of `DividendPool` should have increased by
exactly `2050000000000000` wei (`0.00205 ETH`). Each successful purchase must
also emit the marketplace's `ProductSold` event with the correct seller,
buyer, quantity, product price, fee, and pool address.

## 7. Close and pay dividend period 1 manually

Keep the oracle process stopped for this section. Anyone may close a period or
pay a batch, so use the **Oracle** account to model production behavior.

1. Read `nextPeriodCloseAt()`. Wait until the latest Sepolia block timestamp is
   at least this Unix timestamp. The first period cannot be shortened below
   the constructor's 180 seconds.
2. Select **Oracle** and call `closeDividendPeriod()`.
3. Verify:
   - `currentPeriod()` = `1`
   - `periodFund()` = `2050000000000000`
   - `eligibleSnapshotSupply()` = `600000000000000000000`
   - `periodRemaining()` = `2050000000000000`
   - `currentPeriodDuration()` = `300`
   - `snapshotBlock()` is one block before the closing transaction's block
4. Call `pendingDividend(address)` for each investor and expect:

| Investor   | Expected pending dividend |
| ---------- | ------------------------: |
| Producer   |     `341666666666666` wei |
| Retailer   |     `683333333333333` wei |
| Consumer   |    `1025000000000000` wei |
| Wholesaler |                   `0` wei |

5. From **Oracle**, call `payDividendBatch(20)`. This processes all known
   holder addresses, including zero-balance historical holders.
6. Verify `payoutCursor()` equals `payoutInvestorCount()`,
   `periodRemaining()` is `0`, and `accountedEtherBalance()` is `0`.
7. Verify the three `DividendPaid` events match the table. The integer division
   leaves one wei, which `_releaseRoundingRemainder` releases for a future
   period instead of paying it in this batch.
8. Calling `payDividendBatch(20)` again must revert with
   `No dividend payout pending`.

## 8. Test token transfers and manual claims in period 2

1. Select **Producer** and on `KTUToken` call:

   ```text
   transfer(CONSUMER_ADDRESS, 100000000000000000000)
   ```

2. Verify current balances: Producer `0 KTU tokens`, Retailer `200 KTU tokens`, and Consumer
   `400 KTU tokens`.
3. Select any MetaMask account and open `DividendPool` in Remix. Under
   **Low level interactions**, enter `600000000000000` in the **VALUE** field,
   select `wei`, leave calldata empty, and click **Transact**. This sends
   `0.0006 ETH` directly to the contract, calls `receive()`, and emits
   `DividendReceived`.
4. Read `nextPeriodCloseAt()` and wait until that timestamp. Period 2 uses the
   configured five-minute duration, but a late closure of period 1 does not
   start a fresh five-minute countdown at the closing transaction timestamp.
5. Select **Oracle** and call `closeDividendPeriod()`.
6. Verify `currentPeriod()` is `2`. Because the one-wei remainder from period 1
   became available again, `periodFund()` should be `600000000000001` wei.
7. Verify the snapshot follows the new token ownership:
   - Producer pending dividend = `0`
   - Retailer pending dividend = `200000000000000` wei
   - Consumer pending dividend = `400000000000000` wei
8. Select **Retailer** and call `claimDividend()`. The event amount should be
   `200000000000000` wei. The Retailer's wallet pays gas, so its net wallet
   increase will be less than the claimed amount.
9. Select **Oracle** and call `payDividendBatch(20)`. Retailer must not be paid
   twice; Consumer receives `400000000000000` wei.
10. Verify `payoutCursor()` equals `payoutInvestorCount()`,
    `periodRemaining()` is `0`, and `accountedEtherBalance()` is `0`.

The extra one wei in period 2 is again a rounding remainder. It is not part of
either investor's integer-divided payout.

## 9. Test TokenSale administrator operations

Run these after the deterministic dividend checks because withdrawing unsold
tokens changes future eligible supply.

1. Select **Wholesaler** and call `setTokenPriceWei(20000000000000)`. Verify
   `tokenPriceWei()` changed from `10000000000000` to `20000000000000` and the
   `TokenPriceChanged` event was emitted.
2. Call `withdrawSaleProceeds(WHOLESALER_ADDRESS)`. Expect
   `SaleProceedsWithdrawn` with `6000000000000000` wei and verify the
   `TokenSale` ETH balance becomes zero.
3. Call:

   ```text
   withdrawUnsoldTokens(WHOLESALER_ADDRESS, 100000000000000000000)
   ```

4. Verify Wholesaler receives `100 KTU tokens` and the
   `UnsoldTokensWithdrawn` event contains that amount.
5. Optionally test standard ERC-20 behavior after all dividend assertions:
   approve a small amount, use `transferFrom` from the approved account, and
   burn a small amount. Verify balances, allowance, and `totalSupply()` after
   each operation.

## 10. Run the oracle and verify Google Sheets

Configure the oracle only after all deployed addresses are known. In
`blockchain-oracle/.env`, set:

```dotenv
SEPOLIA_RPC_URL=YOUR_SEPOLIA_RPC_URL
GOOGLE_SHEET_ID=YOUR_GOOGLE_SHEET_ID
TOKEN_SALE_ADDRESS=TOKEN_SALE_ADDRESS
PRODUCER_WHOLESALER_ADDRESS=PRODUCER_WHOLESALER_ADDRESS
WHOLESALER_RETAILER_ADDRESS=WHOLESALER_RETAILER_ADDRESS
RETAILER_CONSUMER_ADDRESS=RETAILER_CONSUMER_ADDRESS
DIVIDEND_POOL_ADDRESS=DIVIDEND_POOL_ADDRESS
ORACLE_PRIVATE_KEY=ORACLE_ACCOUNT_PRIVATE_KEY
DIVIDEND_PAYOUT_BATCH_SIZE=20
ORACLE_EVENT_CONFIRMATIONS=6
ORACLE_EVENT_BLOCK_RANGE=1000
ORACLE_EVENT_POLL_INTERVAL_MS=15000
ORACLE_START_BLOCK=KTU_DEPLOYMENT_BLOCK
```

Replace all example values with the actual values. `KTU_DEPLOYMENT_BLOCK`
must be an integer block number. Use a fresh spreadsheet with no saved
`OracleState` checkpoint for this historical import; an existing checkpoint
takes precedence over `ORACLE_START_BLOCK`.

Run the oracle:

```powershell
Set-Location blockchain-oracle
npm install
npm start
```

For the automation test, leave the process running, send another small ETH
amount to `DividendPool`, and wait past `nextPeriodCloseAt()`. The terminal
should report one period-close transaction followed by dividend-batch
transactions. Verify `payoutCursor() == payoutInvestorCount()` afterward.

After the configured confirmation count, verify these sheets:

- `Investments`: three `TokensPurchased` rows.
- `ValueChain`: three `ProductSold` rows, one for each marketplace.
- `DividendPeriods`: all manually and automatically closed periods.
- `DividendPayments`: the expected `DividendPaid` rows.
- `OracleState`: the latest completely processed confirmed block.

`Period Investors Count` counts eligible holders at the snapshot, not all
addresses in `payoutInvestorCount()`. The current `All KTU Tokens Sold to Date`
column contains eligible snapshot supply, not cumulative sales. If a
`DividendDeferred` row appears, its `Amount Paid` value is reserved rather
than transferred; investigate the recipient's ability to accept ETH and use
`claimDividend` once it can receive the payment.

Restart the oracle once and confirm that existing rows are not duplicated.
After the first successful historical backfill, remove `ORACLE_START_BLOCK`
from `.env`; the saved `OracleState` checkpoint will be used on later starts.

## 11. Final acceptance checklist

The deployment passes when all of the following are true:

- Wholesaler deployed `KTUToken`, is administrator of `DividendPool` and
  `TokenSale`, and is the seller in `WholesalerRetailer`.
- Each marketplace pays the seller the full stated product price and sends
  an additional fee of 5% of that price, rounded down to whole wei, to the
  dividend pool.
- Unsold KTU tokens in `TokenSale` do not dilute investor dividends.
- Period 1 allocates dividends to the `100:200:300` KTU token holders in a `1:2:3`
  ratio, with each payout rounded down to whole wei.
- A token transfer after period 1 affects period 2 but cannot change period 1.
- `claimDividend` and batch payout cannot pay the same period twice.
- Only the appropriate administrator or seller can call restricted methods.
- The oracle closes due periods, completes all batches, writes confirmed
  events to the correct sheets, and does not duplicate rows after restart.
