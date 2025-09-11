import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  Typography,
  Box,
  Button,
  Tooltip,
  useTheme,
} from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { styled } from '@mui/system';

import {
  CardContentContainer,
  StyledCard,
  StyledCardContent,
  TitleText,
  AuthorText,
  StyledCardHeader,
  StyledCardCol,
  IconsBox,
  BlockIconContainer,
  BookmarkIconContainer,
} from './PostPreview-styles';
import moment from 'moment';
import { blockUser, BlogPost, removeSubscription } from '../../state/features/blogSlice';
import { useDispatch, useSelector } from 'react-redux';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { AppDispatch, RootState } from '../../state/store';
import BlockIcon from '@mui/icons-material/Block';
import { CustomIcon } from '../../components/common/CustomIcon';
import ResponsiveImage from '../../components/common/ResponsiveImage';
import { formatDate } from '../../utils/time';
import { useNavigate } from 'react-router-dom';
import { addBookmark, removeBookmark } from '../../state/features/bookmarksSlice';
import { removePrefix } from '../../utils/blogIdformats';
interface BlogPostPreviewProps {
  title: string;
  createdAt: number | string;
  author: string;
  originOwner?: string;
  originHandle?: string;
  postImage?: string;
  description: any;
  blogPost: BlogPost;
  onClick?: () => void;
  isValid?: boolean;
  tags?: string[];
  fullWidth?: boolean;
  postHref?: string; // canonical href used for navigation/bookmarks
}

