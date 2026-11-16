import http from "node:http";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

/**
 * A fake llama-server that streams OpenAI-style SSE like the real one.
 * Options can be changed on `state` while it runs.
 */
export async function startMockLlama(options = {}) {
  const state = {
    tokens: ["Hello", " there", ", friend", "!"],
    delayMs: 5,
    firstDelayMs: 0,
    health: 200,
    hangAfter: null, // stop sending after this many tokens and wait
    includeReasoning: false,
    bodies: [],
    aborted: 0,
    completed: 0,
    ...options,
  };

  const server = http.createServer(async (req, res) => {
    if (req.url === "/health") {
      res.writeHead(state.health, { "Content-Type": "application/json" });
      res.end(JSON.stringify(state.health === 200 ? { status: "ok" } : { error: { message: "Loading model" } }));
      return;
    }
    if (req.url === "/tokenize") {
      const { content } = JSON.parse(await readBody(req));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ tokens: Array.from({ length: Math.ceil(content.length / 4) }, () => 1) }));
      return;
    }
    if (req.url === "/v1/chat/completions") {
      const body = JSON.parse(await readBody(req));
      state.bodies.push(body);
      if (state.health !== 200) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "Loading model" } }));
        return;
      }
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      let gone = false;
      res.on("close", () => {
        if (!res.writableFinished) {
          gone = true;
          state.aborted += 1;
        }
      });
      const send = (obj) => !gone && res.write(`data: ${JSON.stringify(obj)}\n\n`);

      if (state.firstDelayMs) await sleep(state.firstDelayMs);
      for (const [i, token] of state.tokens.entries()) {
        if (gone) return;
        if (state.hangAfter !== null && i >= state.hangAfter) {
          await new Promise((resolve) => res.on("close", resolve));
          return;
        }
        if (state.includeReasoning) send({ choices: [{ delta: { reasoning_content: "secret thinking" } }] });
        send({ choices: [{ index: 0, delta: { content: token }, finish_reason: null }] });
        await sleep(state.delayMs);
      }
      if (gone) return;
      send({
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        timings: { prompt_n: 20, prompt_ms: 100, predicted_n: state.tokens.length, predicted_per_second: 7.5 },
      });
      send({ choices: [], usage: { prompt_tokens: 20, completion_tokens: state.tokens.length } });
      res.end("data: [DONE]\n\n");
      state.completed += 1;
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    state,
    close() {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    },
  };
}
