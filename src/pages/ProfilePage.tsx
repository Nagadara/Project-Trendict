import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

const ProfilePage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
          <Typography variant="h6" color="text.secondary">
            설정 페이지입니다.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfilePage;
