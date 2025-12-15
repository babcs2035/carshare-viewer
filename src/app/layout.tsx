import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { DesktopNavigation } from '@/components/DesktopNavigation';
import { MobileNavigation } from '@/components/MobileNavigation';
import ThemeRegistry from '@/components/ThemeRegistry';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Times Car App',
  description: 'Times Car Station Viewer - 全国のタイムズカーステーション情報',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
                    🚗 Times Car App
                  </Link>
                </Typography>

                <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                  <DesktopNavigation />
                </Box>

                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                  <MobileNavigation />
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
