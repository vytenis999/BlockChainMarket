# Rankinio testavimo scenarijus su Remix ir Sepolia

Šis scenarijus skirtas visapusiškai patikrinti investavimą į KTU žetonus, tris
tiekimo grandinės etapus, balansų momentinę kopiją, paketinį išmokėjimą, rankinį
atsiėmimą, administratoriaus lėšų išėmimą ir oracle veikimą Sepolia tinkle.
Naudokite tik testinį ETH.

Naudokite naujai įdiegtas sutartis ir nepaleiskite oracle iki 10 skyriaus.
Kol nebaigėte 8 skyriaus, neatlikite papildomų pirkimų, ETH įmokų, žetonų
pervedimų, deginimo ar periodų uždarymo veiksmų, nenurodytų šiame scenarijuje.
Tikėtini likučiai apskaičiuoti darant prielaidą, kad visos investuotojų
piniginės priima ETH pervedimus.

## 1. Paskyros ir vaidmenys

Naudokite penkias toliau nurodytas MetaMask paskyras. Prieš pradėdami
užsirašykite visą kiekvienos paskyros adresą.

| MetaMask paskyra | Vaidmuo                                                                    | Atsakomybė                                                              |
| ---------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Producer         | Gamintojas ir KTU žetonų investuotojas                                     | Įdiegia `ProducerWholesaler` ir per ją parduoda                         |
| Wholesaler       | KTU žetono diegėjas, pardavimo bei fondo administratorius ir didmenininkas | Įdiegia `KTUToken`, `DividendPool`, `TokenSale` ir `WholesalerRetailer` |
| Retailer         | Mažmenininkas ir KTU žetonų investuotojas                                  | Įdiegia `RetailerConsumer` ir per ją parduoda                           |
| Consumer         | Vartotojas ir KTU žetonų investuotojas                                     | Perka iš `RetailerConsumer`                                             |
| Oracle           | Automatizavimo paskyra                                                     | Uždaro dividendų periodus ir vykdo paketines išmokas; sutarčių nediegia |

Visose paskyrose turi būti pakankamai Sepolia ETH transakcijų mokesčiams. Producer,
Wholesaler, Retailer ir Consumer paskyroms taip pat reikės nedidelių žemiau
nurodytų sumų pirkimams. Oracle paskyroje laikykite tik nedidelį testinio ETH
kiekį.

## 2. Remix paruošimas

1. Atidarykite Remix, pridėkite visus failus iš `contracts/` ir kompiliuokite
   naudodami Solidity `0.8.36`.
2. Skiltyje **Deploy & Run Transactions** kaip aplinką pasirinkite
   **Browser Extension**, o kaip piniginę - **MetaMask**.
3. Prieš kiekvieną diegimą ir transakciją patikrinkite, kad Remix rodo
   numatytos MetaMask paskyros adresą, o MetaMask yra prijungta prie Sepolia
   tinklo.
4. Funkcijų parametruose ETH sumas ir kainas įveskite wei vienetais.
   `buyTokens` priima sveiką KTU žetonų skaičių, o ERC-20 `transfer`,
   `approve`, `burn` ir `withdrawUnsoldTokens` naudoja mažiausius žetono
   vienetus. Produktų ID, kiekiai, adresai ir trukmės sekundėmis nėra wei
   reikšmės.
5. ETH priimančioms funkcijoms sumą atskirai įveskite lauke **VALUE** ir
   pasirinkite nurodytą `Wei` arba `Ether` vienetą. Po kiekvieno tokio kvietimo
   grąžinkite **VALUE** į `0`. Prieš kiekvieną diegimą ir ETH nepriimančios
   funkcijos kvietimą, įskaitant `listProduct`, `transfer`,
   `closeDividendPeriod`, `payDividendBatch` ir `claimDividend`, patikrinkite,
   kad **VALUE** yra `0`.

Niekada neįklijuokite privataus rakto į Remix. Sutarties adresas nėra paskyros
adresas, todėl kiekvieną įdiegtos sutarties adresą nukopijuokite atidžiai.

## 3. Investavimo sutarčių diegimas

Visoje šioje dalyje MetaMask pasirinkite **Wholesaler** paskyrą.

1. Įdiekite `KTUToken` be konstruktoriaus parametrų. Išsaugokite adresą kaip
   `TOKEN_ADDRESS`.
