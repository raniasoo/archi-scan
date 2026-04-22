"use client"
// @version STABLE-v215 | Critical: Supplement data syncs to parent regulation state

import { useState, useEffect } from "react"
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
  // New: callback for MOLIT data merge
  onMolitDataFetched?: (data: MolitSiteData) => void
  // CRITICAL: callback to sync supplement data to parent regulation state
  onSupplementDataChange?: (data: SupplementData) => void
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
}: SiteInputFormProps) {
  const [lookupState, setLookupState] = useState<AutoLookupStatus>('idle')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [fetchedData, setFetchedData] = useState<MolitSiteData | null>(null)
  const [isDemo, setIsDemo] = useState<boolean>(false)
  const [diagnostics, setDiagnostics] = useState<MolitDiagnostics | null>(null)
  
  // Resolved JUSO data for display and manual retry
  const [resolvedJuso, setResolvedJuso] = useState<ResolvedJusoData | null>(null)
  
  // Manual parcel input mode
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualParcel, setManualParcel] = useState<ManualParcelInput>({
    sigunguCd: '',
    bjdongCd: '',
    bun: '',
    ji: '',
  })
  
  // Track active retry preset
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [lastRetryParams, setLastRetryParams] = useState<{ bun: string; ji: string } | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [requestId, setRequestId] = useState(0) // For forcing UI refresh on new requests
  
  // Visible debug log for preset clicks
  const [debugLog, setDebugLog] = useState<string | null>(null)
  
  // Manual supplement form state
  const [showSupplementForm, setShowSupplementForm] = useState(false)
  const [supplementData, setSupplementData] = useState<SupplementData | null>(null)
  const [isSavingSupplement, setIsSavingSupplement] = useState(false)
  
  // Environment status for API keys
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
    fetchedData.floorCount ? '층수' : '',
  ].filter(Boolean) : []

  // Items that need manual verification
  const manualCheckItems = ['용도지역', '접도 조건', '높이 제한', '지구단위계획 여부']

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
    
    // For retries (with overrideParcel), don't reset lookupState to 'loading' 
    // because that would hide the retry buttons
    const isRetry = !!overrideParcel
    console.log('[v0] isRetry:', isRetry)
    
    // Always increment requestId and clear diagnostics to force UI refresh
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
          result.diagnostics = { lookupPath: 'unknown' } as MolitDiagnostics
        }
        result.diagnostics.clientHttpStatus = httpStatus
        result.diagnostics.clientRawResponse = responseText.substring(0, 1500)
      } catch (parseError) {
        setLookupState('parse-error')
        setLookupError(AUTO_LOOKUP_MESSAGES['parse-error'])
        // Set minimal diagnostics for parse error
        setDiagnostics({
          lookupPath: 'parse-error',
          clientHttpStatus: httpStatus,
          clientRawResponse: responseText.substring(0, 1500),
        } as MolitDiagnostics)
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
        }
        
        // Notify parent component
        if (onMolitDataFetched) {
          onMolitDataFetched(result.data)
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
                  disabled={lookupState === 'loading'}
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
                
                {/* Active preset indicator - dark theme */}
                {(activePreset || retryCount > 0) && (
                  <div className="text-xs bg-primary/10 rounded p-2 border border-primary/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-primary font-medium">재시도 횟수: {retryCount}</span>
                      {activePreset && (
                        <span className="text-primary text-[10px] bg-primary/20 px-1.5 py-0.5 rounded">
                          {activePreset}
                        </span>
                      )}
                    </div>
                    {lastRetryParams && (
                      <div className="text-[11px] text-muted-foreground font-mono">
                        현재 bun/ji: {lastRetryParams.bun} / {lastRetryParams.ji}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Visible debug log - hidden in production */}
                {debugLog && process.env.NODE_ENV !== 'production' && (
                  <div className="text-xs bg-violet-500/10 rounded p-2 border border-violet-500/30 font-mono text-violet-300">
                    {debugLog}
                  </div>
                )}
                
                {/* Quick retry presets */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">빠른 재시도:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Preset: 원본 */}
                    <Button
                      type="button"
                      variant={activePreset === '원본' ? 'default' : 'outline'}
                      size="sm"
                      onClick={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const bun = resolvedJuso.bun
                        const ji = resolvedJuso.ji
                        setDebugLog(`preset clicked: 원본, bun=${bun}, ji=${ji}`)
                        setRetryCount(c => c + 1)
                        setActivePreset('원본')
                        setLastRetryParams({ bun, ji })
                        const parcel = { sigunguCd: resolvedJuso.sigunguCd, bjdongCd: resolvedJuso.bjdongCd, bun, ji }
                        setManualParcel(parcel)
                        await handleMolitLookup(parcel)
                      }}
                      disabled={isRetrying}
                      className="w-full justify-start text-xs h-9"
                    >
                      {isRetrying && activePreset === '원본' ? (
                        <Loader2 className="h-3 w-3 mr-1 shrink-0 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3 mr-1 shrink-0" />
                      )}
                      <span className="truncate">원본: {resolvedJuso.bun}-{resolvedJuso.ji}</span>
                    </Button>
                    
                    {/* Preset: 부번 0 */}
                    <Button
                      type="button"
                      variant={activePreset === '부번 0' ? 'default' : 'outline'}
                      size="sm"
                      onClick={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const bun = resolvedJuso.bun
                        const ji = '0000'
                        setDebugLog(`preset clicked: 부번 0, bun=${bun}, ji=${ji}`)
                        setRetryCount(c => c + 1)
                        setActivePreset('부번 0')
                        setLastRetryParams({ bun, ji })
                        const parcel = { sigunguCd: resolvedJuso.sigunguCd, bjdongCd: resolvedJuso.bjdongCd, bun, ji }
                        setManualParcel(parcel)
                        await handleMolitLookup(parcel)
                      }}
                      disabled={isRetrying}
                      className="w-full justify-start text-xs h-9"
                    >
                      {isRetrying && activePreset === '부번 0' ? (
                        <Loader2 className="h-3 w-3 mr-1 shrink-0 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3 mr-1 shrink-0" />
                      )}
                      <span className="truncate">부번 0: {resolvedJuso.bun}-0000</span>
                    </Button>
                    
                    {/* Preset: 짧은형 (raw mode) */}
                    <Button
                      type="button"
                      variant={activePreset === '짧은형' ? 'default' : 'outline'}
                      size="sm"
                      onClick={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const bun = String(parseInt(resolvedJuso.bun, 10))
                        const ji = String(parseInt(resolvedJuso.ji, 10))
                        setDebugLog(`preset clicked: 짧은형 (raw), bun=${bun}, ji=${ji}`)
                        setRetryCount(c => c + 1)
                        setActivePreset('짧은형')
                        setLastRetryParams({ bun, ji })
                        const parcel = { sigunguCd: resolvedJuso.sigunguCd, bjdongCd: resolvedJuso.bjdongCd, bun, ji, rawMode: true }
                        setManualParcel(parcel)
                        await handleMolitLookup(parcel)
                      }}
                      disabled={isRetrying}
                      className="w-full justify-start text-xs h-9"
                    >
                      {isRetrying && activePreset === '짧은형' ? (
                        <Loader2 className="h-3 w-3 mr-1 shrink-0 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3 mr-1 shrink-0" />
                      )}
                      <span className="truncate">짧은형: {String(parseInt(resolvedJuso.bun, 10))}-{String(parseInt(resolvedJuso.ji, 10))}</span>
                    </Button>
                    
                    {/* Preset: 짧은+0 (raw mode) */}
                    <Button
                      type="button"
                      variant={activePreset === '짧은+0' ? 'default' : 'outline'}
                      size="sm"
                      onClick={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const bun = String(parseInt(resolvedJuso.bun, 10))
                        const ji = '0'
                        setDebugLog(`preset clicked: 짧은+0 (raw), bun=${bun}, ji=${ji}`)
                        setRetryCount(c => c + 1)
                        setActivePreset('짧은+0')
                        setLastRetryParams({ bun, ji })
                        const parcel = { sigunguCd: resolvedJuso.sigunguCd, bjdongCd: resolvedJuso.bjdongCd, bun, ji, rawMode: true }
                        setManualParcel(parcel)
                        await handleMolitLookup(parcel)
                      }}
                      disabled={isRetrying}
                      className="w-full justify-start text-xs h-9"
                    >
                      {isRetrying && activePreset === '짧은+0' ? (
                        <Loader2 className="h-3 w-3 mr-1 shrink-0 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3 mr-1 shrink-0" />
                      )}
                      <span className="truncate">짧은+0: {String(parseInt(resolvedJuso.bun, 10))}-0</span>
                    </Button>
                  </div>
                </div>
                
                {/* platGbCd test presets */}
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground font-medium">platGbCd 테스트:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async (e) => {
                        e.preventDefault()
                        setDebugLog(`platGbCd test: 0 (대지)`)
                        setRetryCount(c => c + 1)
                        setActivePreset('platGbCd=0')
                        const parcel = { 
                          sigunguCd: resolvedJuso.sigunguCd, 
                          bjdongCd: resolvedJuso.bjdongCd, 
                          bun: resolvedJuso.bun, 
                          ji: resolvedJuso.ji,
                          platGbCd: '0'
                        }
                        setLastRetryParams({ bun: resolvedJuso.bun, ji: resolvedJuso.ji })
                        await handleMolitLookup(parcel)
                      }}
                      disabled={isRetrying}
                      className="text-xs h-8"
                    >
                      0 (대지)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async (e) => {
                        e.preventDefault()
                        setDebugLog(`platGbCd test: 1 (산)`)
                        setRetryCount(c => c + 1)
                        setActivePreset('platGbCd=1')
                        const parcel = { 
                          sigunguCd: resolvedJuso.sigunguCd, 
                          bjdongCd: resolvedJuso.bjdongCd, 
                          bun: resolvedJuso.bun, 
                          ji: resolvedJuso.ji,
                          platGbCd: '1'
                        }
                        setLastRetryParams({ bun: resolvedJuso.bun, ji: resolvedJuso.ji })
                        await handleMolitLookup(parcel)
                      }}
                      disabled={isRetrying}
                      className="text-xs h-8"
                    >
                      1 (산)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async (e) => {
                        e.preventDefault()
                        setDebugLog(`platGbCd test: omitted`)
                        setRetryCount(c => c + 1)
                        setActivePreset('platGbCd=생략')
                        const parcel = { 
                          sigunguCd: resolvedJuso.sigunguCd, 
                          bjdongCd: resolvedJuso.bjdongCd, 
                          bun: resolvedJuso.bun, 
                          ji: resolvedJuso.ji,
                          platGbCd: ''
                        }
                        setLastRetryParams({ bun: resolvedJuso.bun, ji: resolvedJuso.ji })
                        await handleMolitLookup(parcel)
                      }}
                      disabled={isRetrying}
                      className="text-xs h-8"
                    >
                      생략
                    </Button>
                  </div>
                </div>
                
                {/* Retry loading indicator */}
                {isRetrying && (
                  <div className="text-xs text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    재조회 중...
                  </div>
                )}
                
                {/* Single endpoint direct test - for debugging with keyMode */}
                <div className="space-y-2 pt-2 border-t border-border bg-secondary/30 rounded p-2">
                  <p className="text-xs text-muted-foreground font-medium">인증키 모드 테스트 (단일 Endpoint):</p>
                  <p className="text-[10px] text-muted-foreground">
                    URLSearchParams 자동 인코딩 vs 수동 pre-encoding 비교
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Raw key mode button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async (e) => {
                        e.preventDefault()
                        setRetryCount(c => c + 1)
                        setActivePreset('keyMode=raw')
                        setLastRetryParams({ bun: resolvedJuso.bun, ji: resolvedJuso.ji })
                        
                        const testUrl = `/api/molit/debug-single?keyMode=raw&sigunguCd=${resolvedJuso.sigunguCd}&bjdongCd=${resolvedJuso.bjdongCd}&bun=${resolvedJuso.bun}&ji=${resolvedJuso.ji}`
                        
                        setRequestId(prev => prev + 1)
                        setDiagnostics(null)
                        setIsRetrying(true)
                        
                        try {
                          const response = await fetch(testUrl)
                          const text = await response.text()
                          
                          setDiagnostics({
                            lookupPath: 'debug-single-keyMode-raw',
                            clientHttpStatus: response.status,
                            clientRawResponse: text.substring(0, 3000),
                          } as MolitDiagnostics)
                        } catch (err) {
                          setDiagnostics({
                            lookupPath: 'debug-single-keyMode-raw',
                            clientHttpStatus: 0,
                            clientRawResponse: `Fetch error: ${err instanceof Error ? err.message : String(err)}`,
                          } as MolitDiagnostics)
                        } finally {
                          setIsRetrying(false)
                        }
                      }}
                      disabled={isRetrying}
                      className="text-xs h-10 bg-blue-50 hover:bg-blue-100 border-blue-300"
                    >
                      {isRetrying && activePreset === 'keyMode=raw' ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Search className="h-3 w-3 mr-1" />
                      )}
                      <div className="text-left">
                        <div className="font-semibold">Raw 키</div>
                        <div className="text-[9px] opacity-70">URLSearchParams 자동</div>
                      </div>
                    </Button>
                    
                    {/* Encoded key mode button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async (e) => {
                        e.preventDefault()
                        setRetryCount(c => c + 1)
                        setActivePreset('keyMode=encoded')
                        setLastRetryParams({ bun: resolvedJuso.bun, ji: resolvedJuso.ji })
                        
                        const testUrl = `/api/molit/debug-single?keyMode=encoded&sigunguCd=${resolvedJuso.sigunguCd}&bjdongCd=${resolvedJuso.bjdongCd}&bun=${resolvedJuso.bun}&ji=${resolvedJuso.ji}`
                        
                        setRequestId(prev => prev + 1)
                        setDiagnostics(null)
                        setIsRetrying(true)
                        
                        try {
                          const response = await fetch(testUrl)
                          const text = await response.text()
                          
                          setDiagnostics({
                            lookupPath: 'debug-single-keyMode-encoded',
                            clientHttpStatus: response.status,
                            clientRawResponse: text.substring(0, 3000),
                          } as MolitDiagnostics)
                        } catch (err) {
                          setDiagnostics({
                            lookupPath: 'debug-single-keyMode-encoded',
                            clientHttpStatus: 0,
                            clientRawResponse: `Fetch error: ${err instanceof Error ? err.message : String(err)}`,
                          } as MolitDiagnostics)
                        } finally {
                          setIsRetrying(false)
                        }
                      }}
                      disabled={isRetrying}
                      className="text-xs h-10 bg-green-50 hover:bg-green-100 border-green-300"
                    >
                      {isRetrying && activePreset === 'keyMode=encoded' ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Search className="h-3 w-3 mr-1" />
                      )}
                      <div className="text-left">
                        <div className="font-semibold">Encoded 키</div>
                        <div className="text-[9px] opacity-70">수동 pre-encode</div>
                      </div>
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground">
                    공공데이터 포털 인증키: Raw=원본 그대로 (자동 인코딩), Encoded=미리 encodeURIComponent 적용
                  </p>
                </div>
                
                {/* JUSO Debug Test */}
                <div className="space-y-2 pt-2 border-t bg-purple-50/50 rounded p-2">
                  <p className="text-xs text-muted-foreground font-medium">JUSO API 단일 테스트:</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault()
                      setRetryCount(c => c + 1)
                      setActivePreset('juso-debug')
                      
                      setRequestId(prev => prev + 1)
                      setDiagnostics(null)
                      setIsRetrying(true)
                      
                      try {
                        const response = await fetch(`/api/juso/debug-single?keyword=${encodeURIComponent(address || '세종로 1')}`)
                        const data = await response.json()
                        
                        // Extract key info for immediate display
                        const keyInfo = data.debugInfo?.request || {}
                        const jusoResponse = data.debugInfo?.response || {}
                        const hostInfo = data.debugInfo?.hostDebug || {}
                        const keyVerification = jusoResponse.keyVerification || {}
                        
                        setDiagnostics({
                          lookupPath: 'juso-debug-single',
                          clientHttpStatus: response.status,
                          clientRawResponse: JSON.stringify(data, null, 2).substring(0, 5000),
                          // Add structured JUSO debug info
                          jusoDebug: {
                            keyPreview: keyInfo.keyPreview,
                            keyLength: keyInfo.keyLength,
                            paramName: keyInfo.paramName,
                            requestUrlPreview: keyInfo.fullUrlPreview,
                            upstreamHttpStatus: jusoResponse.httpStatus,
                            errorCode: jusoResponse.errorCode,
                            errorMessage: jusoResponse.errorMessage,
                            diagnosis: jusoResponse.diagnosis,
                            isProduction: jusoResponse.isProduction,
                            hardcodedKeyFull: keyVerification.hardcodedKeyFull,
                            currentHost: hostInfo.currentHost,
                          }
                        } as MolitDiagnostics)
                      } catch (err) {
                        setDiagnostics({
                          lookupPath: 'juso-debug-single',
                          clientHttpStatus: 0,
                          clientRawResponse: `Fetch error: ${err instanceof Error ? err.message : String(err)}`,
                        } as MolitDiagnostics)
                      } finally {
                        setIsRetrying(false)
                      }
                    }}
                    disabled={isRetrying}
                    className="w-full text-xs h-10 bg-purple-50 hover:bg-purple-100 border-purple-300"
                  >
                    {isRetrying && activePreset === 'juso-debug' ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Search className="h-3 w-3 mr-1" />
                    )}
                    <div className="text-left">
                      <div className="font-semibold">JUSO API 직접 테스트</div>
                      <div className="text-[9px] opacity-70">keyPreview, paramName, URL 확인</div>
                    </div>
                  </Button>
                  <p className="text-[9px] text-muted-foreground">
                    JUSO 키 설정 상태, confmKey 파라미터, 실제 요청 URL을 확인합니다.
                  </p>
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
                      disabled={lookupState === 'loading'}
                      className="w-full"
                      size="sm"
                    >
                      {lookupState === 'loading' ? (
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
                {fetchedData.zoneType && (
                  <>
                    <span className="text-muted-foreground">용도지역</span>
                    <span className="font-medium">{fetchedData.zoneType}</span>
                  </>
                )}
                {fetchedData.buildingCoverage && (
                  <>
                    <span className="text-muted-foreground">건폐율/용적률</span>
                    <span className="font-medium">
                      {fetchedData.buildingCoverage}% / {fetchedData.floorAreaRatio || '-'}%
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
          
          {/* Diagnostics Debug Block (development only) */}
          {process.env.NODE_ENV !== 'production' && diagnostics && lookupState !== 'idle' && (
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                [DEV] 조회 진단 정보
              </summary>
              <div className="mt-2 p-3 rounded bg-muted/30 border font-mono space-y-1">
                <div className="grid grid-cols-[100px_1fr] gap-1">
                  
                  {/* JUSO Debug Info - Show when available */}
                  {diagnostics.jusoDebug && (
                    <>
                      <span className="text-muted-foreground font-bold col-span-2 border-b pb-1 mb-1 bg-purple-100 -mx-1 px-1">
                        JUSO API 실제 요청 정보:
                      </span>
                      <span className="text-muted-foreground">keyPreview:</span>
                      <span className="font-bold text-purple-700">{diagnostics.jusoDebug.keyPreview || 'N/A'}</span>
                      <span className="text-muted-foreground">keyLength:</span>
                      <span className={`font-bold ${diagnostics.jusoDebug.keyLength === 43 ? 'text-green-600' : 'text-red-600'}`}>
                        {diagnostics.jusoDebug.keyLength || 'N/A'} {diagnostics.jusoDebug.keyLength === 43 ? '(정상)' : '(43자 아님!)'}
                      </span>
                      <span className="text-muted-foreground">paramName:</span>
                      <span className={`font-bold ${diagnostics.jusoDebug.paramName === 'confmKey' ? 'text-green-600' : 'text-red-600'}`}>
                        {diagnostics.jusoDebug.paramName || 'N/A'}
                      </span>
                      <span className="text-muted-foreground">upstream:</span>
                      <span className={`font-bold ${diagnostics.jusoDebug.upstreamHttpStatus === 200 ? 'text-green-600' : 'text-amber-600'}`}>
                        HTTP {diagnostics.jusoDebug.upstreamHttpStatus || 'N/A'}
                      </span>
                      <span className="text-muted-foreground">errorCode:</span>
                      <span className={`font-bold ${diagnostics.jusoDebug.errorCode === '0' ? 'text-green-600' : 'text-red-600'}`}>
                        {diagnostics.jusoDebug.errorCode || 'N/A'} - {diagnostics.jusoDebug.errorMessage || ''}
                      </span>
                      <span className="text-muted-foreground">diagnosis:</span>
                      <span className="font-bold text-amber-700">{diagnostics.jusoDebug.diagnosis || 'N/A'}</span>
                      <span className="text-muted-foreground">currentHost:</span>
                      <span className="font-mono text-xs">{diagnostics.jusoDebug.currentHost || 'N/A'}</span>
                      <span className="text-muted-foreground">isProduction:</span>
                      <span className={diagnostics.jusoDebug.isProduction ? 'text-green-600 font-bold' : 'text-amber-600'}>
                        {diagnostics.jusoDebug.isProduction ? 'YES (t-generator)' : 'NO (preview)'}
                      </span>
                      {diagnostics.jusoDebug.hardcodedKeyFull && (
                        <>
                          <span className="text-muted-foreground col-span-2 mt-2 text-[10px]">
                            하드코딩된 키 (전체 - 실제 발급 키와 비교):
                          </span>
                          <span className="col-span-2 font-mono text-[10px] break-all bg-yellow-100 p-1 rounded">
                            {diagnostics.jusoDebug.hardcodedKeyFull}
                          </span>
                        </>
                      )}
                      <span className="text-muted-foreground col-span-2 mt-2 text-[10px]">
                        requestUrlPreview:
                      </span>
                      <span className="col-span-2 font-mono text-[10px] break-all">
                        {diagnostics.jusoDebug.requestUrlPreview || 'N/A'}
                      </span>
                    </>
                  )}
                  
                  {/* Environment Variable Status - CRITICAL */}
                  <span className="text-muted-foreground font-bold col-span-2 border-b pb-1 mb-1 mt-2">
                    서버 환경변수 상태:
                  </span>
                  
                  {diagnostics.envDebug ? (
                    <>
                      <span className="text-muted-foreground">MOLIT Key:</span>
                      <span className={diagnostics.envDebug.molitKeyLength > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {diagnostics.envDebug.molitKeyLength > 0 
                          ? `설정됨 (${diagnostics.envDebug.molitKeyPreview}, ${diagnostics.envDebug.molitKeyLength}자)`
                          : 'NOT_SET'}
                      </span>
                      <span className="text-muted-foreground">JUSO Key:</span>
                      <span className={diagnostics.envDebug.jusoKeyLength > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {diagnostics.envDebug.jusoKeyLength > 0 
                          ? `설정됨 (${diagnostics.envDebug.jusoKeyPreview}, ${diagnostics.envDebug.jusoKeyLength}자)`
                          : 'NOT_SET'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">MOLIT Key:</span>
                      <span className={diagnostics.config?.molitApiKey ? 'text-green-600' : 'text-red-600 font-bold'}>
                        {diagnostics.config?.molitApiKey ? '설정됨' : 'NOT_SET (envDebug 없음)'}
                      </span>
                      <span className="text-muted-foreground">JUSO Key:</span>
                      <span className={diagnostics.config?.jusoApiKey ? 'text-green-600' : 'text-red-600 font-bold'}>
                        {diagnostics.config?.jusoApiKey ? '설정됨' : 'NOT_SET'}
                      </span>
                    </>
                  )}
                  
                  <span className="text-muted-foreground font-bold col-span-2 border-b pb-1 mb-1 mt-2">
                    요청 상태:
                  </span>
                  
                  {/* Client-side HTTP status */}
                  <span className="text-muted-foreground">Client HTTP:</span>
                  <span className={`font-bold ${
                    diagnostics.clientHttpStatus === 200 ? 'text-green-600' : 
                    diagnostics.clientHttpStatus === 500 ? 'text-red-600' : 
                    'text-amber-600'
                  }`}>
                    {diagnostics.clientHttpStatus || 'N/A'}
                    {diagnostics.clientHttpStatus === 500 && ' (서버 오류)'}
                    {diagnostics.clientHttpStatus === 200 && ' (정상)'}
                  </span>
                  
                  <span className="text-muted-foreground">Lookup Path:</span>
                  <span className={
                    diagnostics.lookupPath === 'juso-resolved' ? 'text-green-600' : 
                    diagnostics.lookupPath === 'manual-override' ? 'text-blue-600' : 
                    diagnostics.lookupPath === 'configured' ? 'text-green-600' :
                    diagnostics.lookupPath === 'env-missing' ? 'text-red-600 font-bold' : 
                    diagnostics.lookupPath === 'demo' ? 'text-amber-600' : 
                    diagnostics.lookupPath === 'juso-failed' ? 'text-red-500' :
                    ''
                  }>
                    {diagnostics.lookupPath}
                    {diagnostics.lookupPath === 'juso-failed' && ' (Juso 주소 변환 실패)'}
                    {diagnostics.lookupPath === 'manual-override' && ' (수동 재시도)'}
                  </span>
                  
                  {/* Active preset indicator */}
                  {activePreset && (
                    <>
                      <span className="text-muted-foreground">Active Preset:</span>
                      <span className="text-blue-600 font-medium">{activePreset}</span>
                    </>
                  )}
                  
                  {/* Retry count */}
                  <span className="text-muted-foreground">Retry Count:</span>
                  <span className="text-blue-600 font-medium">{retryCount}</span>
                  
                  {/* Last retry params (client state) */}
                  {lastRetryParams && (
                    <>
                      <span className="text-muted-foreground">Last Retry (client):</span>
                      <span className="text-purple-600 font-mono">
                        bun={lastRetryParams.bun}, ji={lastRetryParams.ji}
                      </span>
                    </>
                  )}
                  
                  {/* Manual override values from API response */}
                  {diagnostics.manualOverride && (
                    <>
                      <span className="text-muted-foreground">Raw Mode:</span>
                      <span className={diagnostics.manualOverride.rawMode ? 'text-orange-600 font-medium' : 'text-gray-500'}>
                        {diagnostics.manualOverride.rawMode ? 'Yes (no padding)' : 'No (padded)'}
                      </span>
                      
                      {diagnostics.manualOverride.rawBun && (
                        <>
                          <span className="text-muted-foreground">Raw bun/ji:</span>
                          <span className="text-orange-600 font-mono">
                            {diagnostics.manualOverride.rawBun} / {diagnostics.manualOverride.rawJi}
                          </span>
                        </>
                      )}
                      
                      <span className="text-muted-foreground">Sent bun/ji (API):</span>
                      <span className="text-blue-600 font-mono">
                        {diagnostics.manualOverride.bun} / {diagnostics.manualOverride.ji}
                      </span>
                    </>
                  )}
                  
                  <span className="text-muted-foreground">MOLIT Key:</span>
                  <span className={diagnostics.config.molitApiKey ? 'text-green-600' : 'text-red-500'}>
                    {diagnostics.config.molitApiKey ? '설정됨' : '미설정'}
                  </span>
                  
                  <span className="text-muted-foreground">JUSO Key:</span>
                  <span className={diagnostics.config.jusoApiKey ? 'text-green-600' : 'text-red-500'}>
                    {diagnostics.config.jusoApiKey ? '설정됨' : '미설정'}
                  </span>
                  
                  {diagnostics.requestParams && (
                    <>
                      <span className="text-muted-foreground">시군구코드:</span>
                      <span>{diagnostics.requestParams.sigunguCd}</span>
                      
                      <span className="text-muted-foreground">법정동코드:</span>
                      <span>{diagnostics.requestParams.bjdongCd}</span>
                      
                      <span className="text-muted-foreground">번/지:</span>
                      <span>{diagnostics.requestParams.bun}-{diagnostics.requestParams.ji}</span>
                    </>
                  )}
                  
                  {diagnostics.apiResponse && (
                    <>
                      <span className="text-muted-foreground">API Status:</span>
                      <span className={
                        diagnostics.apiResponse.status === 'success-with-data' ? 'text-green-600' :
                        diagnostics.apiResponse.status === 'success-empty' ? 'text-amber-600' :
                        diagnostics.apiResponse.status === 'auth-error' ? 'text-red-500' :
                        ''
                      }>
                        {diagnostics.apiResponse.status}
                        {diagnostics.apiResponse.totalCount !== undefined && ` (${diagnostics.apiResponse.totalCount}건)`}
                      </span>
                      
                      {diagnostics.apiResponse.message && (
                        <>
                          <span className="text-muted-foreground">Message:</span>
                          <span>{diagnostics.apiResponse.message}</span>
                        </>
                      )}
                    </>
                  )}
                  
                  {diagnostics.attemptsCount !== undefined && (
                    <>
                      <span className="text-muted-foreground">시도 횟수:</span>
                      <span>{diagnostics.attemptsCount}회</span>
                    </>
                  )}
                  
                  {diagnostics.molitEndpoints && (
                    <>
                      <span className="text-muted-foreground col-span-2 mt-2 font-semibold border-t pt-2">
                        MOLIT Endpoints:
                      </span>
                      
                      <span className="text-muted-foreground">사용된 endpoint:</span>
                      <span className={diagnostics.molitEndpoints.endpointUsed !== 'none' ? 'text-green-600' : 'text-red-500'}>
                        {diagnostics.molitEndpoints.endpointUsed}
                      </span>
                      
                      <span className="text-muted-foreground">대장 유형:</span>
                      <span className={
                        diagnostics.molitEndpoints.familyUsed === 'current' ? 'text-green-600' :
                        diagnostics.molitEndpoints.familyUsed === 'closed' ? 'text-amber-600' :
                        diagnostics.molitEndpoints.familyUsed === 'supplementary' ? 'text-blue-600' :
                        'text-red-500'
                      }>
                        {diagnostics.molitEndpoints.familyUsed === 'current' && '현재대장'}
                        {diagnostics.molitEndpoints.familyUsed === 'closed' && '폐쇄대장'}
                        {diagnostics.molitEndpoints.familyUsed === 'supplementary' && '부속지번'}
                        {diagnostics.molitEndpoints.familyUsed === 'none' && '없음'}
                      </span>
                      
                      {/* Sent values debug */}
                      {diagnostics.molitEndpoints.sentValues && (
                        <>
                          <span className="text-muted-foreground col-span-2 mt-1 text-[10px] font-medium">
                            Sent Values (leading zeros preserved?):
                          </span>
                          <span className="text-muted-foreground pl-2">sigunguCd:</span>
                          <span className="text-[11px]">{diagnostics.molitEndpoints.sentValues.sigunguCd}</span>
                          <span className="text-muted-foreground pl-2">bjdongCd:</span>
                          <span className="text-[11px]">{diagnostics.molitEndpoints.sentValues.bjdongCd}</span>
                          <span className="text-muted-foreground pl-2">bun:</span>
                          <span className={`text-[11px] ${diagnostics.molitEndpoints.sentValues.bunLeadingZero ? 'text-green-600' : 'text-red-500'}`}>
                            {diagnostics.molitEndpoints.sentValues.bun} 
                            {diagnostics.molitEndpoints.sentValues.bunLeadingZero ? ' (zeros OK)' : ' (NO leading zero!)'}
                          </span>
                          <span className="text-muted-foreground pl-2">ji:</span>
                          <span className={`text-[11px] ${diagnostics.molitEndpoints.sentValues.jiLeadingZero ? 'text-green-600' : 'text-red-500'}`}>
                            {diagnostics.molitEndpoints.sentValues.ji}
                            {diagnostics.molitEndpoints.sentValues.jiLeadingZero ? ' (zeros OK)' : ' (NO leading zero!)'}
                          </span>
                        </>
                      )}
                      
                      <span className="text-muted-foreground col-span-2 mt-1 text-[10px] font-medium">
                        Endpoint Results (requestId={requestId}):
                      </span>
                      
                      {diagnostics.molitEndpoints.attempted.map((ep, idx) => (
                        <div key={`${requestId}-${idx}`} className="col-span-2 pl-2 text-[10px] space-y-1 border-b border-dashed pb-2 mb-2">
                          {/* Endpoint header */}
                          <div className="flex gap-2 items-center flex-wrap">
                            <span className={`px-1 rounded text-[9px] font-medium ${
                              ep.status === 'success-with-data' ? 'bg-green-100 text-green-700' : 
                              ep.status === 'success-empty' ? 'bg-amber-100 text-amber-700' : 
                              ep.status === 'upstream-error' ? 'bg-red-200 text-red-800' :
                              ep.status === 'parse-error' ? 'bg-purple-100 text-purple-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {ep.status}
                            </span>
                            <span className="font-semibold">{ep.name}</span>
                            <span className={`text-[9px] px-1 rounded ${
                              ep.debug?.platGbCd === 'omitted' ? 'bg-purple-100 text-purple-700' :
                              ep.debug?.platGbCd === '1' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              platGbCd={ep.debug?.platGbCd || '0'}
                            </span>
                          </div>
                          
                          {/* Request URL - copyable */}
                          {ep.debug?.requestUrl && (
                            <div className="text-[9px] bg-muted/50 p-1 rounded break-all font-mono">
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-muted-foreground">URL:</span>
                                <button 
                                  type="button"
                                  className="text-[8px] text-blue-600 hover:underline shrink-0"
                                  onClick={() => navigator.clipboard.writeText(ep.debug?.requestUrl || '')}
                                >
                                  복사
                                </button>
                              </div>
                              <div className="text-foreground">{ep.debug.requestUrl}</div>
                            </div>
                          )}
                          
                          {/* HTTP Status & statusText */}
                          <div className="flex gap-4 text-[9px] flex-wrap">
                            {ep.debug?.httpStatus !== undefined && (
                              <span>
                                <span className="text-muted-foreground">Upstream HTTP:</span>{' '}
                                <span className={ep.debug.httpStatus === 200 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                  {ep.debug.httpStatus}
                                </span>
                                {ep.debug.statusText && (
                                  <span className="text-muted-foreground ml-1">({ep.debug.statusText})</span>
                                )}
                              </span>
                            )}
                          </div>
                          
                          {/* Result Code & Message - only show if parsed */}
                          {ep.debug?.resultCode && ep.debug.resultCode !== 'PARSE_SKIPPED' && (
                            <div className="flex gap-4 text-[9px] flex-wrap">
                              <span>
                                <span className="text-muted-foreground">resultCode:</span>{' '}
                                <span className={ep.debug.resultCode === '00' ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>
                                  {ep.debug.resultCode}
                                </span>
                              </span>
                              {ep.debug?.resultMsg && (
                                <span className="text-muted-foreground">msg: {ep.debug.resultMsg}</span>
                              )}
                            </div>
                          )}
                          {ep.debug?.resultCode === 'PARSE_SKIPPED' && (
                            <div className="text-[9px] text-purple-600">
                              resultCode: PARSE_SKIPPED (응답 body가 없거나 파싱 불가)
                            </div>
                          )}
                          
                          {/* Counts - only show if HTTP 200 and valid response */}
                          {ep.debug?.httpStatus === 200 && ep.debug?.totalCount !== undefined && (
                            <div className="flex gap-4 text-[9px]">
                              <span>
                                <span className="text-muted-foreground">totalCount:</span>{' '}
                                <span className={ep.debug.totalCount > 0 ? 'text-green-600 font-semibold' : 'text-amber-600'}>
                                  {ep.debug.totalCount}
                                </span>
                              </span>
                              {ep.debug?.itemsLength !== undefined && (
                                <span>
                                  <span className="text-muted-foreground">items.length:</span>{' '}
                                  <span className={ep.debug.itemsLength > 0 ? 'text-green-600 font-semibold' : 'text-amber-600'}>
                                    {ep.debug.itemsLength}
                                  </span>
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Response Headers - expandable */}
                          {ep.debug?.responseHeaders && (
                            <details className="text-[9px]">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                Response Headers
                              </summary>
                              <pre className="mt-1 bg-muted/30 p-1 rounded text-[8px] whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
                                {ep.debug.responseHeaders}
                              </pre>
                            </details>
                          )}
                          
                          {/* Raw Response Preview - ALWAYS EXPANDED */}
                          {ep.debug?.rawResponsePreview && (
                            <div className="text-[9px] mt-1">
                              <div className="text-muted-foreground font-medium mb-1">Raw Response (앞 500자):</div>
                              <pre className="bg-muted/50 p-2 rounded overflow-x-auto text-[8px] whitespace-pre-wrap break-all max-h-48 overflow-y-auto border">
                                {ep.debug.rawResponsePreview}
                              </pre>
                            </div>
                          )}
                          
                          {ep.message && (
                            <div className="text-[9px] text-muted-foreground">
                              message: {ep.message}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Supplementary parcels */}
                      {diagnostics.molitEndpoints.supplementaryParcels && diagnostics.molitEndpoints.supplementaryParcels.length > 0 && (
                        <>
                          <span className="text-muted-foreground col-span-2 mt-1 text-[10px] font-medium border-t pt-1">
                            부속지번 목록 (대표지번 후보):
                          </span>
                          {diagnostics.molitEndpoints.supplementaryParcels.map((parcel, idx) => (
                            <div key={idx} className="col-span-2 pl-2 text-[10px] text-blue-600">
                              {idx + 1}. bun={parcel.bun}, ji={parcel.ji}
                              {parcel.regstrGbCd && <span className="text-muted-foreground ml-2">(등기: {parcel.regstrGbCd})</span>}
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                  
                  {diagnostics.stoppedAt && (
                    <>
                      <span className="text-muted-foreground">Stopped At:</span>
                      <span className={diagnostics.stoppedAt === 'complete' ? 'text-green-600' : 'text-red-500'}>
                        {diagnostics.stoppedAt}
                      </span>
                    </>
                  )}
                  
                  {/* Client-side full raw response - critical for debugging */}
                  {diagnostics.clientRawResponse && (
                    <>
                      <span className="text-muted-foreground col-span-2 mt-2 font-bold border-t pt-2 text-red-600">
                        전체 API 응답 원문 (앱 서버 → 클라이언트):
                      </span>
                      <div className="col-span-2">
                        <pre className="bg-red-50 dark:bg-red-950/30 p-2 rounded border border-red-200 dark:border-red-800 overflow-x-auto text-[9px] whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                          {diagnostics.clientRawResponse}
                        </pre>
                      </div>
                    </>
                  )}
                  
                  {diagnostics.jusoResult && (
                    <>
                      <span className="text-muted-foreground col-span-2 mt-2 font-semibold border-t pt-2">
                        Juso API 상세:
                      </span>
                      
                      <span className="text-muted-foreground">인증 결과:</span>
                      <span className={diagnostics.jusoResult.success ? 'text-green-600' : 'text-red-500'}>
                        {diagnostics.jusoResult.success ? '성공' : '실패'}
                      </span>
                      
                      {diagnostics.jusoResult.error && (
                        <>
                          <span className="text-muted-foreground">오류:</span>
                          <span className="text-red-500 break-all">{diagnostics.jusoResult.error}</span>
                        </>
                      )}
                      
                      {diagnostics.jusoResult.rawResponse && (
                        <>
                          <span className="text-muted-foreground">Request URL:</span>
                          <span className="truncate text-[10px] break-all">{diagnostics.jusoResult.rawResponse.requestUrl}</span>
                          
                          <span className="text-muted-foreground">HTTP Status:</span>
                          <span>{diagnostics.jusoResult.rawResponse.httpStatus}</span>
                          
                          {diagnostics.jusoResult.rawResponse.errorCode && (
                            <>
                              <span className="text-muted-foreground">Error Code:</span>
                              <span className="text-red-500">{diagnostics.jusoResult.rawResponse.errorCode}</span>
                            </>
                          )}
                          
                          {diagnostics.jusoResult.rawResponse.errorMessage && (
                            <>
                              <span className="text-muted-foreground">Error Msg:</span>
                              <span className="text-red-500 break-all">{diagnostics.jusoResult.rawResponse.errorMessage}</span>
                            </>
                          )}
                          
                          {diagnostics.jusoResult.rawResponse.roadAddr && (
                            <>
                              <span className="text-muted-foreground">Road Addr:</span>
                              <span className="break-all text-[11px]">{diagnostics.jusoResult.rawResponse.roadAddr}</span>
                            </>
                          )}
                        </>
                      )}
                      
                      {diagnostics.jusoResult.jibunAddr && (
                        <>
                          <span className="text-muted-foreground">Jibun Addr:</span>
                          <span className="break-all text-[11px]">{diagnostics.jusoResult.jibunAddr}</span>
                        </>
                      )}
                      
                      {diagnostics.jusoResult.bdMgtSn && (
                        <>
                          <span className="text-muted-foreground">bdMgtSn:</span>
                          <span className="break-all font-mono text-[10px]">{diagnostics.jusoResult.bdMgtSn}</span>
                        </>
                      )}
                      
                      {diagnostics.jusoResult.extractedCodes && (
                        <>
                          <span className="text-muted-foreground col-span-2 mt-2 font-semibold border-t pt-2">
                            추출된 코드:
                          </span>
                          <span className="text-muted-foreground">sigunguCd:</span>
                          <span>{diagnostics.jusoResult.extractedCodes.sigunguCd}</span>
                          <span className="text-muted-foreground">bjdongCd:</span>
                          <span>{diagnostics.jusoResult.extractedCodes.bjdongCd}</span>
                          <span className="text-muted-foreground">bun:</span>
                          <span>{diagnostics.jusoResult.extractedCodes.bun}</span>
                          <span className="text-muted-foreground">ji:</span>
                          <span>{diagnostics.jusoResult.extractedCodes.ji}</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
