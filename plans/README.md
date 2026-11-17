# Fincrime Lab: plan overview

Written 2026-11-16. Start here. This folder is planning material and is not meant to be committed to the public portfolio repo; the project plans move into the new project repo's `docs/plans/` once it exists.

## What is being built

1. **Portfolio cleanup.** Five student projects come off the portfolio.
2. **Scam screening in milliseconds.** A payment screening engine (rules plus a trained model) with a game where visitors play the fraudster.
3. **AML investigator with a public scorecard.** An AI investigator that drafts case reports, a checker that verifies every claim, and published scores.

Projects 2 and 3 share one small fake bank, one Java application and one Angular site. A payment held by project 2 becomes a case in project 3.

| File | What it covers | Who it is for |
|---|---|---|
| `01-portfolio-cleanup.md` | Removing the five projects, and the two future cards | An agent in the `portfolio` repo; self-contained |
| `02-platform-and-phone.md` | Repo, fake bank, API conventions, Angular shell, security, CI, phone hosting | Read before 03 and 04 |
| `03-scam-screening.md` | Screening engine, model, game, APIs, tests | An agent in the new repo, after M1 |
| `04-aml-investigator.md` | Cases, investigator, checker, evals, scorecard, APIs, tests | An agent in the new repo, after M1 |

## Decisions made on 2026-11-16

| Question | Decision |
|---|---|
| Which old projects go | Remove Flappy Bird, Weather App, Twitter Clone API, School Management System, Smart Home Manager. Keep E-commerce, Expense Manager, MovieRating, Emotion Detector |
| AI model for the investigator | Both: the phone's Gemma and Claude, compared on the scorecard |
| Frontend | Angular, as its own site on a subdomain, in the new repo |
| Java on the phone | Approved and installed (OpenJDK 21.0.13) |

Working names, all open to change: repo `fincrime-lab`, bank "Sandbox Bank", site `lab.bhawargujral.com`, pages "Can you scam this bank?" and "AML Case Desk".

## What was tested, and what it means

All on 2026-11-16, on the Pixel 7 with the chatbot, guestbook and tunnel running.

| Test | Result | Meaning |
|---|---|---|
| Installing Java and PostgreSQL (simulated first) | 42 new packages, nothing existing upgraded or removed | Safe to add beside the live services |
| Java 21 install | Done; all four live services stayed up | The phone can run the backend |
| Scoring one payment with a 300-tree model in plain Java | 8.5 microseconds (p99 13) on the phone; 3.4 on the Mac | "Milliseconds" is easily true; the model is not the bottleneck |
| HTTP round trip on the phone | Median 1.1 ms, p99 3.1 ms, client and server both on the phone | A full request should stay in low single-digit milliseconds before the database commit |
| A first run of that HTTP test | 49 ms median | Caused by a network setting in the JDK's test server, not the phone. Spring's server does not have this problem, but check `TCP_NODELAY` if latency ever looks like a flat 40 ms |
| Phone memory | 7.5 GB total; 1.4 to 1.7 GB available; swap 77% to 98% used | Room for one Java process and PostgreSQL, but tight. This is the main risk |
| Phone model, AML verdicts | Right call on all four invented cases when it answered | Good enough to be a contestant |
| Phone model, forced JSON schema | 4 of 8 runs returned an empty answer | Do not use the schema constraint; ask for JSON and validate in code |
| Phone model, tool call | Correct first tool call in 5 seconds | Tool calling works, but each step is slow |
| Phone model speed | 14 to 28 seconds per case; about 68 tokens a second reading, 8 writing; 4,096-token window | Fine for a nightly batch, too slow for a live multi-step agent |

The test files are on the phone in `~/spike-bank/` (`Bench.java`, `aml_spike.py`, `aml_debug.py`) and can be re-run or deleted.

## What is possible, and what is not

Possible on the phone:

- One Spring Boot application plus PostgreSQL, behind the existing tunnel.
- Screening payments in well under a millisecond of computing time.
- A live stream of decisions to visitors, and the game.
- Serving cases and evidence.
- Running the small model over the eval cases at night.

Not on the phone, and what is done instead:

| Not possible or not wise | Instead |
|---|---|
| Kafka, or several microservices | One modular application; events between modules through an outbox table |
| Training the model | Train on the Mac or in GitHub Actions; ship the trained file |
| Native ML runtimes such as ONNX Runtime | A small scorer written in plain Java |
| A live multi-step AI agent for each visitor | Replay recorded runs; they cost nothing and never fail |
| Calling Claude from the phone | Claude runs only in GitHub Actions; the key never touches the phone |
| A GitHub runner on the phone | The phone pulls a release and checks its checksum |
| Letting visitors upload files or write prompts | Fixed inputs only |

Not yet known, to be settled in the first milestone:

