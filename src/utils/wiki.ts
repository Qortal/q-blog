export interface BlogSettings {
  wikiEnabled?: boolean; // missing = false
  editorWhitelist?: string[]; // missing or empty = global allow
  editorBlacklist?: string[]; // missing = none
}

export interface RevisionMeta {
  id: string; // full BLOG_POST identifier
  originPostId?: string; // first ancestor; fallback to id
  parentPostId?: string;
  lineageBlogId?: string; // owner’s blog id; fallback provided lineage
  authorName: string; // registered name of the author
  updatedAt?: string | number; // ISO or epoch ms; fallback to qdnUpdated
  qdnUpdated?: number; // numeric QDN updated timestamp if available
  published?: boolean; // defaults true if missing
}

function toSet(arr?: string[]): Set<string> {
  return new Set((arr || []).filter(Boolean));
}

export function isAuthorized(
  authorName: string,
  settings: BlogSettings,
  ownerName: string,
): boolean {
  if (!authorName) return false;
  // Owner always allowed
  if (ownerName && authorName === ownerName) return true;

  const enabled = !!settings?.wikiEnabled;
  if (!enabled) return false;

  const blacklist = toSet(settings?.editorBlacklist);
  const whitelist = toSet(settings?.editorWhitelist);

  if (blacklist.has(authorName)) return false; // blacklist precedence

  if (whitelist.size > 0) {
    return whitelist.has(authorName);
  }
  // whitelist empty → global allow (minus blacklist already handled)
  return true;
}

export function canEdit(
  viewerName: string | undefined,
  settings: BlogSettings,
  ownerName: string,
): boolean {
  if (!viewerName) return false;
  // Owner always allowed
  if (ownerName && viewerName === ownerName) return true;

  if (!settings?.wikiEnabled) return false;

  const blacklist = toSet(settings?.editorBlacklist);
  if (blacklist.has(viewerName)) return false;

  const whitelist = toSet(settings?.editorWhitelist);
  if (whitelist.size > 0) return whitelist.has(viewerName);

  return true; // global allow
}

function getOriginId(r: RevisionMeta): string {
  return r.originPostId || r.id;
}

function numTime(value: string | number | undefined, fallback?: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value as number;
  if (typeof value === 'string') {
    const t = Date.parse(value);
    if (!Number.isNaN(t)) return t;
  }
  return fallback ?? 0;
}

export interface SelectCanonicalOptions {
  expectedLineageBlogId?: string;
}

export function selectCanonical(
  revisions: RevisionMeta[],
  settings: BlogSettings,
  ownerName: string,
  opts: SelectCanonicalOptions = {},
): RevisionMeta | null {
  if (!Array.isArray(revisions) || revisions.length === 0) return null;

  // Group by origin id
  const groups = new Map<string, RevisionMeta[]>();
  for (const r of revisions) {
    const pub = r.published ?? true;
    if (!pub) continue;
    if (
      opts.expectedLineageBlogId &&
      r.lineageBlogId &&
      opts.expectedLineageBlogId !== r.lineageBlogId
    ) {
      continue;
    }
    if (!isAuthorized(r.authorName, settings, ownerName)) continue;
    const origin = getOriginId(r);
    const arr = groups.get(origin) || [];
    arr.push(r);
    groups.set(origin, arr);
  }

  // For now, if multiple groups exist, choose the latest canonical across all groups.
  // Callers can pre-filter to a single origin when needed.
  let best: RevisionMeta | null = null;
  const owner = ownerName;

  function better(a: RevisionMeta | null, b: RevisionMeta): RevisionMeta {
    if (!a) return b;
    const aTime = numTime(a.updatedAt, a.qdnUpdated);
    const bTime = numTime(b.updatedAt, b.qdnUpdated);
    if (bTime !== aTime) return bTime > aTime ? b : a;
    const aOwner = a.authorName === owner;
    const bOwner = b.authorName === owner;
    if (aOwner !== bOwner) return bOwner ? b : a; // owner wins tie
    // lowest id wins as last tiebreaker
    return b.id < a.id ? b : a;
  }

  for (const [, arr] of groups) {
    // pick best within group
    let groupBest: RevisionMeta | null = null;
    for (const r of arr) groupBest = better(groupBest, r);
    if (groupBest) best = better(best, groupBest);
  }

  return best;
}
