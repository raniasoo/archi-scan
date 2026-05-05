"use client"

import dynamic from "next/dynamic"
import type { LayoutOption } from "@/app/page"
import type { ZoningRegulation } from "@/lib/regulation-types"
import type { DesignStrategy } from "@/lib/design-strategy"
import type { FeasibilityResult } from "@/lib/project-analysis-state"

const DebugPanel = dynamic(() => import("@/components/debug-panel").then(m => ({ default: m.DebugPanel })))
const ReleaseChecklistPanel = dynamic(() => import("@/components/release-checklist-panel").then(m => ({ default: m.ReleaseChecklistPanel })))
const QAInspectionPanel = dynamic(() => import("@/components/qa-inspection-panel").then(m => ({ default: m.QAInspectionPanel })))

interface DevPanelsProps {
  address: string
  siteAreaNum: number
  regulation: ZoningRegulation
  supplementData: Record<string, unknown>
  strategy: DesignStrategy
  recommendedLayout: LayoutOption | undefined
  selectedLayoutData: LayoutOption | undefined
  feasibilityResult: FeasibilityResult | null
}

export function DevPanels({
  address, siteAreaNum, regulation, supplementData,
  strategy, recommendedLayout, selectedLayoutData, feasibilityResult,
}: DevPanelsProps) {
  // 공통 props 1회 계산
  const baseProps = {
    address,
    siteArea: siteAreaNum,
    zoning: regulation?.zoneType,
    road: `${regulation?.roadWidth || 0}m`,
    heightLimit: regulation?.maxHeight,
    districtPlan: (supplementData?.districtPlan as string) ?? "없음",
    selectedStrategy: strategy,
  }

  const recLayout = recommendedLayout ? {
    id: String(recommendedLayout.id),
    name: recommendedLayout.name,
    floors: recommendedLayout.floors,
    units: recommendedLayout.units,
    parking: recommendedLayout.parking,
    buildingCoverage: recommendedLayout.coverage ?? 0,
    far: recommendedLayout.gfa ? Math.round((recommendedLayout.gfa / siteAreaNum) * 100) : 0,
    gfa: recommendedLayout.gfa,
  } : null

  const selLayout = selectedLayoutData ? {
    id: String(selectedLayoutData.id),
    name: selectedLayoutData.name,
    type: selectedLayoutData.type,
    floors: selectedLayoutData.floors,
    units: selectedLayoutData.units,
    parking: selectedLayoutData.parking,
    buildingCoverage: selectedLayoutData.coverage ?? 0,
    far: selectedLayoutData.gfa ? Math.round((selectedLayoutData.gfa / siteAreaNum) * 100) : 0,
    gfa: selectedLayoutData.gfa,
  } : null

  const regResult = {
    maxCoverage: regulation?.maxCoverageRatio,
    maxFar: regulation?.maxFloorAreaRatio,
    maxGfa: Math.round(siteAreaNum * (regulation?.maxFloorAreaRatio || 0) / 100),
    recommendedFloors: { min: 3, max: Math.min(7, Math.floor((regulation?.maxHeight || 30) / 3.5)) },
    requiredParking: selectedLayoutData?.units || 0,
  }

  const totalCost = feasibilityResult?.landCost
    ? (feasibilityResult.landCost + feasibilityResult.constructionCost + (feasibilityResult as any).indirectCost) / 100000000
    : undefined
  const totalCostRounded = totalCost ? Math.round(totalCost) : undefined

  const verdict = feasibilityResult?.roi && feasibilityResult.roi >= 20
    ? "사업 추진 가능"
    : feasibilityResult?.roi && feasibilityResult.roi >= 10
      ? "조건부 가능"
      : "추가 검토 필요"

  const feasProps = {
    planName: selectedLayoutData?.name,
    totalCost,
    expectedRevenue: feasibilityResult?.totalRevenue ? feasibilityResult.totalRevenue / 100000000 : undefined,
    expectedProfit: (feasibilityResult as any)?.expectedProfit ? (feasibilityResult as any).expectedProfit / 100000000 : undefined,
    roi: feasibilityResult?.roi,
    gfa: selectedLayoutData?.gfa,
  }

  const reportProps = {
    planName: selectedLayoutData?.name,
    verdict,
    roi: feasibilityResult?.roi,
    totalCost,
    expectedRevenue: feasibilityResult?.totalRevenue ? feasibilityResult.totalRevenue / 100000000 : undefined,
    units: selectedLayoutData?.units,
    floors: selectedLayoutData?.floors,
    grossFloorArea: selectedLayoutData?.gfa,
  }

  return (
    <>
      <DebugPanel
        {...baseProps}
        recommendedLayout={recLayout}
        selectedLayout={selLayout}
        regulationResult={regResult}
        feasibilityResult={{ ...feasProps, totalCost: totalCostRounded, revenueModel: "세대수 기준", expectedRevenue: feasProps.expectedRevenue ? Math.round(feasProps.expectedRevenue) : undefined, expectedProfit: feasProps.expectedProfit ? Math.round(feasProps.expectedProfit) : undefined }}
        reportData={{ ...reportProps, totalCost: totalCostRounded, expectedRevenue: reportProps.expectedRevenue ? Math.round(reportProps.expectedRevenue) : undefined }}
        floorPlanName={selectedLayoutData?.name}
        comparisonCurrentPlan={selectedLayoutData?.name}
      />
      <ReleaseChecklistPanel
        {...baseProps}
        recommendedLayout={recLayout}
        selectedLayout={selLayout}
        regulationResult={regResult}
        floorPlanName={selectedLayoutData?.name}
        feasibilityResult={feasProps}
        reportData={reportProps}
      />
      <QAInspectionPanel
        {...baseProps}
        recommendedLayout={recLayout}
        selectedLayout={selLayout}
        regulationResult={regResult}
        feasibilityResult={feasProps}
        reportData={{ ...reportProps, address }}
        floorPlanName={selectedLayoutData?.name}
        comparisonCurrentPlan={selectedLayoutData?.name}
      />
    </>
  )
}
