// Client for the guestbook API. The API runs on a Pixel 7 at home and is
// reached through Cloudflare Tunnel at api.bhawargujral.com.
const API_BASE: string =
  import.meta.env.VITE_GUESTBOOK_API ?? "https://api.bhawargujral.com";

export const MAX_NAME_LENGTH = 24;

export type GuestbookEntry = {
  id: number;
  name: string;
  sticker: string;
  hue: number;
  createdAt: string;
  /** Where it sits on the wall (stored by the server since the wall redesign). */
  x?: number;
  y?: number;
  r?: number;
};

export type GuestbookList = {
  count: number;
  entries: GuestbookEntry[];
};

export class GuestbookError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new GuestbookError(res.status, body.error ?? "Something went wrong.");
  }
  return body as T;
}

export function fetchGuestbook(signal?: AbortSignal): Promise<GuestbookList> {
  return request<GuestbookList>("/api/guestbook", { signal });
}

/** `website` is a honeypot field: real visitors never fill it in. */
export async function signGuestbook(name: string, website: string): Promise<GuestbookEntry> {
  const { entry } = await request<{ entry: GuestbookEntry }>("/api/guestbook", {
    method: "POST",
    body: JSON.stringify({ name, website }),
  });
  return entry;
}

// Same rule as the server, so visitors get instant feedback before sending.
const ALLOWED_NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;

export function checkName(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim();
  if (!name) return "Please enter your name or initials.";
  if ([...name].length > MAX_NAME_LENGTH) {
    return `Please keep it under ${MAX_NAME_LENGTH} characters.`;
  }
  if (!ALLOWED_NAME.test(name)) {
    return "Letters only, please (spaces, dots and hyphens are fine).";
  }
  return null;
}
