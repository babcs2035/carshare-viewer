/**
 * メタデータ・最終更新日時取得
 *
 * MongoDB meta コレクションから fetch スクリプト実行時刻を取得
 * ハッダー・ナビゲーションメニューで最終更新日時表示用
 */

import { getDatabase } from './mongodb';

interface LastUpdatedMetaDoc {
  _id: 'last_updated';
  last_updated?: string;
}

const lastUpdatedFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Tokyo',
});

/** MongoDB meta コレクションから最終更新日時を取得し，日本時刻フォーマットで返却 */
export async function getLastUpdatedDisplay(): Promise<string | null> {
  try {
    const db = await getDatabase();
    const meta = await db
      .collection<LastUpdatedMetaDoc>('meta')
      .findOne(
        { _id: 'last_updated' },
        { projection: { _id: 0, last_updated: 1 } },
      );

    if (!meta?.last_updated) {
      return null;
    }

    const lastUpdated = new Date(meta.last_updated);
    if (Number.isNaN(lastUpdated.getTime())) {
      return null;
    }

    return lastUpdatedFormatter.format(lastUpdated);
  } catch {
    return null;
  }
}
