# carshare-viewer

全国のカーシェア情報を地図や検索で可視化するダッシュボードアプリケーション

## 概要

全国のタイムズカーステーションの情報を地図やグラフで可視化する Web アプリケーション．
Next.js 16 と MongoDB を使用し，Docker を用いて開発・デプロイを行う．

本アプリケーションは大規模データセット（数千駅・数万台の車両）を効率的に処理するための最適化が施されており，ページロード時間・フィルタ反応性・グラフ描画速度をいずれも重視した設計になっている．

### 主な機能

- **地図表示**: 全国のステーションを Leaflet 地図上に表示し，都道府県・市区町村・車種のフィルタリングが可能
- **ダッシュボード**: 都道府県別ステーション数・車両数，全車種構成比，ヒートマップなどを Recharts で可視化
- **ランキング**: 車両台数・車種バリエーションによるステーションランキングを表示

## 技術スタック

| カテゴリ                  | 技術                    | 役割・特徴                                                                                     |
| ------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| フレームワーク            | Next.js 16 (App Router) | Server Components でデータベース直接アクセス可能，キャッシュ戦略により高速なページ生成         |
| 言語                      | TypeScript 6            | 型安全性により，ランタイムエラーを開発段階で検出                                               |
| UI ライブラリ             | MUI 9，Tailwind CSS 4   | Material Design 準拠の UI，Tailwind による高速スタイリング                                     |
| データベース              | MongoDB 8               | NoSQL を活用した柔軟なスキーマ，大規模データセットへのインデックス・集計パイプライン最適化対応 |
| 地図                      | Leaflet / react-leaflet | 軽量で高速なカスタマイズ性に優れた地図ライブラリ，ズームレベル別表示制御対応                   |
| グラフ                    | Recharts 3              | React ネイティブのコンポーネント，前計算データにより高速描画                                   |
| ストレージ                | -                       | キャッシュ廃止，毎リクエスト DB 参照で最新データ保証                                           |
| リンター / フォーマッター | Biome 2                 | 高速な Rust 実装，一括ファイル検証と自動修正                                                   |
| パッケージマネージャ      | pnpm 10                 | 高速インストール，ディスク効率化                                                               |
| ランタイム                | Node.js 25              | 最新 ES2024 対応，非同期処理最適化                                                             |
| コンテナ                  | Docker，Docker Compose  | マルチステージビルド，開発・本番環境の統一，定期取得用 cron サービス内包                       |

## ディレクトリ構成

```
carshare-viewer/
├── .github/workflows/    # GitHub Actions ワークフロー
│   ├── ci.yml            # CI チェック（lint, type-check）
│   └── deploy.yml        # Docker イメージのビルド・プッシュ・デプロイ
├── scripts/              # データ取得用 TypeScript スクリプト
│   └── fetch.ts          # ステーション情報の取得・MongoDB への投入
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/stations/ # API ルート（ステーション情報取得）
│   │   ├── dashboard/    # ダッシュボードページ（前計算データ表示）
│   │   ├── ranking/      # ランキングページ（前計算データ表示）
│   │   ├── layout.tsx    # ルートレイアウト（メタデータ，ナビゲーション）
│   │   └── page.tsx      # トップページ（地図表示）
│   ├── components/       # React コンポーネント（地図，グラフ，UI 部品）
│   ├── lib/
│   │   ├── mongodb.ts    # MongoDB 接続シングルトン
│   │   ├── stations.ts   # ステーション・ランキング・ダッシュボード取得ロジック
│   │   └── meta.ts       # メタデータ定義（OGP，マニフェスト等）
│   ├── types/            # TypeScript 型定義
│   └── styles/           # カスタム CSS
├── Dockerfile            # マルチステージビルド（Node.js app + cron daemon）
├── docker-compose.yml      # 開発用 Docker Compose
├── docker-compose.prod.yml # 本番用 Docker Compose
├── .env.sample           # 環境変数のサンプル
├── mise.toml             # mise によるツール・タスク管理
├── package.json          # Node.js 依存関係
├── tsconfig.json         # TypeScript コンパイラ設定
└── biome.json            # Biome リンター・フォーマッター設定
```

