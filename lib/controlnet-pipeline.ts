// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ControlNet 파이프라인 — building-geometry 기반 정밀 제어 이미지 생성
// 3D 건물 형상을 ControlNet depth/canny로 변환하여 포토리얼 렌더링
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { getBuildingGeometry, getBuildingDimensionsInMeters } from '@/lib/building-geometry'
import { Resvg } from '@resvg/resvg-js'

// ━━━ Types ━━━
export interface ControlNetInput {
  type: string
  coverage: number
  siteArea: number
  floors: number
  units?: number
  buildingCount?: number
  originalType?: string
  angle: 'eye-level' | 'birds-eye' | 'entrance' | 'side'
  style?: string
  address?: string
  regulation?: {
    frontSetback?: number
    sideSetback?: number
    rearSetback?: number
    maxHeight?: number
  }
}

export interface ControlNetResult {
  imageUrl: string
  controlImageBase64: string
  model: string
  predictTime: number
  elapsed: number
  prompt: string
}

// ━━━ 건물 형상 → SVG 제어 이미지 생성 ━━━
export function generateControlImage(input: ControlNetInput, mode: 'depth' | 'canny' = 'canny'): string {
  const W = 1024, H = 1024
  const geo = getBuildingGeometry({
    type: input.type, coverage: input.coverage, siteArea: input.siteArea,
    floors: input.floors, buildingCount: input.buildingCount,
    originalType: input.originalType,
  })
  const S = geo.siteWidth
  const fH = 3.3
  const bH = input.floors * fH
  const frontSB = input.regulation?.frontSetback ?? 3
  const rearSB = input.regulation?.rearSetback ?? 2
  const offsetZ = (rearSB - frontSB) / 2

  // 블록 바운딩 박스 (buildableOffset 포함)
  let bbMinX = Infinity, bbMaxX = -Infinity, bbMinZ = Infinity, bbMaxZ = -Infinity
  for (const blk of geo.blocks) {
    bbMinX = Math.min(bbMinX, S*blk.x - S*blk.w/2)
    bbMaxX = Math.max(bbMaxX, S*blk.x + S*blk.w/2)
    bbMinZ = Math.min(bbMinZ, S*blk.z + offsetZ - S*blk.d/2)
    bbMaxZ = Math.max(bbMaxZ, S*blk.z + offsetZ + S*blk.d/2)
  }
  const bbW = bbMaxX - bbMinX, bbD = bbMaxZ - bbMinZ
  const bbCX = (bbMinX+bbMaxX)/2, bbCZ = (bbMinZ+bbMaxZ)/2

  const isDepth = mode === 'depth'
  const bgColor = isDepth ? '#000000' : '#000000'
  const wallColor = isDepth ? '#C8C8C8' : '#FFFFFF'
  const edgeColor = isDepth ? '#A0A0A0' : '#FFFFFF'
  const windowColor = isDepth ? '#646464' : '#808080'
  const groundColor = isDepth ? '#323232' : '#404040'
  const skyColor = isDepth ? '#000000' : '#000000'

  let svg = ''

  if (input.angle === 'birds-eye') {
    // ━━━ 조감도: 위에서 내려다보는 배치도 ━━━
    const padding = 60
    const scale = Math.min((W - padding*2) / (S*1.2), (H - padding*2) / (S*1.2))
    const cx = W/2, cy = H/2

    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${bgColor}"/>
  <!-- 대지 -->
  <rect x="${cx - S*scale/2}" y="${cy - S*scale/2}" width="${S*scale}" height="${S*scale}" 
        fill="${groundColor}" stroke="${edgeColor}" stroke-width="1"/>
  <!-- 도로 -->
  <rect x="${cx - S*scale*0.6}" y="${cy + S*scale/2}" width="${S*scale*1.2}" height="${30*scale}" fill="#282828"/>
  <!-- 건물 -->
  ${geo.blocks.map(blk => {
    const bW = S * blk.w * scale, bD = S * blk.d * scale
    const bx = cx + (S*blk.x)*scale - bW/2
    const bz = cy + (S*blk.z + offsetZ)*scale - bD/2
    return `<rect x="${bx}" y="${bz}" width="${bW}" height="${bD}" fill="${wallColor}" stroke="${edgeColor}" stroke-width="2"/>`
  }).join('\n  ')}
</svg>`

  } else {
    // ━━━ 정면/측면 시점: 투시도 스타일 ━━━
    const groundY = H * 0.78
    const maxBH = Math.min(H * 0.7, bH * (H * 0.6) / Math.max(bH, 30))

    // 투시 변환 파라미터
    const vpX = W / 2  // 소실점 X
    const vpY = H * 0.35 // 소실점 Y (지평선)
    const depthFactor = input.angle === 'side' ? 0.35 : 0.25

    // 블록 → 2D 투영
    const projectedBlocks = geo.blocks.map(blk => {
      const bW = S * blk.w, bD = S * blk.d
      const bX = S * blk.x, bZ = S * blk.z + offsetZ
      // X: 화면 가로 (건물 폭)
      const screenScale = Math.min((W * 0.7) / bbW, maxBH / bH)
      const sx = vpX + (bX - bbCX) * screenScale
      const sw = bW * screenScale
      // Y: 화면 세로 (건물 높이)
      const sh = bH * screenScale / bH * maxBH
      const sy = groundY - sh
      // 깊이감 (Z → X 오프셋)
      const zOff = (bZ - bbCZ) * screenScale * depthFactor
      return { sx: sx + zOff, sy, sw, sh, depth: bZ, originalW: bW, originalD: bD }
    })

    // 깊이순 정렬 (뒤쪽부터 그리기)
    projectedBlocks.sort((a, b) => a.depth - b.depth)

    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${skyColor}"/>
  <!-- 지면 -->
  <rect x="0" y="${groundY}" width="${W}" height="${H - groundY}" fill="${groundColor}"/>
  <line x1="0" y1="${groundY}" x2="${W}" y2="${groundY}" stroke="${edgeColor}" stroke-width="2"/>
  <!-- 건물 -->
  ${projectedBlocks.map(b => {
    const floorH = b.sh / input.floors
    let windows = ''
    // 층별 창문
    for (let f = 0; f < input.floors; f++) {
      const fy = b.sy + b.sh - (f + 1) * floorH
      const isGF = f === 0
      const cols = Math.max(2, Math.round(b.originalW / 3.5))
      const ww = b.sw / cols * 0.6
      const wh = floorH * (isGF ? 0.7 : 0.5)
      const wy = fy + floorH * (isGF ? 0.15 : 0.2)
      for (let c = 0; c < cols; c++) {
        const wx = b.sx - b.sw/2 + c * (b.sw/cols) + (b.sw/cols - ww)/2
        if (isGF) {
          // 1층 상가 — 큰 유리 + 프레임 (canny에서 강한 에지)
          windows += `<rect x="${wx-2}" y="${wy-2}" width="${ww+4}" height="${wh+4}" fill="none" stroke="${edgeColor}" stroke-width="2"/>`
          windows += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="${windowColor}"/>`
        } else {
          // 상층 창문
          windows += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="${windowColor}" stroke="${edgeColor}" stroke-width="1"/>`
        }
      }
      // 층간 라인
      windows += `<line x1="${b.sx - b.sw/2}" y1="${fy + floorH}" x2="${b.sx + b.sw/2}" y2="${fy + floorH}" stroke="${edgeColor}" stroke-width="0.5" opacity="0.5"/>`
    }
    // depth 모드: 거리 기반 밝기 (가까울수록 밝게)
    const depthBrightness = isDepth ? Math.round(200 - (b.depth - bbMinZ) / (bbD || 1) * 100) : 255
    const fill = isDepth ? `rgb(${depthBrightness},${depthBrightness},${depthBrightness})` : 'none'
    return `<g>
      <rect x="${b.sx - b.sw/2}" y="${b.sy}" width="${b.sw}" height="${b.sh}" fill="${fill}" stroke="${edgeColor}" stroke-width="3"/>
      ${windows}
      <!-- 옥상 -->
      <line x1="${b.sx - b.sw/2}" y1="${b.sy}" x2="${b.sx + b.sw/2}" y2="${b.sy}" stroke="${edgeColor}" stroke-width="2"/>
    </g>`
  }).join('\n  ')}
  <!-- 도로 표시 -->
  <rect x="${W*0.1}" y="${groundY + 5}" width="${W*0.8}" height="${15}" fill="#282828" opacity="0.5"/>
</svg>`
  }

  return svg
}

