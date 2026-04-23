/**
 * ルートレイアウト
 *
 * 全ページ共通の構造：
 * - ヘッダー（AppBar with logo & navigation）
 * - MUI テーマプロバイダー
 * - デスクトップ・モバイルナビゲーション切り替え
 * - メタデータ・OGP・マニフェスト定義
 * - 最終更新日時表示
 */

import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { DesktopNavigation } from '@/components/DesktopNavigation';
import { MobileNavigation } from '@/components/MobileNavigation';
import ThemeRegistry from '@/components/ThemeRegistry';
import { getLastUpdatedDisplay } from '@/lib/meta';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#003366',
};

export const metadata: Metadata = {
  title: {
    default: 'carshare-viewer | 全国のカーシェア情報を地図や検索で見やすく確認',
    template: '%s | carshare-viewer',
  },
  icons: {
    icon: '/carshare-viewer/favicon.png',
    apple: '/carshare-viewer/favicon.png',
  },
  manifest: '/carshare-viewer/manifest.json',
  description: '全国のカーシェア情報を地図や検索で見やすく確認',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'carshare-viewer',
  },
  formatDetection: {
    telephone: false,
  },
  keywords: [],
  openGraph: {
    title: 'carshare-viewer | 全国のカーシェア情報を地図や検索で見やすく確認',
    description: '全国のカーシェア情報を地図や検索で見やすく確認',
    url: 'https://ktak.dev/carshare-viewer',
    siteName: 'carshare-viewer',
    images: [
      {
        url: 'https://ktak.dev/carshare-viewer/ogp.webp',
        width: 1200,
        height: 630,
        alt: 'carshare-viewer OGP Image',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'carshare-viewer | 全国のカーシェア情報を地図や検索で見やすく確認',
    description: '全国のカーシェア情報を地図や検索で見やすく確認',
    images: ['https://ktak.dev/carshare-viewer/ogp.webp'],
  },
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lastUpdatedDisplay = await getLastUpdatedDisplay();

  return (
    <html lang='ja'>
      <body className={inter.className}>
        <ThemeRegistry>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100vh',
            }}
          >
            <AppBar
              position='sticky'
              elevation={0}
              sx={{
                background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Toolbar>
                <Typography
                  variant='h6'
                  component='div'
                  sx={{
                    flexGrow: 1,
                    fontWeight: 700,
                    letterSpacing: '-0.5px',
                  }}
                >
                  <Link
                    href='/'
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    🚗 carshare-viewer
                  </Link>
                </Typography>

                <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                  <DesktopNavigation lastUpdatedDisplay={lastUpdatedDisplay} />
                </Box>

                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                  <MobileNavigation lastUpdatedDisplay={lastUpdatedDisplay} />
                </Box>
              </Toolbar>
            </AppBar>

            <Box
              component='main'
              sx={{ flexGrow: 1, backgroundColor: 'background.default' }}
            >
              {children}
            </Box>
          </Box>
        </ThemeRegistry>
      </body>
    </html>
  );
}
