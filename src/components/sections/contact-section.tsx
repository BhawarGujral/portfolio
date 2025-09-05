import React from "react";
import { motion } from "framer-motion";
import { Github, Linkedin, Mail } from "lucide-react";

const ContactSection: React.FC = () => {
  return (
    <section id="contact" className="">
      <div className="section-container">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="section-title"
        >
          Get In Touch
        </motion.h2>

        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="flex flex-col justify-center"
          >
            <div className="space-y-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-6">
                  Feel free to reach out to me through any of the following
                  channels. I'm always open to discussing new projects,
                  opportunities, or just having a chat.
                </p>
              </div>

              <div className="space-y-4">
                <ContactItem
                  icon={<Mail className="h-6 w-6 text-primary" />}
                  label="Email"
                  link="mailto:bhawar.gujral@example.com"
                  text="bhawarworkspace@gmail.com"
                />
                <ContactItem
                  icon={<Linkedin className="h-6 w-6 text-primary" />}
                  label="LinkedIn"
                  link="https://www.linkedin.com/in/bhawargujral/"
                  text="linkedin.com/in/bhawargujral"
                />
                <ContactItem
                  icon={<Github className="h-6 w-6 text-primary" />}
                  label="GitHub"
                  link="https://github.com/BhawarGujral"
                  text="github.com/BhawarGujral"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Contact Item Component for better reusability
interface ContactItemProps {
  icon: React.ReactNode;
  label: string;
  link: string;
  text: string;
}

const ContactItem: React.FC<ContactItemProps> = ({
  icon,
  label,
  link,
  text,
}) => {
  return (
    <div className="flex items-center gap-4">
      <div className="bg-primary/10 p-3 rounded-full">{icon}</div>
      <div>
        <h4 className="font-medium">{label}</h4>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          {text}
        </a>
      </div>
    </div>
  );
};

export default ContactSection;
