import { ensureDirectoryExists } from "./utils";
import path from "path";
import generator, { Entity } from "megalodon";
import TurndownService from "turndown";
import { Post } from "./types";
import { ATTACHMENTS_DIR, client } from "./constants";

const turndownService = new TurndownService();

// All posts will be collected in this array
const allPosts: Post[] = [];

function formatPost(post: Post) {
  // Add media attachments as markdown images if they exist
  const mediaContent =
    post.media_attachments.length > 0
      ? "\n\n" +
        post.media_attachments
          .map((attachment) => `![Attachment](${attachment.localPath})`)
          .join("\n")
      : "";

  return `
---
id: ${post.id}
date: ${post.created_at}
---
${post.content}${mediaContent}
`;
}

async function downloadAttachment(url: string, filename: string) {
  try {
    console.log(`Downloading ${url}...`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to download: ${response.status} ${response.statusText}`,
      );
    }

    const buffer = await response.arrayBuffer();
    const filePath = path.join(ATTACHMENTS_DIR, filename);

    await Bun.write(filePath, buffer);
    console.log(`Saved attachment to ${filePath}`);

    return filePath;
  } catch (error) {
    console.error(`Error downloading attachment: ${error}`);
    return null;
  }
}

// Get your account information to retrieve your account ID
export const fetchAllPosts = async () => {
  try {
    // Ensure attachments directory exists
    await ensureDirectoryExists(ATTACHMENTS_DIR);

    // Fetch your account information to get your user ID
    const account = await client.verifyAccountCredentials();
    const myUserId = account.data.id;

    await fetchPostsRecursively(myUserId);

    // After all posts are collected, save them to a single file
    await saveAllPostsToSingleFile();
  } catch (error) {
    console.error("Error:", error);
  }
};

const fetchPostsRecursively = async (
  userId: string,
  maxId: string | null = null,
) => {
  console.log("Fetching posts...");
  let params: any = { limit: 40 };
  if (maxId) {
    params.max_id = maxId;
  }

  const posts = await client.getAccountStatuses(userId, params);

  // Process and download attachments for each post
  const processedPosts = await Promise.all(
    posts.data
      .filter(
        (post: Entity.Status) => post.visibility === "public" && post.content,
      )
      .map(async (post: Entity.Status): Promise<Post> => {
        // Process media attachments
        const media_attachments = await Promise.all(
          post.media_attachments.map(async (attachment) => {
            const fileExtension = attachment.url.split(".").pop() || "jpg";
            const filename = `${post.id}_${attachment.id}.${fileExtension}`;
            const localPath = await downloadAttachment(
              attachment.url,
              filename,
            );

            return {
              id: attachment.id,
              url: attachment.url,
              filename,
              localPath: localPath ? path.relative(".", localPath) : "",
            };
          }),
        );

        return {
          id: post.id,
          content: turndownService.turndown(post.content),
          created_at: post.created_at,
          media_attachments,
        };
      }),
  );

  // Add to the collection
  allPosts.push(...processedPosts);
  console.log(
    `Collected ${processedPosts.length} posts. Total: ${allPosts.length}`,
  );

  if (posts.data.length > 0) {
    // Fetch next page
    const nextMaxId = posts.data[posts.data.length - 1].id;
    await fetchPostsRecursively(userId, nextMaxId);
  } else {
    console.log("No more posts to fetch.");
  }
};

const saveAllPostsToSingleFile = async () => {
  // Sort posts by date (newest first)
  allPosts.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // Create the content with separators
  const content = allPosts.map(formatPost).join("\n\n");

  // Save to a single file
  const filePath = "./mastodon-posts.md";
  console.log(`Saving all ${allPosts.length} posts to ${filePath}...`);
  await Bun.write(filePath, content);
  console.log("Done!");
};
