import React from "react";
import { motion } from "motion/react";
import { GuestbookBoard } from "@/components/guestbook/guestbook-board";

const GuestbookSection: React.FC = () => (
  <section id="guestbook">
    <div className="section-container">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="section-title"
      >
        Guestbook
      </motion.h2>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <p className="mx-auto mb-8 max-w-xl text-center text-muted-foreground">
          Leave your name on the wall. It lives on a Pixel 7 that I run as a tiny home server.
        </p>
        <GuestbookBoard />
      </motion.div>
    </div>
  </section>
);

export default GuestbookSection;
