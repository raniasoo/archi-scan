/**
 * 실시설계 상세 스펙 자동 생성
 * 벽체단면 / 방수 / 단열 / 배근 / 마감 상세
 */

export interface WallSection {
  id: string; name: string; location: string
  layers: { material: string; thickness: number; unit: string }[]
  totalThickness: number
  uValue: number  // 열관류율 (W/㎡·K)
}

export interface WaterproofSpec {
  location: string; method: string; material: string; thickness: number; layers: number
}

export interface InsulationSpec {
  location: string; material: string; thickness: number; rValue: number
  standard: string  // 에너지절약설계기준
}

export interface RebarDetail {
  member: string; mainBar: string; stirrup: string; spacing: number
  coverTop: number; coverBottom: number; coverSide: number
  hookType: string
}

export interface ConstructionDetail {
  wallSections: WallSection[]
  waterproofing: WaterproofSpec[]
  insulation: InsulationSpec[]
  rebarDetails: RebarDetail[]
  miscSpecs: { item: string; spec: string; standard: string }[]
}

export function generateConstructionDetail(params: {
  floors: number; type: string; region?: string
}): ConstructionDetail {
  const { floors, region = '중부' } = params
  const isHighRise = floors > 10

  // 벽체 단면
  const wallSections: WallSection[] = [
    { id: 'W-EXT', name: '외벽 (일반)', location: '외부',
      layers: [
        { material: '외장재 (석재/타일)', thickness: 30, unit: 'mm' },
        { material: '통기층', thickness: 50, unit: 'mm' },
        { material: '방수시트', thickness: 2, unit: 'mm' },
        { material: '단열재 (비드법보온판 1종 2호)', thickness: region === '중부' ? 130 : 100, unit: 'mm' },
        { material: 'RC벽체', thickness: 200, unit: 'mm' },
        { material: '실내 석고보드', thickness: 12.5, unit: 'mm' },
        { material: '실내 도장', thickness: 1, unit: 'mm' },
      ],
      totalThickness: 0, uValue: region === '중부' ? 0.17 : 0.22 },
    { id: 'W-INT-RC', name: '내벽 (RC)', location: '세대간',
      layers: [
        { material: '석고보드', thickness: 12.5, unit: 'mm' },
        { material: 'RC벽체', thickness: 200, unit: 'mm' },
        { material: '석고보드', thickness: 12.5, unit: 'mm' },
      ],
      totalThickness: 0, uValue: 2.5 },
    { id: 'W-INT-LW', name: '내벽 (경량)', location: '실내',
      layers: [
        { material: '석고보드 양면', thickness: 25, unit: 'mm' },
        { material: '스터드 + 글라스울', thickness: 65, unit: 'mm' },
        { material: '석고보드 양면', thickness: 25, unit: 'mm' },
      ],
      totalThickness: 0, uValue: 1.8 },
  ]
  wallSections.forEach(w => w.totalThickness = w.layers.reduce((s, l) => s + l.thickness, 0))

  // 방수
  const waterproofing: WaterproofSpec[] = [
    { location: '지하외벽', method: '시트방수', material: '아스팔트시트', thickness: 4, layers: 2 },
    { location: '옥상', method: '도막방수 + 단열', material: '우레탄도막', thickness: 3, layers: 2 },
    { location: '욕실/화장실', method: '도막방수', material: '시멘트계 도막', thickness: 2, layers: 2 },
    { location: '발코니', method: '시트방수', material: 'TPO시트', thickness: 1.5, layers: 1 },
    { location: '기초 하부', method: '시트방수', material: 'PE필름', thickness: 0.2, layers: 1 },
  ]

  // 단열 (에너지절약설계기준)
  const insulation: InsulationSpec[] = [
    { location: '외벽', material: '비드법보온판 1종 2호', thickness: region === '중부' ? 130 : 100, rValue: region === '중부' ? 4.35 : 3.45, standard: '건축물 에너지절약설계기준 별표1' },
    { location: '최상층 지붕', material: '압출법보온판 특호', thickness: region === '중부' ? 220 : 175, rValue: region === '중부' ? 6.52 : 5.00, standard: '건축물 에너지절약설계기준 별표1' },
    { location: '최하층 바닥', material: '비드법보온판 1종 3호', thickness: region === '중부' ? 145 : 110, rValue: region === '중부' ? 3.12 : 2.37, standard: '건축물 에너지절약설계기준 별표1' },
    { location: '창호', material: '로이복층유리 22mm', thickness: 22, rValue: 1.6, standard: '창호 열관류율 기준' },
  ]

  // 배근 상세
  const rebarDetails: RebarDetail[] = [
    { member: '기둥', mainBar: isHighRise ? '8-D22' : '8-D19', stirrup: 'D10@200', spacing: 200, coverTop: 40, coverBottom: 40, coverSide: 40, hookType: '135° 갈고리' },
    { member: '보', mainBar: isHighRise ? '상근 4-D22, 하근 3-D22' : '상근 3-D19, 하근 2-D19', stirrup: 'D10@250', spacing: 250, coverTop: 40, coverBottom: 40, coverSide: 40, hookType: '135° 갈고리' },
    { member: '슬래브', mainBar: 'D10@200 양방향', stirrup: '-', spacing: 200, coverTop: 20, coverBottom: 20, coverSide: 20, hookType: '-' },
    { member: '기초', mainBar: isHighRise ? 'D16@200 양방향' : 'D13@200 양방향', stirrup: '-', spacing: 200, coverTop: 60, coverBottom: 80, coverSide: 60, hookType: '-' },
    { member: '벽체', mainBar: 'D10@300 양면', stirrup: '-', spacing: 300, coverTop: 40, coverBottom: 40, coverSide: 40, hookType: '-' },
  ]

  // 기타 스펙
  const miscSpecs = [
    { item: '콘크리트 강도', spec: isHighRise ? 'C27 (기둥/벽), C24 (슬래브)' : 'C24 (전체)', standard: 'KDS 14 20 00' },
    { item: '철근 재질', spec: 'SD400 (D10~D25), SD500 (D29~)', standard: 'KS D 3504' },
    { item: '시멘트', spec: '보통포틀랜드시멘트 (1종)', standard: 'KS L 5201' },
    { item: '거푸집', spec: '유로폼 (합판 12mm)', standard: 'KCS 14 20 12' },
    { item: '앵커볼트', spec: isHighRise ? 'M20 SD400' : 'M16 SD400', standard: 'KDS 41 31 00' },
    { item: '용접', spec: '완전용입 그루브 용접', standard: 'KCS 14 31 25' },
    { item: '내화피복', spec: floors >= 6 ? '2시간 내화 (뿜칠)' : '1시간 내화', standard: '건축물 방화구조기준' },
  ]

  return { wallSections, waterproofing, insulation, rebarDetails, miscSpecs }
}
