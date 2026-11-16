// One JSON line per event. Only allow-listed keys are ever written, so chat
// text, IP addresses and IP hashes can't end up in a log by accident.
const ALLOWED_KEYS = new Set([
  "ev", "id", "outcome", "queuedMs", "ttftMs", "genMs", "promptN", "predictedN",
  "tps", "trimmed", "state", "from", "to", "port", "host", "reason", "budget",
  "systemTokens",
]);

export function createLogger(write = (line) => process.stdout.write(`${line}\n`)) {
  return (fields) => {
    const line = { t: new Date().toISOString() };
    for (const [key, value] of Object.entries(fields)) {
      if (ALLOWED_KEYS.has(key) && value !== undefined) line[key] = value;
    }
    write(JSON.stringify(line));
  };
}

export const silentLogger = () => {};
