/**
 * 대지 분석 ↔ 설계·BOQ·사업성·검증 통합 브릿지
 * 
 * 대지 분석 결과가 모든 다운스트림 시스템에 자동 반영되도록 연결
 */

import type { TerrainAnalysis } from './terrain-soil-analysis'
import type { SiteRiskReport } from './site-risk-analysis'
import type { SubsidenceAnalysis } from './site-deep-analysis'

// ━━━ 대지 조건이 설계에 미치는 영향 ━━━

export interface SiteDesignImpact {
  // 기초 설계
  foundation: {
    type: string              // 독립/매트/파일
    depth: number             // 기초 깊이 (m)
    concrete: string          // 콘크리트 강도
    rebar: string             // 철근 사양
    pilesNeeded: boolean      // 파일 필요 여부
    pileLength: number        // 파일 길이 (m)
    pileCount: number         // 파일 수량
    groundImprovement: string // 지반보강 공법
  }
  // 구조 보강
  structural: {
    seismicCategory: string   // 내진 등급
    seismicFactor: number     // 내진 계수
    windFactor: number        // 풍하중 계수
    additionalRebar: number   // 추가 철근량 (%)
    shearWallNeeded: boolean  // 전단벽 필요
  }
  // 건축 설계 조건
  architectural: {
    floorLevelGL: number      // 1층 바닥 GL 높이 (mm)
    retainingWall: boolean    // 옹벽 필요
    retainingHeight: number   // 옹벽 높이 (m)
    basementWaterproof: string // 지하 방수 등급
    drainageSystem: string    // 배수 시스템
    slopeAdaptation: string   // 경사 대응 방법
  }
  // 환경 대응
  environmental: {
    asbestosSurvey: boolean   // 석면조사 필요
    soilSurvey: boolean       // 토양조사 필요
    culturalSurvey: boolean   // 문화재조사 필요
    environmentalAssessment: boolean // 환경영향평가
  }
}

// ━━━ 대지 조건이 BOQ에 미치는 영향 ━━━

export interface SiteBOQImpact {
  additionalItems: {
    category: string
    item: string
    spec: string
    unit: string
    quantity: number
    unitPrice: number
    totalPrice: number
    reason: string      // 왜 필요한지
  }[]
  totalAdditionalCost: number   // 추가 비용 합계 (원)
  costIncreasePercent: number   // 기존 대비 증가율 (%)
}

// ━━━ 대지 조건이 사업성에 미치는 영향 ━━━

export interface SiteFeasibilityImpact {
  additionalCosts: {
    name: string
    amount: number      // 원
    description: string
  }[]
  totalAdditionalCost: number
  adjustedROI: number          // 보정된 ROI (%)
  adjustedNPV: number          // 보정된 NPV (억원)
  scheduleDelay: number        // 추가 공사기간 (개월)
  riskPremium: number          // 리스크 프리미엄 (%)
}

// ━━━ 대지 조건이 검증에 추가하는 항목 ━━━

export interface SiteVerificationItems {
  checks: {
    id: string
    category: 'SITE' | 'FOUNDATION' | 'SEISMIC' | 'FLOOD' | 'CONTAMINATION'
    name: string
    pass: boolean
    description: string
    severity: 'info' | 'warning' | 'critical'
  }[]
  passCount: number
  failCount: number
  criticalCount: number
}

// ━━━ 메인: 대지 분석 → 설계 영향 계산 ━━━

