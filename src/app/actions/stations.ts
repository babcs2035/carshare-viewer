'use server';

import { getMapStations, getStationsByCodes } from '@/lib/stations';
import type { MapStation, Station } from '@/types';

/** 地図表示用の最小ステーション情報を取得する Server Action */
export async function getMapStationsAction(): Promise<MapStation[]> {
  return getMapStations();
}

/** ステーション詳細をコード指定で 1 件取得する Server Action */
export async function getStationDetailByCodeAction(
  stationCode: string,
): Promise<Station | null> {
  const code = stationCode.trim();
  if (!code) {
    return null;
  }
  const stations = await getStationsByCodes([code]);
  return stations[0] ?? null;
}
