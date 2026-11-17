# Plan 3: Scam screening in milliseconds

Working title on the site: **"Can you scam this bank?"**

Depends on `02-platform-and-phone.md` (the fake bank, API conventions, phone setup). Milestones M2, M3, M4 and part of M8 in `README.md`.

## 1. What it is, in one paragraph

Instant payments cannot be pulled back once sent, so a bank has to decide in the moment whether a transfer looks like a scam. This project is that decision engine: every payment is scored by a set of explicit rules and a trained model before any money moves, and the answer comes back in under a millisecond of computing time. Visitors test it by playing the fraudster: they have talked a customer into sending money, and they try to get as much out as they can before the bank catches on. Every successful trick becomes training data for the next model version.

Why it is timely: Canada's Real-Time Rail went live on 9 November 2026 with irrevocable payments and mandatory fraud tools, and the large banks are due to connect in the coming months.

## 2. What a visitor sees

### 2.1 Play (`/play`), phone-first

```
+--------------------------------------------------+
| Can you scam this bank?            Model v3  (?) |
+--------------------------------------------------+
| 1  Pick your victim                              |
| [ Margaret, 71 ]  [ Kevin, 34 ]  [ Aisha, 22 ]   |
|   retired           contractor     student       |
|   $38,400           $12,900        $2,100        |
|   usual: bills under $300, weekday mornings      |
+--------------------------------------------------+
| 2  Pick your story                               |
| ( ) "This is the bank's fraud team" (on a call)  |
| ( ) Romance, built over weeks                    |
| ( ) "Guaranteed" investment                      |
| ( ) Marketplace overpayment                      |
| [x] Coach the victim to ignore warnings          |
+--------------------------------------------------+
| 3  Move the money            Day 1, 10:42        |
| Amount   [ $ 2,400 ]                             |
| Send to  [ Aged personal account (14 months) v ] |
| Wait     [ 0 min ] [ 1 hour ] [ 1 day ] [ 3 days]|
| Memo     [ for my nephew              ]          |
|                 [ Send payment ]                 |
+--------------------------------------------------+
| Timeline                                         |
| 10:42  $2,400  ALLOWED            0.21 ms        |
| 10:43  $2,400  WARNING SHOWN -> victim continued |
| 10:44  $5,000  HELD FOR REVIEW    0.19 ms        |
|        why: new payee, 9x her usual amount,      |
|             payee had 6 senders today            |
+--------------------------------------------------+
| The bank called Margaret. Run over.              |
| You got $4,800 of $38,400.  Rank: 14th           |
| [ Name for leaderboard ] [ Share ] [ Try again ] |
+--------------------------------------------------+
```

Notes on behaviour:

- Play is one payment at a time: send, see what happened, choose the next move.
- Reasons are shown **after** each decision, so players learn and adapt. That is the point of the game and it is what makes the retraining loop interesting.
- The run ends when a payment is held or blocked, when the player cashes out, after eight payments, or after 14 simulated days.
- The result page has its own link so it can be shared.

### 2.2 Live (`/live`)

A scrolling feed of the background payment stream: time, amount, decision, score, top reason, time taken. Beside it, a latency chart (median and 99th percentile, measured on the phone) and three counters: payments screened today, scams stopped, legitimate payments interrupted. Clicking a row opens the full decision: every feature value, which rules fired, and what pushed the model's score up or down.

### 2.3 How it works (`/screening`)

The pipeline as a diagram, the active rules in plain language, the model card (what it was trained on, how it scores on held-out data, known limits), and the version history ("v4: trained on 1,240 visitor attempts; closed the split-payment trick").

### 2.4 Leaderboard

Top 20 for the current model version by fake dollars taken, and the bank's own record: attempts made, share stopped before any money moved, total protected, total lost.

## 3. How a payment is decided

```
request -> validate -> idempotency check -> load state for payer and payee
        -> compute features -> rules -> model score -> decision policy
        -> persist decision (+ post to ledger if money moves) -> respond
```

