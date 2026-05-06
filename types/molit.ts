/**
 * MOLIT (국토교통부) API Types
 * @version STABLE-v194 | Phase 1 Integration
 * 
 * Types for building/land information lookup from public APIs:
 * - 건축물대장 (Building Register)
 * - 토지대장 (Land Register)
 * - 도로명주소 (Road Name Address)
 */

// ============================================
// Raw API Response Types (from MOLIT OpenAPI)
// ============================================

/**
 * 건축물대장 기본개요 API Response Item
 * Building Register Basic Overview
 */
export interface MolitBuildingBasicItem {
  // 위치 정보
  sigunguCd?: string       // 시군구코드
  bjdongCd?: string        // 법정동코드
  platGbCd?: string        // 대지구분코드 (0:대지, 1:산, 2:블록)
  bun?: string             // 번
  ji?: string              // 지
  
  // 건물 정보
  bldNm?: string           // 건물명
  mainPurpsCdNm?: string   // 주용도코드명
  etcPurps?: string        // 기타용도
  
  // 면적 정보
  platArea?: number        // 대지면적 (㎡)
  archArea?: number        // 건축면적 (㎡)
  totArea?: number         // 연면적 (㎡)
  bcRat?: number           // 건폐율 (%)
  vlRat?: number           // 용적률 (%)
  
  // 층수/세대 정보
  grndFlrCnt?: number      // 지상층수
  ugrndFlrCnt?: number     // 지하층수
  hhldCnt?: number         // 세대수
  hoCnt?: number           // 호수
  
  // 주차 정보
  indrMechUtcnt?: number   // 옥내기계식주차대수
  indrMechArea?: number    // 옥내기계식주차면적
  oudrMechUtcnt?: number   // 옥외기계식주차대수
  oudrMechArea?: number    // 옥외기계식주차면적
  indrAutoUtcnt?: number   // 옥내자주식주차대수
  indrAutoArea?: number    // 옥내자주식주차면적
  oudrAutoUtcnt?: number   // 옥외자주식주차대수
  oudrAutoArea?: number    // 옥외자주식주차면적
  
  // 주소
  platPlc?: string         // 대지위치
  newPlatPlc?: string      // 도로명대지위치
  
  // 지역지구
  jiyukCdNm?: string       // 지역코드명
  jiguCdNm?: string        // 지구코드명
  guyukCdNm?: string       // 구역코드명
  
  // 날짜
  crtnDay?: string         // 생성일자
  regstrGbCdNm?: string    // 대장구분코드명
  regstrKindCdNm?: string  // 대장종류코드명
}

/**
 * 토지대장 API Response Item
 * Land Register
 */
export interface MolitLandItem {
  sigunguCd?: string       // 시군구코드
  bjdongCd?: string        // 법정동코드
  platGbCd?: string        // 대지구분코드
  bun?: string             // 번
  ji?: string              // 지
  
  lndcgrCdNm?: string      // 지목코드명
  lndpclAr?: number        // 토지면적 (㎡)
  pblntfPclnd?: number     // 공시지가 (원/㎡)
  
  jimok?: string           // 지목
  prposArea1Nm?: string    // 용도지역1명
  prposArea2Nm?: string    // 용도지역2명
  ladUseSittn?: string     // 토지이용상황
}

/**
 * 도로명주소 API Response Item
 */
export interface MolitAddressItem {
  roadAddr?: string        // 전체 도로명주소
  roadAddrPart1?: string   // 도로명주소(참고항목 제외)
  roadAddrPart2?: string   // 참고항목
  jibunAddr?: string       // 지번주소
  engAddr?: string         // 영문주소
  zipNo?: string           // 우편번호
  
  admCd?: string           // 행정구역코드
  rnMgtSn?: string         // 도로명코드
  bdMgtSn?: string         // 건물관리번호
  detBdNmList?: string     // 상세건물명
  bdNm?: string            // 건물명
  bdKdcd?: string          // 공동주택여부 (1:공동주택, 0:비공동주택)
  
