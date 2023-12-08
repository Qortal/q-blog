import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { addUser } from '../state/features/authSlice'
import ShortUniqueId from 'short-unique-id'
import { RootState } from '../state/store'
import PublishBlogModal from '../components/modals/PublishBlogModal'
import EditBlogModal from '../components/modals/EditBlogModal'

import {
  setAddToDownloads,
  setCurrentBlog,
  setIsLoadingGlobal,
  toggleEditBlogModal,
  togglePublishBlogModal,
  updateDownloads
} from '../state/features/globalSlice'

import { useFetchPosts } from '../hooks/useFetchPosts'
import { setNotification } from '../state/features/notificationsSlice'
import { DownloadTaskManager } from '../components/common/DownloadTaskManager'

interface Props {
  children: React.ReactNode
}

const uid = new ShortUniqueId()

const defaultValues: MyContextInterface = {
  downloadVideo: () => {}
}
interface IDownloadVideoParams {
  name: string
  service: string
  identifier: string
  blogPost: any
}
interface MyContextInterface {
  downloadVideo: ({
    name,
    service,
    identifier,
    blogPost
  }: IDownloadVideoParams) => void
}
export const MyContext = React.createContext<MyContextInterface>(defaultValues)

const DownloadWrapper: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)
  const { audios, currAudio } = useSelector((state: RootState) => state.global)
  const { getBlogPosts } = useFetchPosts()
  const { downloads, currentBlog, isLoadingGlobal, isOpenEditBlogModal } =
    useSelector((state: RootState) => state.global)

  const addToPile = async ({
    name,
    service,
    identifier,
    blogPost
  }: IDownloadVideoParams) => {
    try {
      const res = await qortalRequest({
        action: 'GET_QDN_RESOURCE_STATUS',
        name: name,
        service: service,
        identifier: identifier
      })
      if (
        res?.status === 'READY' ||
        (res.percentLoaded > 75 && res.totalChunkCount < 100)
      ) {
        return false
      }
    } catch (error) {}
  }

  const fetchResource = async ({ name, service, identifier }: any) => {
    try {
      await qortalRequest({
        action: 'GET_QDN_RESOURCE_PROPERTIES',
        name,
        service,
        identifier
      })
    } catch (error) {}
  }

  const fetchVideoUrl = async ({ name, service, identifier }: any) => {
    try {
      fetchResource({ name, service, identifier })
      let url = await qortalRequest({
        action: 'GET_QDN_RESOURCE_URL',
        service: service,
        name: name,
        identifier: identifier
      })
      if (url) {
        dispatch(
          updateDownloads({
            name,
            service,
            identifier,
            url
          })
        )
      }
    } catch (error) {}
  }

  const performDownload = ({
    name,
    service,
    identifier,
    blogPost
  }: IDownloadVideoParams) => {
    dispatch(
      setAddToDownloads({
        name,
        service,
        identifier,
        blogPost
      })
    )

    const url = `/arbitrary/${service}/${name}/${identifier}`
    let isCalling = false
    let percentLoaded = 0
    let timer = 24
    const intervalId = setInterval(async () => {
      if (isCalling) return
      isCalling = true
      const res = await qortalRequest({
        action: 'GET_QDN_RESOURCE_STATUS',
        name: name,
        service: service,
        identifier: identifier
      })
      isCalling = false
      if (res.localChunkCount) {
        if (res.percentLoaded) {
          if (
            res.percentLoaded === percentLoaded &&
            res.percentLoaded !== 100
          ) {
            timer = timer - 5
          } else {
            timer = 24
          }
          if (timer < 0) {
            timer = 24
            isCalling = true
            dispatch(
              updateDownloads({
                name,
                service,
                identifier,
                status: {
                  ...res,
                  status: 'REFETCHING'
                }
              })
            )
            setTimeout(() => {
              isCalling = false
              fetchResource({
                name,
                service,
                identifier
              })
            }, 25000)
            return
          }
          percentLoaded = res.percentLoaded
        }
        dispatch(
          updateDownloads({
            name,
            service,
            identifier,
            status: res
          })
        )
      }

      // check if progress is 100% and clear interval if true
      if (res?.status === 'READY') {
        clearInterval(intervalId)
        dispatch(
          updateDownloads({
            name,
            service,
            identifier,
            status: res
          })
        )
      }
    }, 5000) // 1 second interval

    fetchVideoUrl({
      name,
      service,
      identifier
    })
  }

  const downloadVideo = async ({
    name,
    service,
    identifier,
    blogPost
  }: IDownloadVideoParams) => {
    try {


      performDownload({
        name,
        service,
        identifier,
        blogPost
      })
      return 'addedToList'
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <>
      <MyContext.Provider value={{ downloadVideo }}>
        <DownloadTaskManager />
        {children}
      </MyContext.Provider>
    </>
  )
}

export default DownloadWrapper
