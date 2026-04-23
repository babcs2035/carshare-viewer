/**
 * タイムズカー公開 API からステーション情報を取得し，MongoDB に保存するスクリプト
 *
 * 処理フロー：
 * 1. タイムズカー API から全ステーション一覧を取得
 * 2. 各ステーションの詳細情報（住所，車両，写真）を並列取得（並行度 4）
 * 3. MongoDB の stations コレクションに upsert
 * 4. Ranking・Dashboard 用前計算データを生成し precomputed_analytics に保存
 * 5. メタデータ（最終更新日時）を記録
 *
 * エラーハンドリング：取得失敗は自動リトライ（最大 3 回）し，最終的に失敗数をログ出力
 */

import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import proj4 from 'proj4';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
const MONGO_DB_NAME = 'carshare-viewer';
const MONGO_COLLECTION_NAME = 'stations';
const MONGO_PRECOMPUTED_COLLECTION_NAME = 'precomputed_analytics';

const BASE_URL = 'https://share.timescar.jp';
const STATIONS_URL = `${BASE_URL}/view/station/teeda.ajax?component=station_stationMapPage&action=ajaxViewMap&minlat=23.4043&maxlat=47.0306&minlon=123.1350&maxlon=149.1116`;
const DETAIL_URL_TEMPLATE = `${BASE_URL}/view/station/teeda.ajax?&component=station_detailPage&action=ajaxStation&scd=`;

const CONCURRENCY = 4;
const RETRY_COUNT = 2;
const RETRY_INTERVAL_MS = 700;
const DASHBOARD_TOP_CAR_LIMIT = 60;
const RANKING_PRECOMPUTE_LIMIT = 100;

// 平面直角座標系（EPSG:4301）を WGS84 に変換するための定義
proj4.defs(
  'EPSG:4301',
  '+proj=longlat +ellps=bessel +towgs84=-146.414,507.337,680.507,0,0,0,0 +no_defs',
);

// =====================
// 型定義
// =====================

/** タイムズカー API から取得するステーション一覧レスポンスの各ステーション構造 */
type RawStation = {
  cd?: string; // ステーションコード
  nm?: string; // ステーション名
  la?: string; // 平面直角座標系緯度
  lo?: string; // 平面直角座標系経度
  disp1MonthReserveLabel?: string | null;
  disp3MonthReserveLabel?: string | null;
};

/** タイムズカー API 全ステーション一覧レスポンス */
type RawStationListResponse = {
  s?: RawStation[];
};

/** タイムズカー API ステーション詳細レスポンス */
type RawStationDetail = {
  adr1?: string; // 住所
  comment?: string; // ステーションコメント
  photoImage?: { photoChild?: string }[];
  carInfo?: {
    // 車両情報配列
    carClassName?: string; // 車種（軽，コンパクト等）
    carName?: string; // 車種名
    carComments?: string; // 備考
  }[];
};

/** MongoDB stations コレクションのドキュメント構造 */
type StationDocument = {
  _id?: { toString(): string };
  station_code: string;
  station_name: string;
  latitude: number;
  longitude: number;
  address: string;
  station_comment: string;
  car_fleet: {
    class_name: string;
    car_name: string;
    car_comments: string;
  }[];
  photo_urls: string[];
  disp1MonthReserveLabel: string | null;
  disp3MonthReserveLabel: string | null;
};

/** ランキングメトリクス（ステーション単位の集計値） */
type RankingMetric = {
  code: string; // ステーションコード
  name: string; // ステーション名
  value: number; // 値（車両数または車種数）
};

/** JSON シリアライズ用 Station（_id を文字列化） */
type SerializedStation = Omit<StationDocument, '_id'> & {
  _id: string;
};

/** Dashboard 用前計算データ */
type DashboardPrecomputedData = {
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
};

/** Ranking 用前計算データ */
type RankingPrecomputedData = {
  topByCarCount: RankingMetric[];
  topByVariety: RankingMetric[];
  detailStations: SerializedStation[];
  precomputedLimit: number;
};

