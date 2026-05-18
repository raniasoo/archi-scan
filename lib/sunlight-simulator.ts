/**
 * 일조/조망 시뮬레이션 엔진
 * 
 * 태양 위치 → 그림자 방향 → 일조 시간 계산
 * 북측사선제한 시각화
 * 한국 건축법 기준 (동지 기준 일조 4시간)
 */

import SunCalc from 'suncalc'

export interface SunPosition {
  hour: number
  altitude: number     // 태양 고도각 (°) — 0=수평선, 90=머리 위
  azimuth: number      // 태양 방위각 (°) — 0=남, 90=서, -90=동, 180=북
  shadowLength: number // 건물 높이 대비 그림자 길이 배율
  shadowAngle: number  // 그림자 방향 (°, 북=0)
}

export interface DaylightResult {
  sunrise: string       // 일출 시간 HH:MM
  sunset: string        // 일몰 시간 HH:MM
  totalHours: number    // 총 일조 시간
  positions: SunPosition[]
  winterSolstice: {     // 동지 기준 (최악 조건)
    sunrise: string
    sunset: string
    totalHours: number
    positions: SunPosition[]
  }
  northShadow: {        // 북측 사선 제한
    angle: number       // 사선 각도 (°)
    maxHeight: number   // 이격 거리별 최대 높이 (m)
    setbackNeeded: number // 필요 이격 거리 (m)
  }
  facades: {            // 각 면 일조 시간
    south: number
    east: number
    west: number
    north: number
  }
}

// 서울 기본 좌표
const DEFAULT_LAT = 37.5665
const DEFAULT_LNG = 126.9780