Decisions, in rising severity:

| Decision | Meaning | In the game |
|---|---|---|
| ALLOW | Money moves, irrevocably | Counts as taken |
| CHALLENGE | The customer sees a scam warning and must confirm | The victim continues or backs out (see 6.4) |
| HOLD | Payment frozen for an analyst to review | Run over. Also creates a case for the AML desk |
| BLOCK | Refused | Run over |
| DECLINE | A plain limit was hit, such as the daily cap | Not fraud; run continues |

The final decision is the most severe of what the rules say and what the model's score band says. Every decision stores which rules fired and the model's top three contributing features, so each one can be explained.

## 4. Features (version 1)

All windows are measured in simulated transaction time. "Payer" is the customer sending; "payee" is the receiving account.

| # | Feature | Definition |
|---|---|---|
| 1 | `amount` | Payment amount in dollars |
| 2 | `amount_vs_usual` | Amount divided by the payer's 95th-percentile outgoing amount over 90 days |
| 3 | `amount_share_of_balance` | Amount divided by current balance |
| 4 | `payee_is_new` | First ever payment from this payer to this payee |
| 5 | `payer_prior_payments_to_payee` | Count of earlier payments to this payee |
| 6 | `payer_new_payees_24h` | New payees this payer paid in the last 24 hours |
| 7 | `payer_new_payees_7d` | Same over 7 days |
| 8 | `payer_out_count_1h` | Outgoing payments in the last hour |
| 9 | `payer_out_count_24h` | Outgoing payments in the last 24 hours |
| 10 | `payer_out_sum_24h` | Outgoing dollars in the last 24 hours |
| 11 | `payer_new_payee_outflow_share_24h` | Dollars to new payees in 24 hours, as a share of the balance at the start of that window |
| 12 | `payer_hour_unusualness` | How far this hour of day is from the payer's usual hours |
| 13 | `payer_account_age_days` | Age of the paying account |
| 14 | `payer_is_senior` | Payer aged 65 or over |
| 15 | `payer_warnings_overridden_7d` | Scam warnings this payer clicked past recently |
| 16 | `session_on_call` | The customer is on a phone call while paying |
| 17 | `session_remote_access` | Remote-access software detected in the session |
| 18 | `session_new_device` | First payment from this device |
| 19 | `payee_account_age_days` | Age of the receiving account |
| 20 | `payee_senders_24h` | Distinct accounts that paid this payee in 24 hours |
| 21 | `payee_senders_7d` | Same over 7 days |
| 22 | `payee_in_sum_24h` | Dollars received by the payee in 24 hours |
| 23 | `payee_outflow_ratio_24h` | Dollars out divided by dollars in, over 24 hours (a pass-through sign) |
| 24 | `payee_median_hold_minutes` | Median time money stays in the payee account before leaving |
| 25 | `payee_is_business` | Receiving account is a business account |
| 26 | `payee_on_risk_list` | Payee has earlier fraud reports |
| 27 | `name_match` | Similarity between the name the payer typed and the account holder's name, 0 to 1 |
| 28 | `memo_flags` | Count of risk keywords in the memo (a short fixed list) |

Design rules for the feature code:

- One `FeatureExtractor` is used for live payments, for the game, and for exporting training data, so training and serving can never disagree.
- State sits behind a `FeatureStore` interface with two implementations: the shared live one (concurrent, per-account locks, bounded memory) and a private one per game attempt.
- After a restart the live store is rebuilt by replaying the last 90 days of transactions from PostgreSQL through the same update code. A test proves replayed state equals live state.
- Feature 14 uses age. The model card must say so, and the Live page should report how often legitimate payments are interrupted for each age band, so any unfair extra friction on older customers is visible and can be corrected.

## 5. Rules and model

### 5.1 Rules (version 1)

