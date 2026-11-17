// Keep this a <footer>: the chat launcher shrinks while it's on screen.
export default function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm sm:px-8 md:flex-row md:items-center md:justify-between">
        <p className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
          Designed and built by Bhawar in Toronto
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          React · TypeScript · Tailwind. The chat runs on my spare Pixel 7, just for fun.
        </p>
        <p className="flex items-center gap-4 text-muted-foreground">
          <span>© {new Date().getFullYear()} Bhawar Gujral</span>
          <a href="#home" className="text-foreground underline-offset-4 hover:underline">
            Back to top
          </a>
        </p>
      </div>
    </footer>
  );
}