// ━━━ SVG → PNG Base64 변환 ━━━
export function svgToPngBase64(svgString: string, width = 1024): string | null {
  try {
    const resvg = new Resvg(svgString, { fitTo: { mode: 'width' as const, value: width } })
    const png = resvg.render().asPng()
    return `data:image/png;base64,${Buffer.from(png).toString('base64')}`
  } catch (e) {
    console.error('[ControlNet] SVG→PNG 변환 실패:', e)
    return null
  }
}

// ━━━ 건축 프롬프트 생성 ━━━
export function buildControlNetPrompt(input: ControlNetInput): string {
  const typeNames: Record<string, string> = {
    tower: 'modern residential tower', linear: 'linear apartment block (Korean-style slab building)',
    lshape: 'L-shaped residential building', courtyard: 'U-shaped courtyard building',
    cluster: 'multi-building residential complex',
  }
  const buildingType = typeNames[input.originalType || input.type] || 'residential building'
  const geo = getBuildingDimensionsInMeters({
    type: input.type as any, coverage: input.coverage, siteArea: input.siteArea,
    floors: input.floors, buildingCount: input.buildingCount, originalType: input.originalType,
  })
  const b0 = geo.blocksInMeters?.[0]
  const dims = b0 ? `approximately ${Math.round(b0.widthM)}m wide × ${Math.round(b0.depthM)}m deep` : ''

  const angleDescs: Record<string, string> = {
    'eye-level': 'street-level eye-level perspective, shot from pedestrian viewpoint across the road',
    'birds-eye': 'aerial birds-eye view from 45-degree angle above, showing rooftop and surroundings',
    'entrance': 'close-up view of the main entrance, showing canopy and ground-floor retail',
    'side': 'three-quarter side perspective showing building depth and facade articulation',
  }

  const styleDescs: Record<string, string> = {
    'modern-luxury': 'sleek modern luxury, glass curtain wall, premium finishes',
    'eco-green': 'eco-friendly green building, vertical gardens, rooftop greenery',
    'korean-modern': 'contemporary Korean architecture, warm earth tones, clean lines',
    'minimalist': 'minimalist white concrete, geometric forms, sharp clean lines',
    'kvilla': 'typical Korean multi-family villa, pilotis parking, balcony laundry areas',
    'kapartment': 'Korean apartment complex style, uniform towers, landscaped common area',
    'kcommercial': 'Korean commercial-residential mixed building, ground floor shops with signage',
  }
  const stylePrompt = styleDescs[input.style || 'modern-luxury'] || styleDescs['modern-luxury']

  return [
    `Photorealistic architectural photography of a ${input.floors}-story ${buildingType}.`,
    dims,
    `${geo.blocksInMeters?.length || 1} building volume${(geo.blocksInMeters?.length || 1) > 1 ? 's' : ''}.`,
    `Ground floor: commercial retail with orange-brown facade, large glass storefronts, signage.`,
    `Upper floors: residential with glass balconies, window frames, AC units.`,
    `${angleDescs[input.angle] || angleDescs['eye-level']}.`,
    `Style: ${stylePrompt}.`,
    `Korean urban neighborhood context. Mature trees, clean sidewalks, parked cars.`,
    `Golden hour warm sunlight. Professional DSLR quality, 85mm lens.`,
    `The building MUST be exactly ${input.floors} floors tall. ${input.floors <= 5 ? 'LOW-RISE building, shorter than nearby trees.' : ''}`,
    input.address ? `Location: ${input.address}, South Korea.` : '',
  ].filter(Boolean).join(' ')
}