export function calculateSiteDesignImpact(params: {
  terrain: TerrainAnalysis
  risk: SiteRiskReport
  subsidence: SubsidenceAnalysis
  floors: number
  siteArea: number
  gfa: number
}): SiteDesignImpact {
  const { terrain, risk, subsidence, floors, siteArea } = params
  const soil = terrain.estimatedSoil
  const seismic = risk.seismic
  const flood = risk.flood
  const slope = terrain.slope

  // 기초 설계
  const pilesNeeded = soil.code === 'FILL' || soil.code === 'SILT' || (soil.code === 'CLAY' && floors >= 10)
  const pileLength = soil.code === 'FILL' ? 20 : soil.code === 'SILT' ? 15 : 10
  const pileCount = pilesNeeded ? Math.ceil(siteArea * (floors <= 5 ? 0.5 : floors <= 10 ? 0.8 : 1.2) / 4) : 0

  const foundation = {
    type: terrain.foundationType,
    depth: terrain.foundationDepth,
    concrete: seismic.risk === 'high' ? 'C27' : 'C24',
    rebar: seismic.risk === 'high' ? 'SD400 D16~D25' : 'SD400 D13~D22',
    pilesNeeded,
    pileLength,
    pileCount,
    groundImprovement: soil.code === 'FILL' ? 'DCM(심층혼합처리)+프리로딩' :
      soil.code === 'SILT' ? 'PBD(연직배수)+프리로딩' :
      soil.code === 'CLAY' ? 'SCP(모래다짐말뚝)' : '불요',
  }

  // 구조 보강
  const structural = {
    seismicCategory: seismic.seismicDesignCategory,
    seismicFactor: seismic.designAccel,
    windFactor: floors >= 15 ? 1.2 : 1.0,
    additionalRebar: seismic.risk === 'high' ? 20 : seismic.risk === 'medium' ? 10 : 0,
    shearWallNeeded: floors >= 10 || seismic.risk === 'high',
  }

  // 건축 설계
  const retainingNeeded = terrain.retainingWallNeeded
  const architectural = {
    floorLevelGL: flood.risk === 'very-high' ? 600 : flood.risk === 'high' ? 500 : flood.risk === 'medium' ? 300 : 150,
    retainingWall: retainingNeeded,
    retainingHeight: retainingNeeded ? Math.round((terrain.elevationRange[1] - terrain.elevationRange[0]) * 10) / 10 : 0,
    basementWaterproof: flood.groundwaterRisk === 'high' ? '내방수+외방수 이중' : '외방수 단일',
    drainageSystem: flood.risk === 'very-high' ? '빗물펌프+역류방지+저류조' : flood.risk === 'high' ? '빗물펌프+역류방지' : '자연배수',
    slopeAdaptation: slope > 15 ? '계단식 배치(테라스)' : slope > 5 ? '필로티+레벨 차이' : '표준 배치',
  }

  // 환경 대응
  const environmental = {
    asbestosSurvey: risk.history.demolitionHistory.includes('30년') || risk.history.demolitionHistory.includes('40년'),
    soilSurvey: risk.history.contaminationRisk !== 'low',
    culturalSurvey: risk.history.culturalAssetRisk !== 'low',
    environmentalAssessment: siteArea >= 10000,
  }

  return { foundation, structural, architectural, environmental }
}

// ━━━ 대지 분석 → BOQ 추가 항목 ━━━

