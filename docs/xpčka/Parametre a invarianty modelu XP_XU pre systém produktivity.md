Tu sú odpovede na vaše otázky založené na analýze 21 poskytnutých zdrojov:

### 1\. Model XP/XU a invarianty

**Záver:** Najvhodnejším modelom je **Model C (Sessionized Concave Minting)**, pretože marginalizuje prírastky v rámci časových relácií, čím matematicky znemožňuje farmenie cez delenie eventov 1, 2\. Zabezpečuje cestnú nezávislosť (path-independence) tým, že celkový zisk závisí len od čistého času hlbokého sústredenia, nie od počtu záznamov 1, 3\.**Dôkaz:** 1-3.**Konflikt:** Žiadny; zdroje sa zhodujú, že sessionizácia je kľúčom k zabráneniu fragmentačným exploitom 1, 2\.**Default policy:** Implementovať Model C s marginalizačnou funkciou $F(C\_j) \- F(C\_{j-1})$ 1\.**Confidence:** 1.0.

### 2\. Soft-cap a hard-cap

**Záver:** Odporúčaný **soft-cap (bod zlomu) je 1200 EEU/deň** a **hard-cap (absolútny limit) je 2500 EEU/deň** 2-4. Tieto hodnoty sú nastavené tak, aby chránili pred vyhorením a zároveň udržali motiváciu v lineárnej fáze počas bežného pracovného dňa 2, 3\.**Dôkaz:** 2, 3\.**Konflikt:** Niektoré herné modely používajú dynamické limity založené na úrovni hráča, ale pre produktivitu sa odporúča fixný denný rozpočet 2, 3, 5\.**Default parameter:** SoftStart \= 1200 EEU, HardCap \= 2500 EEU 2, 3\.**Confidence:** 0.95.

### 3\. Tvar krivky po soft-cape

**Záver:** Najstabilnejším tvarom je **logaritmická krivka**, pretože zabezpečuje hladký prechod bez "trestných skokov" a marginálna odmena v nej klesá predvídateľne ($1/x$) 2-4. Logaritmický prístup ($h \\cdot \\ln(1 \+ x/h)$) je psychologicky vysvetliteľnejší než polynomiálne krivky 2, 3\.**Dôkaz:** 2-4.**Konflikt:** Zdroj 13 a 19 navrhujú sigmoidnú krivku pre progresiu, ale zdroj 1 argumentuje, že logaritmická je lepšia pre denné limity kvôli stabilite pri vysokých objemoch 3, 6\.**Default policy:** Logaritmická konkávna funkcia s parametrom $h=300$ 2, 3\.**Confidence:** 0.9.

### 4\. Nastavenie session boundary (idle timeout)

**Záver:** Session boundary by mala byť nastavená na **25 minút**, čo zodpovedá prirodzeným prestávkam v hlbokej práci (napr. Pomodoro) 1, 2\. Ak je medzera medzi eventmi dlhšia, systém začne novú reláciu a aplikuje fixný "session overhead" (daň za kontext-switching) 1, 2\.**Dôkaz:** 1, 2\.**Konflikt:** Niektoré systémy navrhujú dynamický timeout, ale pre deterministický audit je fixný timeout (g\_session) robustnejší 1, 2\.**Default parameter:** $g\_{session} \= 25$ minút 1, 2\.**Confidence:** 0.85.

### 5\. Realistický interval WPM\_ref

**Záver:** Pre kombináciu slovenčiny a angličtiny pri hlbokom písaní (nie prepisovaní) je realistický benchmark **25 slov za minútu (WPM)** 1, 2\. Tento odhad je konzervatívny, aby zohľadnil čas potrebný na premýšľanie a formuláciu myšlienok 1, 2\.**Dôkaz:** 1, 2\.**Konflikt:** Rýchlosť písania môže dosiahnuť 60+ WPM, ale hlboká tvorivá práca je výrazne pomalšia 1, 2\.**Default parameter:** $WPM\_{ref} \= 25$ 1, 2\.**Confidence:** 0.8.

