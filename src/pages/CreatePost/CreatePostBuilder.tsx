import React, { useCallback, useEffect } from 'react'

import BlogEditor from '../../components/editor/BlogEditor'
import ShortUniqueId from 'short-unique-id'
import ReadOnlySlate from '../../components/editor/ReadOnlySlate'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import TextField from '@mui/material/TextField'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import ImageUploader from '../../components/common/ImageUploader'
import AudiotrackIcon from '@mui/icons-material/Audiotrack'
import DeleteIcon from '@mui/icons-material/Delete'
import { Button, Box, useTheme } from '@mui/material'
import { styled } from '@mui/system'
import { Descendant } from 'slate'
import EditIcon from '@mui/icons-material/Edit'
import { extractTextFromSlate } from '../../utils/extractTextFromSlate'
import { setNotification } from '../../state/features/notificationsSlice'
import { VideoPanel } from '../../components/common/VideoPanel'
import PostPublishModal from '../../components/common/PostPublishModal'
import DynamicHeightItem from '../../components/DynamicHeightItem'
import { Responsive, WidthProvider } from 'react-grid-layout'
import '/node_modules/react-grid-layout/css/styles.css'
import '/node_modules/react-resizable/css/styles.css'
import { ReusableModal } from '../../components/modals/ReusableModal'
import { VideoPlayer } from '../../components/common/VideoPlayer'
import { EditorToolbar } from './components/Toolbar/EditorToolbar'
import { Navbar } from './components/Navbar/NavbarBuilder'
import { UserNavbar } from '../../components/common/UserNavbar/UserNavbar'
import { setCurrentBlog } from '../../state/features/globalSlice'
import AudioElement from '../../components/AudioElement'
import { AudioPanel } from '../../components/common/AudioPanel'
import {
  addPostToBeginning,
  addToHashMap,
  updateInHashMap,
  updatePost
} from '../../state/features/blogSlice'
import { removePrefix } from '../../utils/blogIdformats'
import { useNavigate } from 'react-router-dom'
import { BuilderButton } from './CreatePost-styles'
import FileElement from '../../components/FileElement'
const ResponsiveGridLayout = WidthProvider(Responsive)
const initialMinHeight = 2 // Define an initial minimum height for grid items
const uid = new ShortUniqueId()
const md = [
  { i: 'a', x: 0, y: 0, w: 4, h: initialMinHeight },
  { i: 'b', x: 6, y: 0, w: 4, h: initialMinHeight }
]
const sm = [
  { i: 'a', x: 0, y: 0, w: 6, h: initialMinHeight },
  { i: 'b', x: 6, y: 0, w: 6, h: initialMinHeight }
]
const xs = [
  { i: 'a', x: 0, y: 0, w: 6, h: initialMinHeight },
  { i: 'b', x: 6, y: 0, w: 6, h: initialMinHeight }
]
const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }]
  }
]

const BlogTitleInput = styled(TextField)(({ theme }) => ({
  marginBottom: '15px',
  '& .MuiInputBase-input': {
    fontSize: '28px',
    height: '28px',
    background: 'transparent',
    '&::placeholder': {
      fontSize: '28px',
      color: theme.palette.text.primary
    }
  },
  '& .MuiInputLabel-root': {
    fontSize: '28px'
  },
  '& .MuiInputBase-root': {
    background: 'transparent',
    '&:hover': {
      background: 'transparent'
    },
    '&.Mui-focused': {
      background: 'transparent'
    }
  },
  '& .MuiOutlinedInput-root': {
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.primary.main
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.primary.main
    }
  }
}))
interface CreatePostBuilderProps {
  blogContentForEdit?: any
  postIdForEdit?: string
  blogMetadataForEdit?: any
  switchType?: () => void
}

