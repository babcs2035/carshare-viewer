/**
 * トップページ Client Component
 *
 * 主な機能：
 * - Server Action で取得した地図表示用最小データを利用
 * - フィルター状態管理（都道府県・市区町村・車種）
 * - URL クエリ同期（history.replaceState を使用）
 * - ステーション詳細はクリック時に Server Action で単体取得
 */

'use client';

import {
  Box,
  CircularProgress,
  Container,
  Dialog,
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import dynamic from 'next/dynamic';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getStationDetailByCodeAction } from '@/app/actions/stations';
import { FilterPanel } from '@/components/FilterPanel';
import type { MapStation, Station } from '@/types';

const StationMap = dynamic(
  () => import('@/components/StationMap').then(mod => mod.StationMap),
  {
    ssr: false,
    loading: () => (
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f0f0f0',
        }}
      >
        <CircularProgress />
      </Box>
    ),
  },
);

const StationDetailPage = dynamic(
  () =>
    import('@/components/StationDetailPage').then(mod => mod.StationDetailPage),
  {
    ssr: false,
    loading: () => (
      <Box
        sx={{
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <CircularProgress size={28} />
      </Box>
    ),
  },
);

interface ClientPageProps {
  allStations: MapStation[];
  initialFilters: {
    prefecture: string;
    city: string;
    carNames: string[];
  };
}

export function ClientPage({ allStations, initialFilters }: ClientPageProps) {
  const [isClient, setIsClient] = useState(false);
  const [selectedStationCode, setSelectedStationCode] = useState<string | null>(
    null,
  );
  const [stationDetails, setStationDetails] = useState<Record<string, Station>>(
    {},
  );
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void import('@/components/StationDetailPage');
      void import('react-responsive-carousel');
    }, 1200);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  const [selectedPrefecture, setSelectedPrefecture] = useState<string>(
    initialFilters.prefecture,
  );
  const [selectedCity, setSelectedCity] = useState<string>(initialFilters.city);
  const [selectedCarNames, setSelectedCarNames] = useState<string[]>(
    initialFilters.carNames,
  );
  const deferredPrefecture = useDeferredValue(selectedPrefecture);
  const deferredCity = useDeferredValue(selectedCity);
  const deferredCarNames = useDeferredValue(selectedCarNames);

  const stationCarNames = useMemo(() => {
    return new Map(
      allStations.map(station => [
        station._id,
        new Set(station.car_fleet.map(car => car.car_name)),
      ]),
    );
  }, [allStations]);

  const filteredStations = useMemo(() => {
    return allStations.filter(station => {
      const prefectureMatch =
        deferredPrefecture === 'all' ||
        station.prefecture === deferredPrefecture;
      const cityMatch = deferredCity === 'all' || station.city === deferredCity;
      const nameMatch =
        deferredCarNames.length === 0 ||
        deferredCarNames.some(selectedName =>
          stationCarNames.get(station._id)?.has(selectedName),
        );
      return prefectureMatch && cityMatch && nameMatch;
    });
  }, [
    allStations,
    deferredPrefecture,
    deferredCity,
    deferredCarNames,
    stationCarNames,
  ]);

  const handleOpenDetails = useCallback(
    async (station: MapStation) => {
      setSelectedStationCode(station.station_code);
      if (stationDetails[station.station_code]) {
        return;
      }

      setIsDetailLoading(true);
      try {
        const detail = await getStationDetailByCodeAction(station.station_code);
        if (!detail) {
          throw new Error('Station detail not found');
        }
        setStationDetails(prev => ({
          ...prev,
          [station.station_code]: detail,
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to fetch detail';
        console.error(`❌ Failed to load station detail: ${message}`);
      } finally {
        setIsDetailLoading(false);
      }
    },
    [stationDetails],
  );

  const handleCloseDetails = useCallback(() => {
    setSelectedStationCode(null);
    setIsDetailLoading(false);
  }, []);

  const selectedStation = selectedStationCode
    ? (stationDetails[selectedStationCode] ?? null)
    : null;

  useEffect(() => {
    if (!isClient) {
      return;
    }

    const timerId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);

      if (selectedPrefecture !== 'all') {
        params.set('pref', selectedPrefecture);
      } else {
        params.delete('pref');
      }

      if (selectedCity !== 'all') {
        params.set('city', selectedCity);
      } else {
        params.delete('city');
      }

      if (selectedCarNames.length > 0) {
        params.set('cars', selectedCarNames.join(','));
      } else {
        params.delete('cars');
      }

      const query = params.toString();
      const nextUrl = query
        ? `${window.location.pathname}?${query}`
        : window.location.pathname;
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (nextUrl !== currentUrl) {
        window.history.replaceState(null, '', nextUrl);
      }
    }, 120);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isClient, selectedPrefecture, selectedCity, selectedCarNames]);

  return (
    <Container
      maxWidth={false}
      sx={{
        height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 0 },
        position: 'relative',
      }}
    >
      <FilterPanel
        stations={allStations}
        selectedPrefecture={selectedPrefecture}
        setSelectedPrefecture={setSelectedPrefecture}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        selectedCarNames={selectedCarNames}
        setSelectedCarNames={setSelectedCarNames}
        filteredCount={filteredStations.length}
      />
      {isClient ? (
        <>
          <StationMap
            stations={filteredStations}
            onOpenDetails={handleOpenDetails}
          />
          {isMobile ? (
            <Drawer
              anchor='bottom'
              open={!!selectedStationCode}
              onClose={handleCloseDetails}
              sx={{
                '& .MuiDrawer-paper': {
                  maxHeight: '80vh',
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                },
              }}
            >
              {selectedStation ? (
                <StationDetailPage station={selectedStation} />
              ) : isDetailLoading ? (
                <Box
                  sx={{
                    minHeight: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 3,
                  }}
                >
                  <CircularProgress size={28} />
                </Box>
              ) : null}
            </Drawer>
          ) : (
            <Dialog
              open={!!selectedStationCode}
              onClose={handleCloseDetails}
              maxWidth='md'
              fullWidth
            >
              {selectedStation ? (
                <StationDetailPage station={selectedStation} />
              ) : isDetailLoading ? (
                <Box
                  sx={{
                    minHeight: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 3,
                  }}
                >
                  <CircularProgress size={28} />
                </Box>
              ) : null}
            </Dialog>
          )}
        </>
      ) : (
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f0f0f0',
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Container>
  );
}
