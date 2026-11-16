import {
  Cat,
  Coffee,
  Flower2,
  Heart,
  Moon,
  Music,
  Rocket,
  Smile,
  Sparkles,
  Star,
  Sun,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** The server picks one of these keys at random for each signature. */
export const STICKER_ICONS: Record<string, LucideIcon> = {
  star: Star,
  heart: Heart,
  rocket: Rocket,
  sparkles: Sparkles,
  sun: Sun,
  moon: Moon,
  flower: Flower2,
  coffee: Coffee,
  zap: Zap,
  music: Music,
  smile: Smile,
  cat: Cat,
};