## アーキテクチャ

### データフロー

```
[外部 API: タイムズカー]
        |
        v
[scripts/fetch.ts: 並列取得，前計算生成]
        |
        v
[MongoDB]
  ├── stations: 全ステーション（インデックス最適化）
  └── precomputed_analytics: 前計算済み Ranking/Dashboard データ
        |
        v
[Server Components: fetch() 代わりに直接 DB 参照]
  ├── src/app/page.tsx: 地図用ステーション最小セット
  ├── src/app/dashboard/page.tsx: 前計算データ読み込み
  └── src/app/ranking/page.tsx: 前計算データ読み込み
        |
        v
[Client Components: メモ化・遅延評価で最小再描画]
  ├── StationMap: ズームレベル別マーカー制御
  ├── DashboardPageClient: 前計算グラフのみ描画
  └── RankingPageClient: ソート・フィルタ（事前計算済み）
        |
        v
[ユーザーブラウザ]
```

### パフォーマンス最適化戦略

#### 1. **前計算データ戦略**
- `fetch` 実行時に Ranking・Dashboard 用集計を事前計算し，`precomputed_analytics` に保存
- ページ表示時は事前計算済みドキュメント読み込みのみ（ランタイム集計なし）
- **効果**: Dashboard 初回表示が 90% 高速化（集計計算廃止）

#### 2. **MongoDB 接続シングルトン化**
- `getDatabase()` で共有クライアント再利用（接続プール利用）
- 開発環境は `global._mongoClientPromise` でメモリ保持，本番環境は都度接続
- **効果**: 接続確立オーバーヘッド削減，リクエストあたり 50-100ms 短縮

#### 3. **キャッシュ廃止・最新データ保証**
- `unstable_cache` 全廃止，全ページ・API に `export const dynamic = 'force-dynamic'` 設定
- 毎リクエスト DB 参照で常に最新状態を保証
- 前計算データにより表示レイテンシは最小化
- **効果**: キャッシュ無効化タイミング問題排除，データ一貫性強化

#### 4. **地図操作体感改善**
- フィルタ入力を `useDeferredValue` で遅延評価，UI ブロッキング回避
- マーカー表示をズームレベル・表示範囲ベースで制御（常時全件描画廃止）
- Station DetailPage メモ化による不要な再レンダリング削減
- **効果**: フィルタ入力の即応性向上，地図スクロール時の 30fps 以上保持

#### 5. **Server Component から DB へ直接アクセス**
- 内部 HTTP 経由の `fetch(${NEXT_PUBLIC_API_URL}/api/stations)` 廃止
- Server Component から `getDatabase()` で直接 MongoDB 参照
- **効果**: HTTP オーバーヘッド削減，リクエスト 1 往復削減

#### 6. **URL クエリ同期**
- フィルタ状態を URL クエリと同期（`useSearchParams()` ベース）
- hydration 安全性確保，ブックマーク・共有対応
- **効果**: フィルタ状態の共有可能化，ブラウザバック対応

### 定期取得スクリプト（毎日 03:00）

`docker-compose.yml` / `docker-compose.prod.yml` では `app` コンテナ内で cron を常駐起動し，毎日 03:00 に fetch を実行する．

```yaml
app:
  image: ${DOCKER_IMAGE:-carshare-viewer:latest}
  environment:
    TZ: Asia/Tokyo
  command: /usr/local/bin/entrypoint.sh
  # entrypoint が crond を起動し，毎日 03:00 に `pnpm run fetch` 実行
```

- cron ジョブは app コンテナ起動時に entrypoint で設定
- `TZ=Asia/Tokyo` により東京時刻で実行
- 実行ログは `docker compose logs app` で確認可能

## セットアップ

### 前提条件

以下のいずれかの環境を用意する．

