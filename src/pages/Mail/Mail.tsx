import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Button,
  Input,
  Typography,
  useTheme,
  IconButton
} from '@mui/material'
import { useFetchPosts } from '../../hooks/useFetchPosts'
import LazyLoad from '../../components/common/LazyLoad'
import { removePrefix } from '../../utils/blogIdformats'
import { NewMessage } from './NewMessage'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { useFetchMail } from '../../hooks/useFetchMail'
import { ShowMessage } from './ShowMessage'
import { fetchAndEvaluateMail } from '../../utils/fetchMail'
import { addToHashMapMail } from '../../state/features/mailSlice'
import { setIsLoadingGlobal } from '../../state/features/globalSlice'
import SimpleTable from './MailTable'
import { AliasMail } from './AliasMail'

export const Mail = () => {
  const theme = useTheme()
  const { user } = useSelector((state: RootState) => state.auth)
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [message, setMessage] = useState<any>(null)
  const [replyTo, setReplyTo] = useState<any>(null)
  const [valueTab, setValueTab] = React.useState(0)
  const [aliasValue, setAliasValue] = useState('')
  const [alias, setAlias] = useState<string[]>([])
  const hashMapPosts = useSelector(
    (state: RootState) => state.blog.hashMapPosts
  )
  const hashMapMailMessages = useSelector(
    (state: RootState) => state.mail.hashMapMailMessages
  )
  const mailMessages = useSelector(
    (state: RootState) => state.mail.mailMessages
  )

  const fullMailMessages = useMemo(() => {
    return mailMessages.map((msg) => {
      let message = msg
      const existingMessage = hashMapMailMessages[msg.id]
      if (existingMessage) {
        message = existingMessage
      }
      return message
    })
  }, [mailMessages, hashMapMailMessages])
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const { getMailMessages, checkNewMessages } = useFetchMail()
  const getMessages = React.useCallback(async () => {
    if (!user?.name || !user?.address) return
    await getMailMessages(user.name, user.address)
  }, [getMailMessages, user])

  const interval = useRef<any>(null)

  const checkNewMessagesFunc = useCallback(() => {
    if (!user?.name || !user?.address) return
    let isCalling = false
    interval.current = setInterval(async () => {
      if (isCalling || !user?.name || !user?.address) return
      isCalling = true
      const res = await checkNewMessages(user?.name, user.address)
      isCalling = false
    }, 30000)
  }, [checkNewMessages, user])

  useEffect(() => {
    checkNewMessagesFunc()
    return () => {
      if (interval?.current) {
        clearInterval(interval.current)
      }
    }
  }, [checkNewMessagesFunc])

  const openMessage = async (
    user: string,
    messageIdentifier: string,
    content: any
  ) => {
    try {
      const existingMessage = hashMapMailMessages[messageIdentifier]
      if (existingMessage) {
        setMessage(existingMessage)
      }
      dispatch(setIsLoadingGlobal(true))
      const res = await fetchAndEvaluateMail({
        user,
        messageIdentifier,
        content,
        otherUser: user
      })
      setMessage(res)
      dispatch(addToHashMapMail(res))
      setIsOpen(true)
    } catch (error) {
    } finally {
      dispatch(setIsLoadingGlobal(false))
    }
  }

  const firstMount = useRef(false)
  useEffect(() => {
    if (user?.name && !firstMount.current) {
      getMessages()
      firstMount.current = true
    }
  }, [user])

  function a11yProps(index: number) {
    return {
      id: `mail-tabs-${index}`,
      'aria-controls': `mail-tabs-${index}`
    }
  }

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValueTab(newValue)
  }

  function CustomTabLabel({ index, label }: any) {
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span>{label}</span>
        <IconButton
          edge="end"
          color="inherit"
          size="small"
          onClick={(event) => {
            setValueTab(0)
            const newList = [...alias]

            newList.splice(index, 1)

            setAlias(newList)
          }}
        >
          <CloseIcon fontSize="inherit" />
        </IconButton>
      </div>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        flexDirection: 'column',
        backgroundColor: 'background.paper'
      }}
    >
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'flex-start'
        }}
      >
        <Tabs
          value={valueTab}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          <Tab label={user?.name} {...a11yProps(0)} />
          {alias.map((alia, index) => {
            return (
              <Tab
                sx={{
                  '&.Mui-selected': {
                    color: theme.palette.text.primary,
                    fontWeight: theme.typography.fontWeightMedium
                  }
                }}
                key={alia}
                label={<CustomTabLabel index={index} label={alia} />}
                {...a11yProps(1 + index)}
              />
            )
          })}
        </Tabs>
        <Input
          id="standard-adornment-alias"
          onChange={(e) => {
            setAliasValue(e.target.value)
          }}
          value={aliasValue}
          placeholder="Type in alias"
          sx={{
            marginLeft: '20px',
            '&&:before': {
              borderBottom: 'none'
            },
            '&&:after': {
              borderBottom: 'none'
            },
            '&&:hover:before': {
              borderBottom: 'none'
            },
            '&&.Mui-focused:before': {
              borderBottom: 'none'
            },
            '&&.Mui-focused': {
              outline: 'none'
            },
            fontSize: '18px'
          }}
        />
        <Button
          onClick={() => {
            setAlias((prev) => [...prev, aliasValue])
            setAliasValue('')
          }}
          variant="contained"
        >
          + alias
        </Button>
      </Box>
      <NewMessage replyTo={replyTo} setReplyTo={setReplyTo} />
      <ShowMessage
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        message={message}
        setReplyTo={setReplyTo}
      />
      {/* {countNewPosts > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Typography>
            {countNewPosts === 1
              ? `There is ${countNewPosts} new message`
              : `There are ${countNewPosts} new messages`}
          </Typography>
          <Button
            sx={{
              backgroundColor: theme.palette.primary.light,
              color: theme.palette.text.primary,
              fontFamily: 'Arial'
            }}
            onClick={getNewPosts}
          >
            Load new Posts
          </Button>
        </Box>
      )} */}
      <TabPanel value={valueTab} index={0}>
        <SimpleTable
          openMessage={openMessage}
          data={fullMailMessages}
        ></SimpleTable>
        <LazyLoad onLoadMore={getMessages}></LazyLoad>
      </TabPanel>
      {alias.map((alia, index) => {
        return (
          <TabPanel key={alia} value={valueTab} index={1 + index}>
            <AliasMail value={alia} />
          </TabPanel>
        )
      })}

      {/* <Box>
        {mailMessages.map((message, index) => {
          const existingMessage = hashMapMailMessages[message.id]
          let mailMessage = message
          if (existingMessage) {
            mailMessage = existingMessage
          }
          return (
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                width: 'auto',
                position: 'relative',
                ' @media (max-width: 450px)': {
                  width: '100%'
                }
              }}
              key={mailMessage.id}
            >
              hello
            </Box>
          )
        })}
      </Box> */}
    </Box>
  )
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

export function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`mail-tabs-${index}`}
      aria-labelledby={`mail-tabs-${index}`}
      {...other}
      style={{
        width: '100%'
      }}
    >
      {value === index && children}
    </div>
  )
}