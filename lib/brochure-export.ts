// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 분양 브로셔 PDF 생성 (5종 스타일)
// jsPDF + html2canvas 클라이언트 생성
// A4 가로 (297×210mm), 5페이지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface BrochureStyle {
  id: string
  name: string
  emoji: string
  desc: string
  suitable: string
  bg: string; bg2: string
  accent: string; accentLight: string
  text: string; textSub: string
  cardBg: string; cardBorder: string
  heroGrad: string
  imgGrad1: string; imgGrad2: string
  intGrad: string[]
  badgeText: string; tableBorder: string; overlay: string
}

export const BROCHURE_STYLES: BrochureStyle[] = [
  {
    id: 'dark-luxury', name: '다크 럭셔리', emoji: '🖤', desc: '블랙 + 골드', suitable: '고급 주거, 펜트하우스',
    bg: '#0D0D0D', bg2: '#1A1A1A', accent: '#C9A96E', accentLight: '#E8D5B0',
    text: '#F5F5F5', textSub: '#AAAAAA', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.08)',
    heroGrad: 'linear-gradient(135deg,#1a2a3a,#0d1520,#1a1a2e)',
    imgGrad1: 'linear-gradient(135deg,#2a4a6a,#1a3050)', imgGrad2: 'linear-gradient(135deg,#3a5a7a,#2a4a6a)',
    intGrad: ['#3a3028,#2a2018', '#3a3830,#2a2820', '#2a3028,#1a2018'],
    badgeText: '#1A1A1A', tableBorder: 'rgba(255,255,255,0.08)', overlay: 'rgba(13,21,32,0.85)',
  },
  {
    id: 'white-minimal', name: '화이트 미니멀', emoji: '🤍', desc: '화이트 + 그레이', suitable: '신혼, 오피스텔',
    bg: '#FFFFFF', bg2: '#F8F8F8', accent: '#333333', accentLight: '#666666',
    text: '#1A1A1A', textSub: '#888888', cardBg: '#F5F5F5', cardBorder: '#E8E8E8',
    heroGrad: 'linear-gradient(135deg,#e8e8e8,#f5f5f5,#ffffff)',
    imgGrad1: 'linear-gradient(135deg,#d0d0d0,#e8e8e8)', imgGrad2: 'linear-gradient(135deg,#c8c8c8,#e0e0e0)',
    intGrad: ['#e8e0d8,#f0e8e0', '#e0e0e0,#f0f0f0', '#d8e0d8,#e8f0e8'],
    badgeText: '#FFFFFF', tableBorder: '#E8E8E8', overlay: 'rgba(255,255,255,0.75)',
  },
  {
    id: 'nature-green', name: '네이처 그린', emoji: '🌿', desc: '베이지 + 그린', suitable: '전원주택, 타운하우스',
    bg: '#F5F0E8', bg2: '#EDE8E0', accent: '#4A7C59', accentLight: '#7BAF8A',
    text: '#2A2A2A', textSub: '#777766', cardBg: 'rgba(74,124,89,0.06)', cardBorder: 'rgba(74,124,89,0.15)',
    heroGrad: 'linear-gradient(135deg,#3a5a3a,#2a4a2a,#1a3a2a)',
    imgGrad1: 'linear-gradient(135deg,#5a8a6a,#4a7a5a)', imgGrad2: 'linear-gradient(135deg,#6a9a7a,#5a8a6a)',
    intGrad: ['#8a7a60,#7a6a50', '#6a7a60,#5a6a50', '#5a6a50,#4a5a40'],
    badgeText: '#FFFFFF', tableBorder: 'rgba(74,124,89,0.15)', overlay: 'rgba(30,50,30,0.80)',
  },
  {
    id: 'urban-modern', name: '어반 모던', emoji: '🏙️', desc: '네이비 + 실버', suitable: '역세권, 주상복합',
    bg: '#0F1923', bg2: '#162030', accent: '#8CA8C8', accentLight: '#B0C8E0',
    text: '#E8EEF4', textSub: '#7A8EA0', cardBg: 'rgba(140,168,200,0.06)', cardBorder: 'rgba(140,168,200,0.15)',
    heroGrad: 'linear-gradient(135deg,#1a2a40,#0f1923,#162038)',
    imgGrad1: 'linear-gradient(135deg,#2a4060,#1a3050)', imgGrad2: 'linear-gradient(135deg,#3a5070,#2a4060)',
    intGrad: ['#2a3040,#1a2030', '#2a2a3a,#1a1a2a', '#1a2a30,#0a1a20'],
    badgeText: '#0F1923', tableBorder: 'rgba(140,168,200,0.12)', overlay: 'rgba(15,25,35,0.85)',
  },
  {
    id: 'hanok-classic', name: '한옥 클래식', emoji: '🏯', desc: '크림 + 진갈색', suitable: '한옥, 전통 지구',
    bg: '#F5EDE0', bg2: '#EDE5D8', accent: '#6B4226', accentLight: '#A07050',
    text: '#2A2015', textSub: '#8A7A6A', cardBg: 'rgba(107,66,38,0.06)', cardBorder: 'rgba(107,66,38,0.15)',
    heroGrad: 'linear-gradient(135deg,#4a3020,#3a2010,#2a1808)',
    imgGrad1: 'linear-gradient(135deg,#8a6a4a,#7a5a3a)', imgGrad2: 'linear-gradient(135deg,#9a7a5a,#8a6a4a)',
    intGrad: ['#7a6040,#6a5030', '#6a5a3a,#5a4a2a', '#5a4a30,#4a3a20'],
    badgeText: '#F5EDE0', tableBorder: 'rgba(107,66,38,0.15)', overlay: 'rgba(42,32,21,0.82)',
  },
]

