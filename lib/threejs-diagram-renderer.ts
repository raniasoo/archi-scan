// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Three.js 통합 도면 렌더러 (Single Source of Truth)
// 하나의 3D 모델 → 배치도/아이소메트릭/단면도/입면도/투시도
// 기존 7개 SVG 컴포넌트를 대체
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { getBuildingGeometry, type BuildingGeometry } from '@/lib/building-geometry'
import { getPatternVisuals, type PatternVisuals } from '@/lib/alexander-patterns'

export interface DiagramParams {
  type: string
  coverage: number
  siteArea: number
  floors: number
  units?: number
  buildingCount?: number
  originalType?: string
  floorHeight?: number
  regulation?: { frontSetback?: number; sideSetback?: number; rearSetback?: number; roadWidth?: number }
}

export type DiagramType = 'site-plan' | 'isometric' | 'section' | 'elevation' | 'perspective'

export interface DiagramResult {
  type: DiagramType
  label: string
  image: string // base64 data URL
}

/**
 * 하나의 3D 모델에서 5종 도면을 자동 추출합니다.
 */
export async function renderAllDiagrams(params: DiagramParams): Promise<DiagramResult[]> {
  const THREE = await import('three')
  const geo = getBuildingGeometry({
    type: params.type, coverage: params.coverage, siteArea: params.siteArea,
    floors: params.floors, buildingCount: params.buildingCount,
    originalType: params.originalType, floorHeight: params.floorHeight,
  })
  const S = geo.siteWidth
  const bH = geo.buildingHeight
  const fH = params.floorHeight || 3.3

  // ★ 건물 위치 오프셋: 전면/후면 이격거리 차이 보정 (building-volume-3d.tsx와 동일)
  const frontSB = params.regulation?.frontSetback ?? 3
  const rearSB = params.regulation?.rearSetback ?? 2
  const buildableOffsetX = 0 // 좌우 이격 대칭
  const buildableOffsetZ = (rearSB - frontSB) / 2 // 전면/후면 이격 차이만큼 이동

  // 캔버스 + 렌더러
  const canvas = document.createElement('canvas')
  canvas.width = 800; canvas.height = 600
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true })
  renderer.setSize(800, 600)
  renderer.setClearColor(0x141a26, 1)

  const results: DiagramResult[] = []

  // ━━━ 공통 장면 구성 함수 (다크 테마) ━━━
  function buildScene(bgColor: number = 0x141a26) {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(bgColor)
    const amb = new THREE.AmbientLight(0x8899bb, 0.6)
    scene.add(amb)
    const dir = new THREE.DirectionalLight(0xffeedd, 0.9)
    dir.position.set(S, S * 2, S)
    scene.add(dir)
    const fill = new THREE.DirectionalLight(0x4466aa, 0.3)
    fill.position.set(-S, S, -S)
    scene.add(fill)
    return scene
  }

  // ━━━ 창문 텍스처 생성 ━━━
  function makeWindowTex(floorCount: number, cols: number = 6): HTMLCanvasElement {
    const c = document.createElement('canvas')
    c.width = 512; c.height = 512
    const ctx = c.getContext('2d')!
    // 벽체
    ctx.fillStyle = '#c8d0d8'; ctx.fillRect(0, 0, 512, 512)
    // 1층 상가 (오렌지)
    const fh = 512 / floorCount
    ctx.fillStyle = '#d4845a'; ctx.fillRect(0, 512 - fh, 512, fh)
    // 상층 창문
    const ww = Math.floor(512 / cols * 0.6), wh = Math.floor(fh * 0.55)
    const gx = 512 / cols, gy = fh
    for (let row = 0; row < floorCount - 1; row++) {
      for (let col = 0; col < cols; col++) {
        const wx = col * gx + (gx - ww) / 2
        const wy = row * gy + (gy - wh) / 2
        ctx.fillStyle = '#7aa4cc'; ctx.fillRect(wx, wy, ww, wh)
        ctx.fillStyle = '#a0c4e4'; ctx.fillRect(wx + 2, wy + 2, ww - 4, wh / 2 - 2)
      }
    }
    // 1층 상가 창문 (큰 유리)
    for (let col = 0; col < Math.ceil(cols / 2); col++) {
      const wx = col * (gx * 2) + gx * 0.2
      const wy = 512 - fh + fh * 0.15
      ctx.fillStyle = '#e8c070'; ctx.fillRect(wx, wy, gx * 1.6, fh * 0.65)
    }
    return c
  }

  // ━━━ 건물 메쉬 생성 (창문 텍스처 + 건축 디테일) ━━━
  function addBuilding(scene: any, mat: any, useWindowTex: boolean = false) {
    const balconyMat = new THREE.MeshStandardMaterial({ color: 0x607080, metalness: 0.3, roughness: 0.5 })
    const railMat = new THREE.MeshStandardMaterial({ color: 0x506070, metalness: 0.4, transparent: true, opacity: 0.7 })
    
    for (const blk of geo.blocks) {
      const bW = S * blk.w, bD = S * blk.d
      let finalMat = mat
      if (useWindowTex) {
        const cols = Math.max(3, Math.round(bW / 3))
        const wTex = new THREE.CanvasTexture(makeWindowTex(params.floors, cols))
        finalMat = new THREE.MeshStandardMaterial({
          map: wTex, roughness: 0.3, metalness: 0.1, color: 0xe0e5ec,
        })
      }
      // 본체
      const boxGeo = new THREE.BoxGeometry(bW, bH, bD)
      const mesh = new THREE.Mesh(boxGeo, finalMat)
      mesh.position.set(S * blk.x + buildableOffsetX, bH / 2, S * blk.z + buildableOffsetZ)
      scene.add(mesh)
      // 에지
      scene.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(boxGeo),
        new THREE.LineBasicMaterial({ color: 0x4a6080, transparent: true, opacity: 0.4 })
      ))
      scene.children[scene.children.length - 1].position.copy(mesh.position)
      
      // 발코니 (2층 이상 정면 — 얇은 슬라브 돌출)
      if (useWindowTex && params.floors > 1) {
        for (let f = 1; f < params.floors; f++) {
          const balcony = new THREE.Mesh(
            new THREE.BoxGeometry(bW * 0.85, 0.15, 1.2),
            balconyMat
          )
          balcony.position.set(S * blk.x + buildableOffsetX, f * fH, S * blk.z + buildableOffsetZ + bD/2 + 0.6)
          scene.add(balcony)
          // 난간
          const rail = new THREE.Mesh(
            new THREE.BoxGeometry(bW * 0.85, 1.0, 0.05),
            railMat
          )
          rail.position.set(S * blk.x + buildableOffsetX, f * fH + 0.5, S * blk.z + buildableOffsetZ + bD/2 + 1.15)
          scene.add(rail)
        }
      }
      
      // 옥상 난간
      if (useWindowTex) {
        const roofRail = new THREE.Mesh(
          new THREE.BoxGeometry(bW + 0.4, 0.8, 0.08),
          railMat
        )
        roofRail.position.set(S * blk.x + buildableOffsetX, bH + 0.4, S * blk.z + buildableOffsetZ + bD/2 + 0.04)
        scene.add(roofRail)
        // 측면 난간
        const sideRail = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.8, bD + 0.4),
          railMat
        )
        sideRail.position.set(S * blk.x + buildableOffsetX + bW/2 + 0.04, bH + 0.4, S * blk.z + buildableOffsetZ)
        scene.add(sideRail)
      }
      
      // 1F 캐노피 (입구)
      if (useWindowTex) {
        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(Math.min(bW * 0.3, 4), 0.12, 1.8),
          new THREE.MeshStandardMaterial({ color: 0x506068, metalness: 0.3, roughness: 0.4 })
        )
        canopy.position.set(S * blk.x + buildableOffsetX, fH * 0.82, S * blk.z + buildableOffsetZ + bD/2 + 0.9)
        scene.add(canopy)
      }
    }
    balconyMat.dispose(); railMat.dispose()
  }

  // ━━━ 텍스트 라벨 생성 (다크 테마용) ━━━
  function addLabel(scene: any, text: string, x: number, y: number, z: number, size: number = 2, color: string = '#b0c0d0') {
    const c = document.createElement('canvas')
    c.width = 512; c.height = 64
    const ctx = c.getContext('2d')!
    ctx.fillStyle = color; ctx.font = `bold ${Math.round(size * 8)}px sans-serif`
    ctx.textAlign = 'center'; ctx.fillText(text, 256, 44)
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }))
    sprite.position.set(x, y, z)
    sprite.scale.set(size * 3, size * 0.8, 1)
    scene.add(sprite)
  }

  // ━━━ 치수선 ━━━
  function addDimLine(scene: any, p1: number[], p2: number[], label: string, offset: number = 0) {
    const pts = [new THREE.Vector3(...p1), new THREE.Vector3(...p2)]
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0xdd4444 })
    ))
    const mx = (p1[0]+p2[0])/2, my = (p1[1]+p2[1])/2 + offset, mz = (p1[2]+p2[2])/2
    addLabel(scene, label, mx, my, mz, 1.5, '#dd4444')
  }

  const bldMat = new THREE.MeshStandardMaterial({ color: 0xc8d0d8, roughness: 0.4 })
  const typeKR: Record<string,string> = { tower:'타워형', linear:'판상형', lshape:'ㄱ자형', courtyard:'중정형', cluster:'클러스터형' }
  const typeLabel = typeKR[params.type] || params.type
  const isLShape = params.type === 'lshape' || params.originalType === 'lshape'
  const isCourtyard = params.type === 'courtyard' || params.originalType === 'courtyard'

  // 바운딩 박스 (전체 건물 — buildableOffset 포함)
  let bbMinX = Infinity, bbMaxX = -Infinity, bbMinZ = Infinity, bbMaxZ = -Infinity
  for (const blk of geo.blocks) {
    bbMinX = Math.min(bbMinX, S*blk.x + buildableOffsetX - S*blk.w/2); bbMaxX = Math.max(bbMaxX, S*blk.x + buildableOffsetX + S*blk.w/2)
    bbMinZ = Math.min(bbMinZ, S*blk.z + buildableOffsetZ - S*blk.d/2); bbMaxZ = Math.max(bbMaxZ, S*blk.z + buildableOffsetZ + S*blk.d/2)
  }
  const bbW = bbMaxX - bbMinX, bbD = bbMaxZ - bbMinZ, bbCX = (bbMinX+bbMaxX)/2, bbCZ = (bbMinZ+bbMaxZ)/2

  // ━━━ 알렉산더 패턴 시각 요소 추출 ━━━
  const pv = getPatternVisuals({
    type: params.type, floors: params.floors, units: params.units,
    coverage: params.coverage, siteArea: params.siteArea,
    buildingCount: params.buildingCount,
  })

  // ━━━ 패턴 기반 3D 요소 추가 함수 ━━━
  function addPatternElements(scene: any, mode: 'plan' | 'iso' | 'perspective') {
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x3a7a2a })
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x8B6914 })
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xc8b898 })

    // #110 정원벽 — 대지 경계에 헤지
    if (pv.hasGardenWall) {
      const hw = 0.8, hh = 1.2, positions = [
        [-S/2+0.5, hh/2, 0], [S/2-0.5, hh/2, 0],
        [0, hh/2, -S/2+0.5],
      ]
      for (const [x, y, z] of positions) {
        const hedgeLen = mode === 'plan' ? S*0.3 : S*0.25
        const hedge = new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hedgeLen), hedgeMat)
        hedge.position.set(x, y, z); scene.add(hedge)
      }
    }

    // #163 야외 방 — 퍼골라/벤치
    if (pv.hasOutdoorRoom) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.8), benchMat)
      bench.position.set(S*0.25, 0.25, -S*0.3); scene.add(bench)
    }

    // #112 조용한 입구 — 전이 포장
    if (pv.hasQuietEntry) {
      const path = new THREE.Mesh(new THREE.PlaneGeometry(2, S*0.3), pathMat)
      path.rotation.x = -Math.PI/2; path.position.set(0, 0.05, S*0.35); scene.add(path)
    }

    // #73 놀이터
    if (pv.hasPlayground && mode !== 'plan') {
      const slide = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xe85050 }))
      slide.position.set(-S*0.2, 0.75, S*0.15); scene.add(slide)
    }

    // #170 과일 나무 (간단 원뿔)
    if (pv.hasFruitTrees) {
      const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d8a2d })
      const treePositions = [[S*0.3, 0, -S*0.25], [-S*0.3, 0, -S*0.2]]
      for (const [tx, _, tz] of treePositions) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 2, 6), benchMat)
        trunk.position.set(tx, 1, tz); scene.add(trunk)
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), treeMat)
        canopy.position.set(tx, 3, tz); scene.add(canopy)
      }
    }

    hedgeMat.dispose(); benchMat.dispose(); pathMat.dispose()
  }

  // ━━━ 패턴 라벨 추가 함수 ━━━
  function addPatternLabels(scene: any, x: number, y: number, z: number) {
    const labels = pv.patternLabels.slice(0, 4)
    labels.forEach((label, i) => {
      addLabel(scene, label, x, y - i * 1.5, z, 1.2, '#1a6b1a')
    })
    if (pv.propertyLabels.length > 0) {
      addLabel(scene, `속성: ${pv.propertyLabels.slice(0, 3).join(' · ')}`, x, y - labels.length * 1.5 - 1, z, 1, '#6a3399')
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ① 배치도 (Site Plan) — 위에서 내려다 봄
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const scene = buildScene(0x141a26)
    // 대지 (다크)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(S*1.3, S*1.3), new THREE.MeshStandardMaterial({ color: 0x1e2836, roughness: 0.9 }))
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.1; scene.add(ground)
    // 대지 경계선 (밝은 파란)
    const boundary = [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a,b]) => new THREE.Vector3(a*S/2, 0.1, b*S/2))
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(boundary), new THREE.LineBasicMaterial({ color: 0x3b82f6 })))
    // 건물 (창문 텍스처)
    addBuilding(scene, bldMat, true)
    // 도로 (진한 회색 + 차선)
    const roadW = params.regulation?.roadWidth || 8
    const road = new THREE.Mesh(new THREE.PlaneGeometry(S * 1.3, roadW), new THREE.MeshStandardMaterial({ color: 0x2a2e38 }))
    road.rotation.x = -Math.PI / 2; road.position.set(0, -0.05, S/2 + roadW/2 + 2); scene.add(road)
    // 차선
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(S*0.9, 0.3), new THREE.MeshBasicMaterial({ color: 0xffcc00 }))
    lane.rotation.x = -Math.PI / 2; lane.position.set(0, 0, S/2 + roadW/2 + 2); scene.add(lane)
    // 조경 (나무)
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d7a2d })
    for (const [tx, tz] of [[bbMinX - 3, bbMinZ], [bbMaxX + 2, bbCZ], [bbCX, bbMinZ - 3]] as [number,number][]) {
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 6), treeMat)
      canopy.position.set(tx, 2.5, tz); scene.add(canopy)
    }
    // 라벨
    addLabel(scene, `${typeLabel} 배치도`, 0, bH + 3, -S/2 - 2, 2.5, '#8ab4f8')
    addLabel(scene, 'N ↑', S/2 - 2, bH + 2, -S/2 + 2, 2, '#34d399')
    addLabel(scene, `도로 (${roadW}m)`, 0, 1, S/2 + roadW/2 + 2, 1.2, '#9ca3af')
    // 알렉산더 패턴 요소
    addPatternElements(scene, 'plan')
    // 카메라
    const cam = new THREE.OrthographicCamera(-S*0.85, S*0.85, S*0.6, -S*0.85, 0.1, S*10)
    cam.position.set(0, S * 2, 0.01); cam.lookAt(0, 0, 0)
    renderer.render(scene, cam)
    results.push({ type: 'site-plan', label: '배치도', image: canvas.toDataURL('image/png') })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ② 아이소메트릭 (Isometric) — 45도 경사
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const scene = buildScene(0x141a26)
    // 지면 (다크)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(S*2, S*2), new THREE.MeshStandardMaterial({ color: 0x1a2430 }))
    ground.rotation.x = -Math.PI / 2; scene.add(ground)
    // 대지 경계 (바닥 그리드)
    const bndPts = [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a,b]) => new THREE.Vector3(a*S/2, 0.05, b*S/2))
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bndPts), new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5 })))
    // 건물 (창문 텍스처)
    addBuilding(scene, bldMat, true)
    // 도로
    const roadW = params.regulation?.roadWidth || 8
    const road = new THREE.Mesh(new THREE.PlaneGeometry(S*1.5, roadW), new THREE.MeshStandardMaterial({ color: 0x2a2e38 }))
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, S/2 + roadW/2 + 1); scene.add(road)
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(S*1.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xffcc00 }))
    lane.rotation.x = -Math.PI / 2; lane.position.set(0, 0.03, S/2 + roadW/2 + 1); scene.add(lane)
    // 층수 라벨
    for (let f = 0; f < params.floors; f++) {
      addLabel(scene, `${f+1}F`, bbMaxX + 3, f * fH + fH/2, bbMaxZ + 1, 2, '#60a5fa')
    }
    // 타이틀
    addLabel(scene, `${typeLabel} · ${params.floors}층 ${params.units || 1}세대`, bbCX, bH + 5, bbCZ, 2.5, '#e0e8f0')
    // 치수선
    const dimOff = 4
    addDimLine(scene, [bbMinX, 0, bbMaxZ + dimOff], [bbMaxX, 0, bbMaxZ + dimOff], `${bbW.toFixed(1)}m`)
    addDimLine(scene, [bbMaxX + dimOff, 0, bbMinZ], [bbMaxX + dimOff, 0, bbMaxZ], `${bbD.toFixed(1)}m`)
    addDimLine(scene, [bbMaxX + dimOff + 2, 0, bbMaxZ], [bbMaxX + dimOff + 2, bH, bbMaxZ], `H=${bH.toFixed(1)}m`, 2)
    // 건축면적
    addLabel(scene, `건축면적 ${Math.round(geo.totalFootprint)}㎡`, bbCX, -2, bbMaxZ + dimOff + 3, 1.8, '#34d399')
    // 알렉산더 패턴
    addPatternElements(scene, 'iso')
    // 카메라 — 건물 크기 기준 줌 (대지가 아닌 건물에 맞춤)
    const bldgSpan = Math.max(bbW, bbD, bH) * 1.6
    const cam = new THREE.OrthographicCamera(-bldgSpan, bldgSpan, bldgSpan*0.7, -bldgSpan*0.5, 0.1, S*10)
    // ㄱ자형: L의 안쪽(오목한 면)에서 보면 두 날개가 선명
    const camX = (isLShape || isCourtyard) ? bbMinX - bbW*0.5 : bbMaxX + bbW*0.5
    const camZ = (isLShape || isCourtyard) ? bbMaxZ + bbD*0.3 : bbMaxZ + bbD*0.3
    cam.position.set(camX, bldgSpan*0.7, camZ); cam.lookAt(bbCX, bH*0.3, bbCZ)
    renderer.render(scene, cam)
    results.push({ type: 'isometric', label: '아이소메트릭', image: canvas.toDataURL('image/png') })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ③ 단면도 (Section) — 다크 테마, 층별 색상
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const scene = buildScene(0x141a26)
    const bW = bbW
    // 건물 단면 — 층별 색상
    for (let f = 0; f < params.floors; f++) {
      const isGround = f === 0
      const floorColor = isGround ? 0xd4845a : 0x8090a8
      const floorGeo = new THREE.PlaneGeometry(bW, fH)
      const floorMesh = new THREE.Mesh(floorGeo, new THREE.MeshBasicMaterial({ color: floorColor, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }))
      floorMesh.position.set(bbCX, f * fH + fH/2, 0); scene.add(floorMesh)
      // 윤곽선
      scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(floorGeo), new THREE.LineBasicMaterial({ color: 0x4a6080 })))
      scene.children[scene.children.length-1].position.copy(floorMesh.position)
      // 층 라벨
      addLabel(scene, `${f+1}F`, bbCX - bW/2 - 3, f*fH+fH/2, 0, 1.5, isGround ? '#f59e0b' : '#60a5fa')
      // 층고 표시 (첫 층만)
      if (f === 0) addLabel(scene, `1F ${(fH*1.3).toFixed(1)}m`, bbCX + bW/2 + 5, fH/2, 0, 1.2, '#f59e0b')
      if (f === 1) addLabel(scene, `기준층 ${fH.toFixed(1)}m`, bbCX + bW/2 + 5, f*fH+fH/2, 0, 1.2, '#9ca3af')
    }
    // 옥상
    const roofLine = [new THREE.Vector3(bbCX - bW/2, bH, 0), new THREE.Vector3(bbCX + bW/2, bH, 0)]
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(roofLine), new THREE.LineBasicMaterial({ color: 0x34d399 })))
    addLabel(scene, '기계실', bbCX, bH + fH*0.3, 0, 1, '#6b7280')
    // 지하
    const ugGeo = new THREE.PlaneGeometry(bW * 0.85, fH * 0.8)
    const ugMesh = new THREE.Mesh(ugGeo, new THREE.MeshBasicMaterial({ color: 0x2a3040, side: THREE.DoubleSide }))
    ugMesh.position.set(bbCX, -fH*0.5, 0); scene.add(ugMesh)
    scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(ugGeo), new THREE.LineBasicMaterial({ color: 0x4a5568 })))
    scene.children[scene.children.length-1].position.copy(ugMesh.position)
    addLabel(scene, 'B1F 주차장', bbCX, -fH*0.5, 0, 1.2, '#a78bfa')
    // 지면선
    const glPts = [new THREE.Vector3(bbCX - bW*0.8, 0, 0), new THREE.Vector3(bbCX + bW*0.8, 0, 0)]
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(glPts), new THREE.LineBasicMaterial({ color: 0x34d399 })))
    addLabel(scene, 'GL', bbCX + bW*0.8 + 2, 0.5, 0, 1, '#34d399')
    // 높이 치수
    addDimLine(scene, [bbCX + bW/2+3, 0, 0], [bbCX + bW/2+3, bH, 0], `${bH.toFixed(1)}m`, 1)
    // 도로면 표시
    const roadLine = [new THREE.Vector3(bbCX + bW*0.6, 0, 0), new THREE.Vector3(bbCX + bW*0.8, 0, 0)]
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(roadLine), new THREE.LineBasicMaterial({ color: 0x6b7280 })))
    addLabel(scene, `도로 ${(params.regulation?.roadWidth || 8)}m`, bbCX + bW*0.8 + 2, -0.5, 0, 1, '#6b7280')
    addLabel(scene, `단면도 · ${typeLabel}`, bbCX, bH+4, 0, 2.2, '#e0e8f0')
    // 카메라
    const secScale = Math.max(bW, bH) * 1.3
    const cam = new THREE.OrthographicCamera(-secScale, secScale, secScale*0.7, -secScale*0.4, -10, 100)
    cam.position.set(bbCX, bH/2, 10); cam.lookAt(bbCX, bH/2, 0)
    renderer.render(scene, cam)
    results.push({ type: 'section', label: '단면도', image: canvas.toDataURL('image/png') })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ④ 입면도 (Elevation) — 다크 테마, 창문 텍스처
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const scene = buildScene(0x141a26)
    addBuilding(scene, bldMat, true)
    // 지면선 (초록)
    const glPts = [new THREE.Vector3(-S*0.7, 0, bbMaxZ + 0.5), new THREE.Vector3(S*0.7, 0, bbMaxZ + 0.5)]
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(glPts), new THREE.LineBasicMaterial({ color: 0x34d399 })))
    // 높이 제한선 (빨간 점선 — 캔버스 기반 대시)
    const hlY = params.regulation?.roadWidth ? Math.min(30, params.regulation.roadWidth * 1.5 + 6) : 30
    const hlPts = [new THREE.Vector3(-S*0.6, hlY, bbMaxZ + 0.5), new THREE.Vector3(S*0.6, hlY, bbMaxZ + 0.5)]
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(hlPts), new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.5 })))
    addLabel(scene, `높이한도 ${hlY}m`, S*0.4, hlY + 1.5, bbMaxZ + 0.5, 1.2, '#ef4444')
    // 층 라벨
    for (let f = 0; f < params.floors; f++) {
      addLabel(scene, `${f+1}F`, bbMinX - 3, f*fH+fH/2, bbMaxZ + 0.5, 1.2, '#60a5fa')
    }
    addLabel(scene, `정면 입면도 · ${typeLabel}`, bbCX, bH+3, bbMaxZ + 0.5, 2.2, '#e0e8f0')
    // 폭 치수
    addDimLine(scene, [bbMinX, -1, bbMaxZ + 0.5], [bbMaxX, -1, bbMaxZ + 0.5], `${bbW.toFixed(1)}m`)
    // 카메라 — 건물 크기 기준 정면
    const elW = Math.max(bbW, bH) * 1.3
    const cam = new THREE.OrthographicCamera(-elW, elW, elW*0.7, -elW*0.2, -S*2, S*3)
    cam.position.set(bbCX, bH*0.4, bbMaxZ + bH*2); cam.lookAt(bbCX, bH*0.4, bbCZ)
    renderer.render(scene, cam)
    results.push({ type: 'elevation', label: '입면도', image: canvas.toDataURL('image/png') })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⑤ 투시도 (Perspective) — 다크 테마, 원근감
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const scene = buildScene(0x141a26)
    // 지면 (다크)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(S*3, S*3), new THREE.MeshStandardMaterial({ color: 0x1a2430 }))
    ground.rotation.x = -Math.PI / 2; scene.add(ground)
    // 건물 (창문 텍스처)
    addBuilding(scene, bldMat, true)
    // 도로 + 차선
    const roadW = params.regulation?.roadWidth || 8
    const road = new THREE.Mesh(new THREE.PlaneGeometry(S*2.5, roadW), new THREE.MeshStandardMaterial({ color: 0x2a2e38 }))
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, S/2 + roadW/2 + 1); scene.add(road)
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(S*2, 0.2), new THREE.MeshBasicMaterial({ color: 0xffcc00 }))
    lane.rotation.x = -Math.PI / 2; lane.position.set(0, 0.03, S/2 + roadW/2 + 1); scene.add(lane)
    // 나무
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d7a2d })
    for (const [tx, tz] of [[-S*0.35, S*0.15], [S*0.4, -S*0.2]] as [number,number][]) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 2, 6), new THREE.MeshStandardMaterial({ color: 0x6b4423 }))
      trunk.position.set(tx, 1, tz); scene.add(trunk)
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 6), treeMat)
      canopy.position.set(tx, 3.5, tz); scene.add(canopy)
    }
    addLabel(scene, `투시도 · ${typeLabel}`, bbCX, bH+5, bbCZ, 2.5, '#e0e8f0')
    // 알렉산더 패턴
    addPatternElements(scene, 'perspective')
    // 카메라 — 건물 크기 기준, ㄱ자형은 L 안쪽에서
    const cam = new THREE.PerspectiveCamera(40, 800/600, 0.1, S*10)
    const pDist = Math.max(bbW, bbD, bH) * 2.0
    const pCamX = (isLShape || isCourtyard) ? bbMinX - pDist*0.3 : bbMaxX + pDist*0.3
    const pCamZ = bbMaxZ + pDist*0.4
    cam.position.set(pCamX, bH*1.0, pCamZ); cam.lookAt(bbCX, bH*0.3, bbCZ)
    renderer.render(scene, cam)
    results.push({ type: 'perspective', label: '투시도', image: canvas.toDataURL('image/png') })
  }

  // 정리
  renderer.dispose()
  bldMat.dispose()

  return results
}
