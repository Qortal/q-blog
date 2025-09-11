import React, { useEffect, useState, useCallback } from 'react';
import { styled, Box } from '@mui/system';
import { Drawer, Typography, Tooltip, Button, ButtonBase } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import ImageUploader from './ImageUploader';

interface ImagePanelProps {
  onSelect: (src: string) => void;
  height?: string;
  width?: string;
}

const Panel = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding-bottom: 10px;
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

export const ImagePanel: React.FC<ImagePanelProps> = ({ onSelect, height, width }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);

  const qdnResourceUrl = useCallback(
    (service: string, name: string, identifier: string) =>
      `/arbitrary/${service}/${name}/${identifier}`,
    [],
  );

  const fetchImages = useCallback(async () => {
    if (!user?.name) return;
    setLoading(true);
    try {
      const SERVICES = ['IMAGE', 'THUMBNAIL', 'QCHAT_IMAGE'];
      const lists = await Promise.all(
        SERVICES.map(async (svc) => {
          const res = await fetch(
            `/arbitrary/resources?service=${svc}&name=${user.name}&includemetadata=true&limit=100&offset=0&reverse=true`,
          );
          const data = await res.json();
          return Array.isArray(data)
            ? data.map((it: any) => ({ ...it, service: it.service || svc }))
            : [];
        }),
      );
      setItems(lists.flat());
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) fetchImages();
  }, [isOpen, fetchImages]);

  const handleToggle = () => setIsOpen((v) => !v);

  const handleChooseExisting = (img: any) => {
    const service = img.service || 'IMAGE';
    const url = qdnResourceUrl(service, img.name, img.identifier);
    onSelect(url);
    setIsOpen(false);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Tooltip title="Add an image" arrow>
        <AddPhotoAlternateIcon
          onClick={handleToggle}
          sx={{
            height: height || '30px',
            width: width || 'auto',
            cursor: 'pointer',
          }}
        />
      </Tooltip>

      <Drawer
        anchor="right"
        open={isOpen}
        onClose={handleToggle}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiPaper-root': { width: '420px' } }}
      >
        <Panel>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: '0 0',
            }}
          >
            <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>
              Select Image
            </Typography>
            <Typography variant="subtitle2" sx={{ mb: 2 }} align="center">
              List of images in QDN under your name
            </Typography>
          </Box>

          <Box
            sx={{
              width: '100%',
              px: 2,
              pb: 1,
              flex: '1',
              overflow: 'auto',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1,
              }}
            >
              {items.map((img) => {
                const service = img.service || 'IMAGE';
                const url = qdnResourceUrl(service, img.name, img.identifier);
                return (
                  <ButtonBase
                    key={`${service}:${img.name}:${img.identifier}`}
                    onClick={() => handleChooseExisting(img)}
                    sx={{
                      width: '100%',
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '1px solid rgba(0,0,0,0.2)',
                    }}
                  >
                    <Box sx={{ width: '100%' }}>
                      <img
                        src={url}
                        style={{
                          display: 'block',
                          width: '100%',
                          height: 100,
                          objectFit: 'cover',
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', p: 0.5 }}
                        noWrap
                        title={img?.metadata?.title || img.identifier}
                      >
                        {img?.metadata?.title || img.identifier}
                      </Typography>
                    </Box>
                  </ButtonBase>
                );
              })}
            </Box>
            {loading && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                Loading.
              </Typography>
            )}
            {!loading && !items.length && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                No published images found.
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              flex: '0 0 56px',
              py: 1,
            }}
          >
            <ImageUploader
              onPick={(base64) => {
                onSelect(base64);
                setIsOpen(false);
              }}
            >
              <Button variant="contained">Publish new image</Button>
            </ImageUploader>
          </Box>
        </Panel>
      </Drawer>
    </Box>
  );
};
