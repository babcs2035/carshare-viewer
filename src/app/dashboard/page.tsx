/**
 * ダッシュボードページ
 *
 * Server Component として機能：
 * 1. MongoDB から前計算済み Dashboard データを取得（getDashboardPageData）
 * 2. 都道府県別統計・車種別集計・ヒートマップを Client Component へ渡却
 *
 * Client Component が受け取り：
 * - Recharts チャート描画（前計算データのみ利用）
 * - インタラクティブなグラフ（ツールチップ，クリック操作）
 *
 * パフォーマンス最適化：
 * - サーバーで集計計算済み（前計算データ読み込みのみ）
 * - クライアント側の複雑な計算廃止
 * - force-dynamic で最新データ保証
 */

import { DashboardPageClient } from '@/components/DashboardPageClient';
import { getDashboardPageData } from '@/lib/stations';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const dashboardData = await getDashboardPageData();
  console.log(
    `✅ Loaded precomputed dashboard data (${dashboardData.totalStations} stations)`,
  );

  return (
    <DashboardPageClient
      totalStations={dashboardData.totalStations}
      totalCars={dashboardData.totalCars}
      prefectureStationChartData={dashboardData.prefectureStationChartData}
      prefectureCarCountChartData={dashboardData.prefectureCarCountChartData}
      classPieData={dashboardData.classPieData}
      topCarData={dashboardData.topCarData}
      topCarDataTotalCount={dashboardData.topCarDataTotalCount}
      heatmapData={dashboardData.heatmapData}
      totalCarModels={dashboardData.totalCarModels}
    />
  );
}
