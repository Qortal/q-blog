import React from 'react';
import { Modal, Box } from '@mui/material';

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  open: boolean;
  onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, alt, open, onClose }) => {
  return (
    <Modal
      open={open}
      // Ignore backdrop clicks from MUI to avoid immediate close when opening
      onClose={(event, reason) => {
        if (reason === 'escapeKeyDown') onClose();
      }}
      aria-labelledby="image-lightbox-title"
      aria-describedby="image-lightbox-description"
    >
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          cursor: 'zoom-out',
        }}
        onClick={onClose}
        data-testid="image-lightbox-overlay"
      >
        {src && (
          <img
            src={src}
            alt={alt || 'Expanded blog image'}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: 4,
              boxShadow: '0 0 12px rgba(0,0,0,0.6)',
              cursor: 'inherit',
            }}
          />
        )}
      </Box>
    </Modal>
  );
};

export default ImageLightbox;
