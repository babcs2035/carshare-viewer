# ==============================================
# マルチステージビルド：Next.js standalone
# ==============================================

# ── ベースイメージ ──
FROM node:25-alpine AS base
RUN npm install -g pnpm@10.33.0

# ── 依存関係インストール ──
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ── アプリケーションビルド ──
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ビルド時に必要な環境変数を設定
# NEXT_PUBLIC_ 変数はクライアントバンドルへ埋め込まれる
# MONGO_URI はビルド時に必要（MongoDB 接続確認のため）
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/carshare-viewer
ARG MONGO_URI=mongodb://db:27017/

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV MONGO_URI=${MONGO_URI}

RUN pnpm build

# ── 実行ステージ ──
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# scripts を含める（Node.js スクリプトとして実行）
COPY scripts ./scripts
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
# node_modules も必要な場合がある（scripts 内で tsx や依存を使用するため）
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./

# standalone 出力・静的ファイル・公開アセットをコピー
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN mkdir -p /app/crontabs && \
    chmod +x /usr/local/bin/entrypoint.sh && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["/usr/local/bin/entrypoint.sh"]