2. `KTUToken` sutartyje patikrinkite:
   - `name()` = `KTUToken`
   - `symbol()` = `KTU`
   - `totalSupply()` = `1000000000000000000000000`
   - `balanceOf(WHOLESALER_ADDRESS)` =
     `1000000000000000000000000`
3. Įdiekite `DividendPool`, konstruktoriui perduodami `TOKEN_ADDRESS`.
   Išsaugokite adresą kaip `DIVIDEND_POOL_ADDRESS`.
4. Patikrinkite, kad `administrator()` grąžina Wholesaler adresą,
   `periodDuration()` grąžina `180`, o `currentPeriodDuration()` grąžina `180`.
5. Iš Wholesaler paskyros iškvieskite `setPeriodDuration(300)`. Patikrinkite,
   kad `periodDuration()` dabar grąžina `300`, tačiau
   `currentPeriodDuration()` vis dar grąžina `180`. Pirmasis periodas išlaiko
   pradinę trijų minučių trukmę.
6. Įdiekite `TokenSale` su šiais konstruktoriaus parametrais:

   ```text
   TOKEN_ADDRESS,10000000000000
   ```

   Taip vieno KTU žetono kaina nustatoma į `0.00001 ETH`.

7. Išsaugokite sutarties adresą kaip `TOKEN_SALE_ADDRESS` ir patikrinkite, kad
   jos `administrator()` yra Wholesaler.
8. `DividendPool` sutartyje iškvieskite `setTokenSale(TOKEN_SALE_ADDRESS)`.
   Patikrinkite, kad `tokenSale()` grąžina šį adresą.
9. `KTUToken` sutartyje perveskite visą pasiūlą pardavimo sutarčiai:

   ```text
   transfer(TOKEN_SALE_ADDRESS, 1000000000000000000000000)
   ```

10. Patikrinkite, kad `balanceOf(TOKEN_SALE_ADDRESS)` yra
    `1000000000000000000000000`, o `balanceOf(WHOLESALER_ADDRESS)` yra `0`.

Tikėtinas rezultatas: Wholesaler valdo žetono kainą, pardavimo lėšų išėmimą,
dividendų periodo nustatymus ir pradinę žetonų pasiūlą. Pati `KTUToken`
sutartis po diegimo neturi privilegijuotų administratoriaus funkcijų.
`TokenSale` laikomi neparduoti žetonai nebus įtraukti skaičiuojant dividendus.

## 4. KTU žetonų pirkimas

Kiekvienam pirkimui pasirinkite nurodytą paskyrą ir atidarykite įdiegtą
`TokenSale`. Jei Remix leidžia pasirinkti tik `wei`, į **VALUE** lauką
įrašykite sveikąjį skaičių iš stulpelio **VALUE wei**, pasirinkite `wei` ir
iškvieskite `buyTokens` su lentelėje nurodytu funkcijos parametru.

| Paskyra  | `buyTokens` parametras | VALUE ETH |          VALUE wei | Remix vienetas | Tikėtinas KTU žetonų likutis |
| -------- | ---------------------: | --------: | -----------------: | -------------: | ---------------------------: |
| Producer |                  `100` |   `0.001` | `1000000000000000` |          `wei` |      `100000000000000000000` |
| Retailer |                  `200` |   `0.002` | `2000000000000000` |          `wei` |      `200000000000000000000` |
| Consumer |                  `300` |   `0.003` | `3000000000000000` |          `wei` |      `300000000000000000000` |

Neįveskite tikėtino KTU žetonų likučio į Remix VALUE lauką. Pavyzdžiui, Producer
`buyTokens` laukelyje įveda `100`, VALUE laukelyje įveda
`1000000000000000` ir pasirenka `wei`. MetaMask turi rodyti maždaug
`0.001 ETH` pervedimą ir transakcijos mokestį.

Po visų pirkimų patikrinkite:

- `TokenSale.totalTokensSold()` = `600000000000000000000`. Tai reiškia
  **600 KTU žetonų**, nes KTU žetonas turi 18 skaitmenų po kablelio.
- `TokenSale.totalInvestedWei()` = `6000000000000000`. Tai reiškia, kad
  `TokenSale` gavo **0.006 ETH**.
