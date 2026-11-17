import { SectionHeading } from "@/components/ui/section-heading";
import { GuestbookBoard } from "@/components/guestbook/guestbook-board";

// The board itself isn't animated in: its pan and measure logic shouldn't be
// transformed while it settles. Only the heading reveals.
export default function GuestbookSection() {
  return (
    <section id="guestbook">
      <div className="section-container">
        <SectionHeading index="05" label="The Wall" title="Leave your name on the wall">
          Say hi before you go. Sign your name and it gets taped up next to everyone else's.
        </SectionHeading>
        <GuestbookBoard />
      </div>
    </section>
  );
}
