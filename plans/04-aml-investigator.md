# Plan 4: AML investigator with a public scorecard

Working title on the site: **"AML Case Desk"**

Depends on `02-platform-and-phone.md`. Milestones M5, M6, M7 and part of M8 in `README.md`.

## 1. What it is, in one paragraph

When a bank's monitoring flags an account, an analyst has to work out whether the activity is suspicious and, if it is, write it up. This project automates the first draft: an AI investigator reads the flagged case, gathers the evidence, decides whether to escalate or close, and writes a short report in which every statement points at the transactions that support it. A checker recomputes every number in the report against the data. A human then approves, edits or rejects. The part most projects skip is the scorecard: the investigator is run against a set of cases with known answers, and its accuracy, unsupported claims, time and cost per case are published and re-measured on every change.

Decision already made: the scorecard compares the small model on the phone with Claude, side by side.

Vocabulary used correctly matters here. In Canada a bank reports to FINTRAC with a Suspicious Transaction Report when it has reasonable grounds to suspect money laundering or terrorist financing. This project drafts the analyst's write-up; it files nothing. The agent building the site copy should check wording against FINTRAC's public guidance before publishing.

## 2. What a visitor sees

### 2.1 Case queue (`/cases`)

A table of open alerts: case id, customer type, what triggered it, amount involved, age, and the investigator's recommendation with a confidence band. Filters by trigger and recommendation.

### 2.2 Case view (`/cases/:id`)

```
+--------------------------------------------------------------------------------+
| case_4Tq9  Many incoming transfers from unrelated senders      Opened 3 days   |
+--------------------------------------+-----------------------------------------+
| EVIDENCE                             | INVESTIGATOR REPORT   [Claude v] [Replay]|
| Customer: student, 20, no stated     | Recommendation: ESCALATE                 |
|  income, account opened 2025         | Pattern: rapid movement of funds         |
| Usual: balance under $600, no        |                                          |
|  transfers over $200                 | 1. Fourteen senders paid in $23,400      |
|                                      |    over two days.            [verified]  |
| [chart: money in and out per day]    | 2. Each amount left within an hour to    |
|                                      |    the same exchange.        [verified]  |
| Transactions            filter [   ] | 3. Nothing in the profile explains       |
|  Oct 11 09:02  in   $1,900  A.Brown *|    the volume.               [profile]   |
|  Oct 11 09:31  out  $1,850  CoinNorth*| 4. Total sent out was $31,000.          |
|  Oct 11 11:15  in   $2,400  S.Okafor*|                   [MISMATCH: data says   |
|  ...                                 |                    $22,950]              |
| (* = cited by the claim you hover)   |                                          |
|                                      | Checked: 4 claims, 3 supported, 1 wrong  |
| [who paid whom: flow diagram]        |                                          |
+--------------------------------------+-----------------------------------------+
| Your call:  [ Approve ]  [ Edit ]  [ Reject ]     then see the correct answer  |
+--------------------------------------------------------------------------------+
```

- Hovering a claim highlights the transactions it cites. Each claim carries a badge: verified, mismatch, unsupported, or profile-based.
- A selector switches between contestants' reports for the same case, so a visitor can compare the phone model with Claude on identical evidence.
- **Replay** steps through how the report was produced: each model call, each tool call and what came back, with time and tokens.
- A visitor can make the analyst's call. After they choose, the page reveals the known answer for that case.

### 2.3 Scorecard (`/scorecard`)

