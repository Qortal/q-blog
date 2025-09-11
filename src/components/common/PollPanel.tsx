import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { styled, Box } from '@mui/system';
import {
  Drawer,
  Typography,
  Tooltip,
  Button,
  ButtonBase,
  TextField,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { setNotification } from '../../state/features/notificationsSlice';

interface PollPanelProps {
  onSelect: (pollName: string) => void;
  height?: string;
  width?: string;
}

const Panel = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #888;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background-color: #555;
  }
`;

type PollRow = {
  pollName: string;
  description?: string;
  owner?: string;
  pollOptions?: { optionName: string }[];
  published?: number;
};

export const PollPanel: React.FC<PollPanelProps> = ({ onSelect, height, width }) => {
  const [open, setOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [myOnly, setMyOnly] = useState(true);
  const { user } = useSelector((s: RootState) => s.auth);

  // --- create poll form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  // Cache of ALL polls from the first scan
  const apiPageSize = 50;
  const [allPolls, setAllPolls] = useState<PollRow[]>([]);
  const [rawOffset, setRawOffset] = useState(0);
  const [scanningAll, setScanningAll] = useState(false);
  const [fullyScanned, setFullyScanned] = useState(false);
  const scanIdRef = useRef(0);

  // UI slice: how many filtered items to show (increments by 50 via "Load more")
  const [displayCount, setDisplayCount] = useState(50);

  // Reset everything we derive from filters/search/open
  const resetDerived = () => {
    setDisplayCount(50);
  };

  const dispatch = useDispatch();

  // Helper: fetch ONE raw page from /polls at a given offset
  const fetchRawPage = async (offsetNum: number) => {
    const url = new URL('/polls', window.location.origin);
    url.searchParams.set('limit', String(apiPageSize));
    url.searchParams.set('offset', String(offsetNum));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch polls');
    const data = await res.json();
    return Array.isArray(data) ? (data as PollRow[]) : [];
  };

  const scanAllPolls = useCallback(async () => {
    if (fullyScanned || scanningAll) return;
    setScanningAll(true);
    const myScanId = ++scanIdRef.current;
    try {
      let nextRawOffset = rawOffset;
      let collected: PollRow[] = allPolls; // keep any partial cache if we reopen
      for (;;) {
        if (scanIdRef.current !== myScanId) return; // canceled due to new open/filter change
        const page = await fetchRawPage(nextRawOffset);
        if (!page.length) {
          setFullyScanned(true);
          break;
        }
        collected = [...collected, ...page];
        setAllPolls(collected); // progressively update so UI can show partial results quickly
        nextRawOffset += apiPageSize;
        setRawOffset(nextRawOffset);
        if (page.length < apiPageSize) {
          setFullyScanned(true);
          break;
        }
        // yield to UI; optional tiny delay to keep drawer responsive
        await new Promise((r) => setTimeout(r, 0));
      }
    } catch (e) {
      // If it errors, we stop scanning; user can close/open to retry.
      setFullyScanned(true);
    } finally {
      setScanningAll(false);
    }
  }, [fullyScanned, scanningAll, rawOffset, allPolls]);

  useEffect(() => {
    if (!open) return;
    // cancel any in-flight scan loop and start fresh if needed
    scanIdRef.current++;
    resetDerived();
    // kick off a full scan if we haven't already completed one
    if (!fullyScanned && !scanningAll) {
      scanAllPolls();
    }
    // If we *have* already scanned, we just re-derive the visible slice from cache.
  }, [open, myOnly, search, fullyScanned, scanningAll, scanAllPolls]);

  const handleToggle = () => setOpen((v) => !v);
  const addOption = () => setOptions((o) => (o.length >= 100 ? o : [...o, '']));
  const updateOption = (i: number, val: string) =>
    setOptions((o) => o.map((x, idx) => (idx === i ? val : x)));
  const removeOption = (i: number) => setOptions((o) => o.filter((_, idx) => idx !== i));

  // newest first by published, fallback to pollName
  const sortedAll = useMemo(() => {
    const arr = allPolls.slice();
    arr.sort((a, b) => {
      const aPub = a.published ?? 0;
      const bPub = b.published ?? 0;
      if (bPub !== aPub) return bPub - aPub;
      // fallback deterministic tiebreaker
      return (b.pollName || '').localeCompare(a.pollName || '');
    });
    return arr;
  }, [allPolls]);

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    const byOwner =
      myOnly && user?.address
        ? (p: PollRow) => (p.owner || '').toLowerCase() === user.address.toLowerCase()
        : () => true;

    const byQuery = normalizedSearch
      ? (p: PollRow) => {
          const inName = p.pollName?.toLowerCase().includes(normalizedSearch);
          const inDesc = p.description?.toLowerCase().includes(normalizedSearch);
          const inOpts = (p.pollOptions || []).some((o) =>
            o.optionName?.toLowerCase().includes(normalizedSearch),
          );
          return !!(inName || inDesc || inOpts);
        }
      : () => true;

    return sortedAll.filter((p) => byOwner(p) && byQuery(p));
  }, [sortedAll, myOnly, user, normalizedSearch]);

  const visible = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount]);
  const canLoadMore = visible.length < filtered.length; // controls "Load more"

  const canCreate = useMemo(() => {
    const validName = name.trim().length >= 3 && name.trim().length <= 400;
    const validDesc = description.length <= 4000;
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    return validName && validDesc && cleaned.length >= 1;
  }, [name, description, options]);

  const handleCreate = async () => {
    if (!user?.address) return;
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    const optionsString = cleaned.join(', ');
    try {
      await qortalRequest({
        action: 'CREATE_POLL',
        pollName: name.trim(),
        pollDescription: description.trim(),
        pollOptions: [optionsString],
        pollOwnerAddress: user.address,
      });
      dispatch(
        setNotification({
          msg: 'Creating poll successful',
          alertType: 'success',
        }),
      );
      // After create, immediately hand back pollName to editor
      onSelect(name.trim());
      setIsCreateOpen(false);
      setOpen(false);
    } catch (e: any) {
      dispatch(
        setNotification({
          msg: e?.message || 'Creating poll failed',
          alertType: 'error',
        }),
      );
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Tooltip title="Add a poll" arrow>
        <HowToVoteIcon
          onClick={handleToggle}
          sx={{ height: height || '30px', width: width || 'auto', cursor: 'pointer' }}
        />
      </Tooltip>

      <Drawer
        anchor="right"
        open={open}
        onClose={handleToggle}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiPaper-root': { width: '460px' } }}
      >
        <Panel>
          <Box sx={{ px: 2, pt: 2, width: '100%' }}>
            <Typography variant="h5" gutterBottom>
              Select Poll
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
              Search polls on Qortal. Default shows only your polls.
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="Search polls"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setDisplayCount(50);
                }}
              />
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={myOnly}
                  onChange={(e) => {
                    setMyOnly(e.target.checked);
                    setDisplayCount(50);
                  }}
                />
              }
              label="My Polls"
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', my: 1 }}>
              <Button
                startIcon={<AddCircleOutlineIcon />}
                variant="contained"
                onClick={() => setIsCreateOpen(true)}
              >
                Create new poll
              </Button>
            </Box>
          </Box>

          <Divider />

          <List sx={{ width: '100%', flex: 1, overflow: 'auto' }}>
            {visible.map((p) => (
              <ListItem
                key={p.pollName}
                secondaryAction={
                  <Button
                    variant="outlined"
                    onClick={() => {
                      onSelect(p.pollName);
                      setOpen(false);
                    }}
                  >
                    Embed
                  </Button>
                }
              >
                <ButtonBase
                  onClick={() => {
                    onSelect(p.pollName);
                    setOpen(false);
                  }}
                  sx={{ width: '100%', textAlign: 'left' }}
                >
                  <ListItemText primary={p.pollName} secondary={p.description || ''} />
                </ButtonBase>
              </ListItem>
            ))}
            {/* While scanning & no cache yet, show spinner */}
            {open && scanningAll && allPolls.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={20} />
              </Box>
            )}
            {/* If scan finished (or partial cache exists) but filter produced nothing */}
            {!scanningAll && visible.length === 0 && (
              <Typography sx={{ px: 2, py: 2 }}>No polls found.</Typography>
            )}
            {/* Only show Load more if there are more filtered results beyond what's visible */}
            {!scanningAll && canLoadMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <Button onClick={() => setDisplayCount((c) => c + 50)}>Load more</Button>
              </Box>
            )}
          </List>

          {/* Create Poll Dialog (inline, simple) */}
          {isCreateOpen && (
            <Box sx={{ width: '100%', borderTop: '1px solid rgba(0,0,0,0.1)', p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Create Poll
              </Typography>
              <TextField
                fullWidth
                label="Poll name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                helperText="3–400 chars; must be unique on-chain"
                sx={{ mb: 1 }}
              />
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                sx={{ mb: 1 }}
              />
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Options
              </Typography>
              {options.map((opt, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                  />
                  <Button onClick={() => removeOption(i)} disabled={options.length <= 1}>
                    Remove
                  </Button>
                </Box>
              ))}
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button onClick={addOption}>Add option</Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button variant="contained" disabled={!canCreate} onClick={handleCreate}>
                  Create & Embed
                </Button>
              </Box>
            </Box>
          )}
        </Panel>
      </Drawer>
    </Box>
  );
};
