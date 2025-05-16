import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const tokenCount = (text) => {
  if (!text) return 0;
  const tokenLength = 4; // Average characters per token
  return Math.ceil(text.length / tokenLength);
};
