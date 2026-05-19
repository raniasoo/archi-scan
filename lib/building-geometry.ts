// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 건물 치수 공유 유틸리티 (Single Source of Truth)
// Three.js 3D · 도면 7종 · DXF 모두 이 함수를 사용
// → 배치안 ↔ Three.js ↔ 도면 100% 일치 보장
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface BuildingBlock {
  x: number  // 대지 한 변 대비 비율 (-0.5 ~ 0.5)
  z: number
  w: number  // 대지 한 변 대비 비율
  d: number
  label?: string
}

export interface BuildingGeometry {
  blocks: BuildingBlock[]
  siteWidth: number     // 대지 한 변 (m)
  totalFootprint: number // 건축면적 (㎡)
  buildingHeight: number // 건물 높이 (m)
  wingThickness: number  // 날개 두께 (대지 비율)
  floorHeight: number    // 층고 (m)
  type: string
  effectiveBuildingCount: number
}

/**
 * 배치 타입·건폐율·대지면적·층수로 건물 치수를 계산합니다.
 * Three.js, 도면 7종, DXF 모두 이 함수를 사용합니다.
 */
export function getBuildingGeometry(params: {
  type: string
  coverage: number
  siteArea: number
  floors: number
  buildingCount?: number
  originalType?: string
  floorHeight?: number
  siteAspectRatio?: number  // 대지 가로/세로 비율 (1.0 = 정사각형)
}): BuildingGeometry {
  const { type, coverage, siteArea, floors, buildingCount = 1, originalType, floorHeight = 3.3, siteAspectRatio } = params
  const S = Math.sqrt(siteArea)
  const fp = Math.max(coverage, 20) / 100
  
  let blocks: BuildingBlock[]
  let wingThickness = 0
  let effectiveBuildingCount = 1

  // 다동 배치 — type이 cluster가 아니더라도 buildingCount > 1이면 다동 분리
  if (buildingCount > 1) {
    blocks = getClusterBlocks(buildingCount, originalType || type || 'tower', coverage, siteAspectRatio)
    effectiveBuildingCount = buildingCount
  } else {
    // 단동 타입별 계산
    switch (type) {
      case 'tower': {
        const ratio = 1.2
        const w = Math.sqrt(fp * ratio)
        const d = fp / w
        blocks = [{ x: 0, z: 0, w, d, label: 'TOWER' }]
        break
      }
      case 'linear': {
        const w = Math.min(0.92, Math.sqrt(fp * 3.2))
        const d = fp / w
        blocks = [{ x: 0, z: 0, w, d, label: 'SLAB' }]
        break
      }
      case 'lshape': {
        // ㄱ자형: 날개 두께 + 최대 비율 제한 (현실적 건물 형태)
        const wt = Math.max(Math.sqrt(fp) * 0.42, 0.18)
        wingThickness = wt
        
        // 수평/수직 날개 면적 배분 (40:60)
        let H = 0.4 * fp / wt   // 수평 날개 길이
        let V = 0.6 * fp / wt + wt  // 수직 날개 길이 (코너 포함)
        
        // ━━━ 비율 제한: 날개 길이/두께 최대 3.5:1 ━━━
        const maxRatio = 3.5
        if (V / wt > maxRatio) {
          V = wt * maxRatio
          // 남은 면적을 수평 날개로 재배분
          const usedArea = wt * V + wt * H - wt * wt // 코너 중복 제거
          const targetArea = fp
          if (usedArea < targetArea) {
            H = H + (targetArea - usedArea) / wt
          }
        }
        if (H / wt > maxRatio) {
          H = wt * maxRatio
        }
        
        const longX = H / 2 - wt / 2
        const shortZ = -(V / 2 - wt / 2)
        blocks = [
          { x: longX, z: 0, w: wt, d: V, label: '' },
          { x: 0, z: shortZ, w: H, d: wt, label: 'ㄱ자형' },
        ]
        break
      }
      case 'courtyard': {
        const wt = Math.sqrt(fp) * 0.33
        wingThickness = wt
        const totalW = 0.36 * fp / wt
        const totalD = 0.32 * fp / wt + wt
        const halfW = totalW / 2
        const topZ = -(totalD / 2)
        const sideZ = topZ + wt / 2 + totalD / 2 - wt / 2 + wt / 2
        blocks = [
          { x: 0, z: topZ, w: totalW, d: wt, label: '북동' },
          { x: -(halfW - wt / 2), z: sideZ, w: wt, d: totalD - wt, label: '서동' },
          { x: (halfW - wt / 2), z: sideZ, w: wt, d: totalD - wt, label: '동동' },
        ]
        break
      }
      case 'cluster': {
        const n = buildingCount || 4
        const each = fp / n
        const w = Math.sqrt(each * 1.3)
        const d = each / w
        const cols = n <= 2 ? 2 : n <= 4 ? 2 : 3
        const rows = Math.ceil(n / cols)
        const gapX = 0.10, gapZ = 0.12
        const totalW = cols * w + (cols - 1) * gapX
        const totalD = rows * d + (rows - 1) * gapZ
        blocks = []
        let cnt = 0
        for (let r = 0; r < rows && cnt < n; r++) {
          for (let c = 0; c < cols && cnt < n; c++) {
            blocks.push({
              x: -totalW / 2 + w / 2 + c * (w + gapX),
              z: -totalD / 2 + d / 2 + r * (d + gapZ),
              w, d,
              label: `${String.fromCharCode(65 + cnt)}동`,
            })
            cnt++
          }
        }
        effectiveBuildingCount = n
        break
      }
      // ━━━ 신규 4가지 건물 유형 (TestFit 수준 확장) ━━━
      case 'y-shape': {
        // Y자형: 120° 간격 3개 날개 (3방향 조망)
        const wt = Math.sqrt(fp) * 0.35
        wingThickness = wt
        const wingLen = fp / (3 * wt) * 0.9
        const r120 = (2 * Math.PI) / 3
        blocks = [0, 1, 2].map((i) => {
          const angle = -Math.PI / 2 + i * r120
          const cx = Math.cos(angle) * wingLen * 0.35
          const cz = Math.sin(angle) * wingLen * 0.35
          return { x: cx, z: cz, w: wt, d: wingLen * 0.7, label: i === 0 ? 'Y자형' : '' }
        })
        break
      }
      case 't-shape': {
        // T자형: 상단 가로바 + 하단 세로바 (도로 정면 활용)
        const wt = Math.sqrt(fp) * 0.38
        wingThickness = wt
        const topW = fp * 0.55 / wt  // 가로바 폭
        const stemH = fp * 0.45 / wt // 세로바 높이
        blocks = [
          { x: 0, z: -(stemH / 2 + wt / 2), w: topW, d: wt, label: 'T자형' },
          { x: 0, z: wt / 2, w: wt, d: stemH, label: '' },
        ]
        break
      }
      case 'piloti': {
        // 필로티형: 1층 개방 + 상층 주거 (타워와 비슷하나 1층 필로티)
        const ratio = 1.3
        const w = Math.sqrt(fp * ratio)
        const d = fp / w
        blocks = [{ x: 0, z: 0, w, d, label: 'PILOTI' }]
        break
      }
      case 'officetel': {
        // 오피스텔: 중복도형 (가로가 긴 직사각형, 양쪽에 유닛)
        const otRatio = 2.5  // 오피스텔은 세장비 높음
        const otW = Math.sqrt(fp * otRatio)
        const otD = fp / otW
        blocks = [{ x: 0, z: 0, w: otW, d: otD, label: 'OFFICETEL' }]
        break
      }
      case 'terrace': {
        // 테라스형: 계단식 후퇴 (경사지 대응)
        const stepCount = 3
        const baseW = Math.sqrt(fp * 1.5)
        const baseD = fp / (baseW * 0.8)
        blocks = []
        for (let s = 0; s < stepCount; s++) {
          const scale = 1 - s * 0.15
          const stepW = baseW * scale
          const stepD = baseD / stepCount
          blocks.push({
            x: 0, z: s * stepD * 0.6,
            w: stepW, d: stepD * 0.8,
            label: s === 0 ? '테라스형' : '',
          })
        }
        break
      }
      default: {
        const s = Math.sqrt(fp)
        blocks = [{ x: 0, z: 0, w: s, d: s }]
      }
    }
  }

  // 건축면적 계산 (L자/ㄷ자는 코너 중복 제거)
  let totalFootprint: number
  if (type === 'lshape' && wingThickness > 0) {
    // L자: wt × (H + V - wt) = fp × S² (코너 중복 제거)
    const wt = wingThickness * S
    const H = blocks[0] ? S * blocks[1].w : 0  // short wing
    const V = blocks[0] ? S * blocks[0].d : 0  // long wing  
    totalFootprint = wt * (H + V - wt)
  } else if (type === 'courtyard' && wingThickness > 0) {
    // ㄷ자: topW × wt + 2 × wt × sideD (중복 없는 정확 계산)
    const wt = wingThickness * S
    const topW = blocks[0] ? S * blocks[0].w : 0
    const sideD = blocks[1] ? S * blocks[1].d : 0
    totalFootprint = topW * wt + 2 * wt * sideD
  } else {
    totalFootprint = blocks.reduce((sum, b) => sum + (S * b.w) * (S * b.d), 0)
  }

  return {
    blocks,
    siteWidth: S,
    totalFootprint,
    buildingHeight: floors * floorHeight,
    wingThickness,
    floorHeight,
    type,
    effectiveBuildingCount,
  }
}

