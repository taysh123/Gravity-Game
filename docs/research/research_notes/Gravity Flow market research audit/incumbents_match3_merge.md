# Large casual-puzzle incumbents (Candy Crush Saga, Royal Match, Toon Blast, Gossip Harbor): fact sheets, claim audit, and transferability to Gravity Flow

Research date: 2026-10-14. Evidence labels used throughout: **[OBSERVED]** = I captured it myself from a live store page today; **[STATED]** = a named source says it explicitly; **[ESTIMATE]** = third-party analytics estimate (never actual company revenue); **[INFERENCE]** = my reasoning.

Method note: Google Play pages were fetched with curl (en_US / gl=US) on 2026-10-14 and parsed locally; badges such as "#1 top grossing" are region/time-specific. Play shows two different review counts on one page (a header count and a larger "Ratings and reviews" section count); both are recorded. I did not watch gameplay videos; first-session claims below come from written deconstructions and are thin (see Gaps).

Correction to the brief: Dream Games was **not** sold to Savvy Games in 2024. Sources show CVC Capital Partners agreeing to buy a majority stake at about a $5B valuation in May 2025 (details in Q2).

---

## Q1. Store data: current Google Play bands, ratings, review counts, listing claims (captured 2026-10-14)

### Takeaway
All four listings were live and current on 2026-10-14. Candy Crush is 1B+ and Royal Match, Toon Blast and Gossip Harbor sit at 100M+, 100M+ and 50M+. Only Royal Match carries no "Contains ads" label. The report's table is right on Candy Crush and Gossip Harbor, but wrong or stale on Royal Match and Toon Blast.