function formatTime(date: Date): string {
  // 서버(UTC) → KST(+9) 보정
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`
}

function toDeg(rad: number): number {
  return rad * 180 / Math.PI
}

// 특정 날짜의 시간별 태양 위치 계산
function calculateDayPositions(date: Date, lat: number, lng: number): SunPosition[] {
  const positions: SunPosition[] = []
  
  for (let hour = 5; hour <= 20; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = new Date(date)
      time.setHours(hour, min, 0, 0)
      
      const pos = SunCalc.getPosition(time, lat, lng)
      const altDeg = toDeg(pos.altitude)
      
      if (altDeg <= 0) continue // 해가 진 상태
      
      // 방위각: SunCalc은 남=0, 서=양수, 동=음수 (라디안)
      const aziDeg = toDeg(pos.azimuth)
      
      // 그림자 길이 = 1 / tan(고도각)
      const shadowLen = altDeg > 1 ? 1 / Math.tan(pos.altitude) : 50
      
      // 그림자 방향 = 태양 반대편
      const shadowAngle = (aziDeg + 180) % 360
      
      positions.push({
        hour: hour + min / 60,
        altitude: Math.round(altDeg * 10) / 10,
        azimuth: Math.round(aziDeg * 10) / 10,
        shadowLength: Math.round(shadowLen * 100) / 100,
        shadowAngle: Math.round(shadowAngle * 10) / 10,
      })
    }
  }
  
  return positions
}

// 각 면(남/동/서/북)의 일조 시간 계산
function calculateFacadeHours(positions: SunPosition[]): { south: number; east: number; west: number; north: number } {
  let south = 0, east = 0, west = 0, north = 0
  const interval = 0.5 // 30분 간격
  
  for (const pos of positions) {
    if (pos.altitude <= 0) continue
    
    const azi = pos.azimuth
    
    // 남측: 방위각 -90°~+90° (태양이 남쪽 반구에 있을 때)
    if (azi >= -90 && azi <= 90) south += interval
    
    // 동측: 방위각 -180°~0° (태양이 동쪽에 있을 때 = 오전)
    if (azi >= -180 && azi <= 0) east += interval
    
    // 서측: 방위각 0°~180° (태양이 서쪽에 있을 때 = 오후)
    if (azi >= 0 && azi <= 180) west += interval
    
    // 북측: 방위각 -180°~-90° 또는 90°~180° (태양이 북쪽 반구)
    if (azi < -90 || azi > 90) north += interval
  }
  
  return {
    south: Math.round(south * 10) / 10,
    east: Math.round(east * 10) / 10,
    west: Math.round(west * 10) / 10,
    north: Math.round(north * 10) / 10,
  }
}

// 북측 사선 제한 계산
// 한국 건축법: 일조권 확보를 위해 정북방향 인접대지 경계선으로부터
// 높이 9m 이하: 1.5m 이격
// 높이 9m 초과: (건물높이 - 9) × tan(사선각도) + 1.5m 이격
function calculateNorthShadow(buildingHeight: number, setbackDistance: number): {
  angle: number; maxHeight: number; setbackNeeded: number
} {
  // 기본 사선 각도 (서울 기준: 약 27° 또는 1:2 비율)
  const slopeAngle = 27 // 도
  const slopeRatio = Math.tan(slopeAngle * Math.PI / 180) // ≈ 0.51
  
  // 현재 이격 거리에서 허용 최대 높이
  const maxHeight = setbackDistance >= 1.5
    ? 9 + (setbackDistance - 1.5) / slopeRatio
    : 9
  
  // 현재 건물 높이에 필요한 최소 이격 거리
  const setbackNeeded = buildingHeight <= 9
    ? 1.5
    : 1.5 + (buildingHeight - 9) * slopeRatio
  
  return {
    angle: slopeAngle,
    maxHeight: Math.round(maxHeight * 10) / 10,
    setbackNeeded: Math.round(setbackNeeded * 10) / 10,
  }
}

// ━━━ 메인: 일조 시뮬레이션 실행 ━━━
export function simulateSunlight(params: {
  lat?: number
  lng?: number
  buildingHeight: number  // 건물 높이 (m)
  floors: number
  setbackNorth?: number   // 북측 이격 거리 (m)
}): DaylightResult {
  const lat = params.lat || DEFAULT_LAT
  const lng = params.lng || DEFAULT_LNG
  const { buildingHeight, floors, setbackNorth = 3 } = params
  
  // 오늘 날짜 기준
  const today = new Date()
  const times = SunCalc.getTimes(today, lat, lng)
  const todayPositions = calculateDayPositions(today, lat, lng)
  
  // 동지 (12/22) — 최악 조건
  const winterSolstice = new Date(today.getFullYear(), 11, 22)
  const winterTimes = SunCalc.getTimes(winterSolstice, lat, lng)
  const winterPositions = calculateDayPositions(winterSolstice, lat, lng)
  
  // 각 면 일조 시간 (오늘 기준)
  const facades = calculateFacadeHours(todayPositions)
  
  // 북측 사선 제한
  const northShadow = calculateNorthShadow(buildingHeight, setbackNorth)
  
  return {
    sunrise: formatTime(times.sunrise),
    sunset: formatTime(times.sunset),
    totalHours: Math.round((times.sunset.getTime() - times.sunrise.getTime()) / 3600000 * 10) / 10,
    positions: todayPositions,
    winterSolstice: {
      sunrise: formatTime(winterTimes.sunrise),
      sunset: formatTime(winterTimes.sunset),
      totalHours: Math.round((winterTimes.sunset.getTime() - winterTimes.sunrise.getTime()) / 3600000 * 10) / 10,
      positions: winterPositions,
    },
    northShadow,
    facades,
  }
}

// 일조 등급 판정
export function getSunlightGrade(facades: DaylightResult['facades']): {
  grade: string; description: string; color: string
} {
  const southHours = facades.south
  
  if (southHours >= 6) return { grade: '우수', description: `남향 ${southHours}시간 (최적)`, color: '#22c55e' }
  if (southHours >= 4) return { grade: '양호', description: `남향 ${southHours}시간 (적정)`, color: '#3b82f6' }
  if (southHours >= 2) return { grade: '보통', description: `남향 ${southHours}시간 (최소)`, color: '#f59e0b' }
  return { grade: '불량', description: `남향 ${southHours}시간 (부족)`, color: '#ef4444' }
}
