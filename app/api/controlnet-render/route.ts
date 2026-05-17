/**
 * ControlNet 렌더링 API — 프로덕션
 * building-geometry 블록 기반 정밀 제어 이미지 → FLUX ControlNet → 포토리얼 건축 렌더링
 * 
 * POST: 단일 이미지 렌더링
 * GET:  ?mode=check (토큰 확인) | ?mode=control-only (제어 이미지만 생성)
 */
import { NextRequest, NextResponse } from 'next/server'
import { runControlNetPipeline, generateControlImage, svgToPngBase64, buildControlNetPrompt } from '@/lib/controlnet-pipeline'
import type { ControlNetInput } from '@/lib/controlnet-pipeline'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

// ━━━ GET: 토큰 확인 / 제어 이미지 미리보기 ━━━
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')

  if (mode === 'check') {
    const token = process.env.REPLICATE_API_TOKEN
    if (!token) return NextResponse.json({ available: false, reason: 'REPLICATE_API_TOKEN 미설정' })
    try {
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      return NextResponse.json({ available: res.ok, status: res.status })
    } catch (e) {
      return NextResponse.json({ available: false, reason: String(e) })
    }
  }

  if (mode === 'control-only') {
    // 제어 이미지만 생성하여 반환 (디버깅/미리보기용)
    try {
      const input: ControlNetInput = {
        type: searchParams.get('type') || 'tower',
        coverage: parseInt(searchParams.get('coverage') || '50'),
        siteArea: parseInt(searchParams.get('siteArea') || '500'),
        floors: parseInt(searchParams.get('floors') || '5'),
        units: parseInt(searchParams.get('units') || '20'),
        buildingCount: parseInt(searchParams.get('buildingCount') || '1'),
        originalType: searchParams.get('originalType') || undefined,
        angle: (searchParams.get('angle') as any) || 'eye-level',
        style: searchParams.get('style') || 'modern-luxury',
      }
      const controlMode = searchParams.get('controlMode') === 'depth' ? 'depth' : 'canny'
      const svg = generateControlImage(input, controlMode as any)
      // SVG에 NaN 체크
      if (svg.includes('NaN') || svg.includes('Infinity')) {
        return NextResponse.json({ error: 'SVG에 NaN/Infinity 값 포함', svgPreview: svg.slice(0, 1000) })
      }
      let png: string | null = null
      try { png = svgToPngBase64(svg, 1024) } catch (pngErr) {
        return NextResponse.json({ error: 'SVG→PNG 변환 실패', detail: String(pngErr), svgPreview: svg.slice(0, 1000) })
      }
      const prompt = buildControlNetPrompt(input)
      return NextResponse.json({ success: true, svgLength: svg.length, pngLength: png?.length || 0, prompt: prompt.slice(0, 300) })
    } catch (e) {
      return NextResponse.json({ error: 'control-only 실패', detail: String(e) }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'mode 파라미터 필요: check | control-only' }, { status: 400 })
}

// ━━━ POST: ControlNet 렌더링 실행 ━━━
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await req.json()
    const {
      type, coverage, siteArea, floors, units, buildingCount, originalType,
      angle = 'eye-level', style = 'modern-luxury', address, regulation,
      multiAngle = false,
    } = body

    if (!type || !siteArea || !floors) {
      return NextResponse.json({ error: 'type, siteArea, floors 필수' }, { status: 400 })
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: 'REPLICATE_API_TOKEN 미설정. Vercel 환경변수에 추가해 주세요.' }, { status: 503 })
    }

    const baseInput: ControlNetInput = {
      type, coverage: coverage || 50, siteArea, floors,
      units, buildingCount, originalType, angle, style, address, regulation,
    }

    if (multiAngle) {
      // ━━━ 멀티앵글: 4방향 동시 렌더링 ━━━
      const angles: Array<'eye-level' | 'birds-eye' | 'entrance' | 'side'> = ['eye-level', 'birds-eye', 'entrance', 'side']
      const results = await Promise.allSettled(
        angles.map(a => runControlNetPipeline({ ...baseInput, angle: a }))
      )

      const images = results.map((r, i) => ({
        angle: angles[i],
        success: r.status === 'fulfilled',
        imageUrl: r.status === 'fulfilled' ? r.value.imageUrl : null,
        model: r.status === 'fulfilled' ? r.value.model : null,
        predictTime: r.status === 'fulfilled' ? r.value.predictTime : null,
        error: r.status === 'rejected' ? r.reason?.message : null,
      }))

      return NextResponse.json({
        success: true,
        mode: 'multi-angle',
        images,
        elapsed: Date.now() - startTime,
      })

    } else {
      // ━━━ 단일 앵글 ━━━
      const result = await runControlNetPipeline(baseInput)

      return NextResponse.json({
        success: true,
        mode: 'single',
        imageUrl: result.imageUrl,
        model: result.model,
        predictTime: result.predictTime,
        elapsed: Date.now() - startTime,
        prompt: result.prompt.slice(0, 200),
      })
    }

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[controlnet-render] ❌ ${msg}`)
    return NextResponse.json({
      error: msg,
      elapsed: Date.now() - startTime,
    }, { status: 500 })
  }
}
