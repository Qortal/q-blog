import React, { useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Box, Typography, CardHeader, Avatar, useTheme, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/system';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import ReadOnlySlate from '../../components/editor/ReadOnlySlate';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { checkStructure } from '../../utils/checkStructure';
import { BlogContent } from '../../interfaces/interfaces';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import {
  setAudio,
  setCurrAudio,
  setIsLoadingGlobal,
  setVisitingBlog,
} from '../../state/features/globalSlice';
import { VideoPlayer } from '../../components/common/VideoPlayer';
import { AudioPlayer, IPlaylist } from '../../components/common/AudioPlayer';
import { Responsive, WidthProvider } from 'react-grid-layout';
import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';
import DynamicHeightItem from '../../components/DynamicHeightItem';
import {
  addPrefix,
  buildIdentifierFromCreateTitleIdAndId,
  removePrefix,
} from '../../utils/blogIdformats';
import { DynamicHeightItemMinimal } from '../../components/DynamicHeightItemMinimal';
import { ReusableModal } from '../../components/modals/ReusableModal';
import AudioElement from '../../components/AudioElement';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import ImageLightbox from '../../components/common/ImageLightbox';
import { CommentSection } from '../../components/common/Comments/CommentSection';
import { canEdit, BlogSettings, selectCanonical } from '../../utils/wiki';
import { Tipping } from '../../components/common/Tipping/Tipping';
import { getCachedBlogSettings } from '../../utils/wikiSettingsCache';
import { BlogSettings as BlogSettingsType } from '../../utils/wiki';
import FileElement from '../../components/FileElement';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { setNotification } from '../../state/features/notificationsSlice';
import ContextMenuResource from '../../components/common/ContextMenu/ContextMenuResource';
import { PollWidget } from '../../components/common/PollWidget';
import { formatDate } from '../../utils/time';
import { addBookmark, removeBookmark } from '../../state/features/bookmarksSlice';

const ResponsiveGridLayout = WidthProvider(Responsive);
const initialMinHeight = 2; // Define an initial minimum height for grid items

const md = [
  { i: 'a', x: 0, y: 0, w: 4, h: initialMinHeight },
  { i: 'b', x: 6, y: 0, w: 4, h: initialMinHeight },
];
const sm = [
  { i: 'a', x: 0, y: 0, w: 6, h: initialMinHeight },
  { i: 'b', x: 6, y: 0, w: 6, h: initialMinHeight },
];
const xs = [
  { i: 'a', x: 0, y: 0, w: 6, h: initialMinHeight },
  { i: 'b', x: 6, y: 0, w: 6, h: initialMinHeight },
];

interface ILayoutGeneralSettings {
  padding: number;
  blogPostType: string;
}
export const BlogIndividualPost = () => {
  const { user, postId: postIdTemp, blog: blogTemp } = useParams();

  const blog = React.useMemo(() => {
    if (postIdTemp && postIdTemp?.includes('-post-')) {
      const str = postIdTemp;
      const arr = str.split('-post-');
      const str1 = arr[0];
      const blogId = removePrefix(str1);
      return blogId;
    } else {
      return blogTemp;
    }
  }, [postIdTemp]);

  const postId = React.useMemo(() => {
    if (postIdTemp && postIdTemp?.includes('-post-')) {
      const str = postIdTemp;
      const arr = str.split('-post-');
      const str2 = arr[1];
      return str2;
    } else {
      return postIdTemp;
    }
  }, [postIdTemp]);

  const blogFull = React.useMemo(() => {
    if (!blog) return '';
    return addPrefix(blog);
  }, [blog]);
  const { user: userState } = useSelector((state: RootState) => state.auth);
  const bookmarksLocal = useSelector((state: RootState) => state.bookmarks.bookmarksLocal);
  const { audios, audioPostId, visitingBlog } = useSelector((state: RootState) => state.global);

  const [avatarUrl, setAvatarUrl] = React.useState<string>('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  // const [currAudio, setCurrAudio] = React.useState<number | null>(null)
  const [layouts, setLayouts] = React.useState<any>({ md, sm, xs });
  const [count, setCount] = React.useState<number>(1);
  const [layoutGeneralSettings, setLayoutGeneralSettings] =
    React.useState<ILayoutGeneralSettings | null>(null);
  const [currentBreakpoint, setCurrentBreakpoint] = React.useState<any>();
  const handleLayoutChange = (layout: any, layoutss: any) => {
    // const redoLayouts = setAutoHeight(layoutss)
    setLayouts(layoutss);
    // saveLayoutsToLocalStorage(layoutss)
  };
  const [blogContent, setBlogContent] = React.useState<BlogContent | null>(null);
  const [canonicalAuthor, setCanonicalAuthor] = React.useState<string>('');
  const [originOwner, setOriginOwner] = React.useState<string>('');
  const [canonicalUpdated, setCanonicalUpdated] = React.useState<number | null>(null);
  const [isOpenSwitchPlaylistModal, setisOpenSwitchPlaylistModal] = useState<boolean>(false);
  const tempSaveAudio = useRef<any>(null);
  const saveAudio = React.useRef<any>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const contentRootRef = useRef<HTMLDivElement | null>(null);
  const openLightbox = (e: React.MouseEvent<HTMLImageElement, MouseEvent> | null, src: string) => {
    // Prevent the opening click from bubbling into the overlay and immediately closing it
    try {
      e?.stopPropagation();
      e?.preventDefault();
    } catch {}
    // Defer opening until the current click cycle completes to avoid
    // Modal backdrop interpreting this click as a close action.
    setTimeout(() => {
      setLightboxSrc(src);
      setLightboxOpen(true);
    }, 0);
  };
  const closeLightbox = () => setLightboxOpen(false);

  // Capture-phase delegation to ensure image clicks work inside grid/builder layouts
  // Attach at the document level to avoid any layout-level listeners swallowing the click.
  React.useEffect(() => {
    const handleOpen = (ev: Event) => {
      if (lightboxOpen) return; // ignore when already open
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const img = target.closest('img.post-image') as HTMLImageElement | null;
      if (img && img.src) {
        try {
          ev.preventDefault();
          ev.stopPropagation();
        } catch {}
        openLightbox(null, img.src);
      }
    };
    const handleMouseDown = (ev: MouseEvent) => {
      if (ev.button !== 0) return; // left-click only
      handleOpen(ev);
    };
    document.addEventListener('click', handleOpen, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => {
      document.removeEventListener('click', handleOpen, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [lightboxOpen]);

  const fullPostId = useMemo(() => {
    if (!blog || !postId) return '';
    dispatch(setIsLoadingGlobal(true));
    const formBlogId = addPrefix(blog);
    const formPostId = buildIdentifierFromCreateTitleIdAndId(formBlogId, postId);
    return formPostId;
  }, [blog, postId]);
  const getBlogPost = React.useCallback(async () => {
    try {
      if (!blog || !postId) return;
      dispatch(setIsLoadingGlobal(true));
      const formBlogId = addPrefix(blog);
      const formPostId = buildIdentifierFromCreateTitleIdAndId(formBlogId, postId);
      // Resolve canonical across names if wiki is enabled
      const settings: BlogSettings = {
        wikiEnabled: (visitingBlog as any)?.wikiEnabled ?? false,
        editorWhitelist: (visitingBlog as any)?.editorWhitelist || [],
        editorBlacklist: (visitingBlog as any)?.editorBlacklist || [],
      };

      let contentName = user || '';
      if (settings.wikiEnabled) {
        try {
          const searchUrl = `/arbitrary/resources/search?mode=ALL&service=BLOG_POST&identifier=${encodeURIComponent(
            formPostId,
          )}&limit=50&includemetadata=true&reverse=true&excludeblocked=true`;
          const searchResp = await fetch(searchUrl, {
            headers: { 'Content-Type': 'application/json' },
          });
          const items = (await searchResp.json()) || [];
          const revisions = items.map((it: any) => ({
            id: it.identifier,
            originPostId: it.identifier, // grouping by id for v1
            lineageBlogId: formBlogId,
            authorName: it.name,
            updatedAt: it.updated,
            qdnUpdated: it.updated,
            published: true,
          }));
          const selected = selectCanonical(
            revisions,
            settings,
            (visitingBlog as any)?.name || user || '',
            {
              expectedLineageBlogId: formBlogId,
            },
          );
          if (selected && selected.authorName) {
            contentName = selected.authorName;
            setCanonicalAuthor(selected.authorName);
            const tsNum =
              typeof (selected as any).updatedAt === 'number'
                ? (selected as any).updatedAt
                : typeof (selected as any).qdnUpdated === 'number'
                ? (selected as any).qdnUpdated
                : null;
            setCanonicalUpdated(tsNum);
          } else {
            setCanonicalAuthor(user || '');
            setCanonicalUpdated(null);
          }
        } catch {}
      }

      const url = `/arbitrary/BLOG_POST/${contentName}/${formPostId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json();

      if (checkStructure(responseData)) {
        setBlogContent(responseData);
        if (responseData?.layouts) {
          setLayouts(responseData?.layouts);
        }
        if (responseData?.layoutGeneralSettings) {
          setLayoutGeneralSettings(responseData.layoutGeneralSettings);
        }
        const filteredAudios = (responseData?.postContent || []).filter(
          (content: any) => content?.type === 'audio',
        );

        const transformAudios = filteredAudios?.map((fa: any) => {
          return {
            ...(fa?.content || {}),
            id: fa?.id,
          };
        });

        if (!audios && transformAudios.length > 0) {
          saveAudio.current = { audios: transformAudios, postId: formPostId };
          dispatch(setAudio({ audios: transformAudios, postId: formPostId }));
        } else if (formPostId === audioPostId && audios?.length !== transformAudios.length) {
          tempSaveAudio.current = {
            message: "This post's audio playlist has updated. Would you like to switch?",
          };
          setisOpenSwitchPlaylistModal(true);
        }
      }
    } catch (error) {
    } finally {
      dispatch(setIsLoadingGlobal(false));
    }
  }, [user, postId, blog, visitingBlog]);
  React.useEffect(() => {
    getBlogPost();
  }, [postId, visitingBlog]);

  const switchPlayList = () => {
    const filteredAudios = (blogContent?.postContent || []).filter(
      (content) => content?.type === 'audio',
    );

    const formatAudios = filteredAudios.map((fa) => {
      return {
        ...(fa?.content || {}),
        id: fa?.id,
      };
    });
    if (!blog || !postId) return;
    const formBlogId = addPrefix(blog);
    const formPostId = buildIdentifierFromCreateTitleIdAndId(formBlogId, postId);
    dispatch(setAudio({ audios: formatAudios, postId: formPostId }));
    if (tempSaveAudio?.current?.currentSelection) {
      const findIndex = (formatAudios || []).findIndex(
        (item) =>
          item?.identifier === tempSaveAudio?.current?.currentSelection?.content?.identifier,
      );
      if (findIndex >= 0) {
        dispatch(setCurrAudio(findIndex));
      }
    }
    setisOpenSwitchPlaylistModal(false);
  };

  const getAvatar = React.useCallback(async () => {
    try {
      let url = await qortalRequest({
        action: 'GET_QDN_RESOURCE_URL',
        name: user,
        service: 'THUMBNAIL',
        identifier: 'qortal_avatar',
      });

      setAvatarUrl(url);
    } catch (error) {}
  }, [user]);
  React.useEffect(() => {
    getAvatar();
  }, []);

  const onBreakpointChange = React.useCallback((newBreakpoint: any) => {
    setCurrentBreakpoint(newBreakpoint);
  }, []);

  const onResizeStop = React.useCallback((layout: any, layoutItem: any) => {
    // Update the layout state with the new position and size of the component
    setCount((prev) => prev + 1);
  }, []);

  // const audios = React.useMemo<IPlaylist[]>(() => {
  //   const filteredAudios = (blogContent?.postContent || []).filter(
  //     (content) => content.type === 'audio'
  //   )

  //   return filteredAudios.map((fa) => {
  //     return {
  //       ...fa.content,
  //       id: fa.id
  //     }
  //   })
  // }, [blogContent])

  const handleResize = () => {
    setCount((prev) => prev + 1);
  };

  React.useEffect(() => {
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleCount = React.useCallback(() => {
    // Update the layout state with the new position and size of the component
    setCount((prev) => prev + 1);
  }, []);

  const getBlog = React.useCallback(async () => {
    let name = user;
    if (!name) return;
    if (!blogFull) return;
    try {
      const urlBlog = `/arbitrary/BLOG/${name}/${blogFull}`;
      const response = await fetch(urlBlog, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const responseData = await response.json();
      dispatch(setVisitingBlog({ ...responseData, name }));
    } catch (error) {}
  }, [user, blogFull]);

  React.useEffect(() => {
    getBlog();
  }, [user, blogFull]);

  if (!blogContent) return null;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          maxWidth: '1400px',
          // margin: '15px',
          width: '95%',
          paddingBottom: '50px',
        }}
      >
        {(() => {
          const viewer = userState?.name;
          const owner = (visitingBlog as any)?.name || user || '';
          const settings: BlogSettings = {
            wikiEnabled: (visitingBlog as any)?.wikiEnabled ?? false,
            editorWhitelist: (visitingBlog as any)?.editorWhitelist || [],
            editorBlacklist: (visitingBlog as any)?.editorBlacklist || [],
          };
          return canEdit(viewer, settings, owner);
        })() && (
          <Button
            sx={{ backgroundColor: theme.palette.secondary.main }}
            onClick={() => {
              navigate(`/${user}/${blog}/${postId}/edit`);
            }}
          >
            Edit Post
          </Button>
        )}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CardHeader
            onClick={() => {
              navigate(`/${originOwner || user}`);
            }}
            sx={{
              cursor: 'pointer',
              '& .MuiCardHeader-content': {
                overflow: 'hidden',
              },
              padding: '10px 0px',
            }}
            avatar={<Avatar src={avatarUrl} alt={`${user}'s avatar`} />}
            subheader={
              <Typography
                sx={{ fontFamily: 'Cairo', fontSize: '25px' }}
                color={theme.palette.text.primary}
              >{` ${originOwner || user}`}</Typography>
            }
          />
          {user && (
            <Tipping
              name={user || ''}
              onSubmit={() => {
                // setNameTip('')
              }}
              onClose={() => {
                // setNameTip('')
              }}
            />
          )}
        </Box>
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
            }}
          >
            {blogContent?.title}
          </Typography>
          {/* Attribution when wiki shows a non-owner revision */}
          {(() => {
            const owner = (visitingBlog as any)?.name || user || '';
            const author = canonicalAuthor || user || '';
            if (owner && author && owner !== author) {
              return (
                <Typography variant="subtitle2" color="textSecondary" sx={{ ml: 1 }}>
                  Latest by {author}
                  {canonicalUpdated ? ` · ${formatDate(canonicalUpdated)}` : ''}
                </Typography>
              );
            }
            return null;
          })()}
          <Tooltip title={`Copy post link`} arrow>
            <Box
              sx={{
                cursor: 'pointer',
              }}
            >
              <CopyToClipboard
                text={`qortal://APP/qblog/${user}/${blog}/${postId}`}
                onCopy={() => {
                  dispatch(
                    setNotification({
                      msg: 'Copied to clipboard!',
                      alertType: 'success',
                    }),
                  );
                }}
              >
                <ShareIcon />
              </CopyToClipboard>
            </Box>
          </Tooltip>
          {(() => {
            const username = userState?.name || null;
            const href = `/${user}/${blog}/${postId}`;
            const isBookmarked = bookmarksLocal.some((b) => b.href === href);
            return isBookmarked ? (
              <Tooltip title="Remove bookmark" arrow>
                <Box sx={{ cursor: 'pointer', ml: 1 }}>
                  <BookmarkIcon
                    aria-label="Remove from bookmarks"
                    onClick={() => dispatch(removeBookmark({ username, href }))}
                  />
                </Box>
              </Tooltip>
            ) : (
              <Tooltip title="Save bookmark" arrow>
                <Box sx={{ cursor: 'pointer', ml: 1 }}>
                  <BookmarkBorderIcon
                    aria-label="Save to bookmarks"
                    onClick={() =>
                      dispatch(
                        addBookmark({
                          username,
                          item: {
                            href,
                            title: blogContent?.title || href,
                            created: Date.now(),
                            type: 'post',
                          },
                        }),
                      )
                    }
                  />
                </Box>
              </Tooltip>
            );
          })()}
          <CommentSection postId={fullPostId} postName={user || ''} />
        </Box>

        <Box ref={contentRootRef}>
          {(layoutGeneralSettings?.blogPostType === 'builder' ||
            !layoutGeneralSettings?.blogPostType) && (
            <Content
              layouts={layouts}
              blogContent={blogContent}
              onResizeStop={onResizeStop}
              onBreakpointChange={onBreakpointChange}
              handleLayoutChange={handleLayoutChange}
            >
              {blogContent?.postContent?.map((section: any) => {
                if (section?.type === 'editor') {
                  return (
                    <div key={section?.id} className="grid-item-view">
                      <ErrorBoundary
                        fallback={<Typography>Error loading content: Invalid Data</Typography>}
                      >
                        <DynamicHeightItem
                          layouts={layouts}
                          setLayouts={setLayouts}
                          i={section.id}
                          breakpoint={currentBreakpoint}
                          count={count}
                          padding={layoutGeneralSettings?.padding}
                        >
                          <ReadOnlySlate content={section.content} />
                        </DynamicHeightItem>
                      </ErrorBoundary>
                    </div>
                  );
                }
                if (section?.type === 'image') {
                  return (
                    <div key={section?.id} className="grid-item-view">
                      <ErrorBoundary
                        fallback={<Typography>Error loading content: Invalid Data</Typography>}
                      >
                        <DynamicHeightItem
                          layouts={layouts}
                          setLayouts={setLayouts}
                          i={section.id}
                          breakpoint={currentBreakpoint}
                          count={count}
                          padding={layoutGeneralSettings?.padding}
                        >
                          <div
                            onClick={(e) => openLightbox(e as any, section.content.image)}
                            onMouseDown={(e) => {
                              if ((e as React.MouseEvent).button === 0)
                                openLightbox(e as any, section.content.image);
                            }}
                            role="button"
                            tabIndex={0}
                            style={{ cursor: 'zoom-in' }}
                          >
                            <img
                              src={section.content.image}
                              className="post-image"
                              alt={blogContent?.title ? `${blogContent.title} image` : 'Blog image'}
                            />
                          </div>
                        </DynamicHeightItem>
                      </ErrorBoundary>
                    </div>
                  );
                }
                if (section?.type === 'video') {
                  return (
                    <div key={section?.id} className="grid-item-view">
                      <ErrorBoundary
                        fallback={<Typography>Error loading content: Invalid Data</Typography>}
                      >
                        <DynamicHeightItem
                          layouts={layouts}
                          setLayouts={setLayouts}
                          i={section.id}
                          breakpoint={currentBreakpoint}
                          count={count}
                          padding={layoutGeneralSettings?.padding}
                        >
                          <ContextMenuResource
                            name={section.content.name}
                            service={section.content.service}
                            identifier={section.content.identifier}
                            link={`qortal://${section?.content?.service}/${section?.content?.name}/${section?.content?.identifier}`}
                          >
                            <VideoPlayer
                              name={section.content.name}
                              service={section.content.service}
                              identifier={section.content.identifier}
                              poster={section.content.poster}
                              setCount={handleCount}
                              user={user}
                              postId={fullPostId}
                            />
                          </ContextMenuResource>
                        </DynamicHeightItem>
                      </ErrorBoundary>
                    </div>
                  );
                }
                if (section?.type === 'audio') {
                  return (
                    <div key={section?.id} className="grid-item-view">
                      <ErrorBoundary
                        fallback={<Typography>Error loading content: Invalid Data</Typography>}
                      >
                        <DynamicHeightItem
                          layouts={layouts}
                          setLayouts={setLayouts}
                          i={section.id}
                          breakpoint={currentBreakpoint}
                          count={count}
                          padding={layoutGeneralSettings?.padding}
                        >
                          <ContextMenuResource
                            name={section.content.name}
                            service={section.content.service}
                            identifier={section.content.identifier}
                            link={`qortal://${section?.content?.service}/${section?.content?.name}/${section?.content?.identifier}`}
                          >
                            <AudioElement
                              key={section.id}
                              audioInfo={section.content}
                              postId={fullPostId}
                              user={user ? user : ''}
                              onClick={() => {
                                if (!blog || !postId) return;

                                const formBlogId = addPrefix(blog);
                                const formPostId = buildIdentifierFromCreateTitleIdAndId(
                                  formBlogId,
                                  postId,
                                );
                                if (audioPostId && formPostId !== audioPostId) {
                                  tempSaveAudio.current = {
                                    ...(tempSaveAudio.current || {}),
                                    currentSelection: section,
                                    message:
                                      'You are current on a playlist. Would you like to switch?',
                                  };
                                  setisOpenSwitchPlaylistModal(true);
                                } else {
                                  if (!audios && saveAudio?.current) {
                                    const findIndex = (saveAudio?.current?.audios || []).findIndex(
                                      (item: any) => item.identifier === section.content.identifier,
                                    );
                                    dispatch(setAudio(saveAudio?.current));
                                    dispatch(setCurrAudio(findIndex));
                                    return;
                                  }

                                  const findIndex = (audios || []).findIndex(
                                    (item) => item.identifier === section.content.identifier,
                                  );
                                  if (findIndex >= 0) {
                                    dispatch(setCurrAudio(findIndex));
                                  }
                                }
                              }}
                              title={section.content?.title}
                              description={section.content?.description}
                              author=""
                            />
                          </ContextMenuResource>
                        </DynamicHeightItem>
                      </ErrorBoundary>
                    </div>
                  );
                }
                if (section?.type === 'file') {
                  return (
                    <div key={section?.id} className="grid-item">
                      <ErrorBoundary
                        fallback={<Typography>Error loading content: Invalid Data</Typography>}
                      >
                        <DynamicHeightItemMinimal
                          layouts={layouts}
                          setLayouts={setLayouts}
                          i={section.id}
                          breakpoint={currentBreakpoint}
                          count={count}
                          padding={0}
                        >
                          <ContextMenuResource
                            name={section.content.name}
                            service={section.content.service}
                            identifier={section.content.identifier}
                            link={`qortal://${section?.content?.service}/${section?.content?.name}/${section?.content?.identifier}`}
                          >
                            <FileElement
                              key={section.id}
                              fileInfo={section.content}
                              postId={fullPostId}
                              user={user ? user : ''}
                              title={section.content?.title}
                              description={section.content?.description}
                              mimeType={section.content?.mimeType}
                              author=""
                            />
                          </ContextMenuResource>
                        </DynamicHeightItemMinimal>
                      </ErrorBoundary>
                    </div>
                  );
                }
                if (section?.type === 'poll') {
                  return (
                    <div key={section?.id} className="grid-item-view">
                      <ErrorBoundary fallback={<Typography>Error loading poll</Typography>}>
                        <DynamicHeightItem
                          layouts={layouts}
                          setLayouts={setLayouts}
                          i={section.id}
                          breakpoint={currentBreakpoint}
                          count={count}
                          padding={layoutGeneralSettings?.padding}
                        >
                          <PollWidget pollName={section?.content?.pollName} />
                        </DynamicHeightItem>
                      </ErrorBoundary>
                    </div>
                  );
                }
              })}
            </Content>
          )}
          {layoutGeneralSettings?.blogPostType === 'minimal' && (
            <>
              {layouts?.rows?.map((row: any, rowIndex: number) => {
                return (
                  <Box
                    sx={{
                      display: 'flex',
                      width: '100%',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '25px',
                      gap: 2,
                    }}
                  >
                    {row?.ids?.map((elementId: string) => {
                      const section: any = blogContent?.postContent?.find(
                        (el) => el?.id === elementId,
                      );
                      if (!section) return null;
                      if (section?.type === 'editor') {
                        return (
                          <div
                            key={section?.id}
                            className="grid-item"
                            style={{
                              maxWidth: '800px',
                              display: 'flex',
                              flexDirection: 'column',
                              width: '100%',
                            }}
                          >
                            <ErrorBoundary
                              fallback={
                                <Typography>Error loading content: Invalid Data</Typography>
                              }
                            >
                              <DynamicHeightItemMinimal
                                layouts={layouts}
                                setLayouts={setLayouts}
                                i={section.id}
                                breakpoint={currentBreakpoint}
                                count={count}
                                padding={0}
                              >
                                <ReadOnlySlate key={section.id} content={section.content} />
                              </DynamicHeightItemMinimal>
                            </ErrorBoundary>
                          </div>
                        );
                      }
                      if (section?.type === 'image') {
                        return (
                          <div key={section.id} className="grid-item">
                            <ErrorBoundary
                              fallback={
                                <Typography>Error loading content: Invalid Data</Typography>
                              }
                            >
                              <DynamicHeightItemMinimal
                                layouts={layouts}
                                setLayouts={setLayouts}
                                i={section.id}
                                breakpoint={currentBreakpoint}
                                count={count}
                                type="image"
                                padding={0}
                              >
                                <Box
                                  sx={{
                                    position: 'relative',
                                    width: '100%',
                                    height: '100%',
                                  }}
                                >
                                  <img
                                    src={section.content.image}
                                    className="post-image"
                                    alt={
                                      blogContent?.title
                                        ? `${blogContent.title} image`
                                        : 'Blog image'
                                    }
                                    style={{
                                      objectFit: 'contain',
                                      maxHeight: '50vh',
                                      cursor: 'zoom-in',
                                    }}
                                    onClick={(e) => openLightbox(e, section.content.image)}
                                    onMouseDown={(e) => {
                                      if ((e as React.MouseEvent).button === 0)
                                        openLightbox(e, section.content.image);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                  />
                                </Box>
                              </DynamicHeightItemMinimal>
                            </ErrorBoundary>
                          </div>
                        );
                      }

                      if (section?.type === 'video') {
                        return (
                          <div key={section?.id} className="grid-item">
                            <ErrorBoundary
                              fallback={
                                <Typography>Error loading content: Invalid Data</Typography>
                              }
                            >
                              <DynamicHeightItemMinimal
                                layouts={layouts}
                                setLayouts={setLayouts}
                                i={section.id}
                                breakpoint={currentBreakpoint}
                                count={count}
                                padding={0}
                              >
                                <ContextMenuResource
                                  name={section.content.name}
                                  service={section.content.service}
                                  identifier={section.content.identifier}
                                  link={`qortal://${section?.content?.service}/${section?.content?.name}/${section?.content?.identifier}`}
                                >
                                  <Box
                                    sx={{
                                      position: 'relative',
                                      width: '100%',
                                      height: '100%',
                                    }}
                                  >
                                    <VideoPlayer
                                      name={section.content.name}
                                      service={section.content.service}
                                      identifier={section.content.identifier}
                                      poster={section.content.poster}
                                      customStyle={{
                                        height: '50vh',
                                      }}
                                      user={user}
                                      postId={fullPostId}
                                    />
                                  </Box>
                                </ContextMenuResource>
                              </DynamicHeightItemMinimal>
                            </ErrorBoundary>
                          </div>
                        );
                      }
                      if (section?.type === 'audio') {
                        return (
                          <div key={section?.id} className="grid-item">
                            <ErrorBoundary
                              fallback={
                                <Typography>Error loading content: Invalid Data</Typography>
                              }
                            >
                              <DynamicHeightItemMinimal
                                layouts={layouts}
                                setLayouts={setLayouts}
                                i={section.id}
                                breakpoint={currentBreakpoint}
                                count={count}
                                padding={0}
                              >
                                <ContextMenuResource
                                  name={section.content.name}
                                  service={section.content.service}
                                  identifier={section.content.identifier}
                                  link={`qortal://${section?.content?.service}/${section?.content?.name}/${section?.content?.identifier}`}
                                >
                                  <AudioElement
                                    key={section.id}
                                    audioInfo={section.content}
                                    postId={fullPostId}
                                    user={user ? user : ''}
                                    onClick={() => {
                                      if (!blog || !postId) return;
                                      const formBlogId = addPrefix(blog);
                                      const formPostId = buildIdentifierFromCreateTitleIdAndId(
                                        formBlogId,
                                        postId,
                                      );
                                      if (formPostId !== audioPostId) {
                                        tempSaveAudio.current = {
                                          ...(tempSaveAudio.current || {}),
                                          currentSelection: section,
                                          message:
                                            'You are current on a playlist. Would you like to switch?',
                                        };
                                        setisOpenSwitchPlaylistModal(true);
                                      } else {
                                        const findIndex = (audios || []).findIndex(
                                          (item) => item.identifier === section.content.identifier,
                                        );
                                        if (findIndex >= 0) {
                                          dispatch(setCurrAudio(findIndex));
                                        }
                                      }
                                    }}
                                    title={section.content?.title}
                                    description={section.content?.description}
                                    author=""
                                  />
                                </ContextMenuResource>
                              </DynamicHeightItemMinimal>
                            </ErrorBoundary>
                          </div>
                        );
                      }
                      if (section?.type === 'file') {
                        return (
                          <div key={section?.id} className="grid-item">
                            <ErrorBoundary
                              fallback={
                                <Typography>Error loading content: Invalid Data</Typography>
                              }
                            >
                              <DynamicHeightItemMinimal
                                layouts={layouts}
                                setLayouts={setLayouts}
                                i={section.id}
                                breakpoint={currentBreakpoint}
                                count={count}
                                padding={0}
                              >
                                <ContextMenuResource
                                  name={section.content.name}
                                  service={section.content.service}
                                  identifier={section.content.identifier}
                                  link={`qortal://${section?.content?.service}/${section?.content?.name}/${section?.content?.identifier}`}
                                >
                                  <FileElement
                                    key={section.id}
                                    fileInfo={section.content}
                                    postId={fullPostId}
                                    user={user ? user : ''}
                                    title={section.content?.title}
                                    description={section.content?.description}
                                    mimeType={section.content?.mimeType}
                                    author=""
                                  />
                                </ContextMenuResource>
                              </DynamicHeightItemMinimal>
                            </ErrorBoundary>
                          </div>
                        );
                      }
                      if (section?.type === 'poll') {
                        return (
                          <div key={section?.id} className="grid-item-view">
                            <ErrorBoundary fallback={<Typography>Error loading poll</Typography>}>
                              <DynamicHeightItemMinimal
                                layouts={layouts}
                                setLayouts={setLayouts}
                                i={section.id}
                                breakpoint={currentBreakpoint}
                                count={count}
                                padding={0}
                              >
                                <PollWidget pollName={section?.content?.pollName} />
                              </DynamicHeightItemMinimal>
                            </ErrorBoundary>
                          </div>
                        );
                      }
                    })}
                  </Box>
                );
              })}
            </>
          )}
        </Box>
        <ReusableModal open={isOpenSwitchPlaylistModal}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography>
              {tempSaveAudio?.current?.message
                ? tempSaveAudio?.current?.message
                : 'You are current on a playlist. Would you like to switch?'}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="error"
            onClick={() => setisOpenSwitchPlaylistModal(false)}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={switchPlayList}>
            Switch
          </Button>
        </ReusableModal>
      </Box>
      <ImageLightbox src={lightboxSrc} open={lightboxOpen} onClose={closeLightbox} />
    </Box>
  );
};

const Content = ({
  children,
  layouts,
  blogContent,
  onResizeStop,
  onBreakpointChange,
  handleLayoutChange,
}: any) => {
  if (layouts && blogContent?.layouts) {
    return (
      <ErrorBoundary fallback={<Typography>Error loading content: Invalid Layout</Typography>}>
        <ResponsiveGridLayout
          layouts={layouts}
          breakpoints={{ md: 996, sm: 768, xs: 480 }}
          cols={{ md: 4, sm: 3, xs: 1 }}
          measureBeforeMount={false}
          onLayoutChange={handleLayoutChange}
          autoSize={true}
          compactType={null}
          isBounded={true}
          resizeHandles={['se', 'sw', 'ne', 'nw']}
          rowHeight={25}
          onResizeStop={onResizeStop}
          onBreakpointChange={onBreakpointChange}
          isDraggable={false}
          isResizable={false}
          margin={[0, 0]}
        >
          {children}
        </ResponsiveGridLayout>
      </ErrorBoundary>
    );
  }
  return children;
};
