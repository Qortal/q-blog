import React from 'react';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import Slider from '@mui/material/Slider';
import { AudioPanel } from '../../../../components/common/AudioPanel';
import { Box, Toolbar, AppBar, useTheme } from '@mui/material';
import { styled } from '@mui/system';
import { ImagePanel } from '../../../../components/common/ImagePanel';
import { PollPanel } from '../../../../components/common/PollPanel';
import { VideoPanel } from '../../../../components/common/VideoPanel';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import HandymanRoundedIcon from '@mui/icons-material/HandymanRounded';
import Tooltip from '@mui/material/Tooltip';
import { FilePanel } from '../../../../components/common/FilePanel';

const CustomToolbar = styled(Toolbar)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const CustomAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'light' ? theme.palette.background.default : '#19191b',
}));

interface IEditorToolbar {
  setIsOpenAddTextModal: (val: boolean) => void;
  addImage: (base64: string) => void;
  onSelectVideo: (video: any) => void;
  onSelectAudio: (audio: any) => void;
  onSelectFile: (file: any) => void;
  onSelectPoll: (pollName: string) => void;
  paddingValue: number;
  onChangePadding: (padding: number) => void;
  isMinimal?: boolean;
  addNav?: () => void;
  switchType?: () => void;
}

export const EditorToolbar = ({
  setIsOpenAddTextModal,
  addImage,
  onSelectVideo,
  onSelectAudio,
  onSelectFile,
  onSelectPoll,
  paddingValue,
  onChangePadding,
  isMinimal = false,
  addNav,
  switchType,
}: IEditorToolbar) => {
  const theme = useTheme();
  return (
    <CustomAppBar position="sticky">
      <CustomToolbar variant="dense">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              gap: '10px',
            }}
          >
            <Tooltip title="Add Text" arrow>
              <TextFieldsIcon
                onClick={() => setIsOpenAddTextModal(true)}
                sx={{
                  cursor: 'pointer',
                  width: 'auto',
                  height: '30px',
                }}
              />
            </Tooltip>

            <ImagePanel onSelect={addImage} />
            <VideoPanel onSelect={onSelectVideo} />
            <AudioPanel onSelect={onSelectAudio} />
            <FilePanel onSelect={onSelectFile} />
            <PollPanel onSelect={onSelectPoll} />
          </Box>
          <Box
            sx={{
              display: 'flex',
              gap: '10px',
            }}
          >
            {!isMinimal && (
              <Tooltip title="Adjust padding between elements" arrow>
                <Box>
                  <Slider
                    size="small"
                    value={paddingValue}
                    onChange={(event: any) => onChangePadding(event.target.value)}
                    defaultValue={5}
                    aria-label="Default"
                    valueLabelDisplay="auto"
                    min={0}
                    max={40}
                    sx={{
                      color: theme.palette.text.primary,
                      width: '100px',
                    }}
                  />
                </Box>
              </Tooltip>
            )}
            {!isMinimal && (
              <Tooltip title="Manage your custom navbar links" arrow>
                <MenuOpenIcon
                  onClick={addNav}
                  sx={{
                    cursor: 'pointer',
                    width: 'auto',
                    height: '30px',
                  }}
                />
              </Tooltip>
            )}
            {switchType && (
              <Tooltip title="Switch editor type" arrow>
                <HandymanRoundedIcon
                  onClick={switchType}
                  sx={{
                    cursor: 'pointer',
                    width: 'auto',
                    height: '30px',
                  }}
                />
              </Tooltip>
            )}
          </Box>
        </Box>
      </CustomToolbar>
    </CustomAppBar>
  );
};
