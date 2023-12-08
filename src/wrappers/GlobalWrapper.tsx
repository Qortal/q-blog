import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { addUser } from '../state/features/authSlice'
import ShortUniqueId from 'short-unique-id'
import { RootState } from '../state/store'
import PublishBlogModal from '../components/modals/PublishBlogModal'
import EditBlogModal from '../components/modals/EditBlogModal'

import {
  setCurrentBlog,
  setIsLoadingGlobal,
  setNotificationCreatorComment,
  setNotifications,
  toggleEditBlogModal,
  togglePublishBlogModal
} from '../state/features/globalSlice'
import NavBar from '../components/layout/Navbar/Navbar'
import PageLoader from '../components/common/PageLoader'
import { fetchAndEvaluatePosts } from '../utils/fetchPosts'
import {
  addFavorites,
  addPosts,
  addSubscriptions,
  addToHashMap,
  BlogPost
} from '../state/features/blogSlice'
import { useFetchPosts } from '../hooks/useFetchPosts'
import { setNotification } from '../state/features/notificationsSlice'
import { AudioPlayer } from '../components/common/AudioPlayer'
import localForage from 'localforage'
import ConsentModal from '../components/modals/ConsentModal'
import localforage from 'localforage'
import { Item } from '../components/common/Comments/CommentEditor'

interface Props {
  children: React.ReactNode
}

const uid = new ShortUniqueId()

const notification = localforage.createInstance({
  name: 'notification'
})