### Cited Findings
**Candy Crush Saga (King), com.king.candycrushsaga** [OBSERVED 2026-10-14]
- Installs 1B+; rating 4.6; header "38.9M reviews", ratings section "36.2M reviews"; labels "Contains ads" and "In-app purchases"; rated Everyone; "Editors' Choice"; "#1 top grossing casual" badge; updated Oct 1, 2026; has a Trailer — [Google Play](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US&gl=US)
- Listing text includes: "Thousands of levels"; boosters Color Bomb, Lollipop Hammer, Jelly Fish; "Offline support lets you keep crushing through levels"; "Daily rewards, limited-time events, and regular updates keep the experience fresh"; FAQ "Yes, many levels support offline play". It also says "Do Not Sell My Data: King shares your personal information with advertising partners to personalize ads." — [Google Play](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US&gl=US)
- "What's new" says "We update the game every week" — [Google Play](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US&gl=US)
- The description uses emojis (🍬 🍭 🚗 🍫 🍀 ✨) and "•" bullets — [Google Play](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US&gl=US)
- iOS listing text (fetched via a summarizer, so wording is less certain): "Daily Rewards: Log in every day to claim free boosters and extra lives"; "We update the game every week"; version 1.338.0.2 dated Oct 6; IAP list includes Extra Moves $0.99, Extra Lives $0.99, S Gold Bars Pack $7.99 — [App Store](https://apps.apple.com/us/app/candy-crush-saga/id553834731)

**Royal Match (Dream Games), com.dreamgames.royalmatch** [OBSERVED 2026-10-14]
- Installs **100M+** (not 380M); rating 4.6; header "10.9M reviews", section "10.4M reviews"; label **"In-app purchases" only (no "Contains ads" label)**; "Users Interact, In-Game Purchases (Includes Random Items)"; "Editors' Choice"; "#2 top grossing puzzle" badge; updated Sep 25, 2026; **no Trailer on the listing**; Play Data safety says "Data isn't encrypted" — [Google Play](https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch&hl=en_US&gl=US)
- Verbatim listing text: "And BOOM! It is 100% ad free and no wifi needed - internet free." It names the events "King's Cup, Sky Race, Team Battle, Lightning Rush" and says "Challenge your friends on Facebook". The first line is "Swipe colors, solve match-3 puzzles and help King Robert decorate his castle." — [Google Play](https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch&hl=en_US&gl=US)
- "What's new" says "New levels are coming in every two weeks", plus a new area and "WEEKLY MISSIONS". Bullets are hyphens and the description has no emojis — [Google Play](https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch&hl=en_US&gl=US)

**Toon Blast (Peak, now Take-Two/Zynga), net.peakgames.toonblast** [OBSERVED 2026-10-14]
- Installs **100M+**; rating **4.6** (not 4.7); header "4.67M reviews", section "4.21M reviews"; labels "Contains ads" and "In-app purchases"; "#4 top grossing puzzle" badge; updated Oct 9, 2026; has a Trailer; "What's new": "Cosmic Cruise episode with 50 new levels" — [Google Play](https://play.google.com/store/apps/details?id=net.peakgames.toonblast&hl=en_US&gl=US)
- Listing features include "Create your own team & compete with others", "Receive lives from your teammates", and "Collect stars by completing levels to win awesome rewards". The bullets are "●" and there are no emojis — [Google Play](https://play.google.com/store/apps/details?id=net.peakgames.toonblast&hl=en_US&gl=US)
- AppBrain (data dated 2026-10-12) reports "130 million installs" (AppBrain's own estimate), rating 4.63, "4.2 million ratings", and 1.1M installs in the last 30 days. The Play band for the same app is 100M+ — [AppBrain](https://www.appbrain.com/app/toon-blast/net.peakgames.toonblast)

**Gossip Harbor: Merge & Story (Microfun), com.mergegames.gossipharbor** [OBSERVED 2026-10-14]
- Installs 50M+; rating 4.3; header "715K reviews", section "651K reviews"; labels "Contains ads" and "In-app purchases"; "In-Game Purchases (Includes Random Items)"; "#1 top grossing puzzle" badge; updated Sep 21, 2026; has a Trailer; also installable on Windows via Google Play Games — [Google Play](https://play.google.com/store/apps/details?id=com.mergegames.gossipharbor&hl=en_US&gl=US)
- Listing text is story-led and uses emojis (🌊 🥪 🧰 💞 🤫). Quote: "Merge flavorful dishes, restore and decorate Quinn's restaurant and watch the mystery unfold." "What's new": "NEW EPISODE EVERY FRIDAY" plus a themed event — [Google Play](https://play.google.com/store/apps/details?id=com.mergegames.gossipharbor&hl=en_US&gl=US)
- Play category tags for Gossip Harbor are Simulation/Lifestyle/Design/Single player, with **no "Offline" tag**. The other three show an "Offline" tag — [Google Play](https://play.google.com/store/apps/details?id=com.mergegames.gossipharbor&hl=en_US&gl=US)

### Inferences
- [INFERENCE] The "(NN M rev)" figures in the report are Play **review** counts, not revenue. They sit next to download counts in a column headed "Downloads / Rating (Google Play)", and the report's own note says "Downloads and Reviews come from store listings". A reader could easily take "rev" as revenue.
- [INFERENCE] The 380M (Royal Match) and 130M (Toon Blast) figures in a column headed "Google Play" are not Google Play bands. Play shows 100M+ for both. 130M is AppBrain's estimate; 380M has no source I could locate.

### Gaps
- Regional variation: Play pages differ by country (I captured US). Review counts shift daily.
- I could not retrieve the original Play listing the report author used, so I cannot say whether 10.3M and 2.8M were once accurate. Today they are not.

---

## Q2. Commercial data: credible revenue and download estimates (2024 to 2026)

### Takeaway
Best public numbers come from AppMagic via Mobilegamer.biz and PocketGamer.biz. For 2025 AppMagic net IAP is Candy Crush about $1.01B, Royal Match about $1.37B, Gossip Harbor about $550M. Toon Blast is outside AppMagic's top 20 (below about $365M net IAP), though Take-Two calls it a top contributor and reports a >$3B lifetime milestone. All are third-party estimates (not company-reported actuals), and bases differ (net IAP vs gross spending), so figures cannot be mixed.

### Cited Findings
**Basis rules** — AppMagic figures in Mobilegamer.biz exclude "Apple or Google's 30%, ad revenue, webshop income or revenue from China's fragmented Android ecosystem", i.e. **net IAP only** — [Mobilegamer.biz, 2026-01-13](https://mobilegamer.biz/the-top-grossing-mobile-games-of-2025/). PocketGamer.biz's AppMagic pieces on Royal Kingdom are labeled **gross player spending** — [PocketGamer.biz, 2025-11-25](http://www.pocketgamer.biz/royal-kingdom-surpasses-300m-in-first-year-beating-royal-match/) and [PocketGamer.biz, 2026-07-14](https://www.pocketgamer.biz/royal-kingdom-surpasses-750m-with-42-of-all-revenue-made-in-h1-2026/) (basis as read by a summarizer; confirm before quoting).

**Candy Crush Saga**
- 2025 net IAP: $1.01bn (8th globally), up from $980m in 2024; "passed the $1bn barrier for the first time"; US $576m. AppMagic estimate, net IAP, annual — [Mobilegamer.biz, 2026-01-13](https://mobilegamer.biz/the-top-grossing-mobile-games-of-2025/)
- King total 2025 IAP about $1.3bn, with Candy Crush roughly 77% of that; "King also serves non-paying players ads in many of its games, but that revenue is very difficult to estimate using third-party tools"; no formal Microsoft disclosure. AppMagic estimate, net IAP — [Mobilegamer.biz, 2026-02-23](https://mobilegamer.biz/microsofts-1-7bn-mobile-game-empire-what-works-what-doesnt-and-whats-next/)
- Microsoft reports only Xbox "content and services" in aggregate. I found no King or Candy Crush line item in Microsoft's FY26 materials, so there is **no company-reported Candy Crush revenue to cite** — [Game World Observer, 2026-07-30](https://gameworldobserver.com/2026/07/30/xboxs-annual-revenue-has-declined-but-satya-nadella-remains-optimistic) (aggregate Xbox results only)
- Older context: $7.15B lifetime revenue after 10 years; 1.65B downloads per data.ai versus a 3B figure claimed by King's president; about 95% of revenue from "+5 moves" purchases after failing; 45+ new levels per week; 13,000+ levels (Dec 2022). Analyst estimate (Naavik) — [Naavik, 2022-12-15](https://naavik.co/deep-dives/candy-crush-10-year-reign/)
- Downloads: Play band 1B+ (all-time, Android only) — [Google Play](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US&gl=US)

**Royal Match**
- 2025 net IAP: $1.37bn (5th), down from $1.39bn in 2024. AppMagic, net IAP, annual — [Mobilegamer.biz, 2026-01-13](https://mobilegamer.biz/the-top-grossing-mobile-games-of-2025/)
- Lifetime: "over $7 billion" player spending, with the US about 53% of spending. AppMagic, **gross**, lifetime, as of 2026-07-14 — [PocketGamer.biz, 2026-07-14](https://www.pocketgamer.biz/royal-kingdom-surpasses-750m-with-42-of-all-revenue-made-in-h1-2026/); the same source family gave $5.8B lifetime on 2025-11-25 — [PocketGamer.biz](http://www.pocketgamer.biz/royal-kingdom-surpasses-300m-in-first-year-beating-royal-match/)
- Earlier cross-check: Appfigures $3bn **gross** lifetime from 300m installs; AppMagic 296m downloads and $2.3bn developer earnings after the 30% cut (Sept 2024); "Revenue... comes predominately from the US App Store" — [Mobilegamer.biz, 2024-09-09](https://mobilegamer.biz/dream-games-royal-match-has-passed-3bn-says-appfigures/)
- Downloads: no authoritative 2026 all-platform figure found. A newsletter reports "over 351 million" downloads, $6B gross and about $3.6B net at May 2025, without naming the estimator — [0xSpectrum, 2025-06-04](https://0xspectrum.substack.com/p/royal-match-breaks-6-billion-in-player) (low confidence). Play band for Android alone is 100M+ — [Google Play](https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch&hl=en_US&gl=US)
- Corporate: CVC Capital Partners to acquire a majority stake in Dream Games at about a $5 billion valuation (reported 2025-05-05), with Blackstone-led debt and a Q3 2025 expected close. The release gave no revenue or download figures; the "highest-grossing puzzle game worldwide" claim is unattributed — [Private Equity Wire](https://www.privateequitywire.co.uk/cvc-to-acquire-5bn-majority-stake-in-dream-games/). I found no Savvy Games link.
- Royal Kingdom (Dream Games' sequel): $301.1M gross in its first year versus Royal Match's $296.4M; this likely cannibalizes some Royal Match spend ("companion game Royal Kingdom stealing its thunder" — Mobilegamer.biz's view) — [PocketGamer.biz, 2025-11-25](http://www.pocketgamer.biz/royal-kingdom-surpasses-300m-in-first-year-beating-royal-match/), [Mobilegamer.biz](https://mobilegamer.biz/the-top-grossing-mobile-games-of-2025/)

**Toon Blast**
- Ownership chain: Zynga announced the Peak acquisition on 2020-06-01 for $1.8B (half cash, half stock), closed 2020-07-02 at about $1.85B, with Toon Blast plus Toy Blast above 12M combined DAU at that time — [PocketGamer.biz](https://www.pocketgamer.biz/zynga-acquires-peak-games/) and search-result summary of Zynga SEC filings (not independently fetched). Take-Two closed its $12.7B acquisition of Zynga on 2022-05-23 — [Game World Observer, 2022-05-23](https://gameworldobserver.com/2022/05/23/take-two-finally-closes-its-12-7-billion-acquisition-of-zynga)
- Take-Two (company-reported, but at title level it gives only growth %): the Q1 FY27 release (quarter ended 2026-06-30, dated 2026-08-07) lists Toon Blast among the "largest contributors to Net Bookings"; mobile was $739.5M, or 53% of net bookings — [SEC 8-K Q1 FY27](https://www.sec.gov/Archives/edgar/data/0000946581/000162828026054580/ttwo1q27earningsrelease.htm). The Q3 FY26 release (quarter ended 2025-12-31) lists it too — [SEC 8-K Q3 FY26](https://www.sec.gov/Archives/edgar/data/946581/000162828026005010/ttwo3q26earningsrelease.htm)
- "Toon Blast alone growing 43% while crossing $3 billion in lifetime net bookings" (Q3 FY26), per a stock-analysis blog citing the earnings call; I could not find this line in the 8-K body itself — [TIKR, 2026-02-26](https://www.tikr.com/blog/take-two-stock-in-2026-toon-blast-crossed-3-billion-lifetime-and-nba-2k-is-breaking-records). Net bookings is Take-Two's own metric and is not equal to AppMagic net IAP.
- Q1 FY27: Toon Blast net bookings +8% year on year, "supported by a new marketing campaign featuring... Giancarlo Esposito" (summarizer paraphrase of the call) — [Nasdaq call highlights, 2026-08](https://www.nasdaq.com/articles/take-two-interactive-software-q1-earnings-call-highlights)
- AppMagic 2025 ranking: Toon Blast does **not** appear in the top 20 (20th place was $365m net IAP; 21st $355m) — [Mobilegamer.biz, 2026-01-13](https://mobilegamer.biz/the-top-grossing-mobile-games-of-2025/)
- Deconstructor of Fun (2026-07-27, per the fetched page): H1 2024 revenue $212.7M; January 2024 peak $37.6M per month; "$35M+" per month afterward; "Downloads are down more than 90% from peak while revenue sits near record highs"; ARPDAU rose from $0.17-0.38 to $2-3 after the "Super Light Ball" (Oct 2023). The metric basis (gross vs net) is not stated in what I read — [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/how-toon-blast-became-the-best-business-in-puzzle)
- Naavik (2024-03-10) quoted a Toon Blast baseline "$6M per month" rising to "$9M", which conflicts with DoF's monthly levels, so the basis must differ and neither is used here — [Naavik](https://naavik.co/digest/puzzle-games-go-super/)
- Downloads: AppBrain estimate 130M installs, 1.1M in the last 30 days (2026-10-12) — [AppBrain](https://www.appbrain.com/app/toon-blast/net.peakgames.toonblast)

**Gossip Harbor**
- 2025 net IAP: $550m (11th, up 44 places year on year). AppMagic, net IAP, annual — [Mobilegamer.biz, 2026-01-13](https://mobilegamer.biz/the-top-grossing-mobile-games-of-2025/)
- H1 2026: net monthly earnings passed $100m in March 2026 and the game "made more than half a billion overall during H1". AppMagic, net — [PocketGamer.biz, 2026-07-27](https://www.pocketgamer.biz/puzzle-accounts-for-44-of-casual-mobile-earnings-in-h1-2026/)
- AppMagic-sourced audience figures from an agency blog: 90M+ total downloads, DAU 5.4M, MAU 28M, 79% female, average age 32; revenue US 40%, Japan 9%, Germany 6% — [Udonis, 2026-07-20](https://www.blog.udonis.co/mobile-marketing/mobile-games/gossip-harbor). Its "$677 million lifetime revenue" figure cannot be right alongside $550M for 2025 plus more than $0.5B in H1 2026, so treat that single number as stale or mis-based.
- Earlier (Sensor Tower, July 2024, gross IAP): daily gross IAP above $500K on peak days and a "$195 million annual run rate" — [Deconstructor of Fun, 2024-08-19](https://www.deconstructoroffun.com/blog/2024/8/19/finding-genre-success-the-case-of-gossip-harbor)
- Naavik's 2025-06-22 digest ("over $100M in worldwide revenue by end of May 2025", "5.3M+ downloads") is internally implausible against the AppMagic figures above and is not used — [Naavik](https://naavik.co/digest/gossip-harbors-meteoric-rise-in-merge/)
- Genre context: merge was +74% year on year in H1 2026 ($1.3B) while match-3 was flat (-1% at $2.5B), and only 1 in 120 new match-3 games reached $100K in a month (AppMagic) — [PocketGamer.biz, 2026-07-27](https://www.pocketgamer.biz/puzzle-accounts-for-44-of-casual-mobile-earnings-in-h1-2026/)

### Inferences
- [INFERENCE] The report's "each earn hundreds of millions annually" understates Candy Crush and Royal Match: AppMagic puts each above $1B net IAP in 2025. It also undercuts the report's logic: the example offered for "ad-supported puzzle games can outperform in ROI" is led by Royal Match, which has no ads.
- [INFERENCE] Do not add Toon Blast's Take-Two "$3B lifetime net bookings" to any AppMagic figure. Different companies and different definitions.
- [INFERENCE] Gossip Harbor shows the highest-growth segment (merge) beating match-3, with the highest ad share of the four (see Q5), and a recent winner on Android.

### Gaps
- No company-reported revenue exists for Candy Crush Saga or Royal Match (King is not broken out; Dream Games is private).
- No 2026 all-platform download estimate for Royal Match found. The 380M figure is unsourced. 351M (May 2025) makes 380M by Oct 2026 plausible, but this is not verified.
- The metric basis (gross vs net) for DoF's Toon Blast monthly figures is not stated in what I read.
- The AppMagic H1'25 repost on Substack ("Candy Crush $602M", "Royal Match $788M", labelled net IAP) is inconsistent with Mobilegamer's AppMagic full-year net figures (Royal Match H1 would exceed half of the full year by a wide margin), so I excluded it — [GameDevReports Substack, 2025-09-04](https://gamedevreports.substack.com/p/appmagic-mobile-casual-games-in-h125).

---

## Q3. Core loop, first session / onboarding, difficulty curve, meta-progression

### Takeaway
Match-3 incumbents are built on a lives-gated level treadmill, with a "+5 moves"-style paid continue at the point of loss as the main sink, plus a light meta (map, castle, collections). Public, citable first-session timelines are scarce: only Gossip Harbor has a documented first-hour monetization schedule. Difficulty is a recurring complaint across all four.

### Cited Findings
**Candy Crush Saga**
- Core: match-3 with a saga map; episodes of levels; 45+ new levels per week; 13,000+ levels at Dec 2022; about 95% of revenue estimated to come from "+5 moves" purchases after failing; 10 Gold Bars moved from $1 to $1.99 (matching Royal Match) — [Naavik, 2022-12-15](https://naavik.co/deep-dives/candy-crush-10-year-reign/). Current Play text claims "Thousands of levels" — [Google Play](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US&gl=US)
- First episode, "Candy Town" (levels 1-10), is described by fans as very easy, introducing moves levels, striped, wrapped candies and color bombs one by one — fan wiki, low authority, read from a search-result summary only — [Candy Town fan wiki page](https://imamadmad.fandom.com/wiki/Candy_Town). I found no authoritative minute-by-minute FTUE teardown.
- Lives: 5 lives, one regenerates every 30 minutes (a comparison blog states this for Candy Crush, Royal Match and Toon Blast; low authority) — [Playworth comparison](https://playworth.games/compare/royal-match-vs-candy-crush-saga)

**Royal Match**
- Core: swipe-match-3, concurrent matching, generous power-ups, no forced power-up use when no match exists, no visible loading, "near-miss" tuning, and "Super Hard" levels flagged in-game; end-of-round "extra moves" at $2 of coins for the first 5 moves (the highest in the genre), escalating on repeat — [Naavik, 2022-05-25](https://naavik.co/deep-dives/royal-match/); [DoF, 2021-03-22](https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey)
- Continue cost: 900 coins for extra moves (DoF 2021); a Play reviewer (2026-04-12) says "Coins earned for clearing a level average about 50. It costs 900 to keep trying a failed level" — [Google Play](https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch&hl=en_US&gl=US)
- Lives: 5 lives; 8 with the paid Royal Pass; one per 30 minutes; teammates can send lives (teams of up to 50) — [Esports.net](https://www.esports.net/news/mobile-games/royal-match-free-lives/) (search summary, low authority)
- Meta: "social/decorative-lite", castle decoration with preset locations and "no customization"; "There are generally only two actions to take in Royal Match: upgrade the castle decorations or play another level"; every live event "can be progressed by simply pressing the single 'Play' button" — [DoF, 2021](https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey); [Funovus](https://www.funovus.com/blogs/royal-match-dominates-match-3-what-can-all-designers-learn/)
- FTUE: described as polished and not heavily forced ("the FTUE was done very well", opinion) with 5 starting lives; no step count, first-fail timing or first-offer timing is documented — [Substack, 2025-01-22](https://pranaysarepaka.substack.com/p/royal-match-breakdown-part-1)
- Difficulty engineering: "Super Light Ball" (June 2023) unlocks around level 292; players must win 10 consecutive levels to activate it and losing deactivates it; harder level variants while active raise out-of-moves popups; Royal Match revenue rose "1.5 times" baseline — [Naavik, 2024-03-10](https://naavik.co/digest/puzzle-games-go-super/) (analyst claim)

**Toon Blast**
- Core: tap-to-blast cubes (the "blast" subgenre) with a solid single-screen board, "no scrolling, blockers and boosters that stay on the board, more luck, less strategy", no saga map (events emphasized since 2017) — [DoF](https://www.deconstructoroffun.com/blog/how-toon-blast-became-the-best-business-in-puzzle); [Mobile Free to Play, 2017-11-06](https://mobilefreetoplay.com/peak-games-toon-blast-death-of-saga/)
- Meta added 2023-2026: a card-collection system borrowed from social casino, a "Wild Journey" progression track, a three-tier season pass, Cannon Fest mini-games, and a 2025 live-ops rebuild (seven one-day events replaced by overlapping 2-6 day events) — [DoF](https://www.deconstructoroffun.com/blog/how-toon-blast-became-the-best-business-in-puzzle)
- DoF reports "more fails, more purchase moments" and "Loss aversion converts harder than progress" at out-of-moves prompts (analyst opinion) — [DoF](https://www.deconstructoroffun.com/blog/how-toon-blast-became-the-best-business-in-puzzle)
- Magic Disco (equivalent of Super Light Ball) unlocks at level 291 — [Naavik, 2024-03-10](https://naavik.co/digest/puzzle-games-go-super/)
- Team and social: Play text lists "Create your own team" and lives from teammates; a reviewer notes "Toon Tournament" weekly rankings for their team — [Google Play](https://play.google.com/store/apps/details?id=net.peakgames.toonblast&hl=en_US&gl=US)

**Gossip Harbor**
- Core: merge items to fill orders; coins are spent almost only on advancing the story and restoring the restaurant ("a very clean design solution"); energy is the primary monetization lever; the item-generation cost "boost" doubles at level 15 and quadruples at level 40 — [DoF, 2024-08-19](https://www.deconstructoroffun.com/blog/2024/8/19/finding-genre-success-the-case-of-gossip-harbor)
- First session (DoF): level 10 within two sessions; seasonal events unlock in about an hour; three monetization offers before the first hour, the first at about the 10-minute mark; dynamic pricing of energy packs after declined offers — [DoF, 2024-08-19](https://www.deconstructoroffun.com/blog/2024/8/19/finding-genre-success-the-case-of-gossip-harbor) (dated 2024; may have changed)
- Pacing from a 2026 review: early board readable and orders modest, mid-game "The board starts to crowd", late "inventory triage"; story is linear, "soap-operatic" — [Orcz, 2026-05-27](https://orcz.com/gossip-harbor-review-a-cozy-cafe-mystery-with-a-cash-register-behind-the-counter/)
- Weekly story episodes ship every Friday — [Google Play](https://play.google.com/store/apps/details?id=com.mergegames.gossipharbor&hl=en_US&gl=US)

### Inferences
- [INFERENCE] All four convert at the moment of failure or scarcity (extra moves, lives, energy). That is the central monetization pattern, and it depends on a moves/energy economy Gravity Flow does not have.
- [INFERENCE] Royal Match's meta is deliberately thin (two actions: play or decorate). Meta does not have to be deep to retain.

### Gaps
- No credible public source I could reach times the first 10 minutes (tutorial length, first fail, first offer) for Candy Crush, Royal Match or Toon Blast. I did not watch gameplay videos, so none of this is observed.
- GameRefinery/Liftoff and Mobilegamer pieces on first sessions were not found. The Medium analysis returned 403.

---

## Q4. Live-ops: daily, weekly and event systems, teams, update cadence

### Takeaway
Cadence among the four: Candy Crush weekly updates; Royal Match new levels every two weeks plus a rotating event stack; Toon Blast episodic drops (50 levels) plus overlapping events; Gossip Harbor a new episode every Friday and 4-10 concurrent events. Teams and PvP events are core to Royal Match and Toon Blast.

### Cited Findings
- Candy Crush: "We update the game every week" (Play and App Store); "Daily rewards, limited-time events, and regular updates keep the experience fresh" — [Google Play](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US&gl=US); iOS "Daily Rewards: Log in every day to claim free boosters and extra lives" — [App Store](https://apps.apple.com/us/app/candy-crush-saga/id553834731)
- Candy Crush's "Daily Booster Wheel" (spin for free daily rewards) appears in a Microsoft Store listing snippet; I did not capture it from a primary page — [Microsoft Store](https://apps.microsoft.com/detail/9nblggh18846) (search-result snippet only)
- Candy Crush: competitive formats "1 vs 1, 1 vs many, and many vs many" plus life requests (Dec 2022) — [Naavik](https://naavik.co/deep-dives/candy-crush-10-year-reign/)
- Royal Match: events King's Cup, Sky Race, Team Battle, Lightning Rush (listing text); weekly missions and "Haunted Pass" store-banner event ("Collect keys to unlock 30 stages of Haunted Pass rewards", ends 10/29) seen on the Play page — [Google Play](https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch&hl=en_US&gl=US)
- Royal Match event revenue impacts at launch plus one year (Naavik): Royal Pass +31%, Endless Treasure +20%, Sky Race +12%, Lightning Rush +9%, Team Treasure +2% — [Naavik, 2022-05-25](https://naavik.co/deep-dives/royal-match/) (analyst estimates)
- Toon Blast: weekly "Toon Tournament" team ranking (reviewer); episode of 50 new levels (Oct 2026); live-ops rebuild late summer 2025 — [Google Play](https://play.google.com/store/apps/details?id=net.peakgames.toonblast&hl=en_US&gl=US); [DoF](https://www.deconstructoroffun.com/blog/how-toon-blast-became-the-best-business-in-puzzle)
- Gossip Harbor: "NEW EPISODE EVERY FRIDAY", monthly season pass ($5-$7.99), daily escalating objectives, events including Lucky Larks and Ziva's Goldrush — [DoF, 2024-08-19](https://www.deconstructoroffun.com/blog/2024/8/19/finding-genre-success-the-case-of-gossip-harbor); 4-10 concurrent events, "nearly double Travel Town's offering" — [Naavik, 2025-06-22](https://naavik.co/digest/gossip-harbors-meteoric-rise-in-merge/); "Seasonal tracks, order events, coin races, decoration events" — [Orcz, 2026-05-27](https://orcz.com/gossip-harbor-review-a-cozy-cafe-mystery-with-a-cash-register-behind-the-counter/)
- Merge Mansion "tripled event frequency", but "players got used to constant content drops" (AppMagic H1'25 summary; weak source) — [GameDevReports](https://gamedevreports.substack.com/p/appmagic-mobile-casual-games-in-h125)

### Inferences
- [INFERENCE] Every incumbent stacks several concurrent time-limited loops on top of one core puzzle. A small team cannot match event volume. Gravity Flow's Daily challenge plus Gravity Run is the right-sized analogue.

### Gaps
- No public data on what share of retention comes from each event type. Do not infer internal metrics.

---

## Q5. Monetization: IAP/ads, rewarded vs forced, is Royal Match really ad-free?

### Takeaway
Royal Match is the clear ad-free case: its listing says "100% ad free", the Play page carries no "Contains ads" label, and I found no evidence of rewarded video. The other three carry "Contains ads" and all monetize mainly via IAP. Candy Crush also sells brand ads (opt-in "Rewarded Portals"); Gossip Harbor leans on rewarded video (estimated 15-20% of revenue).

### Cited Findings
- Royal Match: "It is 100% ad free" (listing, verbatim) and no "Contains ads" label [OBSERVED 2026-10-14] — [Google Play](https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch&hl=en_US&gl=US). Secondary: a CEO quote "It's really bad for user experience..." appears in an Esports.net explainer (I could not trace it to the original interview) — [Esports.net](https://www.esports.net/news/mobile-games/how-does-royal-match-make-money/). Monetization is coins for extra moves, boosters and lives, plus offers, and a Royal Pass priced above $10 per month (Naavik, 2022) — [Naavik, 2022-05-25](https://naavik.co/deep-dives/royal-match/)
- Royal Match has no rewarded-video path I could find. A Play reviewer (2026-05-27) complains "There are too few 'freebies'" and wants to quit — [Google Play](https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch&hl=en_US&gl=US). Absence is not proven by reviews alone.
- Candy Crush: "Contains ads" [OBSERVED]; Microsoft Advertising launched **Rewarded Portals**, an opt-in format on the level screen ("giving players the opportunity to engage, unlocking a full-screen branded experience in exchange for a high-value reward") — [Microsoft Advertising, 2026-05-12](https://about.ads.microsoft.com/en/blog/post/may-2026/unlock-deeper-engagement-with-rewarded-portals). Mobilegamer says King "serves non-paying players ads in many of its games" — [Mobilegamer.biz, 2026-02-23](https://mobilegamer.biz/microsofts-1-7bn-mobile-game-empire-what-works-what-doesnt-and-whats-next/). Ads were added "in recent years" after IAP-first design (Dec 2022) — [Naavik](https://naavik.co/deep-dives/candy-crush-10-year-reign/)
- Toon Blast: "Contains ads" [OBSERVED]; Take-Two defines recurrent consumer spending to include "in-game advertising" and reported "Advertising $111.1" million of company revenue for the June 2026 quarter, not split by title — [SEC 8-K Q1 FY27](https://www.sec.gov/Archives/edgar/data/0000946581/000162828026054580/ttwo1q27earningsrelease.htm). Reviewer complaint: "No longer have the option to watch ads to get extra moves I have to spend coins" (rewarded ad for extra moves existed) — [AppBrain reviews](https://www.appbrain.com/app/toon-blast/net.peakgames.toonblast). DoF describes the model as primarily IAP.
- Gossip Harbor: "Contains ads" [OBSERVED]; hybrid IAP plus rewarded ads; estimated 15-20% of revenue from rewarded video "when players run out of energy" and for treasure chests; "users who engage with rewarded ads are 4.5 times more likely to make in-app purchases" (analyst claim, source of the stat unclear) — [DoF, 2024-08-19](https://www.deconstructoroffun.com/blog/2024/8/19/finding-genre-success-the-case-of-gossip-harbor); [Naavik, 2025-06-22](https://naavik.co/digest/gossip-harbors-meteoric-rise-in-merge/); [Udonis, 2026-07-20](https://www.blog.udonis.co/mobile-marketing/mobile-games/gossip-harbor). A 2026 reviewer says rewarded videos are "the only ad format" — [Orcz, 2026-05-27](https://orcz.com/gossip-harbor-review-a-cozy-cafe-mystery-with-a-cash-register-behind-the-counter/). A Play reviewer (2026-09-16) says "some people are saying they get ads and pop-ups on here. might be regional", and the developer replied it would "communicate and negotiate with the advertising platform... to optimize our ad content" — [Google Play](https://play.google.com/store/apps/details?id=com.mergegames.gossipharbor&hl=en_US&gl=US)
- Revenue concentration for Royal Match is US-heavy (about 53% of spend), which is how an ad-free game funds heavy UA — [PocketGamer.biz, 2026-07-14](https://www.pocketgamer.biz/royal-kingdom-surpasses-750m-with-42-of-all-revenue-made-in-h1-2026/); [Mobilegamer.biz, 2024-09-09](https://mobilegamer.biz/dream-games-royal-match-has-passed-3bn-says-appfigures/)

### Inferences
- [INFERENCE] "Ad-free" works for Royal Match only because of whale-driven IAP and a very large UA budget. The report's "Royal Match IAP only" is verified, but it should not be read as a model for a no-UA indie.
- [INFERENCE] Gossip Harbor's reviewer split (some see no ads, some see pop-ups) suggests ad load varies by region or placement; "many ads" is not established.
- [INFERENCE] Because "Contains ads" is a developer declaration covering any ad SDK, it does not distinguish rewarded from forced ads.

### Gaps
- Whether Royal Match runs cross-promotion (e.g. for Royal Kingdom) inside the app: no evidence found either way.
- Interstitial frequency in Candy Crush: not found in any source I could verify.

---

## Q6. Store positioning: screenshots and video style [OBSERVED 2026-10-14]

### Takeaway
Each listing sells a different promise. Candy Crush uses real boards with three-word captions. Royal Match and Toon Blast lead with dramatic "rescue" puzzle scenes. Gossip Harbor leads with story and characters, with the merge board sixth. Only Royal Match has no trailer.

### Cited Findings
- Candy Crush: first screenshots are portrait boards with big captions "Create Colorbombs", "Make Special Candies!", "Trigger Sweet Rewards!", then plain gameplay boards; trailer present — [Google Play](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US&gl=US) (I viewed a contact sheet of the first 8 images)
- Royal Match: 5 portrait screenshots, each a hazard-rescue puzzle with a caption ("SAVE THE KING!", "ESCAPE THE SHARK", "STOP THE ROCKFALL", "CLEAR THE WAY", "MAKE THE PERFECT MATCH") and a hand-cursor graphic; no castle-decoration screen; **no trailer** — [Google Play](https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch&hl=en_US&gl=US)
- Toon Blast: 5 portrait scenes of the same rescue/hazard style (lava, maze, spikes) with a pointing hand, then two wide images; no captions; trailer present — [Google Play](https://play.google.com/store/apps/details?id=net.peakgames.toonblast&hl=en_US&gl=US)
- Gossip Harbor: first image says "BECOME A MERGE GAME CHAMPION! PLAY NOW" over cash imagery, then story panels captioned "Story", "Help Them", "Renovate", "Design", "Merge"; trailer present — [Google Play](https://play.google.com/store/apps/details?id=com.mergegames.gossipharbor&hl=en_US&gl=US)
- Royal Match's creatives are known to show King Robert escaping trap-filled rooms ("cartoon-esque trapping techniques"), and the store images match this style — [Naavik, 2022-05-25](https://naavik.co/deep-dives/royal-match/)

### Inferences
- [INFERENCE] Store art echoes UA creative for Royal Match, Toon Blast and Gossip Harbor, and in the first two it shows a stylized situation rather than the real core board. Candy Crush is the only one that shows plain gameplay boards.
- [INFERENCE] Two of four show a hand cursor demonstrating the single gesture, a relevant pattern for a one-gesture game.

### Gaps
- I did not play or record trailers, so trailer style (fail-ad style, UGC, etc.) is unobserved.

---

## Q7. Acquisition: documented UA and creative strategy

### Takeaway
Royal Match and Gossip Harbor are paid-UA machines with creatives that dramatize a situation rather than show the core loop. Candy Crush publicly pursues "representative" advertising and celebrity tie-ins. Toon Blast is a mature, nearly UA-free base now receiving a marketing push.

### Cited Findings
- Royal Match: "61.5% of its downloads are from paid advertisements" versus Candy Crush's 15.4%-25% (agency blog, source and date of underlying data unclear) — [Udonis, 2025-09-18](https://www.blog.udonis.co/mobile-marketing/mobile-games/royal-match-analysis); "absurdly high Apple Search Ads spend" — [Mobilegamer.biz, 2024-09-09](https://mobilegamer.biz/dream-games-royal-match-has-passed-3bn-says-appfigures/); fail-style and mini-game ads — [Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/royal-match-analysis); "King's Nightmare" feature was built to match ad creative and "keep CPI optimized"; puzzle CPI "$10 or more" — [Naavik, 2022-05-25](https://naavik.co/deep-dives/royal-match/)
- Royal Kingdom launched with celebrity marketing featuring Shakira, Jimmy Fallon and LeBron James — [PocketGamer.biz, 2025-11-25](http://www.pocketgamer.biz/royal-kingdom-surpasses-300m-in-first-year-beating-royal-match/)
- Candy Crush: "representative advertising" (actual gameplay) to protect the brand; 4th top App Store advertiser; 17,000+ apps across 12 networks; licensed partnerships (Dec 2022) — [Naavik](https://naavik.co/deep-dives/candy-crush-10-year-reign/)
- Gossip Harbor: 78% of downloads from paid ads, with better ROAS than closest competitor while spending under half of Travel Town (Naavik, 2025-06-22; basis of the figures not verified) — [Naavik](https://naavik.co/digest/gossip-harbors-meteoric-rise-in-merge/); emotionally charged narrative ads "featuring female characters in distress", not reflecting actual gameplay — [Udonis, 2026-07-20](https://www.blog.udonis.co/mobile-marketing/mobile-games/gossip-harbor). A Play reviewer (2024-12-01, 952 helpful votes): "The advertising for it was definitely misscomunicated. You really don't do any of the survival puzzles it kept showing" — [Google Play](https://play.google.com/store/apps/details?id=com.mergegames.gossipharbor&hl=en_US&gl=US)
- Toon Blast: downloads down 90%+ from peak, 1.1M installs in last 30 days (AppBrain estimate); Take-Two credits a new campaign with Giancarlo Esposito for growth in Q1 FY27 — [DoF](https://www.deconstructoroffun.com/blog/how-toon-blast-became-the-best-business-in-puzzle); [AppBrain](https://www.appbrain.com/app/toon-blast/net.peakgames.toonblast); [Nasdaq call highlights](https://www.nasdaq.com/articles/take-two-interactive-software-q1-earnings-call-highlights)

### Inferences
- [INFERENCE] None of this UA is reproducible by a no-budget team. The transferable part is honest creative: Gossip Harbor's misleading ads drew a high-visibility complaint.

### Gaps
- Candy Crush and Royal Match paid-share numbers come from an agency blog without a stated date or estimator. Treat as indicative only.

---

## Q8. Player complaints: recurring patterns

### Takeaway
Across all four, the dominant complaint is perceived pay-to-progress difficulty (hard levels, costly continues, scarce free resources). Others: event and UI overload (Candy Crush), lost progress without Facebook (Toon Blast), energy scarcity (Gossip Harbor), and misleading ads and pop-up ads (Gossip Harbor).

### Cited Findings (sample is small: the 3-4 reviews surfaced on each Play page, captured 2026-10-14)
- Candy Crush (2026-09): "There are too many things going on now, it feels overwhelming"; "levels you simply have no hope of passing unless you spend actual money to purchase gold bars"; another reports a payment screen freezing mid-purchase; another says levels "get way too hard" around level 64 — [Google Play](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US&gl=US)
- Royal Match (2026-04/05): "heavily skewed to push for players to spend money"; "The more you spend, the more difficult the levels" (a perception, unverified); "too few 'freebies'"; 900-coin continue vs about 50 coins earned per level — [Google Play](https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch&hl=en_US&gl=US). A positive review (2024-12, 10,126 helpful) praises it as less frustrating than other match-3 games
- Toon Blast (2025-02 and 2026): "now it costs several hundred coins a day to play" (793 helpful); no Facebook means progress resets on a new phone; "Being stuck on a level for days"; team ranking falls because members get stuck; developer reply "you can always pass the levels without making any purchases" — [Google Play](https://play.google.com/store/apps/details?id=net.peakgames.toonblast&hl=en_US&gl=US); AppBrain reviewers describe 35-40 lives on one board — [AppBrain](https://www.appbrain.com/app/toon-blast/net.peakgames.toonblast)
- Gossip Harbor (2024-2026): energy "takes forever to refill" (734 helpful), "feels rigged so that you have to spend your own $$" (952 helpful), side-mission timers too short, misleading ads (2024-12), pop-up ads (2026-09) — [Google Play](https://play.google.com/store/apps/details?id=com.mergegames.gossipharbor&hl=en_US&gl=US)
- Deceptive-patterns database characterizes Candy Crush as having "impossible levels" to nudge purchases (a critical, not neutral, source) — [Deceptive Patterns](https://bunny.deceptive.design/articles/candy-crush-saga-impossible-levels) (search-result title only; not fetched)

### Inferences
- [INFERENCE] The same revenue mechanism (tuned scarcity at the point of loss) generates the loudest negative reviews, yet all four hold 4.3-4.6 stars. Ratings are resilient with a very large base, but a small game has a thinner buffer.
- [INFERENCE] Gossip Harbor's lowest rating (4.3 vs 4.6) coincides with the heaviest ad content and the misleading creatives; correlation only.

### Gaps
- Review sampling is tiny and Play's default sort favors helpful reviews. I did not sample star-by-star distributions.

---

## Q9. Claim audit: every claim the report makes about these four games

Labels: Verified / Partly supported / Unverified / Incorrect-outdated / Not applicable. "Obs." = captured 2026-10-14.

### Takeaway
Of about 30 claim fragments, most basic store facts (installs for Candy Crush and Gossip Harbor, ratings for three, ad labels, "100% ad free", offline) are correct. The main failures are: Royal Match "380M DL" and "10.3M"; Toon Blast "130M", "★4.7" and "2.8M"; "one-tap" for swipe-match games; "idle" Royal Match events; "branching" Gossip Harbor story; "daily spins"; "hundreds of millions" (understated); and the uncited "mapped funnel".

### Cited Findings

| # | Report claim (verbatim) | Label | Conf. | Evidence |
|---|---|---|---|---|
| 1 | "Top Puzzle Hits (e.g. Candy Crush Saga, Royal Match, Gossip Harbor) combine simple one-tap mechanics with rich progression and strong retention loops (daily rewards, events). They often support offline play and frequent updates." | Partly supported | High | Daily rewards, events, weekly/biweekly updates and offline are on the listings (Candy, Royal). But Candy Crush and Royal Match are swipe-to-swap ("Swipe colors"), not one-tap; Gossip Harbor shows no Offline tag. [Candy](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US&gl=US), [Royal](https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch&hl=en_US&gl=US), [Gossip](https://play.google.com/store/apps/details?id=com.mergegames.gossipharbor&hl=en_US&gl=US) (Obs.) |
| 2 | "Candy Crush Saga (1B+ installs) and Royal Match (380M installs) each earn hundreds of millions annually." | Partly supported (understated; 380M unverified) | High on revenue; Low on 380M | AppMagic net IAP 2025: Candy $1.01B, Royal Match $1.37B, so "hundreds of millions" understates by about 3-4x; no source for 380M (Play 100M+ Android; Appfigures 300M in Sept 2024). [Mobilegamer 2026-01-13](https://mobilegamer.biz/the-top-grossing-mobile-games-of-2025/), [Mobilegamer 2024-09-09](https://mobilegamer.biz/dream-games-royal-match-has-passed-3bn-says-appfigures/) |
| 3 | "Ad-supported puzzle games can outperform others in ROI. For example, Candy Crush Saga... and Royal Match..." | Unverified (the example does not support the claim) | High | Royal Match is ad-free and outearns Candy Crush, so the example cuts the other way; "ROI" is not evidenced for any of the four. [Google Play](https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch&hl=en_US&gl=US) (Obs.), [Mobilegamer](https://mobilegamer.biz/the-top-grossing-mobile-games-of-2025/) |
| 4 | "Royal Match emphasizes IAP only (100% ad-free), whereas Candy Crush blends IAP with optional ads." | Verified | High (Royal), Medium (Candy "optional") | Royal: "100% ad free", no ads label. Candy: "Contains ads" plus opt-in Rewarded Portals; King "serves non-paying players ads in many of its games". [Microsoft Ads 2026-05-12](https://about.ads.microsoft.com/en/blog/post/may-2026/unlock-deeper-engagement-with-rewarded-portals), [Mobilegamer 2026-02-23](https://mobilegamer.biz/microsofts-1-7bn-mobile-game-empire-what-works-what-doesnt-and-whats-next/) |
| 5 | "Candy Crush highlights daily spins and events to 'keep the experience fresh'." | Partly supported | Medium | Play says "Daily rewards, limited-time events, and regular updates keep the experience fresh"; "spins" is not in the Play text. A Daily Booster Wheel exists per a Microsoft Store snippet. [Google Play](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US&gl=US) (Obs.), [MS Store](https://apps.microsoft.com/detail/9nblggh18846) |
| 6 | Candy Crush "1B+ DL, ★4.6 (38.9M rev)" | Verified (with label caveat) | High | Play: 1B+, 4.6, header 38.9M "reviews" (section 36.2M). "rev" means reviews, not revenue. [Google Play](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US&gl=US) (Obs.) |
| 7 | Candy Crush "Ads + IAP" | Verified | High | "Contains ads", "In-app purchases" (Obs.) — same Play link |
| 8 | "Thousands of match-3 levels; boosts, stars, unlock new areas; daily spins/events. Emphasizes 'snacking' (short sessions) and offline play." | Partly supported | Medium | "Thousands of levels", boosters, daily rewards, events, offline all in Play text; no "snacking" wording (Play says "quick relaxing breaks to longer play sessions"); "stars" and "unlock new areas" not in the text; "many levels support offline play". [Google Play](https://play.google.com/store/apps/details?id=com.king.candycrushsaga&hl=en_US&gl=US) (Obs.) |
| 9 | Royal Match "380M DL, ★4.6 (10.3M rev)" | Incorrect-outdated | High | Play: 100M+, 4.6, header 10.9M (section 10.4M). 380M is not a Play figure and has no located source. [Google Play](https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch&hl=en_US&gl=US) (Obs.) |
| 10 | Royal Match "IAP only (no ads)" | Verified | High | No "Contains ads" label; "100% ad free" (Obs.) — same Play link |
| 11 | "Decorate a royal castle; match-3 levels of increasing difficulty" | Verified | High | Play: "decorate King Robert's castle", "thousands of challenging match-3 levels" (Obs.) |
| 12 | "idle social events (team events, races)" | Partly supported ("idle" is wrong) | Medium | Team Battle, Sky Race, King's Cup, Lightning Rush exist, but they are played by completing normal levels, not idle. [Google Play](https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch&hl=en_US&gl=US), [Funovus](https://www.funovus.com/blogs/royal-match-dominates-match-3-what-can-all-designers-learn/) |
| 13 | "100% ad-free, offline-capable." | Verified | High | Play: "100% ad free and no wifi needed - internet free" (Obs.) |
| 14 | Gossip Harbor "50M+ DL, ★4.3 (0.65M rev)" | Verified (caveat) | High | Play: 50M+, 4.3, section 651K (header 715K) (Obs.). [Google Play](https://play.google.com/store/apps/details?id=com.mergegames.gossipharbor&hl=en_US&gl=US) |
| 15 | Gossip Harbor "Ads + IAP" | Verified | High | "Contains ads", "In-app purchases" (Obs.) |
| 16 | "Merge restaurant dishes, renovate a cafe, and unlock a mystery story." | Verified (minor: restaurant, not cafe) | High | Play text (Obs.) |
| 17 | "heavy narrative (branching gossip story)" | Partly supported (narrative yes, "branching" not) | Medium | Story-led listing; a 2026 review calls it linear. [Orcz 2026-05-27](https://orcz.com/gossip-harbor-review-a-cozy-cafe-mystery-with-a-cash-register-behind-the-counter/) |
| 18 | "Contains many ads and purchases." | Partly supported ("many" unverified) | Medium | Label is verified; "many" not: rewarded-only per one reviewer, pop-up complaints per another, rewarded estimated at 15-20% of revenue. [DoF](https://www.deconstructoroffun.com/blog/2024/8/19/finding-genre-success-the-case-of-gossip-harbor), [Google Play](https://play.google.com/store/apps/details?id=com.mergegames.gossipharbor&hl=en_US&gl=US) |
| 19 | Toon Blast "Match-3 (& cartoon theme)" | Partly supported | Medium | Play tags "Match 3", but the mechanic is tap-to-blast. [DoF](https://www.deconstructoroffun.com/blog/how-toon-blast-became-the-best-business-in-puzzle) |
| 20 | Toon Blast "130M DL, ★4.7 (2.8M rev) [AppBrain data]" | Incorrect-outdated | High | 130M is AppBrain's estimate (Play band 100M+); rating is 4.6/4.63; reviews are 4.67M header, 4.21M section, AppBrain "4.2 million ratings". [AppBrain](https://www.appbrain.com/app/toon-blast/net.peakgames.toonblast), [Google Play](https://play.google.com/store/apps/details?id=net.peakgames.toonblast&hl=en_US&gl=US) (Obs.) |
| 21 | Toon Blast "Ads + IAP" | Verified | High | "Contains ads", "In-app purchases" (Obs.) |
| 22 | Toon Blast "solve puzzles to earn stars and lives. Very polished progression (cartoon stages) and frequent updates." | Partly supported | Medium | Stars for rewards and lives from teammates are in the listing; updated Oct 9, 2026; "polished" is opinion. [Google Play](https://play.google.com/store/apps/details?id=net.peakgames.toonblast&hl=en_US&gl=US) (Obs.) |
| 23 | "Candy Crush and Royal Match have trivial match-3 mechanics that quickly introduce new elements (blockers, boosters) each level." | Partly supported | Low | Candy's first levels introduce one new element at a time (community wiki); "each level" is overstated. [Fan wiki](https://imamadmad.fandom.com/wiki/Candy_Town); Royal Match's listing names its obstacles. |
| 24 | "Royal Match rewards castle decoration, Gossip Harbor rebuilds a restaurant" | Verified | High | Play text (Obs.) |
| 25 | "Royal Match explicitly touts '100% ad free'... appealing to players willing to spend" | Verified (first part); Unverified (audience claim) | High / Low | Listing quote verified. Spend-concentration supports "willing to spend" only indirectly (US about 53%). [PocketGamer 2026-07-14](https://www.pocketgamer.biz/royal-kingdom-surpasses-750m-with-42-of-all-revenue-made-in-h1-2026/) |
| 26 | "Candy Crush sits in between: it has ads but emphasizes daily gifts and offline play." | Verified | Medium | Play text and label (Obs.) |
| 27 | "Candy Crush's description highlights 'daily rewards, limited-time events, and regular updates'" | Verified | High | Verbatim on Play (Obs.). Note this conflicts with claim 5's "daily spins" from the same report. |
| 28 | "give small coins on login (like Candy Crush)" | Partly supported | Low | The iOS listing says the daily login gives "free boosters and extra lives"; Candy's premium currency is Gold Bars, not coins. [App Store](https://apps.apple.com/us/app/candy-crush-saga/id553834731) |
| 29 | "Candy Crush Saga and others use emojis and bullet lists in store descriptions." / "Candy Crush uses emojis and bullet points — a template to emulate." | Verified for Candy Crush; Partly for "others" | High | Candy and Gossip Harbor use emojis; Royal Match and Toon Blast use plain bullets and no emoji. (Obs.) |
| 30 | "mapped the onboarding→monetization funnel for leading puzzle titles" and "on failure, the game offers either an ad-watched continue or an in-app purchase" | Unverified (and wrong for Royal Match) | Medium | No evidence in the report of an actual mapping. Royal Match has no ads; its fail screen sells coin-paid extra moves (900 coins). Candy's fail screen centres on Gold Bar "+5 moves" purchases. [Naavik 2022](https://naavik.co/deep-dives/royal-match/), [Naavik 2022](https://naavik.co/deep-dives/candy-crush-10-year-reign/) |
| 31 | "'Downloads' and 'Reviews' come from store listings" | Incorrect-outdated for 2 of 4 games | High | Royal Match 380M and Toon Blast 130M and 2.8M do not appear on the store listings today (Obs.) |

### Inferences
- [INFERENCE] The strongest correction for the report writer: remove or relabel "rev" as reviews, replace 380M and 130M with the Play bands (100M+) or label them as third-party estimates, fix Toon Blast to 4.6 and about 4.7M reviews, and replace "hundreds of millions" with "each above $1B net IAP in 2025 (AppMagic)".
- [INFERENCE] Gravity Flow's own plan (rewarded 2x/revive/free fragments, capped interstitial, Remove Ads) matches the report's recommendation but not Royal Match's model, and is closest to Candy Crush/Toon Blast/Gossip Harbor.

### Gaps
- I could not check the report's "[AppBrain data]" snapshot date.
- Claim 1's "frequent updates" applies to all four (weekly, biweekly, episodic), so it stands.

---

## Q10. What transfers to a press-and-hold gravity-attractor physics puzzle (and what does not)

### Takeaway
Transfers: store-creative discipline (one gesture, short captions, hand cursor), point-of-loss revive economics, honest UA creatives, a thin meta, steady content cadence, daily/endless loops. Does not transfer: lives/energy gating, "+5 moves" sinks, team/PvP event layers, 20,000-level libraries, and the ad-free, UA-funded Royal Match model.

### Cited Findings (facts used for the comparison)
- Gravity Flow today: 150 levels in 15 worlds, 8 daily levels, 20 run chunks, 14 achievements, 28 cosmetics, 3 bundles — [docs/STATUS.md](C:/Dev/Projects/Personal/Gravity%20Game/docs/STATUS.md) (local file, lines 17-18)
- Candy Crush: 13,000+ levels (Dec 2022) with 45+ new per week — [Naavik](https://naavik.co/deep-dives/candy-crush-10-year-reign/); Royal Match: new levels every two weeks — [Google Play](https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch&hl=en_US&gl=US) (Obs.); Toon Blast: 50-level episodes — [Google Play](https://play.google.com/store/apps/details?id=net.peakgames.toonblast&hl=en_US&gl=US) (Obs.)
- Match-3 new-launch odds are low: 1 in 120 new match-3 games reached $100K in a month in H1 2026 — [PocketGamer.biz, 2026-07-27](https://www.pocketgamer.biz/puzzle-accounts-for-44-of-casual-mobile-earnings-in-h1-2026/)

### Inferences (transfer table, all [INFERENCE])
| Area | Incumbent practice | Transfers? | Reasoning |
|---|---|---|---|
| Level-count expectations | 13,000-22,000 levels, weekly 45-level drops (Candy); biweekly (Royal Match) | No for the library; yes for cadence | A 150-level, 15-world campaign cannot match saga scale. Gravity Run and Daily are the content multipliers; a visible, regular release rhythm matters more than raw count. |
| Booster economy | Pre-level and in-level boosters plus "+5 moves" paid continue is about 95% of Candy revenue (est.) | Partly | Gravity Flow has no move counter. The closest analog is the rewarded revive at the point of loss, which matches the "loss aversion converts harder than progress" finding. The coin-for-continue price ladder (900 coins) is the part that drives complaints. |
| Lives / energy | 5 lives and 30-minute regen (match-3); energy gating (Gossip Harbor) | No | Gates sessions and is a top complaint; Gravity Flow already monetizes through revive and Remove Ads without gating play. |
| Team events | Teams of up to 50, lives gifting, tournaments (Royal Match, Toon Blast) | No at launch | Needs backend, matchmaking and a live population; a pre-launch indie has none. Async Daily and Run leaderboards are the lighter analog. |
| Meta decoration | Castle (Royal Match) with only two actions; story/renovation (Gossip Harbor) | Partly | Royal Match's meta is thin on purpose, supporting the existing Star Map plus cosmetics. A story layer would be costly and is not required. |
| Ads | Royal Match ad-free; others hybrid | Hybrid only | Ad-free depends on whale spend and huge UA. Rewarded-led ads (Gossip Harbor: est. 15-20% of revenue) fit a no-UA game; keep forced interstitials capped as planned. |
| Store creative | Royal Match/Toon Blast rescue scenes with hand cursor; Candy three-word captions; Gossip story-first | Yes | One gesture, short captions, a hand cursor and an honest trailer map directly to hold-and-drag. Avoid creative that does not reflect gameplay (Gossip Harbor review). |
| First session | Gossip Harbor: first offer at about 10 minutes, three offers in the first hour | Caution | The only documented schedule is from a monetization-heavy merge game (2024). A skill puzzle with a 13+ rating should let the first world play before any prompt. |
| Difficulty | Super-hard flagged levels, near-miss tuning, super features raising fails | Partly | Hard-level labeling and flagged difficulty are transferable; tuning to maximize near misses is the very pattern generating the "rigged" reviews. |

### Gaps
- No incumbent in this set is a physics puzzle, so transfer judgments are reasoned from structure, not from tested evidence. The no-UA constraint makes UA lessons mostly informational.
