"use client"

import { useState } from "react"
import { getZoneAllowedUses } from "@/lib/zone-allowed-uses"
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, Building2, Lightbulb } from "lucide-react"

interface ZoneAllowedUsesCardProps {
  zoneType: string // 영문 키 또는 한글명
  zoneName?: string // 한글 표시명
}

export function ZoneAllowedUsesCard({ zoneType, zoneName }: ZoneAllowedUsesCardProps) {
  const [expanded, setExpanded] = useState(false)
  
  const data = getZoneAllowedUses(zoneType) || getZoneAllowedUses(zoneName || '')
  
  if (!data) return null

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">건축 가능 용도</span>
          <span className="text-[10px] text-muted-foreground">({data.zoneName})</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      
      {/* 요약 (항상 표시) */}
      <div className="px-4 py-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground mb-2">{data.summary}</p>
        
        {/* 주요 허용 용도 */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {data.mainUses.map(use => (
            <span key={use} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="h-2.5 w-2.5" /> {use}
            </span>
          ))}
        </div>
        
        {/* 불가 용도 (주요 것만) */}
        <div className="flex flex-wrap gap-1.5">
          {data.prohibitedUses.slice(0, 4).map(use => (
            <span key={use} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
              <XCircle className="h-2.5 w-2.5" /> {use}
            </span>
          ))}
          {data.prohibitedUses.length > 4 && (
            <span className="text-[10px] text-muted-foreground self-center">+{data.prohibitedUses.length - 4}개</span>
          )}
        </div>
      </div>
      
      {/* 상세 (확장 시) */}
      {expanded && (
        <div className="border-t border-border/30">
          {/* 조건부 허용 */}
          {data.conditionalUses.length > 0 && (
            <div className="px-4 py-2 border-b border-border/20">
              <p className="text-[10px] font-semibold text-amber-400 mb-1.5">⚠ 조건부 허용</p>
              <div className="flex flex-wrap gap-1.5">
                {data.conditionalUses.map(use => (
                  <span key={use} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                    <AlertCircle className="h-2.5 w-2.5" /> {use}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* 상세 목록 */}
          <div className="px-4 py-2">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2">상세 허용 여부</p>
            <div className="space-y-1">
              {data.details.map(d => (
                <div key={d.category} className="flex items-center justify-between py-1 border-b border-border/10 last:border-0">
                  <span className="text-xs text-foreground">{d.category}</span>
                  <div className="flex items-center gap-1.5">
                    {d.note && <span className="text-[9px] text-muted-foreground">{d.note}</span>}
                    {d.allowed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 실무 팁 */}
          <div className="px-4 py-3 bg-primary/5 border-t border-border/30">
            <div className="flex gap-2">
              <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">{data.tip}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
