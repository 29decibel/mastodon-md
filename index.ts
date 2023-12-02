import generator, { Entity } from "megalodon";
import TurndownService from "turndown";

const turndownService = new TurndownService();

const BASE_URL: string = "https://mastodon.social";
const access_token: string = process.env.MASTODON_ACCESS_TOKEN || "";

if (!access_token) {
  throw new Error("MASTODON_ACCESS_TOKEN is not set");
}

interface Post {
  id: string;
  content: string;
  created_at: string;
}

function postToMarkdown(post: Post) {
  return `
---
date: ${post.created_at}
draft: false
layout: mastodon
---
${post.content}
  `;
}

async function savePostToMarkdown(post: Post) {
  const file = `./mastodon/${post.id}.md`;
  console.log(`Saving ${file}...`);
  await Bun.write(file, postToMarkdown(post));
}

async function saveAllPostsToMarkdown(posts: Post[]) {
  await Promise.all(posts.map(savePostToMarkdown));
}

const client = generator("mastodon", BASE_URL, access_token);

// Get your account information to retrieve your account ID
// Fetch your account information to get your user ID
const account = await client.verifyAccountCredentials();

const myUserId = account.data.id;

const fetchPosts = async (maxId: string | null = null) => {
  console.log("Fetching posts...");
  let params = {};
  if (maxId) {
    params = { max_id: maxId, limit: 40 };
  }

  const posts = await client.getAccountStatuses(myUserId, params);
  const postsData = posts.data
    .filter(
      (post: Entity.Status) => post.visibility === "public" && post.content
    )
    .map((post: Entity.Status): Post => {
      return {
        id: post.id,
        content: turndownService.turndown(post.content),
        created_at: post.created_at,
      };
    });

  await saveAllPostsToMarkdown(postsData);

  if (posts.data.length > 0) {
    // Fetch next page
    const nextMaxId = posts.data[posts.data.length - 1].id;
    await fetchPosts(nextMaxId);
  }
};

fetchPosts();
