/**
 * MongoDB シングルトン接続
 *
 * 接続プール管理：
 * - 開発環境：global._mongoClientPromise でメモリ保持，ホットリロード時の再接続を防止
 * - 本番環境：毎リクエスト接続（接続プール利用で効率化）
 *
 * ServerApi v1 を使用し，トランザクション・セッション・サーバーコマンド対応
 */

import {
  MongoClient,
  type MongoClientOptions,
  ServerApiVersion,
} from 'mongodb';

const uri = process.env.MONGO_URI;

if (!uri) {
  throw new Error('MONGO_URI is not defined.');
}

const options: MongoClientOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/** carshare-viewer DB インスタンスを取得（接続プール再利用） */
export async function getDatabase() {
  const connectedClient = await clientPromise;
  return connectedClient.db('carshare-viewer');
}
