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
}): BuildingGeometry {
  const { type, coverage, siteArea, floors, buildingCount = 1, originalType, floorHeight = 3.3 } = params
  const S = Math.sqrt(siteArea)
  const fp = Math.max(coverage, 20) / 100
  
  let blocks: BuildingBlock[]
  let wingThickness = 0
  let effectiveBuildingCount = 1

  // 클러스터 (다동) — 동적 계산
  if (type === 'cluster' && buildingCount > 1) {
    blocks = getClusterBlocks(buildingCount, originalType || 'tower', coverage)
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
export function getClusterBlocks(n: number, originalType: string, coverage: number): BuildingBlock[] {
  const covR = (coverage || 50) / 100
  const eachFP = covR / Math.max(n, 1)
  const lr = originalType === 'linear' ? 3.5 : originalType === 'lshape' ? 1.8 : originalType === 'courtyard' ? 1.5 : 1.4
  const w = Math.sqrt(eachFP * lr)
  const d = eachFP / w

  const isLinear = originalType === 'linear'
  const cols = isLinear ? 1 : n <= 2 ? 2 : n <= 4 ? 2 : 3
  const rows = Math.ceil(n / cols)
  const gapZ = isLinear ? Math.max(0.12, d * 0.8) : 0.15
  const totalZ = rows * d + (rows - 1) * gapZ
  const totalX = cols * w + (cols - 1) * 0.08

  const result: BuildingBlock[] = []
  let cnt = 0
  for (let r = 0; r < rows && cnt < n; r++) {
    for (let c = 0; c < cols && cnt < n; c++) {
      result.push({
        x: cols === 1 ? 0 : -totalX / 2 + w / 2 + c * (w + 0.08),
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
