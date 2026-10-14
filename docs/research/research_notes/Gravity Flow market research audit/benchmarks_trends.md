# Mobile puzzle/casual market benchmarks and trends (2024-2026), with an audit of the market-level claims in deep-research-report.md

As of 2026-10-14. Conventions used throughout:
- **[V]** = the publisher sells a product that benefits from the number being large/attractive (analytics, MMP, ad network, mediation, intel seller, publisher). Almost every public benchmark is [V]; none is a neutral census.
- "Secondary" = I could not open the primary document and am relying on a summary/aggregator. "Chart-only" = the number exists in the PDF but only inside a chart image I could not read.
- Verdict labels: Verified / Partly supported / Unverified / Incorrect-outdated / Not applicable. Confidence = confidence in the verdict itself.
- Claims quoted from the report are from `docs/research/deep-research-report.md` (read in full).
- Anything marked "(my calculation)" is arithmetic I did on cited inputs and is an inference, not a published figure.

---

## 1. Audit of the market-level claims in the report

### Takeaway
Of the 13 market-level claims checked, none is fully verified as written. The directional ones hold (puzzle is download-heavy and IAP-light; video dominates game UA; hybrid video+playable is growing). The numeric ones are weak. The "D1 >=30% / D7 >=10% (industry averages)" targets are really top-quartile to top-decile thresholds, not averages. "South America leads puzzle ad volume" has no source I could find. "Ad-supported puzzle games outperform in ROI" is unsupported and partly contradicted. The ">5% install rate" target is below every peer benchmark I found for page-view-to-install conversion on Google Play.

### Cited Findings

#### Verdict table

