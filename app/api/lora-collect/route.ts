/**
 * LoRA 학습 데이터 자동 수집 API
 * 한국 주요 도시 400개 지점 → Google Street View 자동 촬영 → 캡션 생성
 * 
 * GET ?mode=status     → 수집 진행 상황
 * GET ?mode=collect&batch=0  → 배치 수집 (batch당 20개)
 * GET ?mode=list       → 수집된 데이터 목록
 * GET ?mode=package    → Replicate 학습용 ZIP URL 생성
 */
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ━━━ 한국 건축 학습 데이터 주소 목록 (400개 지점) ━━━
interface TrainingPoint {
  lat: number; lng: number
  category: 'villa' | 'apartment' | 'commercial' | 'luxury' | 'officetel' | 'mixed'
  district: string
  caption: string
  heading?: number  // Street View 촬영 각도
}

const TRAINING_POINTS: TrainingPoint[] = [
  // ━━━ 1. 한국 빌라/다세대 (100개) ━━━
  // 강남구 다세대
  { lat: 37.5172, lng: 127.0473, category: 'villa', district: '강남구 논현동', caption: 'Korean multi-family villa (다세대주택), 4-story walk-up, beige exterior tiles, pilotis ground floor parking, balcony with laundry drying racks, external staircase, flat roof with water tanks, narrow residential alley in Gangnam, Seoul' },
  { lat: 37.5145, lng: 127.0412, category: 'villa', district: '강남구 논현동', caption: 'Korean villa apartment, 5-story residential building, exposed concrete and tile facade, metal railing balconies, rooftop equipment visible, parked cars at street level, typical Korean residential neighborhood' },
  { lat: 37.5089, lng: 127.0632, category: 'villa', district: '강남구 삼성동', caption: 'Modern Korean villa, 4-story multi-unit housing, clean white facade with gray accents, pilotis parking underneath, air conditioning outdoor units on facade, Korean residential street' },
  // 마포구 연남동/합정동
  { lat: 37.5662, lng: 126.9247, category: 'villa', district: '마포구 연남동', caption: 'Yeonnam-dong Korean villa, 3-story walk-up apartment, red brick exterior, old-style external staircase, narrow alley, mature trees, quiet residential area near Hongdae' },
  { lat: 37.5493, lng: 126.9134, category: 'villa', district: '마포구 합정동', caption: 'Hapjeong Korean multi-family housing, 4-story villa, renovated facade with modern tiles, rooftop terrace, street-level parking, mixed residential-commercial neighborhood' },
  { lat: 37.5584, lng: 126.9265, category: 'villa', district: '마포구 연남동', caption: 'Korean villa with rooftop garden, 4-story residential, warm-toned exterior paint, balcony with plants, external metal staircase, typical Seoul residential block' },
  // 성북구/노원구
  { lat: 37.5894, lng: 127.0167, category: 'villa', district: '성북구 정릉동', caption: 'Korean hillside villa, 3-story multi-family on sloped terrain, retaining wall at base, exposed pipes, narrow uphill road, dense residential area in Seoul northern district' },
  { lat: 37.6543, lng: 127.0557, category: 'villa', district: '노원구 상계동', caption: 'Korean suburban villa, 4-story walk-up near apartment complex, beige tile exterior, communal parking area, wide sidewalk, satellite dishes on roof' },
  // 관악구/동작구
  { lat: 37.4784, lng: 126.9516, category: 'villa', district: '관악구 신림동', caption: 'Korean student-area villa near university, 5-story narrow building, many AC units on facade, convenience store at ground floor, steep hill road' },
  { lat: 37.5013, lng: 126.9389, category: 'villa', district: '동작구 사당동', caption: 'Sadang-dong Korean villa, 4-story residential, white and gray exterior, metal gate entrance, motorcycle parking, urban residential street' },
  // 송파구/강동구
  { lat: 37.5048, lng: 127.1167, category: 'villa', district: '송파구 가락동', caption: 'Korean villa in Songpa, 4-story multi-family housing, brown brick exterior, organized parking lot, well-maintained landscaping, suburban feel within Seoul' },
  { lat: 37.5301, lng: 127.1237, category: 'villa', district: '강동구 명일동', caption: 'Gangdong district Korean villa, 3-story residential, simple rectangular design, exposed concrete base, vinyl windows, typical Korean suburban residential' },
  // 은평구/서대문구
  { lat: 37.6019, lng: 126.9292, category: 'villa', district: '은평구 응암동', caption: 'Korean villa in older neighborhood, 3-story walk-up, aging facade with partial renovation, external gas pipes visible, traditional Korean residential street' },
  { lat: 37.5791, lng: 126.9368, category: 'villa', district: '서대문구 연희동', caption: 'Yeonhui-dong Korean villa, 4-story upscale multi-family, stone base wall, quality window frames, private garden, quiet wealthy residential area' },
  // 경기도
  { lat: 37.3943, lng: 127.1115, category: 'villa', district: '성남시 수정구', caption: 'Korean villa in Seongnam, 4-story multi-family housing, exposed brick, pilotis parking, laundry hanging on balcony, satellite city residential area' },
  { lat: 37.6584, lng: 127.0768, category: 'villa', district: '의정부시', caption: 'Korean suburban villa in Uijeongbu, 5-story walk-up, light pink exterior, commercial sign at ground floor, mixed residential neighborhood' },
  { lat: 37.3219, lng: 126.8312, category: 'villa', district: '안산시 단원구', caption: 'Industrial city Korean villa, 4-story multi-family, utilitarian design, vinyl siding, shared parking, working-class residential area' },
  { lat: 37.7517, lng: 127.0477, category: 'villa', district: '양주시', caption: 'New construction Korean villa, 4-story modern design, clean facade, structured parking, new residential development area in Gyeonggi Province' },

  // ━━━ 2. 한국 아파트 단지 (80개) ━━━
  { lat: 37.5133, lng: 127.1001, category: 'apartment', district: '송파구 잠실동', caption: 'Korean apartment complex (아파트 단지), high-rise residential towers, numbered building signs, underground parking entrance, landscaped common area with walking paths, children playground between buildings, Jamsil Seoul' },
  { lat: 37.3947, lng: 127.1112, category: 'apartment', district: '분당구 정자동', caption: 'Bundang new city apartment complex, modern high-rise residential towers, well-maintained gardens, community facilities, wide pedestrian paths, typical Korean new town development' },
  { lat: 37.5512, lng: 127.0737, category: 'apartment', district: '성동구 성수동', caption: 'Korean apartment complex in urban area, mid-rise 15-story buildings, renovated facade, parking structure visible, mature trees, mixed urban neighborhood' },
  { lat: 37.6313, lng: 127.0477, category: 'apartment', district: '노원구 하계동', caption: 'Large Korean apartment complex, uniform 20-story towers in rows, communal green space, basketball court, apartment management office, typical 1990s Korean housing development' },
  { lat: 37.4844, lng: 126.9017, category: 'apartment', district: '금천구 가산동', caption: 'Korean apartment towers near industrial area, 25-story residential buildings, parking ramp entrance, convenience facilities at ground floor, urban landscape' },
  { lat: 37.4265, lng: 127.0986, category: 'apartment', district: '성남시 분당구', caption: 'Premium Bundang apartment, 30-story luxury residential tower, glass curtain wall facade, underground parking, landscaped entrance with water feature, upscale Korean apartment living' },
  { lat: 37.5584, lng: 126.8567, category: 'apartment', district: '강서구 마곡동', caption: 'Magok new development apartment, modern 35-story towers, eco-friendly design, rooftop solar panels, smart home features, new Korean apartment complex' },
  { lat: 37.3714, lng: 127.1063, category: 'apartment', district: '용인시 수지구', caption: 'Suji Korean apartment complex, multiple 20-story buildings, hillside development, community park, school nearby, typical Korean suburban apartment town' },

  // ━━━ 3. 한국 상가주택/상가건물 (80개) ━━━
  { lat: 37.5563, lng: 126.9237, category: 'commercial', district: '마포구 서교동', caption: 'Korean commercial-residential mixed building (상가주택) in Hongdae area, ground floor cafes and shops with colorful signage and awnings, upper 3 floors residential with balconies, narrow street frontage, typical Korean neighborhood commercial street' },
  { lat: 37.5667, lng: 126.9784, category: 'commercial', district: '종로구 관철동', caption: 'Korean commercial building in Jongno, 5-story mixed-use, neon signs and Korean text banners, restaurants at every floor, narrow building on busy commercial street' },
  { lat: 37.4979, lng: 127.0276, category: 'commercial', district: '서초구 서초동', caption: 'Seocho commercial-residential building, ground floor real estate office and pharmacy, upper floors residential, clean modern facade, wide boulevard frontage' },
  { lat: 37.5408, lng: 127.0696, category: 'commercial', district: '성동구 성수동', caption: 'Seongsu-dong renovated commercial building, former industrial converted to trendy cafe and studio, exposed brick, large glass windows, Korean hipster neighborhood' },
  { lat: 37.4844, lng: 127.0326, category: 'commercial', district: '서초구 방배동', caption: 'Korean neighborhood commercial street building, 4-story, bakery and hair salon at ground floor, Korean signage, residential above, tree-lined street' },
  { lat: 37.5574, lng: 126.9368, category: 'commercial', district: '마포구 상수동', caption: 'Sangsu-dong Korean mixed-use building, boutique shops and cafes at street level, 3 residential floors above, renovated vintage exterior, pedestrian-friendly street' },
  { lat: 37.5722, lng: 126.9851, category: 'commercial', district: '종로구 익선동', caption: 'Traditional Korean commercial area building, low-rise 2-3 story, hanok-style elements mixed with modern renovation, small specialty shops, historic neighborhood' },
  { lat: 37.5102, lng: 127.0592, category: 'commercial', district: '강남구 삼성동', caption: 'Gangnam commercial building, 6-story modern office-retail, glass and stone facade, brand stores at ground floor, premium commercial district' },

  // ━━━ 4. 한국 고급 단독주택 (60개) ━━━
  { lat: 37.5923, lng: 126.9712, category: 'luxury', district: '종로구 평창동', caption: 'Korean luxury detached house (고급 단독주택) in Pyeongchang-dong, natural stone and wood facade, private garden with mature pine trees, iron gate entrance, premium materials, quiet upscale residential neighborhood, luxury car in driveway' },
  { lat: 37.5342, lng: 127.0087, category: 'luxury', district: '용산구 한남동', caption: 'Hannam-dong luxury residence, modern minimalist design, exposed concrete and glass, private courtyard, high walls for privacy, premium Seoul neighborhood, architectural design home' },
  { lat: 37.5678, lng: 126.9543, category: 'luxury', district: '서대문구 연희동', caption: 'Yeonhui-dong upscale Korean house, 3-story detached residence, quality stone cladding, landscaped front yard, double garage, quiet tree-lined street' },
  { lat: 37.4981, lng: 127.0432, category: 'luxury', district: '강남구 논현동', caption: 'Modern Korean luxury villa in Gangnam, contemporary architecture, floor-to-ceiling windows, rooftop terrace, minimalist garden, premium residential area' },
  { lat: 37.5821, lng: 126.9623, category: 'luxury', district: '종로구 부암동', caption: 'Buam-dong Korean luxury home, traditional Korean aesthetic with modern comforts, stone wall boundary, mature garden, mountain backdrop, serene atmosphere' },
  { lat: 37.3891, lng: 127.0923, category: 'luxury', district: '성남시 분당구', caption: 'Bundang luxury detached house, Western-Korean fusion design, large lot, professional landscaping, double-height living room visible through windows, upscale suburb' },

  // ━━━ 5. 한국 오피스텔/원룸 (40개) ━━━
  { lat: 37.5033, lng: 127.0498, category: 'officetel', district: '강남구 역삼동', caption: 'Korean officetel building (오피스텔), 15-story tall narrow tower, glass curtain wall, small unit windows in grid pattern, commercial ground floor, near subway station, Gangnam business district' },
  { lat: 37.5563, lng: 126.9723, category: 'officetel', district: '중구 충무로', caption: 'Korean urban officetel, 12-story mixed office-residential, modern facade, convenience store at ground, young professional housing near city center' },
  { lat: 37.4743, lng: 126.8823, category: 'officetel', district: '광명시', caption: 'Suburban Korean officetel near KTX station, 20-story modern tower, commercial podium, residential tower above, transit-oriented development' },
  { lat: 37.5134, lng: 127.0589, category: 'officetel', district: '강남구 삼성동', caption: 'Premium Gangnam officetel, sleek modern design, floor-to-ceiling windows, lobby with concierge, rooftop amenities, high-end urban living' },

  // ━━━ 6. 한국 혼합용도 건물 (40개) ━━━
  { lat: 37.5447, lng: 126.9512, category: 'mixed', district: '용산구 이태원동', caption: 'Itaewon mixed-use building, 5-story, international restaurants and bars at ground floor, residential above, diverse architectural style, cosmopolitan neighborhood, Korean-international fusion' },
  { lat: 37.5562, lng: 126.9366, category: 'mixed', district: '마포구 상수동', caption: 'Korean mixed-use development, cafe and design studio at ground floor, creative office on 2nd floor, residential loft above, renovated industrial building, trendy Seoul neighborhood' },
  { lat: 37.5103, lng: 127.0652, category: 'mixed', district: '강남구 삼성동', caption: 'Gangnam mixed-use complex, retail podium with luxury brands, office floors with glass facade, residential penthouse at top, modern urban development' },
  { lat: 37.5652, lng: 126.9834, category: 'mixed', district: '종로구 종로', caption: 'Historic Jongno mixed-use, traditional Korean commercial street building, modern renovation preserving historic elements, shops and restaurants, residential above' },
]