### 6\. Defaulty pre tau, m\_over, m\_pad

**Záver:** Odporúčané hodnoty sú **$\\tau \= 60$ minút** (časová konštanta konkavity), **$m\_{over} \= 5$ minút** (overhead na začiatku relácie) a **$m\_{pad} \= 1.5$ minúty** (tolerancia latencie logovania) 1, 2\. Tieto hodnoty zabezpečujú, že 60 minút práce vygeneruje presne 100 XU 1, 2\.**Dôkaz:** 1, 2\.**Konflikt:** Žiadny; sú to kalibrované konštanty pre Model C 1, 2\.**Default parameter:** $\\tau=60, m\_{over}=5, m\_{pad}=1.5$ 1, 2\.**Confidence:** 0.95.

### 7\. Minimálne eligibility prahy

**Záver:** Aby sa zabránilo spamu, event by mal mať aspoň **40 slov** alebo **200 znakov** 1, 2\. Ak je záznam pod týmto prahom, nezískava XU za písanie, môže však získať fixný malý bonus za "rutinu" 1, 2\.**Dôkaz:** 1, 2\.**Konflikt:** Niektoré zdroje navrhujú nižšie prahy pre mobilné použitie, ale pre writing-first systém sú tieto limity nutné proti "micro-task spammingu" 1, 2\.**Default policy:** $w\_{min}=40, ch\_{min}=200$ 1, 2\.**Confidence:** 0.85.

### 8\. Detekcia duplicitného textu

**Záver:** Najspoľahlivejšia je kombinácia **SHA-256 hashov** pre presné duplikáty a **Simhash (locality-sensitive hashing)** s Hammingovou vzdialenosťou pre blízke duplikáty 1, 2\. Presné duplikáty by mali dostať 90% diskont (koeficient 0.1) 1, 2\.**Dôkaz:** 1, 2\.**Konflikt:** Ukladanie celého textu je drahé, preto sa odporúča ukladať len podpisy/hashe 1, 2\.**Default policy:** Použiť SHA-256 a Simhash64 s Hammingovým prahom 3 1, 2\.**Confidence:** 0.9.

### 9\. Entropy/novelty metriky

**Záver:** Prakticky použiteľná je **Shannonova entropia na úrovni znakov ($H$)**, ktorá meria informačnú hustotu textu 1, 2, 4\. Nízka entropia indikuje repetitívny text alebo spam ("aaaaa..."), čo spúšťa diskont odmeny 1, 2, 4\.**Dôkaz:** 1, 2, 4\.**Konflikt:** Sémantická entropia je presnejšia, ale výpočtovo náročná; znaková entropia je postačujúci proxy pre produkciu 1, 2, 4\.**Default parameter:** $H\_{min} \= 2.8$ bitov na znak 1, 2\.**Confidence:** 0.8.

### 10\. Anti-gaming pravidlá pre tasky

**Záver:** Proti micro-progress farmingu funguje kombinácia **minimálneho prahu progresu ($\\Delta\_{min} \= 2\\%$)** a **denného limitu na bonusy z progresu** 1-4. Opakované plnenie identických úloh je penalizované cez repeatFactor 2, 3\.**Dôkaz:** 1-3.**Konflikt:** Žiadny; viacero zdrojov odporúča odmietať triviálne prírastky 1-3.**Default policy:** Odmietnuť progres pod 2% a aplikovať $1/(1+0.15n)$ na opakovania 2, 3\.**Confidence:** 0.9.

### 11\. Progress bonus (k\_delta, delta\_cap)

