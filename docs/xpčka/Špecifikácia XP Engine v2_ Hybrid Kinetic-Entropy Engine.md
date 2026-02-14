Ako senior výskumník pre game ekonomiku a behaviorálny dizajn predkladám finálnu špecifikáciu pre **XP Engine v2 (HKEE \- Hybrid Kinetic-Entropy Engine)**. Tento systém je navrhnutý tak, aby maximalizoval váš extrémny objem písania (10k+ slov) pri zachovaní ekonomickej stability.

### Rozhodnutia pre XP Engine v2

* **Unifikácia nomenklatúry:** Od v2 používať **XU (Exertion Unit)** ako internú výpočtovú jednotku a **EEU** ako UI alias pre používateľa 1, 2\.  
* **Riziko:** Mätúca dokumentácia pri technickom supporte.  
* **Default:** Engine: XU, UI: EEU. **Confidence:** 1.00.  
* **Conversion Contract:** $XP \= \\log(1 \+ \\Delta XU)$ a $Coins \= kCoin \\cdot \\Delta XP$. Implementovať float-based **dust accumulator** na úrovni používateľa 3, 4\.  
* **Riziko:** Akumulácia dustu pri neaktívnych účtoch.  
* **Default:** Rounding-safe dust wallet flush per event. **Confidence:** 1.00.  
* **Session funkcia F(M):** Konkávna, ukotvená funkcia: $F(M) \= 100 \\cdot (1-e^{-(M-m\_{over})/\\tau}) / (1-e^{-(60-m\_{over})/\\tau})$ 5, 6\.  
* **Riziko:** Demotivácia pri extrémne dlhých sessions (\>3h).  
* **Default:** $\\tau \= 60$. **Confidence:** 0.95.  
* **Clamps (Limity):** Event cap: 60 XU, Session cap: 1000 XU, Daily Hard Cap: 2500 XU 4, 7, 8\.  
* **Riziko:** „Hard limit“ frustrácia pri hyper-produktívnych dňoch.  
* **Default:** 2500 XU/deň. **Confidence:** 0.95.  
* **Anti-splitting garancia:** Path-independence test: $TotalXP(Session) \\equiv \\sum MarginalXP(Events)$ 9, 10\.  
* **Riziko:** Chyba v implementácii float presnosti.  
* **Default:** Cestná nezávislosť vynútená cez kumulatívnu krivku. **Confidence:** 1.00.  
* **Adaptácia WPM\_ref:** Použiť **robustný medián** zo sessions (10–180 min) a winsorizáciu cez $3 \\times MADN$ 11, 12\.  
* **Riziko:** Pomalá adaptácia pri náhlej zmene klávesnice/štýlu.  
* **Default:** Personalizovaný rolling medián (18–35 WPM). **Confidence:** 0.90.  
* **Multilingual Text:** Shannonova entropia na úrovni znakov ($H$) je jazykovo neutrálna pre SK/EN mix 13, 14\.  
* **Riziko:** Technický kód (markdown/tags) znižuje $H$.  
* **Default:** $H\_{min} \= 2.8$ bits/char. **Confidence:** 0.85.  
* **Duplicate Prahy:** **SHA-256** pre identické zhody, **Simhash64** (Hamming $\\le 3$) pre blízke zhody 15, 16\.  
* **Riziko:** Kolízie u veľmi krátkych rituálnych záznamov.  
* **Default:** 30-dňové lookback okno hashov. **Confidence:** 0.95.  
* **Rewrite vs. Spam:** Edited eventy linkovať na pôvodný hash; ak je Simhash podobný, aplikovať $q\_{near} \= 0.4$ na marginálny prírastok 17\.  
* **Riziko:** Penalizácia legitímnej hĺbkovej editácie.  
* **Default:** $q\_{near} \= 0.4$. **Confidence:** 0.90.  
* **Novelty metrika:** Znaková Shannonova entropia. Najlepší pomer cena/výkon pre real-time validáciu 14, 18\.  
* **Riziko:** Nezachytáva sémantický spam.  
* **Default:** Character entropy. **Confidence:** 0.80.  
* **Daily Goal Design:** **Hybridný**: adaptívna baseline cez robustný EWMA (medián \+ MAD) s denným limitom zmeny 2, 19\.  
* **Riziko:** Baseline ratcheting (cieľ uteká príliš rýchlo).  
* **Default:** $\\delta\_{increase} \= 0.05$ (max 5% denne). **Confidence:** 0.90.  
* **Streak mechanika:** StreakFactor \+1 % denne, max 1.15x. Reset pri $\<15$ focus minútach 20\.  
* **Riziko:** Demotivácia po 100+ dňoch pri náhodnom resete.  
* **Default:** Max 1.15x cap. **Confidence:** 0.90.  
* **Rest-Day politika:** MB flag "Rest Day" zmrazí streak (nerastie, nepadá). MB penalty \-10 XP stále platí 21, 22\.  
* **Riziko:** Nadužívanie (vyžaduje limit na tokeny v shope).  
* **Default:** Freeze, no reset. **Confidence:** 0.85.  
* **Promise Fulfillment:** Automatické $P\_{comp}$ skóre z Evening Brief logov (done/partial/skipped) 23, 24\.  
* **Riziko:** Manipulácia sľubov (pridávanie ľahkých úloh).  
* **Default:** Weighted plan completion. **Confidence:** 0.90.  
* **K/Q/G Integrity:** Hard kontradikcie (napr. $work\\\_min=0$ pri $done=5$) blokujú multiplikátor ($integrityOK=false$) 25, 26\.  
* **Riziko:** False negatives pri chybnom logovaní času.  
* **Default:** Multiplier eligibility gating. **Confidence:** 0.95.  
* **Multiplier Scope:** Aplikovať na **celý denný reward** (Base XU \+ Task Bonus) 27, 28\.  
* **Riziko:** Preceňovanie task-heavy dní.  
* **Default:** Multiplicative on total yield. **Confidence:** 0.85.  
* **Penalizácie:** **Hard:** MB skip (-10 XP). **Recoverable:** Carry-over refund (+10 XP) pri vyčistení brán v ten istý deň 21, 29\.  
* **Riziko:** Akumulácia "damage" môže viesť k churn-u.  
* **Default:** Non-stacking damage rule. **Confidence:** 0.90.  
* **Anti-burnout:** Model C s konkávnym mintingom prirodzene znižuje marginálnu odmenu pri písaní nad 10k slov 4, 6\.  
* **Riziko:** Spisovatelia môžu cítiť "nespravodlivosť" klesajúcich výnosov.  
* **Default:** Logaritmický útlm po 1200 EEU. **Confidence:** 0.95.  
* **Behavioral Guardrails:** Vysoká váha na "Subjective Context" (Energy, Stress) zvyšuje ActualDifficulty pri vyčerpaní 30, 31\.  
* **Riziko:** Gaming cez reportovanie nízkej energie.  
* **Default:** Balanced weights 0.55O, 0.30S, 0.15C. **Confidence:** 0.85.  
* **UX Explainability:** Template: „Odmena bola nižšia, pretože toto je už veľmi dlhá session (marginálne zisky klesajú)“ 24, 32\.  
* **Riziko:** UI clutter (riešené cez tooltipy).  
* **Default:** Direct mapping na kognitívne faktory. **Confidence:** 0.95.  
* **Event Schema:** Povinne logovať: ts, words, chars, sha256, task\_progress, category, penalties 10, 33\.  
* **Riziko:** Objem dát v audit logoch pri 10k+ slovách.  
* **Default:** Minimal scoring audit schema. **Confidence:** 1.00.  
* **Batch vs Online:** Event minting (online 60s). ActualDifficulty a Baseline Update (Batch 03:00) 34, 35\.  
* **Riziko:** Rozdiel medzi "estimated" a "final" skóre v UI.  
* **Default:** EOD (End of Day) reconciliation. **Confidence:** 0.95.  
* **Idempotent Scoring:** Použiť EventID \+ SHA-256 hash obsahu. Duplicitné submitty v dup\_window dostanú $q\_{exact} \= 0.1$ 5, 36\.  
* **Riziko:** Sieťové retry triggrujú anti-spam bránu.  
* **Default:** Deduplikácia na Ingestion vrstve. **Confidence:** 1.00.  
* **Out-of-order Events:** Engine musí pred skórovaním zoradiť eventy podľa timestamp 37, 38\.  
* **Riziko:** Zmena session boundary po neskorom zápise.  
* **Default:** In-memory sort per session window. **Confidence:** 1.00.  
* **API Contract:** Scoring output musí vracať event\_xu, marginal\_xp, current\_baseline a multiplier\_status 33, 39\.  
* **Riziko:** Nestabilita UI pri zmene verzie engine.  
* **Default:** Versioned scoring API. **Confidence:** 0.95.  
* **Migration period:** Použiť blend rollout: $deltaXP \= (1 \- \\lambda) \\cdot old \+ \\lambda \\cdot new$ 40, 41\.  
* **Riziko:** "Double economy" bugy.  
* **Default:** 4-týždňová rampa $\\lambda$. **Confidence:** 0.90.  
* **Rollout Protocol:** Shadow (14d) \-\> Compare (7d) \-\> Blend Ramp (28d) 40-42.  
* **Riziko:** Príliš dlhý rollout znižuje agilitu vývoja.  
* **Default:** Shadow mode prvoradý. **Confidence:** 0.95.  
* **Kill-switch Thresholds:** Inflácia \> \+5 %, $G\_{adv} \> 1.15$ (výhoda adversarial účtu), Retencia drop \> 0.5pp 43, 44\.  
* **Riziko:** Reakcia na štatistický šum.  
* **Default:** Rollback flag \-\> freeze mint. **Confidence:** 0.85.  
* **Experimentálny plán:** Backtest na 90-dňových historických logoch \+ Monte Carlo simulácia 12 red-team scenárov 45, 46\.  
* **Riziko:** Nedostatok historických dát pre entropiu/hashe.  
* **Default:** Adversarial Robustness Test. **Confidence:** 0.90.  
* **Top 10 Decisions (Lock as blockers):** 1\. Model C 47, 2\. XU Anchor 48, 3\. Daily Cap 7, 4\. Log-krivka 9, 5\. Session Timeout 49, 6\. Entropy Gate 13, 7\. Multiplier Cap 50, 8\. SHA-256 15, 9\. Dust Wallet 3, 10\. Shadow mode 51\.

