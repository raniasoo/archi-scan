import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

interface AnalysisInput {
  address: string
  siteArea: number
  zoneType: string
  bcr: number
  far: number
  roi: number
  totalCost: number
  expectedProfit: number
  units: number
  layoutName: string
  roadWidth?: string
  heightLimit?: string
}

export async function POST(req: NextRequest) {
  try {
    const input: AnalysisInput = await req.json()
    
    if (!input.address || !input.siteArea) {
      return NextResponse.json({ error: '주소와 면적이 필요합니다' }, { status: 400 })
    }

    // API 키가 없으면 스마트 분석 (규칙 기반)
    if (!ANTHROPIC_API_KEY) {
      const analysis = generateRuleBasedAnalysis(input)
      return NextResponse.json({ ...analysis, mode: 'rule-based' })
    }

    // Claude API 호출
    try {
      const prompt = buildPrompt(input)
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        console.error('[AI] API error:', response.status)
        const analysis = generateRuleBasedAnalysis(input)
        return NextResponse.json({ ...analysis, mode: 'rule-based-fallback' })
      }

      const data = await response.json()
      const text = data.content?.[0]?.text || ''
      
      // JSON 파싱
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return NextResponse.json({ ...parsed, mode: 'ai' })
      }

      const analysis = generateRuleBasedAnalysis(input)
      return NextResponse.json({ ...analysis, mode: 'rule-based-fallback' })
    } catch (e) {
      console.error('[AI] Claude API call failed:', e)
      const analysis = generateRuleBasedAnalysis(input)
      return NextResponse.json({ ...analysis, mode: 'rule-based-fallback' })
    }
  } catch (error) {
    console.error('[AI] Error:', error)
    return NextResponse.json({ error: 'AI 분석 중 오류' }, { status: 500 })
  }
}

function buildPrompt(input: AnalysisInput): string {
  return `당신은 한국 건축/부동산 개발사업 전문가입니다. 아래 프로젝트 데이터를 분석하여 JSON 형식으로만 응답하세요.

프로젝트 정보:
- 주소: ${input.address}
- 대지면적: ${input.siteArea}㎡
- 용도지역: ${input.zoneType || '미확인'}
- 배치안: ${input.layoutName}
- 건폐율: ${input.bcr}%
- 용적률: ${input.far}%
- ROI: ${input.roi}%
- 총사업비: ${(input.totalCost / 1e8).toFixed(1)}억원
- 예상수익: ${(input.expectedProfit / 1e8).toFixed(1)}억원
- 세대수: ${input.units}세대
- 접도: ${input.roadWidth || '미확인'}
- 높이제한: ${input.heightLimit || '미확인'}

아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "legalComment": "법규 부합성에 대한 2-3줄 코멘트",
  "profitComment": "사업성에 대한 2-3줄 코멘트",
  "marketComment": "상품성에 대한 2-3줄 코멘트",
  "overallComment": "종합 의견 2-3줄",
  "risks": ["리스크1", "리스크2", "리스크3"],
  "recommendations": ["제안1", "제안2", "제안3"],
  "legalScore": 85,
  "profitScore": 80,
  "marketScore": 75,
  "totalScore": 80
}`
}

function generateRuleBasedAnalysis(input: AnalysisInput) {
  const { roi, bcr, far, siteArea, units, zoneType, address } = input
  
  // 법규 점수
  const legalScore = bcr <= 60 && far <= 300 ? 85 : bcr <= 50 ? 90 : 70
  
  // 사업성 점수
  const profitScore = roi >= 20 ? 92 : roi >= 15 ? 85 : roi >= 10 ? 75 : roi >= 5 ? 65 : roi >= 0 ? 55 : 40
  
  // 상품성 점수
  const marketScore = units >= 100 ? 80 : units >= 50 ? 75 : units >= 20 ? 70 : 65
  
  const totalScore = Math.round((legalScore + profitScore + marketScore) / 3)
  
  // 지역 추출
  const district = address.match(/([가-힣]+구|[가-힣]+시|[가-힣]+군)/)?.[1] || '해당 지역'
  
  // 코멘트 생성
  const legalComment = zoneType
    ? `${zoneType} 내 건폐율 ${bcr.toFixed(1)}%, 용적률 ${far.toFixed(1)}%로 법정 한도 ${bcr <= 60 ? '이내' : '근접'}입니다. ${siteArea >= 1000 ? '대규모 단지로 건축심의 대상일 수 있습니다.' : '일반 규모로 인허가 절차가 비교적 간소합니다.'}`
    : `건폐율 ${bcr.toFixed(1)}%, 용적률 ${far.toFixed(1)}%로 설계되었습니다. 용도지역 확인 후 법적 한도와의 비교가 필요합니다.`
  
  const profitComment = roi >= 15
    ? `ROI ${roi.toFixed(1)}%로 사업 추진 가능한 수준입니다. ${district} 지역 시세를 고려할 때 분양 경쟁력이 있을 것으로 판단됩니다.`
    : roi >= 5
    ? `ROI ${roi.toFixed(1)}%로 보수적 사업 추진이 가능합니다. 공사비 절감이나 분양가 상향 조정으로 수익성 개선 여지가 있습니다.`
    : `ROI ${roi.toFixed(1)}%로 추가 검토가 필요합니다. 토지비 협상, 설계 최적화, 분양가 재산정을 통해 사업성을 개선해야 합니다.`
  
  const marketComment = units >= 50
    ? `${units}세대 규모로 ${district} 지역에서 단지형 아파트로서의 상품성이 기대됩니다. 커뮤니티 시설과 조경 품질이 분양 성패를 좌우할 것입니다.`
    : `${units}세대 규모의 소규모 단지입니다. 입지와 마감 품질로 차별화하는 전략이 필요합니다.`
  
  const overallComment = roi >= 10
    ? `${district} ${siteArea.toLocaleString()}㎡ 대지에 ${units}세대 개발사업은 ROI ${roi.toFixed(1)}%로 사업 추진이 가능한 것으로 판단됩니다.`
    : `${district} ${siteArea.toLocaleString()}㎡ 대지의 사업성은 추가 검토가 필요합니다. 사업 구조 최적화를 통해 수익성을 개선해야 합니다.`
  
  const risks = [
    roi < 10 ? '분양가 대비 공사비 비율이 높아 수익 마진이 제한적' : '금리 변동에 따른 사업비 증가 가능성',
    siteArea >= 2000 ? '대규모 부지 매입에 따른 자금 조달 리스크' : '인근 경쟁 물량에 따른 분양률 변동',
    '인허가 일정 지연 가능성 및 설계 변경에 따른 비용 증가',
  ]
  
  const recommendations = [
    roi < 15 ? '공사비 절감을 위한 VE(Value Engineering) 검토' : '조기 분양을 위한 마케팅 전략 수립',
    '인근 실거래가 추이를 반영한 분양가 재검증',
    units >= 50 ? '단지 내 커뮤니티 시설 차별화 방안 검토' : '프리미엄 마감재 적용으로 단가 경쟁력 확보',
  ]
  
  return {
    legalComment,
    profitComment,
    marketComment,
    overallComment,
    risks,
    recommendations,
    legalScore,
    profitScore,
    marketScore,
    totalScore,
  }
}
