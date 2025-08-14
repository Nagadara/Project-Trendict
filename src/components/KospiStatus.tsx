import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

interface KospiStatusProps {
  data: {
    value: number;
    change: number;
    changePercent: number;
    date: string;
  };
}

const KospiStatus: React.FC<KospiStatusProps> = ({ data }) => {
  const isPositive = data.change > 0;
  const color = isPositive ? 'error.main' : 'primary.main';
  const Icon = isPositive ? ArrowUpwardIcon : ArrowDownwardIcon;

  return (
    <Paper
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
      }}
    >
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        코스피 현황
      </Typography>
      <Box>
        <Typography component="p" variant="h4" sx={{ fontWeight: 'bold' }}>
          {data.value.toFixed(2)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', color }}>
          <Icon sx={{ fontSize: '1rem', mr: 0.5 }} />
          <Typography sx={{ flex: 1, fontWeight: 'medium' }}>
            {data.change.toFixed(2)} ({data.changePercent.toFixed(2)}%)
          </Typography>
        </Box>
      </Box>
      <Typography color="text.secondary" sx={{ alignSelf: 'flex-end' }}>
        {data.date} 기준
      </Typography>
    </Paper>
  );
};

export default KospiStatus;
