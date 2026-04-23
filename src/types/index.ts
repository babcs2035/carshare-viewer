/**
 * アプリケーション共通型定義
 */

/** 車両情報 */
export interface Car {
  class_name: string; // 車種（軽，コンパクト等）
  car_name: string; // 車種名（会社別モデル）
  car_comments: string; // 備考
}

/** 地図・フィルター表示用の最小車両情報 */
export interface MapCar {
  class_name: string;
  car_name: string;
}

/** ステーション情報（MongoDB stations コレクション） */
export interface Station {
  _id: string; // MongoDB ObjectId（文字列化）
  station_code: string; // ステーション ID
  station_name: string; // ステーション名
  station_comment: string; // ステーション説明
  latitude: number; // 緯度（WGS84）
  longitude: number; // 経度（WGS84）
  address: string; // 住所
  car_fleet: Car[]; // 配置車両配列
  photo_urls: string[]; // 写真 URL リスト
  disp1MonthReserveLabel: string | null;
  disp3MonthReserveLabel: string | null;
}

/** 地図ピン・ツールチップ・フィルター表示用の最小ステーション情報 */
export interface MapStation {
  _id: string;
  station_code: string;
  station_name: string;
  latitude: number;
  longitude: number;
  address: string;
  prefecture: string;
  city: string;
  car_fleet: MapCar[];
}
