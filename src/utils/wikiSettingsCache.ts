import type { BlogSettings } from './wiki';

export interface CachedBlogSettings {
  ownerName: string;
  settings: BlogSettings;
}

const cache = new Map<string, Promise<CachedBlogSettings>>();

export async function getCachedBlogSettings(blogFullId: string): Promise<CachedBlogSettings> {
  if (cache.has(blogFullId)) return cache.get(blogFullId)!;

  const p = (async () => {
    // 1) Find BLOG owner name by identifier
    const findUrl = `/arbitrary/resources?service=BLOG&identifier=${encodeURIComponent(
      blogFullId,
    )}&limit=1&includemetadata=true`;
    const findResp = await fetch(findUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const list = (await findResp.json()) || [];
    const ownerName = list?.[0]?.name || '';
    // Prefer settings from metadata if present to avoid extra fetch
    const meta = list?.[0]?.metadata || {};
    if (ownerName) {
      const metaHasWiki =
        Object.prototype.hasOwnProperty.call(meta || {}, 'wikiEnabled') ||
        Object.prototype.hasOwnProperty.call(meta || {}, 'editorWhitelist') ||
        Object.prototype.hasOwnProperty.call(meta || {}, 'editorBlacklist');
      if (metaHasWiki) {
        const settings: BlogSettings = {
          wikiEnabled: !!meta?.wikiEnabled,
          editorWhitelist: Array.isArray(meta?.editorWhitelist) ? meta.editorWhitelist : [],
          editorBlacklist: Array.isArray(meta?.editorBlacklist) ? meta.editorBlacklist : [],
        };
        return { ownerName, settings };
      }
    }
    if (!ownerName) {
      // No BLOG entry found; return defaults
      return {
        ownerName: '',
        settings: { wikiEnabled: false, editorWhitelist: [], editorBlacklist: [] },
      };
    }
    // 2) Fetch BLOG JSON for settings
    const blogUrl = `/arbitrary/BLOG/${encodeURIComponent(ownerName)}/${encodeURIComponent(
      blogFullId,
    )}`;
    const blogResp = await fetch(blogUrl, { headers: { 'Content-Type': 'application/json' } });
    let settings: BlogSettings = { wikiEnabled: false, editorWhitelist: [], editorBlacklist: [] };
    if (blogResp.ok) {
      const data = await blogResp.json();
      settings = {
        wikiEnabled: !!data?.wikiEnabled,
        editorWhitelist: Array.isArray(data?.editorWhitelist) ? data.editorWhitelist : [],
        editorBlacklist: Array.isArray(data?.editorBlacklist) ? data.editorBlacklist : [],
      };
    }
    return { ownerName, settings };
  })();

  cache.set(blogFullId, p);
  return p;
}
