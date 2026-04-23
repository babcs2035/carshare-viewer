/**
 * フィルターパネルコンポーネント
 *
 * 地図表示ページでユーザーが都道府県・市区町村・車種を選択して結果を絞り込むための UI を提供
 * - 都道府県選択時に市区町村・車種が動的に更新
 * - 選択状態はプロップス（URL クエリ同期）で管理
 * - Chip で選択タグを表示，Dialog で詳細選択可能
 */

'use client';

import ClearIcon from '@mui/icons-material/Clear';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { MapStation } from '@/types';

interface FilterPanelProps {
  stations: MapStation[];
  selectedPrefecture: string;
  setSelectedPrefecture: (value: string) => void;
  selectedCity: string;
  setSelectedCity: (value: string) => void;
  selectedCarNames: string[];
  setSelectedCarNames: (value: string[]) => void;
  filteredCount: number;
}

export function FilterPanel({
  stations,
  selectedPrefecture,
  setSelectedPrefecture,
  selectedCity,
  setSelectedCity,
  selectedCarNames,
  setSelectedCarNames,
  filteredCount,
}: FilterPanelProps) {
  const theme = useTheme();
  const [isClient, setIsClient] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [openCityDialog, setOpenCityDialog] = useState(false);
  const [openCarDialog, setOpenCarDialog] = useState(false);

  const [tempSelectedPrefecture, setTempSelectedPrefecture] =
    useState(selectedPrefecture);
  const [tempSelectedCity, setTempSelectedCity] = useState(selectedCity);
  const [tempSelectedCarNames, setTempSelectedCarNames] =
    useState(selectedCarNames);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { prefectures, cities, groupedCarNames } = useMemo(() => {
    const prefectureSet = new Set<string>();
    const citySet = new Set<string>();
    const carData = new Map<string, string[]>();

    stations.forEach(s => {
      prefectureSet.add(s.prefecture);

      if (
        tempSelectedPrefecture === 'all' ||
        s.prefecture === tempSelectedPrefecture
      ) {
        citySet.add(s.city);
      }

      s.car_fleet.forEach(c => {
        if (!carData.has(c.class_name)) {
          carData.set(c.class_name, []);
        }
        if (!carData.get(c.class_name)?.includes(c.car_name)) {
          carData.get(c.class_name)?.push(c.car_name);
        }
      });
    });

    // 都道府県の標準的な順序
    const prefectureOrder = [
      '北海道',
      '青森県',
      '岩手県',
      '宮城県',
      '秋田県',
      '山形県',
      '福島県',
      '茨城県',
      '栃木県',
      '群馬県',
      '埼玉県',
      '千葉県',
      '東京都',
      '神奈川県',
      '新潟県',
      '富山県',
      '石川県',
      '福井県',
      '山梨県',
      '長野県',
      '岐阜県',
      '静岡県',
      '愛知県',
      '三重県',
      '滋賀県',
      '京都府',
      '大阪府',
      '兵庫県',
      '奈良県',
      '和歌山県',
      '鳥取県',
      '島根県',
      '岡山県',
      '広島県',
      '山口県',
      '徳島県',
      '香川県',
      '愛媛県',
      '高知県',
      '福岡県',
      '佐賀県',
      '長崎県',
      '熊本県',
      '大分県',
      '宮崎県',
      '鹿児島県',
      '沖縄県',
    ];

    // データにある都道府県のみを標準順序でソート
    const sortedPrefectures = prefectureOrder.filter(pref =>
      prefectureSet.has(pref),
    );

    const sortedCarNames: { [key: string]: string[] } = {};
    const order = ['ベーシック', 'ミドル', 'プレミアム'];
    order.forEach(cl => {
      if (carData.has(cl)) {
        sortedCarNames[cl] = carData.get(cl)?.sort() || [];
      }
    });

    return {
      prefectures: ['all', ...sortedPrefectures],
      cities: ['all', ...Array.from(citySet).sort()],
      groupedCarNames: sortedCarNames,
    };
  }, [stations, tempSelectedPrefecture]);

  const handleCityDialogOpen = () => {
    setTempSelectedPrefecture(selectedPrefecture);
    setTempSelectedCity(selectedCity);
    setOpenCityDialog(true);
  };
  const handleCityDialogClose = () => setOpenCityDialog(false);
  const handleCityDialogOk = () => {
    setSelectedPrefecture(tempSelectedPrefecture);
    setSelectedCity(tempSelectedCity);
    setOpenCityDialog(false);
  };

  const handleCarDialogOpen = () => {
    setTempSelectedCarNames(selectedCarNames);
    setOpenCarDialog(true);
  };
  const handleCarDialogClose = () => setOpenCarDialog(false);
  const handleCarDialogOk = () => {
    setSelectedCarNames(tempSelectedCarNames);
    setOpenCarDialog(false);
  };

  const handleSelectAllGroup = (group: string, isChecked: boolean) => {
    const groupNames = groupedCarNames[group] || [];
    if (isChecked) {
      setTempSelectedCarNames(prev => [...new Set([...prev, ...groupNames])]);
    } else {
      setTempSelectedCarNames(prev =>
        prev.filter(name => !groupNames.includes(name)),
      );
    }
  };

  const isGroupFullySelected = (group: string) => {
    const groupNames = groupedCarNames[group] || [];
    return (
      groupNames.length > 0 &&
      groupNames.every(name => tempSelectedCarNames.includes(name))
    );
  };

  const isCarSelected = (carName: string) =>
    tempSelectedCarNames.includes(carName);

  const handlePrefectureDelete = () => {
    setSelectedPrefecture('all');
    setSelectedCity('all');
  };
  const handleCityDelete = () => setSelectedCity('all');
  const handleCarNameDelete = (carNameToDelete: string) => {
    setSelectedCarNames(
      selectedCarNames.filter(name => name !== carNameToDelete),
    );
  };
  const handleClearAll = () => {
    setSelectedPrefecture('all');
    setSelectedCity('all');
    setSelectedCarNames([]);
  };

  const areFiltersActive =
    selectedPrefecture !== 'all' ||
    selectedCity !== 'all' ||
    selectedCarNames.length > 0;

  if (!isClient) {
    return null;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        width: {
          xs: 'calc(100% - 32px)',
          sm: 400,
        },
        transition: theme.transitions.create(['padding', 'width'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.shorter,
        }),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          p: 1.4,
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon sx={{ color: 'primary.main' }} />
          <Typography variant='h6' sx={{ fontWeight: 600 }}>
            ステーション検索
          </Typography>
        </Box>
        <IconButton size='small'>
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={isExpanded} timeout='auto' unmountOnExit>
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: 'center' }}
          >
            <Button
              variant='outlined'
              onClick={handleCityDialogOpen}
              startIcon={<LocationOnIcon />}
              fullWidth
            >
              エリア選択
            </Button>
            <Button
              variant='outlined'
              onClick={handleCarDialogOpen}
              startIcon={<DirectionsCarIcon />}
              fullWidth
            >
              車種選択
            </Button>
          </Stack>

          {areFiltersActive && (
            <Stack spacing={1.5} sx={{ mt: 2.5 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'text.secondary' }}
              >
                適用中のフィルター:
              </Typography>
              <Stack
                direction='row'
                spacing={1}
                useFlexGap
                sx={{ flexWrap: 'wrap' }}
              >
                {selectedPrefecture !== 'all' && (
                  <Chip
                    label={selectedPrefecture}
                    onDelete={handlePrefectureDelete}
                    color='primary'
                    size='small'
                  />
                )}
                {selectedCity !== 'all' && (
                  <Chip
                    label={selectedCity}
                    onDelete={handleCityDelete}
                    color='primary'
                    size='small'
                  />
                )}
                {selectedCarNames.map(name => (
                  <Chip
                    key={name}
                    label={name}
                    onDelete={() => handleCarNameDelete(name)}
                    color='secondary'
                    size='small'
                  />
                ))}
                <Button
                  onClick={handleClearAll}
                  startIcon={<ClearIcon />}
                  color='error'
                  size='small'
                  sx={{ ml: 'auto', textTransform: 'none' }}
                >
                  すべてクリア
                </Button>
              </Stack>
            </Stack>
          )}

          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography
              variant='body1'
              sx={{
                fontWeight: 600,
                color: 'primary.main',
                textAlign: 'center',
              }}
            >
              検索結果: {filteredCount.toLocaleString()} /{' '}
              {stations.length.toLocaleString()} 件
            </Typography>
          </Box>
        </Box>
      </Collapse>

      <Dialog
        open={openCityDialog}
        onClose={handleCityDialogClose}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>エリアを選択</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>都道府県</InputLabel>
              <Select
                value={tempSelectedPrefecture}
                label='都道府県'
                onChange={e => {
                  setTempSelectedPrefecture(e.target.value);
                  setTempSelectedCity('all');
                }}
              >
                {prefectures.map(pref => (
                  <MenuItem key={pref} value={pref}>
                    {pref === 'all' ? 'すべての都道府県' : pref}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth disabled={tempSelectedPrefecture === 'all'}>
              <InputLabel>市区町村</InputLabel>
              <Select
                value={tempSelectedCity}
                label='市区町村'
                onChange={e => setTempSelectedCity(e.target.value)}
              >
                {cities.map(city => (
                  <MenuItem key={city} value={city}>
                    {city === 'all' ? 'すべての市区町村' : city}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCityDialogClose}>キャンセル</Button>
          <Button onClick={handleCityDialogOk} variant='contained'>
            適用
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openCarDialog}
        onClose={handleCarDialogClose}
        fullWidth
        maxWidth='md'
      >
        <DialogTitle sx={{ fontWeight: 600 }}>車種を選択</DialogTitle>
        <DialogContent>
          <FormGroup>
            {Object.entries(groupedCarNames).map(([group, names]) => (
              <Paper
                key={group}
                variant='outlined'
                sx={{ mb: 2, p: 2, borderRadius: 2 }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isGroupFullySelected(group)}
                      onChange={e =>
                        handleSelectAllGroup(group, e.target.checked)
                      }
                      color='primary'
                    />
                  }
                  label={
                    <Typography
                      variant='subtitle1'
                      sx={{ fontWeight: 600, color: 'primary.main' }}
                    >
                      {group} (すべて選択)
                    </Typography>
                  }
                />
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    pl: 4,
                    mt: 1,
                  }}
                >
                  {names.map(name => (
                    <FormControlLabel
                      key={name}
                      control={
                        <Checkbox
                          checked={isCarSelected(name)}
                          onChange={e => {
                            if (e.target.checked) {
                              setTempSelectedCarNames(prev => [...prev, name]);
                            } else {
                              setTempSelectedCarNames(prev =>
                                prev.filter(n => n !== name),
                              );
                            }
                          }}
                          size='small'
                        />
                      }
                      label={<Typography variant='body2'>{name}</Typography>}
                    />
                  ))}
                </Box>
              </Paper>
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCarDialogClose}>キャンセル</Button>
          <Button onClick={handleCarDialogOk} variant='contained'>
            適用
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