| # | Claim in report | Verdict | Conf. | Evidence (source, date) |
|---|---|---|---|---|
| C1 | "By late 2025, puzzle games accounted for a large share of downloads but not always proportionate revenue." | **Partly supported** (direction right; timeframe, taxonomy and "revenue" definition differ) | Medium-high | Sensor Tower [V], H1 2026 data: "lifestyle and puzzle supplied 74% of installs and 53% of playtime for only 34% of spend" ([PocketGamer.biz](https://www.pocketgamer.biz/mobile-gaming-iap-dipped-2-as-ad-spend-climbed-in-h1-2026/), H1 2026; mirrored by [Outlook Respawn](https://respawn.outlookindia.com/gaming/gaming-news/mobile-gaming-iap-revenue-drops-2-as-ad-spend-surges-in-2026)). Caveats: it is H1 2026, not "late 2025"; the group is Lifestyle+Puzzle combined; "spend" is store-billed IAP only, so ad revenue is excluded. Adjust [V] full-year 2025: puzzle = 10% of gaming installs but 12.9% of sessions ([Adjust Gaming App Insights Report 2026](https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf), data Jan 2024-Jan 2026). |
| C1b | (Exec summary) "Puzzle games **lead downloads** alongside hyper-casual." | **Partly supported (overstated)** | Medium | Adjust 2025: hyper-casual 29.1% of installs, puzzle 10%, casual and hybrid-casual "just over 10%" each ([Adjust 2026 report](https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf)). Puzzle is a top-tier genre by installs, not co-leader with hyper-casual, under Adjust's taxonomy. Under Sensor Tower's merged "Lifestyle & Puzzle" bucket it is 74% ([PocketGamer.biz](https://www.pocketgamer.biz/mobile-gaming-iap-dipped-2-as-ad-spend-climbed-in-h1-2026/)). |
| C2 | "Ad-supported puzzle games can outperform others in ROI." | **Unverified (leans contradicted)** | Medium | I found no public ROI/ROAS-by-monetization-model benchmark for puzzle. Contrary indicators: Liftoff [V] average D30 ROAS for casual is 47% iOS and 15% Android, i.e. Android casual UA does not pay back by D30 on average ([Liftoff 2025 Casual Gaming Apps Report](https://liftoff.ai/?p=34267), Feb 2024-Feb 2025). Sensor Tower [V]: IAP-first titles "frequently earn significantly more" than ads-first ([Sensor Tower blog](https://sensortower.com/blog/gaming-deep-dive-ad-monetization-report), June 2026). Appodeal [V]: hypercasual ad ARPU is $0.79 vs $2.99 for Match and $14.83 for Merge 3 (units/time window unstated) ([Appodeal Mobile Casual Benchmarks 2025](https://files.gameindustrylibrary.com/documents/mobile-casual-benchmarks-report-2025.pdf), Android/USA, Jun 2024-Jan 2025). Supporting only the "ads are where puzzle money is" half: puzzle = 53% of game ad revenue Feb-Apr 2026 (modeled) ([Sensor Tower via Game World Observer](https://gameworldobserver.com/?p=29151)). That is share of ad revenue, not ROI. |
| C3 | "Hybrid playable ads (video + interactive) are rising in puzzle UA." | **Verified** (for games overall; no puzzle-only split) | Medium | Insightrackr x XMP/Mintegral [V], Q1-Q3 2025, ~6M creatives: "hybrid formats - where video transitions directly into a playable moment - have accelerated rapidly" ([report summary](https://xmp.mobvista.com/en-blog/docs/report-2025-global-mobile-gaming-ua-trends-strategy)); a search-result summary of coverage of the same report says Video+Playable outnumbers Video+Image about 11 to 1, but I could not confirm that figure on the pages I opened ([Insightrackr page](https://blog.insightrackr.com/en/docs/Global-Mobile-Gaming-UA-Trends-Strategy-Report)). Apptica [V], Aug 2025: 92.5% of new playables embed video and 82.5% open with lead-in video ([AppAgent summary](https://appagent.com/?p=51896)). Caveat: playables are still only ~5% of creatives. |
| C4 | "Video ads dominate puzzle game UA." (Exec: "video ads and hybrid playable ads dominate") | **Partly supported** (true for mobile games overall; puzzle-only share not found) | Medium-high | Video ~80.9%, image ~13.7%, playable ~5% of ~6M game creatives, Q1-Q3 2025, 200+ ad media, 140+ markets ([Insightrackr x XMP](https://xmp.mobvista.com/en-blog/docs/report-2025-global-mobile-gaming-ua-trends-strategy)). Puzzle had 12,000+ titles running ads Q1-Q3 2025, peak 8,300 active in July 2025 (same source), so puzzle is the largest ad category and the all-games mix is a reasonable proxy. Note "dominate" applies to video as a format; "hybrid playable dominates" is not supported (5%). |
| C5 | "South America leads puzzle ad volume" -> localize Spanish/Portuguese. | **Unverified** | Medium-high (that no source exists in public data I could reach) | No source found. Adjacent data does not show it: Adjust LATAM installs fell 9% in 2025; LATAM CPI $0.14, CPM $1.41 ([Adjust 2026](https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf)); Apptica puts North America at 61% of global playable ad spend vs Europe 18%, Asia 16% (no LatAm line) ([AppAgent](https://appagent.com/?p=51896), Aug 2025); the Insightrackr/XMP report excerpt gives no regional puzzle split ([source](https://blog.insightrackr.com/en/docs/Global-Mobile-Gaming-UA-Trends-Strategy-Report)). See section 6 for what is and is not known about LatAm. |
| C6 | "Industry data typically shows average D1 ~25-35%, D7 ~5-15% for puzzle/strategy" (report admits no citation) | **Partly supported / outdated** | High | Range is roughly the top quartile of all games, not the average. GameAnalytics [V] 2026 (16,262 mobile games): median D1 ~22-23%, median D7 ~4%, top-25% D1 just above 30%, D7 6-7% ([GA retention PDF mirror, Jan 20 2026](https://investgame.net/news/pdf/2026-01-20-mobile_retention_benchmarks_2026/); [GA benchmarks PDF mirror, Jan 27 2026](https://investgame.net/news/pdf/2026-01-27-2026-mobile-pc-benchmarks_compressed/); [GA via GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game)). Adjust: all-games D1 27% in 2025 ([Adjust 2026](https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf)). The only puzzle-specific numbers that fit the range (D1 31.85%, D7 12.18%) are Q3 2022, paid-acquisition-heavy ([Mistplay page](https://business.mistplay.com/resources/mobile-game-retention-benchmarks); caveat in [Game Growth Advisor](https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-kpis-benchmarks-2026/)). |
| C7 | Recommendations: "D1 retention >=30%; D7 retention >=10% (industry averages)" | **Incorrect-outdated** (as "averages") | High | D1 30% = GA 2026 75th-percentile threshold; D7 10% sits between GA's top-25% (6-7%) and top-10% (11-12%). Adjust all-games D1 is 27%. Fine as aspirational targets, wrong as "industry averages". Sources as C6. |
| C8 | "ensure ad load success > 90%" | **Partly supported** (an internal SLO, not a market benchmark) | Low-medium | AdMob case studies [V, Google marketing]: Kongregate 90% fill and 95% completion on rewarded ([AdMob case](https://admob.google.co.in/home/resources/kongregate-uses-admob-to-boost-revenue-average-30-dollar-cpm/)); Refuel Games 95% fill ([AdMob case](https://admob.google.co.in/home/resources/refuel-games-grows-ad-revenue-with-admob-rewarded-ads/)). AdMob distinguishes match rate (matched/requests) from show rate (impressions/matched) ([AdMob help](https://support.google.com/admob/answer/13547458)); the report does not say which it means. Case-study fill is for major markets; fill in low-eCPM regions is not published in what I found. |
| C9 | "Capture >=95% of play sessions" (analytics) | **Not applicable** | Medium | Internal telemetry target; no industry benchmark exists in anything I found. |
| C10 | "aim >5% install rate from views" | **Partly supported (ambiguous; far below peer medians if "views" = store-page visitors)** | Medium | AppTweak [V] distinguishes *conversion rate* (page viewers who install) from *install rate* (installs from search/browse impressions without a page visit) ([AppTweak, 2025 data](https://www.apptweak.com/aso-blog/mobile-app-store-conversion-rate-benchmarks-per-category)). Page-view CVR on Google Play: all-categories US average 16.15% (AppTweak 2025, same link); lowest category Games-Strategy 6.6% (same); puzzle 16.7% and Google Play average 17.9% per Business of Apps data republished by Mistplay [V] ([Mistplay, Apr 10 2026](https://business.mistplay.com/resources/app-conversion-rates/)). So >5% is below even the weakest game category on a page-view basis. Play Console shows your CVR vs a peer median with 25th/75th percentile bands, but defaults to all traffic sources and all countries, which can mislead ([Gummicube](https://gummicube.com/blog/google-play-conversion-benchmarks-pitfalls-to-avoid), undated). |
| C11 | "Tutorial completion rate > 90%; level 3 play-through > 80%" | **Unverified** | Medium | No public benchmark. GameAnalytics only gives illustrative funnels (e.g. an example with 30% tutorial completion) in its docs/blog, not norms ([GA funnels post](https://www.gameanalytics.com/blog/exploring-gaming-funnels)). |
| C12 | "many games cap free currency to encourage ads" | **Partly supported** (the pattern is common and the "out of resources" trigger is the best-engaging rewarded placement; "many" is not quantified) | Medium | Unity [V] 2024 report (2023 data): rewarded engagement is 38.1% of DAU when triggered by running out of resources vs 23.8% for between-level placement ([PocketGamer.biz on Unity report, Sept 17 2024](http://www.pocketgamer.biz/unity-global-rewarded-ad-engagement-rose-by-32-in-2023/)). Appodeal [V]: Match, Puzzle, Strategy lead rewarded views per user (42.4 / 24 / 24.6; unit/window unstated) ([Appodeal 2025](https://files.gameindustrylibrary.com/documents/mobile-casual-benchmarks-report-2025.pdf)). |

#### Other checks on the same sections
- Report text: "(We didn't find a precise citation...)" for retention and "Benchmarks vary" for rewarded economy; the report's closing line "industry UA and monetization reports" cites no report by name or URL. The report's table of competitor installs/revenue (Candy Crush, Royal Match, etc.) was not audited here (store listings, outside this task).
- Report says to "consider Apple's 'Data Safety' requirements". "Data safety" is Google Play's disclosure form; Apple's equivalent is App Privacy ("nutrition") labels. This is from my background knowledge and was not verified by a fetch in this session, so treat as a probable terminology error to check.

### Inferences
- The report's retention numbers are best read as "good-to-very-good", and it labels them "averages". Anyone using them as pass/fail gates will mis-diagnose a normal game (median D1 ~22-23%, D7 ~4%) as a failure.
- The report's own ROI claim and Recommendations table appear to rely on a model of "ads are cheap volume". The public data says the opposite risk applies to Android: CPI is rising (+30% in 2025) and Android casual D30 ROAS averages 15%, so the economics of paid UA for an ad-led puzzle are not shown to work. For an organic-only launch this is moot, but the claim should not be repeated.
- C5 would be more defensible if rewritten as "Brazil/Mexico are large Android markets; localize if cheap". The "ad volume" framing has no data behind it.

### Gaps
- No puzzle-only (as opposed to all-games) creative-format split found.
- No public source for Play Console's own game-category peer medians; only vendor/ASO-panel numbers.
- Could not read Adjust's puzzle-genre D1 and session-length bars (chart-only in the 2026 PDF).
- Report's Loop Sort / Pixel Flow UA narrative not audited.

---

## 2. Retention sources: puzzle D1/D7/D30, 2024-2026

### Takeaway
There is no clean, current, public puzzle-only D1/D7/D30 benchmark by platform. The most credible current numbers are all-genre: GameAnalytics 2026 gives median D1 ~22-23%, D7 ~4%, D30 ~0.7%, with a top-quartile of ~30% / 6-7% / 1.6-1.8%. Puzzle-specific numbers that circulate (D1 31.85%, D7 12.18%, D30 5.35%) are from Q3 2022 paid-acquisition data. Puzzle is consistently described as one of the best-retaining genres, especially at D7 and D30.

### Cited Findings

#### Source table (exact numbers, population, platform, date)

| Source (vendor interest) | Population / definition | D1 | D7 | D30 (or D28) | Platform | Date |
|---|---|---|---|---|---|---|
| **GameAnalytics 2026** [V: analytics SaaS used heavily by indies] | 16,262 mobile games with >=1,000 MAU; no genre or OS split published. Percentile figures. | P50 ~22% (Jan 20 doc) / ~23% (Jan 27 doc); top 25% just above 30%; top 10% 40%; top 1% 64-68% | P50 just under 4%; top 25% 6-7%; top 10% 11-12%; top 1% 25%+ | P50 0.69-0.79%; top 25% 1.6-1.8%; top 10% ~4%; top 1% 13-15% | iOS+Android combined | Published Jan 2026 (PDFs); [GameDev Reports summary](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game) dated Jun 4 2026. PDFs: [retention](https://investgame.net/news/pdf/2026-01-20-mobile_retention_benchmarks_2026/), [benchmarks](https://investgame.net/news/pdf/2026-01-27-2026-mobile-pc-benchmarks_compressed/) |
| **GameAnalytics 2025** [V] | 11,600 apps, 9 regions, 16 genres, MAU >1.48B. "Top 25%" given as average of top quartile. | Top 25%: 26.48-27.69% (28-29% in 2023); bottom 25%: 10-11.5%; iOS top 25%: 31-33%; Android top 25%: 25-27% | Median 3.42-3.94%; top 25% 7-8%; bottom 25% ~1.5% | "75% of projects below 3%" at D28; classic genres (board/card/casino/word) up to 10% for best titles | Split iOS/Android for D1 only | Published Feb 17 2025 ([GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)). Puzzle is called out qualitatively as among the best medium/long-term retention genres; no puzzle percentages in the summary. |
| **Adjust** Gaming App Insights Report 2026 [V: MMP] | Mix of Adjust's top 5,000 apps and all Adjust-tracked apps; data Jan 2024-Jan 2026. | All gaming apps 27% (2025, stable). Hybrid casual and hyper casual 27% (highest). Family 23%, action 19%, arcade 20%. Regional table in the same PDF: APAC 20%, Europe 21%, LATAM 20%, North America 19%. | not reported | not reported | Both (not split) | ~Mar 2026 ([PDF](https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf)). Puzzle D1 bar is chart-only. |
| **Adjust** Mobile Games Insights 2025 [V] | Adjust-tracked apps | All gaming 28% -> 27% in 2024; puzzle-specific D1 "not specifically reported" in the summary I could open | n/a | n/a | Both | Apr 15 2025 ([summary](https://gamedevreports.substack.com/p/adjust-mobile-games-insights-report)). A search-snippet claim that puzzle D1 was 23% with 28.6-min sessions could not be confirmed in the opened summary; do not use. |
| **AppsFlyer x Mistplay** Loyalty Index [V: MMP + rewards/UA platform] | Mistplay survey of 4,500 US adults; AppsFlyer data 2023-2024; metrics indexed within category. | not reported | not reported | **Puzzle D30: Android 5.09%, iOS 8.13%**. Loyalty index puzzle 85 overall (Android 88.04, iOS 81.1), #1 genre. | Android and iOS | May 27 2025 ([summary](https://gamedevreports.substack.com/p/mistplay-and-appsflyer-player-loyalty)) |
| **Mistplay "Mobile Game Retention Benchmarks"** (page states Q3 2022; "11 billion installs across 11,000 apps"; Game Growth Advisor attributes the dataset to AppsFlyer and calls it a paid-acquisition-heavy population) [V] | Puzzle row; Match 32.65 / 13.98 / 7.15; Strategy 25.39 / 8.06 / 3.12; Hyper Casual 29.31 / 5.90 / 1.38 | **Puzzle 31.85%** | **Puzzle 12.18%** | **Puzzle 5.35%** | All-genre iOS D1 35.73% vs Android 27.51% (same page) | Q3 2022 ([Mistplay](https://business.mistplay.com/resources/mobile-game-retention-benchmarks); attribution note in [Game Growth Advisor, Mar 17 2026](https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-kpis-benchmarks-2026/)). Widely republished undated (e.g. [Segwise 2026 post](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies.md)). |
| **Appodeal** Mobile Casual Benchmarks 2025 [V: mediation/publisher] | 10,000+ games; Android only; USA; Jun 2024-Jan 2025. | Sports/Racing/Tabletop best at 36-33%; Coin Pusher, Management Sim, Auto Chess >50%. Puzzle chart-only. | Sports/Racing/Tabletop 16-14% | Sports/Racing/Tabletop 11-8%; hypercasual 3% | Android, US | [PDF](https://files.gameindustrylibrary.com/documents/mobile-casual-benchmarks-report-2025.pdf) (puzzle retention values are chart images I could not read) |
| **Liftoff x Singular** Casual Gaming Apps Report 2025 [V: UA ad network] | Feb 2024-Feb 2025; UA-focused. | not published in what I could open | not published | not published | iOS/Android | May 8 2025 ([GameDev Reports](https://gamedevreports.substack.com/p/liftoff-and-singular-casual-games)); [Liftoff page](https://liftoff.ai/?p=34267). ROAS and CPI only. |
| **Sensor Tower** State of Gaming 2026 / Unity Gaming Report | Market sizing, ad spend, genre share; Unity's report is a developer survey. | none found | none found | none found | n/a | See sections 7 and 4. |

#### How definitions differ (matters when comparing)
- GA 2025 reports "top 25%" as an *average within the top quartile*; GA 2026 reports percentile thresholds (P50, top 25%, top 10%, top 1%). The two are not directly comparable, and the 2026 top-25% D1 (>30%) is higher than the 2025 top-25% average (26.5-27.7%) even though GA's coverage says retention declined in 2025. I could not resolve this (different sample filter, >=1,000 MAU in 2026, is the likeliest reason - my inference).
- Adjust and AppsFlyer data come from MMP SDKs, which skew toward games with attribution (i.e. games doing paid UA), unlike GA's SDK which skews toward indies. GA itself notes its users are "widely used by indies and early-stage teams, while many top-performing studios store data in-house" ([GA retention PDF](https://investgame.net/news/pdf/2026-01-20-mobile_retention_benchmarks_2026/)).
- Paid vs organic: Game Growth Advisor flags that the Q3 2022 puzzle figures read higher than whole-market because they come from a paid-acquisition-heavy population ([source](https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-kpis-benchmarks-2026/)).
- Platform: iOS retains better on D1 in every dataset that splits it (GA 2025 top-25%: iOS 31-33% vs Android 25-27%; Mistplay Q3 2022 all-genre: 35.73% vs 27.51%; puzzle D30 per AppsFlyer x Mistplay 8.13% iOS vs 5.09% Android).
- Adjust's regional D1 (19-21%) conflicts with its own global 27% in the same document; I report both as printed and cannot explain the gap (likely different underlying datasets: top-5,000 vs all apps).
- GA's "D30" in the 2026 report vs "D28" in 2025 is a one-or-two-day shift, not material.
- A GameDev Reports summary page automatically summarized once as "median D1 ~16-17%"; a verbatim re-query said the median D1 is not stated there. I discarded the 16-17% figure.
- GA 2026 also states the classic "40/20/10" D1/D7/D30 yardstick should be updated to **35/15/5** ([GA retention PDF](https://investgame.net/news/pdf/2026-01-20-mobile_retention_benchmarks_2026/)), which is an aspirational "good game" bar, not a median.

### Inferences
- A defensible planning range for a polished Android puzzle, organic-heavy, is median-ish D1 22-28%, D7 4-8%, D30 1-3%, with puzzle likely above the all-genre median at D7/D30 (qualitative GA 2025 statement; AppsFlyer x Mistplay D30 5.09% Android; 2022 puzzle D7 12%). This is my synthesis, not a published figure.
- Because AppsFlyer-style puzzle numbers are paid-heavy and 2022, they overstate a 2026 organic indie launch.

### Gaps
- No public 2024-2026 puzzle-only D1/D7/D30 by Android with a stated sample and percentile split. Closest are chart-only (Adjust, Appodeal) or old (Q3 2022).
- AppsFlyer's own "State of Gaming App Marketing 2025/2026" retention tables were not retrieved.
- Unity's Gaming Report (2026) is a developer survey; no retention benchmarks surfaced in credible coverage. Liftoff's 2025 casual report publishes UA metrics, not retention.

---

## 3. Monetization benchmarks: rewarded/interstitial eCPM, opt-in, ARPDAU

### Takeaway
Tier-1 Android rewarded eCPM is roughly $16-30 depending on the panel and quarter; rest-of-world Android is roughly $1-5; the sources disagree by about 2x even for the US. Rewarded opt-in is best expressed as the share of DAU who watch at least one: Unity reports 36% for casual (2023 data), 23.8% for between-level placements and 38.1% for out-of-resources placements. No credible primary source publishes puzzle-specific ARPDAU; the common $0.01-0.05 (ads-only casual) figure is an unsourced rule of thumb, and my own impression-times-eCPM arithmetic lands in the same band.

### Cited Findings

#### eCPM (all figures are per-1,000 impressions in USD)

| Source [all V] | Period | Scope | Rewarded | Interstitial |
|---|---|---|---|---|
| Tenjin x Clever Ads Solutions | Q2 2024 | Games excl. kids; lists of highest-eCPM countries | **Android:** US $30.25, Canada $23.13, South Korea $22.01. iOS: US $24.39, S. Korea $20.94, Australia $19.91 | **Android:** US $16.15, Canada $12.65, Japan $11.35. iOS: US $23.17 |
| Tenjin x CAS | Q1 2024 (search-result summary) | Games | Android US $27.88 | Android US $19.62 |
| Appodeal | Q4 2024 (Oct-Dec; seasonally the strongest quarter; 100k+ apps, 70+ networks, 200B+ views) | All apps/ games across ad networks | **US:** Android $16.49, iOS $19.63. Android Australia $18.87, Japan $17.35 | **US:** Android $14.08, iOS $14.32 |
| Appodeal (as re-tabulated by Playio) | Q4 2024 | Regional Android averages | NA ~$9.0, Europe ~$5.1, APAC ~$8.2, Middle East ~$2.4, **LatAm ~$1.8** | NA ~$9.6, Europe ~$3.6, APAC ~$5.5, Middle East ~$1.6, **LatAm ~$1.3** |
| TopOn H1 2025 (as repeated by Game Growth Advisor) | H1 2025 | Casual, Android | EU/North America $8.90; **LatAm $2.18**; South Asia/India **$0.10** | n/a |

Sources: Tenjin [Q2 2024](https://gamedevreports.substack.com/p/tenjin-ad-monetization-in-mobile-00b?open=false) and [Q1 2024](https://gamedevreports.substack.com/p/tenjin-ad-monetization-in-mobile); Appodeal [Q4 2024 report page](https://appodeal.com/the-mobile-ecpm-report-updated-q4-2024-view) (numeric values from search-result summaries of Appodeal/GamesBeat coverage because the PDF charts are not machine-readable; the PDF text itself confirms iOS > Android in every format, Q4 seasonal peak in December, and that LATAM/MEA have lower eCPMs but Android performs relatively better there); regional table from [Playio](https://blog.playio.co/mobile-game-ecpm-benchmarks-2026) (vendor blog, secondary); TopOn via [Game Growth Advisor](https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-kpis-benchmarks-2026/) (secondary).

- **Sources conflict.** US Android rewarded is $30.25 (Tenjin x CAS, Q2 2024) vs $16.49 (Appodeal, Q4 2024); Playio's re-tabulation of Appodeal even shows ~$13.2 for the US, which does not match Appodeal's own $16.49. Panels differ (games-only vs all apps; "highest-eCPM country" lists vs averages) and I cannot reconcile them ([Playio](https://blog.playio.co/mobile-game-ecpm-benchmarks-2026) vs [Appodeal](https://appodeal.com/the-mobile-ecpm-report-updated-q4-2024-view)).
- Format mix of casual ad revenue: rewarded 39%, interstitial 44% in casual games, per TopOn H1 2025 as repeated in a secondary post ([Prado](https://prado.co/post/rewarded-video-holds-the-crown-but-interstitial-ads-are-catching-up), snippet only). Sensor Tower notes that rewarded video remains the dominant ad format with interstitials a close second ([State of Gaming 2026 mirror](https://investgame.net/news/pdf/2026-02-26-sensor_tower__state_of_gaming_2026__en_wp/), Feb 26 2026).
- Android carried 63% of tracked game ad revenue in Q2 2024 (59% in Q1 2024) ([Tenjin](https://gamedevreports.substack.com/p/tenjin-ad-monetization-in-mobile-00b?open=false)). On Android, ad-network shares: AdMob 26%, AppLovin 17%, Mintegral 16%, Unity Ads 13%, Liftoff 5% (same source, Q2 2024). Sensor Tower 2025: AppLovin 36% and AdMob 29% of global game ad revenue ([GameDev Reports summary](https://gamedevreports.substack.com/p/sensor-tower-mobile-game-ad-monetization)).
- Commonly repeated "US casual rewarded $10-30 (some say $10-40), interstitial $5-15, banner $0.50-3" appears in vendor blogs without a primary source; I did not rely on it ([example search summary of Playio/AppSamurai pages](https://blog.playio.co/rewarded-ad-benchmarks-2026)).
- I found **no public 2025-2026 quarterly eCPM tables** that I could read. The newest verifiable are Q4 2024 (Appodeal) and Q2 2024 (Tenjin). A Tenjin 2026 benchmark exists per search listings, but its site refused connection during this session, so I did not use it.

#### Rewarded opt-in / engagement
- Unity [V] Mobile Growth and Monetisation Report 2024 (2023 data), share of DAU watching rewarded: Word 38.4%, RPG 37.6%, **Casual 36%**, Sports/Trivia 27.3%; by placement: context-sensitive (out of resources) **38.1%**, between levels **23.8%**; titles with more than 15 rewarded placements reach up to 46%; global rewarded engagement +3.2% in 2023 ([PocketGamer.biz, Sept 17 2024](http://www.pocketgamer.biz/unity-global-rewarded-ad-engagement-rose-by-32-in-2023/); report coverage [GameDev Reports, Sept 24 2024](https://gamedevreports.substack.com/p/unity-mobile-user-acquisition-and?open=false)).
- Completion once a rewarded ad starts is reported at 90-95% in AdMob case studies ([Kongregate](https://admob.google.co.in/home/resources/kongregate-uses-admob-to-boost-revenue-average-30-dollar-cpm/), [Refuel](https://admob.google.co.in/home/resources/refuel-games-grows-ad-revenue-with-admob-rewarded-ads/)). That is completion, not opt-in. [V, Google marketing]
- Unity: only 1.83% of users make an IAP on average (2024 report) ([GameDev Reports](https://gamedevreports.substack.com/p/unity-mobile-user-acquisition-and?open=false)).
- Unity puzzle IPM benchmark is 10.3 vs arcade 24 (UA-side metric; same source).
- Population caveat: Unity's engagement data covers games that integrate Unity LevelPlay/ironSource/Tapjoy rewarded, a self-selected, ad-optimized set, so it likely overstates a first-time indie's opt-in.

#### ARPDAU
- Game Growth Advisor (Mar 17 2026): "No primary source publishes puzzle-specific ARPDAU." It lists casual ads-only $0.01-0.05 and hybrid casual $0.15-0.50, without citing a source for those ranges ([post](https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-kpis-benchmarks-2026/)). Other vendor blogs give $0.05-0.30 for ad-only casual and $0.10-0.30 blended ([Playio ARPDAU post](https://blog.playio.co/arpdau-benchmarks-mobile-games), [Juego Studio](https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre)), also unsourced. Treat all as low confidence.
- Appodeal 2025 (Android, USA, Jun 2024-Jan 2025): puzzle shows interstitials 69.8, rewarded 24, banner 241.5 per user; ad ARPU Match $2.99, hypercasual $0.79, Merge 3 $14.83 ([PDF](https://files.gameindustrylibrary.com/documents/mobile-casual-benchmarks-report-2025.pdf)). The units (cumulative per user vs per day) are not stated.

### Inferences
- Modeled ad ARPDAU (my calculation, assumptions stated): impressions per DAU x eCPM / 1,000, using Appodeal Q4 2024 as the eCPM source (a seasonal high, so an upper bound for Q4 and likely high for other quarters).
  - 2 rewarded + 2 interstitial per DAU at US Android ($16.49 / $14.08): about $0.061.
  - Same frequency at Europe-like Android ($5.1 / $3.6): about $0.017.
  - Same frequency at LatAm-like Android ($1.8 / $1.3): about $0.006.
  - Blend 25% US-like and 75% LatAm-like: about $0.020.
  This brackets the unsourced $0.01-0.05 "ads-only casual" figure, so that figure is plausible but the geography mix, not the ad count, dominates the result.
- Appodeal's "69.8 interstitials per user" cannot be a daily frequency: at $14 eCPM that would be ~$0.98 per user per day, which is not credible. Read it as cumulative per user over the study window.
- For a Gravity Flow-style capped interstitial plus rewarded setup, geography matters more than frequency. An organic Android audience is likely mixed; I have no data on Gravity Flow's mix.

### Gaps
- No primary source for puzzle-specific ARPDAU, nor for Android-only ARPDAU in 2025-2026.
- No 2025-2026 readable eCPM table by region with Android split; the newest are Q4 2024 / Q2 2024.
- No AppLovin or ironSource/Unity LevelPlay eCPM report was retrieved (Unity's data is engagement, not eCPM).
- Interstitial frequency vs retention: a figure circulating in aggregator posts (more than three interstitials per session means 20-30% lower D7) has no primary source I could verify; do not cite.

---

## 4. Hybrid-casual in 2025-2026: what it means for a small game choosing ad intensity vs IAP

### Takeaway
Hybrid-casual is the one casual segment with growing IAP revenue and is where publishers (Voodoo, Homa, Supersonic, SayGames) have moved, but the winning versions are ad-plus-IAP games built on 9-18 month development cycles with meta-progression, not "ads with a remove-ads button". Revenue mix statements range from ~70/30 ads/IAP (Homa, 2023) to 20-50% IAP (Unity/ironSource, 2024). One-time remove-ads IAPs are being replaced by subscriptions by at least one studio, and Sensor Tower says IAP-first titles earn more than ads-first.

### Cited Findings
- **Sensor Tower [V], H1 2026:** "hybridcasual emerged as the market's clear growth engine" while mid-core loses share ([PocketGamer.biz](https://www.pocketgamer.biz/mobile-gaming-iap-dipped-2-as-ad-spend-climbed-in-h1-2026/)). Sensor Tower (June 2026): IAP-first titles "frequently earn significantly more" than ads-first, and puzzle accounts for more than half of ad earnings at most large networks ([Sensor Tower](https://sensortower.com/blog/gaming-deep-dive-ad-monetization-report)).
- **AppMagic [V]:** top-10 hybrid-casual IAP revenue grew +67% YoY in Q1 2025 and +100% YoY in Q2 2025 ($126M for the top 10 in Q2 2025) ([GameDev Reports summary of AppMagic, search snippet](https://gamedevreports.substack.com/p/appmagic-top-10-hybrid-casual-games)). A secondary 2026 trends post says hybrid-casual was the only casual segment with rising IAP in 2025 (+20% to $4.2B); I could not trace the original ([Cinevva](https://app.cinevva.com/guides/casual-games-trends-2026)).
- **Voodoo:** FY2024 revenue EUR 623M (+20%); hybrid casual = 78% of revenue vs hyper casual 22% (down from 100% in 2021); the press release does not give an ads vs IAP split ([Voodoo press release](https://voodoo.io/news/voodoo-reports-20-growth-and-strong-profitability-in-2024)). Sacra (secondary) estimates IAP at about 14-15% of 2024 revenue, still secondary to ads ([Sacra](https://sacra.com/c/voodoo/)).
- **Homa** (cofounder Olivier Le Bas, Aug 8 2023): Attack Hole revenue about **70/30 ads/IAP**; Homa targets "15% and above for day seven" in hybrid; "expectations are higher in terms of production quality... to counterbalance the cost of acquisition increase" ([Mobilegamer.biz](https://mobilegamer.biz/hypercasual-isnt-dead-for-attack-hole-maker-homa-but-its-evolving/)). Note this is 2023, not 2025-2026.
- **Supersonic/Unity** (the Unity-owned publisher): shifted to LTV, retention and IAA+IAP hybrid as CPIs rose ([AppsFlyer case page, via search summary](https://www.appsflyer.com/ru/customers/supersonic-unity/)). Unity/ironSource content (Jan 31 2024): hybrid-casual gets "20-50% of their revenue from IAP", 45% more rewarded impressions than hyper-casual, 9-12 months to build ([Unity blog](https://unity.com/blog/the-shift-from-hyper-to-hybrid-games-and-why-it-matters-for-everyone)). Unity (Dec 12 2024): 12-18 months, "strong development team" needed, avoid IAP and IAA "cannibalizing each other", and Day 7 retention is the key early signal ([Unity blog](https://unity.com/blog/mobile-gaming-shift-hyper-hybrid-casual)).
- **SayGames:** I found only a UA case study (US D7 ROAS up 26% with Unity Vector, running ad-revenue and hybrid IAA+IAP ROAS campaigns) ([Unity case study](https://unity.com/resources/saygames)). A search summary also surfaced an IAP revenue series for SayGames of unclear provenance, which I did not use. No executive statement on SayGames' ad/IAP mix found.
- **AppLovin:** no 2025-2026 statement on hybrid-casual mix found. Closest is Sensor Tower's AppLovin 36% share of game ad revenue ([GameDev Reports](https://gamedevreports.substack.com/p/sensor-tower-mobile-game-ad-monetization)).
- **Adjust [V]**, 2026: hyper-casual and hybrid-casual are "increasingly incorporating light progression systems and in-app purchase mechanisms"; action and puzzle generate larger session share than install share, structured around repeat play "which supports hybrid monetization models" ([Adjust 2026](https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf)). Appodeal [V]: hypercasual ad ARPU $0.79 and "studios should prioritize hybrid casual over traditional hypercasual" ([Appodeal 2025](https://files.gameindustrylibrary.com/documents/mobile-casual-benchmarks-report-2025.pdf)).
- **PGC London 2026 panel (Jan 28 2026):** Paul West (Fumb Games) moved from one-time ad-removal purchases to a subscription "to maintain ongoing player spending", and noted ad partners serving deceptive high-CTR ads; Jaivir Nagi (Crackle) argued pre-level ads reduce churn better than post-level and that "users are getting smarter"; Nick Murray called battle passes ubiquitous with limited 2026 growth ([PocketGamer.biz](http://www.pocketgamer.biz/monetisation-trends-to-watch-in-2026-player-expectations-have-changed/)).
- **Deconstructor of Fun** (Mar 10 2026 episode summary): "Monetization in hybridcasual is a balancing act: ads for early players, IAP for the committed ones" ([Podwise summary](https://podwise.ai/episodes/7451118); secondary).
- **Revenue structure by market (Sensor Tower, 19 countries, ~5M MAU panel, ad revenue modeled from CPM benchmarks):** India, Indonesia and Brazil get 55-70% of game revenue from ads; US, Canada, South Korea, Japan get 77-90% from IAP ([GameDev Reports summary](https://gamedevreports.substack.com/p/sensor-tower-mobile-game-ad-monetization), published Jun-Jul 2026).

### Inferences
- A small ad-led game with a remove-ads IAP and cosmetics is, structurally, closer to "hypercasual with an IAP exit" than to the meta-heavy hybrid-casual publishers describe. The evidence that Gravity Flow should copy hybrid-casual ad intensity is weak; the evidence that hybrid-casual publishers invest 9-18 months in progression and IAP design is strong. This is an inference from the sources above.
- Placement evidence favours tying rewarded offers to a moment of need (out-of-resources/retry 38.1% vs between-level 23.8% of DAU) over forced frequency. Google Play policy also bars unexpected full-screen interstitials and ads during gameplay (see section 6).
- Realistic IAP expectation: with ~1.83% of users purchasing anything (Unity 2024) and a long tail of ad-supported markets, a one-time remove-ads IAP is a low-volume revenue line (my reading; no puzzle-specific conversion data found).

### Gaps
- No 2025-2026 executive statements from Voodoo, Homa, SayGames or AppLovin on exact ad vs IAP split were found; the Homa quote is from 2023 and the Voodoo split is a secondary estimate.
- No benchmark for a *small* team's ad frequency, interstitial cap or "remove ads" price/conversion in a puzzle game.

---

## 5. The project's own targets (decision A-18: D1 >= 30%, D7 >= 8%, D30 >= 3%)

### Takeaway
The targets are ambitious but defensible as a stretch for a polished puzzle: they sit at roughly the 75th-85th percentile of all GameAnalytics-tracked mobile games on each metric, and below GA's own "35/15/5" aspirational bar. They are above median for every source and above the Android top-quartile D1 average from GA's 2025 report. They should be labeled stretch, with a median-level floor, and cohort sizes must be large enough to read them.

### Cited Findings
- GA 2026 (all genres, iOS+Android, 16,262 games): P50 D1 ~22-23% / D7 ~4% / D30 ~0.7-0.8%; top 25% D1 >30% / D7 6-7% / D30 1.6-1.8%; top 10% D1 40% / D7 11-12% / D30 ~4% ([GA retention](https://investgame.net/news/pdf/2026-01-20-mobile_retention_benchmarks_2026/); [GA benchmarks](https://investgame.net/news/pdf/2026-01-27-2026-mobile-pc-benchmarks_compressed/); [GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game)).
- GA 2025: Android top-25% D1 25-27% vs iOS 31-33%; puzzle among the best medium/long-term retention genres ([GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)).
- GA suggests the old 40/20/10 yardstick be updated to 35/15/5 ([GA retention](https://investgame.net/news/pdf/2026-01-20-mobile_retention_benchmarks_2026/)).
- Puzzle D30 on Android: 5.09% (AppsFlyer x Mistplay, May 27 2025) ([summary](https://gamedevreports.substack.com/p/mistplay-and-appsflyer-player-loyalty)); Q3 2022 paid-acquisition-heavy puzzle: D1 31.85% / D7 12.18% / D30 5.35% ([Mistplay](https://business.mistplay.com/resources/mobile-game-retention-benchmarks)).
- All-games D1 27% globally in 2025 (Adjust) ([Adjust 2026](https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf)).
- Homa (2023) treats D7 15%+ as its hybrid-casual target, which shows how far the publisher yardstick sits above the indie median ([Mobilegamer.biz](https://mobilegamer.biz/hypercasual-isnt-dead-for-attack-hole-maker-homa-but-its-evolving/)).

### Inferences
- **D1 >= 30%:** about the all-genre top-quartile threshold. On Android specifically, GA 2025's Android top-quartile average was 25-27%, so 30% is above that: a stretch. Realistic median-to-good outcome for a polished Android puzzle is 22-28% (my synthesis).
- **D7 >= 8%:** between GA's top-25% (6-7%) and top-10% (11-12%), roughly P80. For puzzle, which retains better at D7, plausible but still a stretch. A "good" bar of ~5-6% and a floor at the median (~4%) are more consistent with the data.
- **D30 >= 3%:** between GA's top-25% (1.6-1.8%) and top-10% (~4%), roughly P85. Puzzle D30 on Android of ~5% in AppsFlyer x Mistplay (engaged-user population) suggests it is reachable for a sticky puzzle, but it is a top-decile-adjacent target for an indie.
- **Organic-only effect:** organic installs are usually higher-intent than incentivized or heavy paid traffic, which helps D1, but organic cohorts are small. With a normal approximation (my calculation): a D1 reading of 30% at 300 installs has a 95% interval of about +/-5.2 points, and at 1,000 installs about +/-2.8 points; D7 8% at 300 installs about +/-3.1 points, at 1,000 about +/-1.7; D30 3% at 300 installs about +/-1.9 points, at 1,000 about +/-1.1. Below a few hundred installs per cohort, D7/D30 cannot distinguish "median" from "top quartile".
- The report's own "D7 >= 10%" conflicts with A-18's 8%; A-18 is the better-calibrated of the two.

### Gaps
- No Android-only, organic-only, puzzle-only percentile distribution exists publicly. Everything above is a mapping from all-genre percentiles plus qualitative statements that puzzle retains well.
- No data on how a pre-launch soft-launch or closed-testing cohort (typically small and tester-biased) maps to launch retention.

---

## 6. UA cost and creative benchmarks: CPI/CPM trends, creative formats, fake ads, LatAm claim

### Takeaway
UA is getting more expensive: Adjust shows global gaming CPI $0.56 in 2025 (+30%) and CPM $4.34 (+20%), with a steep geography gradient (LatAm CPI $0.14 vs US $1.71). Android casual CPI averaged $0.14 vs $1.41 on iOS in Liftoff's Feb 2024-Feb 2025 data. Video is ~81% of game creatives, hybrid video+playable is growing, and misleading "fake gameplay" ads remain a live policy and regulatory problem (UK ASA rulings; Google Play's ads policy covers in-app ad behavior). I found no source for "South America leads puzzle ad volume".

### Cited Findings

#### CPI, CPM, CPC (Adjust 2026 [V]; both platforms combined; 2025 vs 2024)
- Global gaming CPI **$0.56 (+30%)**; slots $4.47, idle RPG $3.19, strategy $1.03. APAC $0.27 (+29%); Europe $0.53 (+47%); DACH $1.70; **LATAM $0.14 (+40%)** with Brazil +50%, Mexico +40%; North America $1.68 (+31%, from $1.28); US $1.71 (from $1.31); MENA +15% ([Adjust 2026](https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf)).
- Global gaming CPM **$4.34 (+20%)**; North America $15.98 (+4%); Europe $5.12 (+18%); APAC $1.89 (+19%); LATAM $1.41; MENA $1.49; India $0.33; casino $12.22, slots $11.65 (same source). Global CPC $0.04 (+33%); North America $0.12, US $0.13 (same source).
- Paid-to-organic install ratio (median) rose 61% globally, from 2.07 to 3.33; LATAM 4.23; Brazil 5.32 (highest listed); North America 3.52; Europe 3.18; APAC 2.97 (same source). The document does not define the ratio; I read it as paid installs per organic install.
- ATT opt-in among iOS users shown the prompt: 39% in Q1 2026 (38% Q1 2025); LATAM 47% (same source).
- Liftoff x Singular [V] casual (puzzle, lifestyle, simulation), Feb 2024-Feb 2025: average CPI **$1.41 iOS vs $0.14 Android**; D30 ROAS 47% iOS vs 15% Android; CTR 9.4% Android vs 8.8% iOS; IPM "significantly higher" on Android ([Liftoff page](https://liftoff.ai/?p=34267); [GameDev Reports](https://gamedevreports.substack.com/p/liftoff-and-singular-casual-games), May 8 2025).
- Adjust Apr 2025: hybrid-casual CPI "almost doubled to $0.95" in 2024; hybrid-casual CTR 28% (highest category) ([Adjust 2025 summary](https://gamedevreports.substack.com/p/adjust-mobile-games-insights-report)).
- Sensor Tower: puzzle led worldwide ad spend at 33% vs strategy 21% in H1 2026; digital gaming ad spend +8% to $7B ([PocketGamer.biz](https://www.pocketgamer.biz/mobile-gaming-iap-dipped-2-as-ad-spend-climbed-in-h1-2026/)).

#### Creative trends
- Format mix Q1-Q3 2025: video ~80.9%, image ~13.7%, playable ~5% ([Insightrackr x XMP](https://xmp.mobvista.com/en-blog/docs/report-2025-global-mobile-gaming-ua-trends-strategy)).
- Apptica (Aug 2025): playable traffic AppLovin 59%, AdMob 38%, Unity 2%; playable "performance score" 191 (164 in 2024; 51 in 2023; proprietary metric); 85.4% of successful ads feature tutorial prompts and logos; 55.1% of top playables have strong CTAs ([AppAgent](https://appagent.com/?p=51896)).
- Liftoff highlights its own interactive formats (Triple Page, Page Turner) alongside video+playable ([Liftoff](https://liftoff.ai/?p=34267)).
- Meta x Sensor Tower puzzle creative report (2025) frames eight creative trends; puzzle 2024 revenue +14% while downloads -3% ([Sensor Tower](https://sensortower.com/blog/puzzle-games-creative-trends)). The full report was not accessible.

#### Fake/misleading ads and policy
- Google Play Ads policy: ads must not simulate or impersonate OS/app UI; "Full screen interstitial ads of all formats that show unexpectedly, typically when the user has chosen to do something else, are not allowed"; ads must not appear during gameplay or before splash screens; non-closeable ads must be dismissible within 15 seconds except explicitly opted-in rewarded ads ([Google Play policy](https://support.google.com/googleplay/android-developer/answer/9857753)). This governs what Gravity Flow itself can show; it is not a rule on third-party UA creatives. A 2022 news report dates the unexpected-full-screen-ad rule from Sept 30 2022 ([Business Standard](https://www.business-standard.com/article/technology/google-cracks-down-on-unexpected-misleading-ads-on-play-store-app-122072900281_1.html)).
- UK ASA: Evony ruling (Apr 23 2024, CAP Code 3.1) held that gameplay shown in an ad must reflect the game's core playing experience, even if the depicted mechanic is real ([Mishcon de Reya](https://www.mishcon.com/news/asa-rules-mobile-game-ad-was-misleading-gameplay-depicted-did-not-reflect-the-core-game-playing-experience)); earlier ASA bans of Playrix's Homescapes/Gardenscapes pin-pull ads (date not verified here; Playrix said only about 0.03% of users reached the advertised mini-games) ([FKKS](https://advertisinglaw.fkks.com/post/102gij0/liar-liar-mobile-game-ads-under-fire-asa-bans-misleading-ads-for-mobile-games)).
- Prevalence stats that circulate (over 30% of playable impressions misleading; 35% of casual playables fake; D1 32% vs 14% and D7 11% vs 1.5% for true vs fake ads) trace to a single low-credibility blog (expertbeacon.com) via a vendor post and are undated ([Segwise](https://segwise.ai/blog/fake-ads-and-mobile-gaming-how-studios-balance-clickbait-gameplay-integrity-and-profitability-cm7j2hc9s00bvip0l0r4k59lw.md)). Treat as unverified.
- Practitioner confirmation: Fumb Games' Paul West said ad partners show deceptive high-CTR ads despite poor user experience, a partner-choice problem for small studios (PGC London, Jan 28 2026) ([PocketGamer.biz](http://www.pocketgamer.biz/monetisation-trends-to-watch-in-2026-player-expectations-have-changed/)). AppsFlyer x Mistplay found Android users weigh gameplay authenticity in ads about twice as much as iOS users (May 2025) ([summary](https://gamedevreports.substack.com/p/mistplay-and-appsflyer-player-loyalty)).

#### Regional ad-volume claim (LatAm / South America)
- I found no source stating South America leads puzzle ad volume. What exists: Sensor Tower's 19-country ad panel includes Brazil and Mexico and says Brazil, India and Indonesia derive 55-70% of game revenue from ads ([summary](https://gamedevreports.substack.com/p/sensor-tower-mobile-game-ad-monetization)); Adjust shows LATAM has the highest regional paid-to-organic ratio (4.23; Brazil alone 5.32) and LATAM installs fell 9% in 2025 ([Adjust 2026](https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf)); a localization article attributes to Newzoo that LatAm players prefer strategy (35%), shooters (32%), racing (30%) over casual (undated, secondary) ([MCV/Develop](https://mcvuk.com/development-news/latin-america-a-localised-tale/)).

### Inferences
- For an organic Android launch, CPI and CPM matter mainly as the opportunity cost of not doing paid UA; the only strong action implied is "do not budget paid UA assuming Android CPI under $0.14 yields payback" (Android casual D30 ROAS averages 15% per Liftoff).
- Localization to Spanish/Portuguese can be justified by market size and low cost, not by "ad volume". Not evidenced here.
- If Gravity Flow ever produces UA creatives, the safest practice given ASA precedent and Google/Meta ad-review risk is to show real gameplay (physics attractor mechanic) rather than fake-mechanic hooks.

### Gaps
- No Android-only, puzzle-only CPI by region from a primary source (Adjust is both platforms, genre values chart-only; Liftoff gives only casual averages).
- No regional puzzle ad-volume breakdown from Sensor Tower/Apptica/Insightrackr was publicly retrievable.
- Platform policy on *advertiser creative* (Google Ads/Meta/TikTok policies on misleading app ads) was not retrieved; only Google Play's in-app ads policy and UK regulator rulings.
- The Playrix ASA ruling date was not verified.

---

## 7. Genre share of downloads vs revenue, and the IAP vs ads revenue mix

### Takeaway
Puzzle is download- and engagement-heavy but IAP-light, with big concentration inside the genre in swap/match-3, and its monetization leans on ads: Sensor Tower attributes 53% of game ad revenue to puzzle (modeled, Feb-Apr 2026) while Lifestyle+Puzzle took 74% of installs but 34% of IAP spend (H1 2026). In ad-first markets (Brazil, India, Indonesia) ads are 55-70% of game revenue; in the US/Japan/Korea/Canada IAP is 77-90%.

### Cited Findings
- **Sensor Tower [V], H1 2026:** Lifestyle+Puzzle 74% of installs, 53% of playtime, 34% of spend; Action+Strategy 49% of revenue on 17% of downloads; puzzle IAP revenue $8.1B (up nearly 20%) vs strategy $9.3B; puzzle 33% of ad spend ([PocketGamer.biz](https://www.pocketgamer.biz/mobile-gaming-iap-dipped-2-as-ad-spend-climbed-in-h1-2026/)). Global downloads fell 12% to 24B, IAP -2% to $40B (same source).
- **Sensor Tower State of Gaming 2026 (Feb 26 2026), full-year 2025:** Puzzle IAP +14% YoY in Europe; "Lifestyle/Puzzle games generated a higher share of revenue from in-app advertising than Action & Strategy and Sports & Racing games" in US, Japan, UK, Brazil ([mirror](https://investgame.net/news/pdf/2026-02-26-sensor_tower__state_of_gaming_2026__en_wp/)).
- **Sensor Tower ad-monetization report (June-July 2026; sources disagree on the exact date):** puzzle 53% of game ad revenue Feb-Apr 2026; 19 countries, ~5M MAU panel; ad revenue modeled from CPM benchmarks; $12B ad revenue and 2.4T impressions in 2025; ad-supported games = 24.6B downloads in 2025 and 84.1% of downloads in May 2026; hybrid-casual 16% of ad revenue ([GameDev Reports](https://gamedevreports.substack.com/p/sensor-tower-mobile-game-ad-monetization); [Game World Observer](https://gameworldobserver.com/?p=29151); [Sensor Tower](https://sensortower.com/blog/gaming-deep-dive-ad-monetization-report)).
- **Adjust [V], 2025:** puzzle 10% of installs and 12.9% of sessions ([Adjust 2026](https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf)); Apr 2025 report: puzzle 11% of downloads and 11% of sessions ([summary](https://gamedevreports.substack.com/p/adjust-mobile-games-insights-report)).
- **Within puzzle:** swap/match-3 is 16% of puzzle downloads but about 59-61% of puzzle spending (Sensor Tower State of Puzzle Games, Sept 2023) ([PocketGamer.biz](https://www.pocketgamer.biz/news/82358/the-puzzle-genre-has-generated-42-billion-in-revenue-with-swap-games-accounting-for-25-billion/); [Game World Observer](https://gameworldobserver.com/2023/09/08/puzzle-games-mobile-42-billion-revenue-sensor-tower-report)).
- **Meta x Sensor Tower:** in 2024 puzzle revenue +14% with downloads -3% ([Sensor Tower](https://sensortower.com/blog/puzzle-games-creative-trends)).
- **Ads vs IAP mix by market:** India, Indonesia, Brazil 55-70% of game revenue from ads; US, Canada, South Korea, Japan 77-90% from IAP ([GameDev Reports summary of Sensor Tower](https://gamedevreports.substack.com/p/sensor-tower-mobile-game-ad-monetization)).
- **Publisher-level mixes:** Homa Attack Hole ~70/30 ads/IAP (2023); hybrid-casual in general 20-50% IAP (Unity/ironSource, Jan 2024); Voodoo IAP ~14-15% of 2024 revenue (Sacra, secondary) (see section 4 for links). Insightrackr/XMP claims puzzle is "roughly 80% ad revenue vs in-app purchases" (vendor claim, definition unclear) ([source](https://xmp.mobvista.com/en-blog/docs/report-2025-global-mobile-gaming-ua-trends-strategy)).

### Inferences
- The report's C1 ("not always proportionate revenue") is accurate for IAP but incomplete: puzzle's ad revenue share is large, so puzzle's total monetization is higher than the IAP-only figure implies. The right framing for Gravity Flow is "puzzle monetizes disproportionately through ads, and IAP is concentrated in swap/match-3".
- As a physics puzzle (not swap/match-3), Gravity Flow sits in the large, low-IAP-yield part of the genre.

### Gaps
- No clean puzzle-only ad:IAP revenue split for Android from a primary source.
- Sensor Tower's "spend" is IAP only and its ad numbers are modeled; the exact grouping behind "Lifestyle & Puzzle" was not retrievable.

---

## 8. Session length and sessions per day

### Takeaway
Session metrics are not comparable across vendors. GameAnalytics reports median session length of ~3.1-3.5 minutes (2026) and ~3.8-3.9 sessions per day, while Adjust reports average gaming session lengths of ~25-33 minutes by region. Use GA for planning an indie puzzle, and do not mix Adjust's numbers in.

### Cited Findings
- **GameAnalytics 2026 [V]:** P50 session length 3.1-3.5 min; P50 sessions/day 3.8-3.9 ([GA benchmarks PDF mirror](https://investgame.net/news/pdf/2026-01-27-2026-mobile-pc-benchmarks_compressed/)); top 25% session length 5.2 min, sessions/day 5.3-5.7, daily playtime 22-24 min; top 1% session 22 min, 14 sessions/day, 94+ min/day ([GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game)).
- **GameAnalytics 2025 [V]:** session length median 5-6 min, top 25% 8-9 min; about 4 sessions per day; median daily playtime 22 min ([GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)). The 2026 and 2025 session-length values differ materially (median 3.1-3.5 vs 5-6 min) and I could not explain why (definition or sample change likely).
- **Adjust [V], 2025:** day-0 sessions per user 1.65 globally (LATAM 1.64, Europe 1.69, North America 1.6), puzzle about +1% YoY; average gaming session length: Europe 27.15 min, North America 24.65, LATAM 25.44 (Brazil 26.43), APAC 33.14 (down 4%); action longest at 43.8 min; puzzle session length grew 4-8% (value chart-only) ([Adjust 2026](https://a.storyblok.com/f/47007/x/20551740ee/gaming-app-insights-report-2026.pdf)).
- **Appodeal [V]**, Android/USA, Jun 2024-Jan 2025: hypercasual sessions ~170 s; Merge 3 656 s and Ludo 303 s per session ([PDF](https://files.gameindustrylibrary.com/documents/mobile-casual-benchmarks-report-2025.pdf)).
- **Meta x Sensor Tower:** Candy Crush users averaged 34 minutes a day over the prior 12 months (a market leader, not a benchmark) ([Sensor Tower](https://sensortower.com/blog/puzzle-games-creative-trends)).

### Inferences
- Adjust's 25-33 minute "session length" and GA's 3-5 minute figure are about an order of magnitude apart; definitions (session timeout rules, app-session vs gameplay session, top-5,000 app skew) must differ. For a Gravity Flow target, GA's top-quartile (5.2 min, ~5.5 sessions/day) is the relevant ceiling and the median (3.1-3.5 min, ~3.8 sessions/day) the floor.

### Gaps
- No puzzle-only session length or sessions-per-day values were readable (chart-only in Adjust 2026; GA 2026 has no genre split).
