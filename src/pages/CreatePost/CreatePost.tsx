import { Box, Button, Typography } from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { ReusableModal } from '../../components/modals/ReusableModal';
import { CreatePostBuilder } from './CreatePostBuilder';
import { CreatePostMinimal } from './CreatePostMinimal';
import HandymanRoundedIcon from '@mui/icons-material/HandymanRounded';
import HourglassFullRoundedIcon from '@mui/icons-material/HourglassFullRounded';
import { useDispatch, useSelector } from 'react-redux';
import { setIsLoadingGlobal } from '../../state/features/globalSlice';
import { useNavigate, useParams } from 'react-router-dom';
import { checkStructure } from '../../utils/checkStructure';
import { RootState } from '../../state/store';
import { addPrefix } from '../../utils/blogIdformats';
import { getCachedBlogSettings } from '../../utils/wikiSettingsCache';
import { BlogSettings, canEdit, selectCanonical } from '../../utils/wiki';

type EditorType = 'minimal' | 'builder';

interface CreatePostProps {
  mode?: string;
}

export const CreatePost = ({ mode }: CreatePostProps) => {
  const { user: username, postId, blog } = useParams();
  const user = useSelector((state: RootState) => state.auth?.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // In edit mode, build the full identifier from :blog and :postId
  const fullPostId = useMemo(() => {
    if (mode !== 'edit') return '';
    if (!blog || !postId) return '';
    const blogFull = addPrefix(blog);
    return `${blogFull}-post-${postId}`;
  }, [postId, mode, blog]);

  const [toggleEditorType, setToggleEditorType] = useState<EditorType | null>(null);
  const [blogContentForEdit, setBlogContentForEdit] = useState<any>(null);
  const [blogMetadataForEdit, setBlogMetadataForEdit] = useState<any>(null);
  const [editType, setEditType] = useState<EditorType | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Creation flow: open editor type chooser
  useEffect(() => {
    if (!toggleEditorType && mode !== 'edit') {
      setIsOpen(true);
    }
  }, [setIsOpen, toggleEditorType, mode]);

  const switchType = () => setIsOpen(true);

  // Permission check for edit
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (mode !== 'edit' || !blog) return;
      const viewer = user?.name;
      if (!viewer) {
        // Defer permission decision until viewer is known (prevents redirect race in tests)
        return;
      }
      const blogFull = addPrefix(blog);
      try {
        const { ownerName, settings } = await getCachedBlogSettings(blogFull);
        const allowed = canEdit(viewer, settings as BlogSettings, ownerName);
        if (!allowed && !cancelled) navigate('/');
      } catch {
        if (!cancelled) navigate('/');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.name, blog, mode, navigate]);

  // Load post content for edit
  const getBlogPost = React.useCallback(async () => {
    if (!blog || !postId) return;
    const blogFull = addPrefix(blog);
    const fullId = fullPostId;
    try {
      dispatch(setIsLoadingGlobal(true));

      // 1) Fast path: fetch content immediately using the route ":user" param
      const initialName = username || '';
      try {
        const contentUrl = `/arbitrary/BLOG_POST/${initialName}/${fullId}`;
        const contentResp = await fetch(contentUrl, {
          headers: { 'Content-Type': 'application/json' },
        });
        const contentJson = await contentResp.json();
        if (checkStructure(contentJson)) {
          const blogType = contentJson?.layoutGeneralSettings?.blogPostType;
          setEditType(blogType || 'minimal');
          setBlogContentForEdit(contentJson);
        } else {
          // Backward-compat fallback for legacy posts
          const fallbackLayouts =
            contentJson?.layouts &&
            typeof contentJson.layouts === 'object' &&
            Array.isArray(contentJson.layouts.rows)
              ? contentJson.layouts
              : { rows: [] };
          const fallback = {
            title: contentJson?.title ?? '',
            createdAt: Date.now(),
            postContent: Array.isArray(contentJson?.postContent) ? contentJson.postContent : [],
            layouts: fallbackLayouts,
            layoutGeneralSettings: contentJson?.layoutGeneralSettings ?? {
              blogPostType: 'minimal',
            },
          } as any;
          setEditType('minimal');
          setBlogContentForEdit(fallback);
        }
      } catch {
        // ignore; canonical resolution may still populate metadata
      }

      // 2) Resolve canonical author + revisions metadata in the background
      (async () => {
        try {
          const { ownerName, settings } = await getCachedBlogSettings(blogFull);
          let contentName = initialName;

          // Search revisions for this identifier
          let items: any[] = [];
          try {
            const searchUrl = `/arbitrary/resources/search?service=BLOG_POST&identifier=${encodeURIComponent(
              fullId,
            )}&includemetadata=true&reverse=true`;
            const resp = await fetch(searchUrl, {
              headers: { 'Content-Type': 'application/json' },
            });
            items = (await resp.json()) || [];
          } catch {
            items = [];
          }

          if (settings?.wikiEnabled && Array.isArray(items) && items.length > 0) {
            const revisions = items.map((it: any) => ({
              id: it.identifier,
              originPostId: it.identifier,
              lineageBlogId: blogFull,
              authorName: it.name,
              updatedAt: it.updated,
              qdnUpdated: it.updated,
              published: true,
            }));
            const sel = selectCanonical(revisions, settings as BlogSettings, ownerName, {
              expectedLineageBlogId: blogFull,
            });
            if (sel?.authorName) contentName = sel.authorName;
          }

          const chosenMeta = (items || []).find((it: any) => it.name === contentName) || items?.[0];
          if (chosenMeta) setBlogMetadataForEdit(chosenMeta);
        } catch {
          // ignore metadata issues; editor remains usable
        }
      })();
    } finally {
      dispatch(setIsLoadingGlobal(false));
    }
  }, [username, fullPostId, blog, postId, dispatch]);

  useEffect(() => {
    if (mode === 'edit') {
      void getBlogPost();
    }
  }, [mode, getBlogPost]);

  return (
    <>
      {/* Create mode type chooser */}
      {isOpen && mode !== 'edit' && (
        <ReusableModal open={isOpen} customStyles={{ maxWidth: '500px' }}>
          {toggleEditorType && (
            <Typography>Switching editor type will delete your current progress</Typography>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <Box
              onClick={() => {
                setToggleEditorType('minimal');
                setIsOpen(false);
              }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px',
                borderRadius: '6px',
                border: '1px solid',
                cursor: 'pointer',
              }}
            >
              <Typography>Minimal Editor</Typography>
              <HourglassFullRoundedIcon />
            </Box>
            <Box
              onClick={() => {
                setToggleEditorType('builder');
                setIsOpen(false);
              }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px',
                borderRadius: '6px',
                border: '1px solid',
                cursor: 'pointer',
              }}
            >
              <Typography>Builder Editor</Typography>
              <HandymanRoundedIcon />
            </Box>
          </Box>
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </ReusableModal>
      )}

      {/* Create mode editors */}
      {toggleEditorType === 'minimal' && mode !== 'edit' && (
        <CreatePostMinimal switchType={switchType} />
      )}
      {toggleEditorType === 'builder' && mode !== 'edit' && (
        <CreatePostBuilder switchType={switchType} />
      )}

      {/* Edit mode editors */}
      {mode === 'edit' && editType === 'minimal' && (
        <CreatePostMinimal
          blogContentForEdit={blogContentForEdit}
          postIdForEdit={fullPostId}
          blogMetadataForEdit={blogMetadataForEdit}
        />
      )}
      {mode === 'edit' && editType === 'builder' && (
        <CreatePostBuilder
          blogContentForEdit={blogContentForEdit}
          postIdForEdit={fullPostId}
          blogMetadataForEdit={blogMetadataForEdit}
        />
      )}
    </>
  );
};
