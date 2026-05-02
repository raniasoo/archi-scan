"use client"

import { useState } from "react"
import { MapPin, Maximize2 } from "lucide-react"

interface SiteMapPreviewProps {
  lng: number
  lat: number
  address?: string
  className?: string
}

export function SiteMapPreview({ lng, lat, address, className = "" }: SiteMapPreviewProps) {
  const [zoom, setZoom] = useState(17)
  const [expanded, setExpanded] = useState(false)
  const [useVworld, setUseVworld] = useState(true)
  const [vworldError, setVworldError] = useState(false)
  
  const size = expanded ? { w: 800, h: 500 } : { w: 600, h: 300 }
  
  // VWorld 정적 지도 (API route 프록시)
  const vworldUrl = `/api/map-image?lng=${lng}&lat=${lat}&zoom=${zoom}&type=hybrid&w=${size.w}&h=${size.h}`
  
  // OSM 정적 지도 (직접 호출, 항상 안정적)
  const osmUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${size.w}x${size.h}&maptype=mapnik&markers=${lat},${lng},red-pushpin`
  
  const currentUrl = (useVworld && !vworldError) ? vworldUrl : osmUrl

  return (
    <div className={`rounded-xl border border-border/60 bg-card overflow-hidden ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border-b border-border/40">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>대상지 위치</span>
        </div>
        <div className="flex items-center gap-1">
          {/* 지도 타입 전환 */}
          <button
            onClick={() => { setUseVworld(true); setVworldError(false) }}
            className={`px-2 py-0.5 text-[10px] rounded-md transition-colors ${
              useVworld && !vworldError
                ? 'bg-primary text-primary-foreground font-semibold' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            위성+지적
          </button>
          <button
            onClick={() => setUseVworld(false)}
            className={`px-2 py-0.5 text-[10px] rounded-md transition-colors ${
              !useVworld || vworldError
                ? 'bg-primary text-primary-foreground font-semibold' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            일반
          </button>
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
      <div className={`relative bg-slate-200 dark:bg-slate-800 ${expanded ? 'h-[300px] sm:h-[400px]' : 'h-[180px] sm:h-[220px]'} transition-all`}>
        <img
          key={currentUrl}
          src={currentUrl}
          alt={`${address || '대상지'} 지도`}
          className="w-full h-full object-cover"
          onError={() => {
            if (useVworld) setVworldError(true)
          }}
          loading="lazy"
        />
        
        {/* 중심 마커 (VWorld용 — OSM은 자체 마커 있음) */}
        {useVworld && !vworldError && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none">
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              <div className="w-0.5 h-2 bg-red-500" />
            </div>
          </div>
        )}
        
        {/* 줌 컨트롤 */}
        <div className="absolute right-2 bottom-2 flex flex-col gap-1">
          <button
            onClick={() => setZoom(Math.min(19, zoom + 1))}
            className="w-7 h-7 bg-white/90 dark:bg-slate-700/90 rounded-md shadow text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-white dark:hover:bg-slate-600 flex items-center justify-center"
            disabled={zoom >= 19}
          >
            +
          </button>
          <button
            onClick={() => setZoom(Math.max(14, zoom - 1))}
            className="w-7 h-7 bg-white/90 dark:bg-slate-700/90 rounded-md shadow text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-white dark:hover:bg-slate-600 flex items-center justify-center"
            disabled={zoom <= 14}
          >
            −
          </button>
        </div>
        
        {/* 주소 + 좌표 */}
        <div className="absolute left-2 bottom-2 max-w-[70%]">
          {address && (
            <div className="px-2 py-0.5 bg-black/60 rounded-t text-[10px] text-white/90 truncate">
              {address}
            </div>
          )}
          <div className="px-2 py-0.5 bg-black/50 rounded-b text-[9px] text-white/70 font-mono">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
        </div>
      </div>
    </div>
  )
}