| Rule | Condition | Action |
|---|---|---|
| R1 | Payee is on the risk list | BLOCK |
| R2 | Payer's 24-hour total plus this amount exceeds the daily limit ($10,000 retail, $25,000 business) | DECLINE |
| R3 | On a call, new payee, amount $500 or more | CHALLENGE; HOLD from $3,000 |
| R4 | Remote access detected and new payee | HOLD |
| R5 | Payee had 5 or more senders in 24 hours and is under 30 days old | HOLD |
| R6 | New payee, amount at least 5 times the payer's usual and at least $1,000 | CHALLENGE |
| R7 | Payer paid 3 or more new payees in 24 hours | CHALLENGE |
| R8 | Dollars to new payees in 24 hours reach 60% of the opening balance | HOLD |
| R9 | Payee forwarded 90% or more of at least $5,000 received in 24 hours | HOLD |
| R10 | Name match under 0.5, new payee, amount $1,000 or more | CHALLENGE |

Rules live in a versioned file in the repo, load at start-up, and are published on the How it works page. They are deliberately easy to read and easy to dodge. The model exists to catch what gets around them.

### 5.2 Model

- **Algorithm:** gradient-boosted decision trees (LightGBM), binary: scam or not.
- **Training data:** the world generator's legitimate payments plus injected scam scenarios, exported with their features by the Java `FeatureExtractor`. From version 2 on, visitor attempts are added as labelled scams.
- **Scam scenarios in the generator:** bank or tax-agency impersonation, romance, investment, emergency ("grandparent"), marketplace and job scams, and mule accounts cashing out. Parameters come from public descriptions such as the Canadian Anti-Fraud Centre's scam pages. No real bank's rules or data are used.
- **Split:** by time and by customer, so no customer appears in both training and validation.
- **Thresholds:** chosen on validation data to respect a friction budget on legitimate payments: at most 0.5% challenged, 0.1% held, 0.01% blocked. The live page shows the measured rate.
- **Export:** the trained trees are written to a JSON file (feature index, threshold, children, leaf value per node).
- **Serving:** a pure-Java scorer of roughly 150 lines loads that file into flat arrays and walks the trees. No native library.
- **Parity test:** 10,000 rows scored in Python are saved as a fixture; the Java scorer must match each to within 0.000001. This runs in CI on every model change.
- **Explanations:** while walking each tree the scorer adds the change in expected value at each split to that split's feature. The three largest totals become the reasons shown to the player.
- **Versioning:** each model file carries a version, training date, data sizes, metrics and a hash. The app refuses a file that fails its hash or the parity check.

Honest limit to state on the model card: the model learns from a simulator and from visitors, not from real fraud. It demonstrates the system and the method, not real-world accuracy.

### 5.3 Learning from players (milestone M8)

1. A management command exports finished game attempts with their features.
2. The `ml.yml` workflow retrains with those attempts added and opens a pull request containing the new model file and a comparison table: scam recall, legitimate friction, and how many past winning attempts the new model would have stopped.
3. The new model must stay inside the friction budget or the workflow fails.
4. Before promotion it runs in shadow on the phone for a day: the live stream is scored by both models, only the current one decides, and the differences are logged.
5. Bhawar merges, tags a release and updates the phone. The leaderboard starts fresh for the new version; old boards stay viewable.

## 6. Game design

### 6.1 Victims

| Persona | Balance | Normal behaviour | Daily limit |
|---|---|---|---|
| Margaret, 71, retired | $38,400 | Bills under $300, weekday mornings, four known payees | $10,000 |
| Kevin, 34, contractor | $12,900 | Irregular supplier payments up to $4,000, any hour | $10,000 |
| Aisha, 22, student | $2,100 | Small transfers to friends, evenings | $3,000 |

### 6.2 Where the money can go

| Receiving account | What the bank can see about it |
|---|---|
| Fresh account | Opened 3 days ago, no history |
| Aged personal account | 14 months old, ordinary salary and spending |
| Busy mule | 30 days old, six senders in the last day, money leaves within the hour |
| Small business account | Two years old, receives many payments as normal trade |

### 6.3 Stories