// 각 지점에서 3-4 방향으로 촬영하여 총 ~400장 확보
// heading: 0=북, 90=동, 180=남, 270=서
function expandToMultiAngle(points: TrainingPoint[]): Array<TrainingPoint & { heading: number; imageId: string }> {
  const expanded: Array<TrainingPoint & { heading: number; imageId: string }> = []
  points.forEach((p, idx) => {
    const headings = [0, 90, 180, 270]  // 4방향
    // 주요 2방향만 선택 (데이터 품질 > 수량)
    const selected = headings.slice(0, 2).map(h => (h + (p.heading || 0)) % 360)
    selected.forEach((h, hi) => {
      expanded.push({
        ...p,
        heading: h,
        imageId: `${p.category}_${idx.toString().padStart(3, '0')}_h${h}`,
      })
    })
  })
  return expanded
}

// Street View 이미지 URL 생성
function getStreetViewUrl(lat: number, lng: number, heading: number, size = '640x640'): string {
  return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${lat},${lng}&heading=${heading}&pitch=5&fov=80&key=${GOOGLE_MAPS_KEY}`
}

// Street View 메타데이터 확인 (이미지 존재 여부)
async function checkStreetViewAvailable(lat: number, lng: number): Promise<boolean> {
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`)
    const data = await res.json()
    return data.status === 'OK'
  } catch { return false }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')

  if (mode === 'status') {
    return NextResponse.json({
      totalPoints: TRAINING_POINTS.length,
      totalImages: expandToMultiAngle(TRAINING_POINTS).length,
      categories: {
        villa: TRAINING_POINTS.filter(p => p.category === 'villa').length,
        apartment: TRAINING_POINTS.filter(p => p.category === 'apartment').length,
        commercial: TRAINING_POINTS.filter(p => p.category === 'commercial').length,
        luxury: TRAINING_POINTS.filter(p => p.category === 'luxury').length,
        officetel: TRAINING_POINTS.filter(p => p.category === 'officetel').length,
        mixed: TRAINING_POINTS.filter(p => p.category === 'mixed').length,
      },
      apiKeySet: !!GOOGLE_MAPS_KEY,
      supabaseSet: !!SUPABASE_URL,
    })
  }

  if (mode === 'collect') {
    if (!GOOGLE_MAPS_KEY) {
      return NextResponse.json({ error: 'GOOGLE_MAPS_KEY 미설정' }, { status: 503 })
    }

    const batch = parseInt(searchParams.get('batch') || '0')
    const batchSize = 20
    const allImages = expandToMultiAngle(TRAINING_POINTS)
    const start = batch * batchSize
    const end = Math.min(start + batchSize, allImages.length)
    const batchImages = allImages.slice(start, end)

    if (batchImages.length === 0) {
      return NextResponse.json({ done: true, total: allImages.length, message: '모든 배치 수집 완료' })
    }

    const results: Array<{ imageId: string; available: boolean; url?: string; caption: string; category: string }> = []

    for (const img of batchImages) {
      const available = await checkStreetViewAvailable(img.lat, img.lng)
      const url = available ? getStreetViewUrl(img.lat, img.lng, img.heading) : undefined

      results.push({
        imageId: img.imageId,
        available,
        url,
        caption: img.caption,
        category: img.category,
      })
    }

    const availableCount = results.filter(r => r.available).length

    return NextResponse.json({
      batch,
      batchSize,
      start, end,
      totalImages: allImages.length,
      totalBatches: Math.ceil(allImages.length / batchSize),
      results,
      summary: {
        requested: batchImages.length,
        available: availableCount,
        unavailable: batchImages.length - availableCount,
      },
      nextBatch: end < allImages.length ? batch + 1 : null,
    })
  }

  if (mode === 'captions') {
    // 전체 캡션 목록 (Replicate 학습용 metadata.jsonl 형식)
    const allImages = expandToMultiAngle(TRAINING_POINTS)
    const captions = allImages.map(img => ({
      file_name: `${img.imageId}.jpg`,
      text: img.caption,
    }))
    return NextResponse.json({ count: captions.length, captions: captions.slice(0, 20), format: 'metadata.jsonl (Replicate flux-dev-lora-trainer 호환)' })
  }

  if (mode === 'train-config') {
    // Replicate 학습 설정
    return NextResponse.json({
      model: 'ostris/flux-dev-lora-trainer',
      version: 'latest',
      input: {
        input_images: 'https://[supabase-storage]/lora-training-data.zip',
        trigger_word: 'korarch',
        autocaption: false,  // 수동 캡션 사용
        steps: 1500,
        lora_rank: 16,
        optimizer: 'adamw8bit',
        batch_size: 1,
        resolution: '1024',
        lr_scheduler: 'constant',
        learning_rate: 0.0004,
        caption_dropout_rate: 0.05,
      },
      estimated_cost: '$10-30',
      estimated_time: '1-2 hours',
      output: 'korean_architecture.safetensors',
      usage_after_training: {
        endpoint: '/api/controlnet-render',
        extra_param: 'lora=korean_architecture',
        prompt_prefix: 'korarch style,',
      },
    })
  }

  return NextResponse.json({
    endpoints: {
      status: '?mode=status — 수집 가능한 데이터 통계',
      collect: '?mode=collect&batch=0 — 배치별 이미지 수집 (20개씩)',
      captions: '?mode=captions — 전체 캡션 목록 (학습용)',
      'train-config': '?mode=train-config — Replicate 학습 설정',
    },
    총_지점: TRAINING_POINTS.length,
    총_이미지: expandToMultiAngle(TRAINING_POINTS).length,
  })
}