  siNm?: string            // 시도명
  sggNm?: string           // 시군구명
  emdNm?: string           // 읍면동명
  liNm?: string            // 리명
  rn?: string              // 도로명
  udrtYn?: string          // 지하여부 (0:지상, 1:지하)
  buldMnnm?: number        // 건물본번
  buldSlno?: number        // 건물부번
  mtYn?: string            // 산여부 (0:대지, 1:산)
  lnbrMnnm?: number        // 지번본번(번지)
  lnbrSlno?: number        // 지번부번(호)
}

// ============================================
// API Response Wrappers
// ============================================

export interface MolitApiResponse<T> {
  response: {
    header: {
      resultCode: string   // "00" = success
      resultMsg: string
    }
    body: {
      items?: {
        item: T | T[]
      }
      totalCount: number
      pageNo: number
      numOfRows: number
    }
  }
}

// ============================================
// Mapped App Types (for form prefill)
// ============================================

/**
 * Normalized site data for app form prefill
 * All fields are optional - API may not return all values
 */
export interface MolitSiteData {
  // Address
  address?: string           // 대지위치 (지번주소)
  roadAddress?: string       // 도로명주소
  
  // Location codes
  sigunguCode?: string       // 시군구코드
  bjdongCode?: string        // 법정동코드
  bun?: string               // 번
  ji?: string                // 지
  
  // Building info
  buildingName?: string      // 건물명
  mainPurpose?: string       // 주용도
  
  // Area info (in ㎡)
  siteArea?: number          // 대지면적
  buildingArea?: number      // 건축면적
  totalFloorArea?: number    // 연면적
  
  // Coverage/FAR
  buildingCoverage?: number  // 건폐율 (%)
  floorAreaRatio?: number    // 용적률 (%)
  
  // Floors
  groundFloors?: number      // 지상층수
  basementFloors?: number    // 지하층수
  
  // Units
  householdCount?: number    // 세대수
  unitCount?: number         // 호수
  
  // Parking
  parkingCount?: number      // 총 주차대수
  
  // Zoning
  zoneType?: string          // 지역 (용도지역)
  district?: string          // 지구
  area?: string              // 구역
  overlappingRegulations?: {
    name: string
    category: string
    coverageOverride?: number
    farOverride?: number
    heightLimit?: number
    floorLimit?: number
    severity: 'critical' | 'high' | 'medium' | 'info'
    description?: string
  }[]
  
  // Meta
  dataSource?: 'building' | 'land' | 'address'
  fetchedAt?: string
  // 건물 입구 좌표 (JUSO API detail=Y에서 파싱)
  entX?: number   // 경도 (longitude, WGS84)
  entY?: number   // 위도 (latitude, WGS84)
  // 필지 폴리곤 (VWorld LP_PA_CBND_BUBUN에서 가져온 실제 지적 경계)
  parcelPolygon?: { coords: [number, number][], centroid: [number, number] }
}

/**
 * API lookup request
 */
export interface MolitLookupRequest {
  address: string
  addressType?: 'road' | 'jibun' | 'auto'
  /** Manual parcel override for retry */
  manualParcel?: {
    sigunguCd: string
    bjdongCd: string
    bun: string
    ji: string
  }
}

/**
 * Diagnostic info for debugging lookup issues
 */
