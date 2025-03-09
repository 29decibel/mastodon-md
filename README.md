# mastodon-md

A utility to download Mastodon posts to a markdown file and post content from a queue to your Mastodon account.

## Features

- Download all your public Mastodon posts to a single markdown file
- Save media attachments locally
- Maintain a queue of posts to be published on schedule
- Publish posts immediately or at scheduled dates

## Installation

```bash
bun install
```

## Configuration

Create an `.env` file with your Mastodon credentials:

```
MASTODON_ACCESS_TOKEN="your_access_token"
MASTODON_HOST_URL="https://mastodon.social"
```

Alternatively, you can provide these as environment variables when running the commands.

## Usage

### Downloading your posts

To download all your public Mastodon posts to a markdown file:

```bash
bun run download
# or with environment variables
MASTODON_ACCESS_TOKEN="xxxxx" MASTODON_HOST_URL="https://mastodon.social" bun run download
```

This will:
- Create a `mastodon-posts.md` file containing all your posts
- Download all media attachments to the `attachments` directory

### Publishing posts from a queue

Create a `queue.md` file with the following format:

```markdown
---
date: 2025-03-09
---

This is a scheduled post that will be published on March 9, 2025.

---
date: now
---

This post will be published immediately when the queue is processed.
```

Each post consists of:
1. A frontmatter section with a `date` field (use `now` to publish immediately)
2. The post content
3. A separator (`---`) between posts

To process the queue and publish due posts:

```bash
bun run post
# or with environment variables
MASTODON_ACCESS_TOKEN="xxxxx" MASTODON_HOST_URL="https://mastodon.social" bun run post
```

Posts with `date: now` will be published immediately, while future-dated posts will be skipped until their scheduled date.

## Advanced Usage

### Automation

You can set up a cron job to periodically process your queue:

```
0 * * * * cd /path/to/mastodon-md && bun run src/index.ts post
```

This would check your queue every hour and publish any due posts.

## Example Workflow

1. **Set up your queue**:
   - Add posts to `queue.md` with appropriate dates
   - Use `date: now` for immediate posts

2. **Run the queue processor**:
   ```bash
   bun run post
   ```

3. **Review and download your posts**:
   ```bash
   bun run download
   ```

## License

MIT
