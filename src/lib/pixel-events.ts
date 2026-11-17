// Lets any button on the page open the "Ask Pixel" chat. The widget listens
// for this event; a prompt only prefills the text box, it never sends.
export const PIXEL_OPEN_EVENT = "pixel:open";

export type PixelOpenDetail = { prompt?: string };

export function openPixelChat(prompt?: string) {
  window.dispatchEvent(new CustomEvent<PixelOpenDetail>(PIXEL_OPEN_EVENT, { detail: { prompt } }));
}