// ━━━ Replicate API 호출 ━━━
export async function callReplicateControlNet(
  controlImageBase64: string,
  prompt: string,
  options: {
    model?: 'flux-canny-pro' | 'flux-depth-pro' | 'sdxl-controlnet'
    guidance?: number
    steps?: number
    negativePrompt?: string
  } = {}
): Promise<{ predictionId: string; imageUrl?: string; predictTime?: number }> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN 미설정')

  const model = options.model || 'flux-canny-pro'
  const negPrompt = options.negativePrompt || 'blurry, low quality, cartoon, anime, illustration, watermark, text, deformed, ugly, bad architecture, wrong proportions'

  // 모델별 엔드포인트/파라미터
  const configs: Record<string, { url: string; input: any }> = {
    'flux-canny-pro': {
      url: 'https://api.replicate.com/v1/models/black-forest-labs/flux-canny-pro/predictions',
      input: {
        prompt,
        control_image: controlImageBase64,
        guidance: options.guidance || 30,
        num_inference_steps: options.steps || 28,
        num_outputs: 1,
        megapixels: '1',
        output_format: 'webp',
        output_quality: 85,
      },
    },
    'flux-depth-pro': {
      url: 'https://api.replicate.com/v1/models/black-forest-labs/flux-depth-pro/predictions',
      input: {
        prompt,
        control_image: controlImageBase64,
        guidance: options.guidance || 25,
        num_inference_steps: options.steps || 28,
        num_outputs: 1,
        megapixels: '1',
        output_format: 'webp',
        output_quality: 85,
      },
    },
    'sdxl-controlnet': {
      url: 'https://api.replicate.com/v1/predictions',
      input: {
        prompt,
        negative_prompt: negPrompt,
        image: controlImageBase64,
        num_inference_steps: options.steps || 30,
        guidance_scale: options.guidance || 8.5,
        controlnet_conditioning_scale: 0.85,
      },
    },
  }

  const config = configs[model] || configs['flux-canny-pro']

  const res = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait=120',
    },
    body: JSON.stringify({ input: config.input }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Replicate ${res.status}: ${err.slice(0, 300)}`)
  }

  const prediction = await res.json()

  // Prefer: wait 사용 시 즉시 결과 반환 가능
  if (prediction.status === 'succeeded') {
    const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    return {
      predictionId: prediction.id,
      imageUrl,
      predictTime: prediction.metrics?.predict_time,
    }
  }

  // 아직 진행 중이면 폴링
  const result = await pollPrediction(prediction.id, token, 180000)
  const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output
  return {
    predictionId: prediction.id,
    imageUrl,
    predictTime: result.metrics?.predict_time,
  }
}

// ━━━ 폴링 헬퍼 ━━━
async function pollPrediction(id: string, token: string, timeout = 120000): Promise<any> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.status === 'succeeded') return data
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(data.error || `Prediction ${data.status}`)
    }
    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error('Replicate prediction timeout')
}

// ━━━ 통합 파이프라인 ━━━
export async function runControlNetPipeline(input: ControlNetInput): Promise<ControlNetResult> {
  const startTime = Date.now()

  // 1. 제어 이미지 생성
  const mode = input.angle === 'birds-eye' ? 'depth' : 'canny'
  const controlSvg = generateControlImage(input, mode)
  const controlPng = svgToPngBase64(controlSvg, 1024)
  if (!controlPng) throw new Error('Control image 생성 실패')

  // 2. 프롬프트 생성
  const prompt = buildControlNetPrompt(input)

  // 3. 모델 선택 (angle에 따라)
  const model = mode === 'depth' ? 'flux-depth-pro' : 'flux-canny-pro'

  // 4. Replicate 호출
  const result = await callReplicateControlNet(controlPng, prompt, { model })

  if (!result.imageUrl) throw new Error('이미지 URL 없음')

  return {
    imageUrl: result.imageUrl,
    controlImageBase64: controlPng,
    model,
    predictTime: result.predictTime || 0,
    elapsed: Date.now() - startTime,
    prompt,
  }
}
