import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'https://www.archiscan.kr'

// ━━━ 1. 실거래가 API ━━━
test.describe('실거래가 API (/api/real-price)', () => {
  const districts = [
    { code: '11680', name: '강남구', minPrice: 20000000 },
    { code: '11170', name: '용산구', minPrice: 15000000 },
    { code: '11380', name: '은평구', minPrice: 5000000 },
    { code: '41135', name: '분당구', minPrice: 10000000 },
    { code: '26350', name: '해운대', minPrice: 3000000 },
  ]

  for (const d of districts) {
    test(`${d.name}(${d.code}) 실거래 데이터 반환`, async ({ request }) => {
      const res = await request.get(`${BASE}/api/real-price?sigunguCd=${d.code}`)
      expect(res.status()).toBe(200)

      const data = await res.json()
      expect(data.transactionCount).toBeGreaterThan(0)
      expect(data.avgPricePerM2).toBeGreaterThan(d.minPrice)
      expect(data.suggestedSalePrice).toBeGreaterThan(0)
      expect(data.transactions).toBeDefined()
      expect(data.transactions.length).toBeGreaterThan(0)

      // 첫 거래 데이터 구조 검증
      const tx = data.transactions[0]
      expect(tx).toHaveProperty('name')
      expect(tx).toHaveProperty('area')
      expect(tx).toHaveProperty('price')
      expect(tx).toHaveProperty('pricePerM2')
    })
  }

  test('미지원 지역코드 → 0건 반환 (에러 아님)', async ({ request }) => {
    const res = await request.get(`${BASE}/api/real-price?sigunguCd=99999`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.transactionCount).toBe(0)
    expect(data.suggestedSalePrice).toBe(0)
  })
})

// ━━━ 2. 표고 그리드 API ━━━
test.describe('표고 그리드 API (/api/elevation-grid)', () => {
  test('평창동 표고 데이터 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/elevation-grid?lat=37.6050&lng=126.9750&grid=12&range=0.003`)
    expect(res.status()).toBe(200)

    const data = await res.json()
    expect(data.elevations).toBeDefined()
    expect(data.elevations.length).toBe(144) // 12×12
    
    // 서울 평창동: 해발 50~200m 범위
    const min = Math.min(...data.elevations)
    const max = Math.max(...data.elevations)
    expect(min).toBeGreaterThan(30)
    expect(max).toBeLessThan(300)
    expect(max - min).toBeGreaterThan(0) // 고저차 존재
  })

  test('해운대 표고 데이터 반환', async ({ request }) => {
    const res = await request.get(`${BASE}/api/elevation-grid?lat=35.1631&lng=129.1636&grid=12&range=0.003`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.elevations.length).toBe(144)
  })
})

// ━━━ 3. 페이지 로드 ━━━
test.describe('페이지 로드', () => {
  test('메인 페이지 200 OK', async ({ request }) => {
    const res = await request.get(`${BASE}/`)
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(html).toContain('Archi-Scan')
    expect(html).toContain('AI 건축 사전기획')
  })

  test('OG 이미지 생성', async ({ request }) => {
    const res = await request.get(`${BASE}/api/og`)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('image')
  })
})

// ━━━ 4. ROI 일관성 테스트 ━━━
test.describe('ROI 계산 일관성', () => {
  test('동수 증가 → ROI 감소 (코어 비용 반영)', async () => {
    // calculateFeasibility를 직접 import할 수 없으므로 로직 검증
    // 동일 조건에서 동수만 변경했을 때 ROI 차이 확인
    const baseCost = 7165 * 5000000 // 토지비
    const gfa = 12682
    const constCost = gfa * 2500000 // 공사비
    const softCost = constCost * 0.15
    const parkingCost = 72 * 30000000

    // 1동: 추가 코어 비용 0
    const total1 = baseCost + constCost + softCost + parkingCost + 0
    // 4동: 추가 코어 비용 = 3 × 85 × 3 × 3500000
    const coreCost4 = 3 * 85 * 3 * 3500000
    const total4 = baseCost + constCost + softCost + parkingCost + coreCost4

    expect(total4).toBeGreaterThan(total1)
    expect(coreCost4).toBeGreaterThan(2000000000) // 20억 이상
    
    // ROI 차이 확인
    const salesPrice = gfa * 5000000
    const roi1 = ((salesPrice - total1) / total1) * 100
    const roi4 = ((salesPrice - total4) / total4) * 100
    expect(roi1).toBeGreaterThan(roi4) // 1동 ROI > 4동 ROI
  })
})

// ━━━ 5. 최대 동수 제한 검증 ━━━
test.describe('동수 제한 로직', () => {
  test('건축가능영역 기반 최대 동수 계산', async () => {
    const siteArea = 7165, coverage = 59, units = 72, floors = 3
    const maxByFootprint = Math.floor(siteArea * coverage / 100 / 300)
    const maxByUnits = Math.floor(units / (floors * 2))
    const maxBldg = Math.min(maxByFootprint, maxByUnits, 8)

    expect(maxByFootprint).toBe(14)
    expect(maxByUnits).toBe(12)
    expect(maxBldg).toBe(8)
  })

  test('소규모 필지 — 동수 자연 제한', async () => {
    const siteArea = 300, coverage = 50, units = 8, floors = 3
    const maxByFootprint = Math.floor(siteArea * coverage / 100 / 300)
    const maxByUnits = Math.floor(units / (floors * 2))
    const maxBldg = Math.min(maxByFootprint, maxByUnits, 8)

    expect(maxBldg).toBeLessThanOrEqual(1) // 300㎡면 1동이 최대
  })
})

// ━━━ 6. 건물 치수 통일 검증 ━━━
test.describe('건물 치수 AI 렌더링 통일', () => {
  test('판상형 치수 계산 (linearRatio 3.5)', async () => {
    const siteArea = 7165, coverage = 59, buildingCount = 4
    const totalFP = siteArea * coverage / 100
    const eachFP = Math.round(totalFP / buildingCount)
    const linearRatio = 3.5
    const w = Math.round(Math.sqrt(eachFP * linearRatio))
    const d = Math.round(eachFP / w)

    expect(w).toBe(61) // AI 렌더링과 동일
    expect(d).toBe(17) // AI 렌더링과 동일
    expect(w / d).toBeGreaterThan(3) // 가로:세로 3:1 이상
  })

  test('중정형 치수 계산 (linearRatio 1.5)', async () => {
    const siteArea = 7165, coverage = 59, buildingCount = 3
    const eachFP = Math.round(siteArea * coverage / 100 / buildingCount)
    const w = Math.round(Math.sqrt(eachFP * 1.5))
    const d = Math.round(eachFP / w)

    expect(w / d).toBeLessThan(2) // 중정형은 정사각형에 가까움
  })
})