export interface MolitDiagnostics {
  /** Which lookup path was used */
  lookupPath: 'demo' | 'juso-resolved' | 'local-parsed' | 'juso-failed' | 'manual-override' | 'none'
  /** API configuration status */
  config: {
    molitApiKey: boolean
    jusoApiKey: boolean
  }
  /** Final values sent to building-register API */
  requestParams?: {
    sigunguCd: string
    bjdongCd: string
    bun: string
    ji: string
  }
  /** Manual parcel override values (if used) */
  manualOverride?: {
    bun: string
    ji: string
    rawBun?: string
    rawJi?: string
    rawMode?: boolean
  }
  /** API response details */
  apiResponse?: {
    status: 'success-with-data' | 'success-empty' | 'invalid-request' | 'auth-error' | 'network-error' | 'parse-error' | 'not-called'
    message?: string
    totalCount?: number
  }
  /** MOLIT multi-endpoint results */
  molitEndpoints?: {
    /** Which endpoint succeeded (or 'none' if all failed) */
    endpointUsed: string
    /** Which endpoint family was used */
    familyUsed: 'current' | 'closed' | 'supplementary' | 'none'
    /** Results from all attempted endpoints */
    attempted: Array<{
      name: string
      status: string
      totalCount: number
      message?: string
      /** Debug info for request/response */
      debug?: {
        requestUrl?: string
        httpStatus?: number
        resultCode?: string
        resultMsg?: string
      }
    }>
    /** Debug: Verify sent values */
    sentValues?: {
      sigunguCd: string
      bjdongCd: string
      bun: string
      ji: string
      bunLeadingZero: boolean
      jiLeadingZero: boolean
    }
    /** Supplementary parcels found (if any) */
    supplementaryParcels?: Array<{
      bun: string
      ji: string
      regstrGbCd?: string
    }>
  }
  /** Number of lookup attempts made */
  attemptsCount?: number
  /** Juso resolution result */
  jusoResult?: {
    success: boolean
    jibunAddr?: string
    bdMgtSn?: string
    error?: string
    /** Raw Juso API response for debugging */
    rawResponse?: {
      requestUrl?: string
      httpStatus?: number
      errorCode?: string
      errorMessage?: string
      roadAddr?: string
    }
    /** Extracted codes from bdMgtSn */
    extractedCodes?: {
      sigunguCd: string
      bjdongCd: string
      bun: string
      ji: string
    }
  }
  /** Stage where lookup stopped */
  stoppedAt?: 'juso' | 'molit' | 'complete'
  
  /** Environment variable debug info */
  envDebug?: {
    molitKeyLength: number
    jusoKeyLength: number
    molitKeyPreview: string | null
    jusoKeyPreview?: string | null
  }
  
  /** JUSO debug info from debug-single endpoint */
  jusoDebug?: {
    keyPreview?: string
    keyLength?: number
    paramName?: string
    requestUrlPreview?: string
    upstreamHttpStatus?: number
    errorCode?: string
    errorMessage?: string
    diagnosis?: string
    isProduction?: boolean
    hardcodedKeyFull?: string
    currentHost?: string
  }
}

/**
 * API lookup response
 */
export interface MolitLookupResponse {
  success: boolean
  data?: MolitSiteData
  error?: string
  /** True if API key is not configured and demo data is returned */
  isDemo?: boolean
  /** Diagnostic info for debugging */
  diagnostics?: MolitDiagnostics
  rawData?: {
    building?: MolitBuildingBasicItem
    land?: MolitLandItem
    address?: MolitAddressItem
  }
}

// ============================================
// Address Parsing Types
// ============================================

export interface ParsedAddress {
  type: 'road' | 'jibun' | 'unknown'
  
  // Common
  sido?: string              // 시도
  sigungu?: string           // 시군구
  eupmyeondong?: string      // 읍면동
  ri?: string                // 리
  
  // Road address specific
  roadName?: string          // 도로명
  buildingMainNumber?: number // 건물본번
  buildingSubNumber?: number  // 건물부번
  isBasement?: boolean        // 지하여부
  
  // Jibun address specific
  isMountain?: boolean        // 산여부
  jibunMain?: number          // 지번본번 (번)
  jibunSub?: number           // 지번부번 (지)
  
  // Building
  buildingName?: string       // 건물명
  dongName?: string           // 동명
  hoName?: string             // 호명
}
