import type { ExportData } from "@/lib/report-export"
import type { LayoutOption } from "@/app/page"
import type { ZoningRegulation } from "@/lib/regulation-types"
import type { FeasibilityResult } from "@/lib/project-analysis-state"
import type { BrandingConfig } from "@/lib/branding-config"
import type { RegionalPricing } from "@/lib/regional-pricing"
import { calculateFeasibility } from "@/lib/project-analysis-state"
import { getZoneMultiplier } from "@/lib/regional-pricing"
import { evaluatePatternQuality, type UserValues } from "@/lib/pattern-quality"

interface BuildExportDataParams {
  address: string
  siteAreaNum: number
  branding: BrandingConfig | null
  selectedLayoutData: LayoutOption
  layouts: LayoutOption[]
  feasibilityResult: FeasibilityResult | null
  marketPrice: { loaded: boolean; suggestedSalePrice: number }
  regionalPricing: RegionalPricing | null
  landPriceData: { pricePerM2: number }
  regulation: ZoningRegulation
  molitSupplementData: Record<string, unknown>
  strategy?: string
  userValues?: UserValues
}

export function buildExportData(params: BuildExportDataParams): ExportData {
  const {
    address, siteAreaNum, branding, selectedLayoutData, layouts,
    feasibilityResult, marketPrice, regionalPricing, landPriceData,
    regulation, molitSupplementData,
  } = params

  const calcLayoutRoi = (l: LayoutOption): number => {
    if (l.id === selectedLayoutData.id) return feasibilityResult?.roi || 0
    try {
      const effectiveSP = (marketPrice.loaded && marketPrice.suggestedSalePrice > 0)
        ? marketPrice.suggestedSalePrice
        : regionalPricing
          ? Math.round(regionalPricing.salesPricePerM2 * getZoneMultiplier(regulation.zoneType || ''))
          : undefined
      const f = calculateFeasibility({
        siteArea: siteAreaNum, grossFloorArea: l.gfa || 1, unitCount: l.units || 1,
        floorCount: l.floors || 1, parkingCount: l.parking || 0,
        landPricePerM2: landPriceData.pricePerM2 || 5000000,
        salesPricePerM2: effectiveSP,
        constructionCostPerM2: regionalPricing?.constructionCostPerM2 || undefined,
      })
      return f.roi
    } catch { return 0 }
  }

  return {
    address,
    siteArea: siteAreaNum,
    branding: branding || undefined,
    layout: {
      name: selectedLayoutData.name,
      type: selectedLayoutData.type,
      floors: selectedLayoutData.floors,
      units: selectedLayoutData.units,
      parking: selectedLayoutData.parking,
      buildingCoverage: selectedLayoutData.coverage ?? 0,
      far: selectedLayoutData.gfa ? Math.round((selectedLayoutData.gfa / siteAreaNum) * 100) : 0,
      gfa: selectedLayoutData.gfa ?? 0,
    },
    allLayouts: layouts.map(l => ({
      name: l.name,
      buildingCoverage: l.coverage ?? 0,
      floors: l.floors,
      units: l.units,
      parking: l.parking,
      gfa: l.gfa ?? 0,
      roi: calcLayoutRoi(l),
      isRecommended: l.id === selectedLayoutData.id,
    })),
    feasibility: {
      landCost: feasibilityResult?.landCost ? feasibilityResult.landCost / 100000000 : 0,
      constructionCost: feasibilityResult?.constructionCost ? feasibilityResult.constructionCost / 100000000 : 0,
      indirectCost: feasibilityResult?.softCost ? feasibilityResult.softCost / 100000000 : 0,
      totalCost: feasibilityResult?.totalCost ? feasibilityResult.totalCost / 100000000 : 0,
      totalRevenue: feasibilityResult?.totalRevenue ? feasibilityResult.totalRevenue / 100000000 : 0,
      expectedProfit: feasibilityResult?.profit ? feasibilityResult.profit / 100000000 : 0,
      roi: feasibilityResult?.roi ?? 0,
      avgSalePrice: feasibilityResult?.salesPricePerM2 || undefined,
      breakEvenRate: feasibilityResult?.totalRevenue && feasibilityResult?.totalCost
        ? (feasibilityResult.totalCost / feasibilityResult.totalRevenue) * 100
        : 0,
    },
    regulation: {
      zoneType: (molitSupplementData.zoneCode as string) || regulation?.zoneType || '',
      roadWidth: (molitSupplementData.roadWidth as number) || regulation?.roadWidth,
      maxHeight: (molitSupplementData.heightLimit as number) || regulation?.maxHeight,
      buildingCoverageLimit: regulation?.maxCoverageRatio,
      farLimit: regulation?.maxFloorAreaRatio,
      hasDistrictPlan: (molitSupplementData.hasDistrictPlan as boolean) ?? regulation?.additionalNotes?.includes('지구단위') ?? false,
    },
    verdict: feasibilityResult?.roi && feasibilityResult.roi >= 20
      ? "사업 추진 가능"
      : feasibilityResult?.roi && feasibilityResult.roi >= 10
        ? "조건부 가능"
        : "추가 검토 필요",
    risks: {
      land: ["감정평가에 따른 매입가 변동", "소유권 및 권리관계 확인", "토지거래허가구역 해당 여부"],
      permit: ["지구단위계획 변경 필요 여부", "건축심의 소요기간", "각종 부담금 발생 가능성"],
      market: ["분양가 상한제 적용 여부", "인근 경쟁 물량 현황", "금리 변동에 따른 수요 변화"],
      construction: ["공사비 상승 리스크", "공사기간 지연 가능성", "하자보수 책임"],
    },
    patternQuality: (() => {
      try {
        const pq = evaluatePatternQuality({
          type: selectedLayoutData.type || 'tower',
          name: selectedLayoutData.name,
          coverage: selectedLayoutData.coverage ?? 0,
          floors: selectedLayoutData.floors,
          units: selectedLayoutData.units || 0,
          parking: selectedLayoutData.parking || 0,
          gfa: selectedLayoutData.gfa || 0,
          siteArea: siteAreaNum,
          strategy: (params.strategy as string) || 'profitability',
        }, params.userValues)
        return {
          overallQuality: pq.overallQuality,
          grade: pq.grade,
          gradeColor: pq.gradeColor,
          totalPatternScore: pq.totalPatternScore,
          totalLivingScore: pq.totalLivingScore,
          philosophy: pq.philosophy,
          topPatterns: pq.patterns
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map(p => ({ id: p.id, nameKr: p.nameKr, score: p.score })),
        }
      } catch { return undefined }
    })(),
  }
}
