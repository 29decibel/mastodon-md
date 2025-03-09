export interface Post {
  id: string;
  content: string;
  created_at: string;
  media_attachments: {
    id: string;
    url: string;
    filename: string;
    localPath: string;
  }[];
}

export interface QueuedPost {
  date: string; // ISO date string
  content: string;
}