export function calculateSiteBOQImpact(params: {
  terrain: TerrainAnalysis
  risk: SiteRiskReport
  subsidence: SubsidenceAnalysis
  design: SiteDesignImpact
  floors: number
  siteArea: number
  baseBOQCost: number    // 기존 BOQ 총액 (원)
}): SiteBOQImpact {
  const { terrain, risk, subsidence, design, siteArea, baseBOQCost } = params
  const items: SiteBOQImpact['additionalItems'] = []

  // 지반보강
  if (design.foundation.groundImprovement !== '불요') {
    items.push({
      category: '토공사', item: '지반보강', spec: design.foundation.groundImprovement,
      unit: '㎡', quantity: siteArea, unitPrice: terrain.estimatedSoil.code === 'FILL' ? 150000 : 80000,
      totalPrice: 0, reason: `${terrain.estimatedSoil.nameKo} → 지반보강 필요`,
    })
  }

  // 파일기초
  if (design.foundation.pilesNeeded) {
    items.push({
      category: '기초공사', item: `PHC파일 ${design.foundation.pileLength}m`, spec: `Φ400 L=${design.foundation.pileLength}m`,
      unit: '본', quantity: design.foundation.pileCount, unitPrice: design.foundation.pileLength * 80000,
      totalPrice: 0, reason: `${terrain.estimatedSoil.nameKo} → 파일기초 필요`,
    })
  }

  // 옹벽
  if (design.architectural.retainingWall) {
    const wallLength = Math.sqrt(siteArea) * 2
    items.push({
      category: '토공사', item: 'RC옹벽', spec: `H=${design.architectural.retainingHeight}m`,
      unit: 'm', quantity: Math.round(wallLength), unitPrice: design.architectural.retainingHeight * 500000,
      totalPrice: 0, reason: `경사 ${terrain.slope}% → 옹벽 필요`,
    })
  }

  // 내진 보강
  if (design.structural.additionalRebar > 0) {
    items.push({
      category: '구조보강', item: '내진 추가 철근', spec: `+${design.structural.additionalRebar}%`,
      unit: '식', quantity: 1, unitPrice: Math.round(baseBOQCost * design.structural.additionalRebar / 100 * 0.3),
      totalPrice: 0, reason: `${risk.seismic.zone}구역 ${risk.seismic.siteClass} → 내진 보강`,
    })
  }

  // 침수 대응
  if (risk.flood.risk === 'high' || risk.flood.risk === 'very-high') {
    items.push({
      category: '설비', item: '침수 방지 설비', spec: design.architectural.drainageSystem,
      unit: '식', quantity: 1, unitPrice: risk.flood.risk === 'very-high' ? 50000000 : 20000000,
      totalPrice: 0, reason: `침수위험 ${risk.flood.risk} → 방수/배수 강화`,
    })
  }

  // 차수 공법
  if (terrain.groundwaterRisk === 'high') {
    items.push({
      category: '토공사', item: '차수벽/웰포인트', spec: '지하수위 차수',
      unit: '식', quantity: 1, unitPrice: 80000000,
      totalPrice: 0, reason: '지하수위 높음 → 차수 공법',
    })
  }

  // 석면 조사
  if (design.environmental.asbestosSurvey) {
    items.push({
      category: '조사비', item: '석면 사전조사', spec: '석면안전관리법',
      unit: '식', quantity: 1, unitPrice: 5000000,
      totalPrice: 0, reason: '노후 건물 → 석면조사 의무',
    })
  }

  // 토양 조사
  if (design.environmental.soilSurvey) {
    items.push({
      category: '조사비', item: '토양오염조사', spec: '토양환경보전법',
      unit: '식', quantity: 1, unitPrice: 15000000,
      totalPrice: 0, reason: '오염 위험 → 토양조사 필요',
    })
  }

  // 문화재 조사
  if (design.environmental.culturalSurvey) {
    items.push({
      category: '조사비', item: '매장문화재 지표조사', spec: '문화재보호법',
      unit: '식', quantity: 1, unitPrice: 30000000,
      totalPrice: 0, reason: '문화재 위험 지역 → 조사 의무',
    })
  }

  // totalPrice 계산
  items.forEach(it => it.totalPrice = it.quantity * it.unitPrice)
  const totalAdditional = items.reduce((s, it) => s + it.totalPrice, 0)

  return {
    additionalItems: items,
    totalAdditionalCost: totalAdditional,
    costIncreasePercent: baseBOQCost > 0 ? Math.round(totalAdditional / baseBOQCost * 100) : 0,
  }
}

// ━━━ 대지 분석 → 사업성 보정 ━━━

