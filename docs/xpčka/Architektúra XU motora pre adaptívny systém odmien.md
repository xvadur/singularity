This design proposes a production-ready **XU-driven engine** that unifies event-level writing evidence, behavioral planning consistency, and adaptive difficulty.

### Section A: Model Invariants

To ensure psychological stability and prevent economic collapse, the following invariants **must** always hold:

1. **Determinism and Auditability:** For any sequence of events, minted outputs are a deterministic function of declared inputs and stored state 1\.  
2. **Non-negativity and Boundedness:** $rawDelta \\ge 0$, $deltaXP \\ge 0$, and $deltaCoins \\ge 0$. XP and coins are bounded by a daily hard cap 1\.  
3. **Monotonicity:** Holding state constant, increasing work volume cannot decrease rewards 2\.  
4. **Path Independence (No-Splitting Advantage):** Total XP for the same work is identical regardless of whether it arrives as many small events or one large event, neutralizing "micro-task spam" 2, 3\.  
5. **Smoothness:** Diminishing returns (soft caps) are applied via continuous curves, avoiding "punishment cliffs" that trigger boundary gaming 4, 5\.  
6. **Time Integrity:** The day rolls over strictly at 03:00 local time 4, 6\.

### Section B: Candidate Model 1 (Effective EEU Log-Difference)

This model adapts your current baseline into a path-independent formula.

* **Formula:** $deltaXP \= curve(E\_{after}) \- curve(E\_{before})$ where $E$ is effective EEU 7\.  
* **XP Cumulative Curve:**  
* If $E \\le 1200$: $curve(E) \= kXP \\times E$  
* If $E \> 1200$: $curve(E) \= kXP \\times (1200 \+ h \\times \\ln(1 \+ \\frac{E \- 1200}{h}))$ 8\.  
* **Anti-Farming:** $repeatFactor \= \\max(r\_{min}, \\frac{1}{1 \+ k \\times (c \- g)})$ where $c$ is the per-task count today 9\.  
* **Parameter Ranges:** $h \\in $, $r\_{min} \\in 0, 0.1$, $k \\in 0.5, 1.0$ 10, 11\.

### Section C: Candidate Model 2 (Sessionized XU Concave Minting)

This model anchors 100 XU to 60 minutes of deep focus and uses sessionization to prevent fragmentation.

* **Effective Minutes ($m\_i$):** $\\min(\\frac{words\_i}{WPM\_{ref}}, timeGap\_i \+ m\_{pad})$ 12, 13\.  
* **Session overhead:** $M\_s^\* \= \\max(0, \\sum m\_i \- m\_{over})$ 12\.  
* **Concave Session Function ($F$):** $100 \\times \\frac{1 \- \\exp(-M\_s^\*/\\tau)}{1 \- \\exp(-(60 \- m\_{over})/\\tau)}$ 12, 14\.  
* **Marginal Allocation:** $XU\_j \= q\_s \\times (F(C\_j) \- F(C\_{j-1}))$, where $q\_s$ is a quality multiplier 15\.  
* **Parameter Ranges:** $WPM\_{ref} \\in 16, 17$, $\\tau \\in 18, 19$, $m\_{over} \\in 2, 20$ 21, 22\.

### Section D: Final Recommendation and Rationale

**Winner: Candidate Model 2 (Candidate C in Source 3).**

* **Rationale:** It is the most "self-regulating" and "writing-first" model 23\. By sessionizing logs, it makes splitting events mathematically unable to farm extra XU 24\. It incorporates **entropy and novelty checks** to stop padding and duplicate text, which Model 1 ignores 15, 25\. The robust baseline (Median/MAD) ensures the system adapts to the user's personal capacity without manual intervention or runaway inflation 23, 26\.

### Section E: Event-Scoring Pseudocode

\# Performed every 60s or per event  
def score\_event(event, session\_state, user\_baseline):  
    \# 1\. Eligibility Gate (Source 3 \[27\])  
    if event.words \< w\_min or event.chars \< ch\_min:  
        return 0 

    \# 2\. Quality Multipliers (Source 3 \[15, 25\])  
    q\_s \= 1.0  
    if is\_duplicate(event.hash): q\_s \*= 0.10  
    if event.entropy \< H\_min: q\_s \*= 0.50

    \# 3\. Writing XU (Source 3 \[13, 14\])  
    m\_i \= min(event.words / WPM\_ref, time\_gap \+ m\_pad)  
    C\_curr \= session\_state.cum\_min \+ m\_i  
    \# Marginal allocation using concave function F  
    writing\_xu \= q\_s \* (F(C\_curr) \- F(session\_state.cum\_min))  
      
    \# 4\. Task/Progress XU (Source 3 \[28\])  
    prog\_bonus \= k\_delta \* sqrt(min(event.progress\_delta\_pct, delta\_cap))  
    done\_bonus \= k\_done if event.task\_completed else 0  
      
    \# 5\. Difficulty Modifier (Source 3 \[28\])  
    m\_diff \= clamp(exp(beta \* (event.difficulty \- user\_baseline.med\_diff)/100), 0.9, 1.1)  
      
    \# 6\. Final Calculation  
    deltaXU \= (writing\_xu \+ prog\_bonus \+ done\_bonus) \* m\_diff  
    return max(0, min(XU\_max\_event, deltaXU))

