import { ZoneType } from "./regulation-types"

export interface AllowedUse {
  category: string
  allowed: boolean
  note?: string
}

export interface ZoneAllowedUses {
  zoneName: string
  summary: string
  mainUses: string[] // 주요 허용 용도
  conditionalUses: string[] // 조건부 허용
  prohibitedUses: string[] // 불가 용도
  details: AllowedUse[]
  tip: string // 실무 팁
}

export const ZONE_ALLOWED_USES: Record<string, ZoneAllowedUses> = {
  "residential-exclusive-1": {
    zoneName: "제1종 전용주거지역",
    summary: "저층 단독주택 중심의 양호한 주거환경 보호",
    mainUses: ["단독주택", "다가구주택", "공관"],
    conditionalUses: ["근린생활시설(소규모)", "교육연구시설(초등학교)", "노유자시설"],
    prohibitedUses: ["공동주택(아파트, 연립)", "오피스텔", "상가", "숙박시설", "공장", "창고"],
    details: [
      { category: "단독주택", allowed: true },
      { category: "다가구주택", allowed: true },
      { category: "공동주택(아파트)", allowed: false },
      { category: "공동주택(연립/다세대)", allowed: false },
      { category: "제1종 근린생활시설", allowed: true, note: "일부 (슈퍼, 의원 등)" },
      { category: "제2종 근린생활시설", allowed: false },
      { category: "판매시설", allowed: false },
      { category: "업무시설(오피스텔)", allowed: false },
      { category: "숙박시설", allowed: false },
      { category: "종교시설", allowed: true },
      { category: "교육연구시설", allowed: true, note: "초등학교, 유치원" },
      { category: "노유자시설", allowed: true },
    ],
    tip: "4층 이하, 건폐율 50%, 용적률 100% 이하. 단독주택지 재건축 외 개발 가능성이 제한적입니다."
  },

  "residential-exclusive-2": {
    zoneName: "제2종 전용주거지역",
    summary: "중저층 주택 중심의 양호한 주거환경 보호",
    mainUses: ["단독주택", "다가구주택", "공동주택(아파트 제외)"],
    conditionalUses: ["근린생활시설(소규모)", "종교시설", "교육연구시설"],
    prohibitedUses: ["아파트", "오피스텔", "판매시설", "숙박시설", "공장"],
    details: [
      { category: "단독주택", allowed: true },
      { category: "공동주택(연립/다세대)", allowed: true },
      { category: "공동주택(아파트)", allowed: false },
      { category: "제1종 근린생활시설", allowed: true, note: "일부" },
      { category: "제2종 근린생활시설", allowed: false },
      { category: "업무시설(오피스텔)", allowed: false },
      { category: "판매시설", allowed: false },
    ],
    tip: "건폐율 50%, 용적률 150% 이하. 연립/다세대 주택 개발에 적합합니다."
  },

  "residential-1": {
    zoneName: "제1종 일반주거지역",
    summary: "저층 주택 중심의 편리한 주거환경 조성",
    mainUses: ["단독주택", "다가구주택", "공동주택(4층 이하)"],
    conditionalUses: ["근린생활시설", "종교시설", "교육연구시설", "노유자시설"],
    prohibitedUses: ["5층 이상 공동주택", "오피스텔", "판매시설", "숙박시설", "공장"],
    details: [
      { category: "단독주택", allowed: true },
      { category: "공동주택(4층 이하)", allowed: true },
      { category: "공동주택(5층 이상)", allowed: false },
      { category: "제1종 근린생활시설", allowed: true },
      { category: "제2종 근린생활시설", allowed: true, note: "일부 업종" },
      { category: "업무시설(오피스텔)", allowed: false },
      { category: "판매시설", allowed: false },
      { category: "의료시설", allowed: true, note: "병원" },
      { category: "교육연구시설", allowed: true },
      { category: "노유자시설", allowed: true },
    ],
    tip: "건폐율 60%, 용적률 200% 이하. 4층 이하 다세대·빌라 개발에 적합합니다."
  },

  "residential-2": {
    zoneName: "제2종 일반주거지역",
    summary: "중층 주택 중심의 주거환경 조성",
    mainUses: ["단독주택", "공동주택(아파트 포함)", "근린생활시설"],
    conditionalUses: ["종교시설", "교육연구시설", "의료시설", "운동시설"],
    prohibitedUses: ["오피스텔", "대규모 판매시설", "숙박시설", "공장", "위험물저장시설"],
    details: [
      { category: "단독주택", allowed: true },
      { category: "공동주택(아파트)", allowed: true },
      { category: "공동주택(연립/다세대)", allowed: true },
      { category: "제1종 근린생활시설", allowed: true },
      { category: "제2종 근린생활시설", allowed: true },
      { category: "업무시설(오피스텔)", allowed: false, note: "조례에 따라 일부 허용 가능" },
      { category: "판매시설", allowed: false, note: "1,000㎡ 미만 가능한 지자체 있음" },
      { category: "숙박시설", allowed: false },
      { category: "의료시설", allowed: true },
      { category: "교육연구시설", allowed: true },
      { category: "종교시설", allowed: true },
      { category: "운동시설", allowed: true },
    ],
    tip: "건폐율 60%, 용적률 250% 이하. 아파트·주상복합 개발의 가장 보편적인 용도지역입니다."
  },

  "residential-3": {
    zoneName: "제3종 일반주거지역",
    summary: "중고층 주택 중심의 주거환경 조성",
    mainUses: ["공동주택(아파트)", "단독주택", "근린생활시설", "업무시설(일부)"],
    conditionalUses: ["판매시설(소규모)", "의료시설", "교육연구시설", "업무시설"],
    prohibitedUses: ["대규모 판매시설", "숙박시설", "위락시설", "공장"],
    details: [
      { category: "단독주택", allowed: true },
      { category: "공동주택(아파트)", allowed: true },
      { category: "제1종 근린생활시설", allowed: true },
      { category: "제2종 근린생활시설", allowed: true },
      { category: "업무시설(오피스텔)", allowed: true, note: "지자체 조례에 따라" },
      { category: "판매시설", allowed: true, note: "1,000㎡ 미만" },
      { category: "의료시설", allowed: true },
      { category: "숙박시설", allowed: false },
      { category: "교육연구시설", allowed: true },
      { category: "종교시설", allowed: true },
    ],
    tip: "건폐율 50%, 용적률 300% 이하. 고층 아파트, 주상복합, 오피스텔 개발이 가능합니다."
  },

  "semi-residential": {
    zoneName: "준주거지역",
    summary: "주거와 상업 기능이 혼재하는 지역",
    mainUses: ["공동주택(아파트)", "오피스텔", "근린생활시설", "판매시설", "업무시설"],
    conditionalUses: ["숙박시설", "위락시설(일부)", "의료시설", "문화/집회시설"],
    prohibitedUses: ["공장(일부)", "위험물저장시설", "묘지관련시설"],
    details: [
      { category: "단독주택", allowed: true },
      { category: "공동주택(아파트)", allowed: true },
      { category: "제1종 근린생활시설", allowed: true },
      { category: "제2종 근린생활시설", allowed: true },
      { category: "업무시설(오피스텔)", allowed: true },
      { category: "판매시설", allowed: true },
      { category: "숙박시설", allowed: true, note: "일반숙박 가능" },
      { category: "의료시설", allowed: true },
      { category: "위락시설", allowed: true, note: "일부" },
      { category: "문화/집회시설", allowed: true },
      { category: "운동시설", allowed: true },
    ],
    tip: "건폐율 70%, 용적률 500% 이하. 주상복합, 오피스텔, 상가 복합 개발에 최적입니다."
  },

  "commercial-neighborhood": {
    zoneName: "근린상업지역",
    summary: "근린지역 주민의 일상적 서비스 제공",
    mainUses: ["근린생활시설", "판매시설", "업무시설", "공동주택", "오피스텔"],
    conditionalUses: ["숙박시설", "위락시설", "의료시설", "문화/집회시설"],
    prohibitedUses: ["공장(일부)", "위험물저장시설"],
    details: [
      { category: "공동주택(아파트)", allowed: true },
      { category: "근린생활시설", allowed: true },
      { category: "업무시설(오피스텔)", allowed: true },
      { category: "판매시설", allowed: true },
      { category: "숙박시설", allowed: true },
      { category: "의료시설", allowed: true },
      { category: "위락시설", allowed: true },
      { category: "문화/집회시설", allowed: true },
      { category: "운동시설", allowed: true },
    ],
    tip: "건폐율 70%, 용적률 900% 이하. 상가, 오피스텔, 주상복합 모두 가능합니다."
  },

  "commercial-general": {
    zoneName: "일반상업지역",
    summary: "일반적인 상업 및 업무 기능 담당",
    mainUses: ["판매시설", "업무시설", "오피스텔", "근린생활시설", "공동주택", "숙박시설"],
    conditionalUses: ["위락시설", "공장(소규모)"],
    prohibitedUses: ["위험물저장시설(대규모)"],
    details: [
      { category: "공동주택(아파트)", allowed: true },
      { category: "근린생활시설", allowed: true },
      { category: "업무시설(오피스텔)", allowed: true },
      { category: "판매시설", allowed: true },
      { category: "숙박시설", allowed: true },
      { category: "의료시설", allowed: true },
      { category: "위락시설", allowed: true },
      { category: "문화/집회시설", allowed: true },
      { category: "운동시설", allowed: true },
      { category: "공장(소규모)", allowed: true, note: "도시형 제조업" },
    ],
    tip: "건폐율 80%, 용적률 1,300% 이하. 거의 모든 용도가 가능한 최고의 개발 용지입니다."
  },

  "commercial-central": {
    zoneName: "중심상업지역",
    summary: "도심·부도심의 핵심 상업·업무 기능",
    mainUses: ["판매시설", "업무시설", "오피스텔", "숙박시설", "문화/집회시설", "공동주택"],
    conditionalUses: ["위락시설", "공장(소규모)"],
    prohibitedUses: ["위험물저장시설"],
    details: [
      { category: "공동주택(아파트)", allowed: true },
      { category: "근린생활시설", allowed: true },
      { category: "업무시설(오피스텔)", allowed: true },
      { category: "판매시설", allowed: true },
      { category: "숙박시설", allowed: true },
      { category: "의료시설", allowed: true },
      { category: "위락시설", allowed: true },
      { category: "문화/집회시설", allowed: true },
    ],
    tip: "건폐율 90%, 용적률 1,500% 이하. 초고층 복합개발이 가능한 최상위 상업지역입니다."
  },

  "industrial": {
    zoneName: "준공업지역",
    summary: "공업과 주거·상업이 혼재 가능한 지역",
    mainUses: ["공장", "창고", "근린생활시설", "업무시설"],
    conditionalUses: ["공동주택(아파트)", "판매시설", "숙박시설"],
    prohibitedUses: ["위락시설(일부)"],
    details: [
      { category: "공동주택(아파트)", allowed: true, note: "지구단위계획 등 조건부" },
      { category: "근린생활시설", allowed: true },
      { category: "업무시설(오피스텔)", allowed: true },
      { category: "판매시설", allowed: true },
      { category: "공장", allowed: true },
      { category: "창고시설", allowed: true },
    ],
    tip: "건폐율 70%, 용적률 400% 이하. 지식산업센터, 공장→주거 전환 개발 등이 활발합니다."
  },

  "industrial-general": {
    zoneName: "일반공업지역",
    summary: "환경을 저해하지 않는 공업의 배치",
    mainUses: ["공장", "창고", "근린생활시설(일부)"],
    conditionalUses: ["업무시설"],
    prohibitedUses: ["공동주택", "숙박시설", "위락시설"],
    details: [
      { category: "공동주택(아파트)", allowed: false },
      { category: "근린생활시설", allowed: true, note: "일부" },
      { category: "업무시설", allowed: true, note: "일부" },
      { category: "공장", allowed: true },
      { category: "창고시설", allowed: true },
      { category: "판매시설", allowed: false },
      { category: "숙박시설", allowed: false },
    ],
    tip: "건폐율 70%, 용적률 350% 이하. 주거 개발이 불가하여 공장·물류시설 중심입니다."
  },

  "green-natural": {
    zoneName: "자연녹지지역",
    summary: "녹지공간 보전, 제한적 개발만 허용",
    mainUses: ["단독주택(제한적)", "농업시설"],
    conditionalUses: ["근린생활시설(소규모)", "종교시설", "교육연구시설"],
    prohibitedUses: ["공동주택(아파트)", "판매시설", "업무시설", "공장", "숙박시설"],
    details: [
      { category: "단독주택", allowed: true, note: "제한적" },
      { category: "공동주택(아파트)", allowed: false },
      { category: "근린생활시설", allowed: true, note: "소규모" },
      { category: "업무시설", allowed: false },
      { category: "판매시설", allowed: false },
      { category: "숙박시설", allowed: false },
      { category: "교육연구시설", allowed: true, note: "학교" },
    ],
    tip: "건폐율 20%, 용적률 100% 이하. 개발이 매우 제한적이므로 토지 매입 전 반드시 확인하세요."
  },
}