export function calculateSiteFeasibilityImpact(params: {
  boqImpact: SiteBOQImpact
  subsidence: SubsidenceAnalysis
  risk: SiteRiskReport
  baseROI: number
  baseNPV: number
  baseTotalCost: number
  constructionMonths: number
}): SiteFeasibilityImpact {
  const { boqImpact, subsidence, risk, baseROI, baseNPV, baseTotalCost, constructionMonths } = params
  const additionalCosts: SiteFeasibilityImpact['additionalCosts'] = []

  // BOQ 추가 비용
  if (boqImpact.totalAdditionalCost > 0) {
    additionalCosts.push({
      name: '대지 조건 추가 공사비',
      amount: boqImpact.totalAdditionalCost,
      description: `기초보강/옹벽/내진/침수대응 등 ${boqImpact.additionalItems.length}항목`,
    })
  }

  // 지반보강 기간 비용 (금융비)
  if (subsidence.consolidationTime > 6) {
    const financeCost = Math.round(baseTotalCost * 0.05 / 12 * (subsidence.consolidationTime - 6))
    additionalCosts.push({
      name: '지반보강 기간 금융비용',
      amount: financeCost,
      description: `압밀 ${subsidence.consolidationTime}개월 → 추가 금융비`,
    })
  }

  // 문화재 조사 지연 비용
  if (risk.history.culturalAssetRisk !== 'low') {
    const delayCost = Math.round(baseTotalCost * 0.05 / 12 * 6) // 6개월 지연 가정
    additionalCosts.push({
      name: '문화재 조사 지연 비용',
      amount: delayCost,
      description: '매장문화재 조사 → 3~12개월 지연',
    })
  }

  // 토양 정화 비용
  if (risk.history.contaminationRisk === 'high') {
    additionalCosts.push({
      name: '토양 정화 비용',
      amount: 500000000, // 5억 가정
      description: '토양오염 정화 추정',
    })
  }

  const totalAdditional = additionalCosts.reduce((s, c) => s + c.amount, 0)
  const newTotalCost = baseTotalCost + totalAdditional
  const adjustedROI = baseTotalCost > 0 ? baseROI - (totalAdditional / baseTotalCost * 100) : baseROI
  const adjustedNPV = baseNPV - totalAdditional / 100000000

  // 공사 지연
  let scheduleDelay = 0
  if (subsidence.consolidationTime > 6) scheduleDelay += Math.round((subsidence.consolidationTime - 6) / 2)
  if (risk.history.culturalAssetRisk !== 'low') scheduleDelay += 6
  if (risk.history.contaminationRisk === 'high') scheduleDelay += 12

  // 리스크 프리미엄
  const riskPremium = risk.overallRisk === 'high' ? 3 : risk.overallRisk === 'medium' ? 1.5 : 0

  return {
    additionalCosts,
    totalAdditionalCost: totalAdditional,
    adjustedROI: Math.round(adjustedROI * 10) / 10,
    adjustedNPV: Math.round(adjustedNPV * 10) / 10,
    scheduleDelay,
    riskPremium,
  }
}

// ━━━ 대지 분석 → 검증 항목 추가 ━━━

