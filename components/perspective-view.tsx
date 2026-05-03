"use client"

import React from "react"

interface PerspectiveViewProps {
  siteArea: number
  buildingCoverage: number
  floors: number
  units: number
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
  layoutName?: string
  zoneType?: string
}

// 1점 투시 변환: 3D → 2D (소실점 기반)
const VP_X = 200 // 소실점 X
const VP_Y = 80  // 소실점 Y (하늘 위쪽)
const GROUND_Y = 350 // 지면 기준선
const SCALE = 0.45 // 원근 스케일

function toPersp(x3d: number, y3d: number, z3d: number): [number, number] {
  // y3d = 깊이(앞뒤), z3d = 높이, x3d = 좌우
  const depth = Math.max(0.3, 1 - y3d * 0.008) // 뒤로 갈수록 작아짐
  const px = VP_X + (x3d - VP_X) * depth * SCALE
  const pz = GROUND_Y - z3d * depth * SCALE
  // 깊이에 따른 Y 위치 조정
  const py = pz + (VP_Y - pz) * (1 - depth) * 0.3
  return [VP_X + (px - VP_X), py]
}

// 투시 폴리곤
function perspFace(corners: [number, number, number][]): string {
  return corners.map(c => {
    const [px, py] = toPersp(c[0], c[1], c[2])
    return `${px.toFixed(1)},${py.toFixed(1)}`
  }).join(' ')
}

// 창문
function PerspWindow({ x, y, z, w, h, depth }: {
  x: number; y: number; z: number; w: number; h: number; depth: number
}) {
  const corners: [number, number, number][] = [
    [x, depth, z], [x + w, depth, z],
    [x + w, depth, z + h], [x, depth, z + h],
  ]
  return <polygon points={perspFace(corners)} fill="#7dd3fc" opacity="0.4" stroke="#38bdf8" strokeWidth="0.3" />
}

// 나무
function PerspTree({ x, depth, size = 1 }: { x: number; depth: number; size?: number }) {
  const [sx, sy] = toPersp(x, depth, 0)
  const sc = size * (1 - depth * 0.005) * 0.8
  return (
    <g>
      <ellipse cx={sx + 1} cy={sy + 1} rx={sc * 5} ry={sc * 2} fill="#000" opacity="0.08" />
      <line x1={sx} y1={sy} x2={sx} y2={sy - sc * 12} stroke="#854d0e" strokeWidth={sc * 1.5} />
      <ellipse cx={sx} cy={sy - sc * 16} rx={sc * 7} ry={sc * 6} fill="#15803d" opacity="0.7" />
      <ellipse cx={sx - sc * 2} cy={sy - sc * 18} rx={sc * 5} ry={sc * 4} fill="#16a34a" opacity="0.6" />
    </g>
  )
}

// 사람
function PerspPerson({ x, depth, scale = 1 }: { x: number; depth: number; scale?: number }) {
  const [sx, sy] = toPersp(x, depth, 0)
  const sc = scale * (1 - depth * 0.005) * 0.7
  const h = 10 * sc
  return (
    <g>
      <line x1={sx} y1={sy} x2={sx} y2={sy - h * 0.7} stroke="#64748b" strokeWidth={1.5 * sc} strokeLinecap="round" />
      <circle cx={sx} cy={sy - h * 0.85} r={h * 0.15} fill="#94a3b8" />
      <ellipse cx={sx + 1} cy={sy + 0.3} rx={2 * sc} ry={0.7 * sc} fill="#000" opacity="0.06" />
    </g>
  )
}

// 차량
function PerspCar({ x, depth, color = "#475569" }: { x: number; depth: number; color?: string }) {
  const [sx, sy] = toPersp(x, depth, 0)
  const sc = (1 - depth * 0.005) * 0.6
  return (
    <g>
      <rect x={sx - 8 * sc} y={sy - 4 * sc} width={16 * sc} height={4 * sc} rx={1} fill={color} opacity="0.7" />
      <rect x={sx - 5 * sc} y={sy - 7 * sc} width={10 * sc} height={3.5 * sc} rx={1} fill={color} opacity="0.5" />
      <circle cx={sx - 5 * sc} cy={sy} r={1.5 * sc} fill="#1e293b" />
      <circle cx={sx + 5 * sc} cy={sy} r={1.5 * sc} fill="#1e293b" />
    </g>
  )
}

