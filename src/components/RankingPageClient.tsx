/**
 * ランキングページ Client Component
 *
 * 主な機能：
 * - 車両数別・車種数別の前計算済みランキング表示
 * - ランキングのスコアボード化（Avatar・Card で視認性向上）
 * - ステーション詳細情報（車両一覧，住所，写真）モーダル表示
 * - タブ切り替え（車両数ランキング ← → 車種数ランキング）
 * - モバイル・デスクトップ対応（Drawer/Dialog 使い分け）
 *
 * パフォーマンス特性：
 * - サーバー前計算によりランタイム計算廃止
 * - メモ化により不要な再レンダリング削減
 * - ランキング上位 16 駅のみ事前取得（初期描画負荷軽減）
 */

'use client';

import CategoryIcon from '@mui/icons-material/Category';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import {
  Avatar,
  alpha,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  Drawer,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useMemo, useState } from 'react';
import type { Station } from '@/types';
import { StationDetailPage } from './StationDetailPage';

export interface RankedStation {
  code: string;
  name: string;
  value: number;
  unit: string;
}

interface RankingPageClientProps {
  topByCarCount: RankedStation[];
  topByVariety: RankedStation[];
  detailStations: Station[];
}

const RankingList = ({
  title,
  stations,
  icon,
  onStationClick,
  color = 'primary' as 'primary' | 'secondary',
}: {
  title: string;
  stations: RankedStation[];
  icon: React.ReactNode;
  onStationClick: (stationCode: string) => void;
  color?: 'primary' | 'secondary';
}) => {
  const theme = useTheme();

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return `${index + 1}`;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return '#FFD700';
      case 1:
        return '#C0C0C0';
      case 2:
        return '#CD7F32';
      default:
        return '#757575';
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(
          theme.palette[color].main,
          0.05,
        )} 0%, ${alpha(theme.palette[color].light, 0.02)} 100%)`,
        border: `1px solid ${alpha(theme.palette[color].main, 0.1)}`,
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <Box
          sx={{
            p: 3,
            background: `linear-gradient(135deg, ${theme.palette[color].main} 0%, ${theme.palette[color].light} 100%)`,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: alpha('#fff', 0.2),
            }}
          >
            {icon}
          </Box>
          <Typography variant='h6' sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        <List sx={{ p: 0 }}>
          {stations.map((station, index) => (
            <ListItem
              key={station.code}
              sx={{
                p: 0,
                borderBottom:
                  index < stations.length - 1
                    ? `1px solid ${theme.palette.divider}`
                    : 'none',
              }}
            >
              <ListItemButton
                onClick={() => onStationClick(station.code)}
                sx={{
                  py: 2,
                  px: 3,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette[color].main, 0.1),
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: getRankColor(index),
                      color: index < 3 ? '#000' : '#fff',
                      fontWeight: 700,
                      fontSize: index < 3 ? '1.2rem' : '1rem',
                    }}
                  >
                    {getRankIcon(index)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography
                        variant='subtitle1'
                        sx={{ fontWeight: 500, pr: 1 }}
                      >
                        {station.name}
                      </Typography>
                      <Chip
                        label={`${station.value} ${station.unit}`}
                        color={color}
                        size='small'
                        variant='outlined'
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export function RankingPageClient({
  topByCarCount,
  topByVariety,
  detailStations,
}: RankingPageClientProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const stationByCode = useMemo(
    () =>
      new Map(detailStations.map(station => [station.station_code, station])),
    [detailStations],
  );

  const handleOpenDetails = (stationCode: string) => {
    const stationData = stationByCode.get(stationCode);
    if (stationData) {
      setSelectedStation(stationData);
    }
  };

  const handleCloseDetails = () => {
    setSelectedStation(null);
  };

  return (
    <Container maxWidth='xl' sx={{ py: { xs: 2, sm: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant='h4'
          component='h1'
          gutterBottom
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <LeaderboardIcon sx={{ fontSize: '2.5rem', color: '#FFD700' }} />
          Ranking
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          全国のタイムズカーステーション ランキング TOP16
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 4,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <RankingList
            title='🚗 車両台数ランキング TOP16'
            stations={topByCarCount}
            icon={<DirectionsCarIcon />}
            onStationClick={handleOpenDetails}
            color='primary'
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <RankingList
            title='🎯 車種バリエーションランキング TOP16'
            stations={topByVariety}
            icon={<CategoryIcon />}
            onStationClick={handleOpenDetails}
            color='secondary'
          />
        </Box>
      </Box>

      {isMobile ? (
        <Drawer
          anchor='bottom'
          open={!!selectedStation}
          onClose={handleCloseDetails}
          sx={{
            '& .MuiDrawer-paper': {
              maxHeight: '80vh',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            },
          }}
        >
          {selectedStation && <StationDetailPage station={selectedStation} />}
        </Drawer>
      ) : (
        <Dialog
          open={!!selectedStation}
          onClose={handleCloseDetails}
          maxWidth='md'
          fullWidth
        >
          {selectedStation && <StationDetailPage station={selectedStation} />}
        </Dialog>
      )}
    </Container>
  );
}
