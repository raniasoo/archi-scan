// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 오프스크린 Three.js 캡처 — AI Hub에서 자동 호출
// 배치안 데이터만으로 5방향 3D 스크린샷 생성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { getBuildingGeometry } from '@/lib/building-geometry'

interface CaptureParams {
  type: string
  coverage: number
  siteArea: number
  floors: number
  buildingCount?: number
  originalType?: string
  floorHeight?: number
}

export async function captureBuilding3D(params: CaptureParams): Promise<{ angle: string; image: string }[]> {
  const THREE = await import('three')
  const { type, coverage, siteArea, floors, buildingCount, originalType, floorHeight = 3.3 } = params
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
