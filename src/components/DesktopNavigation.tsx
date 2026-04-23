/**
 * デスクトップナビゲーション
 *
 * ヘッダーに水平ボタンレイアウトでナビゲーションを提供（デスクトップ環境向け）
 * - 地図，ダッシュボード，ランキングへのボタンリンク
 * - 最終更新日時表示
 * - アプリ名（carshare-viewer）表示
 */

'use client';

import DashboardIcon from '@mui/icons-material/Dashboard';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import MapIcon from '@mui/icons-material/Map';
import { Box, Button } from '@mui/material';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

type DesktopNavigationProps = {
  lastUpdatedDisplay: string | null;
};

export function DesktopNavigation({
  lastUpdatedDisplay,
}: DesktopNavigationProps) {
  const menuItems = [
    { text: 'Map', href: '/', icon: <MapIcon /> },
    { text: 'Ranking', href: '/ranking', icon: <LeaderboardIcon /> },
    { text: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
  ];

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <Typography variant='caption' sx={{ opacity: 0.9, whiteSpace: 'nowrap' }}>
        最終更新: {lastUpdatedDisplay ?? '未取得'}
      </Typography>
      {menuItems.map(item => (
        <Button
          key={item.text}
          color='inherit'
          component={Link}
          href={item.href}
          startIcon={item.icon}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
            borderRadius: 2,
          }}
        >
          {item.text}
        </Button>
      ))}
    </Box>
  );
}
