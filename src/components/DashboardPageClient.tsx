/**
 * ダッシュボード Client Component
 *
 * 主な機能：
 * - 前計算済み Dashboard データから統計表示
 * - Recharts 用チャート（棒グラフ・円グラフ）描画
 * - 都道府県別統計・車種別構成比・ヒートマップ表示
 * - 動的な Leaflet 地図ヒートマップレイヤー（ClientMapWithHeatmap）
 * - 統計ガイドカード（ステーション数・車両数等）
 *
 * パフォーマンス特性：
 * - サーバー前計算デ達により，クライアント側の集計計算廃止
 * - チャートはコンポーネント再マウント時のみ再描画（props 変更時）
 */

'use client';
import BarChartIcon from '@mui/icons-material/BarChart';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import MapIcon from '@mui/icons-material/Map';
import PieChartIcon from '@mui/icons-material/PieChart';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard';
import {
  alpha,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Typography,
  useTheme,
} from '@mui/material';
import dynamic from 'next/dynamic';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import 'leaflet/dist/leaflet.css';

const ClientMapWithHeatmap = dynamic(
  () =>
    import('@/components/ClientMapWithHeatmap').then(
      mod => mod.ClientMapWithHeatmap,
    ),
  {
    ssr: false,
    loading: () => (
      <Box
        sx={{
          height: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: alpha('#1976d2', 0.05),
          borderRadius: 2,
        }}
      >
        <CircularProgress />
      </Box>
    ),
  },
);

interface DashboardPageClientProps {
  totalStations: number;
  totalCars: number;
  totalCarModels: number;
  prefectureStationChartData: { name: string; count: number }[];
  prefectureCarCountChartData: { name: string; count: number }[];
  classPieData: { name: string; value: number }[];
  topCarData: { name: string; count: number }[];
  topCarDataTotalCount: number;
  heatmapData: [number, number, number][];
}

const StatCard = ({
  icon,
  title,
  value,
  color = 'primary' as 'primary' | 'secondary' | 'success' | 'warning',
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning';
}) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.1)} 0%, ${alpha(theme.palette[color].light, 0.05)} 100%)`,
        border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette[color].main, 0.1),
              color: theme.palette[color].main,
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Typography
            variant='h6'
            color='text.secondary'
            sx={{ fontWeight: 500 }}
          >
            {title}
          </Typography>
        </Box>
        <Typography
          variant='h4'
          sx={{ fontWeight: 700, color: theme.palette[color].main, mb: 1 }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
};

const ChartCard = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: 2,
            backgroundColor: alpha('#1976d2', 0.1),
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

export function DashboardPageClient({
  totalStations,
  totalCars,
  totalCarModels,
  prefectureStationChartData,
  prefectureCarCountChartData,
  classPieData,
  topCarData,
  topCarDataTotalCount,
  heatmapData,
}: DashboardPageClientProps) {
  const theme = useTheme();
  const carModelChartHeight = Math.max(1024, topCarData.length * 24);

  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7c7c',
    '#8dd1e1',
  ];

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
          <SpaceDashboardIcon sx={{ fontSize: '2.5rem', color: 'grey' }} />
          Dashboard
        </Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
          全国のタイムズカーステーション統計情報
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          mb: 4,
        }}
      >
        <Box sx={{ flex: '1 1 300px' }}>
          <StatCard
            icon={<DirectionsCarIcon />}
            title='総車両数'
            value={`${totalCars.toLocaleString()}台`}
            color='primary'
          />
        </Box>
        <Box sx={{ flex: '1 1 300px' }}>
          <StatCard
            icon={<MapIcon />}
            title='総ステーション数'
            value={`${totalStations.toLocaleString()}カ所`}
            color='secondary'
          />
        </Box>
        <Box sx={{ flex: '1 1 300px' }}>
          <StatCard
            icon={<PieChartIcon />}
            title='車種数'
            value={`${totalCarModels}種類`}
            color='success'
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: 3,
          }}
        >
          <Box sx={{ flex: '1 1 500px', minWidth: 0 }}>
            <ChartCard icon={<BarChartIcon />} title='都道府県別ステーション数'>
              <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <Box sx={{ width: 1200, height: 400 }}>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart
                      data={prefectureStationChartData}
                      margin={{ bottom: 0, left: 10, right: 10, top: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray='3 3'
                        stroke={alpha('#000', 0.1)}
                      />
                      <XAxis
                        dataKey='name'
                        angle={-45}
                        textAnchor='end'
                        height={80}
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} unit='カ所' />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: theme.shape.borderRadius,
                        }}
                      />
                      <Bar
                        dataKey='count'
                        fill={theme.palette.primary.main}
                        radius={[4, 4, 0, 0]}
                        barSize={16}
                        name='ステーション数'
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            </ChartCard>
          </Box>
          <Box sx={{ flex: '1 1 500px' }}>
            <ChartCard icon={<MapIcon />} title='全国ステーションヒートマップ'>
              <Box sx={{ height: 400, borderRadius: 2, overflow: 'hidden' }}>
                <ClientMapWithHeatmap heatmapData={heatmapData} />
              </Box>
            </ChartCard>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: 3,
          }}
        >
          <Box sx={{ flex: '1 1 500px', minWidth: 0 }}>
            <ChartCard icon={<BarChartIcon />} title='都道府県別車両数'>
              <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <Box sx={{ width: 1200, height: 400 }}>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart
                      data={prefectureCarCountChartData}
                      margin={{ bottom: 0, left: 10, right: 10, top: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray='3 3'
                        stroke={alpha('#000', 0.1)}
                      />
                      <XAxis
                        dataKey='name'
                        angle={-45}
                        textAnchor='end'
                        height={80}
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} unit='台' />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: theme.shape.borderRadius,
                        }}
                      />
                      <Bar
                        dataKey='count'
                        fill={theme.palette.secondary.main}
                        radius={[4, 4, 0, 0]}
                        barSize={16}
                        name='車両数'
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            </ChartCard>
          </Box>
          <Box sx={{ flex: '1 1 500px' }}>
            <ChartCard icon={<PieChartIcon />} title='車両クラス別比率'>
              <ResponsiveContainer width='100%' height={400}>
                <PieChart margin={{ top: 0, right: 10, bottom: 10, left: 10 }}>
                  <Pie
                    data={classPieData}
                    dataKey='value'
                    nameKey='name'
                    cx='50%'
                    cy='50%'
                    outerRadius={120}
                    innerRadius={40}
                    label={({ name, percent }) =>
                      percent && percent * 100 > 3 ? `${name}` : ''
                    }
                    labelLine={false}
                    fontSize={12}
                  >
                    {classPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    iconSize={12}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            width: '100%',
          }}
        >
          <Box sx={{ flex: '1 1 100%', minWidth: 0 }}>
            <ChartCard icon={<DirectionsCarIcon />} title='車種別車両数'>
              <Typography variant='caption' color='text.secondary'>
                全{topCarDataTotalCount}件を表示
              </Typography>
              <ResponsiveContainer width='100%' height={carModelChartHeight}>
                <BarChart
                  layout='vertical'
                  data={topCarData}
                  margin={{ top: 0, right: 10, left: 100, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke={alpha('#000', 0.1)}
                  />
                  <XAxis type='number' tick={{ fontSize: 12 }} unit='台' />
                  <YAxis
                    dataKey='name'
                    type='category'
                    width={90}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: theme.shape.borderRadius,
                    }}
                  />
                  <Bar
                    dataKey='count'
                    fill={theme.palette.primary.main}
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                    name='台数'
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
