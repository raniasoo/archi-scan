"use client"

import { type Dispatch, type SetStateAction } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Building2, Clock } from "lucide-react"
import type { SupplementData } from "@/components/manual-supplement-form"
import type { ProjectSnapshot } from "@/components/project-manager"
import type { ProjectListItem } from "@/lib/project-storage"
import { deleteProject as deleteProjectFromStorage, loadProject as loadProjectFromStorage, getRecentProjects } from "@/lib/project-storage"
import { ARCHISCAN_SCENARIOS, applyScenarioToInput, IS_DEV_MODE } from "@/constants/archiscan-scenarios"
import { ARCHISCAN_COPY } from "@/constants/archiscan-copy"
import { SiteInputForm } from "@/components/site-input-form"
import { SiteMapPreview } from "@/components/site-map-preview"

const LoadingBox = () => <div className="flex items-center justify-center p-8 text-muted-foreground"><span className="animate-spin mr-2">⏳</span>로딩 중...</div>
const ScenarioSelector = dynamic(() => import("@/components/scenario-selector").then(m => ({ default: m.ScenarioSelector })))
const ProjectComparison = dynamic(() => import("@/components/project-comparison").then(m => ({ default: m.ProjectComparison })))
const SlopeAnalysisCard = dynamic(() => import("@/components/slope-analysis-card").then(m => ({ default: m.SlopeAnalysisCard })))
const Terrain3DView = dynamic(() => import("@/components/terrain-3d-view").then(m => ({ default: m.Terrain3DView })), { ssr: false, loading: LoadingBox })

export interface InputStepProps {
  address: string
  setAddress: Dispatch<SetStateAction<string>>
  siteArea: string
  setSiteArea: Dispatch<SetStateAction<string>>
  setStrategy: Dispatch<SetStateAction<any>>
  setSupplementData: Dispatch<SetStateAction<any>>
  setCurrentProjectId: Dispatch<SetStateAction<string | null>>
  setCurrentProjectName: Dispatch<SetStateAction<string>>
  setRecentProjects: Dispatch<SetStateAction<ProjectListItem[]>>
  setShowAllProjectsList: Dispatch<SetStateAction<boolean>>
  setShowProjectComparison: Dispatch<SetStateAction<boolean>>
  showAllProjectsList: boolean
  showProjectComparison: boolean
  mounted: boolean
  currentProjectId: string | null
  recentProjects: ProjectListItem[]
  molitSupplementData: Record<string, unknown>
  siteCoords: { lng: number; lat: number } | null
  sitePolygon: { coords: [number, number][]; centroid: [number, number] } | null
  supplementKey: number
  handleSiteInputComplete: () => void
  handleSupplementDataChange: (data: SupplementData) => void
  handleMolitDataFetched: (data: any) => void
  handleProjectLoad: (snapshot: ProjectSnapshot) => void
  autoTriggerLookup?: boolean
}

