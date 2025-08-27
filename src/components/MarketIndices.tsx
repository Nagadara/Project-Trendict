import React from 'react';
import { Paper, Typography, Box, Divider } from '@mui/material';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

// props 타입 정의 (기존 프로젝트에 맞게 조정하세요)
interface Index {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  flag: string;
}

interface MarketIndicesProps {
  indices: Index[];
}

const MarketIndices: React.FC<MarketIndicesProps> = ({ indices }) => {
  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        주요 지수 현황
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      {/* 모든 지수를 감싸는 컨테이너 */}
      <Box>
        {indices.map((index) => {
          const isPositive = index.change >= 0;
          // 상승은 빨간색(error), 하락은 파란색(primary)으로 설정
          const color = isPositive ? 'error.main' : 'primary.main';

          return (
            // 각 지수 아이템. mb로 아이템 간 간격을, pl로 들여쓰기 효과를 줍니다.
            <Box key={index.name} sx={{ mb: 2.5, pl: 2 }}>
              
              {/* 국기 + 지수 이름 */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="h5" sx={{ mr: 1.5 }}>{index.flag}</Typography>
                <Typography variant="subtitle1" fontWeight="bold">{index.name}</Typography>
              </Box>

              {/* 지수 값과 변동률 (이름보다 살짝 더 들여쓰기) */}
              <Box sx={{ pl: '44px' }}> {/* 국기+여백 만큼 왼쪽 패딩을 주어 정렬 */}
                <Typography variant="body1" fontWeight="bold">
                  {/* toLocaleString()을 사용해 세 자리마다 콤마를 추가합니다. */}
                  {index.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', color }}>
                  {isPositive ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
                  <Typography variant="body2" component="span" sx={{ mr: 1 }}>
                    {isPositive ? '+' : ''}{index.change.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" component="span">
                    ({isPositive ? '+' : ''}{index.changePercent.toFixed(2)}%)
                  </Typography>
                </Box>
              </Box>

            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

export default MarketIndices;