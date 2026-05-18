/**
 * 조경계획 + 주차배치 자동 생성
 * 기본설계 단계 완성 (90→100%)
 */

export interface LandscapeElement {
  type: 'tree' | 'shrub' | 'lawn' | 'pavement' | 'bench' | 'fountain' | 'planter'
  x: number; y: number  // 대지 내 비율 (0~1)
  size: number           // 직경 (m)
  label: string
}

export interface ParkingSlot {
  x: number; y: number
  width: number; height: number  // m
  type: 'standard' | 'compact' | 'disabled' | 'ev'
  angle: number  // 직각=90, 평행=0
}

export interface LandscapePlan {
  elements: LandscapeElement[]
  parkingSlots: ParkingSlot[]
  greenRatio: number        // 조경면적 비율 (%)
  parkingCount: number
  treeCount: number
  shrubCount: number
}

export function generateLandscapePlan(params: {
  siteArea: number; coverage: number; floors: number; units: number; type: string
}): LandscapePlan {
  const { siteArea, coverage, units, type } = params
  const openArea = siteArea * (1 - coverage / 100)
  const elements: LandscapeElement[] = []
  const parkingSlots: ParkingSlot[] = []

  // 주차 (세대당 1대 + 방문자 10%)
  const totalParking = Math.ceil(units * 1.1)
  const slotW = 2.5, slotD = 5.0
  const parkingRows = Math.ceil(totalParking / Math.max(Math.floor(Math.sqrt(siteArea) / slotW), 2))
  
  for (let i = 0; i < totalParking; i++) {
    const row = Math.floor(i / Math.max(Math.floor(totalParking / parkingRows), 1))
    const col = i % Math.max(Math.floor(totalParking / parkingRows), 1)
    parkingSlots.push({
      x: 0.05 + col * 0.08, y: 0.85 - row * 0.12,
      width: slotW, height: slotD,
      type: i === 0 ? 'disabled' : i === 1 ? 'ev' : 'standard',
      angle: 90,
    })
  }

  // 조경 (전면 + 측면 + 후면)
  const treeCount = Math.max(3, Math.round(openArea / 50))
  for (let i = 0; i < treeCount; i++) {
    elements.push({
      type: 'tree', x: 0.1 + (i / treeCount) * 0.8, y: 0.05 + Math.random() * 0.15,
      size: 3 + Math.random() * 2, label: ['소나무', '느티나무', '단풍나무', '벚나무', '은행나무'][i % 5],
    })
  }

  // 관목
  const shrubCount = Math.round(treeCount * 1.5)
  for (let i = 0; i < shrubCount; i++) {
    elements.push({
      type: 'shrub', x: 0.05 + Math.random() * 0.9, y: 0.2 + Math.random() * 0.1,
      size: 1, label: '회양목',
    })
  }

  // 잔디/포장
  elements.push({ type: 'lawn', x: 0.3, y: 0.1, size: Math.sqrt(openArea * 0.3), label: '잔디광장' })
  elements.push({ type: 'pavement', x: 0.5, y: 0.5, size: 3, label: '보행로' })
  
  // 벤치/시설
  if (units >= 10) {
    elements.push({ type: 'bench', x: 0.4, y: 0.15, size: 1.5, label: '벤치' })
    elements.push({ type: 'planter', x: 0.6, y: 0.12, size: 2, label: '화분대' })
  }
  if (units >= 30) {
    elements.push({ type: 'fountain', x: 0.5, y: 0.1, size: 3, label: '수경시설' })
  }

  const greenArea = treeCount * 10 + shrubCount * 2 + openArea * 0.3
  return {
    elements, parkingSlots,
    greenRatio: Math.round(greenArea / siteArea * 100),
    parkingCount: totalParking,
    treeCount, shrubCount,
  }
}
