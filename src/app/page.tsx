/**
 * トップページ（地図表示）
 *
 * Server Component として機能：
 * 1. URL クエリパラメータ（pref, city, cars）を解析
 * 2. 初期フィルター状態を Client Component へ props 渡却
 *
 * Client Component が受け取り：
 * - インタラクティブな地図操作（マーカー表示，フィルタ）
 * - URL クエリ同期，フィルタ反応性改善（useDeferredValue）
 *
 * キャッシュ戦略：
 * - force-dynamic で毎リクエスト描画
 */

import { getMapStationsAction } from '@/app/actions/stations';
import { ClientPage } from '@/components/ClientPage';

export const dynamic = 'force-dynamic';

type HomePageProps = {
  searchParams: Promise<{
    pref?: string;
    city?: string;
    cars?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const allStations = await getMapStationsAction();

  const prefecture = params.pref || 'all';
  const city = prefecture === 'all' ? 'all' : params.city || 'all';
  const initialFilters = {
    prefecture,
    city,
    carNames: params.cars?.split(',').filter(Boolean) || [],
  };

  return (
    <ClientPage allStations={allStations} initialFilters={initialFilters} />
  );
}
