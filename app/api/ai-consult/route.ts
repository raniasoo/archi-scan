import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const { question, context } = await req.json()

    if (!question) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 })
    }

    const systemPrompt = `당신은 대한민국 최고의 건축설계 전문가이자 개발사업 컨설턴트입니다.

전문 분야:
- 건축법규 해석 (건폐율, 용적률, 높이제한, 일조권, 용도지역)
- 배치안 설계 평가 (동선, 채광, 조망, 프라이버시)
- 사업성 분석 (ROI, 분담금, 사업기간)
- 리스크 진단 (인허가, 시장, 공사비, 규제 변경)
- Alexander Pattern Language 기반 설계 품질 평가

응답 규칙:
1. 한국어로 답변
2. 구체적 수치와 근거를 제시
3. 실무 경험에 기반한 현실적 조언
4. 법규 인용 시 정확한 조문 번호 포함
5. 3~5문장으로 핵심을 먼저 제시하고 상세 설명 추가`

    const userMessage = context 
      ? `[프로젝트 현황]\n${JSON.stringify(context, null, 2)}\n\n[질문]\n${question}`
      : question

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[CLAUDE] API error:', response.status, errorText.slice(0, 500))
      return NextResponse.json({ 
        error: `Claude API error: ${response.status}` 
      }, { status: response.status })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    return NextResponse.json({
      success: true,
      answer: text,
      model: data.model,
      usage: data.usage,
    })

  } catch (error) {
    console.error('[CLAUDE] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    configured: !!ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-20250514',
    capabilities: ['design-consulting', 'regulation-analysis', 'risk-assessment'],
    service: 'Claude (Anthropic)',
  })
}
