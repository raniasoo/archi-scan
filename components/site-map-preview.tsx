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
  const [expanded, setExpanded] = useState(false)
  
  // bbox 계산 (중심 좌표에서 ±0.002도 범위)
  const delta = expanded ? 0.004 : 0.002
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`
  
  // OpenStreetMap embed (항상 안정적)
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`

  return (
    <div className={`rounded-xl border border-border/60 bg-card overflow-hidden ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border-b border-border/40">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>대상지 위치</span>
          {address && <span className="text-muted-foreground truncate max-w-[180px]">· {address.split(' ').slice(-2).join(' ')}</span>}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title={expanded ? "축소" : "확대"}
        >
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>
      
      {/* 지도 iframe */}
      <div className={`relative ${expanded ? 'h-[300px] sm:h-[400px]' : 'h-[200px] sm:h-[250px]'} transition-all`}>
        <iframe
          src={mapSrc}
          className="w-full h-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer"
          title="대상지 위치 지도"
          allow="geolocation"
        />
        
        {/* 좌표 오버레이 */}
        <div className="absolute left-2 bottom-2 px-2 py-0.5 bg-black/50 rounded text-[9px] text-white/80 font-mono pointer-events-none">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </div>
      </div>
    </div>
  )
}
