// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 인테리어 3D-First — Three.js 실내 모델링 + 캡처
// 세대 내부(벽체/창문/가구)를 3D로 생성 → Gemini 포토리얼 변환
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface InteriorParams {
  unitArea: number      // 세대 면적 (㎡)
  floors: number
  type: string          // courtyard / tower / lshape / linear
  units: number
  style?: string        // int-modern-luxury 등
}

interface InteriorCapture {
  angle: string
  image: string // base64
}

/**
 * Three.js로 세대 내부를 모델링하고 3방향 캡처합니다.
 * 거실 → 주방 → 침실 방향의 실내 투시도를 생성합니다.
 */
export async function captureInterior3D(params: InteriorParams): Promise<InteriorCapture[]> {
  const THREE = await import('three')
  const { unitArea, floors, type, units, style } = params
  
  // 세대 크기 추정 (㎡ → m)
  const area = unitArea || (type === 'courtyard' && units <= 2 ? 120 : units <= 10 ? 60 : 45)
  const ratio = area > 80 ? 1.3 : area > 50 ? 1.5 : 1.8 // 종횡비
  const width = Math.sqrt(area * ratio)  // 거실 방향 폭
  const depth = area / width              // 깊이
  const ceilingH = floors <= 3 ? 2.7 : 2.4
  
  const canvas = document.createElement('canvas')
  canvas.width = 640; canvas.height = 480
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(640, 480)
  renderer.setClearColor(0xffffff)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.5

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f0eb)

  // 조명
  const amb = new THREE.AmbientLight(0xfff5e0, 0.6)
  scene.add(amb)
  const sun = new THREE.DirectionalLight(0xfff8e8, 1.2)
  sun.position.set(width, ceilingH * 2, -depth * 0.5)
  sun.castShadow = true
  scene.add(sun)
  // 실내 포인트 라이트 (따뜻한 조명)
  const pointLight = new THREE.PointLight(0xffe4c4, 0.5, width * 3)
  pointLight.position.set(width * 0.3, ceilingH - 0.3, -depth * 0.3)
  scene.add(pointLight)

  // ━━━ 재질 정의 ━━━
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5f0eb, roughness: 0.9 }) // 흰 벽
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.6 }) // 원목 바닥
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.95 }) // 천장
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.5 }) // 가구 원목
  const fabricMat = new THREE.MeshStandardMaterial({ color: 0xd4c5b0, roughness: 0.8 }) // 패브릭
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.3, roughness: 0.1 })

  // ━━━ 바닥 ━━━
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMat)
  floor.rotation.x = -Math.PI / 2; floor.position.set(width/2, 0, -depth/2)
  scene.add(floor)

  // ━━━ 천장 ━━━
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), ceilMat)
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(width/2, ceilingH, -depth/2)
  scene.add(ceiling)

  // ━━━ 벽체 4면 ━━━
  // 좌벽
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, ceilingH), wallMat)
  leftWall.rotation.y = Math.PI / 2; leftWall.position.set(0, ceilingH/2, -depth/2)
  scene.add(leftWall)
  // 우벽
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, ceilingH), wallMat)
  rightWall.rotation.y = -Math.PI / 2; rightWall.position.set(width, ceilingH/2, -depth/2)
  scene.add(rightWall)
  // 뒷벽 (창문 쪽)
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(width, ceilingH), wallMat)
  backWall.position.set(width/2, ceilingH/2, -depth)
  scene.add(backWall)
  // 앞벽 (현관 쪽)
  const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(width, ceilingH), wallMat)
  frontWall.rotation.y = Math.PI; frontWall.position.set(width/2, ceilingH/2, 0)
  scene.add(frontWall)

  // ━━━ 창문 (뒷벽에 큰 창) ━━━
  const winW = width * 0.6, winH = ceilingH * 0.65
  const window1 = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), glassMat)
  window1.position.set(width/2, ceilingH * 0.55, -depth + 0.02)
  scene.add(window1)
  // 창틀
  const frameGeo = new THREE.BoxGeometry(winW + 0.1, 0.05, 0.08)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
  const topFrame = new THREE.Mesh(frameGeo, frameMat)
  topFrame.position.set(width/2, ceilingH * 0.55 + winH/2, -depth + 0.02)
  scene.add(topFrame)
  const botFrame = new THREE.Mesh(frameGeo, frameMat)
  botFrame.position.set(width/2, ceilingH * 0.55 - winH/2, -depth + 0.02)
  scene.add(botFrame)

  // ━━━ 가구 — 거실 ━━━
  // 소파
  const sofaW = Math.min(2.2, width * 0.35), sofaD = 0.9, sofaH = 0.45
  const sofa = new THREE.Mesh(new THREE.BoxGeometry(sofaW, sofaH, sofaD), fabricMat)
  sofa.position.set(width * 0.35, sofaH/2, -depth * 0.35)
  scene.add(sofa)
  // 소파 등받이
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(sofaW, 0.35, 0.15), fabricMat)
  backrest.position.set(width * 0.35, sofaH + 0.15, -depth * 0.35 - sofaD/2 + 0.07)
  scene.add(backrest)

  // 커피테이블
  const tableW = sofaW * 0.6, tableD = 0.5
  const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(tableW, 0.04, tableD), woodMat)
  coffeeTable.position.set(width * 0.35, 0.4, -depth * 0.5)
  scene.add(coffeeTable)
  // 테이블 다리
  for (const [dx, dz] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.38, 6), woodMat)
    leg.position.set(width*0.35 + dx*tableW*0.4, 0.19, -depth*0.5 + dz*tableD*0.4)
    scene.add(leg)
  }

  // TV (벽에 걸린)
  const tv = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.04), new THREE.MeshStandardMaterial({ color: 0x111111 }))
  tv.position.set(width * 0.35, ceilingH * 0.5, -depth + 0.05)
  scene.add(tv)

  // ━━━ 가구 — 식탁 (우측) ━━━
  const dTable = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.8), woodMat)
  dTable.position.set(width * 0.75, 0.75, -depth * 0.4)
  scene.add(dTable)
  // 의자 2개
  for (const dz of [-0.5, 0.5]) {
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.4), woodMat)
    chair.position.set(width * 0.75, 0.45, -depth * 0.4 + dz)
    scene.add(chair)
  }

  // ━━━ 주방 카운터 (우벽 쪽) ━━━
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.9, depth * 0.3),
    new THREE.MeshStandardMaterial({ color: 0xe8e0d8, roughness: 0.3 })
  )
  counter.position.set(width - 0.3, 0.45, -depth * 0.75)
  scene.add(counter)

  // ━━━ 러그 ━━━
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(sofaW * 1.2, tableD * 2.5),
    new THREE.MeshStandardMaterial({ color: 0xc8b898, roughness: 0.95 })
  )
  rug.rotation.x = -Math.PI / 2; rug.position.set(width * 0.35, 0.01, -depth * 0.42)
  scene.add(rug)

  // ━━━ 라벨 ━━━
  function addLabel(text: string, x: number, y: number, z: number, size: number = 1, color: string = '#333') {
    const c = document.createElement('canvas')
    c.width = 256; c.height = 48
    const ctx = c.getContext('2d')!
    ctx.fillStyle = color; ctx.font = `bold ${Math.round(size * 14)}px sans-serif`
    ctx.textAlign = 'center'; ctx.fillText(text, 128, 36)
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }))
    sprite.position.set(x, y, z); sprite.scale.set(size * 1.5, size * 0.4, 1)
    scene.add(sprite)
  }
  addLabel('거실', width * 0.35, ceilingH * 0.85, -depth * 0.4, 1.2, '#666')
  addLabel('식탁', width * 0.75, ceilingH * 0.85, -depth * 0.4, 0.8, '#666')
  addLabel('주방', width - 0.3, ceilingH * 0.85, -depth * 0.75, 0.8, '#666')
  addLabel(`${Math.round(area)}㎡`, width * 0.5, 0.1, -depth * 0.1, 1, '#999')

  // ━━━ 3방향 캡처 ━━━
  const captures: InteriorCapture[] = []
  const camera = new THREE.PerspectiveCamera(55, 640/480, 0.1, 100)

  // ① 거실 정면 (현관에서 바라봄)
  camera.position.set(width * 0.4, 1.1, -0.3)
  camera.lookAt(width * 0.4, 1.0, -depth * 0.7)
  renderer.render(scene, camera)
  captures.push({ angle: 'living-room', image: canvas.toDataURL('image/png') })

  // ② 창문 쪽에서 거실 뒤돌아봄
  camera.position.set(width * 0.4, 1.1, -depth * 0.85)
  camera.lookAt(width * 0.5, 1.0, -depth * 0.2)
  renderer.render(scene, camera)
  captures.push({ angle: 'window-view', image: canvas.toDataURL('image/png') })

  // ③ 주방/식탁 쪽
  camera.position.set(width * 0.5, 1.1, -depth * 0.15)
  camera.lookAt(width * 0.8, 0.9, -depth * 0.6)
  renderer.render(scene, camera)
  captures.push({ angle: 'kitchen-dining', image: canvas.toDataURL('image/png') })

  // 정리
  renderer.dispose()
  wallMat.dispose(); floorMat.dispose(); ceilMat.dispose()
  woodMat.dispose(); fabricMat.dispose(); glassMat.dispose()

  console.log(`[INTERIOR-3D] ${captures.length}방향 캡처 완료 (${Math.round(area)}㎡, ${width.toFixed(1)}×${depth.toFixed(1)}m)`)
  return captures
}
