import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          component={Link}
          to="/dashboard"
          sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
        >
          Trendict
        </Typography>
        <Button color="inherit" component={Link} to="/dashboard">
          Dashboard
        </Button>
        <Button color="inherit" component={Link} to="/profile">
          Settings
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
