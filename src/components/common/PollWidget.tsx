import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  LinearProgress,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { setNotification } from '../../state/features/notificationsSlice';

type PollOption = { optionName: string };
type PollInfo = { pollName: string; description?: string; pollOptions: PollOption[] };
type VotesResp = {
  votes: { voterPublicKey: string | string[]; optionIndex: number }[];
  totalVotes: number;
  voteCounts: { optionName: string; voteCount: number }[];
};

export const PollWidget: React.FC<{ pollName: string }> = ({ pollName }) => {
  const { user } = useSelector((s: RootState) => s.auth);
  const [info, setInfo] = useState<PollInfo | null>(null);
  const [votes, setVotes] = useState<VotesResp | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [myExistingChoice, setMyExistingChoice] = useState<number | null>(null);
  const [myPendingChoice, setMyPendingChoice] = useState<number | null>(null);
  const myPk = user?.publicKey;
  const dispatch = useDispatch();

  const fetchInfo = async () => {
    try {
      const r = await fetch(`/polls/${encodeURIComponent(pollName)}`);
      const j = await r.json();
      setInfo(j);
    } catch {}
  };

  const fetchVotes = async () => {
    try {
      const r = await fetch(`/polls/votes/${encodeURIComponent(pollName)}`);
      const j = await r.json();
      setVotes(j);
      if (myPk && j?.votes?.length) {
        const found = j.votes.find((v: any) => {
          const arr = Array.isArray(v.voterPublicKey) ? v.voterPublicKey : [v.voterPublicKey];
          return arr?.[0]?.toLowerCase?.() === String(myPk).toLowerCase();
        });
        // <-- NEW: capture your recorded vote separately
        setMyExistingChoice(found ? found.optionIndex : null);
        // Initialize the radio selection once, but don't let it drive the label
        if (selected === null) {
          setSelected(found ? found.optionIndex : null);
        }
      } else {
        setMyExistingChoice(null);
        if (selected === null) setSelected(null);
      }
    } catch {}
  };

  const fetchPendingVotes = async () => {
    if (!user?.address) {
      setMyPendingChoice(null);
      return;
    }
    try {
      const r = await fetch(
        `/transactions/search?txType=VOTE_ON_POLL&reverse=true&confirmationStatus=UNCONFIRMED&limit=100`,
      );
      const txs = await r.json();
      // Filter to only this user's unconfirmed votes for this poll
      const matching = txs
        .filter(
          (tx: any) =>
            tx.pollName === pollName &&
            tx.creatorAddress?.toLowerCase() === user.address.toLowerCase(),
        )
        .sort((a: any, b: any) => b.timestamp - a.timestamp);

      if (matching.length > 0) {
        setMyPendingChoice(matching[0].optionIndex);
      } else {
        setMyPendingChoice(null);
      }
    } catch {
      setMyPendingChoice(null);
    }
  };

  useEffect(() => {
    fetchInfo();
    fetchVotes();
    fetchPendingVotes();
    // eslint-disable-next-line
  }, [pollName, myPk]);

  const total = votes?.totalVotes || 0;
  const countsByOption = useMemo(() => {
    const map = new Map<string, number>();
    votes?.voteCounts?.forEach((v) => map.set(v.optionName, v.voteCount));
    return map;
  }, [votes]);

  const doVote = async () => {
    if (selected === null) return;
    try {
      setSubmitting(true);
      await qortalRequest({
        action: 'VOTE_ON_POLL',
        pollName,
        optionIndex: selected,
      });
      dispatch(
        setNotification({
          msg: 'Voting successful',
          alertType: 'success',
        }),
      );
      await fetchVotes();
      await fetchPendingVotes();
    } catch (e: any) {
      dispatch(
        setNotification({
          msg: e?.message || 'Voting failed',
          alertType: 'error',
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!info) return null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {info.pollName}
        </Typography>
        {info.description && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            {info.description}
          </Typography>
        )}

        <RadioGroup
          value={selected !== null ? String(selected) : ''}
          onChange={(e) => setSelected(Number(e.target.value))}
        >
          {info.pollOptions?.map((opt, i) => {
            const count = countsByOption.get(opt.optionName) || 0;
            const pct = total ? Math.round((count / total) * 100) : 0;
            const isMine = myPk ? myExistingChoice === i : false;
            const isPending = myPk ? myPendingChoice === i : false;
            return (
              <Box key={i} sx={{ mb: 1.5 }}>
                <FormControlLabel value={String(i)} control={<Radio />} label={opt.optionName} />
                <LinearProgress variant="determinate" value={pct} />
                <Typography variant="caption" sx={{ ml: 1 }}>
                  {count} vote{count !== 1 ? 's' : ''} {total ? `(${pct}%)` : ''}
                  {isMine ? ` • Your choice${isPending ? ' (pending)' : ''}` : ''}
                </Typography>
              </Box>
            );
          })}
        </RadioGroup>

        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button
            variant="contained"
            disabled={selected === null || submitting || !user}
            onClick={doVote}
          >
            {user ? (submitting ? 'Voting...' : 'Vote') : 'Sign in to vote'}
          </Button>
          <Button
            variant="text"
            onClick={async () => {
              await fetchVotes();
              await fetchPendingVotes();
            }}
          >
            Refresh
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
