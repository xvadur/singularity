Ako hlavný research architekt predkladám kompletný implementačný návrh pre **XU Engine v1**, postavený na princípoch unifikovaného benchmarku, sessionizácie a informačnej entropie.

### Odpovede na 30 kľúčových otázok

#### 1\. Finálny herný loop písania

**Záver:** Loop pozostáva z ranného záväzku, priebežnej práce, večernej reflexie a uzávierky o 03:00.**Dôkaz:** Systém rozlišuje Morning Brief (plán), prácu a Evening Brief (zhoda reality) 1, 2\. Deň sa resetuje presne o 03:00 lokálneho času 3, 4\.**Riziká:** „Mechanical filling“ (náhodné vypĺňanie) briefov bez reálneho plánovania.**Default:** Reset o 03:00 4\.**Confidence:** 1.00.

#### 2\. Systémové invarianty

**Záver:** Engine musí garantovať determinizmus (auditovateľnosť), ohraničenosť (capy), monotónnosť (viac práce $\\ge$ odmena) a cestnú nezávislosť (no-splitting advantage).**Dôkaz:** Invarianty sú nevyhnutné na prevenciu manipulácie metrík a psychologickú stabilitu 5, 6\. Path-independence zabezpečuje, že delenie práce na kúsky nemení celkovú odmenu 7, 8\.**Riziká:** Chyby v zaokrúhľovaní pri malých sumách (riešené cez dust wallet).**Default:** Deterministic Auditability 9\.**Confidence:** 1.00.

#### 3\. Matematická forma mintingu (Writing)

**Záver:** Použitie marginálnej alokácie z konkávnej session funkcie $F(M\_s^\*)$.**Dôkaz:** XU sa počíta na úrovni session a následne sa priraďuje eventom ako prírastok, čo neutralizuje fragmentáciu 10-12. Funkcia je ukotvená tak, že 60 min. deep work \= 100 XU 12, 13\.**Riziká:** Príliš dlhé sessions môžu pôsobiť demotivačne kvôli klesajúcim výnosom.**Default:** $F(M) \= 100 \\cdot (1-e^{-(M-m\_{over})/\\tau}) / (1-e^{-(60-m\_{over})/\\tau})$ 12\.**Confidence:** 0.95.

#### 4\. Session boundary a timeout

**Záver:** Nová session začína, ak medzera medzi eventmi prekročí $g\_{session}$ alebo ak sa zmení kategória na „ne-writing“.**Dôkaz:** Sessionizácia podľa časových medzier bráni farmiť cez rozdelené eventy 14, 15\. Fixný overhead $m\_{over}$ trestá časté prepínanie kontextu 16, 17\.**Riziká:** Príliš krátky timeout seká legitímne hlbokú prácu s prestávkami na premýšľanie.**Default:** $g\_{session} \= 25$ min 18\.**Confidence:** 0.90.

#### 5\. Parameter set (WPM, tau, overhead)

**Záver:** Súbor kalibrovaných konštánt pre stabilitu písania.**Dôkaz:** Hodnoty sú odvodené z hlbokého písania (nie prepisovania) 18, 19\.**Riziká:** $WPM\_{ref}$ sa musí prispôsobiť používateľovi (personalizácia).**Default:** $WPM\_{ref}=25, \\tau=60, m\_{over}=5, m\_{pad}=1.5$ 18, 20\.**Confidence:** 0.95.

#### 6\. Personalizácia baseline

**Záver:** 14-dňový „cold start“ pomocou mediánu a následná EWMA stabilizácia.**Dôkaz:** Robustné štatistiky (Median/MAD) bránia outlierom v deformácii baseline 14, 21\. EWMA s denným limiterom ($\\delta$) bráni prudkej inflácii 22, 23\.**Riziká:** Baseline „ratcheting“ (postupné zvyšovanie nárokov nad únosnú mieru).**Default:** $W\_{baseline}=14$ dní, $\\delta\_{increase}=0.05$ 23, 24\.**Confidence:** 0.90.