export interface BrochureData {
  address: string
  projectName?: string
  siteArea: number
  buildingArea?: number
  gfa?: number
  floors: number
  units: number
  parking?: number
  far?: number
  coverage?: number
  zoneType?: string
  maxHeight?: number
  layoutName?: string
  layoutType?: string
  roi?: number
  totalCost?: number
  expectedProfit?: number
  completionDate?: string
  contact?: { phone?: string; email?: string; site?: string }
  // AI 렌더링 이미지 (base64 data URI)
  eyeLevelImage?: string | null
  birdsEyeImage?: string | null
  entranceImage?: string | null
  interiorImage?: string | null
  interiorComparison?: { label: string; image: string }[]
  material?: string
}

function fmt(n: number): string {
  return n.toLocaleString('ko-KR')
}

function fmtBillion(n: number): string {
  return (n / 100000000).toFixed(1) + '억원'
}

// 주소에서 프로젝트명 자동 생성
function autoProjectName(address: string, layoutName?: string): string {
  const parts = address.split(' ')
  const dong = parts.find(p => p.endsWith('동') || p.endsWith('로') || p.endsWith('길'))
  const area = dong || parts.slice(0, 3).join(' ')
  return `${area} 프리미엄 레지던스`
}

export function generateBrochureHtml(data: BrochureData, style: BrochureStyle): string {
  const s = style
  const name = data.projectName || autoProjectName(data.address, data.layoutName)
  const hasEyeLevel = !!data.eyeLevelImage
  const hasBirdsEye = !!data.birdsEyeImage
  const hasEntrance = !!data.entranceImage
  const intComp = data.interiorComparison?.filter(c => c.image) || []
  const hasInterior = intComp.length > 0 || !!data.interiorImage

  // 이미지 CSS (실제 이미지 있으면 사용, 없으면 그래디언트 플레이스홀더)
  const coverBg = hasEyeLevel 
    ? `background-image:url(${data.eyeLevelImage});background-size:cover;background-position:center;` 
    : `background:${s.heroGrad};`
  const birdsBg = hasBirdsEye
    ? `background-image:url(${data.birdsEyeImage});background-size:cover;background-position:center;`
    : `background:${s.imgGrad1};`
  const eyeBg = hasEyeLevel
    ? `background-image:url(${data.eyeLevelImage});background-size:cover;background-position:center;`
    : `background:${s.imgGrad1};`
  const entranceBg = hasEntrance
    ? `background-image:url(${data.entranceImage});background-size:cover;background-position:center;`
    : `background:${s.imgGrad2};`

  const intCards = intComp.length >= 3 ? intComp.slice(0, 3) : [
    { label: '모던 럭셔리', image: '' },
    { label: '화이트우드', image: '' },
    { label: '내추럴모던', image: '' },
  ]
  const intDescs = [
    '고급 대리석 + 우드 패널 + 간접조명으로 호텔급 공간감을 연출합니다.',
    '화이트 톤과 자작나무 마감재로 밝고 따뜻한 북유럽 감성을 완성합니다.',
    '자연 소재와 그린 포인트로 힐링 공간을 조성합니다.',
  ]

  return `<div id="brochure-root" style="font-family:'Noto Sans KR',sans-serif;color:${s.text};-webkit-print-color-adjust:exact;">
<!-- PAGE 1: COVER -->
<div class="br-page" style="width:1123px;height:794px;position:relative;overflow:hidden;background:${s.bg};">
  <div style="position:absolute;inset:0;${coverBg}z-index:0;"></div>
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 0%,${s.overlay} 55%,${s.bg} 100%);z-index:1;"></div>
  <div style="position:absolute;top:40px;right:60px;z-index:2;font-size:12px;font-weight:300;color:${s.accentLight};letter-spacing:3px;">ARCHI · SCAN</div>
  <div style="position:relative;z-index:2;padding:280px 60px 50px;">
    <div style="display:inline-block;background:${s.accent};color:${s.badgeText};font-size:10px;font-weight:700;padding:4px 16px;border-radius:2px;letter-spacing:2px;margin-bottom:14px;">PREMIUM RESIDENCE</div>
    <div style="font-size:42px;font-weight:900;line-height:1.2;letter-spacing:-1px;margin-bottom:8px;">${name}</div>
    <div style="font-size:16px;font-weight:300;color:${s.accentLight};margin-bottom:32px;letter-spacing:1px;">${data.address}</div>
    <div style="display:flex;gap:36px;border-top:1px solid ${s.cardBorder};padding-top:18px;">
      <div><div style="font-size:9px;color:${s.textSub};letter-spacing:1.5px;margin-bottom:2px;">규모</div><div style="font-size:15px;font-weight:700;color:${s.accent};">지상 ${data.floors}층</div></div>
      <div><div style="font-size:9px;color:${s.textSub};letter-spacing:1.5px;margin-bottom:2px;">세대수</div><div style="font-size:15px;font-weight:700;color:${s.accent};">${data.units}세대</div></div>
      <div><div style="font-size:9px;color:${s.textSub};letter-spacing:1.5px;margin-bottom:2px;">대지면적</div><div style="font-size:15px;font-weight:700;color:${s.accent};">${fmt(data.siteArea)}㎡</div></div>
      ${data.zoneType ? `<div><div style="font-size:9px;color:${s.textSub};letter-spacing:1.5px;margin-bottom:2px;">용도지역</div><div style="font-size:15px;font-weight:700;color:${s.accent};">${data.zoneType}</div></div>` : ''}
      ${data.completionDate ? `<div><div style="font-size:9px;color:${s.textSub};letter-spacing:1.5px;margin-bottom:2px;">준공예정</div><div style="font-size:15px;font-weight:700;color:${s.accent};">${data.completionDate}</div></div>` : ''}
    </div>
  </div>
</div>

<!-- PAGE 2: OVERVIEW -->
<div class="br-page" style="width:1123px;height:794px;display:flex;overflow:hidden;background:${s.bg};">
  <div style="width:55%;${birdsBg}position:relative;">
    <div style="position:absolute;bottom:40px;left:40px;font-size:9px;color:${s.accentLight};letter-spacing:2px;">Bird's Eye View · 조감도</div>
  </div>
  <div style="width:45%;padding:50px;display:flex;flex-direction:column;justify-content:center;">
    <div style="font-size:9px;color:${s.accent};letter-spacing:3px;margin-bottom:10px;font-weight:500;">PROJECT OVERVIEW</div>
    <div style="font-size:26px;font-weight:700;margin-bottom:16px;line-height:1.3;">단지 개요</div>
    <div style="width:40px;height:2px;background:${s.accent};margin-bottom:16px;"></div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      ${[
        ['위치', data.address.split(' ').slice(0, 3).join(' ')],
        ['대지면적', `${fmt(data.siteArea)} ㎡`],
        ...(data.buildingArea ? [['건축면적', `${fmt(data.buildingArea)} ㎡`]] : []),
        ...(data.gfa ? [['연면적', `${fmt(data.gfa)} ㎡`]] : []),
        ...(data.far ? [['용적률', `${data.far.toFixed(1)}%`]] : []),
        ...(data.coverage ? [['건폐율', `${data.coverage.toFixed(1)}%`]] : []),
        ['규모', `지상 ${data.floors}층 / ${data.units}세대`],
        ...(data.parking ? [['주차', `${data.parking}대`]] : []),
      ].map(([l, v]) => `<tr style="border-bottom:1px solid ${s.tableBorder};"><td style="padding:10px 0;font-size:10px;color:${s.textSub};width:80px;">${l}</td><td style="padding:10px 0;font-size:11px;font-weight:500;text-align:right;">${v}</td></tr>`).join('')}
    </table>
    ${data.roi != null ? `
    <div style="background:${s.cardBg};border:1px solid ${s.cardBorder};border-radius:8px;padding:14px 18px;">
      <div style="font-size:9px;color:${s.accent};letter-spacing:1.5px;margin-bottom:4px;">예상 투자수익률 (ROI)</div>
      <div style="font-size:24px;font-weight:900;color:${s.accent};">${data.roi.toFixed(1)}%</div>
      ${data.totalCost && data.expectedProfit ? `<div style="font-size:9px;color:${s.textSub};margin-top:2px;">총사업비 ${fmtBillion(data.totalCost)} · 예상수익 ${fmtBillion(data.expectedProfit)}</div>` : ''}
    </div>` : ''}
  </div>
</div>

<!-- PAGE 3: EXTERIOR -->
<div class="br-page" style="width:1123px;height:794px;display:flex;flex-direction:column;overflow:hidden;background:${s.bg};">
  <div style="flex:6;display:flex;gap:3px;">
    <div style="flex:1;${eyeBg}position:relative;">
      <div style="position:absolute;bottom:20px;left:20px;background:rgba(0,0,0,0.5);padding:4px 12px;border-radius:4px;font-size:9px;color:#fff;letter-spacing:1px;">Eye-Level · 정면 투시도</div>
    </div>
    <div style="flex:1;${entranceBg}position:relative;">
      <div style="position:absolute;bottom:20px;left:20px;background:rgba(0,0,0,0.5);padding:4px 12px;border-radius:4px;font-size:9px;color:#fff;letter-spacing:1px;">Entrance · 입구 클로즈업</div>
    </div>
  </div>
  <div style="flex:4;padding:36px 60px;display:flex;align-items:center;gap:40px;">
    <div style="flex:1;">
      <div style="font-size:9px;color:${s.accent};letter-spacing:3px;margin-bottom:8px;font-weight:500;">EXTERIOR DESIGN</div>
      <div style="font-size:22px;font-weight:700;margin-bottom:12px;line-height:1.4;">자연과 조화를 이루는<br>현대적 파사드</div>
      <div style="font-size:11px;line-height:1.8;color:${s.textSub};">주변 환경과 어우러지는 프리미엄 마감과 대형 창호 시스템을 적용하여 개방감과 프라이버시를 동시에 확보했습니다. 모던하면서도 자연친화적인 외관을 완성합니다.</div>
    </div>
    <div style="display:flex;gap:20px;flex-shrink:0;">
      ${['🪨|자연석 마감', '🪟|대형 창호', '🌿|친환경 조경'].map(x => {
        const [ico, lbl] = x.split('|')
        return `<div style="text-align:center;width:80px;"><div style="width:48px;height:48px;border-radius:12px;background:${s.cardBg};border:1px solid ${s.cardBorder};display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:20px;">${ico}</div><div style="font-size:9px;color:${s.textSub};line-height:1.4;">${lbl}</div></div>`
      }).join('')}
    </div>
  </div>
</div>

<!-- PAGE 4: INTERIOR -->
<div class="br-page" style="width:1123px;height:794px;padding:40px 50px;display:flex;flex-direction:column;background:${s.bg};">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px;">
    <div>
      <div style="font-size:9px;color:${s.accent};letter-spacing:3px;margin-bottom:6px;font-weight:500;">INTERIOR DESIGN</div>
      <div style="font-size:24px;font-weight:700;">추천 인테리어 스타일</div>
    </div>
    <div style="font-size:10px;color:${s.textSub};">AI 렌더링 기반 3안 비교</div>
  </div>
  <div style="display:flex;gap:14px;flex:1;">
    ${intCards.map((ic, i) => {
      const imgCss = ic.image 
        ? `background-image:url(${ic.image});background-size:cover;background-position:center;`
        : `background:linear-gradient(135deg,#${s.intGrad[i]});`
      return `<div style="flex:1;border-radius:10px;overflow:hidden;border:1px solid ${s.cardBorder};display:flex;flex-direction:column;">
        <div style="flex:1;min-height:100px;${imgCss}"></div>
        <div style="padding:14px 16px;background:${s.cardBg};">
          <div style="display:inline-block;background:${s.accent};color:${s.badgeText};font-size:8px;font-weight:700;padding:2px 8px;border-radius:2px;margin-bottom:6px;">OPTION ${['A','B','C'][i]}</div>
          <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${ic.label}</div>
          <div style="font-size:9px;color:${s.textSub};line-height:1.5;">${intDescs[i] || ''}</div>
        </div>
      </div>`
    }).join('')}
  </div>
