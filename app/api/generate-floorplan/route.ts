import { NextRequest, NextResponse } from 'next/server'

// Vercel Serverless 타임아웃 60초
export const maxDuration = 60

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const SYSTEM_PROMPT = `You are a Korean residential floor plan designer. Generate floor plans in JSON only.

Rules:
- All dimensions in meters
- Walls: exterior 0.2m, interior 0.15m
- Korean entrance (현관): 1.2m×1.5m min with shoe storage
- Living room: min 3.6m×4.5m (2-room), 4.2m×5.0m (3-room)
- Master bedroom: min 3.0m×3.6m
- Secondary bedroom: min 2.7m×3.0m
- Kitchen: L-shape or linear
- Main bathroom: min 1.5m×2.4m
- Core: stair 2.4m×5.0m + elevator 2.1m×2.1m

Output ONLY valid JSON, no markdown, no explanation.`

export async function POST(req: NextRequest) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const { site, layout, preferences } = await req.json()
    if (!layout) {
      return NextResponse.json({ error: 'layout data is required' }, { status: 400 })
    }

    const unitsPerFloor = Math.min(
      Math.ceil((layout.units || 12) / Math.max((layout.floors || 5) - 1, 1)),
      4 // max 4 units for fast generation
    )
    const bW = layout.footprint?.width || 20
    const bD = layout.footprint?.depth || 12

    const userPrompt = `Design a typical floor plan.
Building: ${bW}m wide × ${bD}m deep
Units per floor: ${unitsPerFloor}
Unit types: ${preferences?.unitTypes?.join(', ') || '투룸, 쓰리룸'}
Zone: ${site?.zoning || '제2종일반주거지역'}
Core: single (stair + elevator)

Return this exact JSON structure:
{"floorPlan":{"buildingWidth":${bW},"buildingDepth":${bD},"core":{"x":0,"y":0,"w":0,"h":0},"units":[{"id":"A","type":"투룸","exclusiveArea":0,"x":0,"y":0,"w":0,"h":0,"rooms":[{"name":"거실","x":0,"y":0,"w":0,"h":0}]}]},"summary":{"totalUnits":${unitsPerFloor},"coreArea":0,"totalExclusiveArea":0}}

Fill in real coordinates. Each room needs: name, x, y, w, h (relative to unit origin).
Room names: 현관, 거실, 주방, 주침실, 침실2, 침실3, 주욕실, 보조욕실, 드레스룸, 발코니, 다용도실
Core position should be centered. Units should fill remaining space symmetrically.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[FLOORPLAN] API error:', response.status, errText)
      return NextResponse.json({ 
        error: response.status === 429 
          ? '⏳ AI 한도 도달. 잠시 후 다시 시도해주세요.'
          : `API 오류 (${response.status})` 
      }, { status: response.status })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    // JSON 파싱 — 여러 전략 시도
    let floorPlanData
    try {
      // 1차: 마크다운 제거 후 시도
      let jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      // JSON 시작/끝 찾기
      const startIdx = jsonStr.indexOf('{')
      const endIdx = jsonStr.lastIndexOf('}')
      if (startIdx >= 0 && endIdx > startIdx) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1)
      }
      floorPlanData = JSON.parse(jsonStr)
    } catch (parseErr) {
      console.error('[FLOORPLAN] Parse error. Raw:', text.substring(0, 300))
      return NextResponse.json({ error: 'AI 응답 파싱 실패. 다시 시도해주세요.' }, { status: 500 })
    }

    if (!floorPlanData.floorPlan?.units?.length) {
      return NextResponse.json({ error: 'AI가 유효한 평면을 생성하지 못했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: floorPlanData,
      model: 'claude-haiku-4.5',
      tokensUsed: data.usage?.output_tokens || 0,
    })

  } catch (error) {
    console.error('[FLOORPLAN] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    configured: !!ANTHROPIC_API_KEY,
    model: 'claude-haiku-4.5',
    capabilities: ['floor-plan-generation'],
  })
}
