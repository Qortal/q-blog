import React, { Dispatch, useEffect, useState } from 'react'
import { ReusableModal } from '../../components/modals/ReusableModal'
import { Box, Input, Typography } from '@mui/material'
import { BuilderButton } from '../CreatePost/CreatePost-styles'
import BlogEditor from '../../components/editor/BlogEditor'
import EmailIcon from '@mui/icons-material/Email'
import { Descendant } from 'slate'
import ShortUniqueId from 'short-unique-id'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import { useDropzone } from 'react-dropzone'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import CloseIcon from '@mui/icons-material/Close'

import { setNotification } from '../../state/features/notificationsSlice'
import {
  objectToBase64,
  objectToUint8Array,
  objectToUint8ArrayFromResponse,
  processFileInChunks,
  toBase64,
  uint8ArrayToBase64
} from '../../utils/toBase64'
import {
  MAIL_ATTACHMENT_SERVICE_TYPE,
  MAIL_SERVICE_TYPE
} from '../../constants/mail'
const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }]
  }
]
const uid = new ShortUniqueId()

interface NewMessageProps {
  replyTo?: any
  setReplyTo: React.Dispatch<any>
  alias?: string
}
const maxSize = 25 * 1024 * 1024 // 25 MB in bytes
export const NewMessage = ({ setReplyTo, replyTo, alias }: NewMessageProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [value, setValue] = useState(initialValue)
  const [title, setTitle] = useState<string>('')
  const [attachments, setAttachments] = useState<any[]>([])
  const [description, setDescription] = useState<string>('')
  const [subject, setSubject] = useState<string>('')
  const [destinationName, setDestinationName] = useState('')
  const [aliasValue, setAliasValue] = useState<string>('')
  const { user } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch()
  const { getRootProps, getInputProps } = useDropzone({
    maxSize,
    onDrop: (acceptedFiles) => {
      setAttachments((prev) => [...prev, ...acceptedFiles])
    },
    onDropRejected: (rejectedFiles) => {
      dispatch(
        setNotification({
          msg: 'One of your files is over the 25mb limit',
          alertType: 'error'
        })
      )
    }
  })

  useEffect(() => {
    if (alias) {
      setAliasValue(alias)
    }
  }, [alias])

  const openModal = () => {
    setIsOpen(true)

    setReplyTo(null)
  }
  const closeModal = () => {
    setAttachments([])
    setSubject('')
    setDestinationName('')

    setValue(initialValue)
    setReplyTo(null)
    setIsOpen(false)
    if (!alias) {
      setAliasValue('')
    }
  }
  useEffect(() => {
    if (replyTo) {
      setIsOpen(true)
      setDestinationName(replyTo?.user || '')
    }
  }, [replyTo])
  async function publishQDNResource() {
    let address: string = ''
    let name: string = ''
    let errorMsg = ''

    address = user?.address || ''
    name = user?.name || ''

    const missingFields: string[] = []
    if (!address) {
      errorMsg = "Cannot send: your address isn't available"
    }
    if (!name) {
      errorMsg = 'Cannot send a message without a access to your name'
    }
    if (!destinationName) {
      errorMsg = 'Cannot send a message without a recipient name'
    }
    // if (!description) missingFields.push('subject')
    if (missingFields.length > 0) {
      const missingFieldsString = missingFields.join(', ')
      const errMsg = `Missing: ${missingFieldsString}`
      errorMsg = errMsg
    }

    if (errorMsg) {
      dispatch(
        setNotification({
          msg: errorMsg,
          alertType: 'error'
        })
      )
      throw new Error(errorMsg)
    }

    const mailObject: any = {
      title,
      // description,
      subject,
      createdAt: Date.now(),
      version: 1,
      attachments,
      textContent: value,
      generalData: {
        thread: []
      },
      recipient: destinationName
    }
    if (replyTo?.id) {
      const previousTread = Array.isArray(replyTo?.generalData?.thread)
        ? replyTo?.generalData?.thread
        : []
      mailObject.generalData.thread = [
        ...previousTread,
        {
          identifier: replyTo.id,
          name: replyTo.user,
          service: MAIL_SERVICE_TYPE
        }
      ]
    }

    try {
      if (!destinationName) return
      const id = uid()
      const recipientName = destinationName
      const resName = await qortalRequest({
        action: 'GET_NAME_DATA',
        name: recipientName
      })
      if (!resName?.owner) return

      const recipientAddress = resName.owner
      const resAddress = await qortalRequest({
        action: 'GET_ACCOUNT_DATA',
        address: recipientAddress
      })
      if (!resAddress?.publicKey) return
      const recipientPublicKey = resAddress.publicKey

      // START OF ATTACHMENT LOGIC

      const attachmentArray = []
      for (const attachment of attachments) {
        const fileBase64 = await toBase64(attachment)
        if (typeof fileBase64 !== 'string' || !fileBase64)
          throw new Error('Could not convert file to base64')
        const base64String = fileBase64.split(',')[1]

        const id = uid()
        const id2 = uid()
        const identifier = `attachments_qmail_${id}_${id2}`
        const fileExtension = attachment?.name?.split('.')?.pop()
        if (!fileExtension) {
          throw new Error('One of your attachments does not have an extension')
        }
        const obj = {
          name: name,
          service: MAIL_ATTACHMENT_SERVICE_TYPE,
          filename: `${id}.${fileExtension}`,
          identifier,
          data64: base64String
        }

        attachmentArray.push(obj)
      }

      if (attachmentArray?.length > 0) {
        mailObject.attachments = attachmentArray.map((item) => {
          return {
            identifier: item.identifier,
            name,
            service: MAIL_ATTACHMENT_SERVICE_TYPE,
            filename: item.filename
          }
        })

        const multiplePublish = {
          action: 'PUBLISH_MULTIPLE_QDN_RESOURCES',
          resources: [...attachmentArray],
          encrypt: true,
          recipientPublicKey
        }
        await qortalRequest(multiplePublish)
      }

      //END OF ATTACHMENT LOGIC

      const blogPostToBase64 = await objectToBase64(mailObject)
      let identifier = `qortal_qmail_${recipientName.slice(
        0,
        20
      )}_${recipientAddress.slice(-6)}_mail_${id}`

      if (aliasValue) {
        identifier = `qortal_qmail_${aliasValue}_mail_${id}`
      }

      let requestBody: any = {
        action: 'PUBLISH_QDN_RESOURCE',
        name: name,
        service: MAIL_SERVICE_TYPE,
        data64: blogPostToBase64,
        title: title,
        // description: description,
        identifier,
        encrypt: true,
        recipientPublicKey
      }

      await qortalRequest(requestBody)
      dispatch(
        setNotification({
          msg: 'Message sent',
          alertType: 'success'
        })
      )

      closeModal()
    } catch (error: any) {
      let notificationObj = null
      if (typeof error === 'string') {
        notificationObj = {
          msg: error || 'Failed to send message',
          alertType: 'error'
        }
      } else if (typeof error?.error === 'string') {
        notificationObj = {
          msg: error?.error || 'Failed to send message',
          alertType: 'error'
        }
      } else {
        notificationObj = {
          msg: error?.message || 'Failed to send message',
          alertType: 'error'
        }
      }
      if (!notificationObj) return
      dispatch(setNotification(notificationObj))

      throw new Error('Failed to send message')
    }
  }

  const sendMail = () => {
    publishQDNResource()
  }
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        width: '100%'
      }}
    >
      {!alias && (
        <EmailIcon
          sx={{
            cursor: 'pointer',
            margin: '15px'
          }}
          onClick={openModal}
        />
      )}

      <ReusableModal open={isOpen}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              flexDirection: 'column',
              gap: 2,
              width: '100%'
            }}
          >
            <Input
              id="standard-adornment-name"
              value={destinationName}
              disabled={!!replyTo}
              onChange={(e) => {
                setDestinationName(e.target.value)
              }}
              placeholder="To (name) -public"
              sx={{
                width: '100%',
                fontSize: '16px'
              }}
            />
            <Input
              id="standard-adornment-alias"
              value={aliasValue}
              disabled={!!alias}
              onChange={(e) => {
                setAliasValue(e.target.value)
              }}
              placeholder="Alias -optional"
              sx={{
                width: '100%',
                fontSize: '16px'
              }}
            />

            <Input
              id="standard-adornment-name"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value)
              }}
              placeholder="Subject"
              sx={{
                width: '100%',
                fontSize: '16px'
              }}
            />
            <Box
              {...getRootProps()}
              sx={{
                border: '1px dashed gray',
                padding: 2,
                textAlign: 'center',
                marginBottom: 2
              }}
            >
              <input {...getInputProps()} />
              <AttachFileIcon
                sx={{
                  height: '20px',
                  width: 'auto',
                  cursor: 'pointer'
                }}
              ></AttachFileIcon>
            </Box>
            <Box>
              {attachments.map((file, index) => {
                return (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px'
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '16px'
                      }}
                    >
                      {file?.name}
                    </Typography>
                    <CloseIcon
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((item, itemIndex) => itemIndex !== index)
                        )
                      }
                      sx={{
                        height: '16px',
                        width: 'auto',
                        cursor: 'pointer'
                      }}
                    />
                  </Box>
                )
              })}
            </Box>
          </Box>
          <BlogEditor
            mode="mail"
            value={value}
            setValue={setValue}
            editorKey={1}
          />
        </Box>
        <BuilderButton onClick={sendMail}>
          {replyTo ? 'Send reply mail' : 'Send mail'}
        </BuilderButton>
        <BuilderButton onClick={closeModal}>Close</BuilderButton>
      </ReusableModal>
    </Box>
  )
}