</div>

<!-- PAGE 5: INFO -->
<div class="br-page" style="width:1123px;height:794px;display:flex;overflow:hidden;background:${s.bg};">
  <div style="flex:1;padding:50px 60px;display:flex;flex-direction:column;justify-content:center;">
    <div style="font-size:9px;color:${s.accent};letter-spacing:3px;margin-bottom:10px;font-weight:500;">PROJECT INFORMATION</div>
    <div style="font-size:24px;font-weight:700;margin-bottom:8px;">사업 안내</div>
    <div style="width:40px;height:2px;background:${s.accent};margin-bottom:20px;"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
      ${[
        ['🏢', `${data.units}세대`, '총 세대수'],
        ['📐', `${data.floors}층`, '지상 규모'],
        ['🚗', `${data.parking || '-'}대`, '주차 대수'],
        ['📏', `${fmt(data.siteArea)}㎡`, '대지면적'],
      ].map(([ico, val, lbl]) => `<div style="background:${s.cardBg};border:1px solid ${s.cardBorder};border-radius:10px;padding:16px;">
        <div style="font-size:22px;margin-bottom:8px;">${ico}</div>
        <div style="font-size:18px;font-weight:900;color:${s.accent};margin-bottom:2px;">${val}</div>
        <div style="font-size:9px;color:${s.textSub};">${lbl}</div>
      </div>`).join('')}
    </div>
    <table style="width:100%;border-collapse:collapse;">
      ${[
        ['배치 유형', data.layoutName || '-'],
        ['용도지역', data.zoneType || '-'],
        ...(data.maxHeight ? [['높이제한', `${data.maxHeight}m 이하`]] : []),
      ].map(([l, v]) => `<tr style="border-bottom:1px solid ${s.tableBorder};"><td style="padding:10px 0;font-size:10px;color:${s.textSub};width:80px;">${l}</td><td style="padding:10px 0;font-size:11px;font-weight:500;text-align:right;">${v}</td></tr>`).join('')}
    </table>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:50px;border-left:1px solid ${s.cardBorder};position:relative;">
    <div style="text-align:center;max-width:220px;">
      <div style="font-size:9px;color:${s.accent};letter-spacing:3px;margin-bottom:10px;text-align:center;">CONTACT</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:25px;">분양 문의</div>
      <div style="width:40px;height:2px;background:${s.accent};margin:0 auto 24px;"></div>
      ${data.contact?.phone ? `<div style="margin-bottom:16px;"><div style="font-size:8px;color:${s.textSub};letter-spacing:2px;margin-bottom:4px;">전화</div><div style="font-size:13px;font-weight:500;">${data.contact.phone}</div></div>` : ''}
      ${data.contact?.email ? `<div style="margin-bottom:16px;"><div style="font-size:8px;color:${s.textSub};letter-spacing:2px;margin-bottom:4px;">이메일</div><div style="font-size:13px;font-weight:500;">${data.contact.email}</div></div>` : ''}
      <div style="margin-bottom:16px;"><div style="font-size:8px;color:${s.textSub};letter-spacing:2px;margin-bottom:4px;">현장</div><div style="font-size:11px;font-weight:500;">${data.address.split(' ').slice(0, 3).join(' ')}</div></div>
    </div>
    <div style="position:absolute;bottom:20px;left:0;right:0;text-align:center;font-size:8px;color:${s.textSub};letter-spacing:2px;opacity:0.5;">POWERED BY ARCHI-SCAN · ARCHISCAN.KR</div>
  </div>
