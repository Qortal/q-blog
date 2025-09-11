import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Button, Divider, List, ListItem, ListItemText, Typography } from '@mui/material';
import { RootState } from '../../state/store';
import { BlogSummary, fetchBlogDetails, listBlogsByName } from '../../utils/blogs';
import {
  setCurrentBlog,
  toggleEditBlogModal,
  togglePublishBlogModal,
} from '../../state/features/globalSlice';
import { removePrefix } from '../../utils/blogIdformats';

export const UserBlogs: React.FC = () => {
  const { user: routeUser } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const authUser = useSelector((s: RootState) => s.auth.user);
  const isOwner = !!authUser?.name && authUser?.name === routeUser;

  const [blogs, setBlogs] = React.useState<BlogSummary[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!routeUser) return;
    setLoading(true);
    try {
      const res = await listBlogsByName(routeUser);
      setBlogs(res);
    } finally {
      setLoading(false);
    }
  }, [routeUser]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onView = (b: BlogSummary) => navigate(`/${b.name}/${b.handle}`);
  const onEdit = async (b: BlogSummary) => {
    if (!isOwner) return;
    const details = await fetchBlogDetails(b.name, b.blogId);
    if (!details) return;
    dispatch(
      setCurrentBlog({
        createdAt: details?.createdAt || Date.now(),
        blogId: b.blogId,
        title: details?.title || '',
        description: details?.description || '',
        blogImage: details?.blogImage || '',
        category: details?.category,
        tags: details?.tags || [],
        wikiEnabled: (details as any)?.wikiEnabled ?? false,
        editorWhitelist: (details as any)?.editorWhitelist || [],
        editorBlacklist: (details as any)?.editorBlacklist || [],
      }),
    );
    dispatch(toggleEditBlogModal(true));
  };

  const onCreate = () => dispatch(togglePublishBlogModal(true));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }} aria-live="polite">
        <Typography color="textSecondary">Loading blogs…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 840, mx: 'auto', p: 2 }}>
      <Typography variant="h1" sx={{ textAlign: 'center', my: 2 }}>
        {`${routeUser}'s Blogs`}
      </Typography>

      {blogs.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {isOwner ? "You don't have any blogs yet." : 'No public blogs yet.'}
          </Typography>
          {isOwner && (
            <Button variant="contained" onClick={onCreate} aria-label="Create Blog">
              Create Blog
            </Button>
          )}
        </Box>
      ) : (
        <>
          {isOwner && (
            <Box sx={{ textAlign: 'right', mb: 1 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={onCreate}
                aria-label="Create Blog"
              >
                Create Blog
              </Button>
            </Box>
          )}
          <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
            {blogs.map((b, idx) => (
              <React.Fragment key={b.blogId}>
                <ListItem
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        color="primary"
                        variant="contained"
                        onClick={() => onView(b)}
                        aria-label={`View blog ${b.title || b.handle}`}
                      >
                        View
                      </Button>
                      {isOwner && (
                        <Button
                          size="small"
                          color="primary"
                          variant="contained"
                          onClick={() => onEdit(b)}
                          aria-label={`Edit blog ${b.title || b.handle}`}
                        >
                          Edit
                        </Button>
                      )}
                    </Box>
                  }
                >
                  <ListItemText
                    primary={b.title || b.handle}
                    secondary={`/${b.name}/${b.handle}`}
                  />
                </ListItem>
                {idx < blogs.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </>
      )}
    </Box>
  );
};

export default UserBlogs;
