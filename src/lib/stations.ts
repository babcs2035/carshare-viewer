/**
 * ステーション・ランキング・ダッシュボードデータ取得レイヤー
 *
 * 主な機能：
 * - MongoDB から stations コレクション（全ステーション）を取得
 * - precomputed_analytics コレクションから Dashboard・Ranking 用前計算データを取得
 *
 * パフォーマンス最適化：
 * - projection で必要フィールドのみ指定
 * - 前計算データはそのまま返す（ランタイム計算廃止）
 */

import type { MapStation, Station } from '@/types';
import { getDatabase } from './mongodb';

interface StationDoc extends Omit<Station, '_id'> {
  _id: { toString(): string };
}

interface MapStationDoc {
  _id: { toString(): string };
  station_code: string;
  station_name: string;
  latitude: number;
  longitude: number;
  address: string;
  car_fleet: { class_name: string; car_name: string }[];
}

const PRECOMPUTED_ANALYTICS_COLLECTION = 'precomputed_analytics';
const DASHBOARD_PRECOMPUTED_DOC_ID = 'dashboard_v1';
const RANKING_PRECOMPUTED_DOC_ID = 'ranking_v1';

// =====================
// 型定義
// =====================

/** ランキング表示用メトリクス（ステーション単位） */
export interface RankingMetric {
  code: string; // ステーションコード
  name: string; // ステーション名
  value: number; // 値（車両数または車種数）
}

