import { mkdir } from "fs/promises";
import { createInterface } from "readline";

// Ensure attachments directory exists
export async function ensureDirectoryExists(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
    console.log(`Directory '${dir}' is ready`);
  } catch (error) {
    console.error(`Error creating directory: ${error}`);
    throw error;
  }
}

// Create readline interface for user input
export function createPrompt() {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

export async function confirmAction(prompt: string): Promise<boolean> {
  const rl = createPrompt();

  return new Promise((resolve) => {
    rl.question(`${prompt} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}
