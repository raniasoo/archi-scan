"use client"

import { useState } from "react"
import { MapPin, Maximize2, Satellite, Map } from "lucide-react"

interface SiteMapPreviewProps {
  lng: number
  lat: number
  address?: string
  className?: string
}

type MapType = 'satellite' | 'hybrid' | 'base'

export function SiteMapPreview({ lng, lat, address, className = "" }: SiteMapPreviewProps) {
  const [mapType, setMapType] = useState<MapType>('hybrid')
  const [zoom, setZoom] = useState(18)
  const [expanded, setExpanded] = useState(false)
  const [imgError, setImgError] = useState(false)
  
  const size = expanded ? { w: 800, h: 500 } : { w: 600, h: 300 }
  
  const mapUrl = `/api/map-image?lng=${lng}&lat=${lat}&zoom=${zoom}&type=${mapType}&w=${size.w}&h=${size.h}`
  
  // OSM fallback URL
  const osmFallbackUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${size.w}x${size.h}&maptype=mapnik&markers=${lat},${lng},red-pushpin`

  const mapTypeLabels: Record<MapType, { label: string; icon: typeof Satellite }> = {
    satellite: { label: '위성', icon: Satellite },
    hybrid: { label: '위성+지적', icon: Map },
    base: { label: '일반', icon: Map },
  }

  return (
    <div className={`rounded-xl border border-border/60 bg-card overflow-hidden ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border-b border-border/40">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>대상지 위치</span>
          {address && <span className="text-muted-foreground truncate max-w-[200px]">· {address}</span>}
        </div>
        <div className="flex items-center gap-1">
          {/* 지도 타입 전환 */}
          {(Object.keys(mapTypeLabels) as MapType[]).map(type => (
            <button
              key={type}
              onClick={() => { setMapType(type); setImgError(false) }}
              className={`px-2 py-0.5 text-[10px] rounded-md transition-colors ${
                mapType === type 
                  ? 'bg-primary text-primary-foreground font-semibold' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {mapTypeLabels[type].label}
            </button>
          ))}
          {/* 확대/축소 */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={expanded ? "축소" : "확대"}
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      {/* 지도 이미지 */}
      <div className={`relative bg-slate-900 ${expanded ? 'h-[300px] sm:h-[400px]' : 'h-[180px] sm:h-[220px]'} transition-all`}>
        {!imgError ? (
          <img
            src={mapUrl}
            alt={`${address || '대상지'} 위성사진`}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <img
            src={osmFallbackUrl}
            alt={`${address || '대상지'} 지도`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        
        {/* 중심 마커 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            <div className="w-0.5 h-2 bg-red-500" />
          </div>
        </div>
        
        {/* 줌 컨트롤 */}
        <div className="absolute right-2 bottom-2 flex flex-col gap-1">
          <button
            onClick={() => { setZoom(Math.min(19, zoom + 1)); setImgError(false) }}
            className="w-7 h-7 bg-white/90 rounded-md shadow text-slate-700 text-sm font-bold hover:bg-white flex items-center justify-center"
            disabled={zoom >= 19}
          >
            +
          </button>
          <button
            onClick={() => { setZoom(Math.max(14, zoom - 1)); setImgError(false) }}
            className="w-7 h-7 bg-white/90 rounded-md shadow text-slate-700 text-sm font-bold hover:bg-white flex items-center justify-center"
            disabled={zoom <= 14}
          >
            −
          </button>
        </div>
        
        {/* 좌표 표시 */}
        <div className="absolute left-2 bottom-2 px-2 py-0.5 bg-black/50 rounded text-[9px] text-white/80 font-mono">
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </div>
      </div>
    </div>
  )
}