- Kiekvieno adreso `TokenSale.purchasedTokens(address)` ir
  `investedWei(address)` reikšmės atitinka lentelę.
- Kiekvienam investuotojui `KTUToken.delegates(address)` grąžina to paties
  investuotojo adresą.
- `KTUToken.balanceOf(TOKEN_SALE_ADDRESS)` =
  `999400000000000000000000`. Tai reiškia, kad `TokenSale` liko neparduota
  **999 400 KTU žetonų**. Tai yra KTU žetonų, o ne ETH likutis.

Remix ERC-20 likučius rodo mažiausiais žetono vienetais. KTU žetono atveju
vieną `KTU` žetoną sudaro `1000000000000000000` mažiausių žetono vienetų. ETH sumos skaičiuojamos wei:
`1 ETH = 1000000000000000000 wei`.

## 5. Trijų prekyviečių diegimas

Sutartį diegianti paskyra tampa nekintamu jos pardavėju. Kiekvienos sutarties
konstruktoriui perduokite tik `DIVIDEND_POOL_ADDRESS`.

1. Pasirinkite **Producer** ir įdiekite `ProducerWholesaler`. Išsaugokite adresą
   kaip `PRODUCER_WHOLESALER_ADDRESS`. Patikrinkite, kad `producer()` yra
   Producer.
2. Pasirinkite **Wholesaler** ir įdiekite `WholesalerRetailer`. Išsaugokite
   adresą kaip `WHOLESALER_RETAILER_ADDRESS`. Patikrinkite, kad `wholesaler()`
   yra Wholesaler.
3. Pasirinkite **Retailer** ir įdiekite `RetailerConsumer`. Išsaugokite adresą
   kaip `RETAILER_CONSUMER_ADDRESS`. Patikrinkite, kad `retailer()` yra Retailer.
4. Visose trijose sutartyse patikrinkite, kad `dividendPool()` grąžina
   `DIVIDEND_POOL_ADDRESS`, o `DIVIDEND_FEE_PERCENT()` grąžina `5`.

## 6. Realus tiekimo grandinės scenarijus

Visuose etapuose naudokite produkto ID `1`. Vienoje prekyvietėje sukurtas
pasiūlymas nepriklauso nuo pasiūlymo kitoje prekyvietėje.

### Gamintojas parduoda didmenininkui

1. Pasirinkite **Producer** ir `ProducerWholesaler` sutartyje iškvieskite:

   ```text
   listProduct(1, 10, 1000000000000000)
   ```

2. Iškvieskite `getListing(1)`. Tikėtina vieneto kaina yra
   `1000000000000000`, kiekis `10`, o `active = true`.
3. Norėdami patikrinti kainos keitimo funkciją, galite iškviesti
   `setWholesalePrice(1, 1000000000000000)`.
4. Iškvieskite `calculatePayment(1, 10)`. Tikėtinos reikšmės:
   - `productPrice` = `10000000000000000` (`0.01 ETH`)
   - `dividendFee` = `500000000000000` (`0.0005 ETH`)
   - `totalPayment` = `10500000000000000` (`0.0105 ETH`)
5. Pasirinkite **Wholesaler**, į VALUE lauką įveskite
   `10500000000000000`, pasirinkite `wei` ir iškvieskite
   `buyProduct(1, 10)`. Tai atitinka `0.0105 ETH`.
6. Patikrinkite, kad pasiūlymo kiekis yra `0`, o `active = false`. Producer
   gauna tiksliai `0.01 ETH`, o fondas gauna `0.0005 ETH`. Pirkimo
   transakcijos mokestį atskirai moka Wholesaler.

### Didmenininkas parduoda mažmenininkui

1. Pasirinkite **Wholesaler** ir `WholesalerRetailer` sutartyje iškvieskite:

   ```text
   listProduct(1, 8, 2000000000000000)
   ```

2. Norėdami patikrinti kainos keitimo funkciją, galite iškviesti
   `setRetailPrice(1, 2000000000000000)`.
3. Iškvieskite `calculatePayment(1, 8)`. Tikėtinos reikšmės:
   - `productPrice` = `16000000000000000` (`0.016 ETH`)
   - `dividendFee` = `800000000000000` (`0.0008 ETH`)
   - `totalPayment` = `16800000000000000` (`0.0168 ETH`)
