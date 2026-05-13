import { NextRequest, NextResponse } from 'next/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OPENAI_API_KEY not configured',
        message: 'OpenAI API 키가 설정되지 않았습니다. Vercel 환경변수에 OPENAI_API_KEY를 추가해주세요.',
      }, { status: 500 })
    }

    const { type, context } = await req.json()

    if (!type || !context) {
      return NextResponse.json({ error: 'type and context are required' }, { status: 400 })
    }

    const systemPrompts: Record<string, string> = {
      'proposal': `당신은 대한민국 최고의 부동산 개발사업 컨설턴트입니다.
투자자 또는 조합원에게 제출할 전문적인 사업 제안서를 작성합니다.

작성 규칙:
1. 전문적이고 설득력 있는 문체
2. 구체적 수치와 근거 제시
3. 리스크와 기회를 균형 있게 기술
4. 마크다운 형식으로 구조화된 문서 작성
5. 표, 목록을 적절히 활용`,

      'presentation': `당신은 주민설명회 전문 발표자입니다.
조합원(대부분 50~70대)이 이해하기 쉬운 설명 자료를 작성합니다.

작성 규칙:
1. 쉬운 용어, 짧은 문장
2. 분담금, 사업기간 등 핵심 관심사 우선 배치
3. Q&A 예상 질문과 답변 포함
4. 비교 표를 활용한 시각적 정리`,

      'marketing': `당신은 분양 마케팅 전문가입니다.
분양 광고 카피, 브로셔 텍스트, SNS 홍보 문구를 작성합니다.

작성 규칙:
1. 감성적이면서 신뢰감 있는 문체
2. 입지, 설계, 커뮤니티 장점 강조
3. 타겟 고객층에 맞는 톤 조정
4. 다양한 버전(짧은/긴) 제공`,
    }

    const systemPrompt = systemPrompts[type] || systemPrompts['proposal']

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(context) },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[OPENAI] API error:', response.status, errorText.slice(0, 500))
      return NextResponse.json({ 
        error: `OpenAI API error: ${response.status}` 
      }, { status: response.status })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({
      success: true,
      content: text,
      type,
      model: data.model,
      usage: data.usage,
    })

  } catch (error) {
    console.error('[OPENAI] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    configured: !!OPENAI_API_KEY,
    model: 'gpt-4o',
    capabilities: ['proposal', 'presentation', 'marketing'],
    service: 'ChatGPT (OpenAI)',
  })
}
