import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { addUser } from '../state/features/authSlice';
import { RootState } from '../state/store';

import PublishBlogModal from '../components/modals/PublishBlogModal';
import EditBlogModal from '../components/modals/EditBlogModal';
import NavBar from '../components/layout/Navbar/Navbar';
import ScrollToTop from '../components/common/ScrollToTop';
import { loadBookmarksForUser } from '../state/features/bookmarksSlice';
import migrateFavoritesToBookmarks from '../utils/migrateFavoritesToBookmarks';

import {
  setCurrentBlog,
  togglePublishBlogModal,
  toggleEditBlogModal,
  setNotifications,
  setNotificationCreatorComment,
} from '../state/features/globalSlice';

import type { NameRecord } from '../utils/qortalRequestFunctions';
import { getAccountNames, getPrimaryAccountName } from '../utils/qortalRequestFunctions';
import type { BlogSummary } from '../utils/blogs';
import { listBlogsByName } from '../utils/blogs';

type AuthStatus = 'idle' | 'loading' | 'succeeded' | 'failed';
type NamesStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface Props {
  children: React.ReactNode;
}

const GlobalWrapper: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((state: RootState) => state.auth);
  const {
    isOpenPublishBlogModal,
    isOpenEditBlogModal,
    currentBlog,
    notifications,
    notificationCreatorComment,
  } = useSelector((state: RootState) => state.global);

  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle');
  const [namesStatus, setNamesStatus] = useState<NamesStatus>('idle');
  const [allNames, setAllNames] = useState<NameRecord[]>([]);
  const [userBlogs, setUserBlogs] = useState<BlogSummary[]>([]);
  const [userAvatar, setUserAvatar] = useState<string>('');

  const fullNotifications = useMemo(
    () =>
      [...notificationCreatorComment, ...notifications].sort((a, b) => b.created - a.created)
        .length,
    [notificationCreatorComment, notifications],
  );

  // Keep tab notification count in sync (best-effort; ignore failures)
  useEffect(() => {
    (async () => {
      try {
        await qortalRequest({ action: 'SET_TAB_NOTIFICATIONS', count: fullNotifications });
      } catch {}
    })();
  }, [fullNotifications]);

  // Load bookmarks and migrate legacy favorites into bookmarks on user change
  useEffect(() => {
    (async () => {
      const username = user?.name || null;
      dispatch(loadBookmarksForUser({ username }));
      try {
        await migrateFavoritesToBookmarks(username, dispatch as any);
        dispatch(loadBookmarksForUser({ username }));
      } catch {}
    })();
  }, [user?.name, dispatch]);

  const askForAccountInformation = useCallback(async () => {
    if (authStatus === 'loading') return;
    setAuthStatus('loading');
    try {
      const account = await qortalRequest({ action: 'GET_USER_ACCOUNT' });

      setNamesStatus('loading');
      const [names, primaryName] = await Promise.all([
        getAccountNames(account?.address ?? '').catch(() => []),
        getPrimaryAccountName(account?.address ?? '').catch(() => ''),
      ]);

      setAllNames(Array.isArray(names) ? names : []);
      setNamesStatus('succeeded');

      dispatch(addUser({ ...account, name: primaryName || '' }));

      if (primaryName) {
        try {
          const blogs = await listBlogsByName(primaryName);
          setUserBlogs(blogs);
        } catch {}
      } else {
        dispatch(setCurrentBlog(null));
      }

      setAuthStatus('succeeded');
    } catch (e) {
      console.error(e);
      setAuthStatus('failed');
      setNamesStatus((s) => (s === 'loading' ? 'failed' : s));
    }
  }, [dispatch, authStatus]);

  // Auto-authenticate on first load (idempotent)
  useEffect(() => {
    if (authStatus === 'idle') {
      void askForAccountInformation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectBlog = useCallback(
    (blog: BlogSummary) => {
      if (!user?.name || !blog?.handle) return;
      navigate(`/${encodeURIComponent(user.name)}/${encodeURIComponent(blog.handle)}`);
    },
    [navigate, user?.name],
  );

  const onSwitchActiveName = useCallback(
    async (name: string) => {
      try {
        // Optimistic UI: update selected name immediately
        dispatch(addUser({ ...(user || {}), name } as any));
        try {
          const blogs = await listBlogsByName(name);
          setUserBlogs(blogs);
        } catch {}
        // Persist to extension / backend
        await qortalRequest({ action: 'SET_PRIMARY_NAME', name });
        // Refresh full account info (names, etc.)
        setAuthStatus('idle');
        await askForAccountInformation();
      } catch (e) {
        console.error(e);
      }
    },
    [dispatch, user, askForAccountInformation],
  );

  // Fetch user avatar (best-effort)
  useEffect(() => {
    (async () => {
      if (!user?.name) return;
      try {
        const url = await qortalRequest({
          action: 'GET_QDN_RESOURCE_URL',
          name: user.name,
          service: 'THUMBNAIL',
          identifier: 'qortal_avatar',
        });
        if (url && url !== 'Resource does not exist') setUserAvatar(url);
      } catch {}
    })();
  }, [user?.name]);

  return (
    <>
      <NavBar
        isAuthenticated={!!(user && user.name)}
        hasBlog={!!currentBlog}
        userName={user?.name ?? null}
        userAvatar={userAvatar}
        blog={currentBlog}
        authenticate={askForAccountInformation}
        hasAttemptedToFetchBlogInitial={true}
        allNames={allNames}
        onSwitchActiveName={onSwitchActiveName}
        userBlogs={userBlogs}
        onSelectBlog={onSelectBlog}
        authStatus={authStatus}
        namesStatus={namesStatus}
      />

      <PublishBlogModal
        open={!!isOpenPublishBlogModal}
        onClose={() => dispatch(togglePublishBlogModal(false))}
        onPublish={async () => {
          /* wired elsewhere; modal implements publish */
        }}
        username={user?.name || ''}
      />
      <EditBlogModal
        open={!!isOpenEditBlogModal}
        onClose={() => dispatch(toggleEditBlogModal(false))}
        onPublish={async () => {
          /* wired elsewhere; modal implements publish */
        }}
        currentBlog={currentBlog}
      />

      {children}
      <ScrollToTop />
    </>
  );
};

export default GlobalWrapper;
