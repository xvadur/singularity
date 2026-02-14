Tu je systémový návrh pre vašu writing-first hru, postavený na HKEE (Hybrid Kinetic-Entropy Engine) a robustnej sessionizácii.

### 1\. Názov meny v UI

* **Odporúčanie:** **EEU (Exertion-Equivalent Units)**.  
* **Prečo:** Zachováva kontinuitu s vaším bazálnym modelom a zrkadlí psychologický pocit „vynaloženého úsilia“ 1, 2\.  
* **Riziko:** Zámena s XP, ak nie je jasne oddelená funkcia (EEU je palivo, XP je progres) 3, 4\.  
* **Metrika úspechu:** Pomer nákupov v shop-e k celkovému mintingu (SCR 0,95–1,05) 5\.

### 2\. Denný cieľ písania

* **Odporúčanie:** **Adaptívny podľa 21-dňového robustného baseline** ($\\bar{\\rho}$ \- medián Focus Density) 6, 7\.  
* **Prečo:** Systém sa učí vašu aktuálnu kapacitu bez potreby manuálneho tuningu 8\.  
* **Riziko:** Baseline „ratcheting“ (postupné zvyšovanie cieľa nad únosnú hranicu) 9\.  
* **Metrika úspechu:** Stabilita driftu ($\\mu\_d \\le 0,05$) 10\.

### 3\. Streak mechanika

* **Odporúčanie:** **StreakFactor \+1 % bonus/deň**, strop na **1,15x** (aktivácia pri \>15 focus min.) 11\.  
* **Prečo:** Odmeňuje habit bez vytvárania nedosiahnuteľnej priepasti pre nové dni 12\.  
* **Riziko:** Demotivácia pri strate streaku po technickej chybe 13\.  
* **Metrika úspechu:** Retencia $R7$ používateľa 10\.

### 4\. Policy pre „Rest Day“

* **Odporúčanie:** **Flag v Morning Brief (ExpectedDifficulty \= 0\)**; streak sa zmrazí, ale nezruší 5\.  
* **Prečo:** Chráni pred burnoutom bez ekonomickej penalizácie 14, 15\.  
* **Riziko:** Zneužívanie rest-dayov na „umelé“ držanie vysokého streaku 16\.  
* **Metrika úspechu:** Pomer aktívnych vs. rest dní (ideál 5:2).

### 5\. Váhovanie kategórií

* **Odporúčanie:** **Váhy podľa kognitívnej náročnosti**: Daily/Business/Task \= 1,0x; Vitals/Expense \= 0,1x (iba routine bonus) 17, 18\.  
* **Prečo:** Writing-first systém musí prioritizovať tvorbu pred administratívou 6, 19\.  
* **Riziko:** Demotivácia logovať dôležité, ale nízko-rewardované vitals 12\.  
* **Metrika úspechu:** Share of writing XU $\\ge 60 \\%$ 20\.

### 6\. Morning Brief Scoring

* **Odporúčanie:** **Eligibility Gate pre Multiplier**. Bez ranného briefu je denný multiplier fixne 1,00 a nasleduje **penalizácia \-10 XP** 21, 22\.  
* **Prečo:** Motivuje k plánovaniu, ktoré je nevyhnutné pre konzistenciu 23\.  
* **Riziko:** „Mechanical filling“ (náhodné vyklikávanie briefu) 19\.  
* **Metrika úspechu:** Compliance rate (počet dní s briefom).

### 7\. Vplyv ActualDifficulty na reward

* **Odporúčanie:** **Logistické mapovanie na Stretch Multiplier ($M\_S$)**. Bonus len ak Reality \> Plan 24, 25\.  
* **Prečo:** Odmeňuje rast a prácu v „zone of struggle“ 26\.  
* **Riziko:** Motivuje používateľa podceňovať ranný plán (sandbagging) 25\.  
* **Metrika úspechu:** Alignment skóre $M\_A$ blízko 1,0.

### 8\. Promise Completion

* **Odporúčanie:** **Vážený priemer splnených taskov ($P\_{comp}$)** z Evening Briefu oproti rannému sľubu 27\.  
* **Prečo:** Automatizovateľné z logov bez nutnosti NLP analýzy sľubu 28\.  
* **Riziko:** Pridávanie triviálnych úloh do sľubu 29\.  
* **Metrika úspechu:** Presnosť predikcie $M\_A$.

### 9\. Objem vs Kvalita

* **Odporúčanie:** **Hybridný HKEE model**. Objem generuje base XU, kvalita (entropia/novelty) určí discount $q\_s$ 30, 31\.  
* **Prečo:** Objem bez kvality je spam; kvalita bez objemu je stagnácia 32\.  
* **Riziko:** Príliš prísna entropia môže trestať legitímne repetitívny technický text 32\.  
* **Metrika úspechu:** Korelácia medzi word count a XP (concave, nie linear).

### 10\. Level Progression Curve