export const CreatePostBuilder = ({
  blogContentForEdit,
  postIdForEdit,
  blogMetadataForEdit,
  switchType
}: CreatePostBuilderProps) => {
  const navigate = useNavigate()

  const theme = useTheme()
  const { user } = useSelector((state: RootState) => state.auth)
  const { currentBlog } = useSelector((state: RootState) => state.global)
  const [editingSection, setEditingSection] = React.useState<any>(null)
  const [layouts, setLayouts] = React.useState<any>({ md, sm, xs })
  const [currentBreakpoint, setCurrentBreakpoint] = React.useState<any>()
  const handleLayoutChange = (layout: any, layoutss: any) => {
    setLayouts(layoutss)
  }
  const [newPostContent, setNewPostContent] = React.useState<any[]>([])
  const [title, setTitle] = React.useState<string>('')
  const [isOpenPostModal, setIsOpenPostModal] = React.useState<boolean>(false)
  const [isOpenEditTextModal, setIsOpenEditTextModal] =
    React.useState<boolean>(false)
  const [value, setValue] = React.useState(initialValue)
  const [editorKey, setEditorKey] = React.useState(1)
  const [count, setCount] = React.useState<number>(1)
  const [isOpenAddTextModal, setIsOpenAddTextModal] =
    React.useState<boolean>(false)
  const [paddingValue, onChangePadding] = React.useState(5)
  const [isEditNavOpen, setIsEditNavOpen] = React.useState<boolean>(false)
  const dispatch = useDispatch()
  const [navbarConfig, setNavbarConfig] = React.useState<any>(null)
  const addPostSection = React.useCallback((content: any) => {
    const section = {
      type: 'editor',
      version: 1,
      content,
      id: uid()
    }

    setNewPostContent((prev) => [...prev, section])
    setEditorKey((prev) => prev + 1)
  }, [])

  async function getBlog(name: string, identifier: string, blog: any) {
    const urlBlog = `/arbitrary/BLOG/${name}/${identifier}`
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
  }

  useEffect(() => {
    if (blogContentForEdit && postIdForEdit && blogMetadataForEdit) {
      setTitle(blogContentForEdit?.title || '')
      setLayouts(
        blogContentForEdit?.layouts || {
          rows: []
        }
      )
      setNewPostContent(blogContentForEdit?.postContent || [])
      onChangePadding(blogContentForEdit?.layoutGeneralSettings?.padding || 5)
    }
  }, [blogContentForEdit, postIdForEdit, blogMetadataForEdit])

  const editBlog = React.useCallback(
    async (navbarConfig: any) => {
      if (!user || !user.name)
        throw new Error('Cannot update: your Qortal name is not accessible')

      if (!currentBlog)
        throw new Error('Your blog is not available. Refresh and try again.')

      const name = user.name
      const formattedTags: { [key: string]: string } = {}
      const tags = currentBlog?.tags || []
      const category = currentBlog?.category || ''
      const title = currentBlog?.title || ''
      const description = currentBlog?.description || ''
      tags.forEach((tag: string, i: number) => {
        formattedTags[`tag${i + 1}`] = tag
      })

      const blogProps: any = {
        ...currentBlog,
        navbarConfig
      }

      const blogPostToBase64 = await objectToBase64(blogProps)
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

        // getBlog(name, currentBlog.blogId, currentBlog)
        dispatch(setCurrentBlog(blogProps))
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
            msg: error || 'Failed to save blog',
            alertType: 'error'
          }
        } else if (typeof error?.error === 'string') {
          notificationObj = {
            msg: error?.error || 'Failed to save blog',
            alertType: 'error'
          }
        } else {
          notificationObj = {
            msg: error?.message || 'Failed to save blog',
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

  const handleSaveNavBar = useCallback(
    async (navMenu: any, navbarConfig: any) => {
      try {
        const config = {
          type: 'topNav',
          title: '',
          logo: '',
          ...navbarConfig,
          navItems: navMenu
        }
        await editBlog(config)
        setIsEditNavOpen(false)
        setNavbarConfig(config)
      } catch (error: any) {
        dispatch(
          setNotification({
            msg: error?.message || 'Could not save the navbar',
            alertType: 'error'
          })
        )
      }
    },
    []
  )

  const handleRemoveNavBar = useCallback(async () => {
    try {
      await editBlog(null)
      setNavbarConfig(null)
      setIsEditNavOpen(false)
    } catch (error: any) {
      dispatch(
        setNotification({
          msg: error?.message || 'Could not save the navbar',
          alertType: 'error'
        })
      )
    }
  }, [])

  function objectToBase64(obj: any) {
    // Step 1: Convert the object to a JSON string
    const jsonString = JSON.stringify(obj)

    // Step 2: Create a Blob from the JSON string
    const blob = new Blob([jsonString], { type: 'application/json' })

    // Step 3: Create a FileReader to read the Blob as a base64-encoded string
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Remove 'data:application/json;base64,' prefix
          const base64 = reader.result.replace(
            'data:application/json;base64,',
            ''
          )
          resolve(base64)
        } else {
          reject(
            new Error('Failed to read the Blob as a base64-encoded string')
          )
        }
      }
      reader.onerror = () => {
        reject(reader.error)
      }
      reader.readAsDataURL(blob)
    })
  }

  const description = React.useMemo(() => {
    let description = ''
    const findText = newPostContent.find((data) => data?.type === 'editor')
    if (findText && findText.content) {
      description = extractTextFromSlate(findText?.content)
      description = description.slice(0, 180)
    }
    return description
  }, [newPostContent])
  const post = React.useMemo(() => {
    return {
      description,
      title
    }
  }, [title, description])

  async function publishQDNResource(params: any) {
    let address
    let name
    let errorMsg = ''

    address = user?.address
    name = user?.name || ''

    const missingFields = []
    if (!address) {
      errorMsg = "Cannot post: your address isn't available"
    }
    if (!name) {
      errorMsg = 'Cannot post without a name'
    }
    if (!title) missingFields.push('title')
    if (missingFields.length > 0) {
      const missingFieldsString = missingFields.join(', ')
      const errMsg = `Missing: ${missingFieldsString}`
      errorMsg = errMsg
    }
    if (newPostContent.length === 0) {
      errorMsg = 'Your post has no content'
    }

    if (!currentBlog) {
      errorMsg = 'Cannot publish without first creating a blog.'
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

    const layoutGeneralSettings = {
      padding: paddingValue ?? 0,
      blogPostType: 'builder'
    }

    const postObject = {
      title,
      createdAt: Date.now(),
      postContent: newPostContent,
      layouts,
      layoutGeneralSettings
    }
    try {
      if (!currentBlog) return
      const id = uid()
      let createTitleId = title
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      if (createTitleId.toLowerCase().includes('post')) {
        createTitleId = createTitleId.replace(/post/gi, '')
      }
      if (createTitleId.toLowerCase().includes('q-blog')) {
        createTitleId = createTitleId.replace(/q-blog/gi, '')
      }

      if (createTitleId.endsWith('-')) {
        createTitleId = createTitleId.slice(0, -1)
      }
      if (createTitleId.startsWith('-')) {
        createTitleId = createTitleId.slice(1)
      }
      createTitleId = createTitleId.slice(0, 24)
      const identifier = `${currentBlog.blogId}-post-${createTitleId}-${id}`
      const blogPostToBase64 = await objectToBase64(postObject)
      let description = ''
      const findText = newPostContent.find((data) => data?.type === 'editor')
      if (findText && findText.content) {
        description = extractTextFromSlate(findText?.content)
        description = description.slice(0, 180)
      }

      let requestBody: any = {
        action: 'PUBLISH_QDN_RESOURCE',
        name: name,
        service: 'BLOG_POST',
        data64: blogPostToBase64,
        title: title,
        description: params?.description || description,
        category: params?.category || '',
        identifier: identifier
      }

      const formattedTags: { [key: string]: string } = {}
      let tag4 = ''
      let tag5 = ''
      if (params?.tags) {
        params.tags.slice(0, 3).forEach((tag: string, i: number) => {
          formattedTags[`tag${i + 1}`] = tag
        })
      }

      const findVideo: any = postObject?.postContent?.find(
        (data: any) => data?.type === 'video'
      )
      const findAudio: any = postObject?.postContent?.find(
        (data: any) => data?.type === 'audio'
      )
      const findImage: any = postObject?.postContent?.find(
        (data: any) => data?.type === 'image'
      )

      const tag5Array = ['t']
      if (findVideo) tag5Array.push('v')
      if (findAudio) tag5Array.push('a')
      if (findImage) {
        tag5Array.push('i')
        const imageElement = document.querySelector(
          `[id="${findImage.id}"] img`
        ) as HTMLImageElement | null
        if (imageElement) {
          tag4 = `v1.${imageElement?.width}x${imageElement?.height}`
        } else {
          tag4 = 'v1.0x0'
        }
      }
      if (!findImage) {
        tag4 = 'v1.0x0'
      }
      tag5 = tag5Array.join(', ')
      requestBody = {
        ...requestBody,
        ...formattedTags,
        tag4: tag4,
        tag5: tag5
      }

      const resourceResponse = await qortalRequest(requestBody)

      const postobj: any = {
        ...postObject,
        title: title,
        description: params?.description || description,
        category: params?.category || '',
        tags: [...(params?.tags || []), tag4, tag5],
        id: identifier,
        user: name,
        postImage: findImage ? findImage?.content?.image : ''
      }

      const withoutImage = { ...postobj }
      delete withoutImage.postImage
      dispatch(addPostToBeginning(withoutImage))
      dispatch(addToHashMap(postobj))
      dispatch(
        setNotification({
          msg: 'Blog post successfully published',
          alertType: 'success'
        })
      )
      const str = identifier
      const arr = str.split('-post-')
      const str1 = arr[0]
      const str2 = arr[1]
      const blogId = removePrefix(str1)
      navigate(`/${name}/${blogId}/${str2}`)
    } catch (error: any) {
      let notificationObj = null
      if (typeof error === 'string') {
        notificationObj = {
          msg: error || 'Failed to publish post',
          alertType: 'error'
        }
      } else if (typeof error?.error === 'string') {
        notificationObj = {
          msg: error?.error || 'Failed to publish post',
          alertType: 'error'
        }
      } else {
        notificationObj = {
          msg: error?.message || 'Failed to publish post',
          alertType: 'error'
        }
      }
      if (!notificationObj) return
      dispatch(setNotification(notificationObj))

      throw new Error('Failed to publish post')
    }
  }

  async function updateQDNResource(params: any) {
    if (!blogContentForEdit || !postIdForEdit || !blogMetadataForEdit) return
    let address
    let name
    let errorMsg = ''

    address = user?.address
    name = user?.name || ''

    const missingFields = []
    if (!address) {
      errorMsg = "Cannot post: your address isn't available"
    }
    if (!name) {
      errorMsg = 'Cannot post without a name'
    }
    if (!title) missingFields.push('title')
    if (missingFields.length > 0) {
      const missingFieldsString = missingFields.join(', ')
      const errMsg = `Missing: ${missingFieldsString}`
      errorMsg = errMsg
    }
    if (newPostContent.length === 0) {
      errorMsg = 'Your post has no content'
    }

    if (!currentBlog) {
      errorMsg = 'Cannot publish without first creating a blog.'
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

    const layoutGeneralSettings = {
      padding: paddingValue ?? 0,
      blogPostType: 'builder'
    }

    const postObject = {
      ...blogContentForEdit,
      title,
      postContent: newPostContent,
      layouts,
      layoutGeneralSettings
    }
    try {
      if (!currentBlog) return

      const identifier = postIdForEdit
      const blogPostToBase64 = await objectToBase64(postObject)
      let description = ''
      const findText = newPostContent.find((data) => data?.type === 'editor')
      if (findText && findText.content) {
        description = extractTextFromSlate(findText?.content)
        description = description.slice(0, 180)
      }

      let requestBody: any = {
        action: 'PUBLISH_QDN_RESOURCE',
        name: name,
        service: 'BLOG_POST',
        data64: blogPostToBase64,
        title: title,
        description: params?.description || description,
        category: params?.category || '',
        identifier: identifier
      }

      const formattedTags: { [key: string]: string } = {}
      let tag4 = ''
      let tag5 = ''
      if (params?.tags) {
        params.tags.slice(0, 3).forEach((tag: string, i: number) => {
          formattedTags[`tag${i + 1}`] = tag
        })
      }

      const findVideo: any = postObject?.postContent?.find(
        (data: any) => data?.type === 'video'
      )
      const findAudio: any = postObject?.postContent?.find(
        (data: any) => data?.type === 'audio'
      )
      const findImage: any = postObject?.postContent?.find(
        (data: any) => data?.type === 'image'
      )

      const tag5Array = ['t']
      if (findVideo) tag5Array.push('v')
      if (findAudio) tag5Array.push('a')
      if (findImage) {
        tag5Array.push('i')
        const imageElement = document.querySelector(
          `[id="${findImage.id}"] img`
        ) as HTMLImageElement | null
        if (imageElement) {
          tag4 = `v1.${imageElement?.width}x${imageElement?.height}`
        } else {
          tag4 = 'v1.0x0'
        }
      }
      if (!findImage) {
        tag4 = 'v1.0x0'
      }
      tag5 = tag5Array.join(', ')
      requestBody = {
        ...requestBody,
        ...formattedTags,
        tag4: tag4,
        tag5: tag5
      }

      const resourceResponse = await qortalRequest(requestBody)
      const postobj = {
        ...postObject,
        title: title,
        description: params?.description || description,
        category: params?.category || '',
        tags: [...(params?.tags || []), tag4, tag5],
        id: identifier,
        user: name
      }
      const withoutImage = { ...postobj }
      delete withoutImage.postImage
      dispatch(updatePost(withoutImage))
      dispatch(updateInHashMap(postobj))
      dispatch(
        setNotification({
          msg: 'Blog post successfully updated',
          alertType: 'success'
        })
      )
    } catch (error: any) {
      let notificationObj = null
      if (typeof error === 'string') {
        notificationObj = {
          msg: error || 'Failed to update post',
          alertType: 'error'
        }
      } else if (typeof error?.error === 'string') {
        notificationObj = {
          msg: error?.error || 'Failed to update post',
          alertType: 'error'
        }
      } else {
        notificationObj = {
          msg: error?.message || 'Failed to update post',
          alertType: 'error'
        }
      }
      if (!notificationObj) return
      dispatch(setNotification(notificationObj))

      throw new Error('Failed to update post')
    }
  }
  const addImage = (base64: string) => {
    const section = {
      type: 'image',
      version: 1,
      content: {
        image: base64,
        caption: ''
      },
      id: uid()
    }
    setNewPostContent((prev) => [...prev, section])
  }

  interface IaddVideo {
    name: string
    identifier: string
    service: string
    title: string
    description: string
    mimeType?: string
  }

  const addVideo = ({
    name,
    identifier,
    service,
    title,
    description
  }: IaddVideo) => {
    const section = {
      type: 'video',
      version: 1,
      content: {
        name: name,
        identifier: identifier,
        service: service,
        title,
        description
      },
      id: uid()
    }
    setNewPostContent((prev) => [...prev, section])
  }

  const addAudio = ({
    name,
    identifier,
    service,
    title,
    description
  }: IaddVideo) => {
    const section = {
      type: 'audio',
      version: 1,
      content: {
        name: name,
        identifier: identifier,
        service: service,
        title,
        description
      },
      id: uid()
    }
    setNewPostContent((prev) => [...prev, section])
  }

  const addFile = ({
    name,
    identifier,
    service,
    title,
    description,
    mimeType
  }: IaddVideo) => {
    const id = uid()
    const type = 'file'
    const section = {
      type,
      version: 1,
      content: {
        name: name,
        identifier: identifier,
        service: service,
        title,
        description,
        mimeType
      },
      id
    }
    setNewPostContent((prev) => [...prev, section])
  }

  const addSection = () => {
    addPostSection(value)
    setValue(initialValue)
  }

  const removeSection = (section: any) => {
    const newContent = newPostContent.filter((s) => s.id !== section.id)
    setNewPostContent(newContent)
  }
  const editImage = (base64: string, section: any) => {
    const newSection = {
      ...section,
      content: {
        image: base64,
        caption: section.content.caption
      }
    }
    const findSectionIndex = newPostContent.findIndex(
      (s) => s.id === section.id
    )
    if (findSectionIndex !== -1) {
      const copyNewPostContent = [...newPostContent]
      copyNewPostContent[findSectionIndex] = newSection

      setNewPostContent(copyNewPostContent)
    }
  }
  const editVideo = (
    { name, identifier, service, description, title }: IaddVideo,
    section: any
  ) => {
    const newSection = {
      ...section,
      content: {
        name: name,
        identifier: identifier,
        service: service,
        description,
        title
      }
    }
    const findSectionIndex = newPostContent.findIndex(
      (s) => s.id === section.id
    )
    if (findSectionIndex !== -1) {
      const copyNewPostContent = [...newPostContent]
      copyNewPostContent[findSectionIndex] = newSection

      setNewPostContent(copyNewPostContent)
    }
  }
  const editAudio = (
    { name, identifier, service, description, title }: IaddVideo,
    section: any
  ) => {
    const newSection = {
      ...section,
      content: {
        name: name,
        identifier: identifier,
        service: service,
        description,
        title
      }
    }
    const findSectionIndex = newPostContent.findIndex(
      (s) => s.id === section.id
    )
    if (findSectionIndex !== -1) {
      const copyNewPostContent = [...newPostContent]
      copyNewPostContent[findSectionIndex] = newSection

      setNewPostContent(copyNewPostContent)
    }
  }
  const editSection = (section: any) => {
    setIsOpenEditTextModal(true)
    setEditingSection(section)
    setValue(section.content)
  }
  const editPostSection = React.useCallback(
    (content: any, section: any) => {
      const findSectionIndex = newPostContent.findIndex(
        (s) => s.id === section.id
      )
      if (findSectionIndex !== -1) {
        const copyNewPostContent = [...newPostContent]
        copyNewPostContent[findSectionIndex] = {
          ...section,
          content
        }

        setNewPostContent(copyNewPostContent)
      }

      setEditingSection(null)
      setIsOpenEditTextModal(false)
    },
    [newPostContent]
  )

  const onSelectVideo = React.useCallback((video: any) => {
    addVideo({
      name: video.name,
      identifier: video.identifier,
      service: video.service,
      title: video?.metadata?.title,
      description: video?.metadata?.description
    })
  }, [])

  const onSelectAudio = React.useCallback((video: any) => {
    addAudio({
      name: video.name,
      identifier: video.identifier,
      service: video.service,
      title: video?.metadata?.title,
      description: video?.metadata?.description
    })
  }, [])

  const onBreakpointChange = (newBreakpoint: any) => {
    setCurrentBreakpoint(newBreakpoint)
  }

  const onSelectFile = React.useCallback((video: any) => {
    addFile({
      name: video.name,
      identifier: video.identifier,
      service: video.service,
      title: video?.metadata?.title,
      description: video?.metadata?.description,
      mimeType: video?.metadata?.mimeType
    })
  }, [])

  const closeAddTextModal = React.useCallback(() => {
    setIsOpenAddTextModal(false)
  }, [])

  const closeEditTextModal = React.useCallback(() => {
    setIsOpenEditTextModal(false)
    setEditingSection(null)
  }, [])

  const onResizeStop = (layout: any, layoutItem: any) => {
    setCount((prev) => prev + 1)
  }
  const handleResize = () => {
    setCount((prev) => prev + 1)
  }

  React.useEffect(() => {
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const gridItemCount =
    currentBreakpoint === 'md' ? 4 : currentBreakpoint === 'sm' ? 3 : 1

  const addNav = () => {
    setIsEditNavOpen(true)
  }
  return (
    <>
      <EditorToolbar
        setIsOpenAddTextModal={setIsOpenAddTextModal}
        addImage={addImage}
        onSelectVideo={onSelectVideo}
        onSelectAudio={onSelectAudio}
        onSelectFile={onSelectFile}
        paddingValue={paddingValue}
        onChangePadding={onChangePadding}
        addNav={addNav}
        switchType={switchType}
      />
      {/* {navbarConfig && Array.isArray(navbarConfig?.navItems) && (
        <UserNavbar
          title="Test"
          menuItems={navbarConfig?.navItems || []}
          name=""
          blogId=""
        />
      )} */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column',
          padding: '10px'
        }}
      >
        <BlogTitleInput
          id="modal-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          placeholder="Title"
          variant="filled"
          multiline
          maxRows={2}
          InputLabelProps={{ shrink: false }}
          sx={{ maxWidth: '700px' }}
        />
        <Box
          sx={{
            maxWidth: '1400px',
            width: '95%',
            position: 'relative'
          }}
        >
          <div
            className="test-grid"
            style={{
              gridTemplateColumns: `repeat(${gridItemCount}, 1fr)`
            }}
          >
            {Array.from({ length: gridItemCount }, (_, i) => (
              <div key={`grid-item-${i}`} className="test-grid-item"></div>
            ))}
          </div>
          <ResponsiveGridLayout
            layouts={layouts}
            breakpoints={{ md: 996, sm: 768, xs: 480 }}
            cols={{ md: 4, sm: 3, xs: 1 }}
            onLayoutChange={handleLayoutChange}
            measureBeforeMount={false}
            autoSize={true}
            compactType={null}
            isBounded={false}
            resizeHandles={['se', 'sw', 'ne', 'nw']}
            rowHeight={25}
            onBreakpointChange={onBreakpointChange}
            onResizeStop={onResizeStop}
            margin={[0, 0]}
            preventCollision={true}
          >
            {newPostContent.map((section: any) => {
              if (section.type === 'editor') {
                return (
                  <div key={section.id} className="grid-item">
                    <DynamicHeightItem
                      layouts={layouts}
                      setLayouts={setLayouts}
                      i={section.id}
                      breakpoint={currentBreakpoint}
                      count={count}
                      padding={paddingValue}
                    >
                      {editingSection &&
                      editingSection.id === section.id ? null : (
                        <Box
                          sx={{
                            position: 'relative',
                            width: '100%',
                            height: 'auto'
                          }}
                        >
                          <ReadOnlySlate
                            key={section.id}
                            content={section.content}
                          />
                          <EditButtons>
                            <DeleteIcon
                              onClick={() => removeSection(section)}
                              sx={{
                                cursor: 'pointer',
                                height: '18px',
                                width: 'auto'
                              }}
                            />
                            <EditIcon
                              onClick={() => editSection(section)}
                              sx={{
                                cursor: 'pointer',
                                height: '18px',
                                width: 'auto'
                              }}
                            />
                          </EditButtons>
                        </Box>
                      )}
                    </DynamicHeightItem>
                  </div>
                )
              }
              if (section.type === 'image') {
                return (
                  <div id={section.id} key={section.id} className="grid-item">
                    <DynamicHeightItem
                      layouts={layouts}
                      setLayouts={setLayouts}
                      i={section.id}
                      breakpoint={currentBreakpoint}
                      count={count}
                      type="image"
                      padding={paddingValue}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          height: '100%'
                        }}
                      >
                        <img
                          src={section.content.image}
                          className="post-image"
                        />
                        <EditButtons>
                          <DeleteIcon
                            onClick={() => removeSection(section)}
                            sx={{
                              cursor: 'pointer',
                              height: '18px',
                              width: 'auto'
                            }}
                          />
                          <ImageUploader
                            onPick={(base64) => editImage(base64, section)}
                          >
                            <EditIcon
                              sx={{
                                cursor: 'pointer',
                                height: '18px',
                                width: 'auto'
                              }}
                            />
                          </ImageUploader>
                        </EditButtons>
                      </Box>
                    </DynamicHeightItem>
                  </div>
                )
              }

              if (section.type === 'video') {
                return (
                  <div key={section.id} className="grid-item">
                    <DynamicHeightItem
                      layouts={layouts}
                      setLayouts={setLayouts}
                      i={section.id}
                      breakpoint={currentBreakpoint}
                      count={count}
                      padding={paddingValue}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          height: '100%'
                        }}
                      >
                        <VideoPlayer
                          name={section.content.name}
                          service={section.content.service}
                          identifier={section.content.identifier}
                          from="create"
                        />
                        <EditButtons>
                          <DeleteIcon
                            onClick={() => removeSection(section)}
                            sx={{
                              cursor: 'pointer',
                              height: '18px',
                              width: 'auto'
                            }}
                          />
                          <VideoPanel
                            width="auto"
                            height="18px"
                            onSelect={(video) =>
                              editVideo(
                                {
                                  name: video.name,
                                  identifier: video.identifier,
                                  service: video.service,
                                  title: video?.metadata?.title,
                                  description: video?.metadata?.description
                                },
                                section
                              )
                            }
                          />
                        </EditButtons>
                      </Box>
                    </DynamicHeightItem>
                  </div>
                )
              }
              if (section.type === 'audio') {
                return (
                  <div key={section.id} className="grid-item">
                    <DynamicHeightItem
                      layouts={layouts}
                      setLayouts={setLayouts}
                      i={section.id}
                      breakpoint={currentBreakpoint}
                      count={count}
                      padding={paddingValue}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          height: '100%'
                        }}
                      >
                        <AudioElement
                          key={section.id}
                          onClick={() => {}}
                          title={section.content?.title}
                          description={section.content?.description}
                          author=""
                        />
                        <EditButtons>
                          <DeleteIcon
                            onClick={() => removeSection(section)}
                            sx={{
                              cursor: 'pointer',
                              height: '18px',
                              width: 'auto'
                            }}
                          />
                          <AudioPanel
                            width="auto"
                            height="18px"
                            onSelect={(audio) =>
                              editAudio(
                                {
                                  name: audio.name,
                                  identifier: audio.identifier,
                                  service: audio.service,
                                  title: audio?.metadata?.title,
                                  description: audio?.metadata?.description
                                },
                                section
                              )
                            }
                          />
                        </EditButtons>
                      </Box>
                    </DynamicHeightItem>
                  </div>
                )
              }
              if (section.type === 'file') {
                return (
                  <div key={section.id} className="grid-item">
                    <DynamicHeightItem
                      layouts={layouts}
                      setLayouts={setLayouts}
                      i={section.id}
                      breakpoint={currentBreakpoint}
                      count={count}
                      padding={paddingValue}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          height: '100%'
                        }}
                      >
                        <FileElement
                          key={section.id}
                          fileInfo={section.content}
                          title={section.content?.title}
                          description={section.content?.description}
                          mimeType={section.content?.mimeType}
                          author=""
                          disable={true}
                        />

                        <EditButtons>
                          <DeleteIcon
                            onClick={() => removeSection(section)}
                            sx={{
                              cursor: 'pointer',
                              height: '18px',
                              width: 'auto'
                            }}
                          />
                        </EditButtons>
                      </Box>
                    </DynamicHeightItem>
                  </div>
                )
              }
            })}
          </ResponsiveGridLayout>

          <Box
            sx={{
              position: 'fixed',
              bottom: '30px',
              right: '30px',
              zIndex: 15,
              background: 'deepskyblue',
              padding: '10px',
              borderRadius: '5px'
            }}
          >
            <Button
              onClick={() => {
                setIsOpenPostModal(true)
              }}
            >
              Publish
            </Button>
          </Box>
        </Box>
        <ReusableModal open={isOpenAddTextModal}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <BlogEditor
              addPostSection={addPostSection}
              value={value}
              setValue={setValue}
              editorKey={editorKey}
            />
          </Box>
          <BuilderButton onClick={addSection}>Add Text</BuilderButton>
          <BuilderButton onClick={closeAddTextModal}>Close</BuilderButton>
        </ReusableModal>
        <ReusableModal open={isOpenEditTextModal}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <BlogEditor
              value={value}
              setValue={setValue}
              editorKey={editorKey}
            />
          </Box>
          <BuilderButton onClick={() => editPostSection(value, editingSection)}>
            Update Text
          </BuilderButton>
          <BuilderButton onClick={closeEditTextModal}>Close</BuilderButton>
        </ReusableModal>
        <ReusableModal open={isEditNavOpen}>
          <Navbar
            saveNav={handleSaveNavBar}
            removeNav={handleRemoveNavBar}
            close={() => setIsEditNavOpen(false)}
          />
        </ReusableModal>

        {!blogContentForEdit && (
          <PostPublishModal
            onClose={() => {
              setIsOpenPostModal(false)
            }}
            open={isOpenPostModal}
            post={post}
            onPublish={publishQDNResource}
          />
        )}

        {blogContentForEdit && blogMetadataForEdit?.metadata && (
          <PostPublishModal
            onClose={() => {
              setIsOpenPostModal(false)
            }}
            open={isOpenPostModal}
            post={post}
            onPublish={updateQDNResource}
            mode="edit"
            metadata={blogMetadataForEdit?.metadata}
          />
        )}
      </Box>
    </>
  )
}

export const EditButtons = ({ children }: any) => {
  const theme = useTheme()
  return (
    <Box
      sx={{
        position: 'absolute',
        right: '5px',
        zIndex: 500,
        top: '5px',
        display: 'flex',
        flexDirection: 'row',
        gap: '8px',
        background: 'white',
        padding: '5px',
        borderRadius: '5px',
        alignItems: 'center',
        backgroundColor: theme.palette.background.paper
      }}
    >
      {children}
    </Box>
  )
}