/** Dashboard ページ表示用データ（前計算結果をそのまま利用） */
export interface DashboardPageData {
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

interface DashboardPrecomputedData {
  totalStations: number;
  totalCars: number;
  totalCarModels: number;
  prefectureStationChartData: { name: string; count: number }[];
  prefectureCarCountChartData: { name: string; count: number }[];
  classPieData: { name: string; value: number }[];
  allCarData: { name: string; count: number }[];
  topCarDataTotalCount: number;
  heatmapData: [number, number, number][];
  recommendedTopCarLimit: number;
}

interface DashboardPrecomputedDoc {
  _id: typeof DASHBOARD_PRECOMPUTED_DOC_ID;
  generated_at: string;
  data: DashboardPrecomputedData;
}

interface RankingPrecomputedData {
  topByCarCount: RankingMetric[];
  topByVariety: RankingMetric[];
  detailStations: Station[];
  precomputedLimit: number;
}

interface RankingPrecomputedDoc {
  _id: typeof RANKING_PRECOMPUTED_DOC_ID;
  generated_at: string;
  data: RankingPrecomputedData;
}

// =====================
// ユーティリティ
// =====================

/** MongoDB ObjectId から Station[] に変換 */
function serializeStations(stations: StationDoc[]): Station[] {
  return stations.map(station => ({
    ...station,
    _id: station._id.toString(),
  }));
}

/** 住所文字列から都道府県を抽出 */
function extractPrefecture(address: string): string {
  return address.match(/^(.{2,3}?[都道府県])/)?.[0] ?? 'その他';
}

/** 住所文字列から市区町村を抽出 */
function extractCity(address: string, prefecture: string): string {
  const cityMatch = address.match(/(市|区|郡|町|村)/);
  if (!cityMatch || cityMatch.index === undefined) {
    return 'その他';
  }
  const start = address.startsWith(prefecture) ? prefecture.length : 0;
  const end = cityMatch.index + cityMatch[0].length;
  return address.slice(start, end) || 'その他';
}

/** MongoDB ObjectId から MapStation[] に変換（地図表示最小データ） */
function serializeMapStations(stations: MapStationDoc[]): MapStation[] {
  return stations.map(station => {
    const prefecture = extractPrefecture(station.address);
    return {
      _id: station._id.toString(),
      station_code: station.station_code,
      station_name: station.station_name,
      latitude: station.latitude,
      longitude: station.longitude,
      address: station.address,
      prefecture,
      city: extractCity(station.address, prefecture),
      car_fleet: station.car_fleet,
    };
  });
}

/** stations コレクション取得時の projection（必要フィールドのみ） */
const stationProjection = {
  station_code: 1,
  station_name: 1,
  station_comment: 1,
  latitude: 1,
  longitude: 1,
  address: 1,
  car_fleet: 1,
  photo_urls: 1,
  disp1MonthReserveLabel: 1,
  disp3MonthReserveLabel: 1,
} as const;

/** 地図表示時の projection（ピン・ツールチップ・フィルターに必要な最小項目のみ） */
const mapStationProjection = {
  station_code: 1,
  station_name: 1,
  latitude: 1,
  longitude: 1,
  address: 1,
  'car_fleet.class_name': 1,
  'car_fleet.car_name': 1,
} as const;

// =====================
// データ取得関数
// =====================

/** MongoDB から全ステーションを取得 */
async function fetchStationsFromDb(): Promise<Station[]> {
  const db = await getDatabase();
  const stations = await db
    .collection<StationDoc>('stations')
    .find({}, { projection: stationProjection })
    .toArray();
  return serializeStations(stations);
}

/** 全ステーション取得 */
export async function getStations(): Promise<Station[]> {
  return fetchStationsFromDb();
}

/** 地図表示用の最小ステーションデータを取得 */
export async function getMapStations(): Promise<MapStation[]> {
  const db = await getDatabase();
  const stations = await db
    .collection<MapStationDoc>('stations')
    .find({}, { projection: mapStationProjection })
    .toArray();
  return serializeMapStations(stations);
}

/** ステーションコード指定で取得 */
export async function getStationsByCodes(
  stationCodes: string[],
): Promise<Station[]> {
  if (stationCodes.length === 0) {
    return [];
  }

  const db = await getDatabase();
  const stations = await db
    .collection<StationDoc>('stations')
    .find(
      { station_code: { $in: stationCodes } },
      { projection: stationProjection },
    )
    .toArray();

  return serializeStations(stations);
}

/** ランキング表示用メトリクスを取得（前計算データから） */
export async function getRankingLeaders(limit = 16): Promise<{
  topByCarCount: RankingMetric[];
  topByVariety: RankingMetric[];
}> {
  const db = await getDatabase();
  const rankingDoc = await db
    .collection<RankingPrecomputedDoc>(PRECOMPUTED_ANALYTICS_COLLECTION)
    .findOne({ _id: RANKING_PRECOMPUTED_DOC_ID });

  if (!rankingDoc?.data) {
    throw new Error(
      'Precomputed ranking data is missing. Run the fetch job to generate analytics.',
    );
  }

  if (limit > rankingDoc.data.precomputedLimit) {
    throw new Error(
      `Requested ranking limit (${limit}) exceeds precomputed limit (${rankingDoc.data.precomputedLimit}). Run fetch to regenerate.`,
    );
  }

  return {
    topByCarCount: rankingDoc.data.topByCarCount.slice(0, limit),
    topByVariety: rankingDoc.data.topByVariety.slice(0, limit),
  };
}

/** Ranking ページ用詳細ステーション取得（前計算データから） */
export async function getRankingDetailStations(limit = 16): Promise<Station[]> {
  const db = await getDatabase();
  const rankingDoc = await db
    .collection<RankingPrecomputedDoc>(PRECOMPUTED_ANALYTICS_COLLECTION)
    .findOne({ _id: RANKING_PRECOMPUTED_DOC_ID });

  if (!rankingDoc?.data) {
    throw new Error(
      'Precomputed ranking data is missing. Run the fetch job to generate analytics.',
    );
  }

  if (limit > rankingDoc.data.precomputedLimit) {
    throw new Error(
      `Requested ranking limit (${limit}) exceeds precomputed limit (${rankingDoc.data.precomputedLimit}). Run fetch to regenerate.`,
    );
  }

  const detailStationCodes = new Set(
    [
      ...rankingDoc.data.topByCarCount.slice(0, limit),
      ...rankingDoc.data.topByVariety.slice(0, limit),
    ].map(station => station.code),
  );

  return rankingDoc.data.detailStations.filter(station =>
    detailStationCodes.has(station.station_code),
  );
}

/** Dashboard ページ用データ取得（前計算データから） */
export async function getDashboardPageData(): Promise<DashboardPageData> {
  const db = await getDatabase();
  const dashboardDoc = await db
    .collection<DashboardPrecomputedDoc>(PRECOMPUTED_ANALYTICS_COLLECTION)
    .findOne({ _id: DASHBOARD_PRECOMPUTED_DOC_ID });

  if (!dashboardDoc?.data) {
    throw new Error(
      'Precomputed dashboard data is missing. Run the fetch job to generate analytics.',
    );
  }

  return {
    totalStations: dashboardDoc.data.totalStations,
    totalCars: dashboardDoc.data.totalCars,
    totalCarModels: dashboardDoc.data.totalCarModels,
    prefectureStationChartData: dashboardDoc.data.prefectureStationChartData,
    prefectureCarCountChartData: dashboardDoc.data.prefectureCarCountChartData,
    classPieData: dashboardDoc.data.classPieData,
    topCarData: dashboardDoc.data.allCarData,
    topCarDataTotalCount: dashboardDoc.data.topCarDataTotalCount,
    heatmapData: dashboardDoc.data.heatmapData,
  };
}
