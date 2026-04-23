/**
 * ランキングページ
 *
 * Server Component として機能：
 * 1. MongoDB から前計算済み Ranking データを取得
 * 2. 車両数・車種数別ランキングと詳細ステーション情報を取得
 * 3. Client Component へランキングデータを渡却
 *
 * Client Component が受け取り：
 * - ランキング表示（スコアボード形式）
 * - ステーション詳細（車両情報，住所，写真）
 *
 * パフォーマンス最適化：
 * - サーバーで前計算済みランキング取得（ランタイム計算廃止）
 * - 上位 16 駅のみ事前取得・表示
 */

import {
  type RankedStation,
  RankingPageClient,
} from '@/components/RankingPageClient';
import { getRankingDetailStations, getRankingLeaders } from '@/lib/stations';

export const dynamic = 'force-dynamic';

export default async function RankingPage() {
  const leaders = await getRankingLeaders(16);
  console.log(
    `✅ Loaded ranking leaders (${leaders.topByCarCount.length} by car count, ${leaders.topByVariety.length} by variety)`,
  );

  const topByCarCount: RankedStation[] = leaders.topByCarCount.map(station => ({
    ...station,
    unit: '台',
  }));
  const topByVariety: RankedStation[] = leaders.topByVariety.map(station => ({
    ...station,
    unit: '車種',
  }));
  const detailStations = await getRankingDetailStations(16);
  console.log(`✅ Loaded ${detailStations.length} detail stations`);

  return (
    <RankingPageClient
      topByCarCount={topByCarCount}
      topByVariety={topByVariety}
      detailStations={detailStations}
    />
  );
}