| Story | Effect on what the bank sees |
|---|---|
| Bank or tax-agency impersonation | Victim is on a call during the payment |
| Romance | No call; victim acts alone; payments spread over days |
| Investment | Victim is willing; repeated top-ups |
| Marketplace overpayment | Small amounts; name on the account does not match |

### 6.4 When the bank shows a warning

A CHALLENGE asks the victim to confirm. Whether the victim continues is decided by a fixed table (for example impersonation with coaching 70%, marketplace without coaching 30%) and a random draw seeded by the attempt id and step number, so the same attempt always replays the same way. Each warning clicked past raises feature 15 for later payments.

### 6.5 Limits and fairness

- At most 8 payments and 14 simulated days per attempt; amounts from $1 to $50,000; memo up to 80 characters.
- Each attempt runs in its own private copy of the victim's and receivers' state, so one visitor cannot affect another or the shared world.
- The same engine, rules and model version serve the game and the live stream. A test asserts this.
- Score is fake dollars that left irrevocably. Ties go to the earlier attempt.

### 6.6 Tuning

Game balance cannot be planned on paper. Before launch, script 20 strategies (all at once, slow drip, split across receivers, wait three days, and so on) and check that the outcome spread is interesting: some money gets through, but nobody empties an account with an obvious move.

## 7. API

All under `/lab/v1`. "Internal" means not reachable through the tunnel.

| Method and path | Access | Purpose |
|---|---|---|
| `POST /payments` | Internal | Submit a payment into the shared world. Requires `Idempotency-Key`. Used by the background stream |
| `GET /payments/stream` | Public, SSE | Live decisions. Opening it starts the background stream |
| `GET /payments/{id}` | Public | One decision in full: features, rules, model contributions, timings |
| `GET /screening/latency` | Public | Histogram buckets and percentiles for the chart |
| `GET /screening/rules` | Public | Active rule set with plain-language descriptions |
| `GET /screening/model` | Public | Model card and version history |
| `GET /game/config` | Public | Personas, receiving accounts, stories, limits, current model version |
| `POST /game/attempts` | Public | Start an attempt: persona, story, coached flag. Returns the attempt id and opening state |
| `POST /game/attempts/{id}/steps` | Public | Send one payment. Returns the decision and updated state |
| `POST /game/attempts/{id}/finish` | Public | Cash out |
| `GET /game/attempts/{id}` | Public | Full timeline, for the shareable result page |
| `PUT /game/attempts/{id}/nickname` | Public | Put a name on a finished attempt |
| `GET /game/leaderboard` | Public | Top 20 and the bank's record; `?modelVersion=` for older boards |

The attempt id is a long random value and acts as the key to that attempt; nothing else identifies the player.

Example: send one payment in the game.

```http
POST /lab/v1/game/attempts/att_9fK2mQx7Lp/steps
Content-Type: application/json

{ "amountCents": 240000, "receiverId": "rcv_aged_personal", "waitMinutes": 0, "memo": "for my nephew" }
```

```json
{
  "step": 2,
  "simTime": "2026-03-02T15:43:00Z",
  "decision": "CHALLENGE",
  "challenge": { "shown": true, "victimContinued": true },
  "moneyMoved": true,
  "score": 0.41,
  "reasons": [
    { "code": "R6", "text": "New payee and 8 times her usual amount" },
    { "code": "payer_new_payee_outflow_share_24h", "text": "13% of her balance has gone to new payees today" }
  ],
  "screeningMicros": 212,
  "state": { "takenCents": 480000, "balanceCents": 3360000, "stepsLeft": 6, "status": "IN_PROGRESS" }
}
```

Example: the internal payment call.

```http
POST /lab/v1/payments
Idempotency-Key: 5b1c0a4e-7d2f-4c19-9a53-0f6f2a1d9e77
Content-Type: application/json

{ "sourceAccountId": "acc_31Hd…", "payeeAccountId": "acc_8Qw2…", "amountCents": 125000,
  "memo": "rent", "channel": "MOBILE", "session": { "onCall": false, "remoteAccess": false, "newDevice": false } }
```

