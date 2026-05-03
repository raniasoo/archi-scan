"use client"

import { useState, useMemo } from "react"
import { MapPin, Maximize2 } from "lucide-react"

interface SiteMapPreviewProps {
  lng: number
  lat: number
  address?: string
  className?: string
}

type MapMode = 'cadastral' | 'satellite' | 'map'

const VWORLD_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'

export function SiteMapPreview({ lng, lat, address, className = "" }: SiteMapPreviewProps) {
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<MapMode>('cadastral')

  // Leaflet + VWorld 타일을 사용하는 HTML 생성
  const mapHtml = useMemo(() => {
    const height = expanded ? '100%' : '100%'
    // VWorld 타일 URL
    const baseLayers: Record<MapMode, { url: string; label: string }> = {
      cadastral: {
        url: `https://api.vworld.kr/req/wmts/get?service=WMTS&request=GetTile&version=1.0.0&layer=Base&style=default&tilematrixset=EPSG:3857&TileMatrix={z}&TileRow={y}&TileCol={x}&format=image/png&key=${VWORLD_KEY}&domain=v0-archi-scan-layout-generator.vercel.app`,
        label: '지적도',
      },
      satellite: {
        url: `https://api.vworld.kr/req/wmts/get?service=WMTS&request=GetTile&version=1.0.0&layer=Satellite&style=default&tilematrixset=EPSG:3857&TileMatrix={z}&TileRow={y}&TileCol={x}&format=image/jpeg&key=${VWORLD_KEY}&domain=v0-archi-scan-layout-generator.vercel.app`,
        label: '위성',
      },
      map: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        label: '일반',
      },
    }

    const cadastralOverlay = `https://api.vworld.kr/req/wmts/get?service=WMTS&request=GetTile&version=1.0.0&layer=lt_c_cadastral&style=default&tilematrixset=EPSG:3857&TileMatrix={z}&TileRow={y}&TileCol={x}&format=image/png&key=${VWORLD_KEY}&domain=v0-archi-scan-layout-generator.vercel.app`
    const hybridOverlay = `https://api.vworld.kr/req/wmts/get?service=WMTS&request=GetTile&version=1.0.0&layer=Hybrid&style=default&tilematrixset=EPSG:3857&TileMatrix={z}&TileRow={y}&TileCol={x}&format=image/png&key=${VWORLD_KEY}&domain=v0-archi-scan-layout-generator.vercel.app`

    return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body,#map{width:100%;height:100%}
  .leaflet-control-attribution{font-size:9px!important;opacity:0.6}
</style>
</head><body>
<div id="map"></div>
<script>
  var map = L.map('map',{zoomControl:true,attributionControl:true}).setView([${lat},${lng}],18);
  
  // 기본 레이어
  var base = L.tileLayer('${baseLayers[mode].url}',{maxZoom:19,attribution:'VWorld'}).addTo(map);
  
  // 지적도 오버레이 (cadastral/satellite 모드에서 표시)
  ${mode !== 'map' ? `
  var cadastral = L.tileLayer('${cadastralOverlay}',{maxZoom:19,opacity:${mode === 'cadastral' ? '0.7' : '0.5'}}).addTo(map);
  ` : ''}
  
  // 위성 모드일 때 하이브리드(도로명) 오버레이
  ${mode === 'satellite' ? `
  var hybrid = L.tileLayer('${hybridOverlay}',{maxZoom:19}).addTo(map);
  ` : ''}
  
  // 마커
  var icon = L.divIcon({
    html:'<div style="width:24px;height:24px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;background:white;border-radius:50%"></div></div>',
    iconSize:[24,24],iconAnchor:[12,12],className:''
  });
  L.marker([${lat},${lng}],{icon:icon}).addTo(map)
    .bindPopup('<b style="font-size:12px">${(address || '대상지').replace(/'/g, "\\'")}</b>');
<\/script>
</body></html>`
  }, [lat, lng, mode, expanded, address])

  const blobUrl = useMemo(() => {
    const blob = new Blob([mapHtml], { type: 'text/html;charset=utf-8' })
    return URL.createObjectURL(blob)
  }, [mapHtml])

  const modeLabels: Record<MapMode, string> = {
    cadastral: '지적도',
    satellite: '위성+지적',
    map: '일반',
  }

  return (
    <div className={`rounded-xl border border-border/60 bg-card overflow-hidden ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border-b border-border/40">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>대상지 위치</span>
        </div>
        <div className="flex items-center gap-1">
          {(Object.keys(modeLabels) as MapMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2 py-0.5 text-[10px] rounded-md transition-colors ${
                mode === m ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {modeLabels[m]}
            </button>
          ))}
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 지도 */}
      <div className={`relative ${expanded ? 'h-[350px] sm:h-[450px]' : 'h-[220px] sm:h-[280px]'} transition-all`}>
        <iframe
          key={`${mode}-${expanded}`}
          src={blobUrl}
          className="w-full h-full border-0"
          title="대상지 지적도"
        />
        <div className="absolute left-2 bottom-2 px-2 py-0.5 bg-black/50 rounded text-[9px] text-white/80 font-mono pointer-events-none">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </div>
      </div>
    </div>
  )
}
