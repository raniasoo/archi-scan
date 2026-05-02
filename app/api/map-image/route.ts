import { NextRequest, NextResponse } from 'next/server'

const VWORLD_KEY = 'FFEC486D-E635-345C-9BA6-5404A5AA191B'
const VWORLD_DOMAIN = 'v0-archi-scan-layout-generator.vercel.app'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lng = searchParams.get('lng')
  const lat = searchParams.get('lat')
  const zoom = searchParams.get('zoom') || '18'
  const width = searchParams.get('w') || '600'
  const height = searchParams.get('h') || '400'
  const type = searchParams.get('type') || 'satellite' // satellite | base | hybrid

  if (!lng || !lat) {
    return NextResponse.json({ error: 'lng, lat 파라미터 필요' }, { status: 400 })
  }

  try {
    // 기본 레이어 설정
    let basemap = 'PHOTO' // 위성사진
    let layers = ''
    
    if (type === 'base') {
      basemap = 'Base'
    } else if (type === 'hybrid' || type === 'satellite') {
      basemap = 'PHOTO'
      layers = 'lt_c_cadastral' // 지적도 오버레이
    }

    const params = new URLSearchParams({
      service: 'image',
      request: 'getmap',
      key: VWORLD_KEY,
      basemap,
      center: `${lng},${lat}`,
      zoom,
      size: `${width},${height}`,
      format: 'png',
    })

    if (layers) {
      params.set('layers', layers)
    }

    const url = `https://api.vworld.kr/req/image?${params}`
    
    const res = await fetch(url, {
      headers: {
        'Referer': `https://${VWORLD_DOMAIN}`,
        'Origin': `https://${VWORLD_DOMAIN}`,
      },
    })

    if (!res.ok) {
      // VWorld 실패 시 OpenStreetMap 정적 타일 fallback
      return NextResponse.json({ 
        error: 'VWorld 지도 조회 실패',
        fallbackUrl: `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&maptype=mapnik&markers=${lat},${lng},red-pushpin`
      }, { status: 200 })
    }

    const buffer = await res.arrayBuffer()
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // 24시간 캐시
      },
    })
  } catch (error) {
    console.error('[map-image] 오류:', error)
    return NextResponse.json({ error: '지도 이미지 생성 실패' }, { status: 500 })
  }
}
