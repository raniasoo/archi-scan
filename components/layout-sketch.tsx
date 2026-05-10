"use client"

interface LayoutSketchProps {
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
  size?: number
  className?: string
}

export function LayoutSketch({ type, size = 80, className = "" }: LayoutSketchProps) {
  const s = size
  const pad = s * 0.08 // padding

  // 공통 스타일 — 다크모드 최대 가시성
  const site = { stroke: "#94a3b8", strokeWidth: 1.8, strokeDasharray: "3,2", fill: "none", opacity: 0.8 }
  const building = { fill: "#10b981", opacity: 1, rx: 1 }
  const buildingStroke = { stroke: "#34d399", strokeWidth: 1.8, fill: "none", opacity: 1 }
  const green = { fill: "#22c55e", opacity: 0.5, rx: 2 }
  const road = { fill: "#64748b", opacity: 0.3 }
  const label = { fill: "#e2e8f0", opacity: 0.9, fontSize: s * 0.075, textAnchor: "middle" as const, fontWeight: 700 }

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
      {/* 도로 (하단) */}
      <rect x={0} y={s - s * 0.1} width={s} height={s * 0.1} {...road} />
      <text x={s / 2} y={s - s * 0.03} {...label} opacity={0.8} fontSize={s * 0.06}>도로</text>

      {/* 대지 경계 */}
      <rect x={pad} y={pad} width={s - pad * 2} height={s - pad * 2 - s * 0.1} {...site} rx={2} />

      {type === "tower" && (
        <>
          {/* 타워형: 중앙 정방형 건물 */}
          <rect x={s * 0.3} y={s * 0.2} width={s * 0.4} height={s * 0.4} {...building} />
          <rect x={s * 0.3} y={s * 0.2} width={s * 0.4} height={s * 0.4} {...buildingStroke} rx={1} />
          {/* 조경 */}
          <rect x={s * 0.12} y={s * 0.65} width={s * 0.25} height={s * 0.12} {...green} />
          <rect x={s * 0.63} y={s * 0.65} width={s * 0.25} height={s * 0.12} {...green} />
          {/* 주차 진입로 */}
          <line x1={s * 0.5} y1={s * 0.6} x2={s * 0.5} y2={s * 0.9} stroke="currentColor" strokeWidth={1.2} opacity={0.6} strokeDasharray="2,2" />
          <text x={s * 0.5} y={s * 0.42} {...label}>타워</text>
        </>
      )}

      {type === "courtyard" && (
        <>
          {/* 중정형: ㅁ자 건물 + 내부 정원 */}
          {/* 상단 */}
          <rect x={s * 0.15} y={s * 0.12} width={s * 0.7} height={s * 0.14} {...building} />
          {/* 좌측 */}
          <rect x={s * 0.15} y={s * 0.12} width={s * 0.14} height={s * 0.55} {...building} />
          {/* 우측 */}
          <rect x={s * 0.71} y={s * 0.12} width={s * 0.14} height={s * 0.55} {...building} />
          {/* 하단 (개방) — 없음 */}
          {/* 스트로크 */}
          <rect x={s * 0.15} y={s * 0.12} width={s * 0.7} height={s * 0.14} {...buildingStroke} rx={1} />
          <rect x={s * 0.15} y={s * 0.12} width={s * 0.14} height={s * 0.55} {...buildingStroke} rx={1} />
          <rect x={s * 0.71} y={s * 0.12} width={s * 0.14} height={s * 0.55} {...buildingStroke} rx={1} />
          {/* 중정 (정원) */}
          <rect x={s * 0.32} y={s * 0.29} width={s * 0.36} height={s * 0.3} {...green} />
          <text x={s * 0.5} y={s * 0.46} {...label} fontSize={s * 0.055}>중정</text>
          {/* 조경 */}
          <rect x={s * 0.2} y={s * 0.72} width={s * 0.6} height={s * 0.08} {...green} />
        </>
      )}

      {type === "lshape" && (
        <>
          {/* ㄱ자형: L자 건물 */}
          {/* 상단 가로 */}
          <rect x={s * 0.15} y={s * 0.12} width={s * 0.7} height={s * 0.16} {...building} />
          {/* 우측 세로 */}
          <rect x={s * 0.69} y={s * 0.12} width={s * 0.16} height={s * 0.52} {...building} />
          {/* 스트로크 */}
          <rect x={s * 0.15} y={s * 0.12} width={s * 0.7} height={s * 0.16} {...buildingStroke} rx={1} />
          <rect x={s * 0.69} y={s * 0.12} width={s * 0.16} height={s * 0.52} {...buildingStroke} rx={1} />
          {/* 주차/조경 영역 */}
          <rect x={s * 0.15} y={s * 0.35} width={s * 0.45} height={s * 0.25} {...green} />
          <text x={s * 0.37} y={s * 0.5} {...label} fontSize={s * 0.055}>마당</text>
          {/* 하단 조경 */}
          <rect x={s * 0.15} y={s * 0.68} width={s * 0.7} height={s * 0.08} {...green} />
        </>
      )}

      {type === "linear" && (
        <>
          {/* 일자형: 남북 긴 직사각형 */}
          <rect x={s * 0.2} y={s * 0.15} width={s * 0.6} height={s * 0.22} {...building} />
          <rect x={s * 0.2} y={s * 0.15} width={s * 0.6} height={s * 0.22} {...buildingStroke} rx={1} />
          {/* 전면 조경 */}
          <rect x={s * 0.15} y={s * 0.42} width={s * 0.7} height={s * 0.15} {...green} />
          <text x={s * 0.5} y={s * 0.52} {...label} fontSize={s * 0.055}>전면 정원</text>
          {/* 후면 주차 */}
          <rect x={s * 0.25} y={s * 0.62} width={s * 0.5} height={s * 0.14} fill="currentColor" opacity={0.1} rx={2} />
          <text x={s * 0.5} y={s * 0.71} {...label} fontSize={s * 0.05} opacity={0.8}>주차</text>
          <text x={s * 0.5} y={s * 0.28} {...label}>일자형</text>
        </>
      )}

      {type === "cluster" && (
        <>
          {/* 클러스터형: 여러 작은 건물 */}
          {/* 동 1 */}
          <rect x={s * 0.12} y={s * 0.12} width={s * 0.22} height={s * 0.2} {...building} />
          <rect x={s * 0.12} y={s * 0.12} width={s * 0.22} height={s * 0.2} {...buildingStroke} rx={1} />
          {/* 동 2 */}
          <rect x={s * 0.42} y={s * 0.1} width={s * 0.22} height={s * 0.2} {...building} />
          <rect x={s * 0.42} y={s * 0.1} width={s * 0.22} height={s * 0.2} {...buildingStroke} rx={1} />
          {/* 동 3 */}
          <rect x={s * 0.7} y={s * 0.14} width={s * 0.18} height={s * 0.18} {...building} />
          <rect x={s * 0.7} y={s * 0.14} width={s * 0.18} height={s * 0.18} {...buildingStroke} rx={1} />
          {/* 동 4 */}
          <rect x={s * 0.15} y={s * 0.42} width={s * 0.2} height={s * 0.2} {...building} />
          <rect x={s * 0.15} y={s * 0.42} width={s * 0.2} height={s * 0.2} {...buildingStroke} rx={1} />
          {/* 동 5 */}
          <rect x={s * 0.5} y={s * 0.4} width={s * 0.22} height={s * 0.18} {...building} />
          <rect x={s * 0.5} y={s * 0.4} width={s * 0.22} height={s * 0.18} {...buildingStroke} rx={1} />
          {/* 사이 조경 */}
          <circle cx={s * 0.38} cy={s * 0.38} r={s * 0.06} {...green} />
          <circle cx={s * 0.68} cy={s * 0.45} r={s * 0.05} {...green} />
          {/* 하단 조경 */}
          <rect x={s * 0.12} y={s * 0.68} width={s * 0.76} height={s * 0.08} {...green} />
        </>
      )}

      {/* 방위 표시 (N) */}
      <g transform={`translate(${s - s * 0.12}, ${s * 0.06})`}>
        <text fill="currentColor" opacity={0.9} fontSize={s * 0.09} textAnchor="middle" fontWeight={700}>N</text>
        <line x1={0} y1={s * 0.02} x2={0} y2={s * 0.07} stroke="currentColor" strokeWidth={1.5} opacity={0.7} />
        <polygon points={`0,${s * 0.01} ${-s * 0.02},${s * 0.04} ${s * 0.02},${s * 0.04}`} fill="#94a3b8" opacity={0.8} />
      </g>
    </svg>
  )
}