```
+----------------------------------------------------------------------------------------------+
| Scorecard          dataset v1: 80 test cases, 3 runs each          last run: 2026-12-04      |
+----------------------+--------+---------+----------+-----------+--------+--------+-----------+
| Contestant           | Right  | Missed  | False    | Unsup-    | Broken | Time / | Cost /    |
|                      | call   | launder.| alarms   | ported    | output | case   | case      |
+----------------------+--------+---------+----------+-----------+--------+--------+-----------+
| Always escalate      |  50%   |   0%    |  100%    |    n/a    |   0%   |   0 s  | $0        |
| Simple rules         |  ..    |   ..    |   ..     |    n/a    |   0%   |   0 s  | $0        |
| Phone model, fixed   |  ..    |   ..    |   ..     |    ..     |   ..   |  ~20 s | $0        |
| Claude Haiku, fixed  |  ..    |   ..    |   ..     |    ..     |   ..   |   ..   | $..       |
| Claude Haiku, agent  |  ..    |   ..    |   ..     |    ..     |   ..   |   ..   | $..       |
| Claude Opus, agent   |  ..    |   ..    |   ..     |    ..     |   ..   |   ..   | $..       |
+----------------------+--------+---------+----------+-----------+--------+--------+-----------+
| each figure shown with its margin of error; click a row for per-case results                 |
| [chart: right-call rate per contestant across the last 20 changes]                           |
+----------------------------------------------------------------------------------------------+
```

The scorecard page is built from static result files, so it works even when the phone is offline.

## 3. Cases and ground truth

### 3.1 Patterns

Each suspicious pattern has benign look-alikes, because the hard part of the job is telling them apart.

| Suspicious pattern | Benign look-alikes in the set |
|---|---|
| Structuring: cash deposits kept just under $10,000 across branches and days | Restaurant or shop with steady cash takings that match its history |
| Rapid movement: many unrelated senders in, straight out to one destination | Student collecting trip money and paying a venue; flatmates paying rent through one person |
| Funnel account: cash deposited in several cities, withdrawn somewhere else | Travelling tradesperson; business with several locations |
| Funds that do not fit the profile, sent on quickly to a high-risk destination | International student funded by parents, noted at onboarding; house sale proceeds |
| Round-tripping through related accounts with no purpose | Regular transfers between a couple's own accounts |
| Dormant account that suddenly carries high volume | Seasonal worker; someone back from months abroad |

A few cases mix both, for example a real restaurant that also structures deposits at other branches. Those are the hard tier.

### 3.2 How cases are made

- The world generator's scenario injectors create each case from a template and a seed, and record the answer in the `scenario` table: suspicious or not, the pattern, and exactly which transactions belong to it.
- Simple monitoring rules then scan the world and raise alerts, the way a bank's system would. An alert on a customer with an injected scenario becomes a labelled case; alerts on ordinary customers become benign cases.
- Payments held by the screening engine (Plan 3) also arrive here as cases through an internal event, which links the two projects.

### 3.3 The dataset

| Property | Value |
|---|---|
| Size | 120 cases: 40 for development, 80 held out for the published score |
| Balance | Half suspicious, half benign |
| Tiers | Easy, medium, hard, spread evenly across patterns |
| Split | Random within each pattern. Prompts are tuned on the 40 only. The 80 are never used for tuning |
| Versioning | The dataset has a version. Changing a case or a grader makes a new version, and scores from different versions are never compared |

Rules that keep the numbers honest:

- **No answers in reach.** Scenario labels never appear in a prompt, a tool result or a public response. A test scans for them.
- **Answers are checked.** Every case has a reference answer that must pass the graders. Ten cases are re-derived by hand before the first paid run.
- **Fix the generator, not the case.** If a case turns out ambiguous, the template is fixed and the set regenerated under a new version.
- **Both directions.** With half the set benign, "escalate everything" scores 50%, and that baseline is on the scorecard for everyone to see.

## 4. The investigator

Two ways of working, both reported.

### 4.1 Fixed pipeline (runs on the phone model and on Claude)

1. Code gathers a fixed evidence pack: the alert, the customer profile, a 12-month baseline summary, up to 40 transactions from the alert window (all that match the trigger, then the largest, then a sample), and a per-counterparty summary. It is capped at about 2,600 tokens so it fits the phone model's 4,096-token window.
2. One model call turns the pack into a report.
3. The checker verifies the report.

Every contestant on the fixed pipeline sees exactly the same pack, so the comparison is like for like.

### 4.2 Agent (Claude only)

The model starts with only the alert and a set of tools, and decides what to look at.

