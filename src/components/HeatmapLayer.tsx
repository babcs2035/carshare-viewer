/**
 * Leaflet.heat プラグイン統合
 *
 * [緯度，経度，強度] 形式のデータポイント配列をヒートマップレイヤーとして描画
 * - Leaflet.heat ライブラリを動的に読み込み・初期化
 * - 車両密度を色勾配（青→赤）で表現
 */

'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import 'leaflet.heat';
import L from 'leaflet';
import '@/styles/leaflet-custom.css';

// Define the type for the points prop
type HeatmapLayerProps = {
  points: [number, number, number][];
};

export function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    // Create the heat layer with the provided points
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 18,
    });

    // Add the layer to the map
    map.addLayer(heatLayer);

    // Cleanup function to remove the layer when the component unmounts or points change
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]); // Rerun effect if map instance or points change

  return null; // This component does not render anything itself
}
