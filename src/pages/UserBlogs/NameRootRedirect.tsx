import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { listBlogsByName } from '../../utils/blogs';

export const NameRootRedirect: React.FC = () => {
  const { user } = useParams();
  const navigate = useNavigate();
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      const blogs = await listBlogsByName(user);
      if (!mounted) return;
      if (blogs.length === 1) {
        navigate(`/${user}/${blogs[0].handle}`, { replace: true });
      } else {
        navigate(`/${user}/blogs`, { replace: true });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user, navigate]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }} aria-live="polite">
      <Typography color="textSecondary">Loading blogs…</Typography>
    </Box>
  );
};

export default NameRootRedirect;