### Section F: actualDifficulty and Multiplier Formula

**actualDifficulty (1-100):**Based on the **Balanced** weight set 29:

1. **Objective ($O$):** $0.28V\_{time} \+ 0.22V\_{cx} \+ 0.12V\_{sw} \+ 0.12V\_{unp} \+ 0.14V\_{pr} \+ 0.12V\_{co}$ 30\.  
2. **Subjective ($S$):** $0.25D\_{sleep} \+ 0.35D\_{energy} \+ 0.25D\_{stress} \+ 0.15D\_{health}$ 30\.  
3. **Friction ($C$):** $0.5F\_{delay} \+ 0.5F\_{proc}$, gated by engagement evidence $E\_{eng}$ 17, 31\.  
4. **Final:** $actualDifficulty \= \\text{round}(100 \\times (b \+ (1-b) \\times (0.55O \+ 0.30S \+ 0.15C)))$, where $b \= 0.05 \+ 0.15E\_{eng}$ 32, 33\.

**Multiplier Formula:**$multiplier \= \\min(1.20, 1 \+ 0.10K \+ 0.05Q \+ 0.05G)$ 34\.

* $K$ \= Consistency score (Morning vs. Evening reality) 35\.  
* $Q$ \= Execution quality (Log notes completeness \+ Timeliness) 36\.  
* $G$ \= Carry-over bonus (+0.05 if gates handled) 34\.

### Section G: 12 Adversarial Test Scenarios

1. **Micro-task spam:** Marginal session allocation makes $n$ tiny events equal one large event 27, 37\.  
2. **Repeating easy tasks:** repeatFactor and session overhead ($m\_{over}$) collapse payout 9, 12\.  
3. **Alternating keys:** Baseline drift and daily budget caps limit the yield of "low-entropy switching" 38\.  
4. **Batch submission at 02:59:** Token-bucket velocity limits (Source 1\) or sessionization caps the burst 18, 39\.  
5. **Midnight/Reset grinding:** Accepted as daily session behavior; capped by two separate daily caps 18\.  
6. **Rounding exploits:** Rounding-safe "dust" accumulation ensures no gain from multiple small calls 40, 41\.  
7. **Slider abuse:** Self-normalizing difficulty modifier ($m\_{diff}$) adjusts the baseline upward, returning multiplier to 1 42\.  
8. **Low-value text padding:** Char-level Shannon entropy gate reduces minting by 50% for repetitive text 25, 43\.  
9. **Copy-pasting old work:** SHA-256 hash detection applies a 90% discount ($q\_{exact}=0.1$) 15, 44\.  
10. **Micro-progress farming:** Minimum progress threshold ($\\Delta\_{min}$) sets bonus to 0 for tiny delta updates 43\.  
11. **Procrastination inflation:** Friction signals are gated by $E\_{eng}$; claiming "it was hard" with zero work yields zero difficulty boost 17, 45\.  
12. **Conservative planning:** Fairness rule activates $U\_{diff}$ and $U\_{scope}$ only if reality is *harder* than plan 35, 46\.

### Section H: Backtesting Metrics and Thresholds

* **Advantage ($G\_{adv}$):** Ratio of $r\_{adversarial} / r\_{honest}$ must be $\\le 1.10$ 47\.  
* **Drift:** Standard deviation of daily median $\\mu\_d \\le 0.05$ 47\.  
* **Inflation:** Aggregate XP supply growth $\\le \+5\\%$ 47\.  
* **Fairness:** Max deviation between cohorts $\\le 0.10$ 47\.  
* **Gini Coefficient:** Reward distribution equality $\\le 0.60$ 47\.

### Section I: Rollout and Risk Controls

1. **Shadow Mode (Week 0):** Run in parallel; compute median/p90 distribution deltas 48, 49\.  
2. **Compare Mode (Week 1-2):** Ramp blend $\\lambda$ (0.25 $\\rightarrow$ 0.50). Monitor tail compression 50, 51\.  
3. **Activation (Week 4+):** Lock core curve; enable entropy and velocity gates only if evidence of abuse exists 51, 52\.  
4. **Kill-Switch:** Immediate rollback if inflation $\> \+5\\%$ or Retention $R7$ drops $\> 0.5$pp 53\.

### Section J: User-facing Explanation Templates

* **XP Change:** "You earned **{XU}** for **{minutes}** of focused writing. Marginal gains were lower because this was a very long session." 14, 54\.  
* **Difficulty:** "Difficulty was **{actualDifficulty}/100**. While your energy was low, objective workload was the primary driver." 55\.  
* **Multiplier:** "Multiplier **x{multiplier}** applied for finishing your Morning Brief and handling carry-over items." 56\.  
* **Penalty:** "Morning Brief skipped: **\-10 XP**." 56\.  
* **Gaming Flag:** "Quality multiplier applied: Writing resembled existing logs (duplicate detected)." 44\.