4. Pasirinkite **Retailer**, į VALUE lauką įveskite
   `16800000000000000`, pasirinkite `wei` ir iškvieskite
   `buyProduct(1, 8)`. Tai atitinka `0.0168 ETH`.
5. Patikrinkite, kad pasiūlymas nebeaktyvus. Wholesaler gauna tiksliai
   `0.016 ETH`, o fondas gauna `0.0008 ETH`. Pirkimo transakcijos mokestį
   atskirai moka Retailer.

### Mažmenininkas parduoda vartotojui

1. Pasirinkite **Retailer** ir `RetailerConsumer` sutartyje iškvieskite:

   ```text
   listProduct(1, 5, 3000000000000000)
   ```

2. Norėdami patikrinti kainos keitimo funkciją, galite iškviesti
   `setProductPrice(1, 3000000000000000)`.
3. Iškvieskite `calculatePayment(1, 5)`. Tikėtinos reikšmės:
   - `productPrice` = `15000000000000000` (`0.015 ETH`)
   - `dividendFee` = `750000000000000` (`0.00075 ETH`)
   - `totalPayment` = `15750000000000000` (`0.01575 ETH`)
4. Pasirinkite **Consumer**, į VALUE lauką įveskite
   `15750000000000000`, pasirinkite `wei` ir iškvieskite
   `buyProduct(1, 5)`. Tai atitinka `0.01575 ETH`.
5. Patikrinkite, kad pasiūlymas nebeaktyvus. Retailer gauna tiksliai
   `0.015 ETH`, o fondas gauna `0.00075 ETH`. Pirkimo transakcijos mokestį
   atskirai moka Consumer.

Po visų trijų pardavimų `DividendPool` likutis turi būti padidėjęs tiksliai
`2050000000000000` wei (`0.00205 ETH`). Kiekvienas sėkmingas pirkimas taip pat
turi išleisti atitinkamos prekyvietės `ProductSold` įvykį su teisingais
pardavėjo, pirkėjo, kiekio, produkto kainos, mokesčio ir fondo adreso duomenimis.

## 7. Rankinis pirmojo dividendų periodo uždarymas ir išmokėjimas

Šioje dalyje oracle procesas turi būti sustabdytas. Periodą uždaryti ir paketą
išmokėti gali bet kas, todėl gamybinei eigai imituoti naudokite **Oracle**
paskyrą.

1. Nuskaitykite `nextPeriodCloseAt()`. Palaukite, kol naujausio Sepolia bloko
   laiko žyma bus ne mažesnė už šią Unix laiko žymą. Pirmojo periodo negalima
   sutrumpinti žemiau konstruktoriuje nustatytų 180 sekundžių.
2. Pasirinkite **Oracle** ir iškvieskite `closeDividendPeriod()`.
3. Patikrinkite:
   - `currentPeriod()` = `1`
   - `periodFund()` = `2050000000000000`
   - `eligibleSnapshotSupply()` = `600000000000000000000`
   - `periodRemaining()` = `2050000000000000`
   - `currentPeriodDuration()` = `300`
   - `snapshotBlock()` yra vienu bloku mažesnis už uždarymo transakcijos bloką
4. Kiekvienam investuotojui iškvieskite `pendingDividend(address)`:

| Investuotojas | Tikėtinas neišmokėtas dividendas |
| ------------- | -------------------------------: |
| Producer      |            `341666666666666` wei |
| Retailer      |            `683333333333333` wei |
| Consumer      |           `1025000000000000` wei |
| Wholesaler    |                          `0` wei |

5. Iš **Oracle** paskyros iškvieskite `payDividendBatch(20)`. Bus apdoroti visi
   žinomi turėtojų adresai, įskaitant istorinius adresus, kurių likutis lygus
   nuliui.
6. Patikrinkite, kad `payoutCursor()` yra lygus `payoutInvestorCount()`,
   `periodRemaining()` yra `0`, o `accountedEtherBalance()` yra `0`.
7. Patikrinkite, kad trys `DividendPaid` įvykiai atitinka lentelę. Dėl sveikųjų
   skaičių dalybos lieka vienas wei. `_releaseRoundingRemainder` jį atlaisvina
   būsimam periodui, užuot išmokėjusi šiame pakete.
