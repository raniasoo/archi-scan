"use client"

import { useState, type Dispatch, type SetStateAction } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Sparkles, ChevronRight, ChevronDown } from "lucide-react"
import type { ZoningRegulation } from "@/lib/regulation-types"
import { calculateRegulations, type ZoneCode } from "@/lib/regulation-calculator"
import { formatLandPricePerM2, formatLandCost } from "@/lib/land-price"

const LoadingBox = () => <div className="flex items-center justify-center p-8 text-muted-foreground"><span className="animate-spin mr-2">⏳</span>로딩 중...</div>
const RegulationInput = dynamic(() => import("@/components/regulation-input").then(m => ({ default: m.RegulationInput })))
const RegulationAnalysisPanel = dynamic(() => import("@/components/regulation-analysis").then(m => ({ default: m.RegulationAnalysisPanel })))
const LegalReviewPanel = dynamic(() => import("@/components/legal-review-panel").then(m => ({ default: m.LegalReviewPanel })))
const ZoneAllowedUsesCard = dynamic(() => import("@/components/zone-allowed-uses-card").then(m => ({ default: m.ZoneAllowedUsesCard })))
const CadastralMap = dynamic(() => import("@/components/cadastral-map").then(m => ({ default: m.CadastralMap })), { ssr: false, loading: LoadingBox })

export interface RegulationStepProps {
  address: string
  siteArea: string
  siteAreaNum: number
  regulation: ZoningRegulation
  setRegulation: Dispatch<SetStateAction<ZoningRegulation>>
  setSiteArea: Dispatch<SetStateAction<string>>
  setSitePolygon: Dispatch<SetStateAction<any>>
  landPriceData: { pricePerM2: number; totalCost: number; source: string; isDemo: boolean; stdrYear: number; message?: string; loading: boolean }
  marketPrice: { avgPricePerM2: number; suggestedSalePrice: number; transactionCount: number; loaded: boolean; transactions: any[] }
  molitSupplementData: Record<string, unknown>
  siteBdMgtSn: string
  handleGenerate: () => void
  onNextStep?: () => void
}

type TabId = 'checklist' | 'regulations' | 'site' | 'edit'

