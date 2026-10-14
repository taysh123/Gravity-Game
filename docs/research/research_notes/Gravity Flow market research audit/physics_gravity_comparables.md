# Physics, gravity and one-touch comparables for Gravity Flow (research notes, compiled 2026-10-14)

Conventions used below
- Every web page cited was fetched or searched on 2026-10-14 unless a different date is shown. "Page date" means the date shown on the page itself.
- Evidence tags: **(stated)** = a source says it; **(observed)** = I read it directly on a fetched page/listing; **(inferred)** = my reasoning, not in any source; **(search-summary)** = reported by a web-search result summary and the underlying page body could not be fetched (JavaScript-rendered or blocked), so treat as lower confidence.
- Third-party estimates (AppMagic, AppGoblin, Sensor Tower via secondary sites) are estimates, not audited revenue or install counts.
- Hard limits of this pass: Google Play listing pages could not be fetched (the fetch tool returned empty/truncated content), so Play installs bands, review counts and labels come from search-result summaries or aggregators and are flagged. I cannot watch video, so no first-session footage was reviewed; onboarding statements come from text sources only.
- Project facts used for transfer analysis: Gravity Flow uses `phaser` 3.90.0 ([package.json](C:/Dev/Projects/Personal/Gravity%20Game/package.json)), `physics.matter` with zero gravity ([src/main.ts](C:/Dev/Projects/Personal/Gravity%20Game/src/main.ts)), and applies the attractor force once per scene `update()` ([src/scenes/GameScene.ts](C:/Dev/Projects/Personal/Gravity%20Game/src/scenes/GameScene.ts) lines 949 and 965-981). The project's own [docs/STATUS.md](C:/Dev/Projects/Personal/Gravity%20Game/docs/STATUS.md) already lists B-03 (P0) "Frame-rate-dependent physics (forces applied per render frame)".

---

## Q1. Which 6-10 titles are genuinely close to "press and hold to create a gravity well that pulls a ball to a goal", and what do we know about each?

### Takeaway
The closest mechanic matches are small or old: Gravity Well (iPhone, 2009), Glide (2015) and Gravity Pull (iOS, March 2026) all use touch-to-attract; none is a commercial hit I could evidence. The large commercial titles in the neighbourhood (All in Hole, Hole.io, Love Balls, Brain It On!, Cut the Rope) share the "satisfying physics" feel and the 3-star/level-pack structure but not the indirect, force-based control. Gravity Flow's exact mechanic (hold anywhere, inverse-square pull, drag to steer, release to remove) is therefore under-served at commercial scale, and its nearest 2026 rival (Gravity Pull) is an endless-only title with no ratings yet.

### Cited Findings

**Tier A: same control idea (touch/hold creates a pull on a ball)**