8. Dar kartą iškviestas `payDividendBatch(20)` turi būti atmestas su klaida
   `No dividend payout pending`.

## 8. KTU žetonų pervedimo įtaka antrojo periodo dividendams ir rankinis atsiėmimas

1. Pasirinkite **Producer** ir `KTUToken` sutartyje iškvieskite:

   ```text
   transfer(CONSUMER_ADDRESS, 100000000000000000000)
   ```

2. Patikrinkite dabartinius likučius: Producer turi `0 KTU žetonų`, Retailer turi
   `200 KTU žetonų`, o Consumer turi `400 KTU žetonų`.
3. Pasirinkite bet kurią MetaMask paskyrą ir Remix atidarykite `DividendPool`.
   Skiltyje **Low level interactions** į **VALUE** lauką įveskite
   `600000000000000`, pasirinkite `wei`, calldata lauką palikite tuščią ir
   spauskite **Transact**. Taip tiesiogiai į sutartį nusiunčiama `0.0006 ETH`,
   iškviečiama `receive()` funkcija ir išleidžiamas `DividendReceived` įvykis.
4. Nuskaitykite `nextPeriodCloseAt()` ir palaukite iki šios laiko žymos.
   Antrajam periodui jau taikoma nustatyta penkių minučių trukmė, tačiau
   pavėlavus uždaryti pirmąjį periodą naujos penkios minutės nuo uždarymo
   transakcijos laiko nepradedamos skaičiuoti.
5. Pasirinkite **Oracle** ir iškvieskite `closeDividendPeriod()`.
6. Patikrinkite, kad `currentPeriod()` yra `2`. Kadangi vieno wei likutis iš
   pirmojo periodo vėl tapo prieinamas, `periodFund()` turi būti
   `600000000000001` wei.
7. Patikrinkite, kad momentinė kopija atitinka naują žetonų nuosavybę:
   - Producer neišmokėtas dividendas = `0`
   - Retailer neišmokėtas dividendas = `200000000000000` wei
   - Consumer neišmokėtas dividendas = `400000000000000` wei
8. Pasirinkite **Retailer** ir iškvieskite `claimDividend()`. Įvykio suma turi
   būti `200000000000000` wei. Retailer piniginė moka transakcijos mokestį, todėl jos
   grynasis likučio padidėjimas bus mažesnis už atsiimtą sumą.
9. Pasirinkite **Oracle** ir iškvieskite `payDividendBatch(20)`. Retailer negali
   gauti išmokos antrą kartą, o Consumer gauna `400000000000000` wei.
10. Patikrinkite, kad `payoutCursor()` yra lygus `payoutInvestorCount()`,
    `periodRemaining()` yra `0`, o `accountedEtherBalance()` yra `0`.

Papildomas vienas wei antrame periode ir vėl lieka dėl apvalinimo. Jis nėra
įtrauktas į nė vieno investuotojo išmoką, apskaičiuotą sveikųjų skaičių dalyba.

## 9. TokenSale administratoriaus funkcijų testas

Šiuos veiksmus atlikite tik po dividendų sumų patikrų, nes neparduotų
žetonų išėmimas pakeičia tinkamą pasiūlą būsimuose perioduose.

1. Pasirinkite **Wholesaler** ir iškvieskite
   `setTokenPriceWei(20000000000000)`. Patikrinkite, kad `tokenPriceWei()`
   pasikeitė iš `10000000000000` į `20000000000000` ir buvo išleistas
   `TokenPriceChanged` įvykis.
2. Iškvieskite `withdrawSaleProceeds(WHOLESALER_ADDRESS)`. Tikėkitės
   `SaleProceedsWithdrawn` įvykio su `6000000000000000` wei ir patikrinkite,
   kad `TokenSale` ETH likutis tapo lygus nuliui.
3. Iškvieskite:

   ```text
   withdrawUnsoldTokens(WHOLESALER_ADDRESS, 100000000000000000000)
   ```

4. Patikrinkite, kad Wholesaler gavo `100 KTU žetonų`, o `UnsoldTokensWithdrawn`
   įvykyje nurodyta ši suma.
5. Po visų dividendų patikrų papildomai galite išbandyti standartines ERC-20
   funkcijas: patvirtinti nedidelę sumą per `approve`, panaudoti `transferFrom`
   iš patvirtintos paskyros ir sudeginti nedidelį kiekį per `burn`. Po kiekvieno
   veiksmo patikrinkite likučius, leidimą ir `totalSupply()`.