// 한글 용도지역명으로도 조회 가능하게 매핑
export function getZoneAllowedUses(zoneType: string): ZoneAllowedUses | null {
  // 영문 키로 직접 매칭
  if (ZONE_ALLOWED_USES[zoneType]) return ZONE_ALLOWED_USES[zoneType]
  
  // 한글명으로 매칭
  const koreanMap: Record<string, string> = {
    "제1종전용주거지역": "residential-exclusive-1",
    "제1종 전용주거지역": "residential-exclusive-1",
    "제2종전용주거지역": "residential-exclusive-2",
    "제2종 전용주거지역": "residential-exclusive-2",
    "제1종일반주거지역": "residential-1",
    "제1종 일반주거지역": "residential-1",
    "제2종일반주거지역": "residential-2",
    "제2종 일반주거지역": "residential-2",
    "제3종일반주거지역": "residential-3",
    "제3종 일반주거지역": "residential-3",
    "준주거지역": "semi-residential",
    "근린상업지역": "commercial-neighborhood",
    "일반상업지역": "commercial-general",
    "중심상업지역": "commercial-central",
    "준공업지역": "industrial",
    "일반공업지역": "industrial-general",
    "자연녹지지역": "green-natural",
  }
  
  const key = koreanMap[zoneType]
  return key ? ZONE_ALLOWED_USES[key] : null
}