</div>
</div>`
}

export async function downloadBrochurePdf(data: BrochureData, style: BrochureStyle): Promise<{ success: boolean; error?: string }> {
  try {
    // 동적 import
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ])

    // 숨김 컨테이너 생성
    const container = document.createElement('div')
    container.style.cssText = 'position:fixed;top:-99999px;left:-99999px;z-index:-1;'
    
    // oklch() 완전 차단 — html2canvas가 oklch를 지원하지 않으므로 모든 CSS 변수를 hex로 강제 전환
    const styleOverride = document.createElement('style')
    styleOverride.textContent = `
      :root, *, *::before, *::after,
      .br-container, .br-container * {
        --background: #ffffff !important;
        --foreground: #0a0a0a !important;
        --card: #ffffff !important;
        --card-foreground: #0a0a0a !important;
        --popover: #ffffff !important;
        --popover-foreground: #0a0a0a !important;
        --primary: #171717 !important;
        --primary-foreground: #fafafa !important;
        --secondary: #f5f5f5 !important;
        --secondary-foreground: #171717 !important;
        --muted: #f5f5f5 !important;
        --muted-foreground: #737373 !important;
        --accent: #f5f5f5 !important;
        --accent-foreground: #171717 !important;
        --destructive: #dc2626 !important;
        --destructive-foreground: #fafafa !important;
        --border: #e5e5e5 !important;
        --input: #e5e5e5 !important;
        --ring: #171717 !important;
        --chart-1: #2db89c !important;
        --chart-2: #42c2ac !important;
        --chart-3: #82c8c8 !important;
        --chart-4: #bfa040 !important;
        --chart-5: #d06040 !important;
        --sidebar: #fafafa !important;
        --sidebar-foreground: #0a0a0a !important;
        --sidebar-primary: #171717 !important;
        --sidebar-primary-foreground: #fafafa !important;
        --sidebar-accent: #f5f5f5 !important;
        --sidebar-accent-foreground: #171717 !important;
        --sidebar-border: #e5e5e5 !important;
        --sidebar-ring: #171717 !important;
        --radius: 0.5rem !important;
        color-scheme: light !important;
      }
    `
    document.head.appendChild(styleOverride)
    
    const contentDiv = document.createElement('div')
    contentDiv.className = 'br-container'
    contentDiv.innerHTML = generateBrochureHtml(data, style)
    container.appendChild(contentDiv)
    document.body.appendChild(container)

    // 폰트 로딩 대기
    await new Promise(r => setTimeout(r, 500))

    const pages = contentDiv.querySelectorAll('.br-page')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pdfW = 297, pdfH = 210

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage()
      
      const canvas = await html2canvas(pages[i] as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: style.bg,
        width: 1123,
        height: 794,
        logging: false,
      })
      
      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH)
    }

    // 파일명 생성
    const addrShort = data.address.split(' ').slice(1, 3).join('_') || 'project'
    pdf.save(`${addrShort}_분양브로셔_${style.name}.pdf`)

    // 정리
    document.body.removeChild(container)
    try { document.head.removeChild(styleOverride) } catch {}
    return { success: true }
  } catch (e) {
    // 에러 시에도 정리
    try { document.body.removeChild(container) } catch {}
    try { document.head.removeChild(styleOverride) } catch {}
    console.error('[Brochure] PDF generation failed:', e)
    return { success: false, error: e instanceof Error ? e.message : 'PDF 생성 실패' }
  }
}
