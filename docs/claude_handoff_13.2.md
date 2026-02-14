1. Produktová Vízia (UX)
Cieľom je "Single Interface" – jedno rozhranie, ktoré nahrádza roztrieštené nástroje. Celý systém stojí na 4 hlavných pilieroch (Routách):

A. /capture (Perfect Capture Hub)

Funkcia: Extrémne rýchly vstup pre myšlienky, úlohy a logy.
Dizajn: "Prose-first" (písanie textu). Spodná lišta (BottomCaptureBar), ktorá je vždy po ruke.
Kategórie: Prepínanie módov (klávesové skratky Cmd+L, Cmd+T...):
Capture: Rýchle poznámky do Inboxu.
Log: Logovanie aktivity (trackovanie času/udalostí).

Tasks
: Pridanie novej úlohy.
Daily: Zápis do denníka.
B. /chat (Daily Command Journal)

Funkcia: Tvoj hlavný pracovný priestor pre daný deň.
Koncept: Nie je to nekonečný chat, ale "Denný Feed".
Správanie:
Všetko, čo cez deň napíšeš (Capture, Logy, Journal), sa tu objaví chronologicky.
Jarvis (AI): Vystupuje ako "anotátor" (Option B). Jeho odpovede sú vložené bloky medzi tvojím textom (napr. insighty, sumáre).
Lifecycle: O polnoci (resp. 03:00) sa tento feed "zabaľuje" a archivuje. Nový deň začína s čistým štítom.
C. /tasks (Gamified Task Board)

Funkcia: Manažment úloh inšpirovaný Habiticou.
Štruktúra:
Inbox: Nespracované veci z Capture.
Dailies/Habits: Opakujúce sa veci.
Tickets: Konkrétne jednorazové úlohy s odmenou (EEU/XP).
D. / (Dashboard Home)

Funkcia: "Head-up Display" pre tvoj stav.
Komponenty:
Morning Brief Card: Tvoj fokus na dnešný deň (zadaný ráno).
Stats Grid: Level, XP, Počet napísaných slov (dnes vs včera), Word count (LotR benchmark).
2. Technická Architektúra
Staviame Next.js aplikáciu nad existujúcim backendom.

Frontend: Next.js 15+ (App Router).
Styling: Tailwind CSS (v4) + Shadcn-like komponenty.
State: React Context (žiadny Redux).
Architektúra: Komponenty rozdelené podľa domén (components/home, components/tasks, components/chat).
Backend (Runtime): Existujúci 

alfred/server-fixed.js
 (Express).
NextUI volá /api/* endpointy, ktoré obsluhuje Alfred.
Alfred rieši logiku zápisu do súborov a volanie AI (OpenClaw).
3. Dátový Tok & Automatizácia
Systém je "File-First" (dáta sú v lokálnych súboroch, nie v DB).

Zápis: User napíše cez /capture -> API zapíše do:
inbox.json (ak je to task/capture).
daily-logs.jsonl (ak je to journal/log).
commands.json (ak je to slash príkaz /log ...).
Spracovanie (Pipeline):
Real-time: Jednoduché veci sa uložia hneď.
Jarvis Cron (03:00): V noci sa spustí "upratovanie". Jarvis prejde celý denný log, vytiahne z neho metadáta, zosumarizuje deň a pripraví kontext na ráno.
Čítanie: Frontend polluje /api/status, ktorý agreguje stav (Level, XP, Tasky) do jedného JSONu.
4. Gamifikácia & Ekonomika (EEU)
Vytvorili sme internú "krypto-ekonomiku" (bez blockchainu):

Mena: EEU (Effort/Energy Units).
Ťažba (Zarábanie):
Písanie (Word Count): 100 EEU = cca 60 minút deep focus písania (dynamická krivka).
Tasky: Dokončenie ticketov.
Leveling: XP sa získava paralelne s EEU, ale má "damped" (spomalenú) krivku, aby levely nepribúdali príliš rýchlo.
Burn (Míňanie): Shop s 3 úrovňami odmien (Micro, Standard, Major), kde si za EEU kupuješ reálne odmeny/potešenie.
5. Denný Cyklus (The Loop)
Ráno: Aplikácia ťa vyzve na Morning Brief (nastavíš Topic, Energiu, Sľub dňa). Tým sa otvorí runtime thread pre daný deň.
Deň: Používaš /capture na rýchle veci a /chat na deep work/denník. Plníš /tasks.
Noc (03:00): Automatika uzavrie deň, archivuje chat, pripočíta XP/EEU a resetuje daily počítadlá.