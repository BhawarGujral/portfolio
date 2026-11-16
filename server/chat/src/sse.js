// Server-Sent Events over a normal HTTP response. The browser reads it with
// fetch() + ReadableStream, so POST bodies work (EventSource can't do POST).
export function openSse(res, now = Date.now) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    "X-Content-Type-Options": "nosniff",
  });
  res.flushHeaders();

  let lastWriteAt = now();
  const writable = () => !res.writableEnded && !res.destroyed;
  const write = (chunk) => {
    if (!writable()) return false;
    lastWriteAt = now();
    return res.write(chunk);
  };

  return {
    event: (name, data) => write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`),
    comment: (text = "ping") => write(`: ${text}\n\n`),
    idleMs: () => now() - lastWriteAt,
    close: () => {
      if (writable()) res.end();
    },
  };
}