## 10. Oracle paleidimas ir Google Sheets patikra

Oracle konfigūruokite tik tada, kai jau žinomi visi įdiegtų sutarčių adresai.
Faile `blockchain-oracle/.env` nustatykite:

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

Visas pavyzdines reikšmes pakeiskite tikromis. `KTU_DEPLOYMENT_BLOCK` turi
būti sveikasis bloko numeris. Šiam istorinių įvykių įkėlimui naudokite naują
skaičiuoklę be išsaugotos `OracleState` bloko žymos; esama žyma turi
pirmumą prieš `ORACLE_START_BLOCK`.

Paleiskite Oracle:

```powershell
Set-Location blockchain-oracle
npm install
npm start
```

Automatizavimo testui palikite procesą veikiantį, nusiųskite dar vieną nedidelę
ETH sumą į `DividendPool` ir palaukite, kol praeis `nextPeriodCloseAt()` laikas.
Terminale turi būti parodyta viena periodo uždarymo transakcija ir po jos
dividendų paketų transakcijos. Tada patikrinkite, kad
`payoutCursor() == payoutInvestorCount()`.

Praėjus nustatytam patvirtinimų skaičiui, patikrinkite šiuos lapus:

- `Investments`: trys `TokensPurchased` įrašai.
- `ValueChain`: trys `ProductSold` įrašai, po vieną iš kiekvienos prekyvietės.
- `DividendPeriods`: visi rankiniu ir automatiniu būdu uždaryti periodai.
- `DividendPayments`: tikėtini `DividendPaid` įrašai.
- `OracleState`: paskutinis visiškai apdorotas patvirtintas blokas.

`Period Investors Count` nurodo tinkamų turėtojų skaičių balansų fiksavimo
metu, o ne visų `payoutInvestorCount()` adresų skaičių. Dabartiniame stulpelyje
`All KTU Tokens Sold to Date` įrašoma tinkama pasiūla balansų fiksavimo metu,
o ne bendras istorinis parduotų žetonų kiekis. Jei atsiranda `DividendDeferred`
įrašas, jo `Amount Paid` suma yra rezervuota, bet nepervesta. Patikrinkite, ar
gavėjas gali priimti ETH, ir naudokite `claimDividend`, kai jis galės priimti
išmoką.

Vieną kartą paleiskite oracle iš naujo ir patikrinkite, kad esami įrašai
nedubliuojami. Po pirmojo sėkmingo istorinių duomenų įkėlimo pašalinkite
`ORACLE_START_BLOCK` iš `.env`; vėliau bus naudojama išsaugota `OracleState`
paskutinio apdoroto bloko žyma.

## 11. Galutiniai priėmimo kriterijai

Diegimas laikomas sėkmingu, kai tenkinamos visos šios sąlygos:

- Wholesaler įdiegė `KTUToken`, yra `DividendPool` ir `TokenSale`
  administratorius bei `WholesalerRetailer` pardavėjas.
- Kiekviena prekyvietė perveda pardavėjui visą nurodytą produkto kainą, o
  papildomą 5 % produkto kainos mokestį, suapvalintą žemyn iki sveikojo wei
  skaičiaus, siunčia į dividendų fondą.
- `TokenSale` laikomi neparduoti KTU žetonai nemažina investuotojų dividendų dalies.
- Pirmajame periode `100:200:300` KTU žetonų turėtojams dividendai paskirstomi
  santykiu `1:2:3`, kiekvieną išmoką suapvalinant žemyn iki sveikojo wei skaičiaus.
- Po pirmojo periodo atliktas žetonų pervedimas turi įtakos antram periodui,
  tačiau negali pakeisti pirmojo periodo.
- `claimDividend` ir paketinis išmokėjimas negali du kartus išmokėti to paties
  periodo dividendų.
- Apribotas funkcijas gali iškviesti tik atitinkamas administratorius arba
  pardavėjas.
- Oracle uždaro pasibaigusius periodus, užbaigia visus išmokų paketus, įrašo
  patvirtintus įvykius į tinkamus lapus ir po paleidimo iš naujo nedubliuoja
  įrašų.
