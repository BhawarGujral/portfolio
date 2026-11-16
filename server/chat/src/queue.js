export class QueueFullError extends Error {}
export class CancelledError extends Error {}

/**
 * The phone's model can only answer one person at a time, so chats wait in a
 * first-in-first-out line. Each waiter is told its position whenever it moves.
 */
export class JobQueue {
  #max;
  #active = null;
  #waiting = [];

  constructor({ max }) {
    this.#max = max;
  }

  get busy() {
    return this.#active !== null;
  }

  get waitingCount() {
    return this.#waiting.length;
  }

  get max() {
    return this.#max;
  }

  hasKey(key) {
    return this.#active?.key === key || this.#waiting.some((job) => job.key === key);
  }

  /**
   * @param {{ key?: string, front?: boolean }} options  `front` is for the
   *   internal warm-up job, which skips the line and the size cap.
   */
  enqueue({ key = null, front = false } = {}) {
    if (!front && this.#waiting.length >= this.#max) throw new QueueFullError();

    const job = { key, state: "waiting", position: 0, onPosition: null };
    job.granted = new Promise((resolve, reject) => {
      job.grant = resolve;
      job.reject = reject;
    });
    job.granted.catch(() => {}); // a cancelled job may have nobody awaiting it

    const handle = {
      granted: job.granted,
      get position() {
        return job.state === "waiting" ? job.position : 0;
      },
      onPosition: (callback) => {
        job.onPosition = callback;
      },
      cancel: () => this.#cancel(job),
      release: () => this.#release(job),
    };

    if (front) this.#waiting.unshift(job);
    else this.#waiting.push(job);
    this.#advance();
    return handle;
  }

  #advance() {
    if (!this.#active && this.#waiting.length > 0) {
      const next = this.#waiting.shift();
      next.state = "active";
      next.position = 0;
      this.#active = next;
      next.grant();
    }
    this.#waiting.forEach((job, index) => {
      if (job.position !== index + 1) {
        const moved = job.position !== 0;
        job.position = index + 1;
        if (moved) job.onPosition?.(job.position);
      }
    });
  }

  #release(job) {
    if (this.#active !== job) return;
    job.state = "done";
    this.#active = null;
    this.#advance();
  }

  #cancel(job) {
    if (job.state === "waiting") {
      this.#waiting.splice(this.#waiting.indexOf(job), 1);
      job.state = "cancelled";
      job.reject(new CancelledError());
      this.#advance();
    } else if (job.state === "active") {
      this.#release(job);
    }
  }
}
