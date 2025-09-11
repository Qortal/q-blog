import { addPrefix, removePrefix } from './blogIdformats';

export interface BlogSummary {
  name: string;
  blogId: string; // full identifier e.g., q-blog-xxxxx
  handle: string; // short handle without prefix
  title: string;
  createdAt?: number;
}

// Lists all BLOG resources for an exact name whose identifier starts with q-blog-
export async function listBlogsByName(name: string): Promise<BlogSummary[]> {
  if (!name) return [];
  const url = `/arbitrary/resources/search?mode=ALL&service=BLOG&identifier=q-blog-&exactmatchnames=true&name=${encodeURIComponent(
    name,
  )}&prefix=true&limit=100&includemetadata=true`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  const items = (Array.isArray(data) ? data : []).filter(
    (b: any) => typeof b?.identifier === 'string' && b.identifier.startsWith('q-blog-'),
  );
  return items.map((b: any) => ({
    name: b.name,
    blogId: b.identifier,
    handle: removePrefix(b.identifier),
    title: b?.metadata?.title || '',
    createdAt: b?.created,
  }));
}

export interface BlogDetails {
  title: string;
  description: string;
  blogImage: string;
  createdAt: number;
  category?: string;
  tags?: string[];
  // Wiki settings (optional; missing implies defaults)
  wikiEnabled?: boolean;
  editorWhitelist?: string[];
  editorBlacklist?: string[];
}

// Fetch a specific blog JSON payload
export async function fetchBlogDetails(name: string, blogId: string): Promise<BlogDetails | null> {
  if (!name || !blogId) return null;
  const url = `/arbitrary/BLOG/${encodeURIComponent(name)}/${encodeURIComponent(blogId)}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) return null;
  return await resp.json();
}