**Záver:** Bonus by mal byť počítaný ako **$k\_\\Delta \\cdot \\sqrt{\\text{min}(\\Delta, \\Delta\_{cap})}$**, kde odmocnina zabezpečuje klesajúce výnosy z granularity 1, 2\. Tým sa eliminuje výhoda rozdelenia jednej veľkej aktualizácie na desať malých 1, 2\.**Dôkaz:** 1, 2\.**Konflikt:** Lineárny bonus by motivoval k fragmentácii, preto je nelineárna (odmocninová) funkcia nutná 1, 2\.**Default parameter:** $k\_\\Delta \= 5, \\Delta\_{cap} \= 30\\%$ 1, 2\.**Confidence:** 0.9.

### 12\. Unified minting (Writing \+ Task)

**Záver:** Celkový zisk eventu je **súčet Writing XU (z relácie) a Task XU (progres \+ completion)**, pričom obe zložky majú vlastné denné stropy 1, 2\. Tým sa zabráni dvojitému odmeňovaniu, ak písanie poznámky a progres úlohy prebiehajú súčasne 1, 2\.**Dôkaz:** 1, 2\.**Konflikt:** Niektoré systémy oddeľujú XP za prácu a XP za logovanie, ale unify model XU je podľa zdrojov robustnejší 1, 2, 4\.**Default policy:** $XU \= (WritingXU \+ TaskBonus) \\cdot Multiplier$ 1, 2\.**Confidence:** 0.85.

### 13\. Výpočet actualDifficulty (1–100)

**Záver:** ActualDifficulty sa počíta ako **vážený priemer objektívnej záťaže ($O$), subjektívneho kontextu ($S$) a trenia ($C$)**, normalizovaný cez saturačné funkcie sat(x; a, b) 4, 7\. Ak chýbajú subjektívne dáta, systém použije "neutral defaults" (napr. 0.5) a zníži celkovú sebadôveru (Confidence Factor) skóre 7\.**Dôkaz:** 2, 4, 7\.**Konflikt:** Dynamické vyvažovanie obtiažnosti v hrách (DDA) je často skryté, ale v produktivite musí byť auditovateľné a vysvetliteľné 4, 7, 8\.**Default parameter:** Váhy 0.55O, 0.30S, 0.15C 4, 7\.**Confidence:** 0.9.

### 14\. Váhy pri sparse dátach (Objective/Subjective/Friction)

**Záver:** Najrobustnejší je **Balanced set: Objective (0.55), Subjective (0.30), Friction (0.15)** 7\. Pri sparse dátach (chýbajúce ranné/večerné briefy) musí dominovať objektívny dôkaz z logov, aby sa predišlo manipulácii cez "pocitovú obtiažnosť" 7\.**Dôkaz:** 4, 7\.**Konflikt:** Zdroj 16 navrhuje model založený na "exertion density", ale zdroj 7 poskytuje detailnejší rozpis pre prípady chýbajúcich dát 4, 7\.**Default policy:** Balanced set (0.55 / 0.30 / 0.15) 4, 7\.**Confidence:** 0.85.

### 15\. Engagement gate (E\_eng)

**Záver:** Engagement gate ($E\_{eng}$) sa definuje ako **saturačná funkcia odpracovaných minút**, napr. sat(work\_min; 15, 240\) 7\. Ak používateľ neodpracoval aspoň minimálny čas (napr. 15 min), vplyv trenia a subjektívnych prekážok na obtiažnosť je vynulovaný, aby sa neodmeňovalo "ničnerobenie" 7\.**Dôkaz:** 4, 7\.**Konflikt:** Žiadny; je to štandardná poistka proti inflácii obtiažnosti bez práce 7\.**Default policy:** $E\_{eng}$ aktivuje zložku Friction len pri $\>15$ min práce 7\.**Confidence:** 0.9.

### 16\. Návrh multiplieru (K, Q, G)

