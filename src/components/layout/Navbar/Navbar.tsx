import React, { useMemo, useRef, useState } from 'react';
import {
  Typography,
  Box,
  Popover,
  useTheme,
  Button,
  Input,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Collapse,
} from '@mui/material';
import AccountCircle from '@mui/icons-material/AccountCircle';
import AddBoxIcon from '@mui/icons-material/AddBox';
import MenuIcon from '@mui/icons-material/Menu';
import Badge from '@mui/material/Badge';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useNavigate, useLocation } from 'react-router-dom';
import { togglePublishBlogModal } from '../../../state/features/globalSlice';
import { useDispatch, useSelector } from 'react-redux';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { RootState } from '../../../state/store';
import type { BlogSummary } from '../../../utils/blogs';
import { UserNavbar } from '../../common/UserNavbar/UserNavbar';
import { removePrefix } from '../../../utils/blogIdformats';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import { BlockedNamesModal } from '../../common/BlockedNamesModal/BlockedNamesModal';
import SearchIcon from '@mui/icons-material/Search';
import EmailIcon from '@mui/icons-material/Email';
import localforage from 'localforage';
import type { NameRecord } from '../../../utils/qortalRequestFunctions';
const notification = localforage.createInstance({ name: 'notification' });

import BackspaceIcon from '@mui/icons-material/Backspace';
import {
  AvatarContainer,
  CreateBlogButton,
  CustomAppBar,
  CustomToolbar,
  DropdownContainer,
  DropdownText,
  QblogLogoContainer,
  StyledButton,
  AuthenticateButton,
  NavbarName,
} from './Navbar-styles';
import { AccountCircleSVG } from '../../../assets/svgs/AccountCircleSVG';
import QblogLogo from '../../../assets/img/qBlogLogo.png';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import CircularProgress from '@mui/material/CircularProgress';
import { NewWindowSVG } from '../../../assets/svgs/NewWindowSVG';
import {
  addFilteredPosts,
  setFilterValue,
  setIsFiltering,
} from '../../../state/features/blogSlice';
import { Item } from '../../common/Comments/CommentEditor';
import { formatDate } from '../../../utils/time';
import CheckIcon from '@mui/icons-material/Check';

