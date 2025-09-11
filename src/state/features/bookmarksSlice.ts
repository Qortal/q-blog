import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type BookmarkType = 'post' | 'blog' | 'link';
export interface BookmarkItem {
  href: string; // router path like /:user/:blog or /:user/:blog/:postId
  title: string;
  created: number;
  type: BookmarkType;
  folder?: string; // optional grouping
}

interface BookmarksState {
  bookmarksLocal: BookmarkItem[];
}

const initialState: BookmarksState = {
  bookmarksLocal: [],
};

const storageKey = (username?: string | null) =>
  `q-blog-bookmarks-${username && username.length ? username : 'guest'}`;

const bookmarksSlice = createSlice({
  name: 'bookmarks',
  initialState,
  reducers: {
    loadBookmarksForUser: (state, action: PayloadAction<{ username?: string | null }>) => {
      try {
        const key = storageKey(action.payload.username);
        const raw = localStorage.getItem(key);
        const arr: BookmarkItem[] = raw ? JSON.parse(raw) : [];
        state.bookmarksLocal = Array.isArray(arr) ? arr : [];
      } catch {
        state.bookmarksLocal = [];
      }
    },
    addBookmark: (
      state,
      action: PayloadAction<{ username?: string | null; item: BookmarkItem }>,
    ) => {
      const { username, item } = action.payload;
      const exists = state.bookmarksLocal.some((b) => b.href === item.href);
      const next = exists
        ? state.bookmarksLocal.map((b) => (b.href === item.href ? item : b))
        : [...state.bookmarksLocal, item];
      state.bookmarksLocal = next;
      try {
        localStorage.setItem(storageKey(username), JSON.stringify(next));
      } catch {}
    },
    setBookmarkFolder: (
      state,
      action: PayloadAction<{ username?: string | null; href: string; folder?: string }>,
    ) => {
      const { username, href, folder } = action.payload;
      const next = state.bookmarksLocal.map((b) => (b.href === href ? { ...b, folder } : b));
      state.bookmarksLocal = next;
      try {
        localStorage.setItem(storageKey(username), JSON.stringify(next));
      } catch {}
    },
    removeBookmark: (state, action: PayloadAction<{ username?: string | null; href: string }>) => {
      const { username, href } = action.payload;
      const next = state.bookmarksLocal.filter((b) => b.href !== href);
      state.bookmarksLocal = next;
      try {
        localStorage.setItem(storageKey(username), JSON.stringify(next));
      } catch {}
    },
  },
});

export const { loadBookmarksForUser, addBookmark, removeBookmark, setBookmarkFolder } =
  bookmarksSlice.actions;
export default bookmarksSlice.reducer;
