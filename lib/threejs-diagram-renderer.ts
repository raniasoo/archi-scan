// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Three.js 통합 도면 렌더러 (Single Source of Truth)
// 하나의 3D 모델 → 배치도/아이소메트릭/단면도/입면도/투시도
// 기존 7개 SVG 컴포넌트를 대체
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { getBuildingGeometry, type BuildingGeometry } from '@/lib/building-geometry'

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

  // 캔버스 + 렌더러
  const canvas = document.createElement('canvas')
  canvas.width = 800; canvas.height = 600
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true })
  renderer.setSize(800, 600)
  renderer.setClearColor(0xffffff, 1)

  const results: DiagramResult[] = []
  const fp = Math.max(params.coverage, 20) / 100

  // ━━━ 공통 장면 구성 함수 ━━━
  function buildScene(bgColor: number = 0xffffff) {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(bgColor)
    const amb = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(amb)
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(S, S * 2, S)
    scene.add(dir)
    return scene
  }

  // ━━━ 건물 메쉬 생성 (공유) ━━━
  function addBuilding(scene: any, mat: any) {
    const isLU = params.type !== 'cluster' && (params.type === 'lshape' || params.type === 'courtyard')
    if (isLU) {
      const shape = new THREE.Shape()
      if (params.type === 'lshape') {
        const wt = Math.sqrt(fp) * 0.42 * S
        const H = 0.4 * fp * S * S / wt
        const V = 0.6 * fp * S * S / wt + wt
        shape.moveTo(-H/2, V/2 - wt); shape.lineTo(H/2 - wt, V/2 - wt)
        shape.lineTo(H/2 - wt, -V/2); shape.lineTo(H/2, -V/2)
        shape.lineTo(H/2, V/2); shape.lineTo(-H/2, V/2); shape.closePath()
      } else {
        const wt = Math.sqrt(fp) * 0.33 * S
        const W = 0.36 * fp * S * S / wt, D = 0.32 * fp * S * S / wt + wt
        shape.moveTo(-W/2, -D/2); shape.lineTo(-W/2+wt, -D/2)
        shape.lineTo(-W/2+wt, D/2-wt); shape.lineTo(W/2-wt, D/2-wt)
        shape.lineTo(W/2-wt, -D/2); shape.lineTo(W/2, -D/2)
        shape.lineTo(W/2, D/2); shape.lineTo(-W/2, D/2); shape.closePath()
      }
      const extGeo = new THREE.ExtrudeGeometry(shape, { depth: bH, bevelEnabled: false })
      extGeo.rotateX(-Math.PI / 2)
      scene.add(new THREE.Mesh(extGeo, mat))
      // 에지
      scene.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(extGeo),
        new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 })
      ))
    } else {
      for (const blk of geo.blocks) {
        const bW = S * blk.w, bD = S * blk.d
        const boxGeo = new THREE.BoxGeometry(bW, bH, bD)
        const mesh = new THREE.Mesh(boxGeo, mat)
        mesh.position.set(S * blk.x, bH / 2, S * blk.z)
        scene.add(mesh)
        scene.add(new THREE.LineSegments(
          new THREE.EdgesGeometry(boxGeo),
          new THREE.LineBasicMaterial({ color: 0x333333 })
        ))
        // 에지 위치 동기화
        const edges = scene.children[scene.children.length - 1]
        edges.position.copy(mesh.position)
      }
    }
  }

  // ━━━ 텍스트 라벨 생성 ━━━
  function addLabel(scene: any, text: string, x: number, y: number, z: number, size: number = 2, color: string = '#333333') {
    const c = document.createElement('canvas')
    c.width = 256; c.height = 64
    const ctx = c.getContext('2d')!
    ctx.fillStyle = color; ctx.font = `bold ${Math.round(size * 8)}px sans-serif`
    ctx.textAlign = 'center'; ctx.fillText(text, 128, 44)
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ① 배치도 (Site Plan) — 위에서 내려다 봄
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const scene = buildScene(0xf5f5f0)
    // 대지
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshStandardMaterial({ color: 0xe8e0d8 }))
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.1; scene.add(ground)
    // 대지 경계선
    const boundary = [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a,b]) => new THREE.Vector3(a*S/2, 0.1, b*S/2))
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(boundary), new THREE.LineBasicMaterial({ color: 0x2266cc, linewidth: 2 })))
    // 건물 (위에서 볼 건물 높이를 낮게)
    const topMat = new THREE.MeshStandardMaterial({ color: 0x90a0b0, roughness: 0.3 })
    addBuilding(scene, topMat)
    // 도로
    const road = new THREE.Mesh(new THREE.PlaneGeometry(S * 1.2, params.regulation?.roadWidth || 6),
      new THREE.MeshStandardMaterial({ color: 0x555555 }))
    road.rotation.x = -Math.PI / 2; road.position.set(0, -0.05, S/2 + (params.regulation?.roadWidth || 6)/2 + 2); scene.add(road)
    // 라벨
    addLabel(scene, `${typeLabel} 배치도`, 0, bH + 3, -S/2 - 2, 2.5, '#333333')
    addLabel(scene, 'N ↑', -S/2 + 2, bH + 2, -S/2 + 2, 2, '#2266cc')
    addLabel(scene, '도로', 0, 1, S/2 + (params.regulation?.roadWidth || 6)/2 + 2, 1.5, '#666666')
    // 카메라 (위에서)
    const cam = new THREE.OrthographicCamera(-S*0.8, S*0.8, S*0.6, -S*0.8, 0.1, S*10)
    cam.position.set(0, S * 2, 0.01); cam.lookAt(0, 0, 0)
    renderer.render(scene, cam)
    results.push({ type: 'site-plan', label: '배치도', image: canvas.toDataURL('image/png') })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ② 아이소메트릭 (Isometric) — 45도 경사
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const scene = buildScene(0xf8f8ff)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(S*1.5, S*1.5), new THREE.MeshStandardMaterial({ color: 0xd8e8d0 }))
    ground.rotation.x = -Math.PI / 2; scene.add(ground)
    addBuilding(scene, bldMat)
    // 층수 라벨
    for (let f = 0; f < params.floors; f++) {
      addLabel(scene, `${f+1}F`, -S*0.35, f * fH + fH/2, S*0.35, 1.2, '#555555')
    }
    addLabel(scene, `${typeLabel} · ${params.floors}층`, 0, bH + 3, 0, 2, '#333333')
    // 치수
    const blk0 = geo.blocks[0]
    const bW = S * (blk0?.w || 0.5), bD = S * (blk0?.d || 0.5)
    addDimLine(scene, [-bW/2, 0, bD/2+2], [bW/2, 0, bD/2+2], `${bW.toFixed(1)}m`)
    addDimLine(scene, [bW/2+2, 0, -bD/2], [bW/2+2, 0, bD/2], `${bD.toFixed(1)}m`)
    addDimLine(scene, [bW/2+3, 0, 0], [bW/2+3, bH, 0], `${bH.toFixed(1)}m`, 1)
    // 카메라 (아이소메트릭)
    const d = S * 1.2
    const cam = new THREE.OrthographicCamera(-d, d, d*0.75, -d*0.5, 0.1, S*10)
    cam.position.set(S*0.8, S*0.7, S*0.8); cam.lookAt(0, bH*0.3, 0)
    renderer.render(scene, cam)
    results.push({ type: 'isometric', label: '아이소메트릭', image: canvas.toDataURL('image/png') })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ③ 단면도 (Section) — 옆에서 자른 단면
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const scene = buildScene(0xffffff)
    const blk0 = geo.blocks[0]
    const bW = S * (blk0?.w || 0.5), bD = S * (blk0?.d || 0.5)
    // 건물 단면 (직사각형으로 표현)
    const secGeo = new THREE.PlaneGeometry(bW, bH)
    const secMat = new THREE.MeshBasicMaterial({ color: 0xd0d8e0, side: THREE.DoubleSide })
    const secMesh = new THREE.Mesh(secGeo, secMat)
    secMesh.position.set(0, bH/2, 0); scene.add(secMesh)
    // 윤곽선
    scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(secGeo), new THREE.LineBasicMaterial({ color: 0x333333 })))
    scene.children[scene.children.length-1].position.copy(secMesh.position)
    // 층 구분선
    for (let f = 0; f <= params.floors; f++) {
      const y = f * fH
      const pts = [new THREE.Vector3(-bW/2, y, 0), new THREE.Vector3(bW/2, y, 0)]
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: f === 0 ? 0x333333 : 0x999999 })))
      if (f < params.floors) addLabel(scene, `${f+1}F`, -bW/2-3, y+fH/2, 0, 1.5, '#555555')
    }
    // 지하 (해칭)
    const ugGeo = new THREE.PlaneGeometry(bW * 0.8, fH * 0.8)
    const ugMesh = new THREE.Mesh(ugGeo, new THREE.MeshBasicMaterial({ color: 0xeee8dd }))
    ugMesh.position.set(0, -fH*0.5, 0); scene.add(ugMesh)
    addLabel(scene, 'B1F 주차장', 0, -fH*0.5, 0, 1.2, '#886644')
    // 지면선
    const glPts = [new THREE.Vector3(-bW, 0, 0), new THREE.Vector3(bW, 0, 0)]
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(glPts), new THREE.LineBasicMaterial({ color: 0x44aa44, linewidth: 2 })))
    addLabel(scene, 'GL', bW+2, 0.5, 0, 1, '#44aa44')
    // 높이 치수
    addDimLine(scene, [bW/2+2, 0, 0], [bW/2+2, bH, 0], `${bH.toFixed(1)}m`, 1)
    addLabel(scene, `단면도 · ${typeLabel}`, 0, bH+4, 0, 2, '#333333')
    // 카메라
    const cam = new THREE.OrthographicCamera(-bW*1.2, bW*1.2, bH*1.3, -fH*1.5, -10, 100)
    cam.position.set(0, bH/2, 10); cam.lookAt(0, bH/2, 0)
    renderer.render(scene, cam)
    results.push({ type: 'section', label: '단면도', image: canvas.toDataURL('image/png') })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ④ 입면도 (Elevation) — 정면에서 봄
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const scene = buildScene(0xffffff)
    addBuilding(scene, new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.3 }))
    // 지면선
    const glPts = [new THREE.Vector3(-S*0.6, 0, S*0.4), new THREE.Vector3(S*0.6, 0, S*0.4)]
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(glPts), new THREE.LineBasicMaterial({ color: 0x44aa44 })))
    // 층 라벨
    for (let f = 0; f < params.floors; f++) {
      addLabel(scene, `${f+1}F`, -S*0.4, f*fH+fH/2, S*0.4, 1.2, '#555555')
    }
    addLabel(scene, `정면 입면도 · ${typeLabel}`, 0, bH+3, S*0.4, 2, '#333333')
    // 카메라 (정면)
    const cam = new THREE.OrthographicCamera(-S*0.7, S*0.7, bH*1.2, -fH, -S, S*3)
    cam.position.set(0, bH*0.4, S*1.5); cam.lookAt(0, bH*0.4, 0)
    renderer.render(scene, cam)
    results.push({ type: 'elevation', label: '입면도', image: canvas.toDataURL('image/png') })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⑤ 투시도 (Perspective) — 원근감
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    const scene = buildScene(0xeef2f8)
    // 지면
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(S*3, S*3), new THREE.MeshStandardMaterial({ color: 0xd0dac0 }))
    ground.rotation.x = -Math.PI / 2; scene.add(ground)
    addBuilding(scene, bldMat)
    // 도로
    const road = new THREE.Mesh(new THREE.PlaneGeometry(S*2, params.regulation?.roadWidth || 6),
      new THREE.MeshStandardMaterial({ color: 0x444444 }))
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.05, S/2+5); scene.add(road)
    addLabel(scene, `투시도 · ${typeLabel} · ${params.floors}층 ${params.units || 1}세대`, 0, bH+4, 0, 2.5, '#333333')
    // 카메라 (원근)
    const cam = new THREE.PerspectiveCamera(35, 800/600, 0.1, S*10)
    cam.position.set(S*0.6, bH*0.8, S*0.9); cam.lookAt(0, bH*0.25, 0)
    renderer.render(scene, cam)
    results.push({ type: 'perspective', label: '투시도', image: canvas.toDataURL('image/png') })
  }

  // 정리
  renderer.dispose()
  bldMat.dispose()

  return results
}
