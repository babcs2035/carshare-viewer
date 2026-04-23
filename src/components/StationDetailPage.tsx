/**
 * ステーション詳細ページコンポーネント
 *
 * 主な機能：
 * - ステーション名・住所・コメント表示
 * - 車両一覧（車種・名前・備考）をカード形式で表示
 * - 写真ギャラリー表示（複数画像対応）
 * - 1 ヶ月・3 ヶ月の予約状況ラベル表示
 * - 外部リンク（Google Maps，タイムズカー公式）への遷移
 * - モーダルでのスクロール対応
 */

'use client';

import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import InfoIcon from '@mui/icons-material/Info';
import LaunchIcon from '@mui/icons-material/Launch';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { Station } from '@/types';

const Carousel = dynamic(
  () => import('react-responsive-carousel').then(mod => mod.Carousel),
  { ssr: false },
);
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import type { CarouselProps } from 'react-responsive-carousel';

const InfoCard = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => {
  const theme = useTheme();

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Typography variant='h6' sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
};

const getClassColor = (className: string) => {
  switch (className) {
    case 'ベーシック':
      return 'success';
    case 'ミドル':
      return 'primary';
    case 'プレミアム':
      return 'secondary';
    default:
      return 'default';
  }
};

interface StationDetailPageProps {
  station: Station;
}

export function StationDetailPage({ station }: StationDetailPageProps) {
  const theme = useTheme();

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Paper
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          position: 'relative',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          sx={{ alignItems: 'flex-start' }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant='h4'
              component='h1'
              gutterBottom
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                wordBreak: 'break-word',
              }}
            >
              {station.station_name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocationOnIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant='body1' color='text.secondary'>
                {station.address}
              </Typography>
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ mt: 2 }}
            >
              <Button
                variant='outlined'
                startIcon={<LaunchIcon />}
                href={`https://maps.google.com/?q=${station.latitude},${station.longitude}`}
                target='_blank'
                rel='noopener'
                sx={{ borderRadius: 2 }}
              >
                Google Maps で開く
              </Button>
              <Button
                variant='contained'
                color='warning'
                href={`https://share.carshare-viewer.jp/view/reserve/input.jsp?scd=${station.station_code}`}
                target='_blank'
                rel='noopener'
                sx={{ borderRadius: 2 }}
              >
                公式サイトで予約
              </Button>
            </Stack>
          </Box>
          <Stack spacing={1} sx={{ minWidth: 200 }}>
            <Chip
              icon={<EventAvailableIcon />}
              label={`1ヶ月前予約: ${station.disp1MonthReserveLabel ? '〇' : '×'}`}
              variant='outlined'
              size='medium'
            />
            <Chip
              icon={<EventAvailableIcon />}
              label={`3ヶ月前予約: ${station.disp3MonthReserveLabel ? '〇' : '×'}`}
              variant='outlined'
              size='medium'
            />
          </Stack>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 4,
        }}
      >
        {station.photo_urls && station.photo_urls.length > 0 && (
          <Box sx={{ flex: 1 }}>
            <InfoCard icon={<PhotoLibraryIcon />} title='ステーション写真'>
              <Box
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: `1px solid ${theme.palette.divider}`,
                  '& .carousel-root': {
                    borderRadius: 2,
                  },
                }}
              >
                <Carousel
                  {...({
                    showThumbs: false,
                    infiniteLoop: true,
                    useKeyboardArrows: true,
                    autoPlay: true,
                    interval: 4000,
                    showStatus: false,
                    emulateTouch: true,
                  } as CarouselProps)}
                >
                  {station.photo_urls.map((url, index) => (
                    <Box key={url} sx={{ position: 'relative', height: 300 }}>
                      <Image
                        src={url}
                        alt={`ステーション画像 ${index + 1}`}
                        fill
                        style={{
                          objectFit: 'cover',
                          borderRadius: '8px',
                        }}
                        sizes='(max-width: 768px) 100vw, 50vw'
                        {...(index === 0 ? { priority: true } : {})}
                      />
                    </Box>
                  ))}
                </Carousel>
              </Box>
            </InfoCard>
          </Box>
        )}

        <Box sx={{ flex: 1 }}>
          <InfoCard
            icon={<DirectionsCarIcon />}
            title={`車両リスト (${station.car_fleet.length}台)`}
          >
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <List
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                }}
              >
                {station.car_fleet.map((car, index) => (
                  <ListItem
                    // biome-ignore lint/suspicious/noArrayIndexKey: 静的な表示リストであり，車両名とインデックスの組み合わせで一意性を確保
                    key={`${car.car_name}-${index}`}
                    sx={{
                      borderBottom:
                        index < station.car_fleet.length - 1
                          ? `1px solid ${theme.palette.divider}`
                          : 'none',
                      '&:hover': {
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.05,
                        ),
                      },
                    }}
                  >
                    <ListItemIcon>
                      <DirectionsCarIcon color='primary' />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Typography
                            variant='subtitle1'
                            sx={{ fontWeight: 500 }}
                          >
                            {car.car_name}
                          </Typography>
                          <Chip
                            label={car.class_name}
                            size='small'
                            color={getClassColor(car.class_name)}
                            variant='outlined'
                          />
                        </Box>
                      }
                      secondary={
                        car.car_comments && (
                          <Typography
                            variant='body2'
                            color='text.secondary'
                            sx={{ mt: 0.5 }}
                          >
                            <InfoIcon
                              sx={{
                                fontSize: 14,
                                mr: 0.5,
                                verticalAlign: 'text-bottom',
                              }}
                            />
                            {car.car_comments}
                          </Typography>
                        )
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </InfoCard>
        </Box>
      </Box>

      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant='h6' gutterBottom sx={{ fontWeight: 600 }}>
            ステーション情報サマリー
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {station.station_comment && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.1),
              }}
            >
              <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
                {station.station_comment}
              </Typography>
            </Box>
          )}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ textAlign: 'center', p: 2, flex: '1 1 200px' }}>
              <Typography
                variant='h4'
                color='primary.main'
                sx={{ fontWeight: 700 }}
              >
                {station.car_fleet.length}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                総車両台数
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', p: 2, flex: '1 1 200px' }}>
              <Typography
                variant='h4'
                color='secondary.main'
                sx={{ fontWeight: 700 }}
              >
                {new Set(station.car_fleet.map(car => car.car_name)).size}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                車種バリエーション
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', p: 2, flex: '1 1 200px' }}>
              <Typography
                variant='h4'
                color='success.main'
                sx={{ fontWeight: 700 }}
              >
                {new Set(station.car_fleet.map(car => car.class_name)).size}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                クラス数
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', p: 2, flex: '1 1 200px' }}>
              <Typography
                variant='h4'
                color='warning.main'
                sx={{ fontWeight: 700 }}
              >
                {station.station_code}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                ステーションコード
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
