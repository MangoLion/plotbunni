import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Removes leading whitespace (spaces or tabs) from each line of a given string.
 * This is useful for preventing Markdown renderers from interpreting indentation
 * as code blocks, especially in contexts like novel writing where indentation
 * might be used for formatting paragraphs but not for code.
 *
 * @param {string} text The input string.
 * @returns {string} The string with leading whitespace removed from each line.
 */
export function removeIndentation(text) {
  if (!text) {
    return "";
  }
  // Split the text into lines, remove leading whitespace from each line,
  // and then join them back together.
  return text
    .split('\n')
    .map(line => line.replace(/^[ \t]+/, ''))
    .join('\n');
}


export const tokenCount = (text) => {
  if (!text) return 0;
  const tokenLength = 4; // Average characters per token
  return Math.ceil(text.length / tokenLength);
};