/**
 * 미니 일조사선 다이어그램 — 배치안 카드 내장용
 * 
 * 정북방향 사선제한을 직관적으로 시각화:
 *   - 건물 높이 vs 사선 허용 높이
 *   - 동지 그림자 길이
 *   - 일조시간 배지
 */

"use client"

interface SolarMiniDiagramProps {
  /** 건물 높이 (m) */
  buildingHeight: number
  /** 정북사선 최대 허용 높이 (m) */
  northMaxHeight: number
  /** 실효 최대 층수 */
  effectiveMaxFloors: number
  /** 동지 그림자 길이 (m) */
  shadowLength: number
  /** 동지 일조시간 */
  winterSunlightHours: number
  /** 사선제한이 실질적 제약인지 */
  isConstraining: boolean
  /** 사선 요약 텍스트 */
  summary?: string
}

export function SolarMiniDiagram({
  buildingHeight,
  northMaxHeight,
  effectiveMaxFloors,
  shadowLength,
  winterSunlightHours,
  isConstraining,
  summary,
}: SolarMiniDiagramProps) {
  // SVG 스케일링
  const W = 200, H = 80
  const margin = { left: 8, right: 8, top: 6, bottom: 20 }
  const plotW = W - margin.left - margin.right
  const plotH = H - margin.top - margin.bottom
  
  // 높이 스케일 (최대 높이 기준)
  const maxH = Math.max(buildingHeight, northMaxHeight, 15) * 1.15
  const scale = plotH / maxH
  
  // 건물 위치
  const bldgW = 22
  const bldgX = margin.left + plotW * 0.25
  const bldgH = buildingHeight * scale
  const bldgY = margin.top + plotH - bldgH
  
  // 사선 허용 높이 라인
  const solarH = northMaxHeight * scale
  const solarY = margin.top + plotH - solarH
  
  // 그림자
  const shadowScale = plotW * 0.4 / Math.max(shadowLength, 1)
  const shadowW = Math.min(plotW * 0.4, shadowLength * shadowScale)
  const shadowX = bldgX + bldgW
  const shadowY = margin.top + plotH
  
  // 정북 경계선 위치
  const northX = margin.left + plotW * 0.85
  
  // 사선 라인 (경계선에서 건물까지)
  const slopeStartX = northX
  const slopeStartY = margin.top + plotH // 지면
  const slopeEndX = bldgX + bldgW
  const slopeEndY = solarY
  
  // 색상
  const isViolation = buildingHeight > northMaxHeight * 1.05
  const bldgColor = isViolation ? '#ef4444' : '#3b82f6'
  const solarColor = isConstraining ? '#f59e0b' : '#22c55e'
  
  // 일조 등급
  const sunGrade = winterSunlightHours >= 6 ? { label: '매우양호', color: '#22c55e' } :
                   winterSunlightHours >= 4 ? { label: '양호', color: '#3b82f6' } :
                   winterSunlightHours >= 2 ? { label: '보통', color: '#f59e0b' } :
                   { label: '불량', color: '#ef4444' }

  return (
    <div className="space-y-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 70 }}>
        {/* 지면 */}
        <line x1={margin.left} y1={shadowY} x2={W - margin.right} y2={shadowY}
          stroke="currentColor" strokeWidth={0.5} opacity={0.3} className="text-foreground" />
        
        {/* 그림자 (반투명) */}
        <polygon
          points={`${shadowX},${shadowY} ${shadowX + shadowW},${shadowY} ${bldgX + bldgW},${bldgY}`}
          fill="#64748b" opacity={0.12}
        />
        <line x1={shadowX} y1={shadowY} x2={shadowX + shadowW} y2={shadowY}
          stroke="#94a3b8" strokeWidth={1} strokeDasharray="2 1" />
        
        {/* 정북 경계선 */}
        <line x1={northX} y1={margin.top} x2={northX} y2={shadowY}
          stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="3 2" />
        <text x={northX} y={margin.top + 6} fontSize={5} textAnchor="middle" fill="#94a3b8">N ↑</text>
        
        {/* 사선 라인 (노란색 점선) */}
        {isConstraining && (
          <>
            <line x1={slopeStartX} y1={slopeStartY} x2={slopeEndX} y2={slopeEndY}
              stroke={solarColor} strokeWidth={1.2} strokeDasharray="3 2" />
            {/* 사선 허용 높이 수평선 */}
            <line x1={bldgX - 4} y1={solarY} x2={bldgX + bldgW + 8} y2={solarY}
              stroke={solarColor} strokeWidth={0.6} strokeDasharray="2 1" />
            <text x={bldgX + bldgW + 10} y={solarY + 3} fontSize={5} fill={solarColor}>
              {northMaxHeight.toFixed(0)}m
            </text>
          </>
        )}
        
        {/* 건물 */}
        <rect x={bldgX} y={bldgY} width={bldgW} height={bldgH}
          fill={bldgColor} opacity={0.8} rx={1} />
        {/* 건물 높이 텍스트 */}
        <text x={bldgX + bldgW / 2} y={bldgY + bldgH / 2 + 2} fontSize={6}
          textAnchor="middle" fill="white" fontWeight="bold">
          {effectiveMaxFloors}층
        </text>
        <text x={bldgX - 2} y={bldgY + bldgH / 2 + 2} fontSize={4.5}
          textAnchor="end" fill={bldgColor}>
          {buildingHeight.toFixed(0)}m
        </text>
        
        {/* 태양 아이콘 */}
        <circle cx={margin.left + 12} cy={margin.top + 10} r={5} fill="#fbbf24" opacity={0.7} />
        <text x={margin.left + 12} y={margin.top + 12} fontSize={5} textAnchor="middle" fill="#92400e">☀</text>
        
        {/* 그림자 길이 텍스트 */}
        <text x={shadowX + shadowW / 2} y={shadowY + 10} fontSize={4.5} textAnchor="middle" fill="#94a3b8">
          그림자 {shadowLength.toFixed(0)}m
        </text>
        
        {/* 일조시간 뱃지 */}
        <rect x={W - margin.right - 42} y={margin.top} width={40} height={14} rx={3}
          fill={sunGrade.color} opacity={0.15} />
        <text x={W - margin.right - 22} y={margin.top + 10} fontSize={5.5}
          textAnchor="middle" fill={sunGrade.color} fontWeight="bold">
          ☀ {winterSunlightHours.toFixed(1)}h
        </text>
      </svg>
      
      {/* 텍스트 요약 */}
      {isConstraining && summary && (
        <p className="text-[9px] text-muted-foreground/70 leading-tight px-1">{summary}</p>
      )}
    </div>
  )
}
