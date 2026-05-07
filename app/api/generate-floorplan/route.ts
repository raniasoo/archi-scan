import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

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
      4
    )
    // 세대수에 비례한 현실적 건물 크기
    const unitWidth = 7.5 // 세대당 폭 (m)
    const coreWidth = 3.0 // 코어 폭 (m)
    const bW = Math.round((unitsPerFloor / 2) * unitWidth + coreWidth) // 좌우 대칭
    const bD = 12 // 깊이 고정 (투룸/쓰리룸 적정)

    const unitTypes = preferences?.unitTypes || ['투룸', '쓰리룸']
    const leftUnits = Math.ceil(unitsPerFloor / 2)
    const rightUnits = unitsPerFloor - leftUnits

    const systemPrompt = `You are a Korean apartment floor plan designer. Output ONLY valid JSON.

BUILDING: ${bW}m wide × ${bD}m deep
LAYOUT: Center core with ${leftUnits} units on left, ${rightUnits} units on right.

COORDINATE RULES:
- Origin (0,0) = building top-left corner
- Core is centered: x=${((bW - coreWidth) / 2).toFixed(1)}, y=0, w=${coreWidth}, h=${bD}
- Left units: x=0 to x=${((bW - coreWidth) / 2).toFixed(1)}
- Right units: x=${((bW + coreWidth) / 2).toFixed(1)} to x=${bW}
- Each room's x,y is RELATIVE to its unit's x,y
- All rooms must tile perfectly within unit bounds (no gaps, no overlaps)

ROOM LAYOUT PATTERN (for each unit):
Top row (y=0): 거실(wide) + 주방(narrow), height ~5.5m
Bottom row: 주침실 + 침실2 + 욕실, height ~4.5m  
Entry: 현관(1.2×1.5m) at door side
For 쓰리룸: add 침실3 and 보조욕실

STRICT: Every room x+w must equal next room's x (horizontal). Every room y+h must equal next room's y (vertical). No gaps allowed.`

    const userPrompt = `Design a ${unitsPerFloor}-unit floor. Building: ${bW}m × ${bD}m.
Units: ${unitTypes.join(' + ')} mix. Zone: ${site?.zoning || '제2종일반주거지역'}.

Return JSON:
{"floorPlan":{"buildingWidth":${bW},"buildingDepth":${bD},"core":{"x":${((bW-coreWidth)/2).toFixed(1)},"y":0,"w":${coreWidth},"h":${bD}},"units":[{"id":"A","type":"투룸","exclusiveArea":50,"x":0,"y":0,"w":${((bW-coreWidth)/2).toFixed(1)},"h":${bD},"rooms":[{"name":"거실","x":0,"y":0,"w":5,"h":5.5},{"name":"주방","x":5,"y":0,"w":2.5,"h":5.5},{"name":"주침실","x":0,"y":5.5,"w":3.6,"h":4.5},{"name":"침실2","x":3.6,"y":5.5,"w":2.7,"h":4.5},{"name":"욕실","x":6.3,"y":5.5,"w":1.2,"h":2.4},{"name":"현관","x":6.3,"y":7.9,"w":1.2,"h":2.1}]}]},"summary":{"totalUnits":${unitsPerFloor},"coreArea":${(coreWidth*bD).toFixed(0)},"totalExclusiveArea":0}}

Fill ALL ${unitsPerFloor} units with proper rooms. Use the example A unit as template.
Left units mirror right units. Ensure rooms tile perfectly.`

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
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[FLOORPLAN] API error:', response.status, errText)
      return NextResponse.json({ 
        error: response.status === 429 ? '⏳ AI 한도 도달. 잠시 후 다시 시도해주세요.' : `API 오류 (${response.status})` 
      }, { status: response.status })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    let floorPlanData
    try {
      let jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
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

    // 후처리: 좌표 정규화
    const fp = floorPlanData.floorPlan
    fp.buildingWidth = bW
    fp.buildingDepth = bD
    for (const unit of fp.units) {
      // exclusiveArea 자동 계산
      if (!unit.exclusiveArea || unit.exclusiveArea === 0) {
        unit.exclusiveArea = Math.round(unit.w * unit.h * 10) / 10
      }
    }

    return NextResponse.json({
      success: true,
      data: floorPlanData,
      model: 'claude-haiku-4.5',
      tokensUsed: data.usage?.output_tokens || 0,
    })

  } catch (error) {
    console.error('[FLOORPLAN] Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ configured: !!ANTHROPIC_API_KEY, model: 'claude-haiku-4.5' })
}
