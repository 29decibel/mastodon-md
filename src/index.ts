// mastodon-md/src/index.ts
import { fetchAllPosts } from "./download";
import { processQueue } from "./post-queue";

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  if (!command) {
    printUsage();
    process.exit(1);
  }

  try {
    switch (command) {
      case "download":
        console.log("Starting download of all Mastodon posts...");
        await fetchAllPosts();
        break;

      case "post":
        console.log("Processing post queue...");
        await processQueue();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

function printUsage() {
  console.log(`
Usage: bun run src/index.ts <command>

Commands:
  download    Download all posts from your Mastodon account
  post        Process the queue.md file and post due items to Mastodon

Examples:
  bun run src/index.ts download
  bun run src/index.ts post
`);
}

// Run the main function when this file is executed directly
if (import.meta.path === Bun.main) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
