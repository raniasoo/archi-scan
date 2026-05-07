"use client"

import { useState } from "react"
import { ChevronDown, Clock } from "lucide-react"

interface ProjectRoadmapProps {
  scenarioType?: 'reconstruction' | 'remodeling' | 'bulk-sale' | 'new-construction'
  totalUnits?: number
  isSmallScale?: boolean
}

const ROADMAPS = {
  'new-construction': {
    name: '신축 사업',
    totalDuration: '24~36개월 (착공~준공)',
    steps: [
      { phase: 'STEP 01', title: '사업기획', desc: '대지분석, 법규검토, 사업성 분석', duration: '2~3개월', color: '#3b82f6', flex: 3 },
      { phase: 'STEP 02', title: '인허가', desc: '건축허가, 심의, 인허가 취득', duration: '4~6개월', color: '#8b5cf6', flex: 5 },
      { phase: 'STEP 03', title: '시공', desc: '착공, 골조, 마감, 준공', duration: '18~24개월', color: '#10b981', flex: 21 },
      { phase: 'STEP 04', title: '분양/입주', desc: '분양, 입주자 모집, 입주', duration: '3~6개월', color: '#f59e0b', flex: 5 },
    ],
  },
  reconstruction: {
    name: '소규모재건축',
    totalDuration: '12~18개월 (인허가까지)',
    steps: [
      { phase: 'STEP 01', title: '사전조사', desc: '현황분석, 규제검토', duration: '1~2개월', color: '#3b82f6', flex: 2 },
      { phase: 'STEP 02', title: '사업성 검토', desc: '시나리오 분석, 사업비 시뮬레이션', duration: '2~3개월', color: '#06b6d4', flex: 3 },
      { phase: 'STEP 03', title: '사업방식 결정', desc: '구청 사전협의', duration: '1~2개월', color: '#8b5cf6', flex: 2 },
      { phase: 'STEP 04', title: '주민동의', desc: '설명회, 동의서 징구', duration: '3~4개월', color: '#f59e0b', flex: 4 },
      { phase: 'STEP 05', title: '조합설립', desc: '시공자 선정', duration: '4~6개월', color: '#ef4444', flex: 5 },
      { phase: 'STEP 06', title: '설계·인허가', desc: '사업시행계획', duration: '8~12개월', color: '#10b981', flex: 10 },
    ],
  },
  remodeling: {
    name: '리모델링',
    totalDuration: '8~12개월 (인허가까지)',
    steps: [
      { phase: 'STEP 01', title: '안전진단', desc: '구조검토, 증축 가능성 판단', duration: '2~3개월', color: '#3b82f6', flex: 3 },
      { phase: 'STEP 02', title: '사업성 검토', desc: '증축 규모, 비용 산출', duration: '1~2개월', color: '#06b6d4', flex: 2 },
      { phase: 'STEP 03', title: '주민동의', desc: '2/3 동의 확보', duration: '2~3개월', color: '#f59e0b', flex: 3 },
      { phase: 'STEP 04', title: '허가·착공', desc: '건축허가, 시공', duration: '12~18개월', color: '#10b981', flex: 15 },
    ],
  },
  'bulk-sale': {
    name: '통매각',
    totalDuration: '6~12개월',
    steps: [
      { phase: 'STEP 01', title: '매각 검토', desc: '시세 평가, 매각 조건 설정', duration: '1~2개월', color: '#3b82f6', flex: 2 },
      { phase: 'STEP 02', title: '매수자 모집', desc: '입찰, 협상', duration: '2~3개월', color: '#f59e0b', flex: 3 },
      { phase: 'STEP 03', title: '합의·계약', desc: '전체 소유자 합의, 계약 체결', duration: '3~6개월', color: '#10b981', flex: 5 },
    ],
  },
}

export function ProjectRoadmap({ scenarioType = 'reconstruction', totalUnits, isSmallScale }: ProjectRoadmapProps) {
  const [expanded, setExpanded] = useState(false)
  const roadmap = ROADMAPS[scenarioType]

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <h3 className="text-sm font-bold">프로젝트 로드맵</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">{roadmap.name} · {roadmap.totalDuration}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {/* 타임라인 바 */}
          <div className="flex gap-0.5 h-8 rounded-lg overflow-hidden text-[8px] font-semibold">
            {roadmap.steps.map((step, i) => (
              <div
                key={i}
                className="flex items-center justify-center text-white"
                style={{ flex: step.flex, backgroundColor: step.color }}
              >
                <span className="truncate px-1">{step.title}</span>
              </div>
            ))}
          </div>

          {/* 단계별 상세 */}
          <div className="space-y-2">
            {roadmap.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ backgroundColor: step.color }}
                  >
                    {i + 1}
                  </div>
                  {i < roadmap.steps.length - 1 && (
                    <div className="w-0.5 h-6 bg-border" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{step.title}</span>
                    <span className="text-[10px] text-muted-foreground">{step.duration}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {isSmallScale && scenarioType === 'reconstruction' && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
              <p className="text-[10px] text-emerald-400">
                ✓ 소규모재건축 특례 적용 가능 ({totalUnits || '-'}세대) — 안전진단 면제, 정비구역 지정 생략, 통합심의 절차 단축
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