| Tool | Arguments | Returns |
|---|---|---|
| `get_customer_profile` | case id | Segment, age band, occupation, stated income, onboarding notes |
| `get_account_summary` | account id, months | Monthly totals in and out by transaction type |
| `list_transactions` | account id, from, to, type, min amount, page | Up to 50 transactions a page |
| `aggregate_transactions` | account id, from, to, group by (counterparty, day, type, location) | Count, total, smallest, largest per group |
| `get_counterparty` | party id | What the bank knows about the other side |
| `get_prior_alerts` | customer id | Earlier alerts and how they were closed |
| `submit_report` | the report (schema below) | Ends the run |

Limits: 12 model calls, a wall-clock ceiling of 120 seconds per case, and tool results capped in size. There is no free-form SQL tool.

### 4.3 The report

```json
{
  "disposition": "ESCALATE",
  "pattern": "RAPID_MOVEMENT",
  "confidence": "HIGH",
  "summary": "Three to five sentences an analyst can read in twenty seconds.",
  "claims": [
    {
      "id": "c1",
      "text": "Fourteen different senders paid in $23,400 between 11 and 12 October.",
      "evidence": ["txn_81Ha", "txn_81Hb", "..."],
      "checks": [
        { "type": "count_distinct_counterparties", "value": 14 },
        { "type": "sum", "value": 23400.00 },
        { "type": "date_range", "from": "2026-10-11", "to": "2026-10-12" }
      ]
    },
    {
      "id": "c3",
      "text": "Nothing in the customer's profile explains this volume.",
      "evidence": ["PROFILE.occupation", "PROFILE.stated_income", "BASELINE.transfers_12m"],
      "checks": []
    }
  ],
  "questions_for_customer": []
}
```

`disposition` is ESCALATE or CLOSE. `pattern` is one of the six patterns or NONE.

### 4.4 The checker

Plain Java, no model involved.

- Every evidence id must exist and belong to this case.
- Each declared check is recomputed over the cited transactions: count, distinct counterparties, sum, smallest, largest, date range, distinct locations. Counts must match exactly; sums to the dollar.
- Every number that appears in a claim's text must be covered by one of its checks or be the amount of a cited transaction. This catches figures slipped into prose.
- Each claim ends up as verified, mismatch, unsupported, or profile-based (no numbers, cites profile fields only).

**Unsupported-claim rate** = (mismatch + unsupported) divided by all claims. This is the number that answers "does it make things up?"

A model-based judge for the non-numeric claims is a later addition (M8), and only after it has been checked against about 50 claims Bhawar has labelled by hand.

### 4.5 Talking to the models

One interface, `ModelClient`, with two implementations.

**Claude**, through the official Java SDK:

- Models: `claude-haiku-5-5` for the cheap contestants and every pull-request run; `claude-opus-5-5` for the headline agent, run weekly or by hand.
- These models reject `temperature` and similar settings, so runs cannot be made deterministic. That is why each case is run three times and the spread is reported.
- Thinking is on by default on both; set `effort` explicitly and record it with each run.
- Forcing a specific tool is rejected on Opus 5.5. Use automatic tool choice, strict tool schemas, and an instruction to finish with `submit_report`.
- The fixed pipeline uses structured output so the report always parses.
- Always read `stop_reason` before the content. A refusal or a cut-off answer is recorded as its own outcome.
- **No automatic fallback to another model during eval runs**, so a score is never produced by a different model than the one named. Each response's `model` field is asserted.
- Cache the system prompt and tool definitions, and confirm cache hits in the usage numbers.
- The hand-written tool loop is preferred over the SDK's beta tool runner here, because every step has to be logged for the replay.
- The Batch API halves the price and suits the fixed pipeline's single calls. It does not suit the agent loop.

**Phone model**, through llama-server's chat endpoint on `127.0.0.1:8080`:

- Send `chat_template_kwargs: {"enable_thinking": false}`, temperature 0, at most 500 output tokens.
- **Do not use the server's JSON-schema constraint.** In the 2026-11-16 test it produced empty answers in 4 of 8 runs because the output leaked into the model's thinking channel. Ask for JSON in the prompt, strip code fences, validate against the schema in Java, and allow one repair retry.
- Tool calling worked in the test, but the agent mode is not planned for this model: the context window is too small and each call takes 15 to 30 seconds.

