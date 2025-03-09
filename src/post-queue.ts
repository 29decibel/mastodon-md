// src/post-queue.ts
import { client } from "./constants";
import { QueuedPost } from "./types";
import { confirmAction } from "./utils";

// Read the queue.md file
async function readQueueFile(filePath: string): Promise<QueuedPost[]> {
  try {
    const content = await Bun.file(filePath).text();
    return parseQueuedPosts(content);
  } catch (error) {
    console.error(`Error reading queue file: ${error}`);
    return [];
  }
}

// Parse the content of queue.md into individual posts
function parseQueuedPosts(fileContent: string): QueuedPost[] {
  const posts: QueuedPost[] = [];

  // Split the content by the markdown separator
  const sections = fileContent.split(/---\s*\n/);

  // Skip empty sections
  if (sections.length < 2) {
    return posts;
  }

  // Process each pair of sections (frontmatter + content)
  for (let i = 1; i < sections.length; i += 2) {
    try {
      // Parse the frontmatter section
      const frontmatterLines = sections[i].trim().split("\n");
      const dateLine = frontmatterLines.find((line) =>
        line.startsWith("date:"),
      );

      if (!dateLine) {
        console.warn("Skipping post without date");
        continue;
      }

      const dateValue = dateLine.replace("date:", "").trim();

      // Get the content (the next section)
      if (i + 1 < sections.length) {
        const content = sections[i + 1].trim();

        if (content) {
          posts.push({
            date: dateValue,
            content,
          });
        }
      }
    } catch (error) {
      console.error(`Error parsing section ${i}: ${error}`);
    }
  }

  // Sort posts by date (oldest first to post in chronological order)
  return posts.sort((a, b) => {
    // Handle 'now' special case
    if (a.date.toLowerCase() === "now") return -1;
    if (b.date.toLowerCase() === "now") return 1;

    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}

// Post a single item to Mastodon
async function postToMastodon(content: string): Promise<boolean> {
  try {
    console.log(`Posting to Mastodon: ${content.substring(0, 30)}...`);

    const response = await client.postStatus(content, {
      visibility: "public",
    });

    console.log(`Successfully posted with ID: ${response.data.id}`);
    return true;
  } catch (error) {
    console.error(`Error posting to Mastodon: ${error}`);
    return false;
  }
}

// Remove a post from the queue file after it's been posted
async function removeFromQueue(
  filePath: string,
  postedPost: QueuedPost,
): Promise<void> {
  try {
    const content = await Bun.file(filePath).text();

    // Find the section with the post and remove it
    const sections = content.split(/---\s*\n/);
    let newContent = "";
    let skipNext = false;

    for (let i = 0; i < sections.length; i++) {
      if (skipNext) {
        skipNext = false;
        continue;
      }

      const section = sections[i];

      // Check if this section contains our post's date and content
      if (
        section.includes(`date: ${postedPost.date}`) &&
        i + 1 < sections.length &&
        sections[i + 1].trim() === postedPost.content
      ) {
        skipNext = true;
        continue;
      }

      // Keep this section
      newContent += section;
      if (i < sections.length - 1) {
        newContent += "---\n";
      }
    }

    await Bun.write(filePath, newContent);
    console.log("Queue file updated");
  } catch (error) {
    console.error(`Error updating queue file: ${error}`);
  }
}

// Check if a post is due for publication
function isPostDue(post: QueuedPost): boolean {
  // If date is 'now', it's due immediately
  if (post.date.toLowerCase() === "now") {
    return true;
  }

  // Otherwise check if scheduled date is in the past
  const postDate = new Date(post.date);
  const now = new Date();

  return postDate <= now && !isNaN(postDate.getTime());
}

// Process all posts in the queue that are due
export async function processQueue() {
  const queueFilePath = "queue.md";

  console.log("Reading queue file...");
  const queuedPosts = await readQueueFile(queueFilePath);

  if (queuedPosts.length === 0) {
    console.log("No posts in the queue.");
    return;
  }

  console.log(`Found ${queuedPosts.length} posts in the queue.`);

  // Filter posts that are due (including 'now')
  const duePosts = queuedPosts.filter(isPostDue);

  // Log future posts
  const futurePosts = queuedPosts.filter((post) => !isPostDue(post));
  if (futurePosts.length > 0) {
    console.log("\nFuture scheduled posts:");
    futurePosts.forEach((post, index) => {
      console.log(`- [${index + 1}] Scheduled for: ${post.date}`);
      console.log(
        `  ${post.content.substring(0, 50)}${post.content.length > 50 ? "..." : ""}`,
      );
    });
  }

  if (duePosts.length === 0) {
    console.log("No posts are due for publishing yet.");
    return;
  }

  console.log(`\n${duePosts.length} posts are ready to be published:`);

  // Display posts that will be published
  duePosts.forEach((post, index) => {
    console.log(`\n[${index + 1}] Scheduled for: ${post.date}`);
    console.log(
      `    ${post.content.substring(0, 100)}${post.content.length > 100 ? "..." : ""}`,
    );
  });

  // Ask for confirmation once before posting all
  const shouldProceed = await confirmAction(
    "\nDo you want to publish all these posts to Mastodon?",
  );

  if (!shouldProceed) {
    console.log("Operation cancelled.");
    return;
  }

  // Process each post
  let postedCount = 0;
  for (const post of duePosts) {
    console.log(
      `\nPosting content ${post.date === "now" ? "immediately" : `scheduled for ${post.date}`}...`,
    );

    const success = await postToMastodon(post.content);

    if (success) {
      await removeFromQueue(queueFilePath, post);
      console.log("Post removed from queue.");
      postedCount++;
    }
  }

  console.log(`\nPosted ${postedCount} items from the queue.`);
}