### A) Final XP Engine v2 Decision Matrix

Komponent,Voľba,Parameter,Zdroj  
Model,Sessionized Concave,Model C,"47, 52"  
Mena,Internal XU / UI EEU,1 XU \= 0.6 min focus,"1, 4"  
Krivka,Log-kumulatívna,"h=300, S=1200","9, 53"  
Session,Time-gap boundary,g\_session \= 25 min,"37, 49"  
Kvalita,Entropy \+ Hash,"H=2.8, SHA256","13, 16"  
Baseline,Robust EWMA,Median \+ MAD,"2, 19"  
Multiplier,Process Integrity,Max 1.20,"25, 50"

### B) Implementation Starter Pack

1. **Modul KEEE Core:** Implementácia konkávnej funkcie $F(M)$ a dust accumulátora.  
2. **Modul Sessionization:** Logika pre segmentáciu eventov podľa 25 min. medzier.  
3. **Modul Anti-Farming:** SHA-256 ukladanie digestov (30 dní) \+ Shannonova entropia.  
4. **Modul Adaptive Baseline:** Rolling median/MAD buffer pre 21 dní.  
5. **Audit Wrapper:** Logger pre deterministické replaye (ts, uid, xu\_delta, reason).

### C) Top 5 Open Risks & Mitigations

1. **Baseline Ratcheting:** Adaptívny cieľ stúpa rýchlejšie ako schopnosť používateľa. **Mitigácia:** $\\delta\_{down} \> \\delta\_{up}$ (rýchlejší pokles baseline pri únave) 54\.  
2. **Entropy False Positives:** Technické zoznamy označené ako spam. **Mitigácia:** Category-specific $H\_{min}$ prahy (napr. nižší pre kategóriu Business).  
3. **Multiplier Casino:** Snaha o max multiplikátor (1.20) vedie k formálnemu vypĺňaniu MB/EB. **Mitigácia:** Multiplier gating cez integrityOK 25\.  
4. **Migration Shock:** Náhly pokles XP po prepnutí na log-model. **Mitigácia:** Blend $\\lambda$ rollout počas 4 týždňov 42\.  
5. **Audit Log Bloat:** Príliš veľa dát z 10k+ slov denne. **Mitigácia:** Ukladať len digest hashe a agregované štatistiky sessions, nie surový text 55\.

