import localforage from 'localforage';
import { addBookmark, BookmarkItem } from '../state/features/bookmarksSlice';
import { removePrefix } from '../utils/blogIdformats';

const FAVORITES_GLOBAL = 'q-blog-favorites';
const FAVORITES_PREFIX = 'q-blog-favorites-';

interface FavoriteStoredItem {
  user: string;
  id: string; // identifier like q-blog-<blog>-post-<postId>
}

function buildHref(item: FavoriteStoredItem): string | null {
  try {
    const id = item.id;
    if (!id || !id.includes('-post-')) return null;
    const [blogFull, postId] = id.split('-post-');
    const blogShort = removePrefix(blogFull);
    if (!blogShort || !postId || !item.user) return null;
    return `/${encodeURIComponent(item.user)}/${encodeURIComponent(blogShort)}/${encodeURIComponent(
      postId,
    )}`;
  } catch {
    return null;
  }
}

async function importFromInstance(
  instanceName: string,
  username: string | null | undefined,
  dispatch: (action: any) => void,
): Promise<number> {
  const inst = localforage.createInstance({ name: instanceName });
  let count = 0;
  try {
    await inst.iterate<FavoriteStoredItem, void>((value, key, iterationNumber) => {
      if (!value || !value.id || !value.user) return;
      const href = buildHref(value);
      if (!href) return;
      const item: BookmarkItem = {
        href,
        title: value.id,
        created: Date.now(),
        type: 'post',
      };
      dispatch(addBookmark({ username, item }));
      count += 1;
    });
    // Clear after import
    await inst.clear();
  } catch {
    // ignore errors, treat as zero imported
  }
  return count;
}

export async function migrateFavoritesToBookmarks(
  username: string | null | undefined,
  dispatch: (action: any) => void,
): Promise<number> {
  const flagKey = `qblog_fav_migrated_${username || 'guest'}`;
  try {
    if (localStorage.getItem(flagKey) === '1') return 0;
  } catch {}

  let total = 0;
  // Import from both legacy buckets
  total += await importFromInstance(FAVORITES_GLOBAL, username ?? null, dispatch);
  if (username)
    total += await importFromInstance(`${FAVORITES_PREFIX}${username}`, username, dispatch);

  try {
    localStorage.setItem(flagKey, '1');
  } catch {}
  return total;
}

export default migrateFavoritesToBookmarks;
