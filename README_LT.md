# BlockChainPR

Decentralizuota prekybos ir investavimo sistema, veikianti Ethereum Sepolia testiniame tinkle. Tiekimo grandinės dalyviai atsiskaito ETH, o sistemos investicinis ERC-20 žetonas `KTUToken` (`KTU`) žymi investicinę nuosavybę ir suteikia teisę į dividendus. Node.js oracle stebi pardavimo įvykius, įrašo juos į Google Sheets ir inicijuoja periodines dividendų išmokas.

## Technologijos

- Solidity 0.8.36
- OpenZeppelin Contracts 5.6.1
- Ethereum Sepolia
- Node.js
- ethers.js 6
- Google Sheets API

## Projekto struktūra

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

## Išmaniosios sutartys

| Sutartis                 | Paskirtis                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KTUToken.sol`           | OpenZeppelin ERC-20 investicinis žetonas su 1 000 000 KTU žetonų pradine pasiūla, deginimu ir galimybe per `ERC20Votes` tikrinti ankstesniuose blokuose užfiksuotą balsų galią. |
| `TokenSale.sol`          | Parduoda iš anksto į sutartį pervestus KTU žetonus už ETH.                                                                                                                      |
| `DividendPool.sol`       | Kaupia 5 % ETH mokesčius, fiksuoja KTU žetonų balansų momentines kopijas ir periodais perveda ETH tiesiai investuotojams.                                                       |
| `MarketplaceBase.sol`    | Abstrakti prekybos sutarčių bazė su bendru prekių pateikimo, kainų, atsargų ir ETH mokėjimų valdymu.                                                                            |
| `ProducerWholesaler.sol` | Valdo gamintojo pasiūlymus ir pardavimus didmenininkams.                                                                                                                        |
| `WholesalerRetailer.sol` | Valdo didmenininko pasiūlymus ir pardavimus mažmenininkams.                                                                                                                     |
| `RetailerConsumer.sol`   | Valdo mažmenininko pasiūlymus ir pardavimus vartotojams.                                                                                                                        |

`MarketplaceBase` nėra diegiama atskirai. `ProducerWholesaler`, `WholesalerRetailer` ir `RetailerConsumer` paveldi bendrą prekybos logiką, tačiau yra diegiamos kaip trys savarankiškos sutartys ir gali būti plečiamos skirtingomis funkcijomis. Kiekviena jų savarankiškai saugo savo pasiūlymus. Produkto ID yra dalyvių sutartas identifikatorius; sutartys netikrina fizinio produkto kilmės, būklės ar ankstesniame etape įsigyto kiekio.

## Tiekimo grandinė

```text
Gamintojas -> Didmenininkas -> Mažmenininkas -> Vartotojas
```

Kiekviename pardavimo etape:

1. Pardavėjas paskelbia turimą produkto kiekį ir vieneto kainą.
2. Pirkėjas iškviečia `calculatePayment` ir sužino mokėtiną sumą wei vienetais.
3. Pirkėjas iškviečia `buyProduct` ir transakcijos `value` lauke nurodo apskaičiuotą `totalPayment` sumą.
4. Visa produkto kaina ETH pervedama pardavėjui, o papildomas 5 % dydžio dividendų mokestis – į `DividendPool`. Apskaičiuojant mokestį, rezultatas suapvalinamas iki sveikojo wei skaičiaus.
5. Pardavimo įvykį stebintis oracle įrašo operaciją į Google Sheets.

## Investavimas ir dividendai

Investuotojas per `TokenSale.buyTokens(wholeTokenAmount)` už ETH nusiperka KTU žetonų, nurodydamas sveiką jų skaičių. KTU investicinis žetonas sukurtas naudojant OpenZeppelin ERC-20 įgyvendinimą ir palaiko `ERC20Permit` bei `ERC20Votes`. Naudojant `ERC20Votes` galima tikrinti ankstesniuose blokuose užfiksuotą balsų galią. Pradinė pasiūla yra 1 000 000 KTU žetonų; papildoma emisija negalima, tačiau `burn` ir `burnFrom` gali sumažinti bendrą pasiūlą. Kiekvieno investuotojo balsavimo teisės automatiškai deleguojamos tam pačiam adresui, todėl jo `getPastVotes` reikšmė sutampa su KTU žetonų balansu pasirinktame istoriniame bloke.

Kiekvieno uždaryto periodo fondas paskirstomas pagal formulę:

```text
investuotojo dividendas = periodo ETH fondas * investuotojo KTU žetonų balansas fiksavimo bloke / tinkama KTU žetonų pasiūla fiksavimo bloke
```

Kiekviena išmoka apvalinama iki sveikojo wei skaičiaus. Apdorojus visus išmokų paketus, apvalinimo likutis tampa prieinamas vėlesniam periodui.

Uždarant periodą `DividendPool` balansų momentinei kopijai (angl. snapshot) pasirenka ankstesnį bloką, o investuotojų balansams nustatyti naudoja `getPastVotes`. Dividendams tinkama pasiūla yra to bloko bendra KTU žetonų pasiūla, atėmus `TokenSale` sutartyje laikomų KTU žetonų balansą. Todėl sutartyje laikomi neparduoti žetonai nemažina investuotojams tenkančios dividendų dalies.

Pervedus KTU žetonus kitam adresui, būsimos dividendų teisės pereina gavėjui. Jau uždaryto periodo išmoka nesikeičia, nes ji priklauso tam adresui, kuris balansų fiksavimo periodo bloke turėjo KTU žetonų.

Pradinė periodo trukmė yra 3 minutės. Administratorius gali ją pakeisti iškviesdamas `setPeriodDuration(newDuration)` ir nurodydamas naują trukmę sekundėmis. Nurodyta reikšmė turi būti didesnė už nulį. Nauja trukmė taikoma tik kitam periodui, todėl jau vykstančio periodo pabaigos laikas nesikeičia. Periodas uždaromas viešu metodu `closeDividendPeriod`. Kito periodo uždarymo laiką galima sužinoti iškvietus `nextPeriodCloseAt()`. Jei 3 minučių periodas prasidėjo 10:00, bet buvo uždarytas tik 10:07, kito periodo pradžia laikoma 10:06, o ne 10:07. Taip išlaikomas pradinis periodų tvarkaraštis. Net jei iki uždarymo praeina keli nustatytos trukmės intervalai, sutartis uždaro tik vieną dividendų periodą. Kitiems praėjusiems intervalams atskiri dividendų periodai nesukuriami.

Oracle uždaro periodą ir kviesdamas `payDividendBatch` bando pervesti ETH tiesiai į investuotojų pinigines. Viename pakete apdorojama iki 50 adresų iš istorinio turėtojų sąrašo. Paketai sumažina vienos transakcijos skaičiavimo sąnaudas. Naujas periodas negali būti uždarytas, kol neapdoroti visi ankstesnio periodo adresai.

Jei ETH pervedimas nepavyksta, bet visa paketo transakcija neatmetama, suma rezervuojama `deferredDividends` ir išleidžiamas `DividendDeferred` įvykis. Apdorojus paketus, naują periodą galima uždaryti net ir likus neatsiimtų atidėtų sumų. Oracle automatiškai nekartoja šių sumų pervedimo. Investuotojas gali iškviesti `claimDividend` ir atsiimti atidėtas sumas bei dar neišmokėtą dabartinio uždaryto periodo dividendą.

Ethereum savaime nevykdo funkcijų pagal laikmatį, todėl oracle procesas turi veikti nuolat, o jo piniginėje turi būti Sepolia ETH transakcijų mokesčiams. Jei dividendams tinkama KTU žetonų pasiūla balansų fiksavimo bloke lygi nuliui, surinkti mokesčiai lieka fonde iki periodo, kai bent vienas investuotojas turės KTU žetonų.

## Paruošimas ir paleidimas

Aplinkos reikalavimai, sutarčių kompiliavimas ir diegimas, Google Sheets paruošimas, oracle konfigūracija bei paleidimas aprašyti faile [SETUP_LT.md](SETUP_LT.md). Išsamus rankinio testavimo Sepolia tinkle scenarijus pateiktas faile [REMIX_TEST_SCENARIO_LT.md](REMIX_TEST_SCENARIO_LT.md).

## Saugumas ir apribojimai

- `.env` ir `credentials.json` yra slapti failai. Jų negalima publikuoti ar įtraukti į Git istoriją; nutekėjusius RPC ir paslaugos paskyros raktus reikia nedelsiant panaikinti bei sugeneruoti iš naujo.
- Pradinė 3 minučių dividendų periodo trukmė tinka demonstracijai, tačiau realiame tinkle administratorius turėtų ją padidinti per `setPeriodDuration` transakciją.
- Tiesioginių išmokų transakcijų mokesčius moka oracle piniginė. Didėjant investuotojų skaičiui, visų paketų apdorojimas gali trukti ilgiau nei nustatytas periodas; tokiu atveju kitas periodas uždaromas tik apdorojus ankstesnius paketus. Atidėtos sumos kito periodo neužblokuoja.
- KTU žetonų turėtojų sąrašas saugo visus istorinius gavėjus, todėl jam augant apdorojimas brangsta net ir adresams nebeturint KTU žetonų. Didesnei sistemai verta svarstyti modelį, kuriame investuotojai patys atsiima dividendus, tačiau tam reikėtų keisti sutartis: dabartinėje sutartyje prieš uždarant kitą periodą vis tiek būtina apdoroti visus paketų adresus.
- `ERC20Votes` balansų momentinei kopijai naudojamas ankstesnis blokas. KTU žetonų pervedimas tame pačiame bloke kaip periodo uždarymas įtakos turės tik kitam periodui.
- Pardavėjas pats nurodo siūlomą kiekį. Sutartys nepatvirtina fizinio likučio, prekės pristatymo ar jos būklės.
- Oracle tęsia įvykių skaitymą po `OracleState` išsaugoto paskutinio apdoroto bloko. Pirmajam istoriniam įkėlimui būtina nurodyti tinkamą `ORACLE_START_BLOCK`; pernelyg senas blokas padidina RPC užklausų skaičių.

## Licencija

Solidity failai pažymėti MIT licencija. Oracle paketo licencija - ISC.
