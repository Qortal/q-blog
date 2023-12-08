import { AppBar, Button, Toolbar, Typography, Box } from '@mui/material'
import { styled } from '@mui/system'

export const QblogLogoContainer = styled('img')({
  width: 'auto',
  height: 'auto',
  userSelect: 'none',
  objectFit: 'contain',
  cursor: 'pointer'
})

export const CustomAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "light" ? theme.palette.background.default : "#19191b",
  [theme.breakpoints.only('xs')]: {
    gap: '15px',
  },
}))

export const CustomToolbar = styled(Toolbar)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
})

export const CustomTitle = styled(Typography)({
  fontWeight: 600,
  color: '#000000'
})

export const StyledButton = styled(Button)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.primary
}))

export const CreateBlogButton = styled(Button)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  padding: '8px 15px',
  borderRadius: "40px",
  gap: '4px',
  backgroundColor: theme.palette.secondary.main,
  color: '#fff',
  fontFamily: "Arial",
  transition: "all 0.3s ease-in-out",
  boxShadow: "none",
  "&:hover": {
    cursor: "pointer",
    boxShadow: "rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;",
    backgroundColor: theme.palette.secondary.main,
    filter: "brightness(1.1)",
  }
}))

export const AuthenticateButton = styled(Button)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  padding: '8px 15px',
  borderRadius: "40px",
  gap: '4px',
  backgroundColor: "#4ACE91",
  color: '#fff',
  fontFamily: "Arial",
  transition: "all 0.3s ease-in-out",
  boxShadow: "none",
  "&:hover": {
    cursor: "pointer",
    boxShadow: "rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;",
    backgroundColor: "#4ACE91",
    filter: "brightness(1.1)",
  }
})

export const AvatarContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  "&:hover": {
    cursor: "pointer",
    "& #expand-icon": {
      transition: "all 0.3s ease-in-out",
      filter: "brightness(0.7)",
    }
  },
});

export const DropdownContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "5px",
  backgroundColor: theme.palette.primary.main,
  padding: "10px 15px",
  transition: "all 0.4s ease-in-out",
  "&:hover": {
    cursor: "pointer",
    filter: "brightness(0.95)"
  }
}));

export const DropdownText = styled(Typography)(({ theme }) => ({
  fontFamily: "Arial",
  fontSize: "16px",
  color: theme.palette.text.primary,
  userSelect: "none"
}));

export const NavbarName = styled(Typography)(({ theme }) => ({
  fontFamily: "Arial",
  fontSize: "18px",
  color: theme.palette.text.primary,
  margin: "0 10px",
}));