export function PerspectiveView({ siteArea, buildingCoverage, floors, units, type, layoutName, zoneType }: PerspectiveViewProps) {
  const W = 400, H = 400
  const floorH = Math.max(25, Math.min(45, 200 / Math.max(floors, 2))) // 층고 (px 스케일로 변환)
  const totalH = floors * floorH
  const realFloorH = 3.3, realGfH = 4.5
  const realTotalH = realGfH + (floors - 1) * realFloorH // 실제 미터 단위

  // 건물 크기 — 화면 꽉 차게 (VP 기준 70% 점유)
  const buildingArea = siteArea * (buildingCoverage / 100)
  const sideM = Math.sqrt(buildingArea)

  // VP_X=200이므로 건물폭은 좌우로 140px씩 = 280px
  const bw = 280
  const bd = 70
  const bx = VP_X - bw / 2              // 건물 시작 X
  const bDepth = 20                      // 건물의 깊이 위치

  // 타입별 건물 형상 조정
  let buildingBlocks: { x: number; depth: number; w: number; d: number; floors: number }[] = []

  switch (type) {
    case 'tower':
      buildingBlocks = [{ x: bx + bw * 0.15, depth: bDepth, w: bw * 0.7, d: bd, floors }]
      break
    case 'courtyard':
      buildingBlocks = [
        { x: bx, depth: bDepth, w: bw, d: bd * 0.3, floors },           // 전면
        { x: bx, depth: bDepth + bd * 0.7, w: bw, d: bd * 0.3, floors }, // 후면
        { x: bx, depth: bDepth, w: bw * 0.2, d: bd, floors },            // 좌측
        { x: bx + bw * 0.8, depth: bDepth, w: bw * 0.2, d: bd, floors }, // 우측
      ]
      break
    case 'lshape':
      buildingBlocks = [
        { x: bx, depth: bDepth, w: bw * 0.4, d: bd, floors },
        { x: bx, depth: bDepth + bd * 0.6, w: bw, d: bd * 0.4, floors: Math.max(3, floors - 2) },
      ]
      break
    case 'linear':
      buildingBlocks = [{ x: bx, depth: bDepth, w: bw, d: bd * 0.5, floors }]
      break
    case 'cluster':
      const cFloors = Math.max(3, floors - 3)
      buildingBlocks = [
        { x: bx, depth: bDepth, w: bw * 0.45, d: bd * 0.8, floors },
        { x: bx + bw * 0.55, depth: bDepth + 10, w: bw * 0.45, d: bd * 0.8, floors: cFloors },
      ]
      break
    default:
      buildingBlocks = [{ x: bx, depth: bDepth, w: bw * 0.7, d: bd, floors }]
  }

  // 건물 한 동 렌더링
  function renderBuilding(block: typeof buildingBlocks[0], idx: number) {
    const { x: blkX, depth: blkD, w: blkW, d: blkDepth, floors: blkFloors } = block
    const blkH = blkFloors * floorH

    // 건물 면들
    const frontFace: [number, number, number][] = [
      [blkX, blkD, 0], [blkX + blkW, blkD, 0],
      [blkX + blkW, blkD, blkH], [blkX, blkD, blkH],
    ]
    const topFace: [number, number, number][] = [
      [blkX, blkD, blkH], [blkX + blkW, blkD, blkH],
      [blkX + blkW, blkD + blkDepth, blkH], [blkX, blkD + blkDepth, blkH],
    ]
    const rightFace: [number, number, number][] = [
      [blkX + blkW, blkD, 0], [blkX + blkW, blkD + blkDepth, 0],
      [blkX + blkW, blkD + blkDepth, blkH], [blkX + blkW, blkD, blkH],
    ]

    // 창문 생성
    const windowCols = Math.max(2, Math.min(8, Math.floor(blkW / 12)))
    const winW = blkW * 0.7 / windowCols
    const winGap = blkW * 0.3 / (windowCols + 1)
    const floorWindows = []

    for (let f = 0; f < blkFloors; f++) {
      const z = f * floorH + floorH * 0.15
      const wh = floorH * 0.6
      for (let c = 0; c < windowCols; c++) {
        const wx = blkX + winGap + c * (winW + winGap)
        const isBig = f === 0 // 1층은 큰 창(상가)
        floorWindows.push(
          <PerspWindow key={`w-${idx}-${f}-${c}`}
            x={wx} y={0} z={z} w={winW} h={isBig ? wh * 1.2 : wh} depth={blkD} />
        )
      }
    }

    return (
      <g key={`bld-${idx}`}>
        {/* 전면 */}
        <polygon points={perspFace(frontFace)} fill="#334155" stroke="#475569" strokeWidth="0.8" />
        {/* 우측면 */}
        <polygon points={perspFace(rightFace)} fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
        {/* 상단 */}
        <polygon points={perspFace(topFace)} fill="#475569" stroke="#64748b" strokeWidth="0.5" />
        {/* 창문 */}
        {floorWindows}
        {/* 1층 입구 */}
        {(() => {
          const doorW = blkW * 0.12
          const doorH = floorH * 0.85
          const doorX = blkX + blkW / 2 - doorW / 2
          const doorCorners: [number, number, number][] = [
            [doorX, blkD, 0], [doorX + doorW, blkD, 0],
            [doorX + doorW, blkD, doorH], [doorX, blkD, doorH],
          ]
          return <polygon points={perspFace(doorCorners)} fill="#fbbf24" opacity="0.5" stroke="#f59e0b" strokeWidth="0.5" />
        })()}
        {/* 옥상 기계실 */}
        {(() => {
          const mechW = blkW * 0.2, mechD = blkDepth * 0.3, mechH = floorH * 0.5
          const mechX = blkX + blkW / 2 - mechW / 2
          const mechCorners: [number, number, number][] = [
            [mechX, blkD + blkDepth * 0.2, blkH], [mechX + mechW, blkD + blkDepth * 0.2, blkH],
            [mechX + mechW, blkD + blkDepth * 0.2, blkH + mechH], [mechX, blkD + blkDepth * 0.2, blkH + mechH],
          ]
          return <polygon points={perspFace(mechCorners)} fill="#475569" stroke="#64748b" strokeWidth="0.3" opacity="0.6" />
        })()}
      </g>
    )
  }

  // 지면 그리드
  const gridLines = []
  for (let i = 0; i <= 8; i++) {
    const x = 40 + i * 40
    const [x1, y1] = toPersp(x, 0, 0)
    const [x2, y2] = toPersp(x, 80, 0)
    gridLines.push(<line key={`gv-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1e293b" strokeWidth="0.5" />)
  }
  for (let j = 0; j <= 6; j++) {
    const d = j * 14
    const [x1, y1] = toPersp(40, d, 0)
    const [x2, y2] = toPersp(360, d, 0)
    gridLines.push(<line key={`gh-${j}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1e293b" strokeWidth="0.5" />)
  }

  // 도로 (전면)
  const roadCorners: [number, number, number][] = [
    [30, -15, 0], [370, -15, 0], [370, -5, 0], [30, -5, 0],
  ]

  // 높이 치수선
  const [dimBotX, dimBotY] = toPersp(bx - 15, bDepth, 0)
  const [dimTopX, dimTopY] = toPersp(bx - 15, bDepth, totalH)

  return (
    <div className="space-y-1">
      <div className="rounded-xl overflow-hidden border border-border/50 bg-slate-950">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', background: 'linear-gradient(180deg, #0c1222 0%, #0f172a 40%, #1e293b 100%)' }}>
          {/* 하늘 그라데이션 */}
          <defs>
            <linearGradient id="sky-persp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c1222" />
              <stop offset="60%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="ground-persp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a2332" />
              <stop offset="100%" stopColor="#0f1720" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#sky-persp)" />

          {/* 지면 */}
          <polygon points={perspFace([[0, -20, 0], [400, -20, 0], [400, 90, 0], [0, 90, 0]])}
            fill="url(#ground-persp)" />

          {/* 그리드 */}
          {gridLines}

          {/* 도로 */}
          <polygon points={perspFace(roadCorners)} fill="#374151" stroke="#4b5563" strokeWidth="0.5" />
          {/* 도로 중앙선 */}
          <line {...(() => { const [a, b] = toPersp(200, -10, 0); const [c, d] = toPersp(200, -7, 0); return { x1: a, y1: b, x2: c, y2: d } })()} stroke="#fbbf24" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.5" />

          {/* 대지 경계 */}
          <polygon points={perspFace([[bx - 10, bDepth - 5, 0], [bx + bw + 10, bDepth - 5, 0],
            [bx + bw + 10, bDepth + bd + 10, 0], [bx - 10, bDepth + bd + 10, 0]])}
            fill="#3b82f610" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="4 2" opacity="0.5" />

          {/* 건물 그림자 */}
          {buildingBlocks.map((b, i) => (
            <polygon key={`shadow-${i}`}
              points={perspFace([
                [b.x - 3, b.depth - 2, 0],
                [b.x + b.w + 5, b.depth - 2, 0],
                [b.x + b.w + 8, b.depth + b.d + 3, 0],
                [b.x, b.depth + b.d + 3, 0],
              ])}
              fill="#000" opacity="0.15" />
          ))}

          {/* 건물 렌더링 (뒤→앞 순서) */}
          {[...buildingBlocks].sort((a, b) => b.depth - a.depth).map((block, i) => renderBuilding(block, i))}

          {/* 조경 */}
          <PerspTree x={bx - 25} depth={bDepth + 5} size={1.2} />
          <PerspTree x={bx + bw + 25} depth={bDepth + 10} size={1} />
          <PerspTree x={bx + bw + 15} depth={bDepth + bd + 15} size={0.8} />

          {/* 사람 */}
          <PerspPerson x={bx + bw / 2 - 10} depth={bDepth - 8} scale={1} />
          <PerspPerson x={bx + bw / 2 + 10} depth={bDepth - 6} scale={0.9} />

          {/* 차량 */}
          <PerspCar x={bx + bw / 2 + 30} depth={-10} color="#64748b" />

          {/* 높이 치수 */}
          <line x1={dimBotX} y1={dimBotY} x2={dimTopX} y2={dimTopY} stroke="#f59e0b" strokeWidth="0.8" />
          <line x1={dimBotX - 4} y1={dimBotY} x2={dimBotX + 4} y2={dimBotY} stroke="#f59e0b" strokeWidth="0.8" />
          <line x1={dimTopX - 4} y1={dimTopY} x2={dimTopX + 4} y2={dimTopY} stroke="#f59e0b" strokeWidth="0.8" />
          <text x={dimTopX - 8} y={(dimBotY + dimTopY) / 2} fontSize="7" fill="#f59e0b"
            textAnchor="end" dominantBaseline="middle" fontWeight="bold">
            {realTotalH.toFixed(1)}m
          </text>
          <text x={dimTopX - 8} y={(dimBotY + dimTopY) / 2 + 9} fontSize="6" fill="#94a3b8"
            textAnchor="end" dominantBaseline="middle">
            {floors}F
          </text>

          {/* 방위 */}
          <g transform="translate(370, 30)">
            <circle r="14" fill="#0f172a" stroke="#334155" strokeWidth="1" opacity="0.8" />
            <text textAnchor="middle" y="-4" fontSize="9" fill="#60a5fa" fontWeight="bold">N</text>
            <line y1="-2" y2="7" stroke="#60a5fa" strokeWidth="1.5" />
          </g>

          {/* 건물명 */}
          <text x={VP_X} y={24} textAnchor="middle" fontSize="10" fill="#e2e8f0" fontWeight="bold">
            {layoutName || '투시도'}
          </text>
          <text x={VP_X} y={36} textAnchor="middle" fontSize="7" fill="#94a3b8">
            {`${floors}F · ${units}세대 · 건폐율 ${buildingCoverage}%`}
          </text>

          {/* 스케일 바 */}
          <g transform="translate(160, 385)">
            <line x1="0" y1="0" x2="80" y2="0" stroke="#475569" strokeWidth="2" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#475569" strokeWidth="1.5" />
            <line x1="80" y1="-3" x2="80" y2="3" stroke="#475569" strokeWidth="1.5" />
            <text textAnchor="middle" x="40" y="-5" fontSize="7" fill="#64748b">
              {Math.round(sideM)}m
            </text>
          </g>
        </svg>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        투시도 · {type === 'tower' ? '타워형' : type === 'courtyard' ? '중정형' :
        type === 'lshape' ? 'ㄱ자형' : type === 'linear' ? '판상형' : '클러스터형'}
        {zoneType ? ` · ${({'residential-exclusive-1':'제1종 전용주거','residential-exclusive-2':'제2종 전용주거','residential-general-1':'제1종 일반주거','residential-general-2':'제2종 일반주거','residential-general-3':'제3종 일반주거','semi-residential':'준주거','general-commercial':'일반상업','neighborhood-commercial':'근린상업','central-commercial':'중심상업','distribution-commercial':'유통상업','exclusive-industrial':'전용공업','general-industrial':'일반공업','semi-industrial':'준공업','natural-green':'자연녹지','production-green':'생산녹지','conservation-green':'보전녹지','conservation-management':'보전관리','production-management':'생산관리','planning-management':'계획관리','rural-village':'농림','natural-environment':'자연환경보전'} as Record<string,string>)[zoneType] || zoneType}` : ''}
      </p>
    </div>
  )
}
