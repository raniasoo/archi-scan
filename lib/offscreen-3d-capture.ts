// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 오프스크린 Three.js 캡처 — AI Hub에서 자동 호출
// 배치안 데이터만으로 5방향 3D 스크린샷 생성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { getBuildingGeometry } from '@/lib/building-geometry'
import { getPatternVisuals } from '@/lib/alexander-patterns'

interface CaptureParams {
  type: string
  coverage: number
  siteArea: number
  floors: number
  units?: number
  buildingCount?: number
  originalType?: string
  floorHeight?: number
}

export async function captureBuilding3D(params: CaptureParams): Promise<{ angle: string; image: string }[]> {
  const THREE = await import('three')
  const { type, coverage, siteArea, floors, units, buildingCount, originalType, floorHeight = 3.3 } = params
  const geo = getBuildingGeometry({ type, coverage, siteArea, floors, buildingCount, originalType, floorHeight })
  const S = geo.siteWidth
  const bH = geo.buildingHeight

  // 오프스크린 캔버스 + 렌더러
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 512
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(512, 512)
  renderer.setClearColor(0x87ceeb) // 하늘색 배경

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb)
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, S * 10)

  // 조명
  const amb = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(amb)
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.2)
  sun.position.set(S * 0.5, S * 1.2, S * 0.8)
  scene.add(sun)

  // 지면
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(S * 3, S * 3),
    new THREE.MeshStandardMaterial({ color: 0x4a7c3f })
  )
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true
  scene.add(ground)

  // 대지 경계
  const sitePts = [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(
    ([a, b]) => new THREE.Vector3(a * S / 2, 0.1, b * S / 2)
  )
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(sitePts),
    new THREE.LineBasicMaterial({ color: 0x60a5fa })
  ))

  // 건물 생성 — L/U 단일 형태 또는 블록
  const fp = Math.max(coverage, 20) / 100
  const bldMat = new THREE.MeshStandardMaterial({ color: 0xe0e5ec, roughness: 0.3 })

  const isLU = type !== 'cluster' && (type === 'lshape' || type === 'courtyard')
  
  if (isLU) {
    const shape = new THREE.Shape()
    if (type === 'lshape') {
      const wt = Math.sqrt(fp) * 0.42 * S
      const H = 0.4 * fp * S * S / wt
      const V = 0.6 * fp * S * S / wt + wt
      shape.moveTo(-H/2, V/2 - wt)
      shape.lineTo(H/2 - wt, V/2 - wt)
      shape.lineTo(H/2 - wt, -V/2)
      shape.lineTo(H/2, -V/2)
      shape.lineTo(H/2, V/2)
      shape.lineTo(-H/2, V/2)
      shape.closePath()
    } else {
      const wt = Math.sqrt(fp) * 0.33 * S
      const totalW = 0.36 * fp * S * S / wt
      const totalD = 0.32 * fp * S * S / wt + wt
      shape.moveTo(-totalW/2, -totalD/2)
      shape.lineTo(-totalW/2 + wt, -totalD/2)
      shape.lineTo(-totalW/2 + wt, totalD/2 - wt)
      shape.lineTo(totalW/2 - wt, totalD/2 - wt)
      shape.lineTo(totalW/2 - wt, -totalD/2)
      shape.lineTo(totalW/2, -totalD/2)
      shape.lineTo(totalW/2, totalD/2)
      shape.lineTo(-totalW/2, totalD/2)
      shape.closePath()
    }
    const extGeo = new THREE.ExtrudeGeometry(shape, { depth: bH, bevelEnabled: false })
    extGeo.rotateX(-Math.PI / 2)
    const mesh = new THREE.Mesh(extGeo, bldMat)
    scene.add(mesh)
  } else {
    // 블록 기반
    for (const blk of geo.blocks) {
      const bW = S * blk.w, bD = S * blk.d
      const bX = S * blk.x, bZ = S * blk.z
      const boxGeo = new THREE.BoxGeometry(bW, bH, bD)
      const mesh = new THREE.Mesh(boxGeo, bldMat)
      mesh.position.set(bX, bH / 2, bZ)
      scene.add(mesh)
    }
  }

  // 도로
  const roadGeo = new THREE.PlaneGeometry(S * 1.5, 6)
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x333840 })
  const road = new THREE.Mesh(roadGeo, roadMat)
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.05, S / 2 + 5)
  scene.add(road)

  // ━━━ 알렉산더 패턴 3D 요소 (AI 렌더링 참조용) ━━━
  const pv = getPatternVisuals({ type, floors, units, coverage, siteArea, buildingCount })
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x3a7a2a })
  // 정원벽 (헤지)
  if (pv.hasGardenWall) {
    for (const [hx, hz] of [[-S/2+0.5, 0], [S/2-0.5, 0], [0, -S/2+0.5]] as [number,number][]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, S*0.2), hedgeMat)
      h.position.set(hx, 0.5, hz); scene.add(h)
    }
  }
  // 야외 벤치
  if (pv.hasOutdoorRoom) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.6), new THREE.MeshStandardMaterial({ color: 0x8B6914 }))
    b.position.set(S*0.2, 0.2, -S*0.25); scene.add(b)
  }
  // 입구 전이 포장
  if (pv.hasQuietEntry) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, S*0.2), new THREE.MeshStandardMaterial({ color: 0xc8b898 }))
    p.rotation.x = -Math.PI/2; p.position.set(0, 0.06, S*0.3); scene.add(p)
  }
  hedgeMat.dispose()

  // ━━━ 층수 라벨 (건물 정면에 "1F" "2F" 표시 → Gemini 층수 강제) ━━━
  const fH = floorHeight
  for (let f = 0; f < floors; f++) {
    const floorCanvas = document.createElement('canvas')
    floorCanvas.width = 64; floorCanvas.height = 32
    const fCtx = floorCanvas.getContext('2d')!
    fCtx.fillStyle = 'rgba(0,0,0,0.7)'; fCtx.fillRect(0, 0, 64, 32)
    fCtx.fillStyle = '#ffffff'; fCtx.font = 'bold 22px sans-serif'; fCtx.textAlign = 'center'
    fCtx.fillText(`${f + 1}F`, 32, 24)
    const fLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(fH * 0.8, fH * 0.4),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(floorCanvas), transparent: true })
    )
    // 정면(+Z 방향)에 라벨 배치
    const blk0 = geo.blocks[0]
    fLabel.position.set(S * (blk0?.x || 0) - S * (blk0?.w || 0.3) * 0.3, f * fH + fH * 0.5, S * 0.4)
    scene.add(fLabel)
  }

  // ━━━ "TOTAL: 2F" 큰 라벨 (건물 위에 표시) ━━━
  const totalCanvas = document.createElement('canvas')
  totalCanvas.width = 160; totalCanvas.height = 40
  const tCtx = totalCanvas.getContext('2d')!
  tCtx.fillStyle = 'rgba(255,50,50,0.85)'; tCtx.fillRect(0, 0, 160, 40)
  tCtx.fillStyle = '#ffffff'; tCtx.font = 'bold 28px sans-serif'; tCtx.textAlign = 'center'
  tCtx.fillText(`TOTAL: ${floors}F ONLY`, 80, 30)
  const totalLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(bH * 1.5, bH * 0.35),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(totalCanvas), transparent: true })
  )
  totalLabel.position.set(0, bH + bH * 0.3, 0)
  totalLabel.lookAt(new THREE.Vector3(S, bH + bH * 0.3, S))
  scene.add(totalLabel)

  // ━━━ 인체 스케일 (1.7m 사람 → Gemini 규모 강제) ━━━
  // 캡슐형 사람 (머리 + 몸통)
  const personBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.25, 1.3, 8),
    new THREE.MeshStandardMaterial({ color: 0x4466aa })
  )
  personBody.position.set(S * 0.35, 0.65, S * 0.4)
  scene.add(personBody)
  const personHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xddbb99 })
  )
  personHead.position.set(S * 0.35, 1.5, S * 0.4)
  scene.add(personHead)

  // ━━━ 세대수 표시 (건물 옆에) ━━━
  const unitCanvas = document.createElement('canvas')
  unitCanvas.width = 128; unitCanvas.height = 32
  const uCtx = unitCanvas.getContext('2d')!
  uCtx.fillStyle = 'rgba(0,100,0,0.8)'; uCtx.fillRect(0, 0, 128, 32)
  uCtx.fillStyle = '#ffffff'; uCtx.font = 'bold 18px sans-serif'; uCtx.textAlign = 'center'
  uCtx.fillText(`${params.floors}층 ${units || 1}세대`, 64, 24)
  const unitLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(bH * 1.2, bH * 0.3),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(unitCanvas), transparent: true })
  )
  unitLabel.position.set(-S * 0.35, bH * 0.5, S * 0.4)
  scene.add(unitLabel)

  // ━━━ 5방향 캡처 ━━━
  const captures: { angle: string; image: string }[] = []
  
  const captureFrom = (name: string, px: number, py: number, pz: number) => {
    camera.position.set(px, py, pz)
    camera.lookAt(0, bH * 0.3, 0)
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)
    captures.push({ angle: name, image: canvas.toDataURL('image/png') })
  }

  captureFrom('bird-eye', S * 0.8, S * 0.9, S * 0.8)
  captureFrom('front', 0, bH * 0.6, S * 1.2)
  captureFrom('side', S * 1.2, bH * 0.6, 0)
  captureFrom('top-down', 0.1, S * 1.5, 0.1)

  // Depth Map
  const origBg = scene.background
  scene.background = new THREE.Color(0x000000)
  const depthMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x222222 })
  const origMats = new Map<any, any>()
  scene.traverse((obj: any) => {
    if (obj.isMesh && obj.material) {
      origMats.set(obj, obj.material)
      obj.material = obj === ground || obj === road ? darkMat : depthMat
    }
    if (obj.isLine) obj.visible = false
  })
  captureFrom('depth-map', S * 0.8, S * 0.9, S * 0.8)
  origMats.forEach((mat, obj) => { obj.material = mat })
  scene.traverse((obj: any) => { if (obj.isLine) obj.visible = true })
  scene.background = origBg

  // 정리
  renderer.dispose()
  bldMat.dispose(); roadMat.dispose(); depthMat.dispose(); darkMat.dispose()

  console.log(`[OFFSCREEN-3D] ${captures.length}방향 캡처 완료 (${type}, ${floors}층)`)
  return captures
}
