import generator from "megalodon";

export const ATTACHMENTS_DIR = "./attachments";

export const BASE_URL: string =
  process.env.MASTODON_HOST_URL || "https://mastodon.social";
export const access_token: string = process.env.MASTODON_ACCESS_TOKEN || "";

if (!access_token) {
  throw new Error("MASTODON_ACCESS_TOKEN is not set");
}

export const client = generator("mastodon", BASE_URL, access_token);
