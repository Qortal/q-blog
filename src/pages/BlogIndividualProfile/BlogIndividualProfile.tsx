import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { useParams } from 'react-router-dom';
import { Typography, Box, Button, useTheme } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import BlogPostPreview from '../BlogList/PostPreview';
import {
  setIsLoadingGlobal,
  setVisitingBlog,
  toggleEditBlogModal,
  togglePublishBlogModal,
} from '../../state/features/globalSlice';
import { addSubscription, BlogPost, removeSubscription } from '../../state/features/blogSlice';
import { addBookmark, removeBookmark } from '../../state/features/bookmarksSlice';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { Tooltip, IconButton } from '@mui/material';
import { useFetchPosts } from '../../hooks/useFetchPosts';
import LazyLoad from '../../components/common/LazyLoad';
import { addPrefix, removePrefix } from '../../utils/blogIdformats';
import Masonry from 'react-masonry-css';
import ContextMenuResource from '../../components/common/ContextMenu/ContextMenuResource';
import { canEdit, BlogSettings, selectCanonical } from '../../utils/wiki';

const breakpointColumnsObj = {
  default: 5,
  1600: 4,
  1300: 3,
  940: 2,
  700: 1,
  500: 1,
};
export const BlogIndividualProfile = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentBlog, visitingBlog } = useSelector((state: RootState) => state.global);
  const subscriptions = useSelector((state: RootState) => state.blog.subscriptions);
  const bookmarksLocal = useSelector((state: RootState) => state.bookmarks.bookmarksLocal);

  const { blog: blogShortVersion, user: username } = useParams();
  const blog = React.useMemo(() => {
    if (!blogShortVersion) return '';
    return addPrefix(blogShortVersion);
  }, [blogShortVersion]);
  const dispatch = useDispatch();
  const [userBlog, setUserBlog] = React.useState<any>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const { checkAndUpdatePost, getBlogPost, hashMapPosts } = useFetchPosts();

  const [blogPosts, setBlogPosts] = React.useState<BlogPost[]>([]);

  React.useEffect(() => {
    setUserBlog(null);
    setBlogPosts([]);
    setNotFound(false);
  }, [username, blog]);

  const getBlogPosts = React.useCallback(async () => {
    let name = username;

    if (!name) return;
    if (!blog) return;

    try {
      dispatch(setIsLoadingGlobal(true));
      const offset = blogPosts.length;
      const wikiEnabled = !!((userBlog as any)?.wikiEnabled ?? (visitingBlog as any)?.wikiEnabled);
      const baseUrl = wikiEnabled
        ? `/arbitrary/resources/search?mode=ALL&service=BLOG_POST&query=${blog}-post-&limit=20&includemetadata=true&offset=${offset}&reverse=true&excludeblocked=true`
        : `/arbitrary/resources/search?mode=ALL&service=BLOG_POST&query=${blog}-post-&limit=20&exactmatchnames=true&name=${name}&includemetadata=true&offset=${offset}&reverse=true`;
      const url = baseUrl;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const responseData = await response.json();

      let structureData: BlogPost[] = [];
      if (!wikiEnabled) {
        structureData = responseData.map(
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
      } else {
        // Group by identifier (origin fallback = id) and select canonical using wiki settings
        const settings = {
          wikiEnabled: true,
          editorWhitelist:
            (userBlog as any)?.editorWhitelist || (visitingBlog as any)?.editorWhitelist || [],
          editorBlacklist:
            (userBlog as any)?.editorBlacklist || (visitingBlog as any)?.editorBlacklist || [],
        };
        const ownerName = username || '';
        const groups = new Map<string, any[]>();
        for (const it of responseData) {
          const id = it.identifier;
          const arr = groups.get(id) || [];
          arr.push(it);
          groups.set(id, arr);
        }
        const selected: any[] = [];
        groups.forEach((arr, id) => {
          const revisions = arr.map((it: any) => ({
            id: it.identifier,
            originPostId: it.identifier,
            lineageBlogId: blog,
            authorName: it.name,
            updatedAt: it.updated,
            qdnUpdated: it.updated,
            published: true,
          }));
          const c = selectCanonical(revisions, settings as any, ownerName, {
            expectedLineageBlogId: blog,
          });
          if (!c) return;
          const chosen = arr.find((it: any) => it.name === c.authorName) || arr[0];
          selected.push(chosen);
        });
        structureData = selected.map(
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
      }

      // Merge into local state list
      const copiedBlogPosts: BlogPost[] = [...blogPosts];
      structureData.forEach((post: BlogPost) => {
        const index = copiedBlogPosts.findIndex((p) => p.id === post.id);
        if (index !== -1) copiedBlogPosts[index] = post;
        else copiedBlogPosts.push(post);
      });
      setBlogPosts(copiedBlogPosts);

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
  }, [username, blog, blogPosts]);
  const getBlog = React.useCallback(async () => {
    let name = username;

    if (!name) return;
    if (!blog) return;
    try {
      const urlBlog = `/arbitrary/BLOG/${name}/${blog}`;
      const response = await fetch(urlBlog, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        setNotFound(true);
        setUserBlog(null);
        return;
      }
      const responseData = await response.json();
      dispatch(setVisitingBlog({ ...responseData, name }));
      setUserBlog(responseData);
      setNotFound(false);
    } catch (error) {
      setNotFound(true);
      setUserBlog(null);
    }
  }, [username, blog]);

  React.useEffect(() => {
    getBlog();
  }, [username, blog]);
  React.useEffect(() => {
    // Load first page of posts once blog context is known
    if (username && blog) {
      getBlogPosts();
    }
  }, [username, blog]);

  // Refresh posts when wiki settings toggle changes (e.g., after loading BLOG JSON or switching blogs)
  React.useEffect(() => {
    if (!username || !blog) return;
    setBlogPosts([]);
    getBlogPosts();
  }, [username, blog, userBlog?.wikiEnabled, visitingBlog?.wikiEnabled]);
  const getPosts = React.useCallback(async () => {
    await getBlogPosts();
  }, [getBlogPosts]);

  console.log({ blogPosts });

  const subscribe = async () => {
    try {
      if (!user?.name) return;
      if (!username) return;
      const body = {
        items: [username],
      };

      const listName = `q-blog-subscriptions-${user.name}`;

      const response = await qortalRequest({
        action: 'ADD_LIST_ITEMS',
        list_name: listName,
        items: [username],
      });
      if (response === true) {
        dispatch(addSubscription(username));
      }
    } catch (error) {}
  };
  const unsubscribe = async () => {
    try {
      if (!user?.name) return;
      if (!username) return;

      const listName = `q-blog-subscriptions-${user.name}`;

      const response = await qortalRequest({
        action: 'DELETE_LIST_ITEM',
        list_name: listName,
        item: username,
      });
      if (response === true) {
        dispatch(removeSubscription(username));
      }
    } catch (error) {}
  };

  const [isListView, setIsListView] = React.useState(
    () => (localStorage.getItem('qblog_view') || 'tile') === 'list',
  );

  React.useEffect(() => {
    const onViewMode = (e: Event) => {
      const ce = e as CustomEvent;
      setIsListView(ce.detail === 'list');
    };
    window.addEventListener('qblog:viewmode', onViewMode as EventListener);
    return () => window.removeEventListener('qblog:viewmode', onViewMode as EventListener);
  }, []);

  if (notFound) {
    const isOwner = user?.name && username && user.name === username;
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          mt: 6,
        }}
      >
        <Typography variant="h5" color="textPrimary" sx={{ textAlign: 'center' }}>
          {username} hasn&apos;t created a blog yet.
        </Typography>
        {isOwner && (
          <Button
            variant="contained"
            onClick={() => dispatch(togglePublishBlogModal(true))}
            sx={{ mt: 1 }}
          >
            Create Blog
          </Button>
        )}
      </Box>
    );
  }

  if (!userBlog) return null;
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="h1"
          color="textPrimary"
          sx={{
            textAlign: 'center',
            marginTop: '20px',
          }}
        >
          {currentBlog?.blogId === blog ? currentBlog?.title : userBlog.title}
        </Typography>
        {currentBlog?.blogId === blog && (
          <EditIcon
            sx={{
              cursor: 'pointer',
            }}
            onClick={() => {
              dispatch(toggleEditBlogModal(true));
            }}
          ></EditIcon>
        )}
        {subscriptions.includes(username) && (
          <Button
            sx={{
              backgroundColor: theme.palette.primary.light,
              color: theme.palette.text.primary,
              fontFamily: 'Arial',
            }}
            onClick={unsubscribe}
          >
            Unsubscribe
          </Button>
        )}
        {!subscriptions.includes(username) && (
          <Button
            sx={{
              backgroundColor: theme.palette.primary.light,
              color: theme.palette.text.primary,
              fontFamily: 'Arial',
            }}
            onClick={subscribe}
          >
            Subscribe
          </Button>
        )}
        {(() => {
          const viewer = user?.name || null;
          const shortBlog = blogShortVersion || '';
          const href = `/${username}/${shortBlog}`;
          const title = currentBlog?.blogId === blog ? currentBlog?.title : userBlog.title;
          const isBookmarked = bookmarksLocal.some((b) => b.href === href);
          return isBookmarked ? (
            <Tooltip title="Remove bookmark" arrow>
              <IconButton
                aria-label="Remove blog bookmark"
                onClick={() => dispatch(removeBookmark({ username: viewer, href }))}
                size="small"
              >
                <BookmarkIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Save bookmark" arrow>
              <IconButton
                aria-label="Save blog bookmark"
                onClick={() =>
                  dispatch(
                    addBookmark({
                      username: viewer,
                      item: { href, title, created: Date.now(), type: 'blog' },
                    }),
                  )
                }
                size="small"
              >
                <BookmarkBorderIcon />
              </IconButton>
            </Tooltip>
          );
        })()}
      </Box>

      {isListView ? (
        <Box
          className="list-view-container"
          style={{ backgroundColor: theme.palette.background.default }}
        >
          {blogPosts.map((post, index) => {
            const existingPost = hashMapPosts[post.id + '-' + post.user];
            const blogPost = existingPost ? existingPost : post;
            const str = blogPost.id;
            const arr = str.split('-post-');
            const str1 = arr[0];
            const blogId = removePrefix(str1);
            const str2 = arr[1];
            return (
              <Box
                key={blogPost.id}
                className="list-view-item"
                sx={{
                  display: 'flex',
                  alignItems: 'stretch',
                  width: '100%',
                  gap: 1,
                  '@media (max-width: 450px)': { width: '100%' },
                }}
              >
                <ContextMenuResource
                  name={blogPost.user}
                  service="BLOG_POST"
                  identifier={blogPost.id}
                  link={`qortal://APP/qblog/${blogPost.user}/${blogId}/${str2}`}
                >
                  <BlogPostPreview
                    onClick={() => navigate(`/${blogPost.user}/${blogId}/${str2}`)}
                    postHref={`/${blogPost.user}/${blogId}/${str2}`}
                    description={blogPost?.description}
                    title={blogPost?.title}
                    createdAt={blogPost?.createdAt}
                    author={blogPost.user}
                    postImage={blogPost?.postImage}
                    blogPost={blogPost}
                    tags={blogPost?.tags}
                    fullWidth
                  />
                </ContextMenuResource>
                {(() => {
                  const viewer = user?.name;
                  const owner = username || '';
                  const settings: BlogSettings = {
                    wikiEnabled:
                      (userBlog as any)?.wikiEnabled ?? (visitingBlog as any)?.wikiEnabled ?? false,
                    editorWhitelist:
                      (userBlog as any)?.editorWhitelist ||
                      (visitingBlog as any)?.editorWhitelist ||
                      [],
                    editorBlacklist:
                      (userBlog as any)?.editorBlacklist ||
                      (visitingBlog as any)?.editorBlacklist ||
                      [],
                  };
                  return canEdit(viewer, settings, owner);
                })() && (
                  <EditIcon
                    className="edit-btn"
                    sx={{
                      position: 'absolute',
                      zIndex: 10,
                      bottom: '25px',
                      right: '25px',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      navigate(`/${blogPost.user}/${blogId}/${str2}/edit`);
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      ) : (
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="my-masonry-grid"
          columnClassName="my-masonry-grid_column"
          style={{ backgroundColor: theme.palette.background.default }}
        >
          {blogPosts.map((post, index) => {
            const existingPost = hashMapPosts[post.id + '-' + post.user];
            const blogPost = existingPost ? existingPost : post;
            const str = blogPost.id;
            const arr = str.split('-post-');
            const str1 = arr[0];
            const blogId = removePrefix(str1);
            const str2 = arr[1];
            return (
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  alignItems: 'center',
                  width: 'auto',
                  position: 'relative',
                  ' @media (max-width: 450px)': {
                    width: '100%',
                  },
                }}
                key={blogPost.id}
              >
                <ContextMenuResource
                  name={blogPost.user}
                  service="BLOG_POST"
                  identifier={blogPost.id}
                  link={`qortal://APP/qblog/${blogPost.user}/${blogId}/${str2}`}
                >
                  <BlogPostPreview
                    onClick={() => {
                      navigate(`/${blogPost.user}/${blogId}/${str2}`);
                    }}
                    postHref={`/${blogPost.user}/${blogId}/${str2}`}
                    description={blogPost?.description}
                    title={blogPost?.title}
                    createdAt={blogPost?.createdAt}
                    author={blogPost.user}
                    postImage={blogPost?.postImage}
                    blogPost={blogPost}
                    tags={blogPost?.tags}
                  />
                </ContextMenuResource>
                {(() => {
                  const viewer = user?.name;
                  const owner = username || '';
                  const settings: BlogSettings = {
                    wikiEnabled:
                      (userBlog as any)?.wikiEnabled ?? (visitingBlog as any)?.wikiEnabled ?? false,
                    editorWhitelist:
                      (userBlog as any)?.editorWhitelist ||
                      (visitingBlog as any)?.editorWhitelist ||
                      [],
                    editorBlacklist:
                      (userBlog as any)?.editorBlacklist ||
                      (visitingBlog as any)?.editorBlacklist ||
                      [],
                  };
                  return canEdit(viewer, settings, owner);
                })() && (
                  <EditIcon
                    className="edit-btn"
                    sx={{
                      position: 'absolute',
                      zIndex: 10,
                      bottom: '25px',
                      right: '25px',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      navigate(`/${blogPost.user}/${blogId}/${str2}/edit`);
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Masonry>
      )}
      <LazyLoad onLoadMore={getPosts}></LazyLoad>
    </>
  );
};