## 5. The human step

- Approve, edit or reject, each with a note. Stored with who, when, the report id, the code version, the prompt hash, the model id and the dataset version.
- Public visitors act in a sandbox: their decisions are stored against their visitor id and marked as such, and never change the case.
- Version 1 has no login. A maker-checker flow with roles is a possible later addition and would draw on his OAuth2 experience.

## 6. The eval harness

### 6.1 Contestants

| Contestant | Purpose |
|---|---|
| Always escalate, always close | Floors. If the graders are right, each scores exactly 50% |
| Simple rules, about 30 lines | Shows what the AI adds over the obvious approach |
| Phone model, fixed pipeline | The small local model |
| Claude Haiku 5.5, fixed pipeline | Same input as the phone model |
| Claude Haiku 5.5, agent | What the tools add |
| Claude Opus 5.5, agent | The ceiling |

### 6.2 What is measured

Each is a separate number; none are blended.

| Metric | Definition |
|---|---|
| Right call | Disposition matches the known answer |
| Missed laundering | Suspicious cases closed. The costly error, reported on its own |
| False alarms | Benign cases escalated |
| Pattern right | Correct pattern, over suspicious cases |
| Evidence found | Share of the scenario's own transactions that the report cites |
| Unsupported claims | From the checker |
| Broken output | Reports that failed to parse or validate after one repair. Reported separately and also counted as wrong in the end-to-end figure |
| Refusals | Counted separately |
| Time per case | Model time only; retries and queueing excluded |
| Cost per case | From the token counts the API returns and that model's price, cache reads included |
| Steps | Model calls and tool calls per case |

### 6.3 Runner rules

- One row per case and run in `results.jsonl`. Anything that never produced an answer (time-out, API error after retries, wrong model served) goes to `errors.jsonl` and is not scored as a wrong answer.
- Full trajectories are saved for every row: every message, tool call, tool result, token count and timing, plus the checker's input and output. The replay page reads these.
- Retries use backoff with jitter, are capped, and the attempt count is stored.
- Before any paid run, two free runs must behave: the reference answers must score 100%, and the floor contestants must score 50%.
- Three runs per case for the API models. Results carry a 95% interval. With 80 cases and 3 runs the margin on the right-call rate is roughly plus or minus 6 to 7 points; differences smaller than that are not claimed.
- The headline numbers are recomputed from the raw rows by a test.
- The harness calls the same investigator code the site uses, not a copy.

### 6.4 "Re-run on every change"

`evals.yml` in GitHub Actions:

| When | What runs | Rough cost (estimate, to be measured) |
|---|---|---|
| Pull request touching the investigator or its prompts | Haiku contestants, 80 cases, 3 runs | About $1.50 |
| Weekly and on demand | Opus agent, 80 cases, 1 run | About $12 to $18 |
| On demand | Opus agent, 3 runs | About $36 to $55 |

- The job starts PostgreSQL, generates the world from the seed, runs the harness, and posts a table on the pull request comparing against `main`.
- It fails the check if missed laundering rises, or the right-call rate falls, by more than the margin of error, or if unsupported claims rise by more than three points.
- On `main` the result files are committed to an `eval-data` branch. The Pages build includes them, which is how the scorecard updates.

The phone model's runs happen on the phone at night (02:00 to 05:00 Toronto time), one case at a time, about 30 minutes per pass of 80 cases. A scheduled CI job then fetches the latest phone run from a read-only public endpoint and commits it to `eval-data`. No token is stored on the phone.

Costs above are estimates from the published per-token prices (Haiku 5.5: $0.10 in, $0.50 out per million tokens; Opus 5.5: $4 in, $20 out) and a guessed size per case. Measure on five cases before the first full run, and set a monthly spend limit in the Anthropic Console.

## 7. API

All under `/lab/v1`.