/** precomputed_analytics コレクションのドキュメント */
type PrecomputedAnalyticsDoc = {
  _id: 'dashboard_v1' | 'ranking_v1';
  generated_at: string;
  data: DashboardPrecomputedData | RankingPrecomputedData;
};

// =====================
// ユーティリティ関数
// =====================

/** 住所文字列から都道府県名を抽出 */
function getPrefecture(address: string): string {
  return address.match(/^(.{2,3}?[都道府県])/)?.[0] || 'その他';
}

/** StationDocument を JSON シリアライズ可能な形式に変換（_id を文字列化） */
function serializeStation(station: StationDocument): SerializedStation {
  return {
    _id: station._id?.toString() ?? '',
    station_code: station.station_code,
    station_name: station.station_name,
    latitude: station.latitude,
    longitude: station.longitude,
    address: station.address,
    station_comment: station.station_comment,
    car_fleet: station.car_fleet,
    photo_urls: station.photo_urls,
    disp1MonthReserveLabel: station.disp1MonthReserveLabel,
    disp3MonthReserveLabel: station.disp3MonthReserveLabel,
  };
}

/** Dashboard 用前計算データを生成（都道府県別統計，車種別集計，ヒートマップ等） */
function buildDashboardPrecomputedData(
  stations: StationDocument[],
): DashboardPrecomputedData {
  const prefectureStationCounts = new Map<string, number>();
  const prefectureCarCounts = new Map<string, number>();
  const classCounts = new Map<string, number>();
  const carCounts = new Map<string, number>();
  const heatmapData: [number, number, number][] = [];
  let totalCars = 0;

  for (const station of stations) {
    const carFleet = Array.isArray(station.car_fleet) ? station.car_fleet : [];
    const carCount = carFleet.length;
    const prefecture = getPrefecture(station.address || '');

    prefectureStationCounts.set(
      prefecture,
      (prefectureStationCounts.get(prefecture) ?? 0) + 1,
    );
    prefectureCarCounts.set(
      prefecture,
      (prefectureCarCounts.get(prefecture) ?? 0) + carCount,
    );
    totalCars += carCount;
    heatmapData.push([station.latitude, station.longitude, carCount]);

    for (const car of carFleet) {
      classCounts.set(
        car.class_name,
        (classCounts.get(car.class_name) ?? 0) + 1,
      );
      carCounts.set(car.car_name, (carCounts.get(car.car_name) ?? 0) + 1);
    }
  }

  const sortByCount = (
    a: { count: number; name: string },
    b: { count: number; name: string },
  ) => b.count - a.count || a.name.localeCompare(b.name, 'ja');

  const classPieData = [...classCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort(sortByCount)
    .map(item => ({ name: item.name, value: item.count }));

  const allCarData = [...carCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort(sortByCount);

  const sortPrefecture = (
    a: { name: string; count: number },
    b: { name: string; count: number },
  ) => b.count - a.count || a.name.localeCompare(b.name, 'ja');

  return {
    totalStations: stations.length,
    totalCars,
    totalCarModels: allCarData.length,
    prefectureStationChartData: [...prefectureStationCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort(sortPrefecture),
    prefectureCarCountChartData: [...prefectureCarCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort(sortPrefecture),
    classPieData,
    allCarData,
    topCarDataTotalCount: allCarData.length,
    heatmapData,
    recommendedTopCarLimit: DASHBOARD_TOP_CAR_LIMIT,
  };
}

/** Ranking 用前計算データを生成（車両数・車種数別ランキング） */
function buildRankingPrecomputedData(
  stations: StationDocument[],
): RankingPrecomputedData {
  const metrics = stations.map(station => {
    const carFleet = Array.isArray(station.car_fleet) ? station.car_fleet : [];
    const carNames = new Set(carFleet.map(car => car.car_name));
    return {
      code: station.station_code,
      name: station.station_name,
      carCount: carFleet.length,
      varietyCount: carNames.size,
    };
  });

  const topByCarCount = [...metrics]
    .sort((a, b) => b.carCount - a.carCount || a.code.localeCompare(b.code))
    .slice(0, RANKING_PRECOMPUTE_LIMIT)
    .map(item => ({ code: item.code, name: item.name, value: item.carCount }));

  const topByVariety = [...metrics]
    .sort(
      (a, b) => b.varietyCount - a.varietyCount || a.code.localeCompare(b.code),
    )
    .slice(0, RANKING_PRECOMPUTE_LIMIT)
    .map(item => ({
      code: item.code,
      name: item.name,
      value: item.varietyCount,
    }));

  const detailStationCodes = new Set(
    [...topByCarCount, ...topByVariety].map(item => item.code),
  );
  const detailStations = stations
    .filter(station => detailStationCodes.has(station.station_code))
    .map(serializeStation)
    .sort((a, b) => a.station_code.localeCompare(b.station_code));

  return {
    topByCarCount,
    topByVariety,
    detailStations,
    precomputedLimit: RANKING_PRECOMPUTE_LIMIT,
  };
}

/** MongoDB に前計算データを保存（Dashboard・Ranking 用） */
async function precomputeAnalytics(client: MongoClient) {
  const db = client.db(MONGO_DB_NAME);
  const stationCollection = db.collection<StationDocument>(
    MONGO_COLLECTION_NAME,
  );
  const precomputedCollection = db.collection<PrecomputedAnalyticsDoc>(
    MONGO_PRECOMPUTED_COLLECTION_NAME,
  );

  const stations = await stationCollection
    .find(
      {},
      {
        projection: {
          station_code: 1,
          station_name: 1,
          latitude: 1,
          longitude: 1,
          address: 1,
          station_comment: 1,
          car_fleet: 1,
          photo_urls: 1,
          disp1MonthReserveLabel: 1,
          disp3MonthReserveLabel: 1,
        },
      },
    )
    .toArray();

  const dashboardData = buildDashboardPrecomputedData(stations);
  const rankingData = buildRankingPrecomputedData(stations);

  const generatedAt = new Date().toISOString();
  await precomputedCollection.bulkWrite([
    {
      updateOne: {
        filter: { _id: 'dashboard_v1' },
        update: {
          $set: {
            generated_at: generatedAt,
            data: dashboardData,
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { _id: 'ranking_v1' },
        update: {
          $set: {
            generated_at: generatedAt,
            data: rankingData,
          },
        },
        upsert: true,
      },
    },
  ]);

  console.log('✅ Precomputed analytics saved (dashboard, ranking)');
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** 平面直角座標系（ZDC EPSG:4301）を Leaflet (WGS84 EPSG:4326) に変換 */
function convertZdcToLeaflet(lon: number, lat: number): [number, number] {
  const [newLon, newLat] = proj4('EPSG:4301', 'EPSG:4326', [lon, lat]);
  return [newLat, newLon];
}

/** URL から JSON を取得（リトライ機能付き） */
async function fetchJsonWithRetry<T>(url: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_COUNT) {
        await sleep(RETRY_INTERVAL_MS * (attempt + 1));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unknown fetch error');
}

/** ステーション詳細レスポンスから写真 URL を抽出 */
function extractPhotoUrls(stationDetail: RawStationDetail): string[] {
  const photoUrls = new Set<string>();
  const photoImages = Array.isArray(stationDetail.photoImage)
    ? stationDetail.photoImage
    : [];

  for (const item of photoImages) {
    const htmlString = item.photoChild || '';
    const hrefRegex = /href=['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null = null;
    while (true) {
      match = hrefRegex.exec(htmlString);
      if (!match) {
        break;
      }
      const path = match[1];
      if (!path.startsWith('/')) {
        continue;
      }
      photoUrls.add(`${BASE_URL}${path}`);
    }
  }

  return [...photoUrls];
}

/** ステーション座標を平面直角座標系から Leaflet 座標に変換 */
function parseStationCoordinates(station: RawStation): [number, number] {
  const zdcLat = Number.parseFloat(station.la || '');
  const zdcLon = Number.parseFloat(station.lo || '');
  if (!Number.isFinite(zdcLat) || !Number.isFinite(zdcLon)) {
    throw new Error('Invalid latitude/longitude');
  }

  return convertZdcToLeaflet(zdcLon, zdcLat);
}

// =====================
// メイン処理
// =====================

/** ステーション情報を取得・処理・保存するメイン処理 */
async function fetchAndProcessData() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('🔄 Connected to MongoDB');

    const db = client.db(MONGO_DB_NAME);
    const collection = db.collection<StationDocument>(MONGO_COLLECTION_NAME);
    const metaCollection = db.collection<{ _id: string; last_updated: string }>(
      'meta',
    );

    console.log('🔄 Fetching station list from API...');
    const stationList =
      await fetchJsonWithRetry<RawStationListResponse>(STATIONS_URL);
    const stationCodes = Array.isArray(stationList.s) ? stationList.s : [];
    const totalStations = stationCodes.length;
    console.log(`✅ Retrieved ${totalStations} stations`);

    const progressBar = new cliProgress.SingleBar(
      {},
      cliProgress.Presets.shades_classic,
    );
    progressBar.start(totalStations, 0);

    let upsertCount = 0;
    let failedCount = 0;

    for (let i = 0; i < totalStations; i += CONCURRENCY) {
      const batch = stationCodes.slice(i, i + CONCURRENCY);

      const results = await Promise.all(
        batch.map(async station => {
          const stationCode = station.cd;
          if (!stationCode) {
            return { inserted: false, failed: true, stationCode: 'UNKNOWN' };
          }

          try {
            const stationDetail = await fetchJsonWithRetry<RawStationDetail>(
              `${DETAIL_URL_TEMPLATE}${stationCode}`,
            );

            const stationComment = (stationDetail.comment || '').replace(
              /\r<br \/>/g,
              '\n',
            );
            const carInfo = Array.isArray(stationDetail.carInfo)
              ? stationDetail.carInfo
              : [];
            const carFleet = carInfo.map(car => ({
              class_name: car.carClassName || '',
              car_name: car.carName || '',
              car_comments: (car.carComments || '').replace(/[\r\n]/g, ''),
            }));

            const [leafletLat, leafletLon] = parseStationCoordinates(station);

            const result = await collection.updateOne(
              { station_code: stationCode },
              {
                $set: {
                  station_code: stationCode,
                  station_name: station.nm || '',
                  latitude: leafletLat,
                  longitude: leafletLon,
                  address: stationDetail.adr1 || '',
                  station_comment: stationComment,
                  car_fleet: carFleet,
                  photo_urls: extractPhotoUrls(stationDetail),
                  disp1MonthReserveLabel:
                    station.disp1MonthReserveLabel || null,
                  disp3MonthReserveLabel:
                    station.disp3MonthReserveLabel || null,
                },
              },
              { upsert: true },
            );

            return {
              inserted: Boolean(result.upsertedId),
              failed: false,
              stationCode,
            };
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            console.error(
              `❌ Failed to process station ${stationCode}: ${message}`,
            );
            return { inserted: false, failed: true, stationCode };
          }
        }),
      );

      for (const result of results) {
        if (result.inserted) {
          upsertCount++;
        }
        if (result.failed) {
          failedCount++;
        }
        progressBar.increment();
      }
    }

    progressBar.stop();
    console.log(
      `✅ Processing complete. Total: ${totalStations}, Inserted: ${upsertCount}, Failed: ${failedCount}`,
    );
    if (failedCount > 0) {
      process.exitCode = 1;
    }

    await precomputeAnalytics(client);

    await metaCollection.updateOne(
      { _id: 'last_updated' },
      { $set: { last_updated: new Date().toISOString() } },
      { upsert: true },
    );
    console.log('✅ Fetch and precompute completed successfully');
  } catch (error) {
    console.error('❌ An error occurred while fetching station list:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

void fetchAndProcessData();