*1. Gravity Well (Genius Factor Games, iPhone, 2009)*
- Mechanic/control: "touching the screen at any point will draw the ball towards your finger"; pinball plus mini-golf feel; score rewards fewer touches and less time (a primitive efficiency star). (stated) [Destructoid, 2010-06-08](https://www.destructoid.com/free-app-of-the-day-gravity-well/); developer named as Genius Factor Games only in a web-search result summary (the specific source page was not identified, so low confidence; Pocket Gamer and Destructoid pages do not name the developer).
- Difficulty: hazards escalate (spikes, laser walls) against a four-life shield. (stated) [Pocket Gamer review, 2009-05-26](https://www.pocketgamer.com/gravity-well/review/)
- Dominant criticism (the most relevant caution for Gravity Flow): "lacks direct ball control, making errors feel unfair", ball momentum causes overshooting, becomes repetitive, 3/5. (stated) [Pocket Gamer, 2009-05-26](https://www.pocketgamer.com/gravity-well/review/)
- Monetization/metrics: free "App of the Day" in June 2010; no install or revenue data found. (stated) [Destructoid](https://www.destructoid.com/free-app-of-the-day-gravity-well/)

*2. Glide (dixonary, 2015, PC/Mac/Linux/Android)*
- "Touch the screen anywhere (or use keyboard) to enable gravity, and be pulled towards nearby orbs"; 60+ levels across 8 stages; relaxed, minimalist; accessibility/colour options; Google Play Games achievements; released 2015-09-11. (observed) [RAWG listing](https://rawg.io/games/glide)
- No ratings or install data available on that listing. (observed) [RAWG](https://rawg.io/games/glide)
- Difference: gravity is a toggle toward fixed orbs, not a movable attractor. (inferred)

*3. Gravity Pull (Johannes Hubert, iOS, released 2026-03-12)*
- "Tap and hold to create a gravity well, release to let momentum carry forward"; endless run, "8 stunning worlds", collect orbs, multipliers; free with "Remove Ads $3.99"; age 4+; v1.1.0 (April 29) tuned "comet mode" and "black holes". No ratings yet ("hasn't received enough ratings"). (observed) [App Store NZ listing](https://apps.apple.com/nz/app/gravity-pull/id6758897993)
- I found no Android/Google Play listing for it. (search summary) [web search](https://apps.apple.com/nz/app/gravity-pull/id6758897993)
- It is the nearest direct 2026 analogue to Gravity Flow's press-hold mechanic and to the Gravity Run endless mode; it has no stated level-based campaign, bosses, or stars. (inferred from the listing text)

*4. Finger Suck (Entity3 Limited, iOS)*: "Use your finger like a magnet! Drag all the balls into the tube", free, 4+, no rating data. (observed) [App Store](https://apps.apple.com/us/app/-/id1485577252). Thin evidence; included only as proof that the "finger as magnet" idea recurs in low-visibility titles.

*5. GravityGolf (4-person student team, HTML5/macOS prototype)*: gravity fields attract or repel a ball whose launch direction is fixed; fields dragged in with strength sliders; one rating on itch.io. (observed) [itch.io](https://ninobrugger.itch.io/gravitygolf). Prototype only, not a commercial comparable.

**Tier B: gravity/orbit simulators and minimalist physics (small-team, premium-ish)**

*6. Orbit - Playing with Gravity (HIGHKEY Games, 2015, iOS + Android)*
- Core: flick to launch planets into stable orbits around black holes, trajectory preview, 45 free levels, community-created levels, paid Sandbox. (observed) [App Store](https://apps.apple.com/app/id991457817)
- Monetization: free with IAP; Sandbox (also removes ads) $2.99, remove ads $0.99, tip jars $0.99-$9.99. (observed) [App Store](https://apps.apple.com/app/id991457817)
- Metrics: iOS 4.8 stars from 7,600+ ratings (fetched 2026-10-14); store lists version 3.0.4 with community-world browsing and "improved controls". (observed) [App Store](https://apps.apple.com/app/id991457817). Google Play Indie Games Festival 2016 winner (stated) [apkmirror listing text via search](https://apkmirror.com/apk/highkey-games/orbit-playing-with-gravity). An alternative-store figure of 18K installs for v2.3.0 exists but is not a Play band. (search summary) [apkmirror](https://apkmirror.com/apk/highkey-games/orbit-playing-with-gravity)
- Dominant negative themes on the store page: later levels become "frustratingly unstable" and reward "spamming planets" over strategy. (observed, summarised from page review text) [App Store](https://apps.apple.com/app/id991457817)
- Team and lessons: three people (developer Chetan Surpur, business/design Eric Rahman, musician Craig Barnes); first game; "modest (and surprising) success"; the first version was released "without a single monetisation hook"; "the game will only make an impression if I let the player try it for themselves... it has to be experienced" (interview 2017-09-19). (stated) [PocketGamer.biz](https://www.pocketgamer.biz/bip-interviews-highkey-games/)

*7. Osmos (Hemisphere Games, designer Eddy Boxerman)*
- Absorb smaller motes by expelling mass (momentum physics, no gravity-well pull). Platforms: Windows 2009-08-18, iPad 2010-07-08, iPhone 2010-08-05, Android 2012-01-17. Apple iPad Game of the Year 2010; Metacritic 80 (PC) to 90 (iPhone). (observed) [Wikipedia](https://en.wikipedia.org/wiki/Osmos)
- Four-year development; GDC China 2010 postmortem "Minimalism and OSMOS" covers minimalist design, PC vs iPad interface design and cut features (abstract only; slides/video not retrieved). (stated) [GDC Vault](https://gdcvault.com/play/1013999/Minimalism-and-OSMOS-a-Post)

**Tier C: commercial neighbours (feel and structure, different control)**

*8. All in Hole (Homa) - the report's named title*
- Core/control: drag a hole (joystick-style) to swallow target food items within a time limit; the hole grows as it eats and the camera zooms out; "Hole.io meets the best practices from puzzle games meta". (stated) [Teeny Tiny Teardown, 2024-10-09](https://someselectedstories.substack.com/p/teeny-tiny-teardown-all-in-hole-homa); Pocket Gamer Android launch article dated 2024-06-12 lists magnet, 10-second time-freeze, hint and instant-level power-ups, tournaments, teams with chat. (stated) [Pocket Gamer](https://www.pocketgamer.com/all-in-hole-sinkhole-puzzle/out-now-on-android)
- Onboarding: "extremely easy and intuitive", mastery "within one minute"; early levels are easy; difficulty labels shown up front nudge booster use; features unlock gradually. First-success and first-fail timings are not documented. (stated) [Teardown](https://someselectedstories.substack.com/p/teeny-tiny-teardown-all-in-hole-homa)
- Level design: star-based "packs" (saga-style); target quantities per item type; time limit. (stated) [Teardown](https://someselectedstories.substack.com/p/teeny-tiny-teardown-all-in-hole-homa)
- Replay drivers/live-ops: Star Tournament, Submarine Race, Drill Up, Treasure Hunt, escalating daily rewards; "events are very short". (stated) [Teardown](https://someselectedstories.substack.com/p/teeny-tiny-teardown-all-in-hole-homa). Homa's UA case study (June-Dec 2025 campaigns) credits time-limited events, daily/weekly missions and a battle pass for retention. (stated) [Unity case study](https://unity.com/resources/homa). A "Treasure Pass" added in July (year not shown) is mentioned in AppMagic coverage. (search summary) [AppMagic search result](https://appmagic.rocks/blog/q3hybrid2025)
- Monetization: IAP-first. Coins; Beginner pack; "No-Ads Bundle ($9.99)"; ads are opt-in ("a conscious choice"); economy "extremely generous (no pinch at all in the first hour)" and weak coin sink for the first ~50 levels. (stated) [Teardown](https://someselectedstories.substack.com/p/teeny-tiny-teardown-all-in-hole-homa). AppGoblin shows a 70% IAP / 30% ads split (estimate, method not stated) and ad SDKs from AppLovin, Unity, AdMob and Facebook, plus RevenueCat, Adjust, Helpshift. (observed) [AppGoblin](https://www.appgoblin.info/apps/com.homagames.studio.allinhole)
- Metrics: Google Play 10M+ downloads, 4.8 stars, about 186K reviews (search summary of the Play listing; page not fetchable) [search](https://play.google.com/store/apps/eventdetails/4830670124824838080). AppGoblin: 11.6M installs, 4.81 stars on 193K ratings, release 2023-06-14, last updated 2026-10-06, last SDK scan 2026-09-26 (estimates). (observed) [AppGoblin](https://www.appgoblin.info/apps/com.homagames.studio.allinhole). AppMagic (estimates): Q1 2025 $17.7M (about $250-300K/day IAP) [Gamigion](https://www.gamigion.com/hole/); Q2 2025 $22.3M revenue on 3.4M installs, rank #3 among hybrid-casual, "highest RpD" in the top 10 [AppMagic via Game Dev Reports, 2025-09-15](https://gamedevreports.substack.com/p/appmagic-top-10-hybrid-casual-games); Q3 2025 about $16.5M and about $130M lifetime IAP (search summary) [AppMagic](https://appmagic.rocks/blog/q3hybrid2025). Homa September 2024: All in Hole about $700K of Homa's roughly $2M monthly revenue (about one third). (stated) [Teardown](https://someselectedstories.substack.com/p/teeny-tiny-teardown-all-in-hole-homa)
- Negative review themes (aggregated, not Play review text): forced/frequent ads rising over time, difficulty spikes pushing paid boosters, repetition and demand for more levels, no-ads pack not delivered, iPad crashes. (search summary) [search](https://marlvel.ai/apps/all-in-hole-black-hole-games/vs)
- Conflict: Pocket Gamer's "out now on Android" is dated 2024-06-12 while AppGoblin shows a 2023-06-14 release; the earlier date is probably a soft-launch listing. (inferred)

*9. Hole.io (Voodoo, 2018)*
- Control: drag a ground hole to swallow objects and grow; Classic/Battle/solo modes; accused of cloning Donut County; criticised for NPC "multiplayer". (stated) [Wikipedia](https://en.wikipedia.org/wiki/Hole.io)
- Metrics: 100M installs, 3.0 stars, 1.3M reviews, last updated 2026-03-12, contains ads, Teen (aggregator, data date 2026-03-10) [AppPricingLab](https://apppricinglab.com/app/google_play/io.voodoo.holeio); an older Wikipedia figure says "over 10 million" Play downloads (stale). Resurgence of about 500K downloads/day and 10M installs in March 2025 alone (stated, AppMagic-derived) [Gamigion](https://www.gamigion.com/hole/).
- Dominant complaint: ad frequency (reported every 3-5 minutes), ad-removal price, level-based redesign too hard, no developer replies. (search summary) [search](https://justuseapp.com/en/app/1389111413/hole-io/reviews)

*10. Love Balls (Lion Studios, released 2018-02-13)*
- Draw lines/shapes to make two balls meet; "new levels every week" claimed in store copy; Android 1.7.3 dated 2023-12-11. (stated) [APKMirror text via search](https://apkmirror.com/apk/lion-studios-2/love-balls/love-balls-1-7-3-release/love-balls-1-7-3-android-apk-download)
- iOS: 4.6 stars, 557,000 ratings, age 13+, IAP No Ads $3.99, Super Gift $4.99, coin packs up to $9.99, pens/skins $0.99; v2.0.0 (Jun 16) and v2.0.1 (Sep 10), year not shown on the page. Recurring complaint: ad volume. (observed) [App Store](https://apps.apple.com/us/app/-/id1348173937)
- No developer postmortem/interview found for Love Balls or the Lion Studios publishing model.

*11. Brain It On! (Orbital Nine, released 2015-06-28)*
- Draw shapes to solve physics puzzles; multiple solutions per level; community levels; leaderboards. Free with ads/IAP; full game $0.99-$3.99; remove pop-up ads $0.99; 4.5 stars from 5,200+ iOS ratings; v1.6.415 dated 2024-09-17 added level collections, new objects and performance work. (observed) [App Store](https://apps.apple.com/us/app/brain-it-on-physics-puzzles/id985367692); launch post [Unity forum](https://discussions.unity.com/threads/brain-it-on-launched.336771/)
- Negative themes (aggregated review excerpts): "unresponsive touch drawing controls", unskippable ads after every level, difficulty spike around level 25+, and physics objecting to expected mass/momentum behaviour ("larger objects have more mass and momentum. Here this relationship is absent or warped"). (stated, aggregator) [JustUseApp](https://justuseapp.com/en/app/985367692/brain-it-on/reviews). Aggregators disagree on sentiment (31.3% negative there vs 66.7% negative in a different tool's summary), so treat the percentages as unreliable. [search summary](https://marlvel.ai/apps/brain-it-on/reviews)

*12. Cut the Rope (ZeptoLab, 2010)*
- Launched 2010-10-04/05 at $0.99, no ads; 3-star scoring; later sequels and a free-to-play pivot from 2014, with the CEO stating "You can't simply convert a premium game into free-to-play... we needed to build games with that model in their DNA from day one"; subscription platforms again from 2023. (stated) [Pocket Gamer 15-year interview](https://www.pocketgamer.com/cut-the-rope/15-year-anniversary-interview)
- Team of 4 at the start, 20 later; top 10 on day one, #1 on day two; 1M downloads in 10 days; 60M+ in the first year; custom rope-physics engine written to run on weak hardware (DeanBeat, first published 2011-12-09, updated 2025-06-18). (stated) [GamesBeat](https://gamesbeat.com/deanbeat-iphone-cut-the-rope/)
- Pacing: about 200 levels reviewed in 2011; "the entire game functions as a slow tutorial", each level adds a small function; levels "feel great when you finish". (stated) [Avoision, 2011-08-20](https://avoision.com/2011/08/20/cut_the_rope_addictive_perfect.php)

*Other canonical one-touch/premium references*
- Tiny Wings: solo developer, about 7 months; touch-and-hold to dive; launched 2011-02-18; #1 paid US on 2011-02-24; at least 10.5M iPhone and 1.8M iPad copies (Game Center-derived estimate); Apple Arcade edition 2021-10-15. (stated) [Wikipedia](https://en.wikipedia.org/wiki/Tiny_Wings); interview summary (search summary, page not fetched) [App Agent](https://appagent.com/blog/andreas-illiger-tiny-wings-success-was-scary/).
- Alto's Odyssey: premium $4.99 on iOS at launch (March 2018); team view that "anything that required more than one touch input didn't really feel right". (stated) [The Sweet Setup, 2018-03-14](https://thesweetsetup.com/quick-qa-team-alto-makers-altos-odyssey/)
- Where's My Water? (Disney Mobile, 2011-09-22): 80 levels at launch, 500+ levels and a half-dozen new mechanics a year later, 100M downloads including free and Perry versions by 2012-09-24; development focus was tactile water physics distinct from slingshot games. (stated) [PocketGamer.biz](https://www.pocketgamer.biz/direct-hit-for-disney-wheres-my-water-joins-100-million-club/)
- Sand Balls (SayGames, not Voodoo): top hyper-casual download title in late 2019; around 10M Google Play downloads and 4.2 stars in older sources; heavy ads. (search summary, dated 2019-2020) [PocketGamer.biz](https://pocketgamer.biz/news/71997/sand-balls-saw-the-most-downloads-for-hyper-casual-games-in-october/). Too stale to use for current benchmarks.

### Inferences
- Closest-by-mechanic (Gravity Well, Glide, Gravity Pull) are not proven commercial categories; closest-by-business (All in Hole, Love Balls, Brain It On!, Cut the Rope) are proven but differ in control. The gap in the market for "indirect, force-based press-hold puzzle with a campaign" is plausible but unproven (absence of a hit is not evidence of demand).
- Gravity Well's 2009 criticism ("lacks direct ball control, errors feel unfair") is the same risk Gravity Flow carries 17 years later. It must be answered with predictable feedback (trajectory/pull preview, consistent force at every frame rate, restarts that feel instant).
- The Orbit developer's "must be experienced" remark implies Gravity Flow's store creatives should show an actual hold-drag-release interaction (video or playable) rather than describe it.

### Gaps
- Google Play installs band, rating, review count and labels for Orbit, Brain It On!, Love Balls, Glide and Gravity Pull; Play pages did not load. Only All in Hole and Hole.io have Play figures, via aggregators/search summaries.
- First-session footage (time to first success/fail) for every title; video not accessible. Only All in Hole has a text claim ("within one minute").
- Update/level-pack cadence is documented only for Love Balls (store copy), Where's My Water? (year-one counts), Brain It On! (recent version notes) and All in Hole (events). No dated cadence log was retrievable.
- Store creatives/screenshots/trailers were not reviewed.
- Developer postmortems for Love Balls and Brain It On! (beyond the launch post) were not found.
- "Sand Blocks" (named in the report) was not researched or located.

---

## Q2. Audit of the deep-research report's claims about All in Hole and physics puzzles

### Takeaway
The headline All in Hole numbers are roughly right but unsourced and imprecise; the descriptive claims are weaker (it is not "plinko", and "offline" is doubtful). Several engineering recommendations in the report are sound in principle but rest on a wrong description of Gravity Flow (the report repeatedly says tilt/swipe; the game has neither) and on a competitor basis that does not exist.

### Cited Findings

| # | Report claim | Verdict | Confidence | Evidence (URL, date seen 2026-10-14 unless noted) |
|---|---|---|---|---|
| 1 | "All in Hole (Homa) 12M DL" | Partly supported | Medium | Play band reported as 10M+ (search summary of listing); AppGoblin estimates 11.6M installs; AppMagic shows 3.4M installs in Q2 2025 alone. "12M" is not an official figure. [AppGoblin](https://www.appgoblin.info/apps/com.homagames.studio.allinhole), [Game Dev Reports/AppMagic 2025-09-15](https://gamedevreports.substack.com/p/appmagic-top-10-hybrid-casual-games) |
| 2 | "★4.8 (185K rev)" | Verified (within drift) | Medium-high | Play 4.8 / about 186K reviews (search summary); AppGoblin 4.81 / 193K ratings. [AppGoblin](https://www.appgoblin.info/apps/com.homagames.studio.allinhole), [Play event page via search](https://play.google.com/store/apps/eventdetails/4830670124824838080) |
| 3 | "IAP + likely ads" | Verified, but understated | High | IAP-first (about 70-80% of revenue), ads opt-in, $9.99 no-ads bundle, ad SDKs present. [Teardown 2024-10-09](https://someselectedstories.substack.com/p/teeny-tiny-teardown-all-in-hole-homa), [Gamigion](https://www.gamigion.com/hole/), [AppGoblin](https://www.appgoblin.info/apps/com.homagames.studio.allinhole) |
| 4 | "(offline)" and "designed for offline relaxation" | Unverified, probably incorrect | Medium | Store copy lists global tournaments, teams with chat; live-ops events, battle/treasure pass; Adjust/RevenueCat/Helpshift SDKs. No source says it is offline-first. [Pocket Gamer 2024-06-12](https://www.pocketgamer.com/all-in-hole-sinkhole-puzzle/out-now-on-android), [Unity case study](https://unity.com/resources/homa) |
| 5 | "grow a black hole by eating colored objects" | Partly supported | High | It is a hole that eats specific themed food items (fruit, vegetables, drinks, pastries, fast food) against per-item targets and a timer; "colored objects" is imprecise. [Teardown](https://someselectedstories.substack.com/p/teeny-tiny-teardown-all-in-hole-homa), [Pocket Gamer](https://www.pocketgamer.com/all-in-hole-sinkhole-puzzle/out-now-on-android) |
| 6 | "sort-and-collect puzzles ... like plinko" | Incorrect | High | Joystick-controlled Hole.io-lineage gameplay; no plinko/peg-board mechanic described anywhere. [Teardown](https://someselectedstories.substack.com/p/teeny-tiny-teardown-all-in-hole-homa), [Wikipedia Hole.io](https://en.wikipedia.org/wiki/Hole.io) |
| 7 | "Periodic updates add new themed packs every few weeks" | Partly supported | Medium-low | Level "packs" filled by stars and short events exist; no source gives a "every few weeks" pack cadence. AppGoblin tracks 34 versions, current 9.10.4, updated 2026-10-06. [Teardown](https://someselectedstories.substack.com/p/teeny-tiny-teardown-all-in-hole-homa), [Scout/Appaloosa](https://scout.appaloosa.io/apps/com.homagames.studio.allinhole), [AppGoblin](https://www.appgoblin.info/apps/com.homagames.studio.allinhole) |
| 8 | "Physics puzzles (All in Hole, Sand Blocks) attract players with satisfying object interactions" | Partly supported | Medium | Reviewers call Hole.io "oddly satisfying and addictive". But AppMagic classes All in Hole as arcade/eat-and-grow, credits puzzle-style meta, live-ops and highest revenue-per-download, and says success is "not solely the result of adopting mechanics from Casual games" but also UA and trend-aligned themes. "Sand Blocks" not located. [Wikipedia Hole.io](https://en.wikipedia.org/wiki/Hole.io), [Mobidictum](https://mobidictum.com/top-10-hybridcasual-games-q2-2025-rollic-voodoo/), [AppMagic via Game Dev Reports](https://gamedevreports.substack.com/p/appmagic-top-10-hybrid-casual-games) |
| 9 | "Competitors' puzzles (Pixel Flow, Colony Flow) rely on predictability" | Not applicable as a physics claim | High (on category); low on Colony Flow | Pixel Flow is categorised as a sort/queue puzzle, not a physics simulation (secondary source); Colony Flow not checked. Predictability here is deterministic puzzle logic, not simulation stability. [Game Growth Advisor 2026-04-16](https://gamegrowthadvisor.com/blog/2026-04-16-hybrid-casual-game-design-strategy-2026/) |
| 10 | "avoid speed-sensitive physics issues, test on multiple frame rates" | Verified as engineering practice; Unverified as a competitor insight | High (practice) / Low (attribution) | Independent evidence below (Dead Sticks 120fps, Phaser issue #3957, Phaser/Matter forum, Matter 0.20 changelog). No competitor evidence supports the "competitor patterns" framing. |
| 11 | "ensure all levels are solvable in under ~60s by default" | Unverified | Medium | No comparable source gives a per-level time target. Gravity Flow already has `timeLimitMs` levels and a par-time star, so a blanket 60 s bound would conflict with boss levels and slower mastery runs. (inferred) |
| 12 | "simulate different tilt speeds" (and "tilt-gravity mechanic", "swipe gravity", "auto-tilt", "tilt gestures") | Not applicable / contradicted | High | Gravity Flow has no tilt and no swipe: press and hold anywhere creates an inverse-square attractor; drag moves it; release removes it (project brief and [CLAUDE.md](C:/Dev/Projects/Personal/Gravity%20Game/CLAUDE.md)). The right test inputs are hold position, drag speed/path, hold duration and frame cadence. |

Independent evidence for row 10 (frame-rate-dependent physics):
- A 120 Hz bug: "the physics simulation ran too quickly on 120fps displays", fixed in a devlog dated 2022-12-25. (stated) [Dead Sticks devlog](https://supernapie.itch.io/dead-sticks/devlog/468265/fixed-timing-issue-with-physics-120fps)
- Phaser issue #3957 "Physics framerate independence" (opened 2018-08-20, closed Won't Fix): physics slows proportionally when frame rate drops; maintainers prefer deterministic fixed stepping over frame-rate-independent deltas because delta-based Matter was unstable. (stated) [GitHub](https://github.com/photonstorm/phaser/issues/3957)
- Phaser forum thread (original 2023-07-08, updated 2025-04-01): by default Matter used a variable step from the minimum recent delta clamped to 16-33 ms, so it "runs ahead or behind" outside 30-60 fps; Phaser examples ran faster at 144 Hz; "applyForce() and thrust()... same values can have different effects depending on the size of Matter's timestep"; note added: "As of Phaser v3.88+, Matter Physics uses a fixed-step update loop, so don't use any of this." (stated) [Phaser Discourse](https://phaser.discourse.group/t/matter-physics-in-phaser-v3-60-to-v3-80/13398)
- Phaser 3.85 bundled Matter.js 0.20.0, "defaults to a fixed deterministic timestep", supports high-refresh displays, and "Matter.Runner can now call zero, one, or multiple engine updates and events per display frame". (stated) [Phaser 3.85 changelog](https://unpkg.com/phaser@4.2.1/changelog/v3/3.85/MatterJS.md)
- Consumer-review evidence for physics unfairness exists but is about responsiveness and rules, not frame rate: Brain It On! mass/momentum and unresponsive drawing complaints; Orbit "unstable" late levels. No Play/App Store review text citing frame rate for any comparable was found. (stated) [JustUseApp](https://justuseapp.com/en/app/985367692/brain-it-on/reviews), [App Store Orbit](https://apps.apple.com/app/id991457817)

### Inferences
- Because Gravity Flow runs Phaser 3.90.0 (Matter 0.20 fixed-step runner, which may run zero, one or several physics steps per display frame) but applies `applyForce` once per scene `update()`, the per-step force may vary with display refresh rate. If forces accumulate on the body until the next engine step, a 120 Hz display could apply roughly two force impulses per 60 Hz physics step and a 30 fps display fewer than one per step. This is my inference from the cited behaviour and the code reading; it should be verified in the codebase (the project already tracks it as B-03) and the usual fix is to apply forces inside Matter's before-update hook, once per physics step.
- Rows 11 and 12 show the report author misunderstood Gravity Flow's control scheme. Any other report recommendation that mentions tilt, swipe or "auto-tilt" scripts should be discounted.
- The report's strongest All in Hole signal (monetisation: IAP-first, ads opt-in, generous early economy) is under-reported; the weakest (offline, plinko) is wrong.

### Gaps
- Google Play primary listing text for All in Hole (labels, "what's new", exact installs band) could not be fetched. Play review-text sampling was not possible.
- Colony Flow, Pixel Flow and Sand Blocks were not independently researched.
- No source for a "every few weeks" pack cadence.

---

## Q3. How do the best physics puzzles teach one novel control in 30-60 seconds, and what do players say when physics feels unfair or inconsistent?

### Takeaway
The recurring pattern is: one action, the world teaches it, and difficulty rises slowly (Cut the Rope as a "slow tutorial", All in Hole "mastery within one minute", Tiny Wings and Alto as one-touch). I found no evidence of timed first-success/first-fail benchmarks. Complaints cluster around controls that do not do what the player expects (unresponsive drawing, overshoot, "errors feel unfair"), unstable late-level physics and interstitial ads, not around frame rate as such.

### Cited Findings
- Cut the Rope: levels each add small functionality; the whole game acts as "a kind of slow tutorial"; levels "feel great when you finish". (stated) [Avoision, 2011-08-20](https://avoision.com/2011/08/20/cut_the_rope_addictive_perfect.php)
- All in Hole: "extremely easy and intuitive", mastery within a minute; joystick control; early levels easy to pass; upfront difficulty labels. (stated) [Teardown, 2024-10-09](https://someselectedstories.substack.com/p/teeny-tiny-teardown-all-in-hole-homa)
- Tiny Wings: "literally anybody who was capable of tapping a touch screen could pick up Tiny Wings and get hooked". (stated) [App Agent summary via search](https://appagent.com/blog/andreas-illiger-tiny-wings-success-was-scary/)
- Alto's Odyssey team: one-touch only because "anything that required more than one touch input didn't really feel right". (stated) [The Sweet Setup, 2018-03-14](https://thesweetsetup.com/quick-qa-team-alto-makers-altos-odyssey/)
- Parachute Ninja to Cut the Rope: ZeptoLab abandoned a rope-swing control because "the controls weren't working well", then reused the rope engine for a better-fitting interaction. (stated) [Pocket Gamer.biz profile via search](https://www.pocketgamer.biz/interview/40890/the-super-voinov-twins-on-how-brotherly-love-for-the-zx-spectrum-eventually-led-to-cut-the-rope/)
- Gravity Well's reviewer: indirect control "makes errors feel unfair" and momentum causes overshoot. (stated) [Pocket Gamer, 2009-05-26](https://www.pocketgamer.com/gravity-well/review/)
- Orbit store feedback: later levels "frustratingly unstable", rewarding "spamming planets". (observed) [App Store](https://apps.apple.com/app/id991457817)
- Brain It On!: drawing controls "unresponsive", ads after every level, difficulty spike around level 25+; physics intuition mismatches (mass/momentum). (stated, aggregator) [JustUseApp](https://justuseapp.com/en/app/985367692/brain-it-on/reviews)
- Hole.io and Love Balls: ads dominate negative feedback. (search summary / observed) [Hole.io reviews](https://justuseapp.com/en/app/1389111413/hole-io/reviews), [Love Balls App Store](https://apps.apple.com/us/app/-/id1348173937)
- Frame-rate evidence is in Q2 (Dead Sticks, Phaser #3957, Phaser forum, Matter 0.20 changelog).

### Inferences
- Gravity Flow's existing Level 1 design (ball-to-goal within one attractor reach, ghost-dot coach mark, sonar ping on every press) fits the "world teaches it" pattern and answers Gravity Well's "unfair indirect control" critique by making the reach visible. This is a design judgement, not a measured result.
- A reasonable internal 30-60 second target is one successful pull in under about 15 seconds and one safe first fail by around the third level, but no comparable source establishes those numbers; they should be measured in the planned first-20-players test rather than assumed. (inferred)
- Complaints about "inconsistent" physics in the comparables are mostly perception and responsiveness problems; Gravity Flow's exposure is different (cross-device force consistency), which makes determinism a differentiator. (inferred)

### Gaps
- No timed first-session footage (video not reviewable).
- No Play review text sampling; review complaints come from aggregator excerpts and store-page summaries.
- No review evidence directly naming frame-rate-dependent physics in a commercial comparable.

---

## Q4. Which premium/indie physics puzzles succeeded with small teams, and how?

### Takeaway
The best-documented successes are old and mostly premium: Tiny Wings (solo, about 7 months, #1 paid), Cut the Rope (team of 4, 1M downloads in 10 days), Osmos (four-year minimalist build, acclaim) and Orbit (team of 3, award-winning, modest sales, no monetisation at first). The modern small-team route runs through publishers (Lion Studios, SayGames, Voodoo, Homa) and free-to-play monetisation, where I found no postmortem.

### Cited Findings
- Tiny Wings: one developer, about seven months, launched 2011-02-18, #1 paid app in the US on 2011-02-24, at least 10.5M iPhone and 1.8M iPad copies (Game Center-derived), Apple Arcade edition 2021. (stated) [Wikipedia](https://en.wikipedia.org/wiki/Tiny_Wings), [App Agent](https://appagent.com/blog/andreas-illiger-tiny-wings-success-was-scary/)
- Cut the Rope: four people, concept spring 2010, prototyping summer, launch October 2010 via publisher Chillingo; custom physics engine; top 10 on day one; priced $0.99. (stated) [GamesBeat](https://gamesbeat.com/deanbeat-iphone-cut-the-rope/); the F2P transition lesson is quoted in [Pocket Gamer](https://www.pocketgamer.com/cut-the-rope/15-year-anniversary-interview).
- Osmos: four-year development; GDC China 2010 postmortem by Eddy Boxerman and Andy Nealen; iPad Game of the Year 2010. (stated) [GDC Vault](https://gdcvault.com/play/1013999/Minimalism-and-OSMOS-a-Post), [Wikipedia](https://en.wikipedia.org/wiki/Osmos)
- Orbit: three-person team; "initially stupidly released the first version of Orbit without a single monetisation hook"; "modest (and surprising) success". (stated) [PocketGamer.biz, 2017-09-19](https://www.pocketgamer.biz/bip-interviews-highkey-games/)
- Brain It On!: independent studio Orbital Nine; launched 2015-06-28 on iOS and Google Play; still shipping content in 2024. (observed) [Unity forum post](https://discussions.unity.com/threads/brain-it-on-launched.336771/), [App Store](https://apps.apple.com/us/app/brain-it-on-physics-puzzles/id985367692)
- Where's My Water?: Disney's first game-born character; focus on tactile touch-water physics rather than slingshot; 80 levels at launch then 500+ and new mechanics within a year. (stated) [PocketGamer.biz](https://www.pocketgamer.biz/direct-hit-for-disney-wheres-my-water-joins-100-million-club/); [search summary of USA Today interview](https://www.macworld.com/article/215382/wheres_my_water_for_iphone_and_ipad.html)
- Alto's Odyssey: premium $4.99, calm "coziness" design direction. (stated) [The Sweet Setup](https://thesweetsetup.com/quick-qa-team-alto-makers-altos-odyssey/)

### Inferences
- Small-team physics hits shared three traits: one memorable interaction, very high polish on feel (custom physics where needed), and a distinctive mood. None depended on live-ops at launch. Gravity Flow's current stack (worlds, bosses, stars, Daily, Gravity Run) is closer to the F2P-era expectation than the premium era.
- The Orbit lesson (monetisation designed in from day one) is directly relevant to a pre-launch game: Gravity Flow already has cosmetics and an ads/IAP seam. (inferred)

### Gaps
- No GDC talk or postmortem for Love Balls, Lion Studios, Brain It On! or Gravity Well. The Osmos GDC page was an abstract only; Cut the Rope early-days material was press interviews, not a GDC talk.
- Revenue for any of these premium titles was not found and none is stated here.

---

## Q5. Current (2025-2026) market position: physics puzzles versus sort and color puzzles; is "satisfying physics" still a hybrid-casual trend?

### Takeaway
Hybrid-casual puzzle is growing, but the money is in block, screw and sort puzzles; the one physics-flavoured breakout (All in Hole, "Eat & Grow") is a single dominant title in a sub-genre that attracted a flood of clones. I found no publisher statement framing "satisfying physics" as a standalone trend.

### Cited Findings
- AppMagic Q1 2025: top 10 hybrid-casual titles earned $87M net IAP (+67% YoY); puzzle 48% and arcade 45% of revenue; within puzzle, block 71%, screw 20%, sort 9% (sort +5.6x YoY). All in Hole's eat-and-grow model drove a 9x YoY sub-genre revenue surge and 84% of the sub-genre's revenue. (stated, estimates) [Game Industry Library/AppMagic summary](https://gameindustrylibrary.com/writers/appmagic), [Gamigion](https://www.gamigion.com/hole/)
- AppMagic Q2 2025: top 10 earned $126M (+100% YoY); leaders Color Block Jam $42M, Screwdom $27.1M, All in Hole $22.3M on 3.4M installs, Pocket Champs $8.2M, Mob Control $6.5M; puzzles more than 50% of top-10 revenue; 215 games with "hole" in keywords launched January-July 2025 vs 15 in 2024. (stated, estimates) [Game Dev Reports, 2025-09-15](https://gamedevreports.substack.com/p/appmagic-top-10-hybrid-casual-games)
- Only 7 of 240+ eat-and-grow games exceeded $100K monthly revenue. (stated, AppMagic-derived) [Gamigion](https://www.gamigion.com/hole/)
- Rollic and Voodoo hold half the Q2 2025 top 10; SayGames has one title; success is attributed also to UA and trend-aligned themes. (stated) [Mobidictum](https://mobidictum.com/top-10-hybridcasual-games-q2-2025-rollic-voodoo/)
- AppMagic headline: "Moon Active and Supersonic Chasing After Homa's $130M Success", i.e. big publishers pursuing the sub-genre; roughly 120 eat-and-grow releases between 2025 and 2026 with none challenging All in Hole for a long time (search summary of AppMagic pages). [AppMagic](https://appmagic.rocks/blog/eat-and-grow/?hl=en)
- Hybrid-casual was the only casual segment to grow IAP revenue (+20% to $4.2B) and GameRefinery (Dec 2025) expects hybrid-casual puzzle to lead growth in 2026. (secondary, citing Sensor Tower and GameRefinery; primary reports not fetched) [Payoneer](https://www.payoneer.com/vi/resources/industry-pulse/will-hybrid-puzzles-continue-to-boom-in-2026/)
- Pixel Flow (sort/queue puzzle, launched August 2025) reported at $105M in-app revenue within ten months (secondary, unverified). [Game Growth Advisor, 2026-04-16](https://gamegrowthadvisor.com/blog/2026-04-16-hybrid-casual-game-design-strategy-2026/)
- Homa: "hypercasual isn't dead", targets D7 retention of 15% or higher (Aug 2023); Attack Hole 60M+ downloads with a 70/30 ad/IAP split at that time. (stated) [Mobilegamer.biz, 2023-08-08](https://mobilegamer.biz/hypercasual-isnt-dead-for-attack-hole-maker-homa-but-its-evolving/). Hybrid-casual division strategy emphasises IAP and economy testing (Jan 2023). (stated) [Homa blog](https://www.homagames.com/blog/homa-is-doubling-down-on-its-hybridcasual-division-to-boost-engagement--revenue-for-games)
- Homa's Unity case study (UA campaigns June-December 2025): D28 ARPU +14% on US Android and D28 retention +63% versus D7-optimised campaigns, 3x scale. This measures campaign optimisation, not game retention. (stated) [Unity](https://unity.com/resources/homa)
- Mobile ARPDAU of $0.15-$0.50 and D7 of 18-22% for hybrid-casual puzzle are cited by secondary sites without clear primary sources; use with caution. (secondary) [Cinevva guide](https://app.cinevva.com/guides/casual-games-trends-2026), [Game Growth Advisor](https://gamegrowthadvisor.com/blog/2026-04-16-hybrid-casual-game-design-strategy-2026/)

### Inferences
- "Satisfying physics" sells as an ad creative (visual payoff) but the monetising layer in the winning titles is puzzle-style meta: levels, stars, events, passes. Gravity Flow has the former kind of loop and an early version of the latter.
- The hole clone wave (215 launches in seven months) suggests the sub-genre is saturated for new entrants; an attractor game is neither a hole clone nor a sort puzzle, which helps differentiation but means no category-level demand signal is available.
- Sort/block/screw puzzle dominance implies a physics puzzle should not expect hybrid-casual-scale grossing; a modest premium-leaning or light-monetisation target looks more realistic for a tiny team. (inferred)

### Gaps
- Primary Sensor Tower State of Mobile 2026, AppMagic H1 2026 and GameRefinery reports were not retrievable (JavaScript-rendered or PDF viewers); 2026 numbers are secondary.
- No Naavik or Deconstructor of Fun piece on physics/hole puzzles was found. No 2026 statement from Voodoo, SayGames or Supersonic specifically about physics puzzles was found.
- All in Hole's 2026 revenue trend beyond Q3 2025 was not found.

---

## Q6. Which ideas transfer to Gravity Flow's identity, and what would dilute it?

### Takeaway
What transfers: the puzzle-meta wrapper (star packs, short events, daily rewards), generous early economy, the "learn by playing" slow tutorial, one-touch purity and deterministic feel. What dilutes: adding direct-control or draw-line verbs, tilt, consumable boosters that bypass the pull skill, heavy interstitial ads, or chasing the hole/sort trend.

### Cited Findings
- All in Hole pairs a one-minute-to-learn control with levels, stars, difficulty labels, events and a generous first hour; ads are opt-in and the no-ads bundle is $9.99. (stated) [Teardown](https://someselectedstories.substack.com/p/teeny-tiny-teardown-all-in-hole-homa)
- All in Hole includes a "magnet" power-up, showing attraction as a popular verb inside a larger hit. (stated) [Pocket Gamer](https://www.pocketgamer.com/all-in-hole-sinkhole-puzzle/out-now-on-android)
- Orbit's community/sandbox levels and favourites lists extend replay for a physics sim; sandbox is the paid tier. (observed) [App Store](https://apps.apple.com/app/id991457817)
- Cut the Rope uses 3-star scoring and gradual introduction of mechanics, and the studio later said premium cannot simply be converted to F2P. (stated) [Avoision](https://avoision.com/2011/08/20/cut_the_rope_addictive_perfect.php), [Pocket Gamer](https://www.pocketgamer.com/cut-the-rope/15-year-anniversary-interview)
- Gravity Pull (2026) is a direct press-hold gravity-well rival in the endless format with remove-ads at $3.99. (observed) [App Store NZ](https://apps.apple.com/nz/app/gravity-pull/id6758897993)
- Ad frequency is the dominant complaint for Hole.io, Love Balls, Brain It On! and All in Hole. (stated/aggregator) [Hole.io reviews](https://justuseapp.com/en/app/1389111413/hole-io/reviews), [Love Balls](https://apps.apple.com/us/app/-/id1348173937), [Brain It On!](https://justuseapp.com/en/app/985367692/brain-it-on/reviews), [All in Hole vs rivals](https://marlvel.ai/apps/all-in-hole-black-hole-games/vs)

### Inferences
Transfer (mapped to Gravity Flow features):
- Worlds that teach one mechanic each (zones, magnets, portals, moving platforms, hazards, gates) mirror the Cut the Rope "slow tutorial" model; bosses and the par-time star add the mastery loop that the draw-physics games lack.
- Daily challenge and Gravity Run map to All in Hole's daily rewards and short events; consider short, dated Run events or weekly seeds rather than a battle pass at launch.
- Gravity Well's fairness lesson: show reach (already done with the sonar ping), keep force identical across devices (B-03), and keep restarts instant.
- Orbit's "must be experienced" lesson: store creatives and any playable ad should show hold, drag and release in under 10 seconds.
- Premium-leaning monetisation (one remove-ads IAP, cosmetics, opt-in rewarded ads) matches the lowest-complaint comparables (Orbit, All in Hole's opt-in ads) and the 13+ target; avoid forced interstitials after every level (the shared top complaint).

Dilute:
- Any tilt/swipe/direct-ball-control mode, or draw-a-line verbs (Love Balls/Brain It On!), would erase the one-verb identity.
- Consumable boosters that auto-solve (hint beams, magnets that pull for the player) cut against the skill premise, although a hint that visualises a solution path could support learning.
- Rebranding toward sort/color puzzles or hole clones would join saturated categories (215 hole-keyword launches in 7 months of 2025).
- Gravity Run versus Gravity Pull: an endless mode alone is not a differentiator; the campaign (worlds, bosses, stars) is.

### Gaps
- No evidence that stars-per-level or bosses lift retention in physics puzzles specifically; none of the sources report retention for these titles.
- No data on 13+ policy effects on physics-puzzle monetisation (only that Love Balls is 13+ on iOS).
- Level-count and pacing benchmarks (levels per world, difficulty curve shape) are available only anecdotally (Cut the Rope about 200 levels in 2011, Where's My Water? 80 then 500+, Glide 60+, Orbit 45 free).
