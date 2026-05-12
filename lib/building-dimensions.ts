/**
 * 건물 치수 공통 계산 — AI 렌더링(ai-render/route.ts)과 동일한 공식
 * 모든 도면 컴포넌트(배치도, 아이소, 투시도, 입면도, 단면도, 3D)에서 사용
 * → 도면과 AI 렌더링 치수 100% 일치 보장
 */

export interface BuildingDimensions {
  /** 개별 동 가로(m) */
  width: number
  /** 개별 동 세로(m) */
  depth: number
  /** 개별 동 건축면적(㎡) */
  footprint: number
  /** 전체 건축면적(㎡) */
  totalFootprint: number
  /** 동수 */
  buildingCount: number
  /** 건물 높이(m) */
  height: number
  /** 1층 높이(m) */
  groundFloorHeight: number
  /** 기준층 높이(m) */
  typicalFloorHeight: number
}

/**
 * AI 렌더링과 동일한 건물 치수 계산
 * @param siteArea - 대지면적(㎡)
 * @param coverage - 건폐율(%)
 * @param floors - 층수
 * @param units - 세대수
 * @param buildingCount - 동수
 * @param buildingType - 건물 타입 (linear/lshape/courtyard/tower/cluster)
 */
export function calculateBuildingDimensions(
  siteArea: number,
  coverage: number,
  floors: number,
  units: number,
  buildingCount: number,
  buildingType: string
): BuildingDimensions {
  const totalFootprint = siteArea * coverage / 100
  const eachFootprint = Math.round(totalFootprint / Math.max(buildingCount, 1))
  
  // AI 렌더링(route.ts line 798)과 동일한 비율
  const linearRatio = buildingType === 'linear' ? 3.5 : 
                      buildingType === 'lshape' ? 1.8 :
                      buildingType === 'courtyard' ? 1.5 : 1.4
  
  const width = Math.round(Math.sqrt(eachFootprint * linearRatio))
  const depth = Math.round(eachFootprint / Math.max(width, 1))
  
  const groundFloorHeight = 4.5 // 1층 (로비/상가)
  const typicalFloorHeight = 3.3 // 기준층
  const height = groundFloorHeight + (Math.max(floors - 1, 0) * typicalFloorHeight)
  
  return {
    width,
    depth,
    footprint: eachFootprint,
    totalFootprint,
    buildingCount,
    height,
    groundFloorHeight,
    typicalFloorHeight,
  }
}