1. Whether the phone stays healthy for 24 hours with the Java app, PostgreSQL and the chatbot all in use. A soak test with pass marks is defined in `02-platform-and-phone.md`, with fallbacks down to "move the Java app to a free cloud VM".
2. Memory and start-up time of a real Spring Boot app on the phone.
3. PostgreSQL running under Termux (expected to work; not yet installed).
4. Whether a nightly eval run slows the chatbot's first answer afterwards by pushing its cached prompt out.
5. Real Claude cost per case. Estimates are in `04-aml-investigator.md`; measure on five cases first.
6. Game balance. It needs tuning against scripted strategies and then real players.

## What you need to gather

Accounts and settings (yours to do):

- [ ] **Anthropic API key** from the Anthropic Console, with a **monthly spend limit** set. $20 is plenty to start.
- [ ] **New public GitHub repo** (working name `fincrime-lab`), with Pages enabled and the API key saved as the Actions secret `ANTHROPIC_API_KEY`.
- [ ] **One DNS record in Cloudflare**: CNAME `lab` pointing at `bhawargujral.github.io`, with the same proxy setting as the main site's records.
- [ ] **Final names**: repo, fake bank, subdomain, the two page titles.

On the Mac:

- [ ] **JDK 21.** Only JDK 17 is installed.
- [x] Maven 3.9.11, Docker, Node 22, Python 3.14 with `uv`: already there.
- [ ] Optional: the GitHub CLI `gh`, which is not installed.

On the phone:

- [x] Java 21: installed.
- [ ] PostgreSQL: `pkg install postgresql`, about 31 MB.
- [ ] Two new services and one tunnel rule: described in `02-platform-and-phone.md`.
- [ ] Recommended first: move your parents' banking apps to another phone, and remove unused apps and the live wallpaper to free memory.
- [ ] Keep it on the charger, as now.

Content only you can supply:

- [ ] Two or three sentences for the lab's About page, in your own voice.
- [ ] For the capstone card, if you want it: a repo link or permission to describe it without one, a screenshot, and two sentences.
- [ ] About an hour, once, to label 50 report claims by hand if the AI judge in milestone M8 is built.

Nothing in this plan costs money except the Claude API. The domain, tunnel, Pages and Actions for a public repo are free.

## Order of work

Estimates are rough and assume sessions of two to three hours with an agent writing the code.

| # | Milestone | Detail in | Rough size | Done when |
|---|---|---|---|---|
| M0 | Portfolio cleanup | 01 | 1 session | Five cards remain; lint and build pass |
| M1 | Platform: repo, fake bank, API basics, Angular shell, phone deploy, soak test | 02 | 4 to 6 sessions | The health endpoint answers from the phone, the site loads, a soak test passes |
| M2 | Screening with rules, live stream, Live page | 03 | 4 to 5 sessions | Real decisions and latency from the phone |
| M3 | Trained model, Java scorer, parity test, model card | 03 | 3 to 4 sessions | Model decides beside the rules; Java and Python agree in CI |
| M4 | The game and leaderboard | 03 | 4 to 5 sessions | A stranger can play on a phone. **Add the first portfolio card** |
| M5 | Cases, alerts, queue and case pages | 04 | 3 to 4 sessions | Cases and evidence browsable |
| M6 | Investigator on both models, report, checker | 04 | 4 to 5 sessions | Checked reports for the development cases |
| M7 | Eval harness, CI gate, scorecard, replay | 04 | 4 to 6 sessions | Scorecard public; pull requests get a comparison. **Add the second portfolio card** |
| M8 | Learning loop for screening; Claude agent mode and judge for the investigator | 03, 04 | 5 to 8 sessions | Model v2 promoted through the workflow; agent rows on the scorecard |
| M9 | READMEs, architecture write-up, decision records, a short demo video | all | 2 to 3 sessions | A recruiter can understand each project in one minute |

M0 is independent and can be done first, tomorrow. M2 to M4 and M5 to M7 both depend on M1 but not on each other, so after M1 either project can go first. Starting with screening is suggested because the game is the faster path to something a visitor can play.

## Ground rules for whoever builds this

- Everything is synthetic and built from public knowledge. Nothing comes from Bhawar's employer or its client: no code, no rules, no documents, no data. The client bank is never named.
- Each site page says the bank is fictional. Nothing claims real-world accuracy or regulatory compliance.
- The portfolio stays about Bhawar. On his site these are two project cards; "runs on my phone" is a footnote.
- Numbers shown to visitors are measured, dated, and say what device they came from.
- No commit, push, deploy to the phone or paid API run without Bhawar saying so.

## Background links

- [Canada launches the Real-Time Rail (Payments Canada release, 2026-11-09)](https://www.globenewswire.com/news-release/2026/11/09/3398119/0/en/canada-launches-the-real-time-rail-bringing-24-7-payment-infrastructure-to-the-national-economy.html)
- [Real-Time Rail fraud services (Payments Canada)](https://www.payments.ca/systems-services/payment-systems/real-time-rail-payment-system/rtr-fraud)
- [Mandatory fraud tools, no scam refund rule (Tech Times)](https://www.techtimes.com/articles/330370/20261110/canada-launches-real-time-rail-instant-payments-mandatory-fraud-tools-no-scam-refund-rule.htm)
