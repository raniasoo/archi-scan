// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 크리스토퍼 알렉산더 패턴 → 3D/도면 시각 요소 매핑
// 253개 패턴 + 15개 속성 → Three.js/SVG 공통 사용
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface PatternVisuals {
  // 외부 조경
  hasCourtyard: boolean        // #115 살아있는 안마당
  hasGardenWall: boolean       // #110 정원벽 (헤지/화단)
  hasOutdoorRoom: boolean      // #163 야외 방 (퍼골라/벤치)
  hasFruitTrees: boolean       // #170 과일 나무
  hasPlayground: boolean       // #73 어린이 놀이터
  hasQuietEntry: boolean       // #112 조용한 입구 전이공간
  hasSouthGarden: boolean      // #105 남향 외부공간

  // 건물 요소
  hasBalcony: boolean          // #166 넓은 발코니
  hasVisibleRoof: boolean      // #117 보호하는 지붕
  hasMainEntrance: boolean     // #110 명확한 입구
  hasWindowSeat: boolean       // #180 창가 자리
  hasCeilingHeight: boolean    // #190 천장 높이 변화
  hasPrivateTerrace: boolean   // #140 사적 테라스
  hasEarthConnect: boolean     // #168 지면 연결

  // 15속성 시각 요소
  strongCenter: boolean        // 강한 중심 (중정/광장)
  thickBoundary: boolean       // 두꺼운 경계 (전이공간)
  positiveSpace: boolean       // 양의 공간 (의도된 외부공간)
  roughness: boolean           // 거침 (자연 재질)
  gradients: boolean           // 점진적 변이 (공적→사적)
  contrast: boolean            // 대비 (밝음/어두움)
  theVoid: boolean             // 여백 (빈 잔디밭)
  echoes: boolean              // 반향 (재질 반복)
  levelsOfScale: boolean       // 스케일의 단계

  // 표시용 텍스트
  patternLabels: string[]      // 적용된 패턴 이름
  propertyLabels: string[]     // 적용된 속성 이름
}

/**
 * 배치안 데이터에서 적용 가능한 알렉산더 패턴/속성을 자동 추출합니다.
 */
export function getPatternVisuals(params: {
  type: string; floors: number; units?: number; coverage: number;
  siteArea: number; buildingCount?: number; patterns?: string[];
}): PatternVisuals {
  const { type, floors, units = 1, coverage, siteArea, buildingCount = 1, patterns = [] } = params
  const openSpace = 100 - coverage
  const isLow = floors <= 3
  const isCourt = type === 'courtyard'
  const isL = type === 'lshape'
  const isCluster = type === 'cluster'

  const patternLabels: string[] = []
  const propertyLabels: string[] = []

  // 패턴 자동 추출
  const hasCourtyard = isCourt || patterns.includes('courtyard')
  if (hasCourtyard) patternLabels.push('#115 살아있는 안마당')

  const hasGardenWall = isL || isCourt || openSpace > 35 || patterns.includes('garden-wall')
  if (hasGardenWall) patternLabels.push('#110 정원벽')

  const hasOutdoorRoom = isL || isCourt || patterns.includes('outdoor-room')
  if (hasOutdoorRoom) patternLabels.push('#163 야외 방')

  const hasFruitTrees = isLow || openSpace > 40 || patterns.includes('fruit-trees')
  if (hasFruitTrees) patternLabels.push('#170 과일 나무')

  const hasPlayground = (units >= 5 && openSpace > 30) || patterns.includes('connected-play')
  if (hasPlayground) patternLabels.push('#73 놀이터')

  const hasQuietEntry = isCourt || isL || patterns.includes('quiet-entry')
  if (hasQuietEntry) patternLabels.push('#112 조용한 입구')

  const hasSouthGarden = openSpace > 30 || patterns.includes('south-light')
  if (hasSouthGarden) patternLabels.push('#105 남향 외부공간')

  const hasBalcony = floors >= 2 || patterns.includes('balcony')
  if (hasBalcony) patternLabels.push('#166 발코니')

  const hasVisibleRoof = isLow || patterns.includes('visible-roof')
  if (hasVisibleRoof) patternLabels.push('#117 보호하는 지붕')

  const hasMainEntrance = true
  patternLabels.push('#110 명확한 입구')

  const hasWindowSeat = patterns.includes('window-place')
  const hasCeilingHeight = patterns.includes('ceiling-height')
  const hasPrivateTerrace = isLow || patterns.includes('private-terrace')
  if (hasPrivateTerrace) patternLabels.push('#140 사적 테라스')
  const hasEarthConnect = isLow || patterns.includes('earth-connect')
  if (hasEarthConnect) patternLabels.push('#168 지면 연결')

  // 15속성
  const strongCenter = isCourt || isCluster
  if (strongCenter) propertyLabels.push('강한 중심')
  const thickBoundary = isLow || isCourt
  if (thickBoundary) propertyLabels.push('두꺼운 경계')
  const positiveSpace = isCourt || isL || openSpace > 45
  if (positiveSpace) propertyLabels.push('양의 공간')
  const roughness = isLow
  if (roughness) propertyLabels.push('거침')
  const gradients = isCourt || isL
  if (gradients) propertyLabels.push('점진적 변이')
  const contrast = true
  propertyLabels.push('대비')
  const theVoid = openSpace > 50
  if (theVoid) propertyLabels.push('여백')
  const echoes = true
  propertyLabels.push('반향')
  const levelsOfScale = true
  propertyLabels.push('스케일의 단계')

  return {
    hasCourtyard, hasGardenWall, hasOutdoorRoom, hasFruitTrees, hasPlayground,
    hasQuietEntry, hasSouthGarden, hasBalcony, hasVisibleRoof, hasMainEntrance,
    hasWindowSeat, hasCeilingHeight, hasPrivateTerrace, hasEarthConnect,
    strongCenter, thickBoundary, positiveSpace, roughness, gradients,
    contrast, theVoid, echoes, levelsOfScale,
    patternLabels, propertyLabels,
  }
}