* **Odporúčanie:** **Square relation: $Level \= 0,04 \\times \\sqrt{TotalXP}$** 33\.  
* **Prečo:** Rýchle odmeny na začiatku, stabilný pocit majstrovstva v late-game 34\.  
* **Riziko:** Príliš pomalý progres po 6 mesiacoch (vyžaduje horizontálny scaling) 35\.  
* **Metrika úspechu:** Priemerný čas na dosiahnutie Levelu 10\.

### 11\. Výplata XP

* **Odporúčanie:** **Batching per 60s (agregácia eventov v rámci minúty)** 10, 36\.  
* **Prečo:** Znižuje kognitívny šum notifikácií pri zachovaní pocitu real-time odmeny 37, 38\.  
* **Riziko:** Strata pocitu okamžitého „dopamínového hitu“ pri písaní 12\.  
* **Metrika úspechu:** Latencia mintingu $\\le 60s$.

### 12\. Combo mechanika

* **Odporúčanie:** **Flow State Multiplier (+20 %)** po 15 minútach kontinuálneho písania s entropiou $H \> H\_{min}$ 26\.  
* **Prečo:** Podporuje hlbokú prácu (deep work) a penalizuje vyrušenia 39, 40\.  
* **Riziko:** Motivuje k ignorovaniu dôležitých prestávok 41\.  
* **Metrika úspechu:** Priemerná dĺžka session ($M\_s$).

### 13\. Padding a nízka kvalita

* **Odporúčanie:** **Shannonova entropia na úrovni znakov ($H\_{min} \= 2,8$)**. Ak $H \< 2,8$, aplikuj $0,5x$ discount 42, 43\.  
* **Prečo:** Matematicky deteguje „vypchávky“ a repetitívny spam 17, 44\.  
* **Riziko:** False positive pri zoznamoch alebo citáciách 32\.  
* **Metrika úspechu:** Exploiting rate v red-team simulácii (Lorem Spammer scenario) 45\.

### 14\. Duplicate Policy

* **Odporúčanie:** **SHA-256 hash pre presné duplikáty (0,1x reward)** a Simhash pre blízke zhody (0,4x reward) 46, 47\.  
* **Prečo:** Rozlišuje medzi copy-paste exploitom a legitímnym návratom k téme 31, 39\.  
* **Riziko:** Detekcia šablón (napr. ranný rituál) ako duplikátov 9\.  
* **Metrika úspechu:** Uniqueness ratio záznamov.

### 15\. Value Density Detection

* **Odporúčanie:** **Informačná hustota ($H \\times words / time\\\_gap$)** 17, 42\.  
* **Prečo:** Výpočtovo lacné, nevyžaduje sémantické NLP modely 32\.  
* **Riziko:** Nepresnosť pri veľmi krátkych textoch pod 40 slov 48\.  
* **Metrika úspechu:** $G\_{adv} \\le 1,10$ v simulácii 10\.

### 16\. Task vs Writing Bonus

* **Odporúčanie:** **Zlúčená Final Formula**: $XU \= (write\\\_xu \+ prog\\\_bonus \+ done\\\_bonus) \\times m\\\_diff$ 49, 50\.  
* **Prečo:** Zabezpečuje cestnú nezávislosť a auditovateľnosť celého dňa 51, 52\.  
* **Riziko:** Dvojité odmeňovanie, ak písanie poznámky a progres úlohy sú ten istý akt 53\.  
* **Metrika úspechu:** Deterministic Auditability Check (zhoda eventov a skóre).

### 17\. Completion Bonus

* **Odporúčanie:** **Fixný bonus ($k\_{done} \= 12$ XU)**, ale zastropovaný denným limitom ($r\_{done} \\times B\_d$) 54, 55\.  
* **Prečo:** Motivuje k dokončeniu dňa, ale bráni farmiu cez stovky drobných úloh 55\.  
* **Riziko:** Ignorovanie veľkých komplexných úloh v prospech „done“ flagov 19\.  
* **Metrika úspechu:** Pomer splnených a začatých úloh.

### 18\. Economy Sinks

* **Odporúčanie:** **Hard Sinks: Údržba herných nástrojov, prestížne nákupy, „daní“ z hromadenia** 5\.  
* **Prečo:** Udržuje hodnotu meny a zabraňuje mudflácii 56\.  
* **Riziko:** Pocit trestu pri príliš agresívnych sink-och 57\.  
* **Metrika úspechu:** Sink Coverage Ratio (SCR) $\\approx 1,0$.

### 19\. Shop Utility Boosts

* **Odporúčanie:** **Len kozmetika a minoritné convenience itemy** (napr. „Streak-Freeze“ token) 58\.  
* **Prečo:** „Pay-to-win“ utility ničia vnútornú motiváciu a dôveru v systém 58, 59\.  
* **Riziko:** Nízky záujem o čisto kozmetické itemy pri nízkej sociálnej interakcii 60\.  
* **Metrika úspechu:** Churn rate používateľov s vysokým zostatkom meny.

### 20\. Anti-hoarding mechanika

* **Odporúčanie:** **Progresívny poplatok za skladovanie (inventory fee)** alebo sezónny reset s prestížnym bonusom 57, 61\.  
* **Prečo:** Núti k obehu meny a investíciám do herného progresu 57\.  
* **Riziko:** Odradenie používateľov, ktorí si chcú šetriť na veľký nákup 62\.  
* **Metrika úspechu:** Gini koeficient distribúcie meny $\\le 0,60$ 10\.

