"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { renderAllDiagrams, type DiagramParams, type DiagramResult } from "@/lib/threejs-diagram-renderer"

interface ThreeJSDiagramsProps {
  type: string
  coverage: number
  siteArea: number
  floors: number
  units?: number
  buildingCount?: number
  originalType?: string
  floorHeight?: number
  regulation?: { frontSetback?: number; sideSetback?: number; rearSetback?: number; roadWidth?: number }
  sitePolygon?: { coords: [number, number][]; centroid: [number, number] }
}

export function ThreeJSDiagrams(props: ThreeJSDiagramsProps) {
  const [diagrams, setDiagrams] = useState<DiagramResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(0)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const results = await renderAllDiagrams(props)
      setDiagrams(results)
    } catch (e) {
      console.error('[DIAGRAMS] Error:', e)
    } finally {
      setLoading(false)
    }
  }, [props.type, props.coverage, props.siteArea, props.floors, props.buildingCount])

  useEffect(() => { generate() }, [generate])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-white/50">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Three.js 도면 생성 중...</span>
      </div>
    )
  }

  if (diagrams.length === 0) return null

  const TABS = ['배치도', '아이소메트릭', '단면도', '입면도', '투시도']

  return (
    <div className="space-y-3">
      {/* 탭 선택 */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {diagrams.map((d, i) => (
          <button key={d.type} onClick={() => setSelected(i)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selected === i
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/70'
            }`}>
            {TABS[i] || d.label}
          </button>
        ))}
      </div>

      {/* 선택된 도면 */}
      <div className="rounded-xl border border-white/10 overflow-hidden bg-white">
        <img
          src={diagrams[selected]?.image}
          alt={diagrams[selected]?.label}
          className="w-full h-auto"
        />
      </div>

      {/* 전체 도면 미리보기 */}
      <div className="grid grid-cols-5 gap-1.5">
        {diagrams.map((d, i) => (
          <button key={d.type} onClick={() => setSelected(i)}
            className={`rounded-lg overflow-hidden border-2 transition-all ${
              selected === i ? 'border-emerald-400' : 'border-transparent opacity-60 hover:opacity-100'
            }`}>
            <img src={d.image} alt={d.label} className="w-full h-auto" />
          </button>
        ))}
      </div>

      <p className="text-[10px] text-white/30 text-center">
        Three.js Single Source of Truth — 하나의 3D 모델에서 5종 도면 자동 생성
      </p>
    </div>
  )
}
