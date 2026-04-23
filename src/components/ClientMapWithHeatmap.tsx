/**
 * ヒートマップ表示地図
 *
 * Dashboard ページで車両密度をヒートマップで可視化
 * - OpenStreetMap タイルレイヤー
 * - HeatmapLayer でジオ座標・車両数密度を表示
 * - SSR 無効（Leaflet ブラウザ API 依存）
 */

'use client';

import { MapContainer, TileLayer } from 'react-leaflet';
import { HeatmapLayer } from '@/components/HeatmapLayer';
import 'leaflet/dist/leaflet.css';

// Define the props structure for the component
interface ClientMapWithHeatmapProps {
  heatmapData: [number, number, number][];
}

// This component is a client-side wrapper for the entire map and heatmap
export function ClientMapWithHeatmap({
  heatmapData,
}: ClientMapWithHeatmapProps) {
  return (
    <MapContainer
      center={[35.6895, 139.6917]}
      zoom={5}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <HeatmapLayer points={heatmapData} />
    </MapContainer>
  );
}