const GlobalWrapper: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [userAvatar, setUserAvatar] = useState<string>('')
  const interval = useRef<any>(null)
  const { user } = useSelector((state: RootState) => state.auth)
  const { audios, currAudio } = useSelector((state: RootState) => state.global)
  const notificationCreatorComment = useSelector(
    (state: RootState) => state.global.notificationCreatorComment
  )
  const notifications = useSelector(
    (state: RootState) => state.global.notifications
  )

  const fullNotifications = useMemo(() => {
    return notificationCreatorComment.length + notifications.length
  }, [notificationCreatorComment, notifications])
  const [hasAttemptedToFetchBlogInitial, setHasAttemptedToFetchBlogInitial] =
    useState(false)
  const favoritesLocalRef = useRef<any>(null)

  const sendNotificationTab = async (fullNotifications: number) => {
    await qortalRequest({
      action: 'SET_TAB_NOTIFICATIONS',
      count: fullNotifications
    })
  }

  useEffect(() => {
    sendNotificationTab(fullNotifications)
  }, [fullNotifications])

  useEffect(() => {
    if (!user?.name) return
    const dynamicInstanceName = `q-blog-favorites-${user.name}` // Replace this with your dynamic value
    favoritesLocalRef.current = localForage.createInstance({
      name: dynamicInstanceName
    })
    getFavorites()
    getSubscriptions()
    getAvatar()
  }, [user?.name])

  const getAvatar = async () => {
    try {
      let url = await qortalRequest({
        action: 'GET_QDN_RESOURCE_URL',
        name: user?.name,
        service: 'THUMBNAIL',
        identifier: 'qortal_avatar'
      })

      if (url === 'Resource does not exist') return

      setUserAvatar(url)
    } catch (error) {
      console.error(error)
    }
  }

  const getSubscriptions = async () => {
    try {
      if (!user?.name) return
      const listName = `q-blog-subscriptions-${user.name}`
      const response = await qortalRequest({
        action: 'GET_LIST_ITEMS',
        list_name: listName
      })

      dispatch(addSubscriptions(response))
    } catch (error) {}
  }

  const {
    isOpenPublishBlogModal,
    currentBlog,
    isLoadingGlobal,
    isOpenEditBlogModal
  } = useSelector((state: RootState) => state.global)

  async function getNameInfo(address: string) {
    const response = await fetch('/names/address/' + address)
    const nameData = await response.json()

    if (nameData?.length > 0) {
      return nameData[0].name
    } else {
      return ''
    }
  }

  async function verifyIfBlogIdExtists(username: string, identifier: string) {
    let doesExist = true
    //TODO - SHOULD REMOVE NAME FILTER AND IDENTIFIER SHOULD BE EXACT
    // const url2 = `/arbitrary/resources/search?mode=ALL&service=BLOG&identifier=${identifier}&name=${username}&limit=1&includemetadata=true`
    const url2 = `/arbitrary/resources?service=BLOG&identifier=${identifier}&name=${username}&limit=1&includemetadata=true`
    const responseBlogs = await fetch(url2, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const dataMetadata = await responseBlogs.json()
    // const url = `/arbitrary/metadata/BLOG/${username}/${identifier}}`
    // const responseBlogs = await fetch(url, {
    //   method: 'GET',
    //   headers: {
    //     'Content-Type': 'application/json'
    //   }
    // })
    // const responseDataBlogs = await responseBlogs.json()
    if (dataMetadata.length === 0) {
      doesExist = false
    }

    return doesExist
  }
  async function getBlog(name: string) {
    //TODO NAME SHOULD BE EXACT
    const url = `/arbitrary/resources/search?mode=ALL&service=BLOG&identifier=q-blog-&exactmatchnames=true&name=${name}&prefix=true&limit=20&includemetadata=true`
    const responseBlogs = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const responseDataBlogs = await responseBlogs.json()
    const filterOut = responseDataBlogs.filter((blog: any) =>
      blog.identifier.startsWith('q-blog-')
    )
    let blog
    if (filterOut.length === 0) return
    if (filterOut.length !== 0) {
      blog = filterOut[0]
    }
    const urlBlog = `/arbitrary/BLOG/${blog.name}/${blog.identifier}`
    const response = await fetch(urlBlog, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const responseData = await response.json()

    dispatch(
      setCurrentBlog({
        createdAt: responseData?.createdAt || '',
        blogId: blog.identifier,
        title: responseData?.title || '',
        description: responseData?.description || '',
        blogImage: responseData?.blogImage || '',
        category: blog.metadata?.category,
        tags: blog.metadata?.tags || [],
        navbarConfig: responseData?.navbarConfig || null
      })
    )
    // const response = await fetch("/names/address/" + address);
    // const nameData = await response.json();

    //   if (nameData?.length > 0 ) {
    //       return nameData[0].name;
    //   } else {
    //       return '';
    //   }
  }

  const askForAccountInformation = React.useCallback(async () => {
    try {
      let account = await qortalRequest({
        action: 'GET_USER_ACCOUNT'
      })

      const name = await getNameInfo(account.address)
      dispatch(addUser({ ...account, name }))

      const blog = await getBlog(name)
      setHasAttemptedToFetchBlogInitial(true)
    } catch (error) {
      console.error(error)
    }
  }, [])
  function objectToBase64(obj: any) {
    // Step 1: Convert the object to a JSON string
    const jsonString = JSON.stringify(obj)

    // Step 2: Convert the JSON string to a Uint8Array of bytes
    const utf8Encoder = new TextEncoder()
    const uint8Array = utf8Encoder.encode(jsonString)

    // Step 3: Convert the Uint8Array to a base64-encoded string
    let base64 = ''

    // For browsers
    const numberArray = Array.from(uint8Array) // Convert Uint8Array to a regular array
    const binaryString = String.fromCharCode.apply(null, numberArray)
    base64 = btoa(binaryString)

    return base64
  }

  const createBlog = React.useCallback(
    async (
      title: string,
      description: string,
      category: string,
      tags: string[],
      blogIdentifier: string
    ) => {
      if (!user || !user.name)
        throw new Error('Cannot publish: You do not have a Qortal name')
      if (!title) throw new Error('A title is required')
      if (!description) throw new Error('A description is required')
      const name = user.name
      const id = uid()
      let formatBlogIdentifier = blogIdentifier
      if (formatBlogIdentifier.endsWith('-')) {
        formatBlogIdentifier = formatBlogIdentifier.slice(0, -1)
      }
      if (formatBlogIdentifier.startsWith('-')) {
        formatBlogIdentifier = formatBlogIdentifier.slice(1)
      }
      if (!formatBlogIdentifier) {
        throw new Error('Please insert a valid blog id')
      }
      const identifier = `q-blog-${formatBlogIdentifier}`
      const doesExitst = await verifyIfBlogIdExtists(name, identifier)
      if (doesExitst) {
        throw new Error('The blog identifier already exists')
      }

      const formattedTags: { [key: string]: string } = {}
      tags.forEach((tag: string, i: number) => {
        formattedTags[`tag${i + 1}`] = tag
      })

      const blogobj = {
        title,
        description,
        blogImage: '',
        createdAt: Date.now()
      }
      const blogPostToBase64 = objectToBase64(blogobj)
      try {
        const resourceResponse = await qortalRequest({
          action: 'PUBLISH_QDN_RESOURCE',
          name: name,
          service: 'BLOG',
          data64: blogPostToBase64,
          title,
          description,
          category,
          identifier: identifier,
          ...formattedTags
        })
        // navigate(`/${user.name}/${identifier}`)
        await new Promise<void>((res, rej) => {
          setTimeout(() => {
            res()
          }, 1000)
        })

        const blogfullObj = {
          ...blogobj,
          blogId: identifier,
          category,
          tags
        }

        dispatch(setCurrentBlog(blogfullObj))
        // getBlog(name)
        dispatch(
          setNotification({
            msg: 'Blog successfully created',
            alertType: 'success'
          })
        )
      } catch (error: any) {
        let notificationObj: any = null
        if (typeof error === 'string') {
          notificationObj = {
            msg: error || 'Failed to publish blog',
            alertType: 'error'
          }
        } else if (typeof error?.error === 'string') {
          notificationObj = {
            msg: error?.error || 'Failed to publish blog',
            alertType: 'error'
          }
        } else {
          notificationObj = {
            msg: error?.message || 'Failed to publish blog',
            alertType: 'error'
          }
        }
        if (!notificationObj) return
        dispatch(setNotification(notificationObj))
        if (error instanceof Error) {
          throw new Error(error.message)
        } else {
          throw new Error('An unknown error occurred')
        }
      }
    },
    [user]
  )

  const editBlog = React.useCallback(
    async (
      title: string,
      description: string,
      category: string,
      tags: string[]
    ) => {
      if (!user || !user.name)
        throw new Error('Cannot update: your Qortal name is not accessible')

      if (!currentBlog)
        throw new Error('Your blog is not available. Refresh and try again.')
      if (!title) throw new Error('A title is required')
      if (!description) throw new Error('A description is required')
      const name = user.name
      const formattedTags: { [key: string]: string } = {}
      tags.forEach((tag: string, i: number) => {
        formattedTags[`tag${i + 1}`] = tag
      })

      const blogobj = {
        ...currentBlog,
        title,
        description
      }
      const blogPostToBase64 = objectToBase64(blogobj)
      try {
        const resourceResponse = await qortalRequest({
          action: 'PUBLISH_QDN_RESOURCE',
          name: name,
          service: 'BLOG',
          data64: blogPostToBase64,
          title,
          description,
          category,
          ...formattedTags,
          identifier: currentBlog.blogId
        })

        await new Promise<void>((res, rej) => {
          setTimeout(() => {
            res()
          }, 1000)
        })
        const blogfullObj = {
          ...blogobj,
          tags,
          category
        }
        // blogobj.tags = tags
        // blogobj.category = category
        // getBlog(name)
        dispatch(setCurrentBlog(blogfullObj))
        dispatch(
          setNotification({
            msg: 'Blog successfully updated',
            alertType: 'success'
          })
        )
      } catch (error: any) {
        let notificationObj: any = null
        if (typeof error === 'string') {
          notificationObj = {
            msg: error || 'Failed to update blog',
            alertType: 'error'
          }
        } else if (typeof error?.error === 'string') {
          notificationObj = {
            msg: error?.error || 'Failed to update blog',
            alertType: 'error'
          }
        } else {
          notificationObj = {
            msg: error?.message || 'Failed to update blog',
            alertType: 'error'
          }
        }
        if (!notificationObj) return
        dispatch(setNotification(notificationObj))
        if (error instanceof Error) {
          throw new Error(error.message)
        } else {
          throw new Error('An unknown error occurred')
        }
      }
    },
    [user, currentBlog]
  )

  React.useEffect(() => {
    askForAccountInformation()
  }, [])

  const onClosePublishBlogModal = React.useCallback(() => {
    dispatch(togglePublishBlogModal(false))
  }, [])
  const onCloseEditBlogModal = React.useCallback(() => {
    dispatch(toggleEditBlogModal(false))
  }, [])

  const getFavorites = useCallback(async () => {
    try {
      const allItems: any[] = []

      if (!favoritesLocalRef?.current) {
        return
      }

      favoritesLocalRef?.current
        .iterate(function (value: any, key: string) {
          // Handle each key-value pair here

          allItems.push({ id: key, ...(value || {}) })
        })
        .then(function () {
          dispatch(addFavorites(allItems))
        })
        .catch(function (error: any) {
          // Handle any errors here
        })
    } catch (error) {}
  }, [user?.name])

  const checkNotifications = useCallback(async (username: string) => {
    try {
      let notificationComments: Item[] =
        (await notification.getItem('comments')) || []
      notificationComments = notificationComments
        .filter((nc) => nc.postId && nc.postName && nc.lastSeen)
        .sort((a, b) => b.lastSeen - a.lastSeen)

      let listOfNotifications = []
      for (const comment of notificationComments) {
        const response: any[] = await qortalRequest({
          action: 'SEARCH_QDN_RESOURCES',
          service: 'BLOG_COMMENT',
          query: `_reply_${comment.id.slice(-6)}`,
          exactMatchNames: true,
          excludeBlocked: true,
          limit: 1,
          offset: 0,
          reverse: true,
          mode: 'ALL'
        })
        if (response.length === 0) return

        if (
          response[0].created > comment.lastSeen &&
          response[0].name !== username
        ) {
          const string = response[0].identifier
          const startIndex = string.indexOf('blog_') + 5
          const result = string.substr(startIndex, 12)
          listOfNotifications.push({
            ...response[0],
            partialPostId: result,
            postId: comment.postId,
            postName: comment.postName
          })
        }
      }
      dispatch(setNotifications(listOfNotifications))
    } catch (error) {
      console.log({ error })
    }
  }, [])

  const checkNotificationCreatorComment = useCallback(
    async (username: string) => {
      try {
        const currentDate = Date.now()
        const threeDaysAgo = currentDate - 259200000
        const response: any[] = await qortalRequest({
          action: 'SEARCH_QDN_RESOURCES',
          service: 'BLOG_POST',
          name: username,
          exactMatchNames: true,
          limit: 5,
          offset: 0,
          reverse: true,
          mode: 'ALL'
        })
        const filterPosts = response.filter(
          (post) => post.created > threeDaysAgo
        )
        let comments = []
        for (const post of filterPosts) {
          const response: any[] = await qortalRequest({
            action: 'SEARCH_QDN_RESOURCES',
            service: 'BLOG_COMMENT',
            query: `qcomment_v1_qblog_${post.identifier.slice(-12)}`,
            exactMatchNames: true,
            excludeBlocked: true,
            limit: 1,
            offset: 0,
            reverse: true,
            mode: 'ALL'
          })
          if (response.length > 0 && response[0].name !== username) {
            comments.push({
              ...response[0],
              postName: post.name,
              postId: post.identifier
            })
          }
        }
        let listOfNotifications = []
        let notificationComments: any =
          (await notification.getItem('post-comments')) || {}
        for (const comment of comments) {
          const savedReference = notificationComments[comment.postId]
          if (savedReference) {
            if (savedReference.lastSeen < comment.created) {
              listOfNotifications.push(comment)
            }
          } else {
            listOfNotifications.push(comment)
            notificationComments[comment.postId] = {
              lastSeen: 0,
              postName: comment?.postName,
              id: comment?.identifier,
              postId: comment?.postId
            }
          }
        }

        dispatch(setNotificationCreatorComment(listOfNotifications))
        await notification.setItem('post-comments', notificationComments)
      } catch (error) {
        console.log({ error })
      }
    },
    []
  )

  const checkNotificationsFunc = useCallback(
    (username: string) => {
      let isCalling = false
      interval.current = setInterval(async () => {
        if (isCalling) return
        isCalling = true
        const res = await checkNotifications(username)
        isCalling = false
      }, 20000)
    },
    [checkNotifications]
  )

  const checkNotificationCreatorCommentFunc = useCallback(
    (username: string) => {
      let isCalling = false
      interval.current = setInterval(async () => {
        if (isCalling) return
        isCalling = true
        const res = await checkNotificationCreatorComment(username)
        isCalling = false
      }, 20000)
    },
    [checkNotifications]
  )
  useEffect(() => {
    if (!user?.name) return
    checkNotificationsFunc(user.name)

    // creator of posts comments coming in
    checkNotificationCreatorCommentFunc(user.name)

    return () => {
      if (interval?.current) {
        clearInterval(interval.current)
      }
    }
  }, [checkNotificationsFunc, user])

  return (
    <>
      {isLoadingGlobal && <PageLoader />}

      {isOpenPublishBlogModal && user?.name && (
        <PublishBlogModal
          open={isOpenPublishBlogModal}
          onClose={onClosePublishBlogModal}
          onPublish={createBlog}
          username={user?.name || ''}
        />
      )}

      <EditBlogModal
        open={isOpenEditBlogModal}
        onClose={onCloseEditBlogModal}
        onPublish={editBlog}
        currentBlog={currentBlog}
      />
      <NavBar
        isAuthenticated={!!user}
        hasBlog={!!currentBlog}
        userName={user?.name || ''}
        userAvatar={userAvatar}
        blog={currentBlog}
        authenticate={askForAccountInformation}
        hasAttemptedToFetchBlogInitial={hasAttemptedToFetchBlogInitial}
      />
      <ConsentModal />
      {children}

      {audios && audios.length > 0 && (
        <AudioPlayer currAudio={currAudio} playlist={audios} />
      )}
    </>
  )
}

export default GlobalWrapper