const BlogPostPreview: React.FC<BlogPostPreviewProps> = ({
  title,
  createdAt,
  author,
  originOwner,
  originHandle,
  postImage,
  description,
  onClick,
  blogPost,
  isValid,
  tags,
  fullWidth = false,
  postHref,
}) => {
  const [avatarUrl, setAvatarUrl] = React.useState<string>('');
  const [showIcons, setShowIcons] = React.useState<boolean>(false);

  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const navigate = useNavigate();
  const bookmarksLocal = useSelector((state: RootState) => state.bookmarks.bookmarksLocal);
  const [isOpenAlert, setIsOpenAlert] = useState<boolean>(false);
  const subscriptions = useSelector((state: RootState) => state.blog.subscriptions);
  const username = useSelector((state: RootState) => state.auth?.user?.name);

  const getAvatar = React.useCallback(async () => {
    try {
      let url = await qortalRequest({
        action: 'GET_QDN_RESOURCE_URL',
        name: author,
        service: 'THUMBNAIL',
        identifier: 'qortal_avatar',
      });

      setAvatarUrl(url);
    } catch (error) {}
  }, [author]);

  React.useEffect(() => {
    getAvatar();
  }, []);

  const isBookmarked = useMemo(() => {
    try {
      if (postHref) {
        return bookmarksLocal.some((b) => b.href === postHref);
      }
      const id = blogPost?.id || '';
      if (!id.includes('-post-')) return false;
      const [blogFull, postId] = id.split('-post-');
      const blogShort = removePrefix(blogFull);
      const href = `/${blogPost.user}/${blogShort}/${postId}`;
      return bookmarksLocal.some((b) => b.href === href);
    } catch {
      return false;
    }
  }, [bookmarksLocal, blogPost?.id, blogPost?.user, postHref]);

  const blockUserFunc = async (user: string) => {
    if (user === 'Q-Blog' || user === 'qblog') return;
    if (subscriptions.includes(user) && username) {
      try {
        const listName = `q-blog-subscriptions-${username}`;

        const response = await qortalRequest({
          action: 'DELETE_LIST_ITEM',
          list_name: listName,
          item: user,
        });
        if (response === true) {
          dispatch(removeSubscription(user));
        }
      } catch (error) {}
    }

    try {
      const response = await qortalRequest({
        action: 'ADD_LIST_ITEMS',
        list_name: 'blockedNames_q-blog',
        items: [user],
      });

      if (response === true) {
        dispatch(blockUser(user));
      }
    } catch (error) {}
  };

  const continueToPost = () => {
    if (isValid === false) {
      setIsOpenAlert(true);
      return;
    }
    if (!onClick) return;
    onClick();
  };

  const handleClose = () => {
    setIsOpenAlert(false);
  };

  const dimensions = useMemo(() => {
    if (Array.isArray(tags)) {
      const imgDimensions = tags[tags.length - 2];
      if (!imgDimensions?.includes('v1.')) return '';
      return imgDimensions;
    }

    return '';
  }, [tags]);

  return (
    <>
      <StyledCard
        onClick={continueToPost}
        onMouseEnter={() => setShowIcons(true)}
        onMouseLeave={() => setShowIcons(false)}
        sx={fullWidth ? { width: '100%', maxWidth: 'none' } : undefined}
      >
        {!fullWidth && <ResponsiveImage src={postImage || ''} dimensions={dimensions} />}
        {fullWidth ? (
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'stretch',
              width: '100%',
              maxHeight: { xs: 200, sm: 240, md: 280, lg: 320 },
              overflow: 'hidden',
              minHeight: { xs: 140, sm: 160 },
            }}
          >
            <CardContentContainer sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <StyledCardHeader
                sx={{
                  '& .MuiCardHeader-content': { overflow: 'hidden' },
                }}
              >
                <Box>
                  <Avatar
                    src={avatarUrl}
                    alt={`${author}'s avatar`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/${author}`);
                    }}
                    sx={{ cursor: 'pointer' }}
                  />
                </Box>
                <StyledCardCol>
                  <TitleText color={theme.palette.text.primary} noWrap variant="body1">
                    {title}
                  </TitleText>
                  <AuthorText
                    color={
                      theme.palette.mode === 'light' ? theme.palette.text.secondary : '#d6e8ff'
                    }
                    onClick={(e: any) => {
                      e.stopPropagation();
                      navigate(`/${author}`);
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    {author}
                  </AuthorText>
                </StyledCardCol>
              </StyledCardHeader>
              <StyledCardContent>
                <Typography
                  variant="body2"
                  color={theme.palette.text.primary}
                  sx={{
                    wordBreak: 'break-word',
                    display: '-webkit-box',
                    WebkitLineClamp: { xs: 3, sm: 4 },
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {description}
                </Typography>
                <Box sx={{ textAlign: 'flex-start', width: '100%' }}>
                  <Typography variant="h6" color={theme.palette.text.primary}>
                    {formatDate(+createdAt)}
                  </Typography>
                </Box>
              </StyledCardContent>
            </CardContentContainer>
            {postImage && (
              <Box
                className="list-image-col"
                sx={{
                  flex: '0 0 auto',
                  maxWidth: { xs: '45%', sm: '40%', md: '35%' },
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={postImage}
                  alt={title}
                  style={{
                    height: '100%',
                    width: 'auto',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    borderRadius: 8,
                    objectFit: 'contain',
                    objectPosition: 'center',
                    display: 'block',
                  }}
                />
              </Box>
            )}
          </Box>
        ) : (
          <CardContentContainer>
            <StyledCardHeader sx={{ '& .MuiCardHeader-content': { overflow: 'hidden' } }}>
              <Box>
                <Avatar
                  src={avatarUrl}
                  alt={`${author}'s avatar`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/${author}`);
                  }}
                  sx={{ cursor: 'pointer' }}
                />
              </Box>
              <StyledCardCol>
                <TitleText color={theme.palette.text.primary} noWrap variant="body1">
                  {title}
                </TitleText>
                <AuthorText
                  color={theme.palette.mode === 'light' ? theme.palette.text.secondary : '#d6e8ff'}
                  onClick={(e: any) => {
                    e.stopPropagation();
                    navigate(`/${author}`);
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  {author}
                </AuthorText>
              </StyledCardCol>
            </StyledCardHeader>
            <StyledCardContent>
              <Typography
                variant="body2"
                color={theme.palette.text.primary}
                sx={{ wordBreak: 'break-word' }}
              >
                {description}
              </Typography>
              <Box sx={{ textAlign: 'flex-start', width: '100%' }}>
                <Typography variant="h6" color={theme.palette.text.primary}>
                  {formatDate(+createdAt)}
                </Typography>
              </Box>
            </StyledCardContent>
          </CardContentContainer>
        )}
      </StyledCard>
      <IconsBox
        sx={{ opacity: showIcons ? 1 : 0 }}
        onMouseEnter={() => setShowIcons(true)}
        onMouseLeave={() => setShowIcons(false)}
      >
        {username && isBookmarked && (
          <Tooltip title="Remove bookmark" placement="top">
            <BookmarkIconContainer
              onMouseEnter={() => setShowIcons(true)}
              onMouseLeave={() => setShowIcons(false)}
            >
              <BookmarkIcon
                sx={{ color: 'red' }}
                aria-label="Remove from bookmarks"
                onClick={() => {
                  let href = postHref;
                  if (!href) {
                    const [blogFull, postId] = (blogPost.id || '').split('-post-');
                    const blogShort = removePrefix(blogFull);
                    href = `/${blogPost.user}/${blogShort}/${postId}`;
                  }
                  dispatch(removeBookmark({ username, href: href! }));
                }}
              />
            </BookmarkIconContainer>
          </Tooltip>
        )}
        {username && !isBookmarked && (
          <Tooltip title="Save bookmark" placement="top">
            <BookmarkIconContainer
              onMouseEnter={() => setShowIcons(true)}
              onMouseLeave={() => setShowIcons(false)}
            >
              <BookmarkBorderIcon
                aria-label="Save to bookmarks"
                onClick={() => {
                  let href = postHref;
                  if (!href) {
                    const [blogFull, postId] = (blogPost.id || '').split('-post-');
                    const blogShort = removePrefix(blogFull);
                    href = `/${blogPost.user}/${blogShort}/${postId}`;
                  }
                  dispatch(
                    addBookmark({
                      username,
                      item: {
                        href: href!,
                        title: blogPost.title || href!,
                        created: Date.now(),
                        type: 'post',
                      },
                    }),
                  );
                }}
              />
            </BookmarkIconContainer>
          </Tooltip>
        )}
        <Tooltip title="Block user content" placement="top">
          <BlockIconContainer
            onMouseEnter={() => setShowIcons(true)}
            onMouseLeave={() => setShowIcons(false)}
          >
            <BlockIcon
              onClick={() => {
                blockUserFunc(blogPost.user);
              }}
            />
          </BlockIconContainer>
        </Tooltip>
      </IconsBox>
      <Dialog
        open={isOpenAlert}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Invalid Content Structure</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This post seems to contain an invalid content structure. Click continue to proceed
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Button onClick={onClick} autoFocus>
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BlogPostPreview;
