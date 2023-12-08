import React, { useState } from 'react'
import { ReusableModal } from '../../components/modals/ReusableModal'
import { Box, Button, Input, Typography } from '@mui/material'
import { BuilderButton } from '../CreatePost/CreatePost-styles'
import BlogEditor from '../../components/editor/BlogEditor'
import EmailIcon from '@mui/icons-material/Email'
import { Descendant } from 'slate'
import ShortUniqueId from 'short-unique-id'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import AttachFileIcon from '@mui/icons-material/AttachFile'

import { setNotification } from '../../state/features/notificationsSlice'
import {
  objectToBase64,
  objectToUint8Array,
  objectToUint8ArrayFromResponse,
  uint8ArrayToBase64
} from '../../utils/toBase64'
import ReadOnlySlate from '../../components/editor/ReadOnlySlate'
import MailThread from './MailThread'
import { AvatarWrapper } from './MailTable'
import { formatTimestamp } from '../../utils/time'
import FileElement from '../../components/FileElement'
const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }]
  }
]
const uid = new ShortUniqueId()

export const ShowMessage = ({
  isOpen,
  setIsOpen,
  message,
  setReplyTo,
  alias
}: any) => {
  const [value, setValue] = useState(initialValue)
  const [title, setTitle] = useState<string>('')
  const [attachments, setAttachments] = useState<any[]>([])
  const [description, setDescription] = useState<string>('')
  const [isOpenMailThread, setIsOpenMailThread] = useState<boolean>(false)

  const [destinationName, setDestinationName] = useState('')
  const user = useSelector((state: RootState) => state.auth?.user)
  const dispatch = useDispatch()
  const openModal = () => {
    setIsOpen(true)
  }
  const closeModal = () => {
    setIsOpen(false)
    setIsOpenMailThread(false)
  }

  const handleReply = () => {
    setReplyTo(message)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        width: '100%'
      }}
    >
      <ReusableModal
        open={isOpen}
        customStyles={{
          width: '96%',
          maxWidth: 1500,
          height: '96%'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            width: '100%',
            alignItems: 'center'
          }}
        >
          {isOpenMailThread &&
            !alias &&
            message?.generalData?.thread &&
            message?.user &&
            user?.name && (
              <Button
                variant="contained"
                onClick={() => {
                  setIsOpenMailThread(false)
                }}
              >
                Hide message threads
              </Button>
            )}

          {!isOpenMailThread &&
            !alias &&
            message?.generalData?.thread?.length > 0 &&
            message?.user &&
            user?.name && (
              <Button
                variant="contained"
                onClick={() => {
                  setIsOpenMailThread(true)
                }}
              >
                Show message threads
              </Button>
            )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
            gap: 1,
            flexGrow: 1,
            overflow: 'auto',
            width: '100%'
          }}
        >
          {isOpenMailThread &&
            !alias &&
            message?.generalData?.thread?.length > 0 &&
            message?.user &&
            user?.name && (
              <MailThread
                thread={message?.generalData?.thread}
                users={[message.user, user.name]}
                otherUser={message?.user}
              />
            )}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%'
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <AvatarWrapper user={message?.user} />
              <Typography
                sx={{
                  fontSize: '16px'
                }}
              >
                {message?.user}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <Typography
                sx={{
                  fontSize: '16px'
                }}
              >
                {message?.subject}
              </Typography>
              <Typography
                sx={{
                  fontSize: '16px'
                }}
              >
                {formatTimestamp(message?.createdAt)}
              </Typography>
            </Box>
          </Box>
          {message?.attachments?.length > 0 && (
            <Box
              sx={{
                width: '100%',
                marginTop: '10px'
              }}
            >
              {message?.attachments.map((file: any) => {
                return (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      width: '100%'
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                        width: 'auto'
                      }}
                    >
                      <FileElement
                        fileInfo={file}
                        title={file?.filename}
                        mode="mail"
                        otherUser={message?.user}
                      >
                        <AttachFileIcon
                          sx={{
                            height: '16px',
                            width: 'auto'
                          }}
                        ></AttachFileIcon>
                        <Typography
                          sx={{
                            fontSize: '16px'
                          }}
                        >
                          {file?.originalFilename || file?.filename}
                        </Typography>
                      </FileElement>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          )}

          {message?.textContent && (
            <ReadOnlySlate content={message.textContent} mode="mail" />
          )}
        </Box>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            justifyContent: 'flex-end'
          }}
        >
          <BuilderButton onClick={handleReply}>Reply</BuilderButton>
          <BuilderButton onClick={closeModal}>Close</BuilderButton>
        </Box>
      </ReusableModal>
    </Box>
  )
}
