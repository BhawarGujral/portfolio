import { Fragment } from "react";

// Emails, full URLs, and the bare linkedin.com / github.com links Pixel tends to write.
const LINK =
  /(https?:\/\/[^\s]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|(?:www\.)?(?:linkedin\.com|github\.com|bhawargujral\.com)(?:\/[^\s]*)?)/gi;

const linkClass =
  "underline underline-offset-4 decoration-foreground/40 transition-colors hover:decoration-foreground";

/** Renders plain text with links made clickable. Never renders HTML from the model. */
export function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(LINK);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        // Keep sentence punctuation outside the link: "github.com/BhawarGujral."
        const [, target, trailing] = part.match(/^(.*?)([.,!?;:)]*)$/s) ?? [part, part, ""];
        const isEmail = target.includes("@") && !target.includes("/");
        const href = isEmail ? `mailto:${target}` : /^https?:\/\//i.test(target) ? target : `https://${target}`;
        return (
          <Fragment key={i}>
            <a href={href} target={isEmail ? undefined : "_blank"} rel="noopener noreferrer" className={linkClass}>
              {target}
            </a>
            {trailing}
          </Fragment>
        );
      })}
    </>
  );
}
