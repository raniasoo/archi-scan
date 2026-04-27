"use client"
// @version STABLE-v215 | Critical: Supplement data syncs to parent regulation state

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Maximize, Loader2, Search, CheckCircle2, AlertCircle, Building2, Edit3, RotateCcw, RefreshCw, ArrowRight } from "lucide-react"
import type { MolitSiteData, MolitLookupResponse, MolitDiagnostics } from "@/types/molit"
import { 
  type AutoLookupStatus, 
  AUTO_LOOKUP_MESSAGES, 
  AUTO_LOOKUP_LABELS,
  shouldShowFallback,
  isFailureStatus
} from "@/types/auto-lookup"
import { AutoLookupStatusCard, AutoLookupChecklist } from "@/components/auto-lookup-status"
import { ManualSupplementForm, SupplementSummary, type SupplementData } from "@/components/manual-supplement-form"

/** Resolved JUSO metadata for manual retry */
interface ResolvedJusoData {
  roadAddr: string
  jibunAddr: string
  bdMgtSn: string
  sigunguCd: string
  bjdongCd: string
  bun: string
  ji: string
  entX?: number
  entY?: number
}

/** Manual parcel input for retry - v3 with rawMode and platGbCd support */
interface ManualParcelInput {
  sigunguCd: string
  bjdongCd: string
  bun: string
  ji: string
  /** If true, send raw bun/ji without zero-padding */
  rawMode?: boolean
  /** platGbCd: '0'=대지, '1'=산, ''=생략 */
  platGbCd?: string
}

interface SiteInputFormProps {
  address: string
  siteArea: string
  onAddressChange: (value: string) => void
  onSiteAreaChange: (value: string) => void
  onGenerate: () => void
  isGenerating: boolean
  buttonText?: string
  onMolitDataFetched?: (data: MolitSiteData) => void
  onSupplementDataChange?: (data: SupplementData) => void
  // zone-lookup 완료 후 page.tsx가 밀어주는 보완 데이터
  externalSupplement?: {
    zoneCode?: string
    roadWidth?: number
    heightLimit?: number
    hasDistrictPlan?: boolean
  } | null
}

