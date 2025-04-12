import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import Settings from '@mui/icons-material/Settings';
import Logout from '@mui/icons-material/Logout';
import apiService from '../services/api';
import { getInitials } from '../utils/format';
import NotificationMenu from './NotificationMenu';

const drawerWidth = 240;

const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

function Header({ open, toggleDrawer }) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Recuperar informações do usuário do localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Erro ao processar dados do usuário:', error);
      }
    }
  }, []);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = async () => {
    handleClose();
    
    try {
      await apiService.auth.logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      // Mesmo que a API falhe, limpamos o token e usuário local
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };
  
  const handleSettingsClick = () => {
    handleClose();
    navigate('/settings');
  };

  return (
    <StyledAppBar position="fixed" open={open}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="open drawer"
          onClick={toggleDrawer}
          sx={{
            marginRight: '36px',
            ...(open && { display: 'none' }),
          }}
        >
          <MenuIcon />
        </IconButton>
        <Typography
          component="h1"
          variant="h6"
          color="inherit"
          noWrap
          sx={{ flexGrow: 1 }}
        >
          PromoBot
        </Typography>
        
        {/* Componente de Menu de Notificações */}
        <NotificationMenu />
        
        <IconButton
          color="inherit"
          aria-controls="profile-menu"
          aria-haspopup="true"
          onClick={handleClick}
          sx={{ ml: 1 }}
        >
          {user?.name ? (
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {getInitials(user.name)}
            </Avatar>
          ) : (
            <AccountCircleIcon />
          )}
        </IconButton>
        <Menu
          id="profile-menu"
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleClose}
          onClick={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
        >
          <MenuItem>
            <Avatar /> {user?.name || 'Usuário'}
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleSettingsClick}>
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            Configurações
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            Sair
          </MenuItem>
        </Menu>
      </Toolbar>
    </StyledAppBar>
  );
}

export default Header; 