#### 7\. Quality Multiplier vzorec

**Záver:** Multiplikatívny koeficient $q\_s \= q\_{exact} \\cdot q\_{near} \\cdot q\_{entropy}$.**Dôkaz:** Každý faktor deteguje iný typ spamu (copy-paste, blízky duplikát, nízka informácia) 25-27.**Riziká:** False positive pri legitímne repetitívnom technickom texte.**Default:** $q\_{exact}=0.1, q\_{near}=0.4, q\_{entropy}=0.5$ 11, 25, 28\.**Confidence:** 0.90.

#### 8\. Entropy Gate pre SK/EN

**Záver:** Meranie Shannonovej entropie na úrovni znakov s minimálnym prahom.**Dôkaz:** Entropia deteguje „vatu“ a repetitívny spam 25, 29\. Prah 2.8 bitov je bezpečný proxy pre prirodzený jazyk 24, 28\.**Riziká:** Krátke zoznamy (bullets) majú prirodzene nižšiu entropiu.**Default:** $H\_{min} \= 2.8$ bits/char 24\.**Confidence:** 0.85.

#### 9\. Duplicate Detection (low-cost)

**Záver:** SHA-256 pre presnú zhodu, Simhash64 pre blízku zhodu.**Dôkaz:** Hashe detegujú opakovanie textu v okne 30 dní 11, 27, 30\. Hammingova vzdialenosť Simhashu zachytáva drobné zmeny 25, 27\.**Riziká:** Kolízie u veľmi krátkych, bežných fráz (riešené min-size gate).**Default:** SHA-256 \+ Simhash Hamming $\\le 3$ 25, 27\.**Confidence:** 0.95.

#### 10\. Eligibility prahy (spam gate)

**Záver:** Event musí mať aspoň 40 slov ALEBO 200 znakov pre písací minting.**Dôkaz:** Minimálne prahy filtrujú triviálny spam bez kognitívnej hodnoty 14, 15, 31\.**Riziká:** Demotivácia pri krátkych, ale dôležitých záznamoch (riešené routine bonusom).**Default:** $w\_{min}=40, ch\_{min}=200$ 32\.**Confidence:** 0.90.

#### 11\. Unifikovaný XU/XP minting

**Záver:** $XU \= (write\\\_XU \+ task\\\_bonus) \\cdot m\_{diff}$ so započítaním penalizácií.**Dôkaz:** Writing a tasky sú zlúčené do jedného eventu, aby sa predišlo double-countingu pri logovaní progresu 26, 33, 34\.**Riziká:** Prekrývanie Writing XU a Task bonusu môže preceňovať kombinované úkony.**Default:** Unified formula 34\.**Confidence:** 0.85.

#### 12\. Progress Bonus formula

**Záver:** Bonus založený na odmocnine progresu: $k\_\\Delta \\cdot \\sqrt{\\Delta}$.**Dôkaz:** Odmocnina zabezpečuje klesajúce výnosy, čím znevýhodňuje farmenie mikrokrokov 32, 35, 36\.**Riziká:** Motivuje k „zaokrúhľovaniu“ progresu na $30\\%$ (prah $\\Delta\_{cap}$).**Default:** $k\_\\Delta \= 5, \\Delta\_{min}=2\\%, \\Delta\_{cap}=30\\%$ 32, 37\.**Confidence:** 0.90.

#### 13\. Completion Bonus

**Záver:** Fixná odmena za dokončenie úlohy so silným denným zastropovaním.**Dôkaz:** Bonus motivuje k uzatváraniu úloh 35, 37\. Limit na počet bonusov bráni farmeniu triviálnych úloh 36, 38\.**Riziká:** Ignorovanie dlhých úloh v prospech krátkych „quick-wins“.**Default:** $k\_{done} \= 12$ XU, max 8 bonusov/deň 37, 38\.**Confidence:** 0.90.

#### 14\. actualDifficulty pri sparse data

