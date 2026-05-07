import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const SYSTEM_PROMPT = `당신은 한국 건축법규를 완벽히 이해하는 건축 평면 설계 전문 AI입니다.
주어진 대지 조건과 배치안 데이터를 바탕으로, 한국 주거 표준에 맞는 단위세대 평면을 JSON으로 생성합니다.

# 핵심 설계 규칙
- 모든 치수: 미터(m) 단위
- 외벽: 0.2m, 세대간벽: 0.2m, 내벽: 0.15m
- 한국식 현관: 신발장 포함, 최소 1.2m×1.5m
- 거실: 투룸 최소 3.6m×4.5m, 쓰리룸 최소 4.2m×5.0m
- 주침실: 최소 3.0m×3.6m, 보조침실: 최소 2.7m×3.0m
- 주방: ㄱ자 또는 일자형, 싱크-냉장고-레인지 삼각 동선
- 주욕실: 최소 1.5m×2.4m, 보조욕실: 최소 1.2m×2.0m
- 발코니: 폭 1.5m 표준
- 드레스룸: 쓰리룸 이상 시 주침실에 최소 1.2m×1.8m
- 코어: 계단 2.4m×5.0m + EV 2.1m×2.1m, 복도 폭 1.2m 이상

# 세대 타입 표준
- 원룸(16~24㎡): 1방/1욕실, 현관-욕실-원룸+미니주방
- 투룸(33~49㎡): 2방/1욕실, 현관-거실-주방-침실2-욕실
- 투룸+(46~59㎡): 2방/2욕실, 현관-거실-주방-침실2-욕실2-발코니
- 쓰리룸(59~84㎡): 3방/2욕실, 현관-거실-주방-침실3-욕실2-드레스룸
- 쓰리룸+(84~115㎡): 3+방/2욕실, 거실-주방-침실3-욕실2-드레스룸-서재

# 코어 타입
- 단일코어(5층 이하): 계단1+EV1, 코어면적 약 20㎡
- 듀얼코어(6~15층): 계단2+EV2, 코어면적 약 40㎡
- 센터코어(15층+): 계단2++EV3+, 코어면적 약 60㎡

# 출력 규칙
1. 반드시 JSON만 출력. 설명 텍스트 없음.
2. 모든 실(room)의 x,y,w,h는 건물 좌상단 기준 미터 단위.
3. 실 면적 = w × h로 자동 계산되므로 정확한 치수 필수.
4. 문(door)의 wall: "top"|"bottom"|"left"|"right", pos: 해당 벽에서의 상대 위치(0~1).
5. 창(window)도 동일 형식.
6. 세대 간 벽을 공유하도록 x,y 좌표 정렬.`

const OUTPUT_SCHEMA = `출력 JSON 형식:
{
  "floorPlan": {
    "buildingWidth": number,  // 건물 전체 폭 (m)
    "buildingDepth": number,  // 건물 전체 깊이 (m)
    "floorType": "ground" | "typical" | "top",
    "core": {
      "x": number, "y": number, "w": number, "h": number,
      "elements": [
        { "type": "stair"|"elevator"|"corridor"|"pipe", "x": number, "y": number, "w": number, "h": number }
      ]
    },
    "units": [
      {
        "id": "A",
        "type": "투룸"|"쓰리룸"|"원룸"|"투룸+"|"쓰리룸+",
        "exclusiveArea": number,
        "x": number, "y": number, "w": number, "h": number,
        "rooms": [
          {
            "name": "현관"|"거실"|"주방"|"주침실"|"침실2"|"침실3"|"주욕실"|"보조욕실"|"드레스룸"|"발코니"|"다용도실"|"복도",
            "x": number, "y": number, "w": number, "h": number,
            "furniture": [
              { "type": "bed"|"desk"|"sofa"|"dining"|"sink"|"toilet"|"tub"|"washer"|"closet"|"fridge"|"range"|"shoes",
                "x": number, "y": number, "w": number, "h": number }
            ]
          }
        ],
        "doors": [
          { "x": number, "y": number, "wall": "top"|"bottom"|"left"|"right", "width": number, "type": "swing"|"slide"|"entrance" }
        ],
        "windows": [
          { "x": number, "y": number, "wall": "top"|"bottom"|"left"|"right", "width": number }
        ]
      }
    ]
  },
  "summary": {
    "totalUnits": number,
    "unitMix": { "투룸": number, "쓰리룸": number },
    "coreArea": number,
    "totalExclusiveArea": number,
    "serviceRatio": number
  }
}`

