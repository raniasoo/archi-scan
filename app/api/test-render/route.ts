import { NextRequest, NextResponse } from 'next/server'

// GET 기반 AI 렌더링 테스트 엔드포인트
// 쿼리 파라미터로 배치안 데이터를 받아 Gemini AI 렌더링 실행
// 결과: 렌더링 이미지 base64 + 프롬프트 메타데이터 반환

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const mode = sp.get('mode') || 'meta' // 'meta' = 프롬프트만, 'render' = 실제 렌더링
  
  const floors = parseInt(sp.get('floors') || '4')
  const units = parseInt(sp.get('units') || '12')
  const siteArea = parseInt(sp.get('siteArea') || '660')
  const coverage = parseInt(sp.get('coverage') || '50')
  const buildingType = sp.get('type') || 'tower'
  const buildingCount = parseInt(sp.get('buildingCount') || '1')
  const address = sp.get('address') || '서울특별시 강남구 테헤란로 152'
  const layoutName = sp.get('layoutName') || '타워형'
  
  // 프롬프트 생성 로직 (ai-render/route.ts에서 핵심 추출)
  const f = floors
  const u = units
  const footprint = Math.round(siteArea * coverage / 100)
  const bW = Math.round(Math.sqrt(footprint * 1.4))
  const bD = Math.round(footprint / bW)
  
  let buildingForm = ''
  let actualBldgCount = buildingCount
  const bt = buildingType
  
  if (f <= 5 && u > 20 && siteArea > 1500) {
    const perFloor: Record<string, number> = { linear: 12, lshape: 6, courtyard: 10, tower: 4, cluster: 4 }
    const maxPerFloor = perFloor[bt] || 4
    actualBldgCount = Math.max(2, Math.ceil(u / (maxPerFloor * f)))
    
    const eachFP = Math.round(footprint / actualBldgCount)
    const linearRatio = bt === 'linear' ? 3.5 : 1.4
    const eachW = Math.round(Math.sqrt(eachFP * linearRatio))
    const eachD = Math.round(eachFP / eachW)
    
    const typeDesc: Record<string, string> = {
      linear: `판상형 ${actualBldgCount}동, 각 ${eachW}m×${eachD}m, 동서방향 평행배치`,
      courtyard: `중정형 ${actualBldgCount}동, U자형, 중앙 정원`,
      lshape: `ㄱ자형 ${actualBldgCount}동, L자 풋프린트, 90도 날개`,
      tower: `타워형 ${actualBldgCount}동, 정방형 ${eachW}m×${eachD}m`,
      cluster: `클러스터 ${actualBldgCount}동, 다양한 형태`,
    }
    buildingForm = `${typeDesc[bt] || typeDesc.cluster} — ${f}층 ${u}세대 총 ${siteArea}㎡ 대지`
  } else if (f <= 5) {
    buildingForm = `저층 빌라 ${f}층 ${u}세대, 풋프린트 ${bW}m×${bD}m`
  } else if (f <= 10) {
    buildingForm = `중층 아파트 ${f}층 ${u}세대, 풋프린트 ${bW}m×${bD}m`
  } else {
    buildingForm = `고층 타워 ${f}층 ${u}세대`
  }
  
  // 형태 정확도 예측 (타입별 Gemini 반영 경험치)
  const typeAccuracy: Record<string, { shape: number, height: number, count: number, overall: number }> = {
    tower:     { shape: 85, height: f <= 3 ? 50 : f <= 5 ? 65 : 80, count: actualBldgCount === 1 ? 95 : 70, overall: 0 },
    courtyard: { shape: 55, height: f <= 3 ? 45 : f <= 5 ? 60 : 75, count: actualBldgCount === 1 ? 90 : 60, overall: 0 },
    lshape:    { shape: 45, height: f <= 3 ? 45 : f <= 5 ? 60 : 75, count: actualBldgCount === 1 ? 90 : 55, overall: 0 },
    linear:    { shape: 50, height: f <= 3 ? 45 : f <= 5 ? 60 : 75, count: actualBldgCount === 1 ? 90 : 65, overall: 0 },
    cluster:   { shape: 60, height: f <= 3 ? 50 : f <= 5 ? 60 : 75, count: actualBldgCount <= 3 ? 75 : 50, overall: 0 },
  }
  const acc = typeAccuracy[bt] || typeAccuracy.tower
  acc.overall = Math.round((acc.shape * 0.4 + acc.height * 0.35 + acc.count * 0.25))
  
  const meta = {
    input: { address, buildingType: bt, floors: f, units: u, siteArea, coverage, buildingCount: actualBldgCount, layoutName },
    prompt: {
      buildingForm,
      totalHeight: `${Math.round(f * 3.3)}m`,
      footprintM2: footprint,
      eachBuildingSize: `${bW}m × ${bD}m`,
    },
    accuracy: acc,
    dataTransferToAI: 100, // 수치 데이터는 100% 전달
    estimatedAIReflection: acc.overall,
    diagramMatch: 85, // 도면은 수학적 정확도
    aiVsDiagram: Math.round(acc.overall * 0.85 / 100 * 100), // AI 반영도 × 도면 정확도
  }
  
  if (mode === 'meta') {
    return NextResponse.json({ success: true, mode: 'meta', ...meta })
  }
  
  // mode === 'render': 실제 Gemini 렌더링 실행
  const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY
  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ success: false, error: 'GOOGLE_AI_API_KEY not set', ...meta })
  }
  
  const prompt = `Photorealistic architectural rendering of a Korean apartment building.
Location: ${address}
Building: ${buildingForm}
Height: EXACTLY ${f} stories (${Math.round(f * 3.3)}m tall). DO NOT make taller.
Style: Modern Korean residential, clean concrete and glass facade.
Camera: Eye-level view from across the street.
Lighting: Golden hour, warm tones.
DO NOT generate round or cylindrical buildings.`

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      }
    )
    
    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      return NextResponse.json({ success: false, error: `Gemini ${geminiRes.status}`, detail: errText.slice(0, 500), ...meta })
    }
    
    const data = await geminiRes.json()
    const parts = data?.candidates?.[0]?.content?.parts || []
    
    let imageBase64 = ''
    let textResponse = ''
    for (const part of parts) {
      if (part.inlineData?.data) imageBase64 = part.inlineData.data.slice(0, 100) + '...(truncated)'
      if (part.text) textResponse = part.text.slice(0, 300)
    }
    
    return NextResponse.json({
      success: true,
      mode: 'render',
      hasImage: !!imageBase64,
      imagePreview: imageBase64,
      textResponse,
      promptUsed: prompt.slice(0, 500),
      ...meta,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, ...meta })
  }
}