**Záver:** Použitie „neutral defaults“ pre subjektívne signály a aplikácia Confidence Faktora.**Dôkaz:** Chýbajúce dáta sú explicitne modelované ako „nenulové“, ale znižujú dôveru v skóre 39, 40\. confidence factor ($CF$) penalizuje výsledné skóre za neúplnosť 41, 42\.**Riziká:** Príliš drsný postih za zabudnutý brief môže demotivovať.**Default:** $S\_{default} \= 0.425$ (neutrálne) 40\.**Confidence:** 0.90.

#### 15\. Váhy Objective/Subjective/Friction

**Záver:** Dominancia objektívnych dôkazov s pomocnými subjektívnymi signálmi.**Dôkaz:** „Balanced set“ zabezpečuje stabilitu voči subjektívnemu nadhodnocovaniu 43-45.**Riziká:** Podcenenie náročnosti pri psychicky vyčerpávajúcich dňoch s malým objemom textu.**Default:** Váhy 0.55 O, 0.30 S, 0.15 C 43, 45\.**Confidence:** 0.85.

#### 16\. Engagement Gate pre Difficulty

**Záver:** Trenie (friction) zvyšuje obtiažnosť len ak je prítomný dôkaz o práci.**Dôkaz:** $E\_{eng}$ bráni tomu, aby „ničnerobenie“ (prokrastinácia) umelo zvyšovalo skóre náročnosti dňa 46, 47\.**Riziká:** Ťažký deň, ktorý skončil úplným zlyhaním (0 min práce), dostane nízku difficulty.**Default:** $E\_{eng}$ aktivovaný pri $\>15$ min práce 46\.**Confidence:** 0.90.

#### 17\. Multiplier komponenty (K, Q, G)

**Záver:** K (zhoda plánu), Q (kvalita logov/timeliness), G (zvládnutie carry-over).**Dôkaz:** Multiplikátor odmeňuje integritu procesu a predvídateľnosť 45, 48, 49\. Konzistencia je jednosmerná: prekonanie plánu nie je penalizované 48, 50\.**Riziká:** Príliš komplexný výpočet v UI („multiplier casino“).**Default:** Multiplier $M \= 1 \+ 0.10K \+ 0.05Q \+ 0.05G$ 45, 51\.**Confidence:** 0.90.

#### 18\. Finálny Multiplier vzorec

**Záver:** Multiplikátor je prísne zastropovaný na 1.20 a je aditívny.**Dôkaz:** Úzky rozsah znižuje volatilitu a pocit nespravodlivosti pri malých odchýlkach 51-53.**Riziká:** Nízky strop (1.20) nemusí byť dostatočne vzrušujúci pre „gamerský“ segment.**Default:** Max 1.20 45, 51\.**Confidence:** 0.95.

#### 19\. Poradie aplikácie výpočtu

**Záver:** Base $\\rightarrow$ Multiplier $\\rightarrow$ Penalties $\\rightarrow$ Notification Threshold.**Dôkaz:** Toto poradie zabezpečuje, že multiplikátor nezvyšuje/neznižuje fixné penalizácie (fairness) 41, 54\.**Riziká:** Penalizácia po multiplikátore môže spôsobiť záporné alebo nulové XP.**Default:** Sequential flow 54\.**Confidence:** 0.95.

#### 20\. Penalizácia na XP vs XU

**Záver:** Rutinné chyby (skip morning) idú na XP; zlyhanie procesov (carry-over) na Persistent State (Damage).**Dôkaz:** Rozlíšenie medzi fixnou XP pokutou a dlhodobým „damage“ zvyšuje stabilitu 51, 55, 56\.**Riziká:** Double-punishment pri kombinovaných zlyhaniach (riešené non-stacking pravidlom).**Default:** \-10 XP za skip MB 49, 51\.**Confidence:** 0.90.

#### 21\. Rounding exploits (Dust wallet)

**Záver:** Akumulácia floato-vých zvyškov v Dust Wallete a flush pri každom evente.**Dôkaz:** Bráni profitovaniu z opakovaného zaokrúhľovania pri malých sumách (splitting) 3, 57, 58\.**Riziká:** Technická réžia ukladania dustu na per-user báze.**Default:** Flush per event 57, 59\.**Confidence:** 1.00.