export async function POST(req: NextRequest) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { site, layout, preferences } = body

    if (!layout) {
      return NextResponse.json({ error: 'layout data is required' }, { status: 400 })
    }

    // archi-scan 데이터를 Claude 프롬프트로 변환
    const userPrompt = `다음 조건으로 기준층 단위세대 평면을 설계해주세요.

## 대지 조건
- 주소: ${site?.address || '서울특별시'}
- 대지면적: ${site?.siteArea || 660}㎡
- 용도지역: ${site?.zoning || '제2종일반주거지역'}
- 높이제한: ${site?.heightLimit || 21}m
- 이격거리: 전면 ${site?.setbacks?.front || 3}m, 측면 ${site?.setbacks?.side || 1.5}m, 후면 ${site?.setbacks?.rear || 2}m

## 배치안
- 타입: ${layout.type || '타워형'}
- 층수: ${layout.floors || 5}층
- 세대수: ${layout.units || 12}세대 (기준층 ${Math.ceil((layout.units || 12) / Math.max((layout.floors || 5) - 1, 1))}세대)
- 건폐율: ${layout.buildingCoverage || 50}%
- 용적률: ${layout.far || 200}%
- 건물 폭: ${layout.footprint?.width || Math.round(Math.sqrt((site?.siteArea || 660) * (layout.buildingCoverage || 50) / 100) * 1.6)}m
- 건물 깊이: ${layout.footprint?.depth || Math.round(Math.sqrt((site?.siteArea || 660) * (layout.buildingCoverage || 50) / 100) / 1.6)}m
- 코어: ${layout.floors > 5 ? '듀얼코어' : '단일코어'}

## 세대 선호
- 세대 타입: ${preferences?.unitTypes?.join(', ') || '투룸, 쓰리룸'}
- 발코니 확장: ${preferences?.balconyExpansion !== false ? '적용' : '미적용'}
- 한국 표준: 적용

${OUTPUT_SCHEMA}

위 JSON 형식으로만 응답하세요. 설명 없이 JSON만 출력.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[FLOORPLAN] Claude API error:', response.status, errText)
      return NextResponse.json({ 
        error: response.status === 429 
          ? '⏳ AI 평면 생성 한도에 도달했습니다. 잠시 후 다시 시도해주세요.'
          : `Claude API 오류: ${response.status}` 
      }, { status: response.status })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    // JSON 파싱 (마크다운 코드블록 제거)
    let floorPlanData
    try {
      const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      floorPlanData = JSON.parse(jsonStr)
    } catch (parseErr) {
      console.error('[FLOORPLAN] JSON parse error:', parseErr, 'Raw:', text.substring(0, 500))
      return NextResponse.json({ 
        error: 'AI 응답 파싱 실패. 다시 시도해주세요.',
        raw: text.substring(0, 200),
      }, { status: 500 })
    }

    // 기본 검증
    if (!floorPlanData.floorPlan?.units?.length) {
      return NextResponse.json({ 
        error: 'AI가 유효한 평면을 생성하지 못했습니다. 다시 시도해주세요.',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: floorPlanData,
      model: 'claude-sonnet-4',
      tokensUsed: data.usage?.output_tokens || 0,
    })

  } catch (error) {
    console.error('[FLOORPLAN] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// GET: API 상태 확인
export async function GET() {
  return NextResponse.json({
    configured: !!ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4',
    capabilities: ['floor-plan-generation'],
  })
}