### 21\. Typy questov

* **Odporúčanie:** **Milestone Arcs (napr. „Napíš 5000 slov o Projekte X“)** 60, 63\.  
* **Prečo:** Najlepšie ladí s dlhodobou tvorivou prácou a flow 64\.  
* **Riziko:** Príliš dlhé questy bez medziprograsu sú demotivujúce 12\.  
* **Metrika úspechu:** Quest completion rate.

### 22\. Automatické denné misie

* **Odporúčanie:** **Generovanie podľa nízkej variety v logoch** (napr. „Dnes píš v kategórii Business“) 20\.  
* **Prečo:** Bojuje proti repetitívnemu farmiu jedinej témy/kategórie 19\.  
* **Riziko:** Narušenie aktuálneho focusu používateľa irelevantnou úlohou 65\.  
* **Metrika úspechu:** Zníženie repeatFactoru u top kategórií.

### 23\. Boss Fight model

* **Odporúčanie:** **Weekly HP závisí od plánovaného EEU**; Damage \= Inferred focus minutes z logov 56, 64\.  
* **Prečo:** Transformuje týždňový target na hmatateľnú výzvu 64\.  
* **Riziko:** Boss sa stane neporaziteľným pri chorobe/neočakávanom výpadku 66\.  
* **Metrika úspechu:** Pomer víťazstiev/prehier u Bossov.

### 24\. Achievementy

* **Odporúčanie:** **Rhythmic Mastery (Série konzistentných focus session)** 30\.  
* **Prečo:** Minimálny load, ale vysoký vplyv na budovanie návyku 29\.  
* **Riziko:** Príliš veľa malých achievementov stráca hodnotu (achievement inflation) 57\.  
* **Metrika úspechu:** Používateľom hlásený pocit kompetencie.

### 25\. Dizajn notifikácií

* **Odporúčanie:** **Tiché aggregation (+5 XP badge)**; vizuálny popup len pri combo alebo milestone 10, 38\.  
* **Prečo:** Písanie vyžaduje kľud; notifikácia nesmie prerušiť flow 19\.  
* **Riziko:** Používateľ si nevšimne dôležitý progres 67\.  
* **Metrika úspechu:** Medzičas prvej práce ($T\_{first} \\le 5m$) 10\.

### 26\. Explainability Texty

* **Odporúčanie:** **Povinné atribúty: {Volume\_min}, {Entropy\_score}, {Consistency\_mult}** 38, 68\.  
* **Prečo:** Buduje dôveru v algoritmus; používateľ chápe „prečo“ 69, 70\.  
* **Riziko:** UI clutter pri príliš technickom vysvetlení 62\.  
* **Metrika úspechu:** Počet support tiketov k scoringu.

### 27\. Failure UX

* **Odporúčanie:** **„Recovery Path“: Ponuka rest-day tokenu alebo zníženie $\\sigma$ na ďalší deň** 71, 72\.  
* **Prečo:** Chyba je súčasťou procesu; systém musí umožniť návrat bez straty progresu 73, 74\.  
* **Riziko:** Prílišná mäkkosť zníži pocit výzvy 66\.  
* **Metrika úspechu:** Návrat používateľa deň po „failed day“.

### 28\. Rollout experiment plán

* **Odporúčanie:** **Shadow (14d) $\\rightarrow$ Compare (7d) $\\rightarrow$ Global ramp ($\\lambda=0,25 \\rightarrow 1,0$ za 3 týždne)** 75, 76\.  
* **Prečo:** Minimalizuje „user shock“ a umožňuje kalibráciu baseline pred ostrým štartom 77, 78\.  
* **Riziko:** Technická réžia udržiavania dvoch enginov paralelne 79\.  
* **Metrika úspechu:** Divergence Delta $|\\Delta\_{div}| \< 15 \\%$ 80\.

### 29\. Guardrail metriky

* **Odporúčanie:** **Denný monitoring: Inflácia XP (+5 % max), Gini koeficient, $G\_{adv}$ (adversarial advantage)** 10, 80\.  
* **Prečo:** Včasná detekcia exploitov a nerovnováhy 81, 82\.  
* **Riziko:** Reakcia na štatistický šum ako na exploit 83, 84\.  
* **Metrika úspechu:** Stabilita XP supply.

### 30\. Top 3 Lever Decisions

1. **HKEE Unifikovaný model (Writing \+ Task \+ Quality)**: Zabezpečuje, že systém nie je možné farmiť jednoduchým písaním ani jednoduchým taskovaním 30, 32\.  
2. **Robustný Baseline (Median/MAD)**: Zabezpečuje, že systém je sebaregulačný a prispôsobí sa vám, či ste v špičke alebo v kríze 85, 86\.  
3. **Entropy-Gate Anti-Farming**: Najúčinnejší nástroj proti spamu a AI-generovanému textu bez drahých NLP modelov 42, 45\.

