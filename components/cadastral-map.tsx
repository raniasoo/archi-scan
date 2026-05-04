"use client"

import { useState, useCallback, useMemo } from "react"
import { polygonToSVG } from "@/lib/vworld"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, Download, AlertTriangle, CheckCircle2 } from "lucide-react"

interface CadastralMapProps {
  address: string
  siteArea: number
  entX?: number          // 경도 (JUSO에서 파싱한 실제 좌표)
  entY?: number          // 위도 (JUSO에서 파싱한 실제 좌표)
  bdMgtSn?: string       // 건물관리번호 (PNU 추출용)
  setbackFront?: number
  setbackSide?: number
  setbackRear?: number
  coverageRatio?: number    // 건폐율 (%)
  onParcelLoaded?: (area: number) => void
  onParcelPolygonLoaded?: (coords: [number, number][], centroid: [number, number]) => void
}

interface ParcelData {
  pnu: string
  address: string
  area: number
  landUse?: string
  isDemo?: boolean
  coordinates: [number, number][]
  centroid: [number, number]
  bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number }
}

const VIEW_W = 400
const VIEW_H = 400
const PAD = 30

export function CadastralMap({
  address,
  siteArea,
  entX,
  entY,
  bdMgtSn,
  setbackFront = 2,
  setbackSide = 1,
  setbackRear = 1.5,
  coverageRatio = 60,
  onParcelLoaded,
  onParcelPolygonLoaded,
}: CadastralMapProps) {
  const [parcel, setParcel] = useState<ParcelData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  const loadParcel = useCallback(async () => {
    if (!address) return
    setLoading(true)
    setError(null)

    try {
      // 서버 API로 Vworld 조회 (JUSO 좌표 있으면 같이 전달)
      const res = await fetch('/api/vworld', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, siteArea, entX, entY, bdMgtSn }),
      })
      const data = await res.json()

      if (data.success && data.parcel) {
        setParcel(data.parcel)
        setIsDemo(!!data.parcel.isDemo)
        onParcelLoaded?.(data.parcel.area)
        if (data.parcel.coordinates?.length) {
          onParcelPolygonLoaded?.(data.parcel.coordinates, data.parcel.centroid)
        }
      } else if (data.demoParcel) {
        setParcel(data.demoParcel)
        setIsDemo(true)
        onParcelLoaded?.(data.demoParcel.area)
        if (data.demoParcel.coordinates?.length) {
          onParcelPolygonLoaded?.(data.demoParcel.coordinates, data.demoParcel.centroid)
        }
        setError(data.error || 'Vworld 연결 중 — 데모 형상으로 표시합니다')
      } else {
        setError(data.error || '지적도 조회 실패')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [address, siteArea, entX, entY, bdMgtSn, onParcelLoaded])

  // SVG 변환
  const svgData = useMemo(() => {
    if (!parcel?.coordinates?.length) return null
    return polygonToSVG(parcel.coordinates, VIEW_W, VIEW_H, PAD)
  }, [parcel])

  // 이격거리 적용 내부 폴리곤 계산 (단순 inset)
  const innerPoints = useMemo(() => {
    if (!svgData) return null
    const { points, scale } = svgData
    if (points.length < 3) return null

    // 각 꼭짓점을 중심으로 inset (단순 근사)
    const cx = points.reduce((s, p) => s + p[0], 0) / points.length
    const cy = points.reduce((s, p) => s + p[1], 0) / points.length

    // 이격거리 → SVG 픽셀 변환
    // scale: px/degree, 1degree ≈ 111,319m → insetPx = meters * scale / 111319
    const avgSetback = (setbackFront + setbackSide + setbackRear) / 3
    const insetPx = avgSetback * scale / 111319

    return points.map(([x, y]) => {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1) return [x, y]
      const ratio = Math.max(0, (dist - insetPx) / dist)
      return [cx + dx * ratio, cy + dy * ratio]
    }) as [number, number][]
  }, [svgData, setbackFront, setbackSide, setbackRear])

  // 건축면적 영역 (건폐율 적용)
  const buildingPoints = useMemo(() => {
    if (!innerPoints || innerPoints.length < 3) return null
    const cx = innerPoints.reduce((s, p) => s + p[0], 0) / innerPoints.length
    const cy = innerPoints.reduce((s, p) => s + p[1], 0) / innerPoints.length
    const ratio = Math.sqrt(coverageRatio / 100)

    return innerPoints.map(([x, y]) => [
      cx + (x - cx) * ratio,
      cy + (y - cy) * ratio,
    ]) as [number, number][]
  }, [innerPoints, coverageRatio])

  const toSVGPath = (pts: [number, number][]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ' Z'

  // SVG 다운로드
  const downloadSVG = useCallback(() => {
    if (!svgData) return
    const svg = document.getElementById('cadastral-svg')
    if (!svg) return
    // application/octet-stream으로 모바일에서도 강제 다운로드
    const blob = new Blob([svg.outerHTML], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `배치도_${address.replace(/\s/g, '_')}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [svgData, address])

  return (
    <div className="space-y-3">
      {/* 조회 버튼 */}
      <div className="flex items-center gap-2">
        <Button
          onClick={loadParcel}
          disabled={loading || !address}
          size="sm"
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MapPin className="h-3.5 w-3.5" />
          )}
          {loading ? '지적도 조회 중...' : '지적도 불러오기'}
        </Button>
        {parcel && (
          <>
            <Button variant="outline" size="sm" onClick={() => {
              const svg = document.getElementById('cadastral-svg')
              if (!svg) return
              const content = `<!DOCTYPE html><html><body style="margin:0;background:#0f172a;display:flex;justify-content:center;align-items:center;min-height:100vh">${svg.outerHTML}</body></html>`
              const win = window.open('', '_blank')
              win?.document.write(content)
              win?.document.close()
            }} className="gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              보기
            </Button>
            {parcel && parcel.centroid && (
              <>
                <Button variant="outline" size="sm" onClick={() => {
                  // 네이버 지도: 주소 검색으로 정확한 위치 표시
                  window.open(`https://map.naver.com/v5/search/${encodeURIComponent(address)}`, '_blank')
                }} className="gap-2 text-emerald-400 border-emerald-500/30">
                  <MapPin className="h-3.5 w-3.5" />
                  지도
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  // 카카오맵: 주소 검색 후 지도 레이어에서 지적도 선택 가능
                  window.open(`https://map.kakao.com/?q=${encodeURIComponent(address)}`, '_blank')
                }} className="gap-2 text-cyan-400 border-cyan-500/30">
                  <MapPin className="h-3.5 w-3.5" />
                  지적도
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={downloadSVG} className="gap-2">
              <Download className="h-3.5 w-3.5" />
              SVG 저장
            </Button>
          </>
        )}
        {isDemo && (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
            데모 모드
          </Badge>
        )}
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              {isDemo
                ? (parcel && !parcel.pnu?.startsWith('DEMO')
                  ? 'JUSO 좌표 기반 위치 표시 (실제 필지 경계와 근사치)'
                  : 'Vworld 연결 중 — 데모 형상으로 표시합니다')
                : error}
            </p>
          </div>
        </div>
      )}

      {/* 지적도 SVG */}
      {parcel && svgData && (
        <div className="space-y-2">
          <div className="rounded-xl overflow-hidden border border-border/50 bg-slate-950">
            <svg
              id="cadastral-svg"
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              width="100%"
              style={{ display: 'block', background: '#0f172a' }}
            >

              {/* 격자 배경 (데모 모드 또는 bbox 없을 때) */}
              <defs>
                <pattern id="cad-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width={VIEW_W} height={VIEW_H} fill="url(#cad-grid)" />

              {/* 주변 필지 컨텍스트 (시각적 맥락 제공) */}
              {svgData.points.length >= 3 && (() => {
                const minPx = Math.min(...svgData.points.map(p=>p.x))
                const maxPx = Math.max(...svgData.points.map(p=>p.x))
                const minPy = Math.min(...svgData.points.map(p=>p.y))
                const maxPy = Math.max(...svgData.points.map(p=>p.y))
                return (
                  <g opacity="0.3">
                    {/* 도로 (하단) */}
                    <rect x={0} y={VIEW_H - 25} width={VIEW_W} height={25} fill="#334155" rx="2" />
                    <line x1={15} y1={VIEW_H - 12} x2={VIEW_W - 15} y2={VIEW_H - 12} stroke="#475569" strokeWidth="1" strokeDasharray="8 6" />
                    <text x={VIEW_W / 2} y={VIEW_H - 5} textAnchor="middle" fontSize="7" fill="#64748b">도 로</text>
                    {/* 인접 필지 (좌) */}
                    <rect x={5} y={20} width={Math.max(minPx - 18, 30)} height={VIEW_H - 50} fill="none" stroke="#475569" strokeWidth="0.8" rx="2" />
                    <rect x={12} y={40} width={20} height={15} fill="#475569" rx="1" opacity="0.5" />
                    <rect x={15} y={80} width={18} height={25} fill="#475569" rx="1" opacity="0.4" />
                    {/* 인접 필지 (우) */}
                    <rect x={maxPx + 12} y={20} width={Math.max(VIEW_W - maxPx - 20, 30)} height={VIEW_H - 50} fill="none" stroke="#475569" strokeWidth="0.8" rx="2" />
                    <rect x={maxPx + 20} y={35} width={22} height={18} fill="#475569" rx="1" opacity="0.5" />
                    <rect x={maxPx + 18} y={75} width={16} height={30} fill="#475569" rx="1" opacity="0.4" />
                    {/* 인접 필지 (상) */}
                    <rect x={20} y={5} width={VIEW_W - 40} height={Math.max(minPy - 12, 20)} fill="none" stroke="#475569" strokeWidth="0.8" rx="2" />
                    <rect x={40} y={10} width={25} height={12} fill="#475569" rx="1" opacity="0.5" />
                    <rect x={VIEW_W/2} y={8} width={20} height={15} fill="#475569" rx="1" opacity="0.4" />
                  </g>
                )
              })()}

              {/* 대지 영역 */}
              <path
                d={toSVGPath(svgData.points)}
                fill="#3b82f620"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray={isDemo ? "6 3" : "none"}
              />
              {/* 이격거리 경계선 */}
              {innerPoints && (
                <path
                  d={toSVGPath(innerPoints)}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="6 3"
                  opacity="0.9"
                />
              )}
              {/* 건축 가능 영역 (건폐율) */}
              {buildingPoints && (
                <path
                  d={toSVGPath(buildingPoints)}
                  fill="#10b98122"
                  stroke="#10b981"
                  strokeWidth="2"
                  opacity="0.9"
                />
              )}

              {/* 범례 */}
              <g transform={`translate(${PAD}, ${VIEW_H - 70})`}>
                <rect width="140" height="65" fill="#0f1729" rx="4" opacity="0.9" />
                <g transform="translate(8, 14)">
                  <rect width="14" height="3" fill="#3b82f6" />
                  <text x="20" y="3" fontSize="9" fill="#94a3b8">대지경계</text>
                </g>
                <g transform="translate(8, 30)">
                  <line x1="0" y1="1.5" x2="14" y2="1.5" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
                  <text x="20" y="4" fontSize="9" fill="#94a3b8">이격거리 경계</text>
                </g>
                <g transform="translate(8, 46)">
                  <rect width="14" height="10" fill="#10b98130" stroke="#10b981" strokeWidth="1" />
                  <text x="20" y="8" fontSize="9" fill="#94a3b8">건축 가능 영역</text>
                </g>
              </g>

              {/* 방위 */}
              <g transform={`translate(${VIEW_W - PAD - 20}, ${PAD + 10})`}>
                <circle r="16" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                <text textAnchor="middle" y="-6" fontSize="10" fill="#60a5fa" fontWeight="bold">N</text>
                <line y1="-4" y2="8" stroke="#60a5fa" strokeWidth="1.5" />
              </g>

              {/* 스케일 바 (근사) */}
              {svgData.scale && (
                <g transform={`translate(${VIEW_W / 2 - 30}, ${VIEW_H - PAD - 8})`}>
                  <line x1="0" y1="0" x2="60" y2="0" stroke="#475569" strokeWidth="2" />
                  <line x1="0" y1="-4" x2="0" y2="4" stroke="#475569" strokeWidth="1.5" />
                  <line x1="60" y1="-4" x2="60" y2="4" stroke="#475569" strokeWidth="1.5" />
                  <text textAnchor="middle" x="30" y="-7" fontSize="8" fill="#64748b">
                    {Math.round(60 / svgData.scale / 0.00001 / 111319)}m
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* 필지 정보 */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '필지 면적', value: `${parcel.area.toLocaleString()}㎡` },
              { label: '지목', value: parcel.landUse || '대' },
              { label: '건축 가능 면적', value: `${Math.floor(parcel.area * coverageRatio / 100).toLocaleString()}㎡` },
            ].map(item => (
              <div key={item.label} className="rounded-lg bg-secondary/30 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className="text-xs font-bold">{item.value}</p>
              </div>
            ))}
          </div>

          {!isDemo && (
            <div className="flex items-center gap-2 text-[10px] text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              실제 지적도 데이터 (Vworld 국토지리정보원)
            </div>
          )}
        </div>
      )}

      {/* 미조회 상태 안내 */}
      {!parcel && !loading && (
        <div className="rounded-xl border border-dashed border-border/50 p-8 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            "지적도 불러오기" 버튼을 누르면<br />
            실제 대지 형상과 건축 가능 영역을 표시합니다
          </p>
        </div>
      )}
    </div>
  )
}
