import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Typography,
  useTheme,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Input,
  CircularProgress,
} from '@mui/material';
import { RootState } from '../../state/store';
import {
  loadBookmarksForUser,
  removeBookmark,
  setBookmarkFolder,
} from '../../state/features/bookmarksSlice';
import { useNavigate } from 'react-router-dom';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import { addPrefix } from '../../utils/blogIdformats';
import { formatDate } from '../../utils/time';

const BookmarksPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const username = useSelector((s: RootState) => s.auth.user?.name || null);
  const bookmarks = useSelector((s: RootState) => s.bookmarks.bookmarksLocal);

  React.useEffect(() => {
    dispatch(loadBookmarksForUser({ username }));
  }, [dispatch, username]);

  const [confirmHref, setConfirmHref] = React.useState<string | null>(null);
  const [editFolderHref, setEditFolderHref] = React.useState<string | null>(null);
  const [folderValue, setFolderValue] = React.useState<string>('');

  type RowMeta = { updated?: number; created?: number };
  const [meta, setMeta] = React.useState<Record<string, RowMeta>>({});
  const [sortBy, setSortBy] = React.useState<
    'folder' | 'service' | 'name' | 'identifier' | 'title' | 'updated'
  >('updated');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

  const parse = (href: string) => {
    // href formats: /:user/:blog or /:user/:blog/:postId
    const parts = href.split('/').filter(Boolean);
    if (parts.length < 2) return { service: '', name: '', identifier: '', qortal: '' };
    const [name, blogShort, maybePostId] = parts;
    const blogFull = addPrefix(blogShort);
    if (maybePostId) {
      const identifier = `${blogFull}-post-${maybePostId}`;
      return {
        service: 'BLOG_POST',
        name,
        identifier,
        qortal: `qortal://APP/qblog/${name}/${blogShort}/${maybePostId}`,
      };
    }
    return {
      service: 'BLOG',
      name,
      identifier: blogFull,
      qortal: `qortal://APP/qblog/${name}/${blogShort}`,
    };
  };

  // Fetch metadata (updated/created) for rows
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const b of bookmarks) {
        if (meta[b.href]) continue;
        const p = parse(b.href);
        if (!p.service || !p.name || !p.identifier) continue;
        try {
          const url = `/arbitrary/resources?service=${encodeURIComponent(
            p.service,
          )}&name=${encodeURIComponent(p.name)}&identifier=${encodeURIComponent(
            p.identifier,
          )}&includemetadata=true`;
          const res = await fetch(url);
          const data = await res.json();
          const item = Array.isArray(data) && data.length > 0 ? data[0] : null;
          const row: RowMeta = {
            updated: item?.updated,
            created: item?.created,
          };
          if (!cancelled) setMeta((m) => ({ ...m, [b.href]: row }));
        } catch {
          // ignore
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookmarks]);

  const sorted = React.useMemo(() => {
    const rows = [...bookmarks];
    const dir = sortDir === 'asc' ? 1 : -1;
    const getVal = (b: (typeof bookmarks)[number]) => {
      const p = parse(b.href);
      switch (sortBy) {
        case 'folder':
          return (b.folder || '').toLowerCase();
        case 'service':
          return p.service;
        case 'name':
          return p.name.toLowerCase();
        case 'identifier':
          return p.identifier.toLowerCase();
        case 'title':
          return (b.title || '').toLowerCase();
        case 'updated': {
          const m = meta[b.href];
          const ts = m?.updated || m?.created || 0;
          return ts;
        }
      }
    };
    rows.sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return rows;
  }, [bookmarks, sortBy, sortDir, meta]);

  const toggleSort = (field: typeof sortBy) => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return field;
    });
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', my: 3, px: 2 }}>
      <Typography variant="h4" sx={{ mb: 2 }} color={theme.palette.text.primary}>
        Bookmarks
      </Typography>
      {bookmarks.length === 0 ? (
        <Typography color={theme.palette.text.secondary}>No bookmarks saved yet.</Typography>
      ) : (
        <Table size="small" aria-label="Bookmarks table">
          <TableHead>
            <TableRow>
              <TableCell onClick={() => toggleSort('folder')} sx={{ cursor: 'pointer' }}>
                Folder {sortBy === 'folder' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </TableCell>
              <TableCell onClick={() => toggleSort('service')} sx={{ cursor: 'pointer' }}>
                Service {sortBy === 'service' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </TableCell>
              <TableCell onClick={() => toggleSort('name')} sx={{ cursor: 'pointer' }}>
                Name {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </TableCell>
              <TableCell onClick={() => toggleSort('identifier')} sx={{ cursor: 'pointer' }}>
                Identifier {sortBy === 'identifier' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </TableCell>
              <TableCell onClick={() => toggleSort('title')} sx={{ cursor: 'pointer' }}>
                Title {sortBy === 'title' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </TableCell>
              <TableCell align="right">Actions</TableCell>
              <TableCell
                onClick={() => toggleSort('updated')}
                sx={{ cursor: 'pointer' }}
                align="right"
              >
                Updated {sortBy === 'updated' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((b) => {
              const p = parse(b.href);
              const m = meta[b.href];
              const ts = m?.updated || m?.created || 0;
              return (
                <TableRow key={b.href} hover>
                  <TableCell>{b.folder || ''}</TableCell>
                  <TableCell>{p.service}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{p.identifier}</TableCell>
                  <TableCell>{b.title}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Set folder" arrow>
                      <IconButton
                        aria-label="Set folder"
                        size="small"
                        onClick={() => {
                          setEditFolderHref(b.href);
                          setFolderValue(b.folder || '');
                        }}
                      >
                        <CreateNewFolderIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Open" arrow>
                      <IconButton aria-label="Open" onClick={() => navigate(b.href)} size="small">
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <CopyToClipboard text={p.qortal}>
                      <Tooltip title="Copy link" arrow>
                        <IconButton aria-label="Copy link" size="small">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CopyToClipboard>
                    <Tooltip title="Remove" arrow>
                      <IconButton
                        aria-label="Remove bookmark"
                        color="error"
                        size="small"
                        onClick={() => setConfirmHref(b.href)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    {ts ? formatDate(ts) : <CircularProgress size={16} />}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!confirmHref} onClose={() => setConfirmHref(null)}>
        <DialogTitle>Remove bookmark?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will remove the bookmark. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmHref(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (confirmHref) dispatch(removeBookmark({ username, href: confirmHref }));
              setConfirmHref(null);
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editFolderHref} onClose={() => setEditFolderHref(null)}>
        <DialogTitle>Set bookmark folder</DialogTitle>
        <DialogContent>
          <DialogContentText>Assign a folder name for organizing this bookmark.</DialogContentText>
          <Box sx={{ mt: 2 }}>
            <Input
              fullWidth
              value={folderValue}
              onChange={(e: any) => setFolderValue(e.target.value)}
              placeholder="Folder name (e.g., Research)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditFolderHref(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (editFolderHref)
                dispatch(
                  setBookmarkFolder({
                    username,
                    href: editFolderHref,
                    folder: folderValue || undefined,
                  }),
                );
              setEditFolderHref(null);
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookmarksPage;
