# BlockChainPR paruošimas

[English version](SETUP.md)

Šiame vadove aprašytas išmaniųjų sutarčių ir blockchain oracle paruošimas darbui Ethereum Sepolia testiniame tinkle. Naudokite tik testinį ETH.

## 1. Reikalavimai

Įdiekite arba paruoškite:

- [Node.js 24 LTS](https://nodejs.org/en/download) kartu su npm. Hardhat 3 reikia Node.js 22.13.0 arba naujesnės versijos, tačiau visam projektui rekomenduojama Node.js 24 LTS.
- [MetaMask](https://metamask.io/download/) su matomu Sepolia testiniu tinklu ir pakankamu testinio ETH kiekiu diegimams bei transakcijoms.
- [Remix IDE](https://remix.ethereum.org/) sutartims diegti. Šioje repozitorijoje nėra Sepolia diegimo skripto ar Hardhat tinklo konfigūracijos.
- Sepolia JSON-RPC adresą iš [Infura](https://www.infura.io/).
- Google Cloud projektą, Google skaičiuoklę ir teisę sukurti oracle skirtą Service Account.

PowerShell lange patikrinkite vietinę aplinką:

```powershell
node --version
npm --version
```

Node.js versija turėtų būti `v24.x`. Projektas jau inicializuotas, todėl nevykdykite `hardhat --init`.

## 2. Išmaniųjų sutarčių projekto diegimas ir patikra

Atidarykite PowerShell projekto šakniniame kataloge ir vykdykite:

```powershell
npm install
npm run compile
npm run format:check
```

Šios komandos:

- įdiegia Hardhat, OpenZeppelin Contracts, ethers.js ir formatavimo įrankius;
- sukompiliuoja Solidity 0.8.36 sutartis į `artifacts/`;
- patikrina `contracts/` katalogo failų formatavimą.

## 3. MetaMask ir Sepolia paruošimas

1. MetaMask atidarykite tinklų sąrašą ir įjunkite **Show test networks**.
2. Pasirinkite **Sepolia**.
3. Sukurkite arba pasirinkite penkias paskyras ir pavadinkite jas **Producer**,
   **Wholesaler**, **Retailer**, **Consumer** ir **Oracle**.
4. Papildykite jas testiniu ETH naudodami [Sepolia PoW Faucet](https://sepolia-faucet.pk910.de/#/). Testinio tinklo ETH neturi realios vertės.
5. Oracle naudokite atskirą paskyrą su nedideliu testinio ETH likučiu. Ši paskyra moka periodų uždarymo ir dividendų išmokėjimo transakcijų mokesčius.

Visam penkių paskyrų demonstraciniam scenarijui ir tikslioms pavyzdinėms reikšmėms naudokite [REMIX_TEST_SCENARIO_LT.md](REMIX_TEST_SCENARIO_LT.md).

## 4. Sutarčių diegimas

Dabartinis projektas sutartis lokaliai kompiliuoja su Hardhat, tačiau į Sepolia jas reikia įdiegti rankiniu būdu per Remix.

1. Atidarykite Remix ir pridėkite visus failus iš `contracts/`.
2. Sukompiliuokite juos su Solidity `0.8.36`.
3. Skiltyje **Deploy & Run Transactions** pasirinkite **Browser Extension**, prijunkite MetaMask ir patikrinkite, kad pasirinktas Sepolia tinklas bei numatyta paskyra.
4. Įdiekite `KTUToken` be konstruktoriaus parametrų. Išsaugokite sutarties adresą ir diegimo bloką.
5. Įdiekite `DividendPool`, perduodami `KTUToken` adresą.
6. Įdiekite `TokenSale`, perduodami `KTUToken` adresą ir vieno sveiko KTU žetono kainą wei vienetais.
7. Iškvieskite `DividendPool.setTokenSale`, perduodami `TokenSale` adresą. Tai galima padaryti tik vieną kartą.
8. Perveskite investuotojams parduoti skirtą KTU žetonų kiekį į `TokenSale` adresą.
9. Iš gamintojo paskyros įdiekite `ProducerWholesaler`, perduodami `DividendPool` adresą.
10. Iš didmenininko paskyros įdiekite `WholesalerRetailer`, perduodami `DividendPool` adresą.
11. Iš mažmenininko paskyros įdiekite `RetailerConsumer`, perduodami `DividendPool` adresą.

Oracle konfigūracijai išsaugokite:

- `TOKEN_SALE_ADDRESS`
- `PRODUCER_WHOLESALER_ADDRESS`
- `WHOLESALER_RETAILER_ADDRESS`
- `RETAILER_CONSUMER_ADDRESS`
- `DIVIDEND_POOL_ADDRESS`
- seniausią diegimo bloką, kuris istoriniam įvykių nuskaitymui bus naudojamas kaip `ORACLE_START_BLOCK`

KTU žetono adresas `.env` faile nesaugomas. Jei nurodytas fondo adresas, oracle jį gauna iš `DividendPool` sutarties.

## 5. Google Cloud ir Google Sheets paruošimas

1. [Google Cloud Console](https://console.cloud.google.com/) sukurkite arba pasirinkite projektą.
2. Tame projekte [įjunkite Google Sheets API](https://console.cloud.google.com/flows/enableapi?apiid=sheets.googleapis.com).
3. Atidarykite **IAM & Admin > Service Accounts**, pasirinkite **Create service account**, įrašykite pavadinimą, pvz., `blockchain-oracle`, ir spauskite **Create and continue**. Skiltyje **Grant this service account access to project** rolės nepriskirkite, nes prieiga suteikiama bendrinant pačią Google skaičiuoklę. Pasirinkite **Continue**, tada **Done**.
4. Atidarykite Service Account, pasirinkite **Keys > Add key > Create new key**, pažymėkite **JSON** ir atsisiųskite raktą.
5. Perkelkite atsisiųstą failą į `blockchain-oracle/` katalogą ir pervadinkite jį į `credentials.json` (atsisiųsto failo pavadinimas paprastai būna automatiškai sugeneruotas). Nepalikite kitos rakto kopijos Downloads kataloge. Niekada neviešinkite ir neįtraukite `credentials.json` į Git.
6. Lokaliai atidarykite JSON failą ir raskite `client_email` reikšmę.
7. Sukurkite arba pasirinkite Google skaičiuoklę ir suteikite tam el. pašto adresui **Editor** teisę.
8. Nukopijuokite skaičiuoklės ID iš jos URL. Adrese `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit` reikšmė tarp `/d/` ir `/edit` yra `GOOGLE_SHEET_ID`.

## 6. Oracle diegimas

Projekto šakniniame kataloge vykdykite:

```powershell
Set-Location blockchain-oracle
npm install
```

Oracle yra nuolat veikiantis Node.js terminalo procesas. Jis neturi naršyklėje atidaromos naudotojo sąsajos.

## 7. `.env` konfigūracija

Sukurkite `blockchain-oracle/.env` failą nukopijuodami pateiktą šabloną. PowerShell lange vykdykite:

```powershell
Copy-Item .env.example .env
```

Tada atidarykite `blockchain-oracle/.env` ir pakeiskite pavyzdines reikšmes:

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

### Privalomos reikšmės

| Kintamasis        | Aprašymas                                      |
| ----------------- | ---------------------------------------------- |
| `SEPOLIA_RPC_URL` | Veikiantis Sepolia JSON-RPC adresas.           |
| `GOOGLE_SHEET_ID` | Su Service Account bendrintos skaičiuoklės ID. |

#### Kaip gauti `SEPOLIA_RPC_URL`

1. Sukurkite paskyrą [Infura](https://www.infura.io/) svetainėje.
2. Infura valdymo skydelyje sukurkite naują Ethereum projektą arba programėlę.
3. Tinklu pasirinkite **Sepolia** ir atidarykite projekto API arba endpoint nustatymus.
4. Nukopijuokite visą HTTPS JSON-RPC adresą. Jis paprastai atrodo kaip `https://sepolia.infura.io/v3/PROJEKTO_ID`.
5. Įrašykite nukopijuotą adresą į `.env`, pavyzdžiui: `SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/PROJEKTO_ID`. Šio adreso neviešinkite, nes jame gali būti projekto ID arba API raktas.

#### Kaip gauti `GOOGLE_SHEET_ID`

1. Atidarykite Google skaičiuoklę, kurią 5 skyriuje bendrinote su Service Account `client_email` adresu.
2. Naršyklės adreso juostoje raskite URL, panašų į `https://docs.google.com/spreadsheets/d/1AbC...XyZ/edit#gid=0`.
3. Nukopijuokite tik reikšmę tarp `/d/` ir `/edit`. Šiame pavyzdyje tai yra `1AbC...XyZ`; `gid=0` nėra skaičiuoklės ID dalis.
4. Įrašykite ją į `.env`, pavyzdžiui: `GOOGLE_SHEET_ID=1AbC...XyZ`.

Jei bent viena reikšmė nenurodyta arba tuščia, procesas sustoja paleidimo metu.

### Sutarčių ir pasirašančios paskyros reikšmės

| Kintamasis                    | Aprašymas                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `TOKEN_SALE_ADDRESS`          | Įjungia `TokensPurchased` įvykių rinkimą.                                                  |
| `PRODUCER_WHOLESALER_ADDRESS` | Įjungia gamintojo pardavimų didmenininkui rinkimą.                                         |
| `WHOLESALER_RETAILER_ADDRESS` | Įjungia didmenininko pardavimų mažmenininkui rinkimą.                                      |
| `RETAILER_CONSUMER_ADDRESS`   | Įjungia mažmenininko pardavimų vartotojui rinkimą.                                         |
| `DIVIDEND_POOL_ADDRESS`       | Įjungia dividendų įvykių rinkimą, o kartu su privačiu raktu - ir dividendų automatizavimą. |
| `ORACLE_PRIVATE_KEY`          | Atskiros Sepolia oracle paskyros, pasirašančios dividendų transakcijas, privatus raktas.   |

#### Kaip gauti `ORACLE_PRIVATE_KEY`

1. MetaMask pasirinkite 3 skyriuje sukurtą atskirą **Oracle** paskyrą. Nenaudokite pagrindinės piniginės ar paskyros, kurioje laikomos realios lėšos.
2. Atidarykite paskyros meniu, pasirinkite **Account details**, tada **Show private key** ir patvirtinkite veiksmą MetaMask slaptažodžiu.
3. Nukopijuokite parodytą privatų raktą ir įrašykite jį tik į vietinį `blockchain-oracle/.env` failą, pavyzdžiui: `ORACLE_PRIVATE_KEY=0x...`. Jei nukopijuota reikšmė neprasideda `0x`, pridėkite šį prefiksą.
4. Įsitikinkite, kad pasirinkta paskyra veikia Sepolia tinkle ir turi šiek tiek testinio ETH transakcijų mokesčiams.

Privataus rakto niekam nesiųskite, nekelkite į debesijos saugyklą ir neįtraukite į Git. Kas gauna šį raktą, gali visiškai valdyti oracle paskyrą.

Konfigūracijos įkėlimo logikoje sutarčių adresai nėra privalomi: nenurodžius adreso išjungiamas tik atitinkamas įvykių šaltinis. Visam projektui nurodykite visus penkis adresus. Automatinis periodų uždarymas ir paketinis išmokėjimas veikia tik tada, kai nurodyti ir `DIVIDEND_POOL_ADDRESS`, ir `ORACLE_PRIVATE_KEY`. Įvykių rinkimas gali veikti be privataus rakto, tačiau tokiu atveju automatinis dividendų periodų uždarymas ir dividendų išmokėjimas nebus vykdomi.

### Apdorojimo reikšmės

| Kintamasis                      | Numatytoji reikšmė | Leistinos reikšmės            | Aprašymas                                                                                                                                    |
| ------------------------------- | -----------------: | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `DIVIDEND_PAYOUT_BATCH_SIZE`    |               `20` | nuo `1` iki `50`              | Didžiausias vienoje išmokėjimo transakcijoje apdorojamų investuotojų skaičius.                                                               |
| `ORACLE_EVENT_CONFIRMATIONS`    |                `6` | sveikasis skaičius nuo `0`    | Kiek naujų blokų turi atsirasti po įvykio, kad oracle jį nuskaitytų. Taip išvengiama klaidų, jei pasikeistų naujausia blokų grandinės dalis. |
| `ORACLE_EVENT_BLOCK_RANGE`      |             `1000` | sveikasis skaičius nuo `1`    | Didžiausias vienoje užklausoje skaitomų blokų intervalas.                                                                                    |
| `ORACLE_EVENT_POLL_INTERVAL_MS` |            `15000` | sveikasis skaičius nuo `1000` | Laikas milisekundėmis tarp įvykių tikrinimų.                                                                                                 |
| `ORACLE_START_BLOCK`            |         nenurodyta | sveikasis skaičius nuo `0`    | Blokas, nuo kurio pirmą kartą nuskaitomi ankstesni įvykiai ir įrašomi į Google skaičiuoklę.                                                  |

Dividendų apdorojimas tikrinamas kas 15 sekundžių nepriklausomai nuo `ORACLE_EVENT_POLL_INTERVAL_MS`.

### Pradinio įvykių bloko pasirinkimas

- Atidarykite [Sepolia Etherscan](https://sepolia.etherscan.io/) ir paieškoje įveskite pirmiausia įdiegtos sutarties adresą. Jei sutartis diegėte šiame vadove nurodyta eilės tvarka, tai bus `KTUToken` adresas.
- Sutarties puslapyje raskite lauką **Contract Creator** ir atidarykite šalia pateiktą sutarties sukūrimo transakciją.
- Transakcijos informacijoje nukopijuokite **Block** numerį ir įrašykite jį į `.env`, pavyzdžiui, `ORACLE_START_BLOCK=1234567`.
- Jei reikia rinkti tik naujus įvykius, nenurodykite `ORACLE_START_BLOCK`. Pirmojo paleidimo metu oracle pažymės dabartinį patvirtintą bloką kaip apdorotą ir pradės nuo kito bloko.
- Jei reikia įkelti jau įvykusius įvykius, prieš pirmą paleidimą nustatykite `ORACLE_START_BLOCK` į seniausią sutarčių diegimo bloką.
- `OracleState` lape išsaugota `lastProcessedBlock` reikšmė turi pirmumą prieš `ORACLE_START_BLOCK`. Sąmoningam naujam istoriniam įkėlimui naudokite naują skaičiuoklę arba pašalinkite esamą kontrolinę bloko žymą.
- Sėkmingai įkėlę istorinius įvykius pašalinkite `ORACLE_START_BLOCK` iš `.env`. Vėliau oracle tęs darbą nuo `OracleState` reikšmės.

## 8. Oracle paleidimas ir patikra

Kataloge `blockchain-oracle/` vykdykite:

```powershell
npm start
```

Paleidimo metu oracle patikrina konfigūraciją, prisijungia prie Sepolia, autentifikuojasi Google sistemoje, sukuria trūkstamus skaičiuoklės lapus, vieną kartą apdoroja patvirtintus įvykius ir pradeda periodinį tikrinimą. Jei nurodyti fondo adresas ir privatus raktas, dividendų apdorojimas taip pat tikrinamas iš karto, o vėliau - kas 15 sekundžių.

Sėkmingai paleidus terminale rodomi panašūs pranešimai:

```text
Blockchain Output Oracle started...
Polling Sepolia events with 6 block confirmations.
```

Skaičiuoklėje bus sukurti šie lapai:

| Lapas              | Turinys                                     |
| ------------------ | ------------------------------------------- |
| `ValueChain`       | Trijų prekyviečių `ProductSold` įvykiai.    |
| `Investments`      | `TokensPurchased` įvykiai.                  |
| `DividendPeriods`  | Uždaryti periodai ir jų momentinės kopijos. |
| `DividendPayments` | Sėkmingų ir atidėtų dividendų įvykiai.      |
| `OracleState`      | Paskutinis visiškai apdorotas blokas.       |

Kad stebėjimas veiktų nuolat, palikite terminalo procesą įjungtą. Jį sustabdysite paspaudę `Ctrl+C`. Procesą galima saugiai paleisti iš naujo: oracle tęs darbą nuo `OracleState`, o unikalūs įvykių ID apsaugo nuo pasikartojančių eilučių.

## 9. Problemų sprendimas

| Problema                                                             | Ką patikrinti                                                                                                                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hardhat praneša apie nepalaikomą Node.js versiją                     | Įdiekite Node.js 24 LTS, iš naujo atidarykite terminalą ir vykdykite `node --version`.                                                                                      |
| Rodoma `Missing required configuration` klaida                       | `blockchain-oracle/.env` faile nustatykite netuščias `SEPOLIA_RPC_URL` ir `GOOGLE_SHEET_ID` reikšmes.                                                                       |
| Netinkamas Ethereum adresas                                          | Dar kartą nukopijuokite Sepolia įdiegtos sutarties adresą ir patikrinkite, kad jis prasideda `0x`, o po jo yra 40 šešioliktainių adreso simbolių.                           |
| Nepavyksta nuskaityti `credentials.json` arba Google autentifikacija | Patikrinkite, kad JSON raktas pavadintas tiksliai `credentials.json` ir yra tiesiogiai `blockchain-oracle/` kataloge. Naujas raktas gali pradėti veikti maždaug po minutės. |
| Google Sheets grąžina teisių klaidą                                  | Suteikite skaičiuoklės Editor teisę tiksliai `client_email` reikšmei iš `credentials.json` ir patikrinkite `GOOGLE_SHEET_ID`.                                               |
| Nepavyksta dividendų transakcijos                                    | Patikrinkite, kad `ORACLE_PRIVATE_KEY` priklauso numatytai Sepolia paskyrai ir joje pakanka testinio ETH transakcijų mokesčiams.                                            |
| Neįkeliami istoriniai įvykiai                                        | Patikrinkite, ar `OracleState` jau turi `lastProcessedBlock`; ši kontrolinė reikšmė turi pirmumą prieš `ORACLE_START_BLOCK`.                                                |
| Įvykiai nepasirodo iš karto                                          | Palaukite, kol įvykiai sulauks nustatyto blokų patvirtinimų skaičiaus ir bus atliktas kitas periodinis nuskaitymas.                                                         |

## 10. Saugumas

- Niekada neįtraukite `.env`, `credentials.json`, privačių raktų ar RPC prisijungimo duomenų į Git. Repozitorijos `.gitignore` šių lokalių failų neįtraukia.
- Naudokite atskiras oracle ir Google Service Account tapatybes tik su būtinomis teisėmis.
- Jei privatus arba Service Account raktas nutekėjo, nedelsdami jį panaikinkite arba ištrinkite ir sukurkite naują. Jei raktas pateko į Git istoriją, nepakanka jo pašalinti tik iš naujausios versijos.
- Oracle piniginėje laikykite tik testinį ETH.

## Oficialūs šaltiniai

- [Node.js atsisiuntimas ir LTS versijos](https://nodejs.org/en/download)
- [Hardhat 3 pradinis vadovas ir Node.js reikalavimai](https://hardhat.org/docs/getting-started/)
- [Testinių tinklų rodymas MetaMask](https://support.metamask.io/configure/networks/how-to-view-testnets-in-metamask/)
- [Google Sheets API įjungimas ir naudojimas](https://developers.google.com/workspace/sheets/api/quickstart/nodejs)
- [Service Account raktų kūrimas ir šalinimas](https://docs.cloud.google.com/iam/docs/keys-create-delete)
- [Service Account raktų saugos rekomendacijos](https://docs.cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)
