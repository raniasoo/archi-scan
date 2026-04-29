"use client"

import { useMemo } from "react"
import { calculateRegulations, ZoneCode, ZONE_LABELS } from "@/lib/regulation-calculator"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CheckCircle2, AlertTriangle, XCircle,
  Building2, Car, Leaf, Ruler, TrendingUp, FileText
} from "lucide-react"

interface LegalReviewPanelProps {
  zoneCode: string
  siteArea: number
  roadWidth: number
  heightLimit: number
  hasDistrictPlan: boolean
}

function StatusIcon({ status }: { status: 'ok' | 'warning' | 'violation' }) {
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
  if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
  return <XCircle className="h-4 w-4 text-red-500 shrink-0" />
}

function StatusBadge({ status }: { status: 'ok' | 'warning' | 'violation' }) {
  if (status === 'ok') return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">적합</Badge>
  if (status === 'warning') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">확인필요</Badge>
  return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">위반</Badge>
}

export function LegalReviewPanel({
  zoneCode, siteArea, roadWidth, heightLimit, hasDistrictPlan
}: LegalReviewPanelProps) {

  const result = useMemo(() => {
    // zoneCode 매핑 (기존 앱의 코드 → 새 계산기 코드)
    const codeMap: Record<string, ZoneCode> = {
      'residential-exclusive-1': 'residential-exclusive-1',
      'residential-exclusive-2': 'residential-exclusive-2',
      'residential-1': 'residential-1',
      'residential-2': 'residential-2',
      'residential-3': 'residential-3',
      'semi-residential': 'semi-residential',
      'commercial-neighborhood': 'commercial-neighborhood',
      'commercial-general': 'commercial-general',
      'commercial-central': 'commercial-central',
      'industrial-general': 'industrial-general',
      'green-natural': 'green-natural',
      'green-production': 'green-production',
      'management-planned': 'management-planned',
    }
    const mappedZone = codeMap[zoneCode] || 'residential-2'

    return calculateRegulations({
      zoneCode: mappedZone,
      siteArea,
      roadWidth: roadWidth || 8,
      heightLimit: heightLimit || 30,
      hasDistrictPlan,
    })
  }, [zoneCode, siteArea, roadWidth, heightLimit, hasDistrictPlan])

  const violationCount = result.compliance.filter(c => c.status === 'violation').length
  const warningCount = result.compliance.filter(c => c.status === 'warning').length

  return (
    <div className="space-y-4">

      {/* 헤더 요약 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{ZONE_LABELS[zoneCode as ZoneCode] || zoneCode}</p>
          <p className="text-xs text-muted-foreground">{result.legal.source}</p>
        </div>
        <div className="flex gap-2">
          {violationCount > 0 && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              위반 {violationCount}건
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              확인필요 {warningCount}건
            </Badge>
          )}
          {violationCount === 0 && warningCount === 0 && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              문제없음
            </Badge>
          )}
        </div>
      </div>

      {/* 1. 법정 건폐율/용적률 */}
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            법정 건폐율 · 용적률 한도
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-background/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">최대 건폐율</p>
            <p className="text-xl font-bold text-primary">{result.legal.maxCoverageRatio}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              건축면적 최대 {result.envelope.maxBuildingFootprint.toLocaleString()}㎡
            </p>
          </div>
          <div className="rounded-lg bg-background/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">최대 용적률</p>
            <p className="text-xl font-bold text-primary">{result.legal.maxFloorAreaRatio}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              연면적 최대 {result.envelope.maxGrossFloorArea.toLocaleString()}㎡
            </p>
          </div>
          <div className="rounded-lg bg-background/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">최대 층수</p>
            <p className="text-xl font-bold">{result.envelope.maxFloors}층</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              권장 {result.envelope.recommendedFloors}층
            </p>
          </div>
          <div className="rounded-lg bg-background/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">유효 대지면적</p>
            <p className="text-xl font-bold">{result.envelope.effectiveSiteArea.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">㎡ (이격거리 제외)</p>
          </div>
        </CardContent>
      </Card>

      {/* 2. 이격거리 */}
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs flex items-center gap-2">
            <Ruler className="h-3.5 w-3.5 text-primary" />
            이격거리 기준
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: '전면', value: result.setback.front },
              { label: '측면', value: result.setback.side },
              { label: '후면', value: result.setback.rear },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-background/50 p-2">
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="font-bold text-sm">{s.value}m</p>
              </div>
            ))}
          </div>
          {result.setback.roadSetback > 0 && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-400">
              ⚠️ 건축선 후퇴 {result.setback.roadSetback}m 필요 (도로폭 4m 미달)
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {result.setback.northSetbackApplied && (
              <Badge variant="outline" className="text-[10px]">북측사선 적용</Badge>
            )}
            {result.setback.roadSetbackApplied && (
              <Badge variant="outline" className="text-[10px]">도로사선 적용</Badge>
            )}
            {hasDistrictPlan && (
              <Badge variant="outline" className="text-[10px]">지구단위계획 적용</Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">{result.setback.basis}</p>
        </CardContent>
      </Card>

      {/* 3. 주차 + 조경 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs flex items-center gap-2">
              <Car className="h-3.5 w-3.5 text-primary" />
              법정 주차
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{result.parking.estimatedRequired}</p>
              <p className="text-[10px] text-muted-foreground">필요 대수</p>
            </div>
            <div className="text-[10px] text-muted-foreground space-y-1">
              <p>지하 {result.parking.undergroundFloorsNeeded}개층 필요</p>
              <p className="text-[9px] leading-tight">{result.parking.standard}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs flex items-center gap-2">
              <Leaf className="h-3.5 w-3.5 text-emerald-500" />
              법정 조경
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {result.landscaping.required ? (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-500">{result.landscaping.minArea}</p>
                  <p className="text-[10px] text-muted-foreground">최소 ㎡</p>
                </div>
                <div className="text-[10px] text-muted-foreground space-y-1">
                  <p>대지의 {result.landscaping.minRatio}% 이상</p>
                  <p className="text-[9px] leading-tight">{result.landscaping.basis}</p>
                </div>
              </>
            ) : (
              <div className="text-center pt-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">조경 불필요</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. 법규 준수 체크리스트 */}
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-primary" />
            법규 준수 검토 체크리스트
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          {result.compliance.map((check, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusIcon status={check.status} />
                  <span className="text-xs font-medium">{check.item}</span>
                </div>
                <StatusBadge status={check.status} />
              </div>
              <p className="text-[10px] text-muted-foreground ml-6">{check.detail}</p>
              {check.recommendation && (
                <p className="text-[10px] text-amber-400 ml-6">→ {check.recommendation}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 5. 일조권 사선제한 분석 (건축법 제61조) */}
      {result.setback.sunlight && (
        <Card className={`border-${result.setback.sunlight.isConstraining ? 'amber-500/30 bg-amber-500/5' : 'emerald-500/20 bg-emerald-500/5'}`}>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={result.setback.sunlight.isConstraining ? "text-amber-500" : "text-emerald-500"}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              일조권 사선제한 분석
              <Badge className={`${result.setback.sunlight.isConstraining ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'} text-[10px]`}>
                {result.setback.sunlight.isConstraining ? '높이 제약' : '영향 미미'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            {/* 정북사선 */}
            {result.setback.northSetbackApplied && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-amber-400">정북방향 높이제한 (건축법 제61조 ①)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-background/50 p-2 text-center">
                    <p className="text-[9px] text-muted-foreground">9m 이하 이격</p>
                    <p className="font-bold text-sm">{result.setback.sunlight.effectiveNorthSetback}m</p>
                    <p className="text-[9px] text-muted-foreground">경계선에서</p>
                  </div>
                  <div className="rounded-lg bg-background/50 p-2 text-center">
                    <p className="text-[9px] text-muted-foreground">북측 최대높이</p>
                    <p className="font-bold text-sm">{result.setback.sunlight.maxHeightAtNorth}m</p>
                    <p className="text-[9px] text-muted-foreground">
                      ≒ {result.setback.sunlight.effectiveMaxFloors}층
                    </p>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground italic">
                  ※ 9m 초과 시 높이의 1/2 이상 인접대지 경계에서 이격 필요
                </p>
              </div>
            )}

            {/* 도로사선 */}
            {result.setback.sunlight.roadSlopeRatio > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-blue-400">도로사선 제한 (건축법 제61조 ②)</p>
                <div className="rounded-lg bg-background/50 p-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">사선 비율</span>
                    <span className="text-xs font-semibold">1 : {result.setback.sunlight.roadSlopeRatio}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-muted-foreground">도로사선 최대높이</span>
                    <span className="text-xs font-semibold">{result.setback.sunlight.maxHeightByRoad}m</span>
                  </div>
                </div>
              </div>
            )}

            {/* 상층부 영향 */}
            {result.setback.sunlight.upperFloorReduction > 0 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2">
                <p className="text-[10px] text-amber-400 font-medium">상층부 면적 감소</p>
                <p className="text-xs mt-0.5">
                  {result.setback.sunlight.reducedFloorStart}층부터 북측 면적 약 {result.setback.sunlight.upperFloorReduction}% 감소
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  사선 반영 실효 연면적: {result.setback.sunlight.effectiveGFA.toLocaleString()}㎡
                </p>
              </div>
            )}

            {/* 법적 근거 */}
            <p className="text-[9px] text-muted-foreground">
              {result.setback.sunlight.legalBasis}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 6. 사업성 요약 */}
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            법규 기반 사업성 요약
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-background/50 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">최대 세대수</p>
              <p className="font-bold text-base">{result.summary.maxUnits}세대</p>
              <p className="text-[9px] text-muted-foreground">전용 85㎡ 기준</p>
            </div>
            <div className="rounded-lg bg-background/50 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">손익분기 층수</p>
              <p className="font-bold text-base">{result.summary.breakEvenFloors}층 이상</p>
              <p className="text-[9px] text-muted-foreground">단순 추정값</p>
            </div>
          </div>
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2">
            <p className="text-[10px] text-emerald-400 font-medium">권장 용도</p>
            <p className="text-xs mt-0.5">{result.summary.recommendedUseType}</p>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
