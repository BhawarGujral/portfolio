# Pixel chat gateway

The "Ask Pixel" chatbot on [bhawargujral.com](https://bhawargujral.com) runs on a
Pixel 7 phone at home. This small Node server sits between the internet and the
model: it owns the system prompt, the queue, the limits and the filters, and
streams answers word by word.

```
Browser ──► Cloudflare ──► cloudflared (on the phone, outbound only)
              /api/chat*      ──► this gateway (127.0.0.1:8788) ──► llama-server (127.0.0.1:8080)
              everything else ──► guestbook   (127.0.0.1:8787)
```

The model is Google's Gemma 4 E2B (Q4_K_M) running in llama.cpp, built from
source with ARM dot-product support. It answers at about 7–8 tokens per second.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| POST | `/api/chat` | Ask a question; the answer streams back as Server-Sent Events |
| GET | `/api/chat/status` | Online state, speed, battery temperature, queue length, uptime |
| GET | `/api/chat/suggestions` | Starter questions for the chat window |
| GET | `/api/chat/health`, `/health` | Liveness check |

`POST /api/chat` takes the conversation so far, ending with the visitor's question:

```json
{ "messages": [
    { "role": "user", "content": "Who is Bhawar?" },
    { "role": "assistant", "content": "Bhawar is a full-stack developer..." },
    { "role": "user", "content": "What does he do for fun?" }
] }
```

Only `user` and `assistant` turns are accepted. The system prompt is always
added by the server.

### Stream events

| Event | Data | Meaning |
|---|---|---|
| `queue` | `{ position, etaSec }` | Waiting in line; sent again whenever the position changes |
| `start` | `{ id, model, queuedMs, historyTrimmed }` | The phone started answering |
| `token` | `{ text }` | The next words of the answer |
| `done` | `{ finishReason, usage, timings }` | Finished; includes time to first word and tokens per second |
| `error` | `{ code, message, discard }` | Ended early; if `discard` is true, hide the partial answer |

Errors before the stream starts are JSON:
`{ "error": { "code", "message", "retryAfterSec"? } }`.
Codes: `bad_request`, `message_too_long`, `input_blocked`, `origin_not_allowed`,
`too_large`, `unsupported_media_type`, `rate_limited`, `already_in_progress`,
`busy`, and `napping` (with `reason`: `model_offline`, `model_loading` or `too_hot`).

## Protections

- **One answer at a time.** Up to 4 visitors wait in line. Hanging up stops the model immediately.
- **Limits per visitor:** 1 chat at a time, 8 per 5 minutes, 40 per day. Site-wide: 120 per hour.
- **Input:** messages up to 500 characters, at most 16 turns. Chat-template control
  tokens (like Gemma's `<|turn>`) are stripped, so visitors can't fake a system turn.
- **Output:** every word is checked against an English, Hinglish and Devanagari
  word filter before it's sent, so a bad word never reaches the screen.
- **Heat:** if the battery reaches 42°C the chat pauses, and it resumes at 39°C.
- **Privacy:** IP addresses are never stored. Rate limits use a salted hash of
  the IP that lives only in memory. The server log has timings only, no chat text.

## Saved conversations

So Bhawar can see how Pixel is doing, each question and answer is saved on the
phone in `~/pixel-chats/` (one `YYYY-MM-DD.jsonl` file per day, readable only by
Termux) and **deleted after 90 days**. The chat window tells visitors this.

- Saved per turn: the question, the answer exactly as the visitor saw it, the
  outcome (answered, stopped, blocked, timed out…), speed and time to first word,
  and a random conversation ID that the website creates for each chat.
- Not saved: IP addresses or anything else that identifies the visitor. Emails
  and phone numbers that visitors type are masked as `[email]` and `[phone]`.
- Old days are purged when the server starts and every 6 hours after that.
- Settings: `TRANSCRIPTS=off` turns saving off, `TRANSCRIPTS_DIR` moves the
  folder, `TRANSCRIPT_DAYS` changes the 90-day window.

Review them on the phone:

```bash
npm run chats                 # conversations from the last 3 days
npm run chats -- --days 14
npm run chats -- stats        # answers, speed, first-word time, top questions (30 days)
```

## Running it

```bash
npm install
npm start          # listens on 127.0.0.1:8788, expects llama-server on :8080
npm test           # 47 tests against a fake model; no phone needed
```

Settings come from environment variables: `PORT`, `HOST`, `LLAMA_URL`,
`ALLOWED_ORIGINS`, `SYSTEM_PROMPT_PATH`, `MODEL_NAME`, `MODEL_QUANT`, `CTX_SIZE`,
`MAX_REPLY_TOKENS`, `MAX_MESSAGE_CHARS`, `MAX_MESSAGES`, `QUEUE_MAX`,
`MAX_BODY_BYTES`, `TEMP_NAP_C`, `TEMP_RESUME_C` and `BATTERY_CMD` (empty turns
off battery readings). See `src/config.js` for the defaults.

## The knowledge file

What Pixel knows comes from `knowledge/about-bhawar.md`, which is the system
prompt. That file holds Bhawar's personal story and the bot's rules, so it is
**not in git**. It lives on the phone, next to this server, and the server
refuses to start without it.

- The gateway reads it once at startup and sends it as an identical prefix on
  every request, so llama.cpp processes it once (about 30 s on the phone) and
  then serves it from its prompt cache (about 0.7 s to the first word).
- Visitors' browsers never receive it.
- [`knowledge/about-bhawar.example.md`](knowledge/about-bhawar.example.md) shows
  the format, and the tests use it.

To update what Pixel knows, edit the real file on the phone and restart the gateway.