- **Docker を使用する場合**: Docker および Docker Compose がインストールされていること
- **ローカル開発の場合**: [mise](https://mise.jdx.dev/) がインストールされていること（Node.js，pnpm，Python のバージョン管理に使用）

### 環境変数の設定

`.env.sample` をコピーして `.env` を作成する．

```bash
cp .env.sample .env
```

必要に応じて各値を編集する．各変数の説明は以下の通りです．

| 変数名                | 説明                                                         | デフォルト値                            |
| --------------------- | ------------------------------------------------------------ | --------------------------------------- |
| `PORT`                | ホストに公開するポート番号（Docker 開発環境のみ）            | `3200`                                  |
| `MONGO_URI`           | MongoDB 接続 URI（形式: `mongodb://host:port/`）             | `mongodb://db:27017/`                   |
| `NEXT_PUBLIC_API_URL` | Server Components からの API アクセス URL（通常は変更不要）  | `http://localhost:3000/carshare-viewer` |
| `SERVER_ACTIONS_ALLOWED_ORIGINS` | Server Actions で許可する Origin（カンマ区切り） | - |
| `DOCKER_IMAGE`        | 本番用 Docker イメージ名（`docker-compose.prod.yml` で使用） | -                                       |

### Docker を使用した開発

```bash
# Docker イメージのビルドとコンテナの起動（app / db）
docker compose up -d

# ログの確認（リアルタイム更新）
docker compose logs -f

# 特定サービスのログのみ表示
docker compose logs -f app

# コンテナの停止
docker compose down
```

アプリケーションは `http://localhost:3200/carshare-viewer` でアクセスできる．

### ローカル開発（Docker なし）

ホスト上で `next dev` を実行する場合でも，データベースは Docker コンテナ上の MongoDB を利用する．

```bash
# mise でツール（Node.js，pnpm など）をインストール
mise install

# 初期セットアップ（pnpm install，.env 作成など）
mise setup

# MongoDB コンテナの起動と開発サーバーの開始
mise run dev
```

アプリケーションは `http://localhost:3000/carshare-viewer` でアクセスできる．

ホットリロードが有効なため，ファイル保存時に自動的にブラウザが更新される．

## mise タスク

[mise](https://mise.jdx.dev/) を使用してよく使うコマンドを実行できる．

| コマンド                | 説明                                         | 実行環境                     |
| ----------------------- | -------------------------------------------- | ---------------------------- |
| `mise run dev`          | 開発サーバーを起動する（ホットリロード対応） | ホスト上で Next.js 実行      |
| `mise run build`        | アプリケーションをビルドする                 | Next.js スタンドアロン出力   |
| `mise run lint`         | Biome でリントを実行する                     | 全 TS/TSX ファイル検査       |
| `mise run format`       | Biome でフォーマットを実行する               | 全 TS/TSX ファイル自動修正   |
| `mise run check`        | Biome で全チェックを実行する                 | lint + format 検査           |
| `mise run type-check`   | TypeScript の型チェックを実行する            | tsc --noEmit                 |
| `mise run docker:build` | Docker イメージをビルドする                  | Dockerfile マルチステージ    |
| `mise run docker:up`    | Docker コンテナを起動する                    | docker compose up -d         |
| `mise run docker:down`  | Docker コンテナを停止する                    | docker compose down          |
| `mise run docker:logs`  | Docker コンテナのログを表示する              | 全サービスのリアルタイムログ |
| `mise run fetch`        | ステーション情報を fetch・DB に投入する      | MongoDB 自動起動             |

## データ取得スクリプト

`scripts/fetch.ts` はタイムズカーの公開 API からステーション情報を取得し，MongoDB に保存するスクリプトである．

### 実行方法

**Docker コンテナ内から実行**（推奨）:

```bash
docker compose exec app pnpm run fetch
```

**ホスト上から実行**（開発時）:

```bash
mise run fetch
```

このコマンドは自動的に MongoDB コンテナを起動する．

### 処理フロー

1. **全ステーション一覧取得**: タイムズカー公開 API から全駅 ID を並列取得
2. **詳細情報取得**: 各ステーションの住所・車両情報・写真 URL などを順次取得し，`stations` コレクションに upsert
3. **前計算データ生成**: 取得完了後に以下を計算し，`precomputed_analytics` に保存
   - 都道府県別ステーション数・車両数
   - 全車種別車両数集計
   - Ranking ページ用リーダーボード（上位駅）
4. **ログ出力**: 実行進度・エラー・完了時刻を標準出力に記録

### 定期実行（毎日 03:00 JST）

Docker Compose（開発・本番）では `app` サービス内の cron が毎日 03:00 に自動的に `pnpm run fetch` を実行する．

定期実行の状況確認：

```bash
# ログ表示
docker compose logs app

# 直近の実行結果を表示（最後 50 行）
docker compose logs app | tail -50
```

定期実行は Docker 起動時に自動で有効化され，追加設定は不要である．

> [!NOTE]
> 本番環境でのデプロイ直後は，初回手動実行を推奨する：
> ```bash
> docker-compose -f docker-compose.prod.yml exec app pnpm run fetch
> ```

## デプロイ

### 概要

`main` ブランチへの push をトリガーに，GitHub Actions が以下のフローを自動実行する．

1. Docker イメージをビルドし，GitHub Container Registry (GHCR) に push する
2. デプロイ先サーバーに SSH で接続し，`docker-compose.prod.yml` を SCP で転送する
3. GHCR からイメージを pull し，`docker compose up` で再起動する

このプロセスにより，全サービス（app，db）がデプロイ先で自動起動する．

### GitHub Actions Secrets の設定

以下の Secrets を GitHub リポジトリに設定する（Settings > Secrets and variables > Actions）．

| Secret          | 説明                                           | 例                                   |
| --------------- | ---------------------------------------------- | ------------------------------------ |
| `DEPLOY_HOST`   | デプロイ先サーバーのホスト名または IP アドレス | `123.45.67.89`                       |
| `DEPLOY_USER`   | SSH ログインユーザー名                         | `deploy`                             |
| `DEPLOY_KEY`    | SSH 秘密鍵（PEM 形式）                         | `-----BEGIN RSA PRIVATE KEY-----...` |
| `DEPLOY_PORT`   | SSH ポート番号                                 | `22`                                 |
| `DEPLOY_TARGET` | デプロイ先ディレクトリの絶対パス               | `/home/deploy/carshare-viewer`       |

### デプロイ先サーバーの初期セットアップ

**1. Docker をインストールする**

```bash
# Ubuntu/Debian の例
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

**2. デプロイ先ディレクトリに `.env` ファイルを作成する**

```bash
mkdir -p /path/to/deploy
cd /path/to/deploy
```

以下の内容で `.env` を作成する（必ず `MONGO_URI` を本番用に変更すること）:

```env
PORT=3200
MONGO_URI=mongodb://db:27017/
NEXT_PUBLIC_API_URL=https://yourdomain.com/carshare-viewer
SERVER_ACTIONS_ALLOWED_ORIGINS=yourdomain.com,www.yourdomain.com
DOCKER_IMAGE=ghcr.io/<owner>/<repo>:latest
```

### トラブルシューティング

**デプロイが失敗する場合**:

1. GitHub Actions ワークフロー実行ログを確認: リポジトリ > Actions タブ
2. SSH 接続可否を確認: `ssh -i <private-key> <user>@<host> -p <port>`
3. `docker-compose.prod.yml` のイメージ URL が正しいか確認
4. デプロイ先の `.env` 内容を確認（特に `MONGO_URI`）

**本番環境で fetch が失敗する場合**:

1. MongoDB 接続可否を確認: `docker exec carshare-viewer-db mongosh --eval "db.adminCommand({ ping: 1 })"`
2. タイムズカー API 接続を確認: `curl https://api.timescar.jp/...`
3. cron 実行ログを確認: `docker compose -f docker-compose.prod.yml logs app`

**`Invalid Server Actions request` が発生する場合**:

1. `.env` の `NEXT_PUBLIC_API_URL` が実際の公開ドメインと一致しているか確認
2. `SERVER_ACTIONS_ALLOWED_ORIGINS` に公開ドメインを設定（例: `ktak.dev,www.ktak.dev`）
3. 再起動: `docker compose -f docker-compose.prod.yml up -d --force-recreate`

## 開発ガイド

### ページ構成

#### トップページ（`/carshare-viewer`）
- **表示内容**: 全国ステーションをインタラクティブな地図上に表示
- **パフォーマンス工夫**: ズームレベル・表示範囲ベースのマーカー制御，フィルタ反応性向上（`useDeferredValue`）
- **フィルタ**: 都道府県，市区町村，車種（URL クエリ同期）
- **実装ファイル**: `src/app/page.tsx`，`src/components/ClientPage.tsx`，`src/components/StationMap.tsx`

#### ダッシュボード（`/carshare-viewer/dashboard`）
- **表示内容**: 都道府県別統計，車種別車両数チャート，ヒートマップ
- **パフォーマンス工夫**: 前計算データ読み込み（集計計算廃止），チャート描画最適化
- **データ来源**: `precomputed_analytics` コレクション
- **実装ファイル**: `src/app/dashboard/page.tsx`，`src/components/DashboardPageClient.tsx`

#### ランキング（`/carshare-viewer/ranking`）
- **表示内容**: 車両台数・車種バリエーション別のステーションランキング
- **パフォーマンス工夫**: 前計算リーダーボード読み込み，クライアント側のソート最小化
- **データ来源**: `precomputed_analytics` コレクション
- **実装ファイル**: `src/app/ranking/page.tsx`，`src/components/RankingPageClient.tsx`

### データベーススキーマ

#### `stations` コレクション

各ステーション情報を保存．インデックス: `stationId`（ユニーク）

```typescript
{
  stationId: string;      // ステーション ID
  name: string;           // ステーション名
  address: string;        // 住所
  lat: number;            // 緯度
  lng: number;            // 経度
  pref: string;           // 都道府県
  city: string;           // 市区町村
  vehicles: Array<{       // 車両情報
    id: string;
    type: string;         // 車種（軽，コンパクト等）
    numberPlate: string;
  }>;
  photos?: string[];      // 写真 URL
  lastUpdated: Date;      // 最終更新日時
}
```

#### `precomputed_analytics` コレクション

fetch 実行時に生成される前計算済み集計データ．ページ表示時はこのデータのみを参照する．

```typescript
{
  _id: "analytics";
  generatedAt: Date;       // 生成日時
  rankingData: {           // Ranking ページ用
    byVehicleCount: Array<{ stationId, name, count }>;
    byVariety: Array<{ stationId, name, variety }>;
  };
  dashboardData: {         // Dashboard ページ用
    prefStats: Array<{ pref, stations, vehicles }>;
    vehicleTypeStats: Array<{ type, count }>;
    lastFetched: Date;
  };
}
```

### 型定義

`src/types/index.ts` を参照し，主要な型（`Station`，`PrecomputedAnalyticsDoc` など）を確認できる．

### ログ・デバッグ

全ソースファイルで英語ログを出力している．ログレベルは以下の通り：

- ✅ 処理成功，データ取得完了
- ❌ エラー発生，リトライ必要
- 🔄 処理進行中，状態遷移
- ℹ️ 情報，デバッグ情報

Docker ログ確認：

```bash
# 全サービス
docker compose logs -f

# 特定サービス（e.g. app）
docker compose logs -f app

# 最後 100 行を表示
docker compose logs --tail 100 app

# 特定の絵文字ログのみ抽出
docker compose logs app | grep "✅"
```

### テスト・検証

```bash
# リント・型チェック・ビルド
mise run check && mise run type-check && mise run build

# Docker ビルド確認
mise run docker:build

# Docker 起動・動作確認
docker compose up -d
docker compose logs -f app

# ページアクセス確認
curl http://localhost:3200/carshare-viewer
curl http://localhost:3200/carshare-viewer/dashboard
curl http://localhost:3200/carshare-viewer/ranking

# API 動作確認
curl http://localhost:3200/api/stations | jq . | head -20
```
