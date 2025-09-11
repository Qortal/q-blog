import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addPosts,
  addToHashMap,
  BlogPost,
  populateFavorites,
  setCountNewPosts,
  upsertFilteredPosts,
  upsertPosts,
  upsertPostsBeginning,
  upsertSubscriptionPosts,
} from '../state/features/blogSlice';
import { setCurrentBlog, setIsLoadingGlobal } from '../state/features/globalSlice';
import { RootState } from '../state/store';
import { fetchAndEvaluatePosts } from '../utils/fetchPosts';
import { selectCanonical, BlogSettings } from '../utils/wiki';
import { getCachedBlogSettings } from '../utils/wikiSettingsCache';

export const useFetchPosts = () => {
  const dispatch = useDispatch();
  const hashMapPosts = useSelector((state: RootState) => state.blog.hashMapPosts);
  const posts = useSelector((state: RootState) => state.blog.posts);
  const filteredPosts = useSelector((state: RootState) => state.blog.filteredPosts);
  const favoritesLocal = useSelector((state: RootState) => state.blog.favoritesLocal);
  const favorites = useSelector((state: RootState) => state.blog.favorites);
  const subscriptionPosts = useSelector((state: RootState) => state.blog.subscriptionPosts);
  const subscriptions = useSelector((state: RootState) => state.blog.subscriptions);

  const checkAndUpdatePost = React.useCallback(
    (post: BlogPost) => {
      // Check if the post exists in hashMapPosts
      const existingPost = hashMapPosts[post.id + '-' + post.user];
      if (!existingPost) {
        // If the post doesn't exist, add it to hashMapPosts
        return true;
      } else if (
        post?.updated &&
        existingPost?.updated &&
        (!existingPost?.updated || post?.updated) > existingPost?.updated
      ) {
        // If the post exists and its updated is more recent than the existing post's updated, update it in hashMapPosts
        return true;
      } else {
        return false;
      }
    },
    [hashMapPosts],
  );

  const getBlogPost = async (user: string, postId: string, content: any) => {
    const res = await fetchAndEvaluatePosts({
      user,
      postId,
      content,
    });

    dispatch(addToHashMap(res));
  };

  const checkNewMessages = React.useCallback(async () => {
    try {
      const url = `/arbitrary/resources/search?mode=ALL&service=BLOG_POST&query=q-blog-&limit=20&includemetadata=true&reverse=true&excludeblocked=true`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const responseData = await response.json();
      const latestPost = posts[0];
      if (!latestPost) return;
      const findPost = responseData?.findIndex((item: any) => item?.identifier === latestPost?.id);
      if (findPost === -1) {
        dispatch(setCountNewPosts(responseData.length));
        return;
      }
      const newArray = responseData.slice(0, findPost);
      dispatch(setCountNewPosts(newArray.length));
      return;
    } catch (error) {}
  }, [posts]);

  const getNewPosts = React.useCallback(async () => {
    try {
      dispatch(setIsLoadingGlobal(true));
      dispatch(setCountNewPosts(0));
      const url = `/arbitrary/resources/search?mode=ALL&service=BLOG_POST&query=q-blog-&limit=20&includemetadata=true&reverse=true&excludeblocked=true`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const responseData = await response.json();
      const latestPost = posts[0];
      if (!latestPost) return;
      const findPost = responseData?.findIndex((item: any) => item?.identifier === latestPost?.id);
      let fetchAll = responseData;
      let willFetchAll = true;
      if (findPost !== -1) {
        willFetchAll = false;
        fetchAll = responseData.slice(0, findPost);
      }
      // Canonicalize by identifier using per-blog settings cache
      const grouped = new Map<string, any[]>();
      for (const it of fetchAll) {
        const id = it.identifier;
        const arr = grouped.get(id) || [];
        arr.push(it);
        grouped.set(id, arr);
      }
      const selectedItems: any[] = [];
      const entries = Array.from(grouped.entries());
      // Preload settings for blog ids that have duplicate authors
      const toPrefetch = Array.from(
        new Set(
          entries
            .filter(([_, arr]) => arr.length > 1)
            .map(([id]) => id.split('-post-')[0] as string),
        ),
      );
      const preloaded = await Promise.all(
        toPrefetch.map((blogFull) =>
          getCachedBlogSettings(blogFull).then((v) => [blogFull, v] as const),
        ),
      );
      const settingsMap = new Map<string, { ownerName: string; settings: BlogSettings }>(preloaded);

      for (const [id, arr] of entries) {
        const [blogFull] = id.split('-post-');
        if (arr.length === 1) {
          selectedItems.push(arr[0]);
          continue;
        }
        const preload = settingsMap.get(blogFull) || (await getCachedBlogSettings(blogFull));
        const ownerName = (preload as any).ownerName as string;
        const settings = (preload as any).settings as BlogSettings;
        if (settings?.wikiEnabled) {
          const revisions = arr.map((it: any) => ({
            id: it.identifier,
            originPostId: it.identifier,
            lineageBlogId: blogFull,
            authorName: it.name,
            updatedAt: it.updated,
            qdnUpdated: it.updated,
            published: true,
          }));
          const chosen = selectCanonical(revisions, settings as BlogSettings, ownerName, {
            expectedLineageBlogId: blogFull,
          });
          const item = chosen
            ? arr.find((it: any) => it.name === chosen.authorName) || arr[0]
            : arr[0];
          selectedItems.push(item);
        } else {
          const ownerItem = arr.find((it: any) => it.name === ownerName);
          if (ownerItem) selectedItems.push(ownerItem);
          else selectedItems.push(arr.sort((a: any, b: any) => b.updated - a.updated)[0]);
        }
      }
      const structureData = selectedItems.map(
        (post: any): BlogPost => ({
          title: post?.metadata?.title,
          category: post?.metadata?.category,
          categoryName: post?.metadata?.categoryName,
          tags: post?.metadata?.tags || [],
          description: post?.metadata?.description,
          createdAt: post?.created,
          updated: post?.updated,
          user: post.name,
          postImage: '',
          id: post.identifier,
        }),
      );
      if (!willFetchAll) {
        dispatch(upsertPostsBeginning(structureData));
      }
      if (willFetchAll) {
        dispatch(addPosts(structureData));
      }

      for (const content of structureData) {
        if (content.user && content.id) {
          const res = checkAndUpdatePost(content);
          if (res) {
            getBlogPost(content.user, content.id, content);
          }
        }
      }
    } catch (error) {
    } finally {
      dispatch(setIsLoadingGlobal(false));
    }
  }, [posts, hashMapPosts]);

  const getBlogPosts = React.useCallback(async () => {
    try {
      const offset = posts.length;

      dispatch(setIsLoadingGlobal(true));
      const url = `/arbitrary/resources/search?mode=ALL&service=BLOG_POST&query=q-blog-&limit=20&includemetadata=true&offset=${offset}&reverse=true&excludeblocked=true`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const responseData = await response.json();
      // Canonicalize by identifier using per-blog settings cache
      const grouped = new Map<string, any[]>();
      for (const it of responseData) {
        const id = it.identifier;
        const arr = grouped.get(id) || [];
        arr.push(it);
        grouped.set(id, arr);
      }
      const selectedItems: any[] = [];
      const entries = Array.from(grouped.entries());
      const toPrefetch = Array.from(
        new Set(
          entries
            .filter(([_, arr]) => arr.length > 1)
            .map(([id]) => id.split('-post-')[0] as string),
        ),
      );
      const preloaded = await Promise.all(
        toPrefetch.map((blogFull) =>
          getCachedBlogSettings(blogFull).then((v) => [blogFull, v] as const),
        ),
      );
      const settingsMap = new Map<string, { ownerName: string; settings: BlogSettings }>(preloaded);

      for (const [id, arr] of entries) {
        const [blogFull] = id.split('-post-');
        if (arr.length === 1) {
          selectedItems.push(arr[0]);
          continue;
        }
        const preload = settingsMap.get(blogFull) || (await getCachedBlogSettings(blogFull));
        const ownerName = (preload as any).ownerName as string;
        const settings = (preload as any).settings as BlogSettings;
        if (settings?.wikiEnabled) {
          const revisions = arr.map((it: any) => ({
            id: it.identifier,
            originPostId: it.identifier,
            lineageBlogId: blogFull,
            authorName: it.name,
            updatedAt: it.updated,
            qdnUpdated: it.updated,
            published: true,
          }));
          const chosen = selectCanonical(revisions, settings as BlogSettings, ownerName, {
            expectedLineageBlogId: blogFull,
          });
          const item = chosen
            ? arr.find((it: any) => it.name === chosen.authorName) || arr[0]
            : arr[0];
          selectedItems.push(item);
        } else {
          const ownerItem = arr.find((it: any) => it.name === ownerName);
          if (ownerItem) selectedItems.push(ownerItem);
          else selectedItems.push(arr.sort((a: any, b: any) => b.updated - a.updated)[0]);
        }
      }
      const structureData = selectedItems.map(
        (post: any): BlogPost => ({
          title: post?.metadata?.title,
          category: post?.metadata?.category,
          categoryName: post?.metadata?.categoryName,
          tags: post?.metadata?.tags || [],
          description: post?.metadata?.description,
          createdAt: post?.created,
          updated: post?.updated,
          user: post.name,
          postImage: '',
          id: post.identifier,
        }),
      );
      dispatch(upsertPosts(structureData));

      for (const content of structureData) {
        if (content.user && content.id) {
          const res = checkAndUpdatePost(content);
          if (res) {
            getBlogPost(content.user, content.id, content);
          }
        }
      }
    } catch (error) {
    } finally {
      dispatch(setIsLoadingGlobal(false));
    }
  }, [posts, hashMapPosts]);
  const getBlogFilteredPosts = React.useCallback(
    async (filterValue: string) => {
      try {
        const offset = filteredPosts.length;

        dispatch(setIsLoadingGlobal(true));
        const url = `/arbitrary/resources/search?mode=ALL&service=BLOG_POST&query=q-blog-&limit=20&includemetadata=true&offset=${offset}&reverse=true&excludeblocked=true&name=${filterValue}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const responseData = await response.json();
        const structureData = responseData.map((post: any): BlogPost => {
          return {
            title: post?.metadata?.title,
            category: post?.metadata?.category,
            categoryName: post?.metadata?.categoryName,
            tags: post?.metadata?.tags || [],
            description: post?.metadata?.description,
            createdAt: post?.created,
            updated: post?.updated,
            user: post.name,
            postImage: '',
            id: post.identifier,
          };
        });
        dispatch(upsertFilteredPosts(structureData));

        for (const content of structureData) {
          if (content.user && content.id) {
            const res = checkAndUpdatePost(content);
            if (res) {
              getBlogPost(content.user, content.id, content);
            }
          }
        }
      } catch (error) {
      } finally {
        dispatch(setIsLoadingGlobal(false));
      }
    },
    [filteredPosts, hashMapPosts],
  );

  const getBlogPostsSubscriptions = React.useCallback(
    async (username: string) => {
      try {
        const offset = subscriptionPosts.length;
        dispatch(setIsLoadingGlobal(true));
        const url = `/arbitrary/resources/search?mode=ALL&service=BLOG_POST&query=q-blog-&limit=20&includemetadata=true&offset=${offset}&reverse=true&namefilter=q-blog-subscriptions-${username}&excludeblocked=true`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const responseData = await response.json();
        // Canonicalize duplicates by identifier using settings cache
        const grouped = new Map<string, any[]>();
        for (const it of responseData) {
          const id = it.identifier;
          const arr = grouped.get(id) || [];
          arr.push(it);
          grouped.set(id, arr);
        }
        const selectedItems: any[] = [];
        const entries = Array.from(grouped.entries());
        const toPrefetch = Array.from(
          new Set(
            entries
              .filter(([_, arr]) => arr.length > 1)
              .map(([id]) => id.split('-post-')[0] as string),
          ),
        );
        const preloaded = await Promise.all(
          toPrefetch.map((blogFull) =>
            getCachedBlogSettings(blogFull).then((v) => [blogFull, v] as const),
          ),
        );
        const settingsMap = new Map<string, { ownerName: string; settings: BlogSettings }>(
          preloaded,
        );

        for (const [id, arr] of entries) {
          const [blogFull] = id.split('-post-');
          if (arr.length === 1) {
            selectedItems.push(arr[0]);
            continue;
          }
          const preload = settingsMap.get(blogFull) || (await getCachedBlogSettings(blogFull));
          const ownerName = (preload as any).ownerName as string;
          const settings = (preload as any).settings as BlogSettings;
          if (settings?.wikiEnabled) {
            const revisions = arr.map((it: any) => ({
              id: it.identifier,
              originPostId: it.identifier,
              lineageBlogId: blogFull,
              authorName: it.name,
              updatedAt: it.updated,
              qdnUpdated: it.updated,
              published: true,
            }));
            const chosen = selectCanonical(revisions, settings as BlogSettings, ownerName, {
              expectedLineageBlogId: blogFull,
            });
            const item = chosen
              ? arr.find((it: any) => it.name === chosen.authorName) || arr[0]
              : arr[0];
            selectedItems.push(item);
          } else {
            const ownerItem = arr.find((it: any) => it.name === ownerName);
            if (ownerItem) selectedItems.push(ownerItem);
            else selectedItems.push(arr.sort((a: any, b: any) => b.updated - a.updated)[0]);
          }
        }
        const structureData = selectedItems.map(
          (post: any): BlogPost => ({
            title: post?.metadata?.title,
            category: post?.metadata?.category,
            categoryName: post?.metadata?.categoryName,
            tags: post?.metadata?.tags || [],
            description: post?.metadata?.description,
            createdAt: '',
            user: post.name,
            postImage: '',
            id: post.identifier,
          }),
        );
        dispatch(upsertSubscriptionPosts(structureData));

        for (const content of structureData) {
          if (content.user && content.id) {
            const res = checkAndUpdatePost(content);
            if (res) {
              getBlogPost(content.user, content.id, content);
            }
          }
        }
      } catch (error) {
      } finally {
        dispatch(setIsLoadingGlobal(false));
      }
    },
    [subscriptionPosts, hashMapPosts, subscriptions],
  );

  const getBlogPostsFavorites = React.useCallback(async () => {
    try {
      const offset = favorites.length;
      const favSlice = (favoritesLocal || []).slice(offset, 20);
      let favs = [];
      for (const item of favSlice) {
        try {
          // Fetch across Names by identifier and select canonical per wiki settings
          const url = `/arbitrary/resources/search?mode=ALL&service=BLOG_POST&identifier=${item.id}&limit=50&includemetadata=true&reverse=true&excludeblocked=true`;
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const [blogFull] = (item.id as string).split('-post-');
            const { ownerName, settings } = await getCachedBlogSettings(blogFull);
            if (settings?.wikiEnabled) {
              const revisions = data.map((it: any) => ({
                id: it.identifier,
                originPostId: it.identifier,
                lineageBlogId: blogFull,
                authorName: it.name,
                updatedAt: it.updated,
                qdnUpdated: it.updated,
                published: true,
              }));
              const chosen = selectCanonical(revisions, settings as BlogSettings, ownerName, {
                expectedLineageBlogId: blogFull,
              });
              const itemChosen = chosen
                ? data.find((it: any) => it.name === chosen.authorName) || data[0]
                : data[0];
              favs.push(itemChosen);
            } else {
              const ownerItem = data.find((it: any) => it.name === ownerName);
              favs.push(ownerItem || data.sort((a: any, b: any) => b.updated - a.updated)[0]);
            }
          }
        } catch (error) {}
      }
      const structureData = favs.map((post: any): BlogPost => {
        return {
          title: post?.metadata?.title,
          category: post?.metadata?.category,
          categoryName: post?.metadata?.categoryName,
          tags: post?.metadata?.tags || [],
          description: post?.metadata?.description,
          createdAt: '',
          user: post.name,
          postImage: '',
          id: post.identifier,
        };
      });
      dispatch(populateFavorites(structureData));

      for (const content of structureData) {
        if (content.user && content.id) {
          const res = checkAndUpdatePost(content);
          if (res) {
            getBlogPost(content.user, content.id, content);
          }
        }
      }
    } catch (error) {
    } finally {
    }
  }, [hashMapPosts, favoritesLocal]);
  return {
    getBlogPosts,
    getBlogPostsFavorites,
    getBlogPostsSubscriptions,
    checkAndUpdatePost,
    getBlogPost,
    hashMapPosts,
    checkNewMessages,
    getNewPosts,
    getBlogFilteredPosts,
  };
};
