"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, ArrowRight, Loader2, Shield } from "lucide-react"

interface VerificationItem {
  id: string
  category: string
  label: string
  status: 'pass' | 'warn' | 'fail' | 'info'
  current: string
  expected?: string
  message: string
  fixable?: boolean
  fixAction?: () => void
}

interface Props {
  address: string
  siteArea: number
  regulation: any
  selectedLayout: any
  analysisRawData: any
  feasibilityResult?: any
  aiRenderImage?: string | null
  aiMultiImages?: any[] | null
  aiInteriorComparison?: any[] | null
  onVerificationComplete: () => void
  onFixValue: (field: string, value: any) => void
}

export function DataVerification({ address, siteArea, regulation, selectedLayout, analysisRawData, feasibilityResult, aiRenderImage, aiMultiImages, aiInteriorComparison, onVerificationComplete, onFixValue }: Props) {
  const [items, setItems] = useState<VerificationItem[]>([])
  const [expanded, setExpanded] = useState(true)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    runVerification()
  }, [])

  const runVerification = () => {
    setChecking(true)
    const results: VerificationItem[] = []
    const raw = analysisRawData || {}

    // ━━━ 1. 대지면적 검증 ━━━
    const apiArea = raw.siteArea || raw._quickArea
    if (apiArea && siteArea) {
      const diff = Math.abs(siteArea - apiArea)
      const pct = (diff / apiArea) * 100
      if (pct > 10) {
        results.push({ id: 'area', category: '대상지', label: '대지면적', status: 'fail', current: `${siteArea.toLocaleString()}㎡`, expected: `${apiArea.toLocaleString()}㎡ (공공데이터)`, message: `입력 면적과 실제 필지 면적이 ${pct.toFixed(1)}% 차이납니다`, fixable: true, fixAction: () => onFixValue('siteArea', apiArea) })
      } else if (pct > 3) {
        results.push({ id: 'area', category: '대상지', label: '대지면적', status: 'warn', current: `${siteArea.toLocaleString()}㎡`, expected: `${apiArea.toLocaleString()}㎡ (공공데이터)`, message: `${diff.toFixed(1)}㎡ 차이 (${pct.toFixed(1)}%)`, fixable: true, fixAction: () => onFixValue('siteArea', apiArea) })
      } else {
        results.push({ id: 'area', category: '대상지', label: '대지면적', status: 'pass', current: `${siteArea.toLocaleString()}㎡`, message: '공공데이터와 일치합니다' })
      }
    } else if (siteArea > 0) {
      results.push({ id: 'area', category: '대상지', label: '대지면적', status: 'info', current: `${siteArea.toLocaleString()}㎡`, message: '공공데이터 없음 — 수동 입력값 사용' })
    }

    // ━━━ 2. 용도지역 검증 ━━━
    const apiZone = raw._quickZoneCode || raw.zoneType
    const apiZoneName = raw.zoneName || raw._quickZoneName
    if (apiZone && regulation?.zoneType) {
      if (apiZone !== regulation.zoneType) {
        results.push({ id: 'zone', category: '대상지', label: '용도지역', status: 'fail', current: regulation.zoneName || regulation.zoneType, expected: `${apiZoneName || apiZone} (공공데이터)`, message: '실제 용도지역과 다릅니다. 건폐율·용적률 한도가 달라질 수 있습니다', fixable: true, fixAction: () => onFixValue('zoneType', apiZone) })
      } else {
        results.push({ id: 'zone', category: '대상지', label: '용도지역', status: 'pass', current: regulation.zoneName || regulation.zoneType, message: '공공데이터와 일치합니다' })
      }
    }

    // ━━━ 3. 건폐율 초과 검증 ━━━
    if (selectedLayout && regulation) {
      const coverage = selectedLayout.coverage || selectedLayout.buildingCoverage || 0
      const maxCoverage = regulation.maxCoverageRatio || 60
      if (coverage > maxCoverage) {
        results.push({ id: 'coverage', category: '법규', label: '건폐율', status: 'fail', current: `${coverage.toFixed(1)}%`, expected: `≤ ${maxCoverage}%`, message: `건폐율 한도 초과 (${(coverage - maxCoverage).toFixed(1)}%p)` })
      } else {
        const margin = maxCoverage - coverage
        results.push({ id: 'coverage', category: '법규', label: '건폐율', status: margin < 3 ? 'warn' : 'pass', current: `${coverage.toFixed(1)}%`, expected: `≤ ${maxCoverage}%`, message: margin < 3 ? `한도 근접 (여유 ${margin.toFixed(1)}%p)` : `적합 (여유 ${margin.toFixed(1)}%p)` })
      }
    }

    // ━━━ 4. 용적률 초과 검증 ━━━
    if (selectedLayout && regulation) {
      const gfaVal = selectedLayout.gfa || 0
      const far = selectedLayout.floorAreaRatio || (gfaVal > 0 && siteArea > 0 ? (gfaVal / siteArea) * 100 : 0)
      const maxFar = regulation.maxFloorAreaRatio || 200
      if (far > maxFar) {
        results.push({ id: 'far', category: '법규', label: '용적률', status: 'fail', current: `${far.toFixed(1)}%`, expected: `≤ ${maxFar}%`, message: `용적률 한도 초과 (${(far - maxFar).toFixed(1)}%p)` })
      } else {
        const margin = maxFar - far
        results.push({ id: 'far', category: '법규', label: '용적률', status: margin < 5 ? 'warn' : 'pass', current: `${far.toFixed(1)}%`, expected: `≤ ${maxFar}%`, message: margin < 5 ? `한도 근접 (여유 ${margin.toFixed(1)}%p)` : `적합 (여유 ${margin.toFixed(1)}%p)` })
      }
    }

    // ━━━ 5. 높이 검증 ━━━
    if (selectedLayout && regulation?.maxHeight) {
      const buildingHeight = (selectedLayout.floors || 1) * 3.3
      const maxH = regulation.maxHeight
      if (buildingHeight > maxH) {
        results.push({ id: 'height', category: '법규', label: '높이제한', status: 'fail', current: `${selectedLayout.floors}층 (약 ${buildingHeight.toFixed(1)}m)`, expected: `≤ ${maxH}m (약 ${Math.floor(maxH / 3.3)}층)`, message: `높이 한도 초과` })
      } else {
        results.push({ id: 'height', category: '법규', label: '높이제한', status: 'pass', current: `${selectedLayout.floors}층 (약 ${buildingHeight.toFixed(1)}m)`, expected: `≤ ${maxH}m`, message: '적합' })
      }
    }

    // ━━━ 6. 주차 기준 검증 ━━━
    if (selectedLayout) {
      const units = selectedLayout.units || 0
      const parking = selectedLayout.parking || 0
      const required = Math.ceil(units * (regulation?.parkingRatio || 1.0))
      if (parking < required) {
        results.push({ id: 'parking', category: '법규', label: '주차대수', status: 'warn', current: `${parking}대`, expected: `≥ ${required}대 (${units}세대 × ${regulation?.parkingRatio || 1.0})`, message: `${required - parking}대 부족` })
      } else {
        results.push({ id: 'parking', category: '법규', label: '주차대수', status: 'pass', current: `${parking}대`, expected: `≥ ${required}대`, message: '기준 충족' })
      }
    }

    // ━━━ 7. 사업성 경고 ━━━
    if (selectedLayout?.roi !== undefined) {
      const roi = selectedLayout.roi
      if (roi < -10) {
        results.push({ id: 'roi', category: '사업성', label: 'ROI', status: 'fail', current: `${roi.toFixed(1)}%`, message: '심각한 적자 — 사업 재검토가 필요합니다' })
      } else if (roi < 0) {
        results.push({ id: 'roi', category: '사업성', label: 'ROI', status: 'warn', current: `${roi.toFixed(1)}%`, message: '손실 예상 — 비용 구조를 재확인하세요' })
      } else if (roi < 5) {
        results.push({ id: 'roi', category: '사업성', label: 'ROI', status: 'warn', current: `${roi.toFixed(1)}%`, message: '수익률이 낮습니다 — 리스크 대비 검토 필요' })
      } else {
        results.push({ id: 'roi', category: '사업성', label: 'ROI', status: 'pass', current: `${roi.toFixed(1)}%`, message: roi >= 15 ? '양호한 수익률' : '보통 수준' })
      }
    }

    // ━━━ 8. 수치 정합성 — 건폐율 계산값 vs 표시값 ━━━
    if (selectedLayout && siteArea > 0) {
      const displayCoverage = selectedLayout.coverage || selectedLayout.buildingCoverage || 0
      const buildingArea = selectedLayout.buildingArea || (siteArea * displayCoverage / 100)
      const calcCoverage = buildingArea > 0 ? (buildingArea / siteArea) * 100 : displayCoverage
      if (buildingArea > 0 && Math.abs(calcCoverage - displayCoverage) > 1) {
        results.push({ id: 'calc-coverage', category: '정합성', label: '건폐율 계산', status: 'warn', current: `표시: ${displayCoverage.toFixed(1)}%`, expected: `계산: ${calcCoverage.toFixed(1)}% (건축면적 ${buildingArea.toFixed(0)}㎡ ÷ 대지 ${siteArea}㎡)`, message: '표시값과 계산값이 다릅니다' })
      } else {
        results.push({ id: 'calc-coverage', category: '정합성', label: '건폐율 계산', status: 'pass', current: `${displayCoverage.toFixed(1)}%`, message: '계산값과 표시값 일치' })
      }

      // 용적률 정합성
      const gfa = selectedLayout.gfa || 0
      const displayFar = selectedLayout.floorAreaRatio || (gfa > 0 && siteArea > 0 ? (gfa / siteArea) * 100 : 0)
      if (gfa > 0) {
        const calcFar = (gfa / siteArea) * 100
        if (Math.abs(calcFar - displayFar) > 2) {
          results.push({ id: 'calc-far', category: '정합성', label: '용적률 계산', status: 'warn', current: `표시: ${displayFar.toFixed(1)}%`, expected: `계산: ${calcFar.toFixed(1)}% (연면적 ${gfa.toFixed(0)}㎡ ÷ 대지 ${siteArea}㎡)`, message: '표시값과 계산값이 다릅니다' })
        } else {
          results.push({ id: 'calc-far', category: '정합성', label: '용적률 계산', status: 'pass', current: `${displayFar.toFixed(1)}%`, message: '계산값과 표시값 일치' })
        }
      }
    }

    // ━━━ 9. 손익분기 분양률 ━━━
    const breakEven = feasibilityResult?.breakEvenRate || selectedLayout?.breakEvenRate
    if (breakEven !== undefined) {
      if (breakEven > 100) {
        results.push({ id: 'breakeven', category: '사업성', label: '손익분기 분양률', status: 'fail', current: `${breakEven.toFixed(1)}%`, message: '100% 초과 — 전 세대 분양해도 손실 발생' })
      } else if (breakEven > 85) {
        results.push({ id: 'breakeven', category: '사업성', label: '손익분기 분양률', status: 'warn', current: `${breakEven.toFixed(1)}%`, message: '분양률 여유가 적습니다 — 미분양 리스크 주의' })
      } else {
        results.push({ id: 'breakeven', category: '사업성', label: '손익분기 분양률', status: 'pass', current: `${breakEven.toFixed(1)}%`, message: breakEven < 70 ? '안정적 수준' : '보통 수준' })
      }
    }

    // ━━━ 10. 필수 입력 누락 ━━━
    if (!address || address.trim().length < 5) {
      results.push({ id: 'addr', category: '입력', label: '주소', status: 'fail', current: address || '(없음)', message: '주소가 입력되지 않았습니다' })
    } else {
      results.push({ id: 'addr', category: '입력', label: '주소', status: 'pass', current: address, message: '입력 완료' })
    }
    if (!siteArea || siteArea <= 0) {
      results.push({ id: 'area-input', category: '입력', label: '대지면적', status: 'fail', current: `${siteArea || 0}㎡`, message: '대지면적이 0입니다' })
    }
    if (!selectedLayout?.floors || selectedLayout.floors <= 0) {
      results.push({ id: 'floors-input', category: '입력', label: '층수', status: 'fail', current: `${selectedLayout?.floors || 0}층`, message: '층수가 설정되지 않았습니다' })
    }
    if (!selectedLayout?.units || selectedLayout.units <= 0) {
      results.push({ id: 'units-input', category: '입력', label: '세대수', status: 'fail', current: `${selectedLayout?.units || 0}세대`, message: '세대수가 설정되지 않았습니다' })
    }

    // ━━━ 11. 이미지 생성 여부 ━━━
    const renderCount = (aiMultiImages?.filter(i => i?.image)?.length || 0) + ((!aiMultiImages && aiRenderImage) ? 1 : 0)
    if (renderCount >= 4) {
      results.push({ id: 'render', category: '이미지', label: 'AI 렌더링', status: 'pass', current: `${renderCount}장 생성`, message: '멀티앵글 완료' })
    } else if (renderCount > 0) {
      results.push({ id: 'render', category: '이미지', label: 'AI 렌더링', status: 'info', current: `${renderCount}장 생성`, message: '멀티앵글(4장)을 추천합니다' })
    } else {
      results.push({ id: 'render', category: '이미지', label: 'AI 렌더링', status: 'warn', current: '미생성', message: 'AI 렌더링 없이 보고서가 생성됩니다' })
    }

    // 인테리어 비교
    const intCount = aiInteriorComparison?.length || 0
    if (intCount > 0) {
      results.push({ id: 'interior', category: '이미지', label: '인테리어 비교', status: 'pass', current: `${intCount}안 생성`, message: '보고서에 포함됩니다' })
    }

    setItems(results)
    setChecking(false)
  }

  const passCount = items.filter(i => i.status === 'pass').length
  const warnCount = items.filter(i => i.status === 'warn').length
  const failCount = items.filter(i => i.status === 'fail').length
  const totalCount = items.length

  const overallStatus = failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass'

  const statusIcon = (s: string) => {
    if (s === 'pass') return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
    if (s === 'warn') return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
    if (s === 'fail') return <XCircle className="h-4 w-4 text-red-400 shrink-0" />
    return <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0" />
  }

  const categories = [...new Set(items.map(i => i.category))]

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className={`rounded-xl p-4 border ${overallStatus === 'pass' ? 'bg-emerald-500/10 border-emerald-500/20' : overallStatus === 'warn' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {checking ? (
              <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
            ) : (
              <Shield className={`h-6 w-6 ${overallStatus === 'pass' ? 'text-emerald-400' : overallStatus === 'warn' ? 'text-amber-400' : 'text-red-400'}`} />
            )}
            <div>
              <h3 className="font-bold text-sm">
                {checking ? '데이터 검증 중...' : overallStatus === 'pass' ? '✅ 검증 완료 — 모든 항목 정상' : overallStatus === 'warn' ? `⚠️ 검증 완료 — ${warnCount}건 주의` : `❌ 검증 완료 — ${failCount}건 오류 발견`}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {!checking && `${passCount}건 통과 · ${warnCount}건 주의 · ${failCount}건 오류 / 총 ${totalCount}건`}
              </p>
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-white/10">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 상세 항목 */}
      {expanded && !checking && (
        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat}>
              <p className="text-[10px] text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">{cat}</p>
              <div className="space-y-1">
                {items.filter(i => i.category === cat).map(item => (
                  <div key={item.id} className={`rounded-lg p-3 border ${item.status === 'fail' ? 'bg-red-500/5 border-red-500/20' : item.status === 'warn' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-card/30 border-border/50'}`}>
                    <div className="flex items-start gap-2.5">
                      {statusIcon(item.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{item.label}</span>
                          <span className="text-xs text-muted-foreground">{item.current}</span>
                          {item.expected && <span className="text-[10px] text-muted-foreground">→ {item.expected}</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.message}</p>
                      </div>
                      {item.fixable && item.fixAction && (
                        <button onClick={item.fixAction} className="shrink-0 text-[10px] px-2 py-1 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:bg-teal-500/30">
                          자동 수정
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 보고서 생성 버튼 */}
      {!checking && (
        <button
          onClick={onVerificationComplete}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            failCount > 0
              ? 'bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30'
              : 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-400 hover:to-emerald-400 shadow-lg shadow-teal-500/25'
          }`}
        >
          {failCount > 0 ? `⚠️ ${failCount}건 오류가 있지만 보고서 생성` : '✅ 검증 완료 — 보고서 생성'}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