export function InputStep(props: InputStepProps) {
  const {
    address, setAddress, siteArea, setSiteArea, setStrategy, setSupplementData,
    setCurrentProjectId, setCurrentProjectName, setRecentProjects,
    setShowAllProjectsList, setShowProjectComparison,
    showAllProjectsList, showProjectComparison,
    mounted, currentProjectId, recentProjects, molitSupplementData,
    siteCoords, sitePolygon, supplementKey,
    handleSiteInputComplete, handleSupplementDataChange, handleMolitDataFetched,
    handleProjectLoad,
  } = props

  return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] md:min-h-[60vh]">
            <div className="w-full max-w-md">
              {/* 이전 작업 복원 알림 */}
              {address && mounted && (() => {
                try {
                  const saved = localStorage.getItem('archi-scan-session')
                  const s = saved ? JSON.parse(saved) : null
                  return s?.savedAt ? (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      이전 작업이 자동 복원됐습니다 ({new Date(s.savedAt).toLocaleString('ko', {month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'})})
                    </div>
                  ) : null
                } catch { return null }
              })()}

              {/* Dev Mode Scenario Selector */}
              <ScenarioSelector 
                className="mb-4"
                onApplyScenario={(scenario) => {
                  // 대지 입력
                  setAddress(scenario.input.address)
                  setSiteArea(String(scenario.input.siteArea))
                  // 보완 입력 데이터도 함께 적용
                  setSupplementData({
                    zoneType: scenario.input.zoning,
                    roadWidth: scenario.input.road.includes("8m") ? "8m 이상" : "6m 이상",
                    heightLimit: parseInt(scenario.input.heightLimit) || 30,
                    districtPlan: scenario.input.districtPlan,
                    note: `[DEV] ${scenario.label} 시나리오 자동 적용`,
                  })
                  // 전략도 자동 선택
                  const strategyMap: Record<string, "area-maximize" | "profitability" | "parking-efficient" | "livability"> = {
                    "면적 확보형": "area-maximize",
                    "사업성 우선형": "profitability",
                    "조망 우선형": "livability",
                    "실거주 최적형": "livability",
                  }
                  setStrategy(strategyMap[scenario.input.selectedStrategy] || "area-maximize")
                }}
              />
              
              <div className="text-center mb-6 md:mb-8">
                <div className="flex justify-center mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                    <Building2 className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{ARCHISCAN_COPY.entry.pageTitle}</h2>
                <p className="text-sm md:text-base text-muted-foreground">{ARCHISCAN_COPY.entry.pageDescription}</p>
              </div>
              <SiteInputForm
                    address={address}
                    siteArea={siteArea}
                    onAddressChange={setAddress}
                    onSiteAreaChange={setSiteArea}
                    onGenerate={handleSiteInputComplete}
                    isGenerating={false}
                    buttonText="법규 검토로"
                    onSupplementDataChange={handleSupplementDataChange}
                    onMolitDataFetched={handleMolitDataFetched}
                    externalSupplement={(molitSupplementData as any).zoneCode ? { ...molitSupplementData as any, _key: supplementKey } : null}
                    autoTriggerLookup={props.autoTriggerLookup}
                  />
              
              {/* 대상지 위치 지도 */}
              {siteCoords && (
                <div className="mt-4 space-y-3">
                  <SiteMapPreview
                    lng={siteCoords.lng}
                    lat={siteCoords.lat}
                    address={address}
                  />
                  <Terrain3DView
                    lng={siteCoords.lng}
                    lat={siteCoords.lat}
                    address={address}
                    sitePolygon={sitePolygon ?? undefined}
                  />
                  <SlopeAnalysisCard
                    lng={siteCoords.lng}
                    lat={siteCoords.lat}
                  />
                </div>
              )}
              
              {/* 최근 프로젝트 */}
              {recentProjects.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> 최근 프로젝트
                    </p>
                    {recentProjects.length >= 2 && (
                      <button onClick={() => setShowProjectComparison(prev => !prev)}
                        className="text-xs text-primary hover:underline flex items-center gap-1">
                        {showProjectComparison ? '비교 닫기' : '프로젝트 비교'}
                      </button>
                    )}
                  </div>
                  
                  {showProjectComparison && (
                    <div className="mb-3">
                      <ProjectComparison
                        onClose={() => setShowProjectComparison(false)}
                        onLoadProject={(id) => {
                          try {
                            const proj = loadProjectFromStorage(id)
                            if (proj?.data) {
                              handleProjectLoad(proj.data)
                              setCurrentProjectId(proj.id)
                              setCurrentProjectName(proj.name)
                              setShowProjectComparison(false)
                            }
                          } catch {}
                        }}
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {recentProjects.slice(0, showAllProjectsList ? 10 : 3).map(p => (
                      <div key={p.id} className="flex items-center gap-1">
                        <button onClick={() => {
                          try {
                            const proj = loadProjectFromStorage(p.id)
                            if (proj?.data) {
                              handleProjectLoad(proj.data)
                              setCurrentProjectId(proj.id)
                              setCurrentProjectName(proj.name)
                            }
                          } catch {}
                        }}
                          className="flex-1 text-left px-3 py-2 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground truncate">{p.name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                              {new Date(p.updatedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{p.address} · {p.siteArea?.toLocaleString()}㎡</p>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`"${p.name}" 프로젝트를 삭제할까요?`)) {
                              deleteProjectFromStorage(p.id)
                              if (currentProjectId === p.id) {
                                setCurrentProjectId(null)
                                setCurrentProjectName("")
                              }
                              setRecentProjects(getRecentProjects())
                            }
                          }}
                          className="shrink-0 p-1.5 rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="프로젝트 삭제"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    ))}
                    {recentProjects.length > 3 && (
                      <button
                        onClick={() => setShowAllProjectsList(prev => !prev)}
                        className="w-full text-center py-1.5 text-xs text-primary hover:underline"
                      >
                        {showAllProjectsList ? '접기' : `전체 ${recentProjects.length}개 보기`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>  )
}
