# Brief 1: Portfolio cleanup

Hand this file to a coding agent working in the `portfolio` repo. It is self-contained.

## Goal

Remove five student projects from the portfolio's Projects section so the page leads with stronger work. Two new projects (see `03-scam-screening.md` and `04-aml-investigator.md`) get cards later, when they are live. Nothing else about the page changes.

## State of the repo you must respect

- Work on the current branch, `portfolio-revamp`. It carries a large **uncommitted** redesign across about 20 files. Do not revert, reformat, stash or discard any of it.
- `src/lib/data.ts` already has uncommitted changes. Make the smallest possible edit inside it.
- Do not commit or push unless Bhawar asks. If he does, the cleanup ships together with the revamp, because the same file holds both.
- The site deploys to GitHub Pages from `main` through `.github/workflows/deploy.yml`. Nothing here should touch that workflow.

## Step 1: remove five entries from `src/lib/data.ts`

Delete these objects from the exported `projects` array, matched by `id`:

| `id` | Title | Image in `public/` |
|---|---|---|
| `smart-home` | Smart Home Manager | `SmartHomeManager.svg` |
| `twitter-clone` | Twitter Clone API | `TwitterSpring.svg` |
| `flappy-bird` | Flappy Bird | `FlappyBird.svg` |
| `school-management` | School Management System | `SchoolManagementSystem.svg` |
| `weather-app` | Weather App | `WeatherApp.svg` |

Keep, in this order: `ecommerce`, `expense-manager`, `movierating`, `emotion-detector`. Keep `pixelProject` untouched.

## Step 2: delete the five images

For each SVG in the table, confirm nothing else references it, then delete it from `public/`:

```bash
grep -rn "SmartHomeManager\|TwitterSpring\|FlappyBird\|SchoolManagementSystem\|WeatherApp" src index.html server README.md
```

Expected result after step 1: no matches. If something does match, stop and report it instead of deleting.

## Step 3: check the grid still looks right

`src/components/sections/projects-section.tsx` renders `projects.slice(0, 3)`, then the Pixel card, then the rest. With four projects that gives five cards: three in the first row and two in the second on desktop. Leave the code as it is unless the result looks broken. Check:

- desktop (three columns): no stretched or orphaned card that looks like a mistake;
- tablet (two columns) and phone (one column);
- light and dark theme;
- no broken image icons and no console errors.

Use the preview tooling in `.claude/launch.json` rather than starting a dev server by hand.

## Step 4: keep the chatbot in step (ask before deploying)

`server/chat/knowledge/about-bhawar.md` (the real file, kept out of git) lists the removed projects on lines 56 to 62. The chatbot would keep offering them to recruiters.

- Replace those five bullet lines with one line: `- Earlier student projects, on GitHub if someone asks: Smart Home Manager, a Twitter clone API, Flappy Bird in JavaFX, a School Management System, and an Android weather app.`
- Check `about-bhawar.example.md` and `suggestions.json` for the same names; change them only if they mention the removed projects.
- Run the chat gateway tests: `cd server/chat && npm test`.
- **Do not copy the file to the phone or restart `pixel-chat` on your own.** Report that the knowledge file changed and let Bhawar decide when to deploy it.

## Step 5: verify

```bash
npm run lint
```

```bash
npm run build
```

Both must pass. Report the before and after card count and attach desktop and phone screenshots of the Projects section.

## Not part of this brief

- Adding the two new project cards. That happens when each project has a public demo. The card data is specified below so it is ready.
- A card for the Humber capstone (URL Security Analytics Platform: Spring Boot, Kafka, Redis, Angular). It is the strongest existing project and is only an Education footnote today. It needs three things from Bhawar first: a repo link or permission to describe it without one, a screenshot or diagram, and two sentences on what he built.
- Removing the GitHub repositories themselves. They stay public.

## Later: the two new cards

Add these at the **front** of `projects` so they lead the grid, each only after its demo URL works. Images are new SVGs in `public/`, drawn in the same flat style as the existing ones.

```ts
{
  id: "scam-screening",
  title: "Can you scam this bank?",
  blurb:
    "A payment screening engine that scores every transfer in under a millisecond. Play the fraudster and try to get money out.",
  image: asset("ScamScreening.svg"),
  tags: ["Java 21", "Spring Boot", "PostgreSQL", "Angular", "Gradient-boosted trees"],
  github: "https://github.com/BhawarGujral/fincrime-lab",
  demo: "https://lab.bhawargujral.com/play",
  demoLabel: "Play",
},
{
  id: "aml-investigator",
  title: "AML investigator with a public scorecard",
  blurb:
    "An AI agent that investigates flagged accounts and drafts the report. Every claim is checked against the data, and the scores are published.",
  image: asset("AmlInvestigator.svg"),
  tags: ["Java 21", "Spring Boot", "Claude API", "Evals", "Angular"],
  github: "https://github.com/BhawarGujral/fincrime-lab",
  demo: "https://lab.bhawargujral.com/scorecard",
  demoLabel: "Scorecard",
},
```

The repo name, the titles and the `lab` subdomain are working names from `README.md` in this folder. Use whatever Bhawar finally picks.

## Done when

- The Projects section shows five cards: E-commerce, Expense Manager, MovieRating, the Pixel chatbot, Emotion Detector.
- The five SVGs are gone from `public/` and nothing references them.
- Lint and build pass.
- The knowledge file is updated locally and Bhawar has been told it is not yet on the phone.
