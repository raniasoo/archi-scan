/**
 * ControlNet 테스트 엔드포인트 (GET)
 * tool 환경에서 POST 불가 → GET으로 내부 테스트
 * 
 * ?idx=0~9  (10개 테스트 케이스)
 * ?mode=check  (Replicate 토큰 유효성만 확인)
 */
import { NextRequest, NextResponse } from 'next/server'
import { Resvg } from '@resvg/resvg-js'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN

const TESTS = [
  { name: '강남구 역삼동', address: '서울특별시 강남구 테헤란로 152', type: 'tower', floors: 15, units: 60, siteArea: 1200, angle: 'eye-level' },
  { name: '서초구 반포동', address: '서울특별시 서초구 반포대로 235', type: 'tower', floors: 20, units: 100, siteArea: 2000, angle: 'birds-eye' },
  { name: '마포구 상수동', address: '서울특별시 마포구 와우산로 94', type: 'tower', floors: 7, units: 14, siteArea: 400, angle: 'eye-level' },
  { name: '영등포구 여의도', address: '서울특별시 영등포구 여의대로 108', type: 'tower', floors: 25, units: 120, siteArea: 3000, angle: 'birds-eye' },
  { name: '중구 을지로', address: '서울특별시 중구 을지로 100', type: 'tower', floors: 10, units: 40, siteArea: 800, angle: 'eye-level' },
  { name: '성동구 성수동', address: '서울특별시 성동구 왕십리로 83', type: 'tower', floors: 8, units: 24, siteArea: 600, angle: 'entrance' },
  { name: '관악구 봉천동', address: '서울특별시 관악구 관악로 1', type: 'tower', floors: 4, units: 12, siteArea: 500, angle: 'eye-level' },
  { name: '노원구 상계동', address: '서울특별시 노원구 동일로 1379', type: 'tower', floors: 12, units: 48, siteArea: 1500, angle: 'birds-eye' },
  { name: '금천구 가산동', address: '서울특별시 금천구 가산디지털1로 145', type: 'tower', floors: 6, units: 18, siteArea: 700, angle: 'eye-level' },
  { name: '분당구 정자동', address: '경기도 성남시 분당구 정자일로 239', type: 'tower', floors: 18, units: 80, siteArea: 2500, angle: 'eye-level' },
]

// 간단한 건물 윤곽 SVG 생성 → PNG 변환
function createControlImage(floors: number, type: string): string {
  const w = 512, h = 512
  const groundY = h - 80
  const bw = 160, bh = Math.min(floors * 30, 350)
  const x1 = (w - bw) / 2, y1 = groundY - bh
  
  // 층별 창문
  let windowsSvg = ''
  for (let f = 0; f < Math.min(floors, 12); f++) {
    const fy = groundY - (f + 1) * (bh / floors)
    const fh = bh / floors
    for (let wx = 0; wx < 3; wx++) {
      const wxp = x1 + 20 + wx * 45
      windowsSvg += `<rect x="${wxp}" y="${fy + 4}" width="30" height="${fh - 8}" fill="none" stroke="#6496C8" stroke-width="2"/>`
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#C8DCF0"/>
    <rect x="0" y="${groundY}" width="${w}" height="80" fill="#788C64"/>
    <line x1="0" y1="${groundY}" x2="${w}" y2="${groundY}" stroke="#505050" stroke-width="2"/>
    <rect x="${x1}" y="${y1}" width="${bw}" height="${bh}" fill="none" stroke="#282828" stroke-width="3"/>
    ${windowsSvg}
  </svg>`

  try {
    const resvg = new Resvg(svg, { fitTo: { mode: 'width' as const, value: 512 } })
    const png = resvg.render().asPng()
    return `data:image/png;base64,${Buffer.from(png).toString('base64')}`
  } catch {
    return ''
  }
}

// Replicate 폴링
async function pollPrediction(id: string, timeout = 120000): Promise<any> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
    })
    const data = await res.json()
    if (data.status === 'succeeded') return data
    if (data.status === 'failed' || data.status === 'canceled') throw new Error(data.error || data.status)
    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error('timeout')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')
  const idx = parseInt(searchParams.get('idx') || '0')

  // 모드: 토큰 유효성만 확인
  if (mode === 'check') {
    if (!REPLICATE_API_TOKEN) return NextResponse.json({ valid: false, reason: 'no token' })
    try {
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
      })
      return NextResponse.json({ valid: res.ok, status: res.status, tokenPrefix: REPLICATE_API_TOKEN.slice(0, 8) + '...' })
    } catch (e) {
      return NextResponse.json({ valid: false, reason: String(e) })
    }
  }

  // 테스트 실행
  if (!REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN 미설정', idx })
  }

  const test = TESTS[idx] || TESTS[0]
  const startTime = Date.now()
  
  console.log(`[test-controlnet] #${idx} ${test.name} (${test.type}, ${test.floors}층) 시작`)

  // 1. control image 생성
  const controlImage = createControlImage(test.floors, test.type)
  if (!controlImage) {
    return NextResponse.json({ error: 'control image 생성 실패', idx, test: test.name })
  }

  const prompt = `Photorealistic architectural rendering of a ${test.floors}-story modern residential building. ${test.angle === 'birds-eye' ? 'Aerial birds-eye view from 45 degrees above.' : 'Eye-level street perspective.'} Located in ${test.address}, South Korea. White concrete facade with glass balconies, warm wood accents. Golden afternoon sunlight, mature trees, clean sidewalks. Professional architectural photography quality.`

  try {
    // 2. Replicate prediction 생성
    const predRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/flux-canny-pro',
        input: {
          prompt,
          control_image: controlImage,
          guidance: 30,
          num_inference_steps: 28,
          num_outputs: 1,
          megapixels: '1',
          output_format: 'webp',
          output_quality: 80,
        },
      }),
    })

    if (!predRes.ok) {
      const errText = await predRes.text()
      console.error(`[test-controlnet] Replicate error: ${predRes.status} ${errText.slice(0, 200)}`)
      return NextResponse.json({ 
        error: `Replicate ${predRes.status}`, 
        details: errText.slice(0, 200),
        idx, test: test.name,
        elapsed: Date.now() - startTime,
      })
    }

    const prediction = await predRes.json()
    console.log(`[test-controlnet] Prediction ${prediction.id} created, polling...`)

    // 3. 결과 폴링
    const result = await pollPrediction(prediction.id, 180000)
    const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output
    const elapsed = Date.now() - startTime
    const predictTime = result.metrics?.predict_time || 0

    console.log(`[test-controlnet] #${idx} ${test.name} ✅ ${predictTime.toFixed(1)}s (total ${(elapsed/1000).toFixed(1)}s)`)

    return NextResponse.json({
      success: true,
      idx,
      test: test.name,
      buildingType: test.type,
      floors: test.floors,
      angle: test.angle,
      model: 'flux-canny-pro',
      imageUrl, // Replicate 호스팅 URL (일시적)
      predictTime,
      elapsed,
      promptPreview: prompt.slice(0, 150),
    })

  } catch (e) {
    const elapsed = Date.now() - startTime
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[test-controlnet] #${idx} ${test.name} ❌ ${msg}`)
    return NextResponse.json({ error: msg, idx, test: test.name, elapsed })
  }
}
