import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Link } from 'react-router-dom';
import ErrorIcon from '@mui/icons-material/Error';
import HomeIcon from '@mui/icons-material/Home';

function NotFound() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        p: 3,
      }}
    >
      <Paper 
        elevation={3}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 4,
          maxWidth: 500,
          width: '100%',
        }}
      >
        <ErrorIcon color="error" sx={{ fontSize: 80, mb: 2 }} />
        
        <Typography variant="h2" component="h1" gutterBottom>
          404
        </Typography>
        
        <Typography variant="h5" component="h2" gutterBottom align="center">
          Página não encontrada
        </Typography>
        
        <Typography color="text.secondary" align="center" sx={{ mb: 4 }}>
          A página que você está procurando não existe ou foi movida.
        </Typography>
        
        <Button
          component={Link}
          to="/"
          variant="contained"
          color="primary"
          startIcon={<HomeIcon />}
          size="large"
        >
          Voltar ao início
        </Button>
      </Paper>
    </Box>
  );
}

export default NotFound; 