export function SiteInputForm({
  address,
  siteArea,
  onAddressChange,
  onSiteAreaChange,
  onGenerate,
  isGenerating,
  buttonText = "배치안 생성하기",
  onMolitDataFetched,
  onSupplementDataChange,
  externalSupplement,
}: SiteInputFormProps) {
  const [lookupState, setLookupState] = useState<AutoLookupStatus>('idle')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [fetchedData, setFetchedData] = useState<MolitSiteData | null>(null)
  const [isDemo, setIsDemo] = useState<boolean>(false)
  const [diagnostics, setDiagnostics] = useState<MolitDiagnostics | null>(null)
  
  // Resolved JUSO data for display and manual retry
  const [resolvedJuso, setResolvedJuso] = useState<ResolvedJusoData | null>(null)
  
  // 직접 zone-lookup 결과 (success-empty 시 내부에서 자동 조회)
  const [autoZoneCode, setAutoZoneCode] = useState<string | null>(null)
  const [autoRoadCondition, setAutoRoadCondition] = useState<string | null>(null)
  
  // Manual parcel input mode
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualParcel, setManualParcel] = useState<ManualParcelInput>({
    sigunguCd: '',
    bjdongCd: '',
    bun: '',
    ji: '',
  })
  
  const [isRetrying, setIsRetrying] = useState(false)
  const [requestId, setRequestId] = useState(0)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [lastRetryParams, setLastRetryParams] = useState<{ bun: string; ji: string } | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  // Manual supplement form state
  const [showSupplementForm, setShowSupplementForm] = useState(false)
  const [supplementData, setSupplementData] = useState<SupplementData | null>(null)
  const [isSavingSupplement, setIsSavingSupplement] = useState(false)

  // address stale closure 방지용 ref
  const addressRef = useRef(address)
  useEffect(() => { addressRef.current = address }, [address])

  // zone-lookup 완료 후 외부에서 밀어준 데이터로 보완 입력 자동 완성
  useEffect(() => {
    if (!externalSupplement?.zoneCode) return
    const rw = externalSupplement.roadWidth ?? 8
    const roadCondition = rw >= 12 ? '12m-plus' :
                          rw >= 8  ? '8m-plus' :
                          rw >= 6  ? '6m-plus' :
                          rw >= 4  ? '4m-plus' : 'under-4m'
    setSupplementData(prev => {
      const autoData: SupplementData = {
        // zoneType은 항상 업데이트
        zoneType: externalSupplement.zoneCode!,
        // roadCondition: 이미 사용자가 저장한 값이 있으면 유지, 없으면 새로 설정
        roadCondition: prev?.roadCondition || roadCondition,
        // heightLimit: externalSupplement에서 새 값이 오면 항상 업데이트 (이전값 유지 X)
        heightLimit: externalSupplement.heightLimit ?? null,
        hasDistrictPlan: externalSupplement.hasDistrictPlan ?? prev?.hasDistrictPlan ?? false,
        districtPlanNotes: prev?.districtPlanNotes || '',
        additionalNotes: prev?.additionalNotes || '',
      }
      if (onSupplementDataChange) onSupplementDataChange(autoData)
      return autoData
    })
    // zone-lookup 결과가 있으면 form을 열지만, 없으면 zone-lookup 완료 후에 열림
    // (zone-lookup 완료 후 setShowSupplementForm(true) 호출됨)
    if (externalSupplement?.zoneCode) {
      setShowSupplementForm(true)
    }
  }, [externalSupplement?.zoneCode, externalSupplement?.roadWidth, externalSupplement?.heightLimit, (externalSupplement as any)?._key])

  // MOLIT 성공 여부와 관계없이 항상 vworld-zone(LURIS+Vworld)으로 정확한 용도지역 조회
  useEffect(() => {
    const needsZoneLookup = 
      (lookupState === 'success-empty' && !!resolvedJuso?.sigunguCd) ||
      (lookupState === 'success' && !!resolvedJuso?.sigunguCd)
    if (!needsZoneLookup) return
    if (autoZoneCode) return  // 이미 조회됨

    const { sigunguCd, bjdongCd, bun, ji, roadAddr } = resolvedJuso
    console.log('[site-input] success-empty zone-lookup 직접 호출:', { sigunguCd, bjdongCd, bun, ji })

    // 접도현황 즉시 계산 (도로명 부분만 사용 - "종로구"의 "로" 오매칭 방지)
    const addr = roadAddr || address || ''
    const roadName = addr.replace(/.*[구군시]\s*/,'')
    const rw = roadName.includes('대로') ? 25 : roadName.includes('길') ? 4 : roadName.includes('로') ? 12 : 8
    const rc = rw >= 12 ? '12m-plus' : rw >= 8 ? '8m-plus' : rw >= 6 ? '6m-plus' : rw >= 4 ? '4m-plus' : 'under-4m'
    setAutoRoadCondition(rc)

    // zone-lookup API 직접 호출 (entX/entY 좌표도 함께 전달)
    fetch('/api/vworld-zone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sigunguCd, bjdongCd, bun, ji }),
    })
      .then(r => r.json())
      .then(res => {
        const zone = res.zoneCode || ''
        const hl = typeof res.heightLimit === 'number' ? res.heightLimit : null
        const cr = typeof res.coverageRatio === 'number' ? res.coverageRatio : null
        const far = typeof res.floorAreaRatio === 'number' ? res.floorAreaRatio : null
        console.log('[site-input] zone-lookup 결과:', zone, '높이:', hl, 'siteArea:', res.siteArea, 'source:', res.source)
        // 대지면적 자동입력 (zone-lookup에서 반환 시)
        if (res.siteArea && res.siteArea > 0 && onSiteAreaChange) {
          const currentArea = siteArea?.trim()
          if (!currentArea || currentArea === '' || Number(currentArea) === 0) {
            onSiteAreaChange(String(Math.round(res.siteArea)))
          }
        }
        // siteArea 없으면 /api/vworld로 지적도 면적 자동 조회
        if ((!res.siteArea || res.siteArea === 0) && resolvedJuso && onSiteAreaChange) {
          const addr = resolvedJuso.roadAddr || address || ''
          fetch('/api/vworld', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: addr, siteArea: 0, entX: resolvedJuso.entX, entY: resolvedJuso.entY }),
          }).then(r => r.json()).then(vd => {
            if (vd.parcel?.area && vd.parcel.area > 0 && onSiteAreaChange) {
              const cur = siteArea?.trim()
              if (!cur || cur === '' || Number(cur) === 0) {
                onSiteAreaChange(String(Math.round(vd.parcel.area)))
                console.log('[site-input] /api/vworld 면적 자동입력:', vd.parcel.area)
              }
            }
          }).catch(() => {})
        }
        if (zone) {
          setAutoZoneCode(zone)
          // supplementData 직접 업데이트 (높이제한 포함) + form 자동 오픈
          setSupplementData(prev => ({
            zoneType: zone,
            roadCondition: prev?.roadCondition || rc,
            heightLimit: hl,
            hasDistrictPlan: prev?.hasDistrictPlan ?? false,
            districtPlanNotes: prev?.districtPlanNotes || '',
            additionalNotes: prev?.additionalNotes || '',
          }))
          // supplementData 업데이트 후 React commit 완료 기다렸다가 form 오픈
          setTimeout(() => setShowSupplementForm(true), 50)
          // page.tsx에도 전달 (규제 분석용) - zone 정보 포함
          if (onMolitDataFetched) {
            onMolitDataFetched({
              sigunguCd: resolvedJuso?.sigunguCd,
              bjdongCd: resolvedJuso?.bjdongCd,
              bun: resolvedJuso?.bun,
              ji: resolvedJuso?.ji,
              buildingCoverage: cr ?? undefined,
              floorAreaRatio: far ?? undefined,
              bdMgtSn: resolvedJuso?.bdMgtSn,
              roadAddress: resolvedJuso?.roadAddr || address,
              // vworld-zone 결과를 직접 전달 (page.tsx에서 재조회 안 함)
              _vworldZoneCode: zone,
              _vworldHeightLimit: hl,
              _vworldHasDistrict: res.hasDistrictPlan || false,
            } as any)
          }
        }
      })
      .catch(e => console.warn('[site-input] zone-lookup 실패:', e))
  }, [lookupState, resolvedJuso?.sigunguCd, autoZoneCode, fetchedData?.zoneType])


  const [envStatus, setEnvStatus] = useState<{
    molit: { configured: boolean; keyPreview: string | null; status: string }
    juso: { configured: boolean; keyPreview: string | null; status: string }
    loaded: boolean
  }>({
    molit: { configured: false, keyPreview: null, status: 'loading' },
    juso: { configured: false, keyPreview: null, status: 'loading' },
    loaded: false,
  })
  
  // Fetch env status on mount
  useEffect(() => {
    fetch('/api/molit/env-status')
      .then(res => res.json())
      .then(data => {
        setEnvStatus({
          molit: data.molit || { configured: false, keyPreview: null, status: 'ENV_MISSING' },
          juso: data.juso || { configured: false, keyPreview: null, status: 'ENV_MISSING' },
          loaded: true,
        })
      })
      .catch(() => {
        setEnvStatus(prev => ({ ...prev, loaded: true }))
      })
  }, [])
  
  const canGenerate = address.trim() !== "" && siteArea.trim() !== "" && !isGenerating
  
  // More strict validation for lookup: require complete address
  const addressTrimmed = address.trim()
  const hasMinLength = addressTrimmed.length >= 10
  const hasNumber = /\d+/.test(addressTrimmed)
  const canLookup = hasMinLength && hasNumber && lookupState !== 'loading'

  // Auto-filled items based on fetched data
  const autoFilledItems = fetchedData ? [
    '대상지 주소',
    fetchedData.siteArea ? '대지면적' : '',
    fetchedData.buildingName ? '건물명' : '',
    fetchedData.mainPurpose ? '주용도' : '',
    fetchedData.groundFloors ? '층수' : '',
    fetchedData.zoneType ? '용도지역' : '',
    fetchedData.zoneType ? '높이 제한' : '',
    (fetchedData.roadAddress || fetchedData.address) ? '접도 현황' : '',
    (fetchedData as any)?.area?.includes('지구단위') || (fetchedData as any)?.district?.includes('지구단위') ? '지구단위계획' : '',
  ].filter(Boolean) : []

  // 모든 항목이 자동입력되면 직접 확인 필요 없음
  const manualCheckItems: string[] = []

  /**
   * Handle supplement form save
   * CRITICAL: Must sync to parent state for downstream components to receive updated values
   */
  const handleSupplementSave = (data: SupplementData) => {
    setIsSavingSupplement(true)
    // Simulate save delay for better UX
    setTimeout(() => {
      setSupplementData(data)
      setIsSavingSupplement(false)
      setShowSupplementForm(false)
      
      // CRITICAL: Sync supplement data to parent for regulation/report/feasibility use
      if (onSupplementDataChange) {
        onSupplementDataChange(data)
        console.log('[v0] Supplement data synced to parent:', data)
      }
      console.log('[v0] Supplement data saved locally:', data)
    }, 500)
  }

  /**
   * Handle supplement form skip
   */
  const handleSupplementSkip = () => {
    setShowSupplementForm(false)
    // Allow proceed without all fields filled
  }

  /**
   * Fetch site data from MOLIT API
   */
  const handleMolitLookup = async (overrideParcel?: ManualParcelInput) => {
    console.log('[v0] ===== handleMolitLookup START =====')
    console.log('[v0] overrideParcel:', JSON.stringify(overrideParcel))
    console.log('[v0] canLookup:', canLookup)
    console.log('[v0] address:', address)
    
    if (!canLookup && !overrideParcel) {
      console.log('[v0] SKIPPING - no canLookup and no overrideParcel')
      return
    }
    
    const isRetry = !!overrideParcel
    console.log('[v0] isRetry:', isRetry)
    
    // 재조회 시 이전 supplement 데이터 리셋 (잘못된 값 복원 방지)
    if (!isRetry) {
      setSupplementData(null)
      setAutoZoneCode(null)
      setAutoRoadCondition(null)
      // 이전 대지면적 초기화 (다른 주소 조회 시 잔류값 방지)
      onSiteAreaChange('')
    }

    setRequestId(prev => prev + 1)
    setDiagnostics(null)
    
    if (isRetry) {
      setIsRetrying(true)
    } else {
      setLookupState('loading')
      setFetchedData(null)
      setIsDemo(false)
    }
    setLookupError(null)
    
    try {
      const requestBody: Record<string, unknown> = { address: address.trim() }
      
      // If manual parcel override provided, include it
      if (overrideParcel) {
        requestBody.manualParcel = {
          sigunguCd: overrideParcel.sigunguCd,
          bjdongCd: overrideParcel.bjdongCd,
          bun: overrideParcel.bun,
          ji: overrideParcel.ji,
          rawMode: overrideParcel.rawMode || false,
          platGbCd: overrideParcel.platGbCd,
        }
        console.log('[v0] manualParcel added:', JSON.stringify(requestBody.manualParcel))
      }
      
      console.log('[v0] FULL request body:', JSON.stringify(requestBody))
      
      const response = await fetch('/api/molit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      
      const responseText = await response.text()
      const httpStatus = response.status
      
      console.log('[v0] API Response - HTTP Status:', httpStatus)
      console.log('[v0] API Response - Body (first 500):', responseText.substring(0, 500))
      
      let result: MolitLookupResponse
      try {
        result = JSON.parse(responseText)
        // Inject client-side HTTP status into diagnostics for display
        if (!result.diagnostics) {
          result.diagnostics = { lookupPath: 'none' } as unknown as MolitDiagnostics
        }
        // client http status tracked separately
      } catch (parseError) {
        setLookupState('parse-error')
        setLookupError(AUTO_LOOKUP_MESSAGES['parse-error'])
        // Set minimal diagnostics for parse error
        setDiagnostics({
          lookupPath: 'none',
        } as unknown as MolitDiagnostics)
        console.log(`[MOLIT] classifiedAs=parse-error httpStatus=${httpStatus}`)
        return
      }
      
      // Store diagnostics
      if (result.diagnostics) {
        setDiagnostics(result.diagnostics)
        
        // Only update resolvedJuso if this is NOT a manual override retry
        // (we want to keep the original JUSO data for reference)
        const isManualOverride = result.diagnostics.lookupPath === 'manual-override'
        
        // Extract and store resolved JUSO data (only on first lookup, not retries)
        if (result.diagnostics.jusoResult?.success && !isManualOverride) {
          const juso = result.diagnostics.jusoResult
          const codes = juso.extractedCodes || result.diagnostics.molitEndpoints?.sentValues
          
          if (codes) {
            const resolvedData: ResolvedJusoData = {
              roadAddr: juso.rawResponse?.roadAddr || '',
              jibunAddr: juso.jibunAddr || '',
              bdMgtSn: juso.bdMgtSn || '',
              sigunguCd: codes.sigunguCd,
              bjdongCd: codes.bjdongCd,
              bun: codes.bun,
              ji: codes.ji,
              entX: (juso as any).entX,
              entY: (juso as any).entY,
            }
            setResolvedJuso(resolvedData)
            
            // Only prefill manual parcel on initial lookup, not retries
            setManualParcel({
              sigunguCd: codes.sigunguCd,
              bjdongCd: codes.bjdongCd,
              bun: codes.bun,
              ji: codes.ji,
            })
          }
        }
      }
      
      // Track if this is demo data
      if (result.isDemo) {
        setIsDemo(true)
      }
      
      // Also extract parcel data from local-parsed lookups
      if (!result.diagnostics?.jusoResult?.success && result.diagnostics?.requestParams) {
        const params = result.diagnostics.requestParams
        setManualParcel({
          sigunguCd: params.sigunguCd || '',
          bjdongCd: params.bjdongCd || '',
          bun: params.bun || '',
          ji: params.ji || '',
        })
      }
      
      if (result.success && result.data) {
        setFetchedData(result.data)
        setLookupState('success')
        setShowManualInput(false)
        
        // Auto-fill site area if available
        if (result.data.siteArea && result.data.siteArea > 0) {
          onSiteAreaChange(String(Math.round(result.data.siteArea)))
        } else {
          setTimeout(() => {
            const areaInput = document.getElementById('siteArea') as HTMLInputElement | null
            if (areaInput) { areaInput.focus(); areaInput.select() }
          }, 300)
        }

        // MOLIT 용도지역은 무시 - vworld-zone(LURIS/Vworld)만 사용
        // MOLIT 건축물대장의 용도지역이 부정확한 사례가 많음 (예: 제1종전용 → 제2종일반)
        const molitZone = result.data.zoneType || ''
        let mappedZone = '' // MOLIT zone 사용하지 않음

        // 역추론은 page.tsx의 zone-lookup/LURIS에 위임 (이중 처리 방지)

        // 접도 현황 - 가능한 모든 주소 소스에서 추론 (stale closure 방지)
        const roadAddrSources = [
          result.data.roadAddress,
          addressRef.current,
          address,
          result.diagnostics?.jusoResult?.rawResponse?.roadAddr,
        ].filter(Boolean).join(' ')

        // "길" 우선 판단 (평창길, 골목길 등은 소로)
        // 도로명 부분만 추출 (종로구의 "로" 오매칭 방지)
        const roadNamePart = roadAddrSources.replace(/.*[구군시]\s*/,'')
        const mappedRoadCondition =
          roadNamePart.includes('대로') ? '12m-plus' :
          roadNamePart.includes('길')   ? '4m-plus' :
          roadNamePart.includes('로')   ? '8m-plus' : '6m-plus'

        console.log('[v0] roadAddr sources:', roadAddrSources, '→', mappedRoadCondition)

        // 높이 제한 - 용도지역별 법정 기본값 (m)
        const heightByZone: Record<string, number> = {
          'residential-exclusive-1': 9,
          'residential-exclusive-2': 12,
          'residential-1': 12,
          'residential-2': 20,
          'residential-3': 30,
          'semi-residential': 45,
          'commercial-neighborhood': 45,
          'commercial-general': 60,
          'commercial-central': 200,
          'industrial-general': 30,
          'green-natural': 20,
          'green-production': 20,
          'management-planned': 20,
        }
        const mappedHeightLimit = mappedZone ? (heightByZone[mappedZone] ?? 30) : null

        // 지구단위계획 여부 - guyukCdNm(area) 필드에서 직접 감지
        // MOLIT이 "지구단위계획구역"을 area 필드에 직접 반환함
        const hasDistrict = !!(
          (result.data.area && result.data.area.includes('지구단위')) ||
          (result.data.district && result.data.district.includes('지구단위'))
        )

        // supplement 자동 입력 (MOLIT 조회 완료 시)
        // zoneType은 vworld-zone(LURIS/Vworld)에서만 설정 — MOLIT 건축물대장은 부정확할 수 있음
        setSupplementData(prev => ({
          zoneType: prev?.zoneType || '',  // zone은 vworld-zone 결과 대기
          roadCondition: mappedRoadCondition,
          heightLimit: prev?.heightLimit ?? mappedHeightLimit,
          hasDistrictPlan: hasDistrict,
          districtPlanNotes: hasDistrict ? '지구단위계획 적용' : '',
          additionalNotes: prev?.additionalNotes || '',
        }))
        
        // Notify parent component
        if (onMolitDataFetched) {
          onMolitDataFetched(result.data)
        }
        // 보완 데이터도 부모에 전달 (건폐율/용적률 업데이트용)
        if (onSupplementDataChange && mappedZone) {
          const supplementToSync: SupplementData = {
            zoneType: mappedZone,
            roadCondition: mappedRoadCondition,
            heightLimit: mappedHeightLimit,
            hasDistrictPlan: hasDistrict,
            districtPlanNotes: hasDistrict ? '지구단위계획 적용' : '',
            additionalNotes: '',
          }
          onSupplementDataChange(supplementToSync)
        }
      } else {
        // Determine the appropriate state based on diagnostics
        const lookupPath = result.diagnostics?.lookupPath
        const jusoSucceeded = result.diagnostics?.jusoResult?.success
        const jusoFailed = result.diagnostics?.jusoResult && !result.diagnostics.jusoResult.success
        const isManualOverride = lookupPath === 'manual-override'
        
        // Check for MOLIT upstream errors (HTTP 500, etc.)
        const hasUpstreamError = result.diagnostics?.molitEndpoints?.attempted?.some(
          (ep: { debug?: { httpStatus?: number } }) => ep.debug?.httpStatus && ep.debug.httpStatus >= 500
        )
        
        // Check for environment missing
        const envMissing = result.diagnostics?.config && 
          (!result.diagnostics.config.molitApiKey || !result.diagnostics.config.jusoApiKey)
        
        // Classify the status
        let classifiedStatus: AutoLookupStatus = 'molit-failed'
        
        if (envMissing) {
          classifiedStatus = 'env-missing'
        } else if (hasUpstreamError) {
          classifiedStatus = 'upstream-error'
        } else if (jusoFailed) {
          classifiedStatus = 'juso-failed'
        } else if (jusoSucceeded || isManualOverride) {
          // JUSO worked but MOLIT returned empty (actual 0 results)
          classifiedStatus = 'success-empty'
        } else {
          classifiedStatus = 'molit-failed'
        }
        
        setLookupState(classifiedStatus)
        setLookupError(AUTO_LOOKUP_MESSAGES[classifiedStatus])
        
        console.log(`[MOLIT] classifiedAs=${classifiedStatus} jusoSucceeded=${jusoSucceeded} hasUpstreamError=${hasUpstreamError}`)
        
        // Even on error, pass partial data if available
        if (result.data && onMolitDataFetched) {
          onMolitDataFetched(result.data)
        } else if (classifiedStatus === 'success-empty' && onMolitDataFetched) {
          // JUSO 좌표 + 필지 코드 전달 (지적도 위치 표시 + zone-lookup용)
          const jusoData = result.diagnostics?.jusoResult
          const reqParams = result.diagnostics?.requestParams
          // sigunguCd: requestParams 우선, fallback으로 jusoResult.extractedCodes
          const extracted = jusoData?.extractedCodes
          const sigunguCd = reqParams?.sigunguCd || extracted?.sigunguCd
          if (sigunguCd || jusoData?.rawResponse?.roadAddr) {
            onMolitDataFetched({
              entX: (jusoData as any)?.entX,
              entY: (jusoData as any)?.entY,
              roadAddress: (jusoData as any)?.roadAddr || jusoData?.rawResponse?.roadAddr,
              address: jusoData?.jibunAddr,
              // zone-lookup에 필요한 필지 코드
              sigunguCd: sigunguCd,
              bjdongCd: reqParams?.bjdongCd || extracted?.bjdongCd,
              bun: reqParams?.bun || extracted?.bun,
              ji: reqParams?.ji || extracted?.ji,
              bdMgtSn: (jusoData as any)?.bdMgtSn,
            } as import('@/types/molit').MolitSiteData)
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setLookupState('upstream-error')
      setLookupError(AUTO_LOOKUP_MESSAGES['upstream-error'] + ` (${errorMessage})`)
      console.log(`[MOLIT] classifiedAs=upstream-error error=${errorMessage}`)
    } finally {
      setIsRetrying(false)
    }
  }
  
  /**
   * Quick retry with preset values
   */
  const handleQuickRetry = (presetName: string, bun: string, ji: string, rawMode: boolean = false) => {
    console.log('[v0] handleQuickRetry called:', { presetName, bun, ji, rawMode })
    console.log('[v0] resolvedJuso:', resolvedJuso)
    
    if (!resolvedJuso) {
      console.log('[v0] No resolvedJuso, returning early')
      return
    }
    
    // For raw mode, don't pad; otherwise pad to 4 digits
    const finalBun = rawMode ? bun : bun.padStart(4, '0')
    const finalJi = rawMode ? ji : ji.padStart(4, '0')
    
    console.log('[v0] Final values:', { finalBun, finalJi, rawMode })
    
    setRetryCount(prev => prev + 1)
    setActivePreset(presetName)
    setLastRetryParams({ bun: finalBun, ji: finalJi })
    
    const parcel: ManualParcelInput = {
      sigunguCd: resolvedJuso.sigunguCd,
      bjdongCd: resolvedJuso.bjdongCd,
      bun: finalBun,
      ji: finalJi,
      rawMode,
    }
    
    console.log('[v0] Calling handleMolitLookup with parcel:', parcel)
    
    setManualParcel(parcel)
    handleMolitLookup(parcel)
  }
  
  /**
   * Retry with manual parcel input
   */
  const handleManualRetry = () => {
    if (!manualParcel.sigunguCd || !manualParcel.bjdongCd) {
      setLookupError('시군구코드와 법정동코드는 필수입니다.')
      return
    }
    
    setActivePreset('수동 입력')
    setLastRetryParams({ bun: manualParcel.bun, ji: manualParcel.ji })
    
    // Pad bun/ji with leading zeros
    const paddedParcel: ManualParcelInput = {
      sigunguCd: manualParcel.sigunguCd,
      bjdongCd: manualParcel.bjdongCd,
      bun: manualParcel.bun.padStart(4, '0'),
      ji: manualParcel.ji.padStart(4, '0'),
    }
    
    handleMolitLookup(paddedParcel)
  }

  /**
   * Reset lookup state when address changes
   */
  const handleAddressChange = (value: string) => {
    onAddressChange(value)
    if (lookupState !== 'idle') {
      setLookupState('idle')
      setLookupError(null)
      setFetchedData(null)
      setResolvedJuso(null)
      setAutoZoneCode(null)
      setAutoRoadCondition(null)
      setShowManualInput(false)
      setActivePreset(null)
      setLastRetryParams(null)
      setRetryCount(0)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">대상지 정보</CardTitle>
        <CardDescription>대지 정보를 입력하여 배치안을 생성하세요</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:gap-5">
          {/* Host Mismatch Warning - Development only */}
          {process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && !window.location.host.includes('t-generator') && (
            <div className="text-xs p-3 rounded border bg-amber-500/10 border-amber-500/30 text-amber-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="font-bold text-amber-400">[DEV] HOST MISMATCH</span>
              </div>
              <p className="mt-1 text-foreground">
                현재 <span className="font-mono font-bold text-amber-400">{window.location.host}</span>에서 테스트 중입니다.
              </p>
              <p className="mt-1 text-muted-foreground">
                JUSO API 키는 <span className="font-mono font-bold">t-generator.vercel.app</span>에서만 작동합니다.
              </p>
            </div>
          )}
          
          {/* Environment Status Banner - Development only */}
          {process.env.NODE_ENV !== 'production' && envStatus.loaded && (
            <div className={`text-xs p-2 rounded border ${
              envStatus.molit.configured 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">[DEV] API:</span>
                {envStatus.molit.configured ? (
                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                    MOLIT OK
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                    MOLIT 없음
                  </Badge>
                )}
                {envStatus.juso.configured ? (
                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                    JUSO OK
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                    JUSO 없음
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Address Input with MOLIT Lookup */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="address" className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" />
              대지 주소
            </Label>
            {/* Mobile: stacked layout, Desktop: side-by-side */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="address"
                placeholder="예: 서울 강남구 역삼동 123-45"
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                className="bg-secondary/50 w-full sm:flex-1"
              />
              {/* Auto-lookup button - subtle when supplement is completed */}
              {supplementData ? (
                <button
                  type="button"
                  onClick={() => handleMolitLookup()}
                  disabled={!canLookup}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
                >
                  <Search className="h-3 w-3" />
                  재조회
                </button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleMolitLookup()}
                  disabled={!canLookup}
                  className="w-full sm:w-auto sm:shrink-0"
                >
                  {lookupState === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-1" />
                      {['molit-failed', 'parse-error', 'upstream-error', 'juso-failed'].includes(lookupState)
                        ? '자동조회 다시 시도'
                        : '국토부 자동조회'
                      }
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {/* Address hint for lookup */}
            {lookupState === 'idle' && addressTrimmed.length > 0 && !canLookup && (
              <p className="text-xs text-muted-foreground">
                자동조회를 사용하려면 번지/건물번호까지 입력해주세요. (예: 서울 강남구 역삼동 123-45)
              </p>
            )}
            
            {/* Auto-Lookup Status Card - Unified Dark Theme UI */}
            {(lookupState === 'loading' || lookupState === 'molit-failed' || lookupState === 'parse-error' || lookupState === 'env-missing' || lookupState === 'upstream-error') && (
              <AutoLookupStatusCard
                status={lookupState}
                onRetry={() => handleMolitLookup()}
                onManualInput={() => setShowSupplementForm(true)}
                isRetrying={isRetrying}
                autoFilledItems={autoFilledItems}
                manualCheckItems={manualCheckItems}
                supplementCompleted={!!supplementData}
              />
            )}
            
            {/* Success Empty - partial success with manual check needed */}
            {lookupState === 'success-empty' && !resolvedJuso && (
              <AutoLookupStatusCard
                status={lookupState}
                onRetry={() => handleMolitLookup()}
                onManualInput={() => setShowSupplementForm(true)}
                isRetrying={isRetrying}
                autoFilledItems={autoFilledItems}
                manualCheckItems={manualCheckItems}
                supplementCompleted={!!supplementData}
              />
            )}
            
            {/* JUSO Failed - address resolution failed */}
            {lookupState === 'juso-failed' && (
              <AutoLookupStatusCard
                status={lookupState}
                onRetry={() => handleMolitLookup()}
                onManualInput={() => setShowManualInput(!showManualInput)}
                isRetrying={isRetrying}
                supplementCompleted={!!supplementData}
              />
            )}
            
            {/* Manual Input Form for juso-failed */}
            {lookupState === 'juso-failed' && showManualInput && (
              <div className="rounded-lg p-3 border border-border bg-secondary/30 space-y-3">
                <p className="text-xs text-muted-foreground">지번 정보를 직접 입력하여 다시 조회할 수 있습니다.</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">시군구코드</Label>
                    <Input
                      value={manualParcel.sigunguCd}
                      onChange={(e) => setManualParcel(p => ({ ...p, sigunguCd: e.target.value }))}
                      placeholder="11680"
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">법정동코드</Label>
                    <Input
                      value={manualParcel.bjdongCd}
                      onChange={(e) => setManualParcel(p => ({ ...p, bjdongCd: e.target.value }))}
                      placeholder="10500"
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">본번 (bun)</Label>
                    <Input
                      value={manualParcel.bun}
                      onChange={(e) => setManualParcel(p => ({ ...p, bun: e.target.value }))}
                      placeholder="0159"
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">부번 (ji)</Label>
                    <Input
                      value={manualParcel.ji}
                      onChange={(e) => setManualParcel(p => ({ ...p, ji: e.target.value }))}
                      placeholder="0009"
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleManualRetry}
                  disabled={isRetrying}
                  className="w-full"
                  size="sm"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  수정된 지번으로 다시 조회
                </Button>
              </div>
            )}
            
            {/* JUSO succeeded but MOLIT empty - show resolved data and manual retry */}
            {lookupState === 'success-empty' && resolvedJuso && (
              <div className="rounded-lg p-4 border bg-amber-500/10 border-amber-500/30 space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="text-[10px] bg-amber-500/20 text-amber-400">일부 확인 필요</Badge>
                    </div>
                    <p className="font-medium text-foreground">주소 변환 성공</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      건축물대장 조회에서 결과가 없습니다. 지번을 수정하여 다시 시도해보세요.
                    </p>
                  </div>
                </div>
                
                {/* Resolved JUSO data - dark theme */}
                <div className="text-xs space-y-2 bg-secondary/50 rounded p-3 border border-border">
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wide">도로명주소</span>
                    <p className="break-all font-medium text-foreground">{resolvedJuso.roadAddr || '(없음)'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wide">지번주소</span>
                    <p className="break-all font-medium text-foreground">{resolvedJuso.jibunAddr || '(없음)'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                    <div>
                      <span className="text-muted-foreground text-[10px]">시군구</span>
                      <p className="font-mono text-[11px] text-foreground">{resolvedJuso.sigunguCd}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px]">법정동</span>
                      <p className="font-mono text-[11px] text-foreground">{resolvedJuso.bjdongCd}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px]">본번</span>
                      <p className="font-mono text-[11px] text-foreground">{resolvedJuso.bun}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px]">부번</span>
                      <p className="font-mono text-[11px] text-foreground">{resolvedJuso.ji}</p>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-border">
                    <span className="text-muted-foreground text-[10px]">건물관리번호 (bdMgtSn)</span>
                    <p className="break-all font-mono text-[10px] text-muted-foreground">{resolvedJuso.bdMgtSn || '(없음)'}</p>
                  </div>
                </div>
                
                
                
                {/* Manual parcel input toggle */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="w-full text-muted-foreground"
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  {showManualInput ? '수동 입력 닫기' : '직접 지번 입력하기'}
                </Button>

                {/* 수동 입력으로 계속하기 버튼 */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // externalSupplement(zone-lookup)가 있으면 이미 채워진 상태
                    if (!externalSupplement?.zoneCode) {
                      const roadAddr = resolvedJuso.roadAddr || address
                      const rn = roadAddr.replace(/.*[구군시]\s*/,'')
                      const mappedRoadCondition =
                        rn.includes('대로') ? '12m-plus' :
                        rn.includes('길') ? '4m-plus' :
                        rn.includes('로') ? '8m-plus' : '6m-plus'
                      setSupplementData(prev => ({
                        zoneType: prev?.zoneType && prev.zoneType !== 'residential-2' ? prev.zoneType : '',
                        roadCondition: mappedRoadCondition,
                        heightLimit: prev?.heightLimit ?? null,
                        hasDistrictPlan: prev?.hasDistrictPlan ?? false,
                        districtPlanNotes: prev?.districtPlanNotes || '',
                        additionalNotes: prev?.additionalNotes || '',
                      }))
                    }
                    setShowSupplementForm(true)
                  }}
                  className={`w-full ${externalSupplement?.zoneCode ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5' : 'border-primary/30 text-primary'}`}
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  {externalSupplement?.zoneCode ? '자동입력 완료 — 확인하고 계속하기' : '수동으로 정보 입력하고 계속하기'}
                </Button>
                
                {/* Manual parcel input form */}
                {showManualInput && (
                  <div className="space-y-3 pt-2 border-t bg-white/30 rounded p-3">
                    <p className="text-xs text-muted-foreground">
                      지번 코드를 직접 수정하여 조회할 수 있습니다.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">시군구코드</Label>
                        <Input
                          value={manualParcel.sigunguCd}
                          onChange={(e) => setManualParcel(p => ({ ...p, sigunguCd: e.target.value }))}
                          placeholder="11680"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">법정동코드</Label>
                        <Input
                          value={manualParcel.bjdongCd}
                          onChange={(e) => setManualParcel(p => ({ ...p, bjdongCd: e.target.value }))}
                          placeholder="10500"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">본번 (bun)</Label>
                        <Input
                          value={manualParcel.bun}
                          onChange={(e) => setManualParcel(p => ({ ...p, bun: e.target.value }))}
                          placeholder="0159"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">부번 (ji)</Label>
                        <Input
                          value={manualParcel.ji}
                          onChange={(e) => setManualParcel(p => ({ ...p, ji: e.target.value }))}
                          placeholder="0009"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleManualRetry}
                      disabled={isRetrying}
                      className="w-full"
                      size="sm"
                    >
                      {isRetrying ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Search className="h-3 w-3 mr-1" />
                      )}
                      이 지번으로 조회
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {lookupState === 'success' && fetchedData && (
              <AutoLookupStatusCard
                status="success"
                autoFilledItems={[
                  '대상지 주소',
                  fetchedData.siteArea ? '대지면적' : '',
                  fetchedData.buildingName ? '건물명' : '',
                  fetchedData.mainPurpose ? '주용도' : '',
                ].filter(Boolean)}
                manualCheckItems={[]}
                compact={isDemo ? false : true}
              />
            )}
            {lookupState === 'success' && isDemo && (
              <div className="text-xs flex items-center gap-1 p-2 rounded bg-amber-500/10 border border-amber-500/30">
                <AlertCircle className="h-3 w-3 text-amber-500" />
                <span className="text-amber-400">
                  {envStatus.molit.configured ? (
                    '[데모 모드] API 키는 있으나 조회 실패. 키 모드 테스트를 진행해주세요.'
                  ) : (
                    '[ENV_MISSING] MOLIT_API_KEY 환경변수가 설정되지 않았습니다.'
                  )}
                </span>
              </div>
            )}
            
            {/* Manual Supplement Form - Show when lookup succeeded but needs manual supplement */}
            {(lookupState === 'success' || lookupState === 'success-empty') && !showSupplementForm && !supplementData && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSupplementForm(true)}
                className="w-full h-8 text-xs border-dashed"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                추가 정보 입력하기 (용도지역, 접도 조건 등)
              </Button>
            )}
            
            {/* Supplement Form */}
            {showSupplementForm && (
              <ManualSupplementForm
                key={`supplement-${supplementData?.roadCondition}-${supplementData?.zoneType}-${supplementData?.heightLimit}`}
                autoFilledItems={autoFilledItems}
                initialData={supplementData || undefined}
                onSave={handleSupplementSave}
                onSkip={handleSupplementSkip}
                onCancel={() => setShowSupplementForm(false)}
                isSaving={isSavingSupplement}
              />
            )}
            
            {/* Supplement Summary - Show when supplement data exists */}
            {supplementData && !showSupplementForm && (
              <SupplementSummary 
                data={supplementData} 
                onEdit={() => setShowSupplementForm(true)}
                addressOverride={addressRef.current || address}
              />
            )}
          </div>

          {/* Site Area Input */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="siteArea" className="flex items-center gap-2 text-sm font-medium">
              <Maximize className="h-4 w-4 text-primary" />
              대지 면적 (㎡)
              {fetchedData?.siteArea && (
                <Badge variant="secondary" className="text-xs font-normal">
                  자동입력
                </Badge>
              )}
              {fetchedData && lookupState === 'success' && !fetchedData.siteArea && (
                <Badge variant="outline" className="text-xs font-normal text-amber-500 border-amber-500/50">
                  직접 입력 필요
                </Badge>
              )}
            </Label>
            <Input
              id="siteArea"
              type="number"
              placeholder="예: 660"
              value={siteArea}
              onChange={(e) => onSiteAreaChange(e.target.value)}
              className="bg-secondary/50"
            />
          </div>

          {/* Fetched Data Summary */}
          {fetchedData && lookupState === 'success' && (
            <div className={`rounded-lg p-4 border ${isDemo ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">조회된 정보</span>
                {isDemo ? (
                  <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                    데모 데이터
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    {fetchedData.dataSource === 'building' ? '건축물대장' : '주소'}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {fetchedData.buildingName && (
                  <>
                    <span className="text-muted-foreground">건물명</span>
                    <span className="font-medium">{fetchedData.buildingName}</span>
                  </>
                )}
                {fetchedData.mainPurpose && (
                  <>
                    <span className="text-muted-foreground">주용도</span>
                    <span className="font-medium">{fetchedData.mainPurpose}</span>
                  </>
                )}
                {fetchedData.siteArea && (
                  <>
                    <span className="text-muted-foreground">대지면적</span>
                    <span className="font-medium">{fetchedData.siteArea.toLocaleString()}㎡</span>
                  </>
                )}
                {fetchedData.totalFloorArea && (
                  <>
                    <span className="text-muted-foreground">연면적</span>
                    <span className="font-medium">{fetchedData.totalFloorArea.toLocaleString()}㎡</span>
                  </>
                )}
                {fetchedData.groundFloors && (
                  <>
                    <span className="text-muted-foreground">층수</span>
                    <span className="font-medium">
                      지상 {fetchedData.groundFloors}층
                      {fetchedData.basementFloors ? ` / 지하 ${fetchedData.basementFloors}층` : ''}
                    </span>
                  </>
                )}
                {fetchedData.householdCount && (
                  <>
                    <span className="text-muted-foreground">세대수</span>
                    <span className="font-medium">{fetchedData.householdCount}세대</span>
                  </>
                )}
                {(supplementData?.zoneType || fetchedData.zoneType) && (
                  <>
                    <span className="text-muted-foreground">용도지역</span>
                    <span className="font-medium">
                      {supplementData?.zoneType ? '' : fetchedData.zoneType}
                    </span>
                  </>
                )}
                {fetchedData.buildingCoverage && (
                  <>
                    <span className="text-muted-foreground text-amber-400/70">현황 건폐율/용적률</span>
                    <span className="font-medium text-amber-400/80">
                      {fetchedData.buildingCoverage}% / {fetchedData.floorAreaRatio || '-'}%
                      <span className="text-[10px] text-muted-foreground ml-1">(기존건물 현황)</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                처리 중...
              </>
            ) : (
              buttonText
            )}
          </Button>
          
        </div>
      </CardContent>
    </Card>
  )
}