**Záver:** Multiplier by mal byť v úzkom rozsahu **1.00, 1.20**, aby sa predišlo "hazardu s odmenami" 4, 7\. Odmeňuje **konzistenciu ($K$ \- zhoda plánu s realitou)**, kvalitu logovania ($Q$) a zvládnutie carry-over úloh ($G$), pričom podcenenie obtiažnosti je penalizované, ale konzervatívne plánovanie (overestimation) nie 4, 7\.**Dôkaz:** 2, 4, 7\.**Konflikt:** Niektoré herné systémy majú multiplikátory 2x+, ale pre behaviorálnu stabilitu sa odporúča max 1.2x 4, 7\.**Default formula:** $Multiplier \= \\text{min}(1.20, 1 \+ 0.10K \+ 0.05Q \+ 0.05G)$ 4, 7\.**Confidence:** 0.9.

### 17\. Poradie aplikácie výpočtu

**Záver:** Správne poradie je: **1\. Base XU** (písanie \+ tasky), **2\. Multiplier** (K, Q, G), **3\. Penalties/Refunds** (fixné sumy ako \-10 XP), **4\. Notification Threshold** 2, 3, 7\. Penality sa neaplikujú pred multiplikátorom, aby sa "netrestalo" násobkom 7\.**Dôkaz:** 2, 3, 7\.**Konflikt:** Žiadny; toto poradie zabezpečuje matematickú férovosť 2, 7\.**Default policy:** Base $\\rightarrow$ Mult $\\rightarrow$ \+/- Penalty/Refund $\\rightarrow$ Notify 2, 7\.**Confidence:** 0.95.

### 18\. Rounding exploit a "dust"

**Záver:** K exploitom pri zaokrúhľovaní dochádza pri opakovanom mintingu malých súm; riešením je **dust accumulator** 2, 3\. Zvyšky po zaokrúhlení sa ukladajú do per-user stavu a pripočítajú k ďalšej transakcii, čím sa zachováva celková hodnota 2, 3\.**Dôkaz:** 2, 3\.**Konflikt:** Niektoré systémy používajú len integer math, ale dust wallet je v ekonomických zdrojoch označený za "rounding-safe" 2, 3\.**Default policy:** Udržiavať coinDust a xpDust ako float zvyšky 2, 3\.**Confidence:** 1.0.

### 19\. Backtesting protokol

**Záver:** Vyžaduje sa **90-dňový historický replay** na reálnych logoch na kalibráciu baseline a **adversarial simulácia** 12 kritických scenárov (napr. Lorem Spammer, Slider Shark) 2, 4\. Systém musí preukázať, že znižuje výnosnosť farmenia o aspoň 70% oproti lineárnemu modelu 2, 4\.**Dôkaz:** 2, 4\.**Konflikt:** Zdroj 15 a 18 sa zameriavajú na Shadow/Canary deployment, zatiaľ čo zdroj 21 definuje konkrétne štatistické prahy pre replay 2, 9, 10\.**Default policy:** Shadow mode (14 dní) $\\rightarrow$ Adversarial stress-test $\\rightarrow$ Global activation 2, 4, 9\.**Confidence:** 0.9.

### 20\. Rollout guardrails a kill-switch

**Záver:** Kill-switch sa aktivuje, ak **inflácia XP prekročí \+5%**, retencia $R7$ klesne o viac ako 0.5 percentuálneho bodu, alebo ak štatistická výhoda adversarial účtu ($G\_{adv}$) prekročí 1.15 2, 4, 9\. Pre rollout sa odporúča postupný blend starého a nového modelu ($\\lambda \= 0.25 \\rightarrow 1.0$) 2, 3\.**Dôkaz:** 2-4.**Konflikt:** Žiadny; zdroje sa zhodujú na potrebe "rollback flagu" a zmrazení mintingu pri anomáliách 2, 9\.**Default thresholds:** Inflácia $\>5\\%$, $\\Delta R7 \< \-0.5pp$, $G\_{adv} \> 1.15$ 2, 4\.**Confidence:** 0.85.  