/**
 * 클러스터(다동) 블록 동적 생성
 */
export function getClusterBlocks(n: number, originalType: string, coverage: number, siteAspectRatio?: number): BuildingBlock[] {
  const covR = (coverage || 50) / 100
  const eachFP = covR / Math.max(n, 1)
  const lr = originalType === 'linear' ? 3.5 : originalType === 'lshape' ? 1.8 : originalType === 'courtyard' ? 1.5 : 1.4
  const w = Math.sqrt(eachFP * lr)
  const d = eachFP / w

  const isLinear = originalType === 'linear'
  const ar = siteAspectRatio || 1.0 // 대지 종횡비 (가로/세로)
  
  // ★ 대지 종횡비에 맞춰 열/행 배분
  let cols: number, rows: number
  if (isLinear) {
    // 판상형: 가로 넓으면 2열, 세로 넓으면 1열
    if (ar > 1.3 && n >= 4) {
      cols = 2
    } else {
      cols = 1
    }
  } else {
    cols = n <= 2 ? n : n <= 4 ? 2 : 3
  }
  rows = Math.ceil(n / cols)
  
  // 블록 간격 — 대지에 맞춰 조정
  const gapX = isLinear ? 0.08 : 0.12
  const gapZ = isLinear ? Math.max(0.08, d * 0.5) : 0.12
  const totalZ = rows * d + (rows - 1) * gapZ
  const totalX = cols * w + (cols - 1) * gapX

  const result: BuildingBlock[] = []
  let cnt = 0
  for (let r = 0; r < rows && cnt < n; r++) {
    for (let c = 0; c < cols && cnt < n; c++) {
      result.push({
        x: cols === 1 ? 0 : -totalX / 2 + w / 2 + c * (w + gapX),
        z: -totalZ / 2 + d / 2 + r * (d + gapZ),
        w, d,
        label: `${String.fromCharCode(65 + cnt)}동`,
      })
      cnt++
    }
  }
  return result
}

/**
 * 건물의 실제 미터 단위 치수를 반환합니다.
 * SVG 도면 컴포넌트에서 사용합니다.
 */
export function getBuildingDimensionsInMeters(params: {
  type: string
  coverage: number
  siteArea: number
  floors: number
  buildingCount?: number
  originalType?: string
  siteAspectRatio?: number
}) {
  const geo = getBuildingGeometry(params)
  const S = geo.siteWidth

  return {
    ...geo,
    blocksInMeters: geo.blocks.map(b => ({
      ...b,
      widthM: S * b.w,
      depthM: S * b.d,
      centerXM: S * b.x,
      centerZM: S * b.z,
      areaM2: (S * b.w) * (S * b.d),
    })),
    siteWidthM: S,
    buildingHeightM: geo.buildingHeight,
    wingThicknessM: geo.wingThickness * S,
  }
}