```json
{ "id": "pay_7Hq2…", "decision": "ALLOW", "score": 0.02, "rulesFired": [], "screeningMicros": 187, "totalMicros": 6140, "modelVersion": "v3" }
```

## 8. Data added by this project

| Table | Key columns |
|---|---|
| `payment_request` | In the platform plan; this project fills it |
| `game_attempt` | id, public_id, visitor_id, persona, story, coached, model_version, rules_version, status, taken_cents, started_at, finished_at, nickname, hidden |
| `game_step` | attempt_id, step_no, sim_time, amount_cents, receiver, memo, features jsonb, decision, score, reasons jsonb, challenge_shown, victim_continued, money_moved, screening_micros |
| `model_version` | version, file_hash, trained_at, metrics jsonb, notes, active |
| `shadow_score` | payment_request_id, model_version, score, decision (only while a shadow run is on) |

## 9. Speed

Targets on the phone:

| Measure | Target | Evidence so far |
|---|---|---|
| Model score alone | under 50 microseconds | 8.5 microseconds measured on the phone for 300 trees of depth 6 |
| Screening (features, rules, model) p99 | under 1 ms | Not yet measured |
| Whole payment including database commit, p99 | under 25 ms | Not yet measured; a bare HTTP round trip on the phone took 1.1 ms median |

How to keep it fast:

- Screening touches memory only. The only disk write is the final commit of the decision and ledger entries.
- State is keyed by account and guarded by a per-account lock, so unrelated payments never wait on each other.
- Timings are taken with `System.nanoTime()` around the screening call and around the whole request, recorded in percentile histograms, and returned in each response.
- A JMH benchmark for the scorer and a small load test for the payment endpoint run on the phone; their results go in the README with the date and the device.

What the visitor's browser sees also includes the internet round trip to the phone through the tunnel, typically tens to hundreds of milliseconds. The page labels the two numbers separately so the claim stays honest.

## 10. Tests

- Feature windows at their edges, in simulated time.
- Every rule, with one case just under and one just over each threshold.
- Scorer parity with Python.
- Decision policy: the most severe outcome wins; reasons are always present.
- Idempotency: the same key twice returns the same payment and posts to the ledger once.
- Property tests: books always balance; replayed feature state equals live state; the same state and payment always give the same decision.
- Restart recovery against real PostgreSQL in Testcontainers.
- Golden game attempts: fixed attempts with a pinned model give fixed outcomes.
- A test that the game and live paths call the same engine.
- Playwright: play one full game on a phone-sized screen.

## 11. Milestones

| Milestone | Contents | Done when |
|---|---|---|
| M2 Screening v1 | Feature store, extractor, rules, decision policy, internal payments API, background stream, Live page | The Live page shows real decisions and latency from the phone, with rules only |
| M3 Model | Training export, Python training, tree scorer, parity test, model card, How it works page | A trained model decides alongside the rules and CI proves Java and Python agree |
| M4 Game | Sandbox world, attempt API, Play page, result page, leaderboard, rate limits, name filter | A stranger can play on a phone and land on the leaderboard. Then add the portfolio card |
| M8a Learning loop | Attempt export, retraining workflow, shadow mode, version history | Model v2 is trained with visitor attempts and promoted through the workflow |

## 12. Not in scope

- Real payment rails, real ISO 20022 messages, real customer data.
- User accounts and login.
- Any claim about real-world fraud detection accuracy.

## 13. What this gives Bhawar to talk about

- Why screening has to finish before the payment does, and what irrevocable means for the design.
- Keeping training and serving features identical by sharing one extractor.
- Why the scorer is hand-written Java instead of a native runtime, and how parity is proven.
- Event-time windows and deterministic replay after a crash.
- Friction budgets: catching scams is easy if you block everyone, so the false-positive rate is a first-class number.
- Promoting a model safely: retrain, compare, shadow, then switch.
- Measured latency on a phone, with the method shown.