| Method and path | Access | Purpose |
|---|---|---|
| `GET /cases` | Public | Queue, with filters and paging |
| `GET /cases/{id}` | Public | Alert, customer profile, accounts, baseline summary |
| `GET /cases/{id}/transactions` | Public | Evidence table; filters for dates, type, amount; paged |
| `GET /cases/{id}/flows` | Public | Who paid whom, aggregated, for the diagram |
| `GET /cases/{id}/reports` | Public | Reports for this case, one per contestant |
| `GET /reports/{id}` | Public | One report with the checker's result per claim |
| `POST /cases/{id}/reviews` | Public, rate-limited | A visitor's sandbox decision; the response reveals the known answer |
| `GET /evals/export/latest` | Public, read-only | The phone model's most recent run, for CI to collect |
| `POST /cases/{id}/investigate` | Internal | Run a contestant on a case now |
| `evals-run` | Management port | Start a phone-model eval pass |

Static files served with the site, produced by CI:

| File | Contents |
|---|---|
| `data/evals/scorecard.json` | Latest figures per contestant with intervals |
| `data/evals/history.json` | One point per run for the trend chart |
| `data/evals/runs/{runId}.json` | Per-case results for one run |
| `data/evals/traces/{runId}/{caseId}.json` | The trajectory for the replay |
| `data/evals/dataset.json` | Dataset card: counts, how it was made, limits |

## 8. Data added by this project

| Table | Key columns |
|---|---|
| `alert` | id, public_id, customer_id, rule, window_from, window_to, raised_at, amount_cents |
| `aml_case` | id, public_id, alert_id, status, source (MONITORING, SCREENING_HOLD), in_eval_set, dataset_version, split |
| `report` | id, public_id, case_id, contestant, model_id, pipeline, code_version, prompt_hash, body jsonb, created_at |
| `claim_check` | report_id, claim_id, status, detail jsonb |
| `review` | id, case_id, report_id, visitor_id, action, disposition, note, sandbox, created_at |
| `eval_run` | id, contestant, dataset_version, code_version, started_at, finished_at, summary jsonb |
| `eval_result` | run_id, case_id, rep, status, grades jsonb, usage jsonb, cost_micros, millis |

## 9. Tests

- Checker: each check type right and deliberately wrong; a number in the text with no check; an evidence id from another case.
- Evidence pack: stays under the token cap; never contains scenario fields.
- Tools: paging, bounds, and refusal of ids outside the case.
- Agent loop against the fake model: stops at the step limit, at the time ceiling, and on `submit_report`.
- Parsing of real saved outputs from the phone model, including the broken ones from the first test.
- Graders: reference answers pass, floor contestants score 50%, a plausible wrong report fails.
- Leak test: no public response or prompt contains ground truth.
- Playwright: open a case, switch contestant, replay, make a call, see the answer.

## 10. Milestones

| Milestone | Contents | Done when |
|---|---|---|
| M5 Cases | Laundering and look-alike injectors, monitoring rules, alerts, cases, queue and case pages with evidence only | A visitor can browse cases and evidence served from the phone |
| M6 Investigator | Evidence pack, both model clients, report schema, checker, reports shown on the case page with claim badges | Both the phone model and Claude Haiku produce checked reports for the 40 development cases |
| M7 Scorecard | Dataset v1, runner, graders, floors, CI workflow, static result files, scorecard and replay pages | The scorecard is public and a pull request gets an automatic comparison. Then add the portfolio card |
| M8b Agent and judge | Tool loop on Claude, Opus runs, visitor review sandbox, judge for non-numeric claims | The agent contestants appear on the scorecard |

## 11. Not in scope

- Filing anything, or any claim of regulatory compliance.
- Real customer data, real names, real sanctions lists.
- Letting visitors type instructions to the model.
- Running Claude from the phone.

## 12. What this gives Bhawar to talk about

- Why an AI report is only useful if each statement can be checked, and how the checker does it without another model.
- Building an eval that can be trusted: held-out cases, floors, repeated runs, margins of error, plumbing failures kept apart from model failures.
- A regression gate for prompts and agent code in CI.
- Small local model against a frontier model on the same task, with cost and time beside accuracy.
- Human approval and an audit trail around an AI step in a regulated process.
- A concrete failure found and handled: the phone model breaking under a schema constraint.
