import { execFile as nodeExecFile } from "node:child_process";

/**
 * Watches the model server and the phone's battery, and keeps the numbers the
 * website shows next to the chat (speed, temperature, answers served).
 *
 * Public states: online | warming | loading | offline | too_hot
 */
export function createMonitor({
  config,
  llama,
  isBusy,
  onOnline,
  log,
  now = Date.now,
  execFile = nodeExecFile,
}) {
  let llamaState = "offline";
  let warming = false;
  let hot = false;
  let battery = null; // { percentage, temperatureC, plugged, at }
  const recentTps = [];
  const startedAt = now();
  let answersServed = 0;
  const timers = [];

  const state = () => {
    if (hot) return "too_hot";
    if (llamaState !== "online") return llamaState;
    return warming ? "warming" : "online";
  };

  function setLlamaState(next) {
    if (next === llamaState) return;
    const previous = llamaState;
    llamaState = next;
    log({ ev: "llama", from: previous, to: next });
    if (next === "online") onOnline?.();
  }

  async function pollHealth() {
    if (isBusy()) return; // a streaming answer already proves it's alive
    setLlamaState(await llama.checkHealth(config.timeouts.healthTimeoutMs));
  }

  function pollBattery() {
    if (!config.batteryCmd) return;
    execFile(config.batteryCmd, [], { timeout: config.timeouts.batteryTimeoutMs }, (err, stdout) => {
      if (err) return;
      try {
        const data = JSON.parse(stdout);
        battery = {
          percentage: data.percentage,
          temperatureC: data.temperature,
          plugged: typeof data.plugged === "string" ? data.plugged !== "UNPLUGGED" : null,
          at: now(),
        };
        if (!hot && battery.temperatureC >= config.tempNapC) {
          hot = true;
          log({ ev: "too_hot", state: "on" });
        } else if (hot && battery.temperatureC <= config.tempResumeC) {
          hot = false;
          log({ ev: "too_hot", state: "off" });
        }
      } catch {
        // ignore malformed output; keep the last good reading
      }
    });
  }

  return {
    state,
    get llamaState() {
      return llamaState;
    },
    /** Called when a stream fails because the model went away mid-answer. */
    markOffline: () => setLlamaState("offline"),
    setWarming: (value) => {
      warming = value;
    },
    recordAnswer(tokPerSec) {
      answersServed += 1;
      if (Number.isFinite(tokPerSec) && tokPerSec > 0) {
        recentTps.push(tokPerSec);
        if (recentTps.length > 20) recentTps.shift();
      }
    },
    snapshot() {
      const t = now();
      return {
        state: state(),
        tokPerSec: recentTps.length
          ? Math.round((recentTps.reduce((a, b) => a + b, 0) / recentTps.length) * 10) / 10
          : null,
        battery: battery && {
          percentage: battery.percentage,
          temperatureC: battery.temperatureC,
          plugged: battery.plugged,
          ageSec: Math.round((t - battery.at) / 1000),
        },
        uptimeSec: Math.round((t - startedAt) / 1000),
        answersServed,
      };
    },
    start() {
      pollHealth();
      pollBattery();
      timers.push(setInterval(pollHealth, config.timeouts.healthPollMs).unref());
      timers.push(setInterval(pollBattery, config.timeouts.batteryPollMs).unref());
    },
    stop() {
      timers.forEach(clearInterval);
      timers.length = 0;
    },
  };
}