#### 22\. Notifikačný model

**Záver:** Notifikácia len pre zisk $\\ge \+5$ XP, agregované každých 60 sekúnd.**Dôkaz:** Bráni zahlteniu používateľa (spam) a podporuje flow 60-62.**Riziká:** Strata pocitu okamžitej odmeny pri rýchlom písaní.**Default:** 60s debounce, $+5$ XP threshold 62\.**Confidence:** 0.90.

#### 23\. Explainability texty

**Záver:** UI musí povinne zobraziť: Volume drive, Entropy score a Multiplier components.**Dôkaz:** Transparentnosť buduje dôveru v „black-box“ výpočty 39, 63, 64\. Šablóna mapuje priamo na kognitívne faktory 65\.**Riziká:** Preťaženie UI informáciami pre bežného používateľa (riešené tooltipmi).**Default:** Explainable UI template 65\.**Confidence:** 0.95.

#### 24\. Anti-gaming (Top 10 prioritne)

**Záver:** 1\. Sessionization, 2\. Entropy, 3\. Duplicate Hash, 4\. Min word, 5\. Daily Cap, 6\. $\\sqrt{\\Delta}$, 7\. Mult Gating, 8\. Velocity Cap, 9\. Low-value cat cap, 10\. Winsorization.**Dôkaz:** Tieto pravidlá pokrývajú 12 kľúčových red-team scenárov 30, 31, 66\.**Riziká:** Falošné spustenie viacerých brán súčasne (úplné zablokovanie mintu).**Default:** Red-team protocol 66\.**Confidence:** 0.90.

#### 25\. Anti-burnout guardrails

**Záver:** Tvrdý denný cap 2500 XU a Resilience Bonus za prácu pri nízkej nálade.**Dôkaz:** Cap bráni nezdravému preťažovaniu 5, 66, 67\. Resilience bonus odmeňuje disciplínu pri nízkom mood-e 68\.**Riziká:** Motivovanie k logovaniu nízkeho mood-u kvôli bonusu (riešené adaptive baseline).**Default:** Hard Cap 2500 XU 67, 69\.**Confidence:** 0.95.

#### 26\. Economy Sinks

**Záver:** Priorita na „Hard Sinks“ (miznutie meny) pred „Soft Sinks“ (prevod meny).**Dôkaz:** Udržanie sink-to-faucet ratio 95-105% je kľúčom k stabilite 70\. Prestížne nákupy a maintenance poplatky 70, 71\.**Riziká:** Príliš drahé sinks môžu spôsobiť pocit stagnácie.**Default:** Sink Coverage Ratio $\\approx 1.0$ 72\.**Confidence:** 0.85.

#### 27\. Event Schema a Scoring Audit

**Záver:** Deterministický log s poliami: ts, words, chars, sha256, category, $\\Delta$.**Dôkaz:** Každý zisk musí byť spätne vysledovateľný na konkrétny event 9, 10, 73\.**Riziká:** Extrémny nárast dát v audit logoch pri vysokom objeme písania.**Default:** Minimal scoring audit schema 74\.**Confidence:** 1.00.

#### 28\. Backtesting protokol

**Záver:** Replay 90 dní historických dát \+ 12 red-team scenárov.**Dôkaz:** Systém musí znížiť efektivitu farmenia o $70\\%$ oproti lineárnemu modelu 62, 75\. Meranie Giniho koeficientu a SCR 62, 72\.**Riziká:** Historické logy nemusia obsahovať potrebné entropické/hash dáta.**Default:** Adversarial Robustness Test 75\.**Confidence:** 0.90.

#### 29\. Rollout plán

