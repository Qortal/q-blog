import { styled } from '@mui/system'
import {
  AppBar,
  Toolbar,
  Typography,
  Menu,
  MenuItem
} from '@mui/material'

export const CustomAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "light" ? theme.palette.background.default : "#19191b",
  color: theme.palette.text.primary
}))

export const CustomToolbar = styled(Toolbar)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
})

export const CustomTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontFamily: 'Raleway, Arial',
  fontSize: '18px'
}))

export const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main
}))

export const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  justifyContent: 'space-between'
}))

export const StyledMenu = styled(Menu)(({ theme }) => ({
  marginTop: theme.spacing(2),
  overflow: 'hidden',
  padding: 0,
}))

export const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  width: '100%',
  whiteSpace: 'nowrap',
  maxWidth: '300px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontSize: "16px",
  fontFamily: "Arial",
  padding: "12px 10px",
  transition: "all 0.3s ease-in-out",
  "&:hover": {
    cursor: "pointer",
    filter: "brightness(1.1)"
  }
}))