export function RegulationStep(props: RegulationStepProps) {
  const {
    address, siteArea, siteAreaNum, regulation, setRegulation,
    setSiteArea, setSitePolygon, landPriceData, marketPrice,
    molitSupplementData, siteBdMgtSn, handleGenerate, onNextStep,
  } = props

  const [activeTab, setActiveTab] = useState<TabId>('checklist')
  const [showAllRegs, setShowAllRegs] = useState(false)

  const regs = (molitSupplementData as any)?.overlappingRegulations as { name: string; category: string; severity: string; coverageOverride?: number; heightLimit?: number; floorLimit?: number; description?: string }[] | undefined
  const criticalRegs = regs?.filter(r => r.severity === 'critical' || r.severity === 'high') || []
  const otherRegs = regs?.filter(r => r.severity !== 'critical' && r.severity !== 'high') || []

  const rw = (molitSupplementData as any).roadWidth || regulation?.roadWidth || 8
  const zc = (molitSupplementData as any).zoneCode || regulation?.zoneType
  const ht = (molitSupplementData as any).heightLimit || regulation?.maxHeight || 30
  const dp = (molitSupplementData as any).hasDistrictPlan ?? regulation?.additionalNotes?.includes('지구단위') ?? false
  const maxCoverage = regulation?.maxCoverageRatio ?? 60
  const maxFAR = regulation?.maxFloorAreaRatio ?? 200
  const maxFloors = regulation?.maxFloors ?? 12
  const maxHeight = regulation?.maxHeight ?? 30

  const hasRoadIssue = rw < 6
  const hasCriticalReg = criticalRegs.length > 0
  const overallGrade = hasCriticalReg ? 'caution' : hasRoadIssue ? 'conditional' : 'good'
  const gradeConfig = {
    good: { emoji: '🟢', text: '사업 추진 가능', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    conditional: { emoji: '🟡', text: '조건부 추진 검토', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    caution: { emoji: '🔴', text: '규제 확인 필요', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  }[overallGrade]

  // 실제 법규 검토 결과로 카운트 산출
  const complianceResult = (() => {
    try {
      const zoneMap: Record<string, ZoneCode> = {
        'residential-exclusive-1': 'residential-exclusive-1', 'residential-exclusive-2': 'residential-exclusive-2',
        'residential-1': 'residential-1', 'residential-2': 'residential-2', 'residential-3': 'residential-3',
        'semi-residential': 'semi-residential', 'commercial-neighborhood': 'commercial-neighborhood',
        'commercial-general': 'commercial-general', 'commercial-central': 'commercial-central',
      }
      const mapped = zoneMap[zc] || 'residential-2'
      return calculateRegulations({ zoneCode: mapped as ZoneCode, siteArea: siteAreaNum, roadWidth: rw, heightLimit: ht, hasDistrictPlan: dp })
    } catch { return null }
  })()
  const okCount = complianceResult?.compliance.filter(c => c.status === 'ok').length ?? 4
  const warnCount = complianceResult?.compliance.filter(c => c.status === 'warning').length ?? 0
  const violCount = complianceResult?.compliance.filter(c => c.status === 'violation').length ?? 0

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'checklist', label: '체크리스트', icon: '✅' },
    { id: 'regulations', label: '규제분석', icon: '🔍' },
    { id: 'site', label: '대지정보', icon: '🗺️' },
    { id: 'edit', label: '입력수정', icon: '✏️' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* ━━━ 1층: 종합 판단 대시보드 ━━━ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold">법규 검토</h2>
            <p className="text-xs text-muted-foreground">{address} · {Number(siteArea).toLocaleString()}㎡</p>
          </div>
        </div>

        <div className={`rounded-xl border p-4 ${gradeConfig.bg}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-muted-foreground">종합 판단</p>
              <p className={`text-lg font-black ${gradeConfig.color}`}>{gradeConfig.emoji} {gradeConfig.text}</p>
            </div>
            <Button onClick={onNextStep || handleGenerate} size="sm" className="gap-1 text-xs">
              설계방향 <ChevronRight className="h-3 w-3" />
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: '건폐율', value: `${maxCoverage}%` },
              { label: '용적률', value: `${maxFAR}%` },
              { label: '높이', value: `${maxHeight}m` },
              { label: '층수', value: `${maxFloors}층` },
            ].map(item => (
              <div key={item.label} className="text-center rounded-lg bg-background/50 py-2">
                <p className="text-[9px] text-muted-foreground">{item.label}</p>
                <p className="text-sm font-bold">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-emerald-400">✅ {okCount}개 적합</span>
            {warnCount > 0 && <span className="text-amber-400">⚠️ {warnCount}개 확인필요</span>}
            {violCount > 0 && <span className="text-red-400">❌ {violCount}개 위반</span>}
            {criticalRegs.length > 0 && <span className="text-red-400">⚡ {criticalRegs[0]?.name}</span>}
          </div>
        </div>
      </div>

      {/* ━━━ 2층: 탭 네비게이션 ━━━ */}
      <div className="flex gap-1 bg-secondary/30 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-1 rounded-lg text-[11px] font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="block text-center">{tab.icon}</span>
            <span className="block text-center">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ━━━ 탭 콘텐츠 ━━━ */}
      {activeTab === 'checklist' && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold text-primary bg-primary/20 h-5 w-5 rounded-full flex items-center justify-center">법</span>
            <h3 className="text-sm font-semibold">건축법 기반 법규검토</h3>
            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">국계법·건축법·주차장법</span>
          </div>
          <LegalReviewPanel zoneCode={zc} siteArea={siteAreaNum} roadWidth={rw} heightLimit={ht} hasDistrictPlan={dp} />
        </div>
      )}

      {activeTab === 'regulations' && (
        <div className="space-y-4">
          {regs && regs.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px]">🔍</span>
                <h3 className="text-sm font-semibold">중첩 규제 분석</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">{regs.length}개 적용</span>
              </div>
              {criticalRegs.length > 0 && (
                <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 space-y-1">
                  <p className="text-[10px] font-bold text-red-400">⚠️ 핵심 규제 — 사업성 직접 영향</p>
                  {criticalRegs.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs font-semibold text-red-300 shrink-0">{r.name}</span>
                      {r.description && <span className="text-[10px] text-red-400/80">{r.description}</span>}
                    </div>
                  ))}
                </div>
              )}
              {otherRegs.length > 0 && (
                <div>
                  <button onClick={() => setShowAllRegs(!showAllRegs)} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronDown className={`h-3 w-3 transition-transform ${showAllRegs ? 'rotate-180' : ''}`} />
                    참고 규제 {otherRegs.length}건 {showAllRegs ? '접기' : '보기'}
                  </button>
                  {showAllRegs && (
                    <div className="mt-2 space-y-1">
                      {otherRegs.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 py-0.5">
                          <span className="text-[9px] px-1.5 py-0.5 rounded border bg-slate-500/20 text-slate-400 border-slate-500/30">📋 참고</span>
                          <span className="text-xs">{r.name}</span>
                          <span className="text-[10px] text-muted-foreground">({r.category})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <RegulationAnalysisPanel
            siteArea={siteAreaNum}
            regulation={{ ...regulation, zoneType: zc as typeof regulation.zoneType, roadWidth: rw, maxHeight: ht, additionalNotes: dp ? '지구단위계획 적용' : regulation?.additionalNotes || '' }}
          />
        </div>
      )}

      {activeTab === 'site' && (
        <div className="space-y-4">
          {(landPriceData.pricePerM2 > 0 || landPriceData.loading) && (
            <div className={`rounded-xl border p-4 ${landPriceData.isDemo ? 'border-amber-500/20 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center ${landPriceData.isDemo ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>₩</span>
                <h3 className="text-sm font-semibold">공시지가 기반 토지비</h3>
                {landPriceData.loading && <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />}
                {!landPriceData.loading && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${landPriceData.isDemo ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {landPriceData.isDemo ? '지역평균' : (landPriceData.stdrYear ? `${landPriceData.stdrYear}년 실측` : '실측')}
                  </span>
                )}
              </div>
              {!landPriceData.loading && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-secondary/30 p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">공시지가 단가</p>
                    <p className="text-lg font-bold">{formatLandPricePerM2(landPriceData.pricePerM2)}</p>
                    <p className="text-[10px] text-muted-foreground">{landPriceData.pricePerM2.toLocaleString()}원/㎡</p>
                  </div>
                  <div className="rounded-lg bg-secondary/30 p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">예상 토지매입비</p>
                    <p className="text-lg font-bold">{formatLandCost(landPriceData.totalCost || landPriceData.pricePerM2 * siteAreaNum)}</p>
                    <p className="text-[10px] text-muted-foreground">{siteAreaNum.toLocaleString()}㎡ × {formatLandPricePerM2(landPriceData.pricePerM2)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-bold text-blue-400 bg-blue-500/20 h-5 w-5 rounded-full flex items-center justify-center">지</span>
              <h3 className="text-sm font-semibold">실제 지적도 기반 대지 형상</h3>
              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">Vworld</span>
            </div>
            <CadastralMap
              address={address} siteArea={siteAreaNum}
              entX={(molitSupplementData as any).entX} entY={(molitSupplementData as any).entY}
              bdMgtSn={siteBdMgtSn || (molitSupplementData as any).bdMgtSn}
              setbackFront={regulation?.setbackFront ?? 3} setbackSide={regulation?.setbackSide ?? 1.5} setbackRear={regulation?.setbackRear ?? 2}
              coverageRatio={maxCoverage}
              onParcelLoaded={(area) => { if (area > 0 && Math.abs(area - siteAreaNum) > 10) setSiteArea(String(Math.round(area))) }}
              onParcelPolygonLoaded={(coords, centroid) => setSitePolygon({ coords, centroid })}
            />
          </div>
        </div>
      )}

      {activeTab === 'edit' && (
        <div className="space-y-4">
          <RegulationInput regulation={regulation} onChange={setRegulation} defaultCollapsed={false} />
          {regulation?.zoneType && regulation.zoneType !== 'custom' && (
            <ZoneAllowedUsesCard zoneType={regulation.zoneType} zoneName={regulation.zoneType} />
          )}
        </div>
      )}

      {/* ━━━ 하단 CTA ━━━ */}
      <Button onClick={onNextStep || handleGenerate} size="lg" className="w-full gap-2 py-6 text-base font-bold">
        <Sparkles className="h-5 w-5" />
        설계방향 선택으로
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}
