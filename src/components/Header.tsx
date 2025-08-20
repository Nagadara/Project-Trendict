import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';

const LogoIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ marginRight: '10px' }}
  >
    <path d="M3 17l6-6 4 4 8-8" />
    <polyline points="17 3 23 3 23 9" />
  </svg>
);

const Header: React.FC = () => {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{ backgroundColor: 'transparent', color: 'text.primary' }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LogoIcon />
          <Typography
            variant="h6"
            component={Link}
            to="/dashboard"
            sx={{ color: 'inherit', textDecoration: 'none' }}
          >
            Trendict
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
          <Button color="inherit" component={Link} to="/dashboard">
            MAIN
          </Button>
          <Button color="inherit" component={Link} to="/profile">
            Settings
          </Button>
        </Box>

        {/* This empty box is a spacer to help keep the central links truly centered */}
        <Box sx={{ width: 150 }} />
      </Toolbar>
    </AppBar>
  );
};

export default Header;