**Záver:** Shadow (14d) $\\rightarrow$ Compare (7d) $\\rightarrow$ Global Ramp ($\\lambda \= 0.25 \\rightarrow 1.0$).**Dôkaz:** Postupný blend znižuje „user shock“ a umožňuje kalibráciu 75-77. Kill-switch pri inflácii $\> 5\\%$ 77, 78\.**Riziká:** Koexistencia dvoch enginov môže byť mätúca pri zistení nezrovnalostí.**Default:** Phase 1-3 strategy 77, 79\.**Confidence:** 0.95.

#### 30\. 90-dňový Roadmap

**Záver:** D30: Core Shadow Engine, D60: Adversarial Suite \+ Baseline Calib, D90: Global Launch.**Dôkaz:** Postupnosť od zberu dát po plnú aktiváciu so spätnou väzbou 77, 80, 81\.**Riziká:** Oneskorenie kvôli technickej náročnosti entropickej analýzy v reálnom čase.**Default:** 90-day implementation plan.**Confidence:** 0.85.

### Final Engine Spec v1

**1\. Writing Minting:**$XU\_{event} \= q\_s \\cdot (F(C\_j) \- F(C\_{j-1}))$

* $F(M)$ je konkávna session funkcia ukotvená na 60m=100XU.  
* $q\_s \= q\_{exact} \\cdot q\_{near} \\cdot q\_{entropy}$ (detekcia duplicity a spamu).

**2\. Unified Scoring:**$FinalXP \= round((BaseXU \+ TaskBonus) \\cdot Multiplier \\cdot ConfidenceFactor) \\pm Penalties$

* Multiplier $M \\in 1.00, 1.20$.  
* Confidence Factor postihuje neúplné briefy.

**3\. Anti-Gaming Guardrails:**

* **Entropy Gate:** $H \< 2.8 \\rightarrow 0.5x$ postih.  
* **Duplicate Gate:** SHA256 zhruba 30 dní späť $\\rightarrow 0.1x$ postih.  
* **Velocity Cap:** $\>120$ WPM $\\rightarrow$ postih botov.  
* **Daily Hard Cap:** 2500 XU (absolútny limit).

**4\. Baseline Adaptation:**EWMA s mediánom a MAD (14d okno). Drift limitovaný na $+5\\%$ denne.

### Open Risks v1 (Top 10\)

1. **Baseline Ratcheting:** Používateľ sa „pre-trénuje“ a systém mu prestane dávať odmeny pri bežnom výkone. *Mitigácia: $\\delta\_{down}$ je rýchlejšia ako $\\delta\_{up}$.*  
2. **Entropy False Positives:** Technické texty/zoznamy sú označované za spam. *Mitigácia: Nižší prah $H$ pre kategóriu Business.*  
3. **Mechanical Planning:** Používateľ plánuje triviálne tasky na dosiahnutie multiplikátora. *Mitigácia: Task bonus cap na $35\\%$ dennej baseline.*  
4. **Mood Farming:** Neustále logovanie mood=1 pre resilience bonus. *Mitigácia: Baseline detekcia nulovej variancie v mood-e.*  
5. **Audit Data Volume:** SHA-256 hashe za 30 dní môžu zahltiť databázu. *Mitigácia: Ukladanie len digestov, nie textov.*  
6. **User Shock:** Prechod z lineárneho na logaritmický model môže vyvolať pocit „kradnutia XP“. *Mitigácia: Blend rollout $\\lambda$ počas 4 týždňov.*  
7. **Sparse Data Hallucination:** actualDifficulty bez večerného briefu je nepresná. *Mitigácia: Agresívny Confidence Factor discount.*  
8. **Rounding Dust Inflation:** Chyby v Dust Wallete môžu spôsobiť technický dlh. *Mitigácia: Unit-testy na integer/float konverzie.*  
9. **Rest Day Abuse:** Streak-freeze sa používa na vyhnutie sa práci. *Mitigácia: Limitovaný počet rest-day tokenov v shop-e.*  
10. **High Volume Mudflation:** 10 000 slov denne napriek capom devalvuje úroveň Mastera. *Mitigácia: Progresívny level scaling $0.04 \\cdot \\sqrt{TotalXP}$.*

