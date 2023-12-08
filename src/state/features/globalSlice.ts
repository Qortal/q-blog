import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';


interface GlobalState {
  isOpenPublishBlogModal: boolean
  isLoadingCurrentBlog: boolean
  isLoadingGlobal: boolean
  isOpenEditBlogModal: boolean
  currentBlog: {
    createdAt: number
    blogId: string
    title: string
    description: string
    blogImage: string
    category?: string
    tags?: string[]
    navbarConfig?: any
  } | null
  visitingBlog: {
    createdAt: number
    blogId: string
    title: string
    description: string
    blogImage: string
    category?: string
    tags?: string[]
    navbarConfig?: any
    name?: string
  } | null
  audios: any[] | null
  currAudio: any
  audioPostId: string
  downloads: any
  showingAudioPlayer: boolean
  userAvatarHash: Record<string, string>
  notifications: any[]
  notificationCreatorComment: any[]
}
const initialState: GlobalState = {
  isOpenPublishBlogModal: false,
  isLoadingCurrentBlog: true,
  isLoadingGlobal: false,
  currentBlog: null,
  isOpenEditBlogModal: false,
  visitingBlog: null,
  audios: null,
  currAudio: null,
  audioPostId: '',
  downloads: {},
  showingAudioPlayer: false,
  userAvatarHash: {},
  notifications: [],
  notificationCreatorComment: []
}

export const globalSlice = createSlice({
  name: 'global',
  initialState,
  reducers: {
    togglePublishBlogModal: (state, action) => {
      state.isOpenPublishBlogModal = action.payload
    },
    toggleEditBlogModal: (state, action) => {
      state.isOpenEditBlogModal = action.payload
    },
    setCurrentBlog: (state, action) => {
      state.currentBlog = action.payload
      state.isLoadingCurrentBlog = false
    },
    setShowingAudioPlayer: (state, action) => {
      state.showingAudioPlayer = action.payload
    },
    setVisitingBlog: (state, action) => {
      state.visitingBlog = action.payload
      state.isLoadingCurrentBlog = false
    },
    setAudio: (state, action) => {
      state.audios = action.payload.audios
      state.audioPostId = action.payload.postId
    },

    setCurrAudio: (state, action) => {
      state.currAudio = action.payload
    },
    removeAudio: (state, action) => {
      state.audios = null
      state.currAudio = null
      state.audioPostId = ''
    },
    setIsLoadingGlobal: (state, action) => {
      state.isLoadingGlobal = action.payload
    },
    setAddToDownloads: (state, action) => {
      const download = action.payload
      state.downloads[download.identifier] = download
    },
    updateDownloads: (state, action) => {
      const { identifier } = action.payload
      const download = action.payload
      state.downloads[identifier] = {
        ...state.downloads[identifier],
        ...download
      }
    },
    setUserAvatarHash: (state, action) => {
      const avatar = action.payload
      if (avatar?.name && avatar?.url) {
        state.userAvatarHash[avatar?.name] = avatar?.url
      }
    },
    setNotifications: (state, action) => {
      state.notifications = action.payload
    },
    setNotificationCreatorComment: (state, action) => {
      state.notificationCreatorComment = action.payload
    }
  }
})

export const {
  togglePublishBlogModal,
  setCurrentBlog,
  setIsLoadingGlobal,
  toggleEditBlogModal,
  setVisitingBlog,
  setAudio,
  setCurrAudio,
  removeAudio,
  setAddToDownloads,
  updateDownloads,
  setShowingAudioPlayer,
  setUserAvatarHash,
  setNotifications,
  setNotificationCreatorComment
} = globalSlice.actions

export default globalSlice.reducer;