export function generateSiteVerification(params: {
  design: SiteDesignImpact
  terrain: TerrainAnalysis
  risk: SiteRiskReport
  subsidence: SubsidenceAnalysis
}): SiteVerificationItems {
  const { design, terrain, risk, subsidence } = params
  const checks: SiteVerificationItems['checks'] = []

  // SITE 검증
  checks.push({
    id: 'SITE-01', category: 'SITE', name: '건축 적합도',
    pass: terrain.buildabilityScore >= 50,
    description: `${terrain.buildabilityScore}점 ${terrain.buildabilityGrade}`,
    severity: terrain.buildabilityScore < 50 ? 'critical' : 'info',
  })
  checks.push({
    id: 'SITE-02', category: 'SITE', name: '경사도 적합',
    pass: terrain.slope <= 25,
    description: `경사 ${terrain.slope}% (25% 이하 적합)`,
    severity: terrain.slope > 25 ? 'critical' : terrain.slope > 15 ? 'warning' : 'info',
  })

  // FOUNDATION 검증
  checks.push({
    id: 'FND-01', category: 'FOUNDATION', name: '기초 타입 적정',
    pass: true,
    description: `${design.foundation.type} (깊이 ${design.foundation.depth}m)`,
    severity: 'info',
  })
  checks.push({
    id: 'FND-02', category: 'FOUNDATION', name: '지내력 확보',
    pass: terrain.estimatedSoil.bearing >= 50,
    description: `지내력 ${terrain.estimatedSoil.bearing}kN/㎡ (50 이상 필요)`,
    severity: terrain.estimatedSoil.bearing < 50 ? 'critical' : 'info',
  })
  checks.push({
    id: 'FND-03', category: 'FOUNDATION', name: '침하량 허용',
    pass: subsidence.estimatedSettlement <= 50,
    description: `추정 ${subsidence.estimatedSettlement}mm (50mm 이하 적합)`,
    severity: subsidence.estimatedSettlement > 50 ? 'warning' : 'info',
  })
  checks.push({
    id: 'FND-04', category: 'FOUNDATION', name: '부등침하 안전',
    pass: !subsidence.differentialRisk,
    description: subsidence.differentialRisk ? '부등침하 위험 → 지반보강 필요' : '부등침하 안전',
    severity: subsidence.differentialRisk ? 'warning' : 'info',
  })

  // SEISMIC 검증
  checks.push({
    id: 'EQ-01', category: 'SEISMIC', name: '내진 설계 등급',
    pass: true,
    description: `${risk.seismic.seismicDesignCategory} (${risk.seismic.zone}구역 ${risk.seismic.siteClass})`,
    severity: 'info',
  })
  checks.push({
    id: 'EQ-02', category: 'SEISMIC', name: '설계 지반가속도',
    pass: risk.seismic.designAccel <= 0.22,
    description: `${risk.seismic.designAccel}g (KDS 41 17 00)`,
    severity: risk.seismic.designAccel > 0.15 ? 'warning' : 'info',
  })
  checks.push({
    id: 'EQ-03', category: 'SEISMIC', name: '지반 증폭 계수',
    pass: risk.seismic.amplificationFactor <= 2.0,
    description: `×${risk.seismic.amplificationFactor} (S5=2.0 최대)`,
    severity: risk.seismic.amplificationFactor >= 1.6 ? 'warning' : 'info',
  })

  // FLOOD 검증
  checks.push({
    id: 'FLD-01', category: 'FLOOD', name: '침수 위험도',
    pass: risk.flood.risk !== 'very-high',
    description: `${risk.flood.risk} (점수 ${risk.flood.riskScore}/100)`,
    severity: risk.flood.risk === 'very-high' ? 'critical' : risk.flood.risk === 'high' ? 'warning' : 'info',
  })
  checks.push({
    id: 'FLD-02', category: 'FLOOD', name: '1층 바닥 GL',
    pass: true,
    description: `GL+${design.architectural.floorLevelGL}mm 계획`,
    severity: design.architectural.floorLevelGL >= 500 ? 'warning' : 'info',
  })
  checks.push({
    id: 'FLD-03', category: 'FLOOD', name: '배수 시스템',
    pass: true,
    description: design.architectural.drainageSystem,
    severity: risk.flood.risk === 'very-high' ? 'warning' : 'info',
  })

  // CONTAMINATION 검증
  checks.push({
    id: 'CTM-01', category: 'CONTAMINATION', name: '토양 오염 위험',
    pass: risk.history.contaminationRisk === 'low',
    description: `오염 위험 ${risk.history.contaminationRisk}`,
    severity: risk.history.contaminationRisk === 'high' ? 'critical' : risk.history.contaminationRisk === 'medium' ? 'warning' : 'info',
  })
  checks.push({
    id: 'CTM-02', category: 'CONTAMINATION', name: '문화재 매장 위험',
    pass: risk.history.culturalAssetRisk === 'low',
    description: `문화재 위험 ${risk.history.culturalAssetRisk}`,
    severity: risk.history.culturalAssetRisk === 'high' ? 'warning' : 'info',
  })
  checks.push({
    id: 'CTM-03', category: 'CONTAMINATION', name: '석면 조사',
    pass: !design.environmental.asbestosSurvey,
    description: design.environmental.asbestosSurvey ? '석면조사 필요' : '석면 해당없음',
    severity: design.environmental.asbestosSurvey ? 'warning' : 'info',
  })

  const passCount = checks.filter(c => c.pass).length
  const failCount = checks.filter(c => !c.pass).length
  const criticalCount = checks.filter(c => !c.pass && c.severity === 'critical').length

  return { checks, passCount, failCount, criticalCount }
}