interface Props {
  isAuthenticated: boolean;
  hasBlog: boolean;
  userName: string | null;
  userAvatar: string;
  blog: any;
  authenticate: () => void;
  hasAttemptedToFetchBlogInitial: boolean;
  allNames: NameRecord[];
  onSwitchActiveName: (name: string) => void;
  userBlogs?: BlogSummary[];
  onSelectBlog?: (blog: BlogSummary) => void;
  authStatus?: 'idle' | 'loading' | 'succeeded' | 'failed';
  namesStatus?: 'idle' | 'loading' | 'succeeded' | 'failed';
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const NavBar: React.FC<Props> = ({
  isAuthenticated,
  hasBlog,
  userName,
  userAvatar,
  blog,
  authenticate,
  hasAttemptedToFetchBlogInitial,
  allNames,
  onSwitchActiveName,
  userBlogs = [],
  onSelectBlog,
  authStatus = 'idle',
  namesStatus = 'idle',
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const query = useQuery();
  const { visitingBlog } = useSelector((state: RootState) => state.global);
  const notifications = useSelector((state: RootState) => state.global.notifications);
  const notificationCreatorComment = useSelector(
    (state: RootState) => state.global.notificationCreatorComment,
  );

  const fullNotifications = useMemo(() => {
    return [...notificationCreatorComment, ...notifications].sort((a, b) => b.created - a.created);
  }, [notificationCreatorComment, notifications]);
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
  const [anchorElNotification, setAnchorElNotification] = React.useState<HTMLButtonElement | null>(
    null,
  );
  const [anchorElMain, setAnchorElMain] = React.useState<HTMLButtonElement | null>(null);
  const [isOpenModal, setIsOpenModal] = React.useState<boolean>(false);
  const searchValRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);
  const stripBlogId = removePrefix(visitingBlog?.blogId || '');
  const showUserNav =
    visitingBlog?.navbarConfig && stripBlogId && location.pathname.includes(stripBlogId);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.currentTarget as unknown as HTMLButtonElement | null;
    setAnchorEl(target);
  };
  const openNotificationPopover = (event: any) => {
    const target = event.currentTarget as unknown as HTMLButtonElement | null;
    setAnchorElNotification(target);
  };
  const closeNotificationPopover = () => {
    setAnchorElNotification(null);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  const openMain = Boolean(anchorElMain);
  const idMain = openMain ? 'main-menu-popover' : undefined;
  const closeMain = () => setAnchorElMain(null);
  const onClose = () => {
    setIsOpenModal(false);
  };
  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;
  const openPopover = Boolean(anchorElNotification);
  const idNotification = openPopover ? 'simple-popover-notification' : undefined;
  // legacy blogs popover removed; consolidated under Main Menu

  const [viewMode, setViewMode] = useState<'tile' | 'list'>(() => {
    const saved = localStorage.getItem('qblog_view');
    return saved === 'list' ? 'list' : 'tile';
  });
  const [myBlogsOpen, setMyBlogsOpen] = useState(false);

  const toggleViewMode = () => {
    const next = viewMode === 'tile' ? 'list' : 'tile';
    setViewMode(next);
    localStorage.setItem('qblog_view', next);
    window.dispatchEvent(new CustomEvent('qblog:viewmode', { detail: next }));
  };

  return showUserNav ? (
    <UserNavbar
      title={visitingBlog?.title || ''}
      menuItems={visitingBlog?.navbarConfig?.navItems || []}
      name={visitingBlog?.name || ''}
      blogId={visitingBlog?.blogId || ''}
    />
  ) : (
    <CustomAppBar position="sticky" elevation={2}>
      <CustomToolbar variant="dense">
        <QblogLogoContainer
          src={QblogLogo}
          alt="Qblog Logo"
          onClick={() => {
            navigate(`/`);
            dispatch(setIsFiltering(false));
            dispatch(setFilterValue(''));
            dispatch(addFilteredPosts([]));
            searchValRef.current = '';
            if (!inputRef.current) return;
            inputRef.current.value = '';
          }}
        />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Input
            id="standard-adornment-name"
            inputRef={inputRef}
            onChange={(e) => {
              searchValRef.current = e.target.value;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || (event as any).keyCode === 13) {
                if (!searchValRef.current) {
                  dispatch(setIsFiltering(false));
                  dispatch(setFilterValue(''));
                  dispatch(addFilteredPosts([]));
                  searchValRef.current = '';
                  if (!inputRef.current) return;
                  inputRef.current.value = '';
                  return;
                }
                navigate('/');
                dispatch(setIsFiltering(true));
                dispatch(addFilteredPosts([]));
                dispatch(setFilterValue(searchValRef.current));
              }
            }}
            placeholder="Filter by name"
            sx={{
              '&&:before': { borderBottom: 'none' },
              '&&:after': { borderBottom: 'none' },
              '&&:hover:before': { borderBottom: 'none' },
              '&&.Mui-focused:before': { borderBottom: 'none' },
              '&&.Mui-focused': { outline: 'none' },
              fontSize: '18px',
            }}
          />

          <SearchIcon
            sx={{ cursor: 'pointer' }}
            onClick={() => {
              if (!searchValRef.current) {
                dispatch(setIsFiltering(false));
                dispatch(setFilterValue(''));
                dispatch(addFilteredPosts([]));
                searchValRef.current = '';
                if (!inputRef.current) return;
                inputRef.current.value = '';
                return;
              }
              navigate('/');
              dispatch(setIsFiltering(true));
              dispatch(addFilteredPosts([]));
              dispatch(setFilterValue(searchValRef.current));
            }}
          />
          <BackspaceIcon
            sx={{ cursor: 'pointer' }}
            onClick={() => {
              dispatch(setIsFiltering(false));
              dispatch(setFilterValue(''));
              dispatch(addFilteredPosts([]));
              searchValRef.current = '';
              if (!inputRef.current) return;
              inputRef.current.value = '';
            }}
          />
          {/* View toggle moved into Main Menu */}
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {/* Authenticate button moved to the right of Menu for layout stability */}
          <Badge
            badgeContent={fullNotifications.length}
            color="primary"
            sx={{ margin: '0px 12px' }}
          >
            <Button
              onClick={(e) => {
                openNotificationPopover(e);
              }}
              sx={{
                margin: '0px',
                padding: '0px',
                height: 'auto',
                width: 'auto',
                minWidth: 'unset',
              }}
            >
              <NotificationsIcon color="action" />
            </Button>
          </Badge>
          <Popover
            id={idNotification}
            open={openPopover}
            anchorEl={anchorElNotification}
            onClose={closeNotificationPopover}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Box>
              <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
                {fullNotifications.map((notification: any, index: number) => (
                  <ListItem
                    key={index}
                    divider
                    sx={{ cursor: 'pointer' }}
                    onClick={async () => {
                      const str = notification.postId;
                      const arr = str.split('-post-');
                      const str1 = arr[0];
                      const str2 = arr[1];
                      const blogId = removePrefix(str1);
                      navigate(
                        `/${notification.postName}/${blogId}/${str2}?comment=${notification.identifier}`,
                      );
                    }}
                  >
                    <ListItemText
                      primary={
                        <React.Fragment>
                          <Typography component="span" variant="body1" color="textPrimary">
                            From {notification.name}
                          </Typography>
                        </React.Fragment>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography component="span" variant="body2" color="textSecondary">
                            {formatDate(notification.created)}
                          </Typography>
                          <Typography component="span" variant="body2" color="textSecondary">
                            {' -comment'}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Popover>

          {/* Main Menu button */}
          <StyledButton
            color="primary"
            startIcon={<MenuIcon />}
            aria-haspopup="menu"
            aria-controls={idMain}
            aria-expanded={openMain ? 'true' : undefined}
            onClick={(e: any) => setAnchorElMain(e.currentTarget as HTMLButtonElement)}
            sx={{ mr: 1 }}
          >
            Menu
          </StyledButton>

          {!isAuthenticated && (
            <AuthenticateButton
              onClick={authStatus === 'loading' ? undefined : authenticate}
              disabled={authStatus === 'loading'}
              aria-busy={authStatus === 'loading'}
              sx={{ mr: 1 }}
            >
              {authStatus === 'loading' ? (
                <CircularProgress size={16} sx={{ mr: 1 }} />
              ) : (
                <ExitToAppIcon />
              )}
              {authStatus === 'loading' ? 'Authenticating…' : 'Authenticate'}
            </AuthenticateButton>
          )}

          {isAuthenticated && userName && (
            <AvatarContainer onClick={handleClick}>
              <NavbarName>{userName}</NavbarName>
              {!userAvatar ? (
                <AccountCircleSVG color={theme.palette.text.primary} width="32" height="32" />
              ) : (
                <img
                  src={userAvatar}
                  alt="User Avatar"
                  width="32"
                  height="32"
                  style={{ borderRadius: '50%' }}
                />
              )}
              <ExpandMoreIcon id="expand-icon" sx={{ color: '#ACB6BF' }} />
            </AvatarContainer>
          )}

          <Popover
            id={idMain}
            open={openMain}
            anchorEl={anchorElMain}
            onClose={closeMain}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Box sx={{ minWidth: 280 }} role="menu">
              {isAuthenticated && userName && (userBlogs?.length || 0) === 0 && (
                <DropdownContainer
                  onClick={() => {
                    dispatch(togglePublishBlogModal(true));
                    closeMain();
                  }}
                >
                  <NewWindowSVG color={theme.palette.text.primary} width="18" height="18" />
                  <DropdownText>Create Blog</DropdownText>
                </DropdownContainer>
              )}
              {isAuthenticated && userName && (userBlogs?.length || 0) >= 1 && (
                <>
                  <DropdownContainer
                    onClick={() => {
                      navigate('/post/new');
                      closeMain();
                    }}
                  >
                    <AddBoxIcon fontSize="small" />
                    <DropdownText>Create Post</DropdownText>
                  </DropdownContainer>
                  <DropdownContainer
                    onClick={() => setMyBlogsOpen((v) => !v)}
                    aria-expanded={myBlogsOpen ? 'true' : 'false'}
                    aria-controls="menu-myblogs"
                    role="button"
                  >
                    <ExpandMoreIcon
                      sx={{
                        transform: myBlogsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 150ms ease',
                      }}
                    />
                    <DropdownText>My Blogs</DropdownText>
                  </DropdownContainer>
                  <Collapse in={myBlogsOpen} timeout="auto" unmountOnExit>
                    <List dense id="menu-myblogs">
                      {(userBlogs || []).map((b) => {
                        const isActive = blog?.blogId === b.blogId;
                        return (
                          <ListItem
                            key={b.blogId}
                            button
                            role="menuitem"
                            onClick={() => {
                              onSelectBlog && onSelectBlog(b);
                              closeMain();
                            }}
                          >
                            <ListItemText
                              primary={`${b.title || b.handle}${isActive ? ' ✓' : ''}`}
                              secondary={`${b.handle}`}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>
                  <Divider />
                  <DropdownContainer
                    onClick={() => {
                      dispatch(togglePublishBlogModal(true));
                      closeMain();
                    }}
                  >
                    <NewWindowSVG color={theme.palette.text.primary} width="18" height="18" />
                    <DropdownText>Create new blog</DropdownText>
                  </DropdownContainer>
                </>
              )}

              <Divider sx={{ mt: 1 }} />

              <DropdownContainer
                onClick={() => {
                  toggleViewMode();
                  closeMain();
                }}
              >
                <DropdownText>
                  {viewMode === 'tile' ? 'Switch to List View' : 'Switch to Tile View'}
                </DropdownText>
              </DropdownContainer>

              <DropdownContainer
                onClick={() => {
                  navigate('/subscriptions');
                  closeMain();
                }}
              >
                <SubscriptionsIcon sx={{ color: '#5f50e3' }} />
                <DropdownText>Subscriptions</DropdownText>
              </DropdownContainer>

              <DropdownContainer
                onClick={() => {
                  navigate('/bookmarks');
                  closeMain();
                }}
              >
                <CollectionsBookmarkIcon sx={{ color: '#508fe3' }} />
                <DropdownText>Bookmarks</DropdownText>
              </DropdownContainer>

              <DropdownContainer
                onClick={() => {
                  setIsOpenModal(true);
                  closeMain();
                }}
              >
                <PersonOffIcon sx={{ color: '#e35050' }} />
                <DropdownText>Blocked Names</DropdownText>
              </DropdownContainer>

              <DropdownContainer>
                <a
                  href="qortal://APP/Q-Mail"
                  className="qortal-link"
                  style={{ width: '100%', display: 'flex', gap: '5px', alignItems: 'center' }}
                >
                  <EmailIcon sx={{ color: '#50e3c2' }} />
                  <DropdownText>Q-Mail</DropdownText>
                </a>
              </DropdownContainer>
            </Box>
          </Popover>

          <Popover
            id={id}
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Box sx={{ minWidth: 260, p: 1 }}>
              <Typography variant="subtitle2" sx={{ px: 1.5, pt: 1, pb: 0.5, opacity: 0.7 }}>
                Switch name
              </Typography>

              {namesStatus === 'loading' && (
                <List dense>
                  <ListItem disabled>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CircularProgress size={16} />
                    </ListItemIcon>
                    <ListItemText primary="Loading…" />
                  </ListItem>
                </List>
              )}

              {namesStatus === 'failed' && (
                <List dense>
                  <ListItem disabled>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <PersonOffIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Couldn’t load names"
                      secondary="Try again from the header"
                    />
                  </ListItem>
                </List>
              )}

              {namesStatus === 'succeeded' && (!allNames || allNames.length === 0) && (
                <List dense>
                  <ListItem disabled>
                    <ListItemText primary="No names found" />
                  </ListItem>
                </List>
              )}

              {(!namesStatus || namesStatus === 'succeeded') && allNames && allNames.length > 0 && (
                <List dense>
                  {allNames.map((n) => {
                    const isActive = userName === n.name;
                    return (
                      <ListItem
                        key={n.name}
                        button
                        onClick={() => {
                          onSwitchActiveName(n.name);
                          handleClose();
                        }}
                      >
                        {isActive && (
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckIcon fontSize="small" />
                          </ListItemIcon>
                        )}
                        {!isActive && <ListItemIcon sx={{ minWidth: 32 }} />}
                        <ListItemText primary={n.name} />
                      </ListItem>
                    );
                  })}
                </List>
              )}

              {/* Name menu only shows name switching now */}
            </Box>
          </Popover>

          {isOpenModal && <BlockedNamesModal open={isOpenModal} onClose={onClose} />}
        </Box>
      </CustomToolbar>
    </CustomAppBar>
  );
};

export default NavBar;
