// @ts-nocheck

import { Routes, Route } from 'react-router-dom'
import { BlogIndividualPost } from './pages/BlogIndividualPost/BlogIndividualPost'
import { BlogIndividualProfile } from './pages/BlogIndividualProfile/BlogIndividualProfile'
import { BlogList } from './pages/BlogList/BlogList'
import { CreatePost } from './pages/CreatePost/CreatePost'
import { CreatEditProfile } from './pages/CreateEditProfile/CreatEditProfile'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { lightTheme, darkTheme } from './styles/theme'
import { store } from './state/store'
import { Provider } from 'react-redux'
import GlobalWrapper from './wrappers/GlobalWrapper'
import DownloadWrapper from './wrappers/DownloadWrapper'
import Notification from './components/common/Notification/Notification'
import { useState } from 'react'

function App() {
  const themeColor = window._qdnTheme

  // const [colorTheme, setColorTheme] = useState('dark')

  // const toggleDarkMode = () => {
  //   setIsDarkMode("dark");
  // }

  return (
    <Provider store={store}>
      <ThemeProvider theme={themeColor === 'light' ? lightTheme : darkTheme}>
        <Notification />
        <DownloadWrapper>
          <GlobalWrapper>
            <CssBaseline />

            <Routes>
              <Route
                path="/:user/:blog/:postId"
                element={<BlogIndividualPost />}
              />
              <Route
                path="/:user/:blog/:postId/edit"
                element={<CreatePost mode="edit" />}
              />
              <Route path="/:user/:blog" element={<BlogIndividualProfile />} />
              <Route path="/post/new" element={<CreatePost />} />
              <Route path="/profile/new" element={<CreatEditProfile />} />
              <Route
                path="/favorites"
                element={<BlogList mode="favorites" />}
              />
              <Route
                path="/subscriptions"
                element={<BlogList mode="subscriptions" />}
              />
              <Route path="/" element={<BlogList />} />
            </Routes>
          </GlobalWrapper>
        </DownloadWrapper>
      </ThemeProvider>
    </Provider>
  )
}

export default App
