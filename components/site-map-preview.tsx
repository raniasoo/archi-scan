"use client"

import { useState, useMemo, useEffect } from "react"
import { MapPin, Maximize2 } from "lucide-react"

interface SiteMapPreviewProps {
  lng: number
  lat: number
  address?: string
  className?: string
}

type MapMode = 'cadastral' | 'satellite' | 'map'

export function SiteMapPreview({ lng, lat, address, className = "" }: SiteMapPreviewProps) {
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<MapMode>('cadastral')
  const [origin, setOrigin] = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])

  const mapHtml = useMemo(() => {
    if (!origin) return ''
    
    // VWorld XYZ 타일 (공개 접근)
    const vwBase = 'https://xdworld.vworld.kr/2d/Base/service/{z}/{x}/{y}.png'
    const vwSatellite = 'https://xdworld.vworld.kr/2d/Satellite/service/{z}/{x}/{y}.jpeg'
    const vwHybrid = 'https://xdworld.vworld.kr/2d/Hybrid/service/{z}/{x}/{y}.png'
    const osmBase = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    
    // 지적도는 프록시 경유 (인증 필요)
    const cadastral = `${origin}/api/tile?layer=lt_c_cadastral&z={z}&x={x}&y={y}`

    const baseLayer = mode === 'map' ? osmBase : mode === 'satellite' ? vwSatellite : vwBase
    const safeAddr = (address || '대상지').replace(/'/g, "\\'").replace(/"/g, '&quot;')

    return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body,#map{width:100%;height:100%}
  .leaflet-control-attribution{font-size:9px!important;opacity:0.5}
  .leaflet-control-zoom{border:none!important}
  .leaflet-control-zoom a{width:32px!important;height:32px!important;line-height:32px!important;
    background:rgba(255,255,255,0.9)!important;border:1px solid rgba(0,0,0,0.15)!important;
    font-size:16px!important;color:#333!important;border-radius:8px!important}
</style>
</head><body>
<div id="map"></div>
<script>
  var map = L.map('map',{zoomControl:true}).setView([${lat},${lng}],18);
  
  // 기본 레이어
  var base = L.tileLayer('${baseLayer}',{maxZoom:19,attribution:'VWorld | OSM'});
  base.on('tileerror', function(){
    // VWorld 실패 시 OSM으로 fallback
    base.setUrl('${osmBase}');
  });
  base.addTo(map);
  
  // 지적도 오버레이
  ${mode !== 'map' ? `
  var cad = L.tileLayer('${cadastral}',{maxZoom:19,opacity:${mode === 'cadastral' ? 0.65 : 0.45}});
  cad.addTo(map);
  ` : ''}
  
  // 위성 모드 하이브리드
  ${mode === 'satellite' ? `
  L.tileLayer('${vwHybrid}',{maxZoom:19}).addTo(map);
  ` : ''}
  
  // 마커
  var icon = L.divIcon({
    html:'<div style="width:28px;height:28px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 3px 12px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center"><div style="width:10px;height:10px;background:white;border-radius:50%"></div></div>',
    iconSize:[28,28],iconAnchor:[14,14],className:''
  });
  L.marker([${lat},${lng}],{icon:icon}).addTo(map)
    .bindPopup('<div style="font-size:12px;font-weight:600;max-width:200px">${safeAddr}</div>');
<\/script>
</body></html>`
  }, [lat, lng, mode, address, origin])

  const blobUrl = useMemo(() => {
    if (!mapHtml) return ''
    const blob = new Blob([mapHtml], { type: 'text/html;charset=utf-8' })
    return URL.createObjectURL(blob)
  }, [mapHtml])

  if (!blobUrl) return null

  const modeLabels: Record<MapMode, string> = { cadastral: '지적도', satellite: '위성+지적', map: '일반' }

  return (
    <div className={`rounded-xl border border-border/60 bg-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border-b border-border/40">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>대상지 위치</span>
        </div>
        <div className="flex items-center gap-1">
          {(Object.keys(modeLabels) as MapMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-2 py-0.5 text-[10px] rounded-md transition-colors ${mode === m ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
            >{modeLabels[m]}</button>
          ))}
          <button onClick={() => setExpanded(!expanded)} className="ml-1 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className={`relative ${expanded ? 'h-[350px] sm:h-[450px]' : 'h-[220px] sm:h-[280px]'} transition-all`}>
        <iframe key={`${mode}-${expanded}`} src={blobUrl} className="w-full h-full border-0" title="대상지 지적도" />
        <div className="absolute left-2 bottom-2 px-2 py-0.5 bg-black/50 rounded text-[9px] text-white/80 font-mono pointer-events-none">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </div>
      </div>
    </div>
  )
}
