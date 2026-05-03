import { NextRequest, NextResponse } from 'next/server'

// 대상지 주변 9개 포인트의 표고를 조회하고 경사도를 계산
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lng = parseFloat(searchParams.get('lng') || '0')
  const lat = parseFloat(searchParams.get('lat') || '0')

  if (!lng || !lat) {
    return NextResponse.json({ error: 'lng, lat 필요' }, { status: 400 })
  }

  try {
    // 대상지 중심 + 8방향 포인트 (약 50m 간격)
    const delta = 0.0005 // 약 50m
    const points = [
      { name: '중심', lat, lng },
      { name: '북', lat: lat + delta, lng },
      { name: '남', lat: lat - delta, lng },
      { name: '동', lat, lng: lng + delta },
      { name: '서', lat, lng: lng - delta },
      { name: '북동', lat: lat + delta, lng: lng + delta },
      { name: '북서', lat: lat + delta, lng: lng - delta },
      { name: '남동', lat: lat - delta, lng: lng + delta },
      { name: '남서', lat: lat - delta, lng: lng - delta },
    ]

    const locations = points.map(p => `${p.lat},${p.lng}`).join('|')

    // Open Elevation API (무료, 글로벌 DEM 데이터)
    const res = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: points.map(p => ({ latitude: p.lat, longitude: p.lng }))
      }),
    })

    let elevations: number[] = []

    if (res.ok) {
      const data = await res.json()
      elevations = data.results?.map((r: any) => r.elevation) || []
    }

    // Open Elevation 실패 시 Open-Meteo Elevation API fallback
    if (elevations.length === 0) {
      const lats = points.map(p => p.lat).join(',')
      const lngs = points.map(p => p.lng).join(',')
      const fallbackRes = await fetch(
        `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`
      )
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json()
        elevations = fallbackData.elevation || []
      }
    }

    if (elevations.length < 5) {
      return NextResponse.json({ 
        success: false, 
        error: '표고 데이터를 가져올 수 없습니다',
      })
    }

    // 경사도 계산
    const centerElev = elevations[0]
    const distance = delta * 111320 // 약 55m (위도 1도 ≈ 111.32km)

    // 각 방향별 경사도 계산
    const slopes: { direction: string; slope: number; elevDiff: number }[] = []
    const directions = ['북', '남', '동', '서', '북동', '북서', '남동', '남서']
    
    for (let i = 1; i < elevations.length && i <= directions.length; i++) {
      const elevDiff = elevations[i] - centerElev
      const dist = i <= 4 ? distance : distance * Math.SQRT2
      const slopePercent = (Math.abs(elevDiff) / dist) * 100
      slopes.push({
        direction: directions[i - 1],
        slope: Math.round(slopePercent * 10) / 10,
        elevDiff: Math.round(elevDiff * 10) / 10,
      })
    }

    // 최대 경사도와 방향
    const maxSlope = slopes.reduce((max, s) => s.slope > max.slope ? s : max, slopes[0])
    const avgSlope = Math.round((slopes.reduce((sum, s) => sum + s.slope, 0) / slopes.length) * 10) / 10

    // 경사 방향 (가장 낮은 쪽)
    const lowestDir = slopes.reduce((min, s) => s.elevDiff < min.elevDiff ? s : min, slopes[0])

    // 경사도 등급 판정
    let grade: string
    let gradeColor: string
    let designImpact: string[]

    if (avgSlope < 3) {
      grade = '평탄'
      gradeColor = '#22c55e'
      designImpact = [
        '기초 공사비 절감 (표준 기초 가능)',
        '지하주차장 설계 자유도 높음',
        '배리어프리 설계 용이',
        '우수 배수 계획 필요 (자연 배수 불리)',
      ]
    } else if (avgSlope < 8) {
      grade = '완경사'
      gradeColor = '#84cc16'
      designImpact = [
        '단차를 활용한 스플릿 레벨 설계 가능',
        '자연 배수 유리',
        '경사면 주차장 진입로 설계 고려',
        '조경 설계 시 단차 활용 가능',
      ]
    } else if (avgSlope < 15) {
      grade = '경사'
      gradeColor = '#f59e0b'
      designImpact = [
        '옹벽/절토/성토 공사 필요',
        '기초 공사비 증가 (약 10~20%)',
        '필로티/반지하 설계 검토 필요',
        '접근 동선 계획 중요 (경사로/계단)',
        '우수 유출 관리 강화 필요',
      ]
    } else if (avgSlope < 25) {
      grade = '급경사'
      gradeColor = '#ef4444'
      designImpact = [
        '대규모 절토/성토 또는 옹벽 필수',
        '기초 공사비 대폭 증가 (약 20~40%)',
        '다단식 배치 또는 계단식 건축 필요',
        '차량 접근성 제한 가능',
        '토압/배수 전문 구조 검토 필수',
        '사면 안정성 검토 필요',
      ]
    } else {
      grade = '극급경사'
      gradeColor = '#dc2626'
      designImpact = [
        '개발 가능성 재검토 필요',
        '특수 기초/앵커 공법 필요',
        '건축 비용 50% 이상 증가 예상',
        '급경사지 재해 위험 평가 필수',
        '산지전용 허가 검토 필요 가능',
      ]
    }

    // 표고 범위
    const minElev = Math.min(...elevations)
    const maxElev = Math.max(...elevations)

    return NextResponse.json({
      success: true,
      center: { lat, lng, elevation: centerElev },
      elevations: points.map((p, i) => ({
        ...p,
        elevation: elevations[i] ?? null,
      })),
      slope: {
        average: avgSlope,
        max: maxSlope.slope,
        maxDirection: maxSlope.direction,
        slopeDirection: lowestDir.direction, // 물이 흐르는 방향
        elevRange: Math.round((maxElev - minElev) * 10) / 10,
        minElevation: Math.round(minElev * 10) / 10,
        maxElevation: Math.round(maxElev * 10) / 10,
      },
      grade,
      gradeColor,
      designImpact,
    }, {
      headers: { 'Cache-Control': 'public, max-age=86400' }
    })
  } catch (error) {
    console.error('[elevation] Error:', error)
    return NextResponse.json({ success: false, error: '표고 분석 실패' })
  }
}
