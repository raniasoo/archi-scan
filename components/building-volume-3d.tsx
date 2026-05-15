"use client"

import { useEffect, useRef, useState } from "react"
import { X, RotateCcw, ZoomIn, ZoomOut, Camera, Loader2 } from "lucide-react"

import { getBuildingGeometry, getClusterBlocks, type BuildingBlock } from "@/lib/building-geometry"
import { STYLES } from "@/components/ai-hub"

interface BuildingVolume3DProps {
  layoutName: string
  layoutType: 'tower' | 'courtyard' | 'lshape' | 'linear' | 'cluster'
  originalType?: string
  buildingCount?: number
  floors: number
  units?: number
  parking?: number
  siteArea: number
  coverage: number
  floorHeight?: number
  sitePolygon?: { coords: [number, number][], centroid: [number, number] } | null
  terrain?: { elevationDiff?: number; avgSlope?: number; slopeDirection?: string } | null
  siteCoords?: { lng: number; lat: number } | null
  regulation?: { frontSetback?: number; sideSetback?: number; rearSetback?: number; roadWidth?: number; maxHeight?: number; setbackAngle?: number; northShadow?: boolean } | null
  onClose: () => void
}

type Block = BuildingBlock

function getBlockFloors(_idx: number, total: number, _type: string): number {
  return total
}

/** 프로시저럴 창문 텍스처 Phase 2 — 프레임, 커튼, AC실외기, 발코니 난간 */
function makeWindowTex(floorCount: number, winCols: number): HTMLCanvasElement {
  const W = 512, H = 512, c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')!
  // 외벽 (미세 텍스처 콘크리트)
  g.fillStyle = '#d0d8e0'
  g.fillRect(0, 0, W, H)
  // 콘크리트 노이즈
  for (let i = 0; i < 2000; i++) {
    const nx = Math.random() * W, ny = Math.random() * H
    g.fillStyle = `rgba(${150 + Math.random() * 40},${155 + Math.random() * 40},${160 + Math.random() * 40},0.15)`
    g.fillRect(nx, ny, 1, 1)
  }
  const fH = H / floorCount, wW = W / winCols
  for (let f = 0; f < floorCount; f++) {
    const y = f * fH
    const isLobby = f === floorCount - 1
    for (let w = 0; w < winCols; w++) {
      const x = w * wW
      if (isLobby) {
        // 1층 로비 — 대형 유리 + 프레임
        g.fillStyle = '#1a1a1a'
        g.fillRect(x + wW * 0.04, y + fH * 0.08, wW * 0.92, fH * 0.82)
        g.fillStyle = '#142a42'
        g.fillRect(x + wW * 0.06, y + fH * 0.1, wW * 0.88, fH * 0.78)
        // 유리 반사 그라데이션
        const lGr = g.createLinearGradient(x, y, x + wW, y + fH)
        lGr.addColorStop(0, 'rgba(100,180,230,0.35)')
        lGr.addColorStop(0.4, 'rgba(140,200,240,0.15)')
        lGr.addColorStop(1, 'rgba(80,150,210,0.3)')
        g.fillStyle = lGr
        g.fillRect(x + wW * 0.08, y + fH * 0.12, wW * 0.84, fH * 0.74)
        // 로비 조명 (따뜻한 빛)
        g.fillStyle = 'rgba(255,220,160,0.12)'
        g.fillRect(x + wW * 0.2, y + fH * 0.3, wW * 0.6, fH * 0.4)
        // 중앙 분할바
        g.fillStyle = '#2a2a2a'
        g.fillRect(x + wW * 0.49, y + fH * 0.1, wW * 0.02, fH * 0.78)
      } else {
        // 상층 주거 — 창문 + 프레임 + 발코니 + AC
        const wx = x + wW * 0.14, wy = y + fH * 0.16
        const ww = wW * 0.72, wh = fH * 0.52
        
        // 창 프레임 (알루미늄)
        g.fillStyle = '#3a3a3a'
        g.fillRect(wx - 2, wy - 2, ww + 4, wh + 4)
        
        // 유리
        g.fillStyle = '#0c1a2a'
        g.fillRect(wx, wy, ww, wh)
        
        // 유리 반사 그라데이션
        const gr = g.createLinearGradient(wx, wy, wx + ww, wy + wh)
        gr.addColorStop(0, 'rgba(70,130,195,0.45)')
        gr.addColorStop(0.3, 'rgba(120,180,230,0.2)')
        gr.addColorStop(0.7, 'rgba(90,160,215,0.3)')
        gr.addColorStop(1, 'rgba(55,115,175,0.35)')
        g.fillStyle = gr
        g.fillRect(wx + 1, wy + 1, ww - 2, wh - 2)
        
        // 창 분할바 (십자)
        g.fillStyle = '#4a4a4a'
        g.fillRect(wx + ww * 0.48, wy, ww * 0.04, wh)
        g.fillRect(wx, wy + wh * 0.48, ww, wh * 0.04)
        
        // 랜덤 커튼 (일부 세대)
        if (Math.random() > 0.55) {
          const curtainColor = Math.random() > 0.5 ? 'rgba(230,225,215,0.35)' : 'rgba(200,210,220,0.3)'
          g.fillStyle = curtainColor
          const side = Math.random() > 0.5
          g.fillRect(wx + (side ? 0 : ww * 0.55), wy + 2, ww * 0.4, wh - 4)
        }
        
        // 랜덤 실내조명
        if (Math.random() > 0.4) {
          g.fillStyle = `rgba(255,225,170,${0.05 + Math.random() * 0.1})`
          g.fillRect(wx + 2, wy + 2, ww - 4, wh - 4)
        }
        
        // 발코니 난간 (가로 살)
        const balY = y + fH * 0.72
        g.fillStyle = '#7a8088'
        g.fillRect(x + wW * 0.03, balY, wW * 0.94, fH * 0.02) // 상단
        g.fillRect(x + wW * 0.03, balY + fH * 0.08, wW * 0.94, fH * 0.015) // 중간
        g.fillRect(x + wW * 0.03, balY + fH * 0.15, wW * 0.94, fH * 0.03) // 하단 (두꺼움)
        // 수직 지지대
        for (let v = 0; v < 4; v++) {
          g.fillRect(x + wW * (0.05 + v * 0.28), balY, wW * 0.015, fH * 0.18)
        }
        
        // AC 실외기 (일부 세대, 발코니 아래)
        if (Math.random() > 0.65) {
          g.fillStyle = '#e0e0e0'
          g.fillRect(x + wW * 0.7, y + fH * 0.88, wW * 0.2, fH * 0.08)
          g.fillStyle = '#a0a0a0'
          g.fillRect(x + wW * 0.72, y + fH * 0.89, wW * 0.04, fH * 0.06) // 팬 그릴
        }
      }
    }
    // 층간 라인 (슬라브)
    g.fillStyle = '#9aa2ac'
    g.fillRect(0, y + fH - 2, W, 2.5)
  }
  return c
}

export function BuildingVolume3D({
  layoutName, layoutType, originalType, buildingCount, floors, units, parking, siteArea, coverage, floorHeight = 3.3, sitePolygon, terrain, siteCoords, regulation, onClose
}: BuildingVolume3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rendererRef  = useRef<any>(null)
  const cameraRef    = useRef<any>(null)
  const sceneRef     = useRef<any>(null)
  const isDragging   = useRef(false)
  const lastMouse    = useRef({ x: 0, y: 0 })
  const rotation     = useRef({ x: 0.45, y: 0.6 })
  const zoom         = useRef(1)
  const [loaded, setLoaded]       = useState(false)
  const [compassAngle, setCompassAngle] = useState(0)
  const [blockInfo, setBlockInfo] = useState<{ label: string; floors: number }[]>([])
  const [error, setError]         = useState<string | null>(null)
  const [photoResult, setPhotoResult] = useState<string | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoScore, setPhotoScore] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('modern-luxury')

  // Three.js 5방향 캡처 → Gemini 포토리얼 변환
  const captureAndConvert = async () => {
    const canvas = canvasRef.current
    const renderer = rendererRef.current
    const camera = cameraRef.current
    const scene = sceneRef.current
    if (!canvas || !renderer || !camera || !scene) return
    setPhotoLoading(true)
    setPhotoResult(null)
    setPhotoScore('')
    
    try {
      const THREE = await import('three')
      const S = Math.sqrt(siteArea)
      const bH = floors * (floorHeight || 3.3)
      
      // 원본 카메라 상태 저장
      const origPos = camera.position.clone()
      const origRot = camera.quaternion.clone()
      const origFov = camera.fov
      
      const captures: { angle: string; data: string }[] = []
      
      const captureFrom = (name: string, px: number, py: number, pz: number, lx: number, ly: number, lz: number) => {
        camera.position.set(px, py, pz)
        camera.lookAt(lx, ly, lz)
        camera.updateProjectionMatrix()
        renderer.render(scene, camera)
        captures.push({ angle: name, data: canvas.toDataURL('image/png') })
      }
      
      // ━━━ 5방향 캡처 ━━━
      // ① 조감도 (bird-eye 45°) — 기본 뷰
      captureFrom('bird-eye', S * 0.8, S * 0.9, S * 0.8, 0, bH * 0.3, 0)
      // ② 정면 (front) — 층수 확인용
      captureFrom('front', 0, bH * 0.6, S * 1.2, 0, bH * 0.35, 0)
      // ③ 측면 (side) — 깊이 확인용
      captureFrom('side', S * 1.2, bH * 0.6, 0, 0, bH * 0.35, 0)
      // ④ 평면 (top-down) — 형태 확인용 (L자/ㄷ자 명확)
      captureFrom('top-down', 0.1, S * 1.5, 0.1, 0, 0, 0)
      
      // ⑤ Depth Map (건물 실루엣)
      try {
        const origBg = scene.background
        const origMats: Map<any, any> = new Map()
        const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
        const blackMat = new THREE.MeshBasicMaterial({ color: 0x222222 })
        scene.traverse((obj: any) => {
          if (obj.isMesh && obj.material) {
            origMats.set(obj, obj.material)
            obj.material = obj.castShadow ? whiteMat : blackMat
          }
          if (obj.isLine || obj.isLineSegments || obj.isSprite) obj.visible = false
        })
        scene.background = new THREE.Color(0x000000)
        // bird-eye 각도로 depth map
        camera.position.set(S * 0.8, S * 0.9, S * 0.8)
        camera.lookAt(0, bH * 0.3, 0)
        camera.updateProjectionMatrix()
        renderer.render(scene, camera)
        captures.push({ angle: 'depth-map', data: canvas.toDataURL('image/png') })
        // 복원
        origMats.forEach((mat, obj) => { obj.material = mat })
        scene.traverse((obj: any) => {
          if (obj.isLine || obj.isLineSegments || obj.isSprite) obj.visible = true
        })
        scene.background = origBg
        whiteMat.dispose(); blackMat.dispose()
      } catch (e) { console.warn('[DEPTH] failed:', e) }
      
      // 카메라 복원
      camera.position.copy(origPos)
      camera.quaternion.copy(origRot)
      camera.fov = origFov
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
      
      console.log(`[3D-PHOTO] ${captures.length}방향 캡처 완료`)
      
      // ━━━ API 호출 ━━━
      const selectedStyleData = STYLES.find(s => s.id === selectedStyle)
      const res = await fetch('/api/3d-to-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          multiAngle: captures.map(c => ({ angle: c.angle, image: c.data })),
          layoutName, floors, units, type: layoutType,
          buildingCount: buildingCount || 1,
          address: '', angle: 'bird-eye',
          stylePrompt: selectedStyleData?.prompt || '',
          styleName: selectedStyleData?.label || '모던 럭셔리',
        }),
      })
      const data = await res.json()
      if (data.success && data.image) {
        setPhotoResult(data.image)
        setPhotoScore(data.score ? `${data.score}점 (${data.floorsDetected}층 감지, 형태 ${data.shapeMatch})` : '')
      } else {
        console.error('[3D-PHOTO]', data.error)
      }
    } catch (e: any) {
      console.error('[3D-PHOTO] Error:', e.message)
    } finally {
      setPhotoLoading(false)
    }
  }

  useEffect(() => {
    let THREE: any, mounted = true, animId = 0

    const go = async (W: number, H: number) => {
      if (!mounted || !canvasRef.current) return
      try { THREE = await import('three') } catch (e: any) { setError(e.message); setLoaded(true); return }
      if (!mounted || !canvasRef.current) return

      // 공유 유틸리티에서 건물 치수 계산 (도면 7종과 동일)
      const geo = getBuildingGeometry({ type: layoutType, coverage, siteArea, floors, buildingCount, originalType, floorHeight })
      const blocks: Block[] = geo.blocks
      const info: { label: string; floors: number }[] = []
      
      try { // ★ 전체 3D 렌더링을 하나의 try로 보호
      const canvas = canvasRef.current
      const S = Math.sqrt(siteArea)
      const camDist = S * 2.5

      /* ── Renderer (ACES Tone Mapping) ── */
      let EffectComposer: any, RenderPass: any, UnrealBloomPass: any, ShaderPass: any
      const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
      r.setSize(W, H)
      r.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2))
      r.shadowMap.enabled = true
      r.shadowMap.type = THREE.PCFSoftShadowMap
      r.toneMapping = THREE.ACESFilmicToneMapping
      r.toneMappingExposure = 2.0
      r.outputColorSpace = THREE.SRGBColorSpace
      rendererRef.current = r
      
      // ━━━ 포스트프로세싱 체인 (Bloom only) ━━━
      let composer: any = null
      // (scene/cam은 아래에서 생성 후 setupPostProcessing()으로 설정)
      const setupPostProcessing = (sc: any, ca: any) => {
        if (!EffectComposer || !RenderPass) return
        try {
          composer = new EffectComposer(r)
          composer.addPass(new RenderPass(sc, ca))
          
          // Bloom (유리/가로등 광택)
          if (UnrealBloomPass) {
            const bloom = new UnrealBloomPass(
              new THREE.Vector2(W, H),
              0.35,  // strength
              0.6,   // radius
              0.85   // threshold
            )
            composer.addPass(bloom)
          }
          
          
          console.log('[3D] Post-processing enabled: Bloom ✅')
        } catch (e) {
          console.warn('[3D] Post-processing setup failed:', e)
          composer = null
        }
      }

      /* ── Scene (그라데이션 하늘) ── */
      const scene = new THREE.Scene()
      sceneRef.current = scene
      const skyC = document.createElement('canvas')
      skyC.width = 2; skyC.height = 512
      const skyG = skyC.getContext('2d')!
      const sg = skyG.createLinearGradient(0, 0, 0, 512)
      sg.addColorStop(0, '#142838'); sg.addColorStop(0.3, '#15304a')
      sg.addColorStop(0.65, '#2a5575'); sg.addColorStop(1, '#2a5575')
      skyG.fillStyle = sg; skyG.fillRect(0, 0, 2, 512)
      const skyTex = new THREE.CanvasTexture(skyC)
      skyTex.mapping = THREE.EquirectangularReflectionMapping
      scene.background = skyTex
      scene.environment = skyTex
      scene.fog = new THREE.FogExp2(0x15304a, 0.0006)

      /* ── Camera ── */
      const cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 5000)
      cameraRef.current = cam

      /* ── Lights (HDR 3점 조명) ── */
      scene.add(new THREE.HemisphereLight(0xddeeff, 0x668866, 3.0))
      const sun = new THREE.DirectionalLight(0xfff8f0, 6.0)
      sun.position.set(S * 1.5, S * 3, S * 1.5)
      sun.castShadow = true
      sun.shadow.mapSize.set(2048, 2048)
      const sc = sun.shadow.camera
      sc.left = sc.bottom = -S * 1.5; sc.right = sc.top = S * 1.5
      sc.near = 0.5; sc.far = S * 8
      sun.shadow.bias = -0.001; sun.shadow.normalBias = 0.02
      scene.add(sun)
      const fill = new THREE.DirectionalLight(0xccddff, 3.0)
      fill.position.set(-S, S * 0.5, -S * 0.5)
      scene.add(fill)
      const back = new THREE.DirectionalLight(0x8899dd, 2.0)
      back.position.set(-S * 0.5, S * 0.3, S * 2)
      scene.add(back)

      /* ── Ground (실제 표고 지형 or 단순 경사) ── */
      const grassC = document.createElement('canvas')
      grassC.width = grassC.height = 256
      const gg = grassC.getContext('2d')!
      gg.fillStyle = '#1a4528'; gg.fillRect(0, 0, 256, 256)
      for (let i = 0; i < 600; i++) {
        gg.fillStyle = `hsl(${120 + Math.random() * 25},${35 + Math.random() * 25}%,${16 + Math.random() * 12}%)`
        gg.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 3)
      }
      const gTex = new THREE.CanvasTexture(grassC)
      gTex.wrapS = gTex.wrapT = THREE.RepeatWrapping; gTex.repeat.set(S / 8, S / 8)
      const gMat = new THREE.MeshStandardMaterial({ map: gTex, roughness: 0.95, color: 0x2a5a32 })
      
      // 실제 표고 데이터 fetch → 지형 메시 (Terrain3DView와 동일 API)
      const TERRAIN_GRID = 20
      const groundGeo = new THREE.PlaneGeometry(S * 4, S * 4, TERRAIN_GRID - 1, TERRAIN_GRID - 1)
      const ground = new THREE.Mesh(groundGeo, gMat)
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true
      
      if (siteCoords?.lat && siteCoords?.lng) {
        try {
          const range = 0.003
          const eRes = await fetch(`/api/elevation-grid?lat=${siteCoords.lat}&lng=${siteCoords.lng}&grid=12&range=${range}`)
          const eData = await eRes.json()
          if (eData.elevations?.length > 0) {
            const elev = eData.elevations as number[]
            const minE = Math.min(...elev), maxE = Math.max(...elev)
            const eRange = Math.max(maxE - minE, 0.5)
            const heightScale = Math.min(S * 0.15, eRange * 2) // 시각적 스케일
            const pos = groundGeo.attributes.position
            for (let i = 0; i < pos.count; i++) {
              const gx = Math.floor((i % TERRAIN_GRID) / (TERRAIN_GRID - 1) * 11)
              const gy = Math.floor(Math.floor(i / TERRAIN_GRID) / (TERRAIN_GRID - 1) * 11)
              const idx = Math.min(gy * 12 + gx, elev.length - 1)
              const norm = (elev[idx] - minE) / eRange
              pos.setZ(i, norm * heightScale)
            }
            pos.needsUpdate = true
            groundGeo.computeVertexNormals()
            console.log(`[3D] 실제 표고 지형 적용: 고저차 ${eRange.toFixed(1)}m (${minE.toFixed(0)}~${maxE.toFixed(0)}m)`)
          }
        } catch (e) {
          console.warn('[3D] 표고 데이터 로딩 실패:', e)
          // fallback: terrain prop 기반 단순 기울기
          if (terrain?.elevationDiff && terrain.elevationDiff > 1) {
            const slopeAngle = Math.atan(terrain.elevationDiff / (S * 2)) * 0.7
            const dir = terrain.slopeDirection || ''
            if (dir.includes('남') || dir.includes('S')) ground.rotation.x += slopeAngle
            else if (dir.includes('북') || dir.includes('N')) ground.rotation.x -= slopeAngle
          }
        }
      } else if (terrain?.elevationDiff && terrain.elevationDiff > 1) {
        // siteCoords 없으면 terrain prop 기반 단순 기울기
        const slopeAngle = Math.atan(terrain.elevationDiff / (S * 2)) * 0.7
        const dir = terrain.slopeDirection || ''
        if (dir.includes('남') || dir.includes('S')) ground.rotation.x += slopeAngle
        else if (dir.includes('북') || dir.includes('N')) ground.rotation.x -= slopeAngle
      }
      scene.add(ground)

      // 미세 그리드
      const grid = new THREE.GridHelper(S * 3, 30, 0x1a3040, 0x152535)
      grid.position.y = 0.03; grid.material.opacity = 0.35; grid.material.transparent = true
      scene.add(grid)

      // 대지면
      const sf = new THREE.Mesh(new THREE.PlaneGeometry(S, S),
        new THREE.MeshStandardMaterial({ color: 0x556570, roughness: 0.7, metalness: 0.05 }))
      sf.rotation.x = -Math.PI / 2; sf.position.y = 0.06; sf.receiveShadow = true
      scene.add(sf)

      /* ── 대지 경계 (지적도) ── */
      const bpts = sitePolygon?.coords.length
        ? (() => {
            const [cLng, cLat] = sitePolygon.centroid
            const LM = 111319 * Math.cos(cLat * Math.PI / 180)
            const raw = sitePolygon.coords.map(([lng, lat]) => [(lng - cLng) * LM, (lat - cLat) * 111319])
            const cx = raw.reduce((s, p) => s + p[0], 0) / raw.length
            const cy = raw.reduce((s, p) => s + p[1], 0) / raw.length
            return [...raw.map(([x, y]) => new THREE.Vector3(x - cx, 0.3, -(y - cy))),
                     new THREE.Vector3(raw[0][0] - cx, 0.3, -(raw[0][1] - cy))]
          })()
        : [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a, b]) => new THREE.Vector3(a * S / 2, 0.3, b * S / 2))
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bpts), new THREE.LineBasicMaterial({ color: 0x60a5fa })))

      // 이격거리 (regulation 정확값 + 거리 라벨)
      const frontSB = regulation?.frontSetback ?? 3
      const sideSB = regulation?.sideSetback ?? 1.5
      const rearSB = regulation?.rearSetback ?? 2
      const sbLeft = -S / 2 + sideSB
      const sbRight = S / 2 - sideSB
      const sbFront = S / 2 - frontSB
      const sbRear = -S / 2 + rearSB
      const sbPts = [
        new THREE.Vector3(sbLeft, 0.15, sbRear),
        new THREE.Vector3(sbRight, 0.15, sbRear),
        new THREE.Vector3(sbRight, 0.15, sbFront),
        new THREE.Vector3(sbLeft, 0.15, sbFront),
        new THREE.Vector3(sbLeft, 0.15, sbRear),
      ]
      const sbLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(sbPts),
        new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 1.5, gapSize: 1.2, opacity: 0.6, transparent: true }))
      sbLine.computeLineDistances(); scene.add(sbLine)
      
      // 이격거리 라벨 (각 변에 거리 표시)
      const makeSBLabel = (text: string, px: number, pz: number) => {
        const c = document.createElement('canvas'); c.width = 96; c.height = 32
        const g = c.getContext('2d')!
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, 96, 32)
        g.fillStyle = '#f59e0b'; g.font = 'bold 16px sans-serif'; g.textAlign = 'center'
        g.fillText(text, 48, 22)
        const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 1),
          new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true }))
        m.rotation.x = -Math.PI / 2; m.position.set(px, 0.3, pz); scene.add(m)
      }
      makeSBLabel(`전면 ${frontSB}m`, 0, sbFront + frontSB / 2)
      makeSBLabel(`후면 ${rearSB}m`, 0, sbRear - rearSB / 2)
      makeSBLabel(`측면 ${sideSB}m`, sbLeft - sideSB / 2, 0)
      makeSBLabel(`측면 ${sideSB}m`, sbRight + sideSB / 2, 0)

      /* ── 건물 (PBR + 창문 텍스처) ── */

      // 건물 배치 오프셋: 이격선 내부 중앙에 정확히 배치
      const buildableOffsetX = 0 // 좌우 이격 대칭
      const buildableOffsetZ = (rearSB - frontSB) / 2 // 전면/후면 이격 차이만큼 이동

      // ━━━ L자형/중정형: 단일 연결 지오메트리 (100% 형태 일치) ━━━
      const isSingleShape = layoutType !== 'cluster' && (layoutType === 'lshape' || layoutType === 'courtyard')
      
      if (isSingleShape) {
        const tH = floors * floorHeight
        const fp = Math.max(coverage, 20) / 100
        const wt = layoutType === 'lshape' ? Math.sqrt(fp) * 0.42 * S : Math.sqrt(fp) * 0.33 * S

        const shape = new THREE.Shape()
        
        if (layoutType === 'lshape') {
          // ㄱ자형: 단일 L 지오메트리
          const H = 0.4 * fp * S * S / wt   // 가로 날개 길이
          const V = 0.6 * fp * S * S / wt + wt // 세로 날개 길이 (코너 포함)
          // CCW path (ㄱ = 상단 가로 + 우측 세로)
          shape.moveTo(-H/2, V/2 - wt)         // 가로날개 좌하
          shape.lineTo(H/2 - wt, V/2 - wt)     // 내부 코너
          shape.lineTo(H/2 - wt, -V/2)          // 세로날개 우하 내측
          shape.lineTo(H/2, -V/2)               // 세로날개 우하 외측
          shape.lineTo(H/2, V/2)                // 우상
          shape.lineTo(-H/2, V/2)               // 좌상
          shape.closePath()
          info.push({ label: 'ㄱ자형', floors })
        } else {
          // 중정형: 단일 ㄷ자 지오메트리 (개방면=남쪽)
          const totalW = 0.36 * fp * S * S / wt  // 상단 바 폭
          const totalD = 0.32 * fp * S * S / wt + wt // 측면 날개 깊이
          // CCW path (ㄷ = 상단 바 + 좌우 날개, 하단 개방)
          shape.moveTo(-totalW/2, -totalD/2)         // 좌하 외측
          shape.lineTo(-totalW/2 + wt, -totalD/2)    // 좌하 내측
          shape.lineTo(-totalW/2 + wt, totalD/2 - wt) // 좌측 내상
          shape.lineTo(totalW/2 - wt, totalD/2 - wt)  // 우측 내상
          shape.lineTo(totalW/2 - wt, -totalD/2)      // 우하 내측
          shape.lineTo(totalW/2, -totalD/2)            // 우하 외측
          shape.lineTo(totalW/2, totalD/2)             // 우상
          shape.lineTo(-totalW/2, totalD/2)            // 좌상
          shape.closePath()
          info.push({ label: '중정형', floors })
        }

        const geo = new THREE.ExtrudeGeometry(shape, { depth: tH, bevelEnabled: false })
        geo.rotateX(-Math.PI / 2)

        const resFloors2 = Math.max(floors - 1, 1)
        const unitsPerFloor2 = units ? Math.max(1, Math.ceil(units / resFloors2)) : Math.max(4, Math.round(S * 0.3 / 3.5))
        const wCols = Math.max(3, unitsPerFloor2 * 2)
        const wTex = new THREE.CanvasTexture(makeWindowTex(floors, wCols))
        wTex.wrapS = wTex.wrapT = THREE.RepeatWrapping

        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
          map: wTex, roughness: 0.25, metalness: 0.15,
          color: 0xe0e5ec, envMapIntensity: 1.0, side: THREE.DoubleSide,
        }))
        mesh.position.set(buildableOffsetX, 0, buildableOffsetZ)
        mesh.castShadow = true; mesh.receiveShadow = true
        scene.add(mesh)

        // 에지
        scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: 0x8aa8c8, transparent: true, opacity: 0.25 })))

        // 최상층 하이라이트 라인
        const topShape = shape.getPoints()
        const topPts = topShape.map((p: { x: number; y: number }) => new THREE.Vector3(p.x, tH, -p.y))
        topPts.push(topPts[0].clone())
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(topPts), new THREE.LineBasicMaterial({ color: 0x34d399 })))

        // 옥상
        const roofShape = new THREE.ShapeGeometry(shape)
        roofShape.rotateX(-Math.PI / 2)
        const roofC2 = document.createElement('canvas')
        roofC2.width = roofC2.height = 128
        const rg2 = roofC2.getContext('2d')!
        rg2.fillStyle = '#3a4550'; rg2.fillRect(0, 0, 128, 128)
        rg2.strokeStyle = '#4a5560'; rg2.lineWidth = 0.5
        for (let i = 0; i < 128; i += 12) { rg2.beginPath(); rg2.moveTo(i, 0); rg2.lineTo(i, 128); rg2.stroke() }
        const roofMesh = new THREE.Mesh(roofShape,
          new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(roofC2), roughness: 0.7 }))
        roofMesh.position.set(0, tH + 0.05, 0); roofMesh.receiveShadow = true
        scene.add(roofMesh)

        // 중정형 정원 (ㄷ자 내부)
        if (layoutType === 'courtyard') {
          const totalW2 = 0.36 * fp * S * S / wt
          const totalD2 = 0.32 * fp * S * S / wt + wt
          const gardenW = totalW2 - 2 * wt - 2
          const gardenD = totalD2 - wt - 2
          if (gardenW > 2 && gardenD > 2) {
            const garden = new THREE.Mesh(new THREE.PlaneGeometry(gardenW, gardenD),
              new THREE.MeshStandardMaterial({ color: 0x2d5a1e, roughness: 0.9 }))
            garden.rotation.x = -Math.PI / 2
            garden.position.set(0, 0.1, -((totalD2/2 - wt) / 2 - 1))
            scene.add(garden)
          }
        }

        // 엔트런스 캐노피
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 1.5),
          new THREE.MeshStandardMaterial({ color: 0x607080, metalness: 0.3, roughness: 0.4 }))
        canopy.position.set(0, floorHeight * 0.82, S * 0.3)
        canopy.castShadow = true; scene.add(canopy)

      } else {
      // ━━━ 타워/판상/클러스터: 블록 기반 (기존 로직) ━━━
      blocks.forEach((blk, idx) => {
        const bF = getBlockFloors(idx, floors, layoutType)
        const tH = bF * floorHeight
        const bW = S * blk.w, bD = S * blk.d
        const bX = S * blk.x, bZ = S * blk.z
        info.push({ label: blk.label ?? `동${idx + 1}`, floors: bF })

        const shape = new THREE.Shape()
        shape.moveTo(-bW / 2, -bD / 2); shape.lineTo(bW / 2, -bD / 2)
        shape.lineTo(bW / 2, bD / 2); shape.lineTo(-bW / 2, bD / 2)
        shape.closePath()
        const geo = new THREE.ExtrudeGeometry(shape, { depth: tH, bevelEnabled: false })
        geo.rotateX(-Math.PI / 2)

        // 창문 텍스처 — 세대수 정확 반영
        const resFloors = Math.max(bF - 1, 1)
        const bldgCount = Math.max(blocks.length, 1)
        const unitsThisBuilding = units ? Math.ceil(units / bldgCount) : 0
        const unitsPerFloor = units ? Math.max(1, Math.ceil(unitsThisBuilding / resFloors)) : Math.max(3, Math.round(bW / 3.5))
        const wCols = Math.max(3, unitsPerFloor * 2)
        const wTex = new THREE.CanvasTexture(makeWindowTex(bF, wCols))
        wTex.wrapS = wTex.wrapT = THREE.RepeatWrapping

        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
          map: wTex, roughness: 0.25, metalness: 0.15,
          color: 0xe0e5ec, envMapIntensity: 1.0, side: THREE.DoubleSide,
        }))
        mesh.position.set(bX + buildableOffsetX, 0, bZ + buildableOffsetZ); mesh.castShadow = true; mesh.receiveShadow = true
        scene.add(mesh)

        // 에지
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: 0x8aa8c8, transparent: true, opacity: 0.25 }))
        edges.position.set(bX, 0, bZ)
        scene.add(edges)

        // 최상층 라인
        const top = [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a, b]) => new THREE.Vector3(bX + a * bW / 2, tH, bZ + b * bD / 2))
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(top), new THREE.LineBasicMaterial({ color: 0x34d399 })))

        // 5층 단위 라인
        for (let f = 5; f < bF; f += 5) {
          const y = f * floorHeight
          const pts = [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a, b]) => new THREE.Vector3(bX + a * bW / 2, y, bZ + b * bD / 2))
          scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.45 })))
        }

        // 옥상
        const roofC = document.createElement('canvas')
        roofC.width = roofC.height = 128
        const rg = roofC.getContext('2d')!
        rg.fillStyle = '#3a4550'; rg.fillRect(0, 0, 128, 128)
        rg.strokeStyle = '#4a5560'; rg.lineWidth = 0.5
        for (let i = 0; i < 128; i += 12) { rg.beginPath(); rg.moveTo(i, 0); rg.lineTo(i, 128); rg.stroke(); rg.beginPath(); rg.moveTo(0, i); rg.lineTo(128, i); rg.stroke() }
        const roof = new THREE.Mesh(new THREE.PlaneGeometry(bW, bD),
          new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(roofC), roughness: 0.7 }))
        roof.rotation.x = -Math.PI / 2; roof.position.set(bX, tH + 0.05, bZ); roof.receiveShadow = true
        scene.add(roof)

        // 옥상 기계실
        const mH = floorHeight * 0.45
        const mech = new THREE.Mesh(new THREE.BoxGeometry(bW * 0.18, mH, bD * 0.22),
          new THREE.MeshStandardMaterial({ color: 0x506068, roughness: 0.6, metalness: 0.15 }))
        mech.position.set(bX, tH + mH / 2, bZ); mech.castShadow = true
        scene.add(mech)

        // 엔트런스 캐노피 (유리)
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(bW * 0.28, 0.12, 2.5),
          new THREE.MeshStandardMaterial({ color: 0x88ccee, roughness: 0.05, metalness: 0.85, transparent: true, opacity: 0.55 }))
        canopy.position.set(bX, floorHeight * 0.82, bZ + bD / 2 + 0.8); canopy.castShadow = true
        scene.add(canopy)
      })
      } // end else (tower/linear/cluster block-based)

      // ━━━ 일조권 사선제한 (북측 경계에서 45° 사선) ━━━
      if (regulation?.northShadow !== false) {
        const angle = (regulation?.setbackAngle ?? 45) * Math.PI / 180
        const maxH = regulation?.maxHeight ?? (floors * floorHeight)
        const shadowReach = maxH / Math.tan(angle) // 사선이 도달하는 거리
        const northEdge = -S / 2 + rearSB // 북측 이격선
        // 사선 경사면 (반투명 빨간색)
        const shadowGeo = new THREE.BufferGeometry()
        const hw = (S - 2 * sideSB) / 2
        const verts = new Float32Array([
          -hw, 0, northEdge,          // 좌하 (지면, 북측 이격선)
           hw, 0, northEdge,          // 우하
           hw, maxH, northEdge + shadowReach, // 우상 (최대높이, 남쪽으로)
          -hw, 0, northEdge,          // 좌하
           hw, maxH, northEdge + shadowReach, // 우상
          -hw, maxH, northEdge + shadowReach, // 좌상
        ])
        shadowGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
        shadowGeo.computeVertexNormals()
        const shadowPlane = new THREE.Mesh(shadowGeo,
          new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.08, side: THREE.DoubleSide }))
        scene.add(shadowPlane)
        // 사선 경계 라인 (빨간 점선)
        const slPts = [
          new THREE.Vector3(-hw, 0, northEdge),
          new THREE.Vector3(-hw, maxH, northEdge + shadowReach),
          new THREE.Vector3(hw, maxH, northEdge + shadowReach),
          new THREE.Vector3(hw, 0, northEdge),
        ]
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(slPts),
          new THREE.LineBasicMaterial({ color: 0xff6666, transparent: true, opacity: 0.5 })))
        // 라벨
        const nsC = document.createElement('canvas'); nsC.width = 160; nsC.height = 32
        const nsG = nsC.getContext('2d')!
        nsG.fillStyle = 'rgba(0,0,0,0.5)'; nsG.fillRect(0, 0, 160, 32)
        nsG.fillStyle = '#ff6666'; nsG.font = 'bold 13px sans-serif'; nsG.textAlign = 'center'
        nsG.fillText(`일조권 사선 ${regulation?.setbackAngle ?? 45}°`, 80, 22)
        const nsLbl = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.2),
          new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(nsC), transparent: true }))
        nsLbl.position.set(0, maxH * 0.6, northEdge + shadowReach * 0.5)
        nsLbl.lookAt(new THREE.Vector3(0, maxH * 0.6, northEdge + shadowReach * 0.5 + 10))
        scene.add(nsLbl)
      }

      // ━━━ 도로사선 높이 제한선 ━━━
      if (regulation?.roadWidth) {
        const rw = regulation.roadWidth
        const angle = (regulation?.setbackAngle ?? 45) * Math.PI / 180
        const roadShadowH = rw * Math.tan(angle) + frontSB // 도로폭 × tan(각도) + 전면이격
        const roadEdge = S / 2 // 대지 전면 경계
        const hw2 = (S - 2 * sideSB) / 2
        // 높이 제한 수평선 (주황색)
        const rhPts = [
          new THREE.Vector3(-hw2, roadShadowH, roadEdge),
          new THREE.Vector3(hw2, roadShadowH, roadEdge),
        ]
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rhPts),
          new THREE.LineDashedMaterial({ color: 0xff8800, dashSize: 1.5, gapSize: 1 })))
        // 사선 (도로 중심 → 건물 상단)
        const rdCenter = roadEdge + 2 + rw / 2 // 인도 + 도로 중심
        const rsPts = [
          new THREE.Vector3(0, 0, rdCenter),
          new THREE.Vector3(0, roadShadowH, roadEdge),
        ]
        const rsLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(rsPts),
          new THREE.LineDashedMaterial({ color: 0xff8800, dashSize: 1, gapSize: 0.8, transparent: true, opacity: 0.6 }))
        rsLine.computeLineDistances(); scene.add(rsLine)
        // 라벨
        const rsC = document.createElement('canvas'); rsC.width = 160; rsC.height = 32
        const rsCtx = rsC.getContext('2d')!
        rsCtx.fillStyle = 'rgba(0,0,0,0.5)'; rsCtx.fillRect(0, 0, 160, 32)
        rsCtx.fillStyle = '#ff8800'; rsCtx.font = 'bold 13px sans-serif'; rsCtx.textAlign = 'center'
        rsCtx.fillText(`도로사선 ${roadShadowH.toFixed(1)}m`, 80, 22)
        const rsLbl = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.2),
          new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(rsC), transparent: true }))
        rsLbl.position.set(hw2 + 2, roadShadowH, roadEdge)
        scene.add(rsLbl)
      }

      /* ── 조경/도로/디테일 (Phase 2/3) — 실패해도 기본 건물은 표시 ── */
      try {
      // 나무 생성 헬퍼
      const addTree = (tx: number, tz: number, type: 'deciduous' | 'conifer' | 'ornamental') => {
        if (type === 'conifer') {
          // 침엽수 (원뿔)
          const h = 5 + Math.random() * 4
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, h * 0.2, 5),
            new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 }))
          trunk.position.set(tx, h * 0.1, tz); trunk.castShadow = true; scene.add(trunk)
          // 3단 원뿔
          for (let i = 0; i < 3; i++) {
            const coneH = h * (0.35 - i * 0.05)
            const coneR = h * (0.18 - i * 0.03)
            const cone = new THREE.Mesh(new THREE.ConeGeometry(coneR, coneH, 6),
              new THREE.MeshStandardMaterial({ color: 0x1a5a2a + i * 0x050505, roughness: 0.8 }))
            cone.position.set(tx, h * (0.25 + i * 0.22), tz); cone.castShadow = true
            scene.add(cone)
          }
        } else if (type === 'ornamental') {
          // 관상수 (작은 둥근 나무)
          const h = 2 + Math.random() * 1.5
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, h * 0.45, 5),
            new THREE.MeshStandardMaterial({ color: 0x5a3a28, roughness: 0.9 }))
          trunk.position.set(tx, h * 0.225, tz); trunk.castShadow = true; scene.add(trunk)
          const crown = new THREE.Mesh(new THREE.SphereGeometry(h * 0.22, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0x3a8a4a, roughness: 0.7 }))
          crown.position.set(tx, h * 0.55, tz); crown.castShadow = true; scene.add(crown)
        } else {
          // 활엽수 (큰 둥근 나무)
          const h = 4 + Math.random() * 3.5
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, h * 0.32, 6),
            new THREE.MeshStandardMaterial({ color: 0x5a3a28, roughness: 0.9 }))
          trunk.position.set(tx, h * 0.16, tz); trunk.castShadow = true; scene.add(trunk)
          // 불규칙 수관 (2개 겹침)
          const colors = [0x2a7a3a, 0x2d8a3d, 0x258535]
          for (let i = 0; i < 2; i++) {
            const r = h * (0.28 - i * 0.05)
            const crown = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6),
              new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.75 }))
            crown.position.set(tx + (i - 0.5) * r * 0.3, h * (0.52 + i * 0.08), tz + (i - 0.5) * r * 0.2)
            crown.castShadow = true; scene.add(crown)
          }
        }
      }
      
      // 가로등 헬퍼
      const addLamppost = (lx: number, lz: number) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4, 6),
          new THREE.MeshStandardMaterial({ color: 0x404040, metalness: 0.6, roughness: 0.3 }))
        pole.position.set(lx, 2, lz); scene.add(pole)
        // 등불
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0xffeebb, emissive: 0xffdd88, emissiveIntensity: 1.5, roughness: 0.1 }))
        lamp.position.set(lx, 4.2, lz); scene.add(lamp)
        // 포인트 라이트 (약한 조명)
        const pl = new THREE.PointLight(0xffdd88, 0.3, 15)
        pl.position.set(lx, 4, lz); scene.add(pl)
      }

      // ── 중정/클러스터 조경 ──
      if (layoutType === 'courtyard' || layoutType === 'cluster') {
        const cs = S * (layoutType === 'courtyard' ? 0.28 : 0.20)
        const court = new THREE.Mesh(new THREE.PlaneGeometry(cs, cs),
          new THREE.MeshStandardMaterial({ color: 0x2d6b3a, roughness: 0.85 }))
        court.rotation.x = -Math.PI / 2; court.position.y = 0.12; court.receiveShadow = true
        scene.add(court)
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
          [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a, b]) => new THREE.Vector3(a * cs / 2, 0.25, b * cs / 2))),
          new THREE.LineBasicMaterial({ color: 0x22c55e })))

        // 중정 산책로 (십자)
        const pathMat = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.7, metalness: 0.05 })
        const pathH = new THREE.Mesh(new THREE.PlaneGeometry(cs * 0.85, 1.2), pathMat)
        pathH.rotation.x = -Math.PI / 2; pathH.position.set(0, 0.14, 0); pathH.receiveShadow = true
        scene.add(pathH)
        const pathV = new THREE.Mesh(new THREE.PlaneGeometry(1.2, cs * 0.85), pathMat)
        pathV.rotation.x = -Math.PI / 2; pathV.position.set(0, 0.14, 0); pathV.receiveShadow = true
        scene.add(pathV)

        // 화단 (산책로 교차점)
        const flowerBed = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 12),
          new THREE.MeshStandardMaterial({ color: 0x8a5533, roughness: 0.8 }))
        flowerBed.position.set(0, 0.27, 0); scene.add(flowerBed)
        // 꽃 (작은 구체들)
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2
          const fr = 0.8 + Math.random() * 0.4
          const flower = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4),
            new THREE.MeshStandardMaterial({ color: [0xdd4466, 0xee8844, 0xffcc33, 0xaa55cc, 0xff6688][i % 5], roughness: 0.6 }))
          flower.position.set(Math.cos(angle) * fr, 0.5, Math.sin(angle) * fr)
          scene.add(flower)
        }

        // 중정 나무 (다양한 종류)
        const tPos = layoutType === 'cluster'
          ? [[cs*0.25, -cs*0.25, 'deciduous'], [-cs*0.3, cs*0.2, 'conifer'], [cs*0.15, cs*0.3, 'ornamental'], [-cs*0.25, -cs*0.15, 'deciduous']]
          : [[-cs*0.25, -cs*0.25, 'deciduous'], [cs*0.25, cs*0.25, 'conifer'], [cs*0.2, -cs*0.2, 'ornamental']]
        tPos.forEach(([tx, tz, type]) => addTree(tx as number, tz as number, type as any))
        
        // 가로등 (중정)
        addLamppost(cs * 0.35, 0)
        addLamppost(-cs * 0.35, 0)
      }

      // ── 경계 식재 (모든 레이아웃) ──
      const halfS = S / 2
      // 도로변 가로수
      for (let i = -3; i <= 3; i++) {
        addTree(i * S * 0.15, halfS + 10, 'deciduous')
      }
      // 대지 측면 관상수
      for (let i = -2; i <= 2; i++) {
        if (Math.abs(i) > 0) {
          addTree(-halfS - 3, i * S * 0.18, 'ornamental')
          addTree(halfS + 3, i * S * 0.18, 'ornamental')
        }
      }
      // 대지 뒤쪽 침엽수
      for (let i = -2; i <= 2; i++) {
        addTree(i * S * 0.18, -halfS - 4, 'conifer')
      }
      
      // 가로등 (도로변)
      addLamppost(-S * 0.35, halfS + 6)
      addLamppost(0, halfS + 6)
      addLamppost(S * 0.35, halfS + 6)

      /* ── 도로 Phase 2 (regulation.roadWidth 기반) ── */
      const roadW = S * 1.2
      const roadD = regulation?.roadWidth || 8 // 실제 도로 폭 (m)
      const roadZ = S / 2 + 2 + roadD / 2 // 인도(2m) + 도로 중심
      // 차도
      const road = new THREE.Mesh(new THREE.PlaneGeometry(roadW, roadD),
        new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.85 }))
      road.rotation.x = -Math.PI / 2; road.position.set(0, 0.04, roadZ); road.receiveShadow = true
      scene.add(road)
      // 도로폭 라벨
      const rdLblC = document.createElement('canvas'); rdLblC.width = 128; rdLblC.height = 32
      const rdG = rdLblC.getContext('2d')!
      rdG.fillStyle = 'rgba(0,0,0,0.5)'; rdG.fillRect(0, 0, 128, 32)
      rdG.fillStyle = '#94a3b8'; rdG.font = 'bold 14px sans-serif'; rdG.textAlign = 'center'
      rdG.fillText(`도로 ${roadD}m`, 64, 22)
      const rdLbl = new THREE.Mesh(new THREE.PlaneGeometry(4, 1),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(rdLblC), transparent: true }))
      rdLbl.rotation.x = -Math.PI / 2; rdLbl.position.set(S * 0.4, 0.15, roadZ); scene.add(rdLbl)
      // 중앙선
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(roadW * 0.85, 0.12),
        new THREE.MeshBasicMaterial({ color: 0xcccc00 }))
      cl.rotation.x = -Math.PI / 2; cl.position.set(0, 0.07, roadZ)
      scene.add(cl)
      // 차선 (점선)
      for (let i = -5; i <= 5; i++) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.08),
          new THREE.MeshBasicMaterial({ color: 0xdddddd }))
        dash.rotation.x = -Math.PI / 2
        dash.position.set(i * S * 0.1, 0.07, roadZ + roadD * 0.22)
        scene.add(dash)
      }
      // 인도 (대지쪽 + 반대편)
      const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x8a8078, roughness: 0.75, metalness: 0.05 })
      const swNear = new THREE.Mesh(new THREE.PlaneGeometry(roadW, 2), sidewalkMat)
      swNear.rotation.x = -Math.PI / 2; swNear.position.set(0, 0.06, S / 2 + 1)
      swNear.receiveShadow = true; scene.add(swNear)
      const swFar = new THREE.Mesh(new THREE.PlaneGeometry(roadW, 2), sidewalkMat)
      swFar.rotation.x = -Math.PI / 2; swFar.position.set(0, 0.06, roadZ + roadD / 2 + 1)
      swFar.receiveShadow = true; scene.add(swFar)
      // 연석
      const curbMat = new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.6 })
      const curbNear = new THREE.Mesh(new THREE.BoxGeometry(roadW, 0.15, 0.15), curbMat)
      curbNear.position.set(0, 0.1, S / 2 + 3); scene.add(curbNear)
      const curbFar = new THREE.Mesh(new THREE.BoxGeometry(roadW, 0.15, 0.15), curbMat)
      curbFar.position.set(0, 0.1, S / 2 + roadD + 4.2); scene.add(curbFar)
      // 횡단보도
      const cwX = S * 0.15
      for (let i = 0; i < 6; i++) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.45, roadD - 0.5),
          new THREE.MeshBasicMaterial({ color: 0xeeeeee }))
        stripe.rotation.x = -Math.PI / 2
        stripe.position.set(cwX + i * 0.7, 0.07, S / 2 + roadD / 2 + 4)
        scene.add(stripe)
      }

      /* ── Phase 3: 주차장, 벤치, 분수, 관목, 볼라드 ── */

      // 관목 헬퍼 (낮은 타원 형태)
      const addShrub = (sx: number, sz: number, scale = 1) => {
        const shrub = new THREE.Mesh(
          new THREE.SphereGeometry(0.5 * scale, 6, 4),
          new THREE.MeshStandardMaterial({ color: 0x2a6a30 + Math.floor(Math.random() * 0x101010), roughness: 0.8 }))
        shrub.scale.set(1, 0.6, 1)
        shrub.position.set(sx, 0.3 * scale, sz)
        shrub.castShadow = true; scene.add(shrub)
      }

      // 벤치 헬퍼
      const addBench = (bx: number, bz: number, rotY = 0) => {
        const benchGrp = new THREE.Group()
        // 좌판
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.45),
          new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.7 }))
        seat.position.y = 0.45; benchGrp.add(seat)
        // 등받이
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.7 }))
        back.position.set(0, 0.7, -0.2); benchGrp.add(back)
        // 다리 (4개)
        const legMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.3 })
        for (const lx of [-0.6, 0.6]) {
          for (const lz of [-0.15, 0.15]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 4), legMat)
            leg.position.set(lx, 0.225, lz); benchGrp.add(leg)
          }
        }
        benchGrp.position.set(bx, 0, bz)
        benchGrp.rotation.y = rotY
        scene.add(benchGrp)
      }

      // 지하주차장 (주차대수 정확 반영)
      const pkCount = parking || Math.ceil((units || 10) * 0.7)
      const rampW = Math.min(8, 4 + pkCount * 0.05)
      const parkRamp = new THREE.Mesh(new THREE.BoxGeometry(rampW, 0.15, 4),
        new THREE.MeshStandardMaterial({ color: 0x353d45, roughness: 0.7 }))
      parkRamp.position.set(-S * 0.25, 0.08, S / 2 - 0.5); scene.add(parkRamp)
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(rampW - 1, 0.05, 3),
        new THREE.MeshStandardMaterial({ color: 0x252d35, roughness: 0.8 }))
      ramp.position.set(-S * 0.25, 0.05, S / 2 - 2); scene.add(ramp)
      const pCanopy = new THREE.Mesh(new THREE.BoxGeometry(rampW + 0.5, 0.1, 1),
        new THREE.MeshStandardMaterial({ color: 0x606870, metalness: 0.4, roughness: 0.3 }))
      pCanopy.position.set(-S * 0.25, 2.8, S / 2 + 0.5); scene.add(pCanopy)
      const pSign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x2266ff }))
      pSign.position.set(-S * 0.25, 2.2, S / 2 + 0.01); scene.add(pSign)
      
      // 지하주차장 범위 (점선 — 주차대수 기반 면적)
      const parkArea = pkCount * 30 // 대당 30㎡ (주차+통로)
      const pkFloors = Math.ceil(parkArea / (S * S * 0.7)) // 지하주차 층수
      const pkW = Math.min(S * 0.85, Math.sqrt(parkArea / Math.max(pkFloors, 1) * 1.5))
      const pkD = Math.min(S * 0.7, parkArea / Math.max(pkFloors, 1) / pkW)
      const ugPts = [
        new THREE.Vector3(-pkW/2, 0.05, -pkD/2),
        new THREE.Vector3(pkW/2, 0.05, -pkD/2),
        new THREE.Vector3(pkW/2, 0.05, pkD/2),
        new THREE.Vector3(-pkW/2, 0.05, pkD/2),
        new THREE.Vector3(-pkW/2, 0.05, -pkD/2),
      ]
      const ugLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ugPts),
        new THREE.LineDashedMaterial({ color: 0x6366f1, dashSize: 1, gapSize: 0.8, opacity: 0.4, transparent: true }))
      ugLine.computeLineDistances(); scene.add(ugLine)

      // 주차 정보 라벨
      const pkCanvas = document.createElement('canvas')
      pkCanvas.width = 192; pkCanvas.height = 64
      const pkCtx = pkCanvas.getContext('2d')!
      pkCtx.fillStyle = 'rgba(0,0,0,0.6)'; pkCtx.fillRect(0, 0, 192, 64)
      pkCtx.fillStyle = '#60a5fa'; pkCtx.font = 'bold 22px sans-serif'; pkCtx.textAlign = 'center'
      pkCtx.fillText(`P ${pkCount}대 · 지하${pkFloors}층`, 96, 42)
      const pkLabel = new THREE.Mesh(new THREE.PlaneGeometry(rampW + 2, (rampW + 2) * 0.33),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pkCanvas), transparent: true }))
      pkLabel.rotation.x = -Math.PI / 2; pkLabel.position.set(-S * 0.25, 0.2, S / 2 - 5)
      scene.add(pkLabel)

      // 경계 관목 (대지 앞쪽 + 측면)
      for (let i = -4; i <= 4; i++) {
        if (Math.abs(i * S * 0.1 - (-S * 0.25)) > 4) { // 주차 출입구 피하기
          addShrub(i * S * 0.1, S / 2 - 1.5, 0.8)
        }
      }
      for (let i = -3; i <= 3; i++) {
        addShrub(-S / 2 + 0.8, i * S * 0.12, 0.6)
        addShrub(S / 2 - 0.8, i * S * 0.12, 0.6)
      }

      // 벤치 배치
      if (layoutType === 'courtyard' || layoutType === 'cluster') {
        const cs = S * (layoutType === 'courtyard' ? 0.28 : 0.20)
        addBench(cs * 0.35, cs * 0.15, Math.PI / 2)
        addBench(-cs * 0.35, -cs * 0.15, -Math.PI / 2)
      }
      // 도로변 벤치
      addBench(S * 0.2, S / 2 + 1.5, 0)

      // 분수/수경시설 (중정 타입만)
      if (layoutType === 'courtyard') {
        // 원형 수반
        const basin = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 0.4, 16),
          new THREE.MeshStandardMaterial({ color: 0x6a7a8a, roughness: 0.3, metalness: 0.4 }))
        basin.position.set(0, 0.32, 0); scene.add(basin)
        // 물 표면
        const water = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.05, 16),
          new THREE.MeshStandardMaterial({ color: 0x2288bb, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.7 }))
        water.position.set(0, 0.5, 0); scene.add(water)
        // 중앙 노즐
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 6),
          new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.2 }))
        nozzle.position.set(0, 0.8, 0); scene.add(nozzle)
      }

      // 볼라드 (차량 진입 방지)
      const bollardMat = new THREE.MeshStandardMaterial({ color: 0x505050, metalness: 0.5, roughness: 0.3 })
      for (let i = -3; i <= 3; i++) {
        if (Math.abs(i * S * 0.12 - (-S * 0.25)) > 3) { // 주차 출입구 피하기
          const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6), bollardMat)
          bollard.position.set(i * S * 0.12, 0.35, S / 2 - 0.2); scene.add(bollard)
          // 반사띠
          const band = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 6),
            new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x886600, emissiveIntensity: 0.3 }))
          band.position.set(i * S * 0.12, 0.55, S / 2 - 0.2); scene.add(band)
        }
      }

      // 건물 엔트런스 계단 (첫 번째 건물)
      if (blocks.length > 0) {
        const blk0 = blocks[0]
        const bX0 = S * blk0.x, bZ0 = S * blk0.z, bD0 = S * blk0.d
        const stepMat = new THREE.MeshStandardMaterial({ color: 0x707880, roughness: 0.6, metalness: 0.1 })
        for (let s = 0; s < 3; s++) {
          const step = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.15, 0.35), stepMat)
          step.position.set(bX0, 0.075 + s * 0.15, bZ0 + bD0 / 2 + 1.5 + s * 0.35)
          step.receiveShadow = true; scene.add(step)
        }
      }

      } catch (e) { console.warn('[3D] 조경 렌더링 실패:', e) }

      setBlockInfo(info); setLoaded(true)
      
      // 포스트프로세싱 활성화
      setupPostProcessing(scene, cam)

      /* ── Resize ── */
      const onResize = () => {
        if (!containerRef.current || !rendererRef.current || !cameraRef.current) return
        const nW = containerRef.current.clientWidth, nH = containerRef.current.clientHeight
        if (nW > 0 && nH > 0) {
          rendererRef.current.setSize(nW, nH)
          cameraRef.current.aspect = nW / nH
          cameraRef.current.updateProjectionMatrix()
          if (composer) composer.setSize(nW, nH)
        }
      }
      window.addEventListener('resize', onResize)

      /* ── Animate ── */
      let lastCU = 0
      const animate = () => {
        if (!mounted) return
        animId = requestAnimationFrame(animate)
        const d = camDist / zoom.current
        const ry = rotation.current.y
        const rx = Math.max(0.05, Math.min(1.3, rotation.current.x))
        cam.position.set(d * Math.cos(rx) * Math.sin(ry), d * Math.sin(rx), d * Math.cos(rx) * Math.cos(ry))
        cam.lookAt(0, floors * floorHeight * 0.35, 0)
        if (composer) composer.render(); else r.render(scene, cam)
        const now = Date.now()
        if (now - lastCU > 100) { lastCU = now; setCompassAngle(-ry * 180 / Math.PI) }
      }
      animate()

      // ━━━ 포스트프로세싱 비동기 후로딩 ━━━
      setTimeout(async () => {
        if (!mounted) return
        try {
          const [ecm, rpm, ubm, spm] = await Promise.all([
            import('three/examples/jsm/postprocessing/EffectComposer.js'),
            import('three/examples/jsm/postprocessing/RenderPass.js'),
            import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
            import('three/examples/jsm/postprocessing/ShaderPass.js'),
          ])
          EffectComposer = ecm.EffectComposer; RenderPass = rpm.RenderPass
          UnrealBloomPass = ubm.UnrealBloomPass; ShaderPass = spm.ShaderPass
          if (mounted) setupPostProcessing(scene, cam)
        } catch { /* 기본 렌더링 유지 */ }
      }, 500)

      return () => window.removeEventListener('resize', onResize)
      
      } catch (fatalErr: any) {
        // ★ WebGL 실패, Three.js 에러 등 모든 치명적 에러 처리
        console.error('[3D] 렌더링 실패:', fatalErr)
        setError(fatalErr?.message || '3D 렌더링을 시작할 수 없습니다')
        setBlockInfo(info)
        setLoaded(true) // 로딩 스피너 반드시 해제
      }
    }

    const tryInit = () => {
      const el = containerRef.current; if (!el) return
      const W = el.clientWidth, H = el.clientHeight
      if (W > 10 && H > 10) { go(W, H) } else {
        const ro = new ResizeObserver(entries => {
          for (const e of entries) { const { width: w, height: h } = e.contentRect; if (w > 10 && h > 10) { ro.disconnect(); go(w, h); return } }
        }); ro.observe(el); return () => ro.disconnect()
      }
    }
    const tid = setTimeout(tryInit, 50)
    return () => { mounted = false; clearTimeout(tid); cancelAnimationFrame(animId); rendererRef.current?.dispose() }
  }, [siteArea, floors, floorHeight, coverage, sitePolygon, layoutType, units, parking, regulation, buildingCount])

  const onPD = (e: React.PointerEvent) => { isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY } }
  const onPM = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    rotation.current.y += (e.clientX - lastMouse.current.x) * 0.008
    rotation.current.x += (e.clientY - lastMouse.current.y) * 0.008
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }
  const onPU = () => { isDragging.current = false }
  const onW = (e: React.WheelEvent) => { zoom.current = Math.max(0.3, Math.min(4, zoom.current - e.deltaY * 0.001)) }
  const LABELS: Record<string, string> = { tower:'타워형', linear:'판상형', lshape:'ㄱ자형', courtyard:'중정형', cluster:'클러스터형' }

  return (
    <div className="fixed inset-0 z-[200] bg-[#060d1a] flex flex-col">
      {/* ━━━ 헤더: 이름 + 컨트롤 (1행) ━━━ */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0 bg-gradient-to-r from-[#0a1628] to-[#0f2540]">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">{layoutName}</p>
          <p className="text-[10px] text-blue-300/80 truncate">{LABELS[layoutType]} · {floors}층 {units ? `${units}세대` : ''} · {siteArea.toLocaleString()}㎡{parking ? ` · P${parking}대` : ''}</p>
        </div>
        <div className="flex gap-1 shrink-0 ml-2">
          {[
            { icon: <ZoomIn className="h-4 w-4"/>, fn: () => { zoom.current = Math.min(4, zoom.current + 0.25) } },
            { icon: <ZoomOut className="h-4 w-4"/>, fn: () => { zoom.current = Math.max(0.3, zoom.current - 0.25) } },
            { icon: <RotateCcw className="h-4 w-4"/>, fn: () => { rotation.current = { x: 0.45, y: 0.6 }; zoom.current = 1 } },
            { icon: photoLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Camera className="h-4 w-4"/>, fn: captureAndConvert },
            { icon: <X className="h-4 w-4"/>, fn: onClose },
          ].map((btn, i) => (
            <button key={i} onClick={btn.fn} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors">{btn.icon}</button>
          ))}
        </div>
      </div>
      {/* ━━━ 스타일 선택 (2행, 스크롤 가능) ━━━ */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/5 bg-[#0a1628]/80 overflow-x-auto scrollbar-hide shrink-0">
        <span className="text-[9px] text-white/30 shrink-0 mr-1">스타일</span>
        {STYLES.slice(0, 7).map(s => (
          <button key={s.id} onClick={() => setSelectedStyle(s.id)}
            className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] border transition-all ${selectedStyle === s.id ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'}`}>
            {s.emoji} {s.label}
          </button>
        ))}
      </div>
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {!loaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#060d1a]">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
              <p className="text-sm text-blue-300">Enscape급 3D 렌더링 중...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#060d1a]">
            <div className="text-center px-6">
              <p className="text-red-400 text-sm mb-2">렌더링 오류</p>
              <p className="text-white/40 text-xs">{error}</p>
              <button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-white/10 text-white text-sm">닫기</button>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerLeave={onPU} onWheel={onW}/>
        <div className="absolute top-3 right-3 pointer-events-none">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="26" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
            <g transform={`rotate(${compassAngle}, 28, 28)`}>
              <polygon points="28,5 23,25 28,21 33,25" fill="#ef4444"/>
              <polygon points="28,51 23,31 28,35 33,31" fill="#94a3b8"/>
              <text x="28" y="17" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#ffffff">N</text>
            </g>
          </svg>
        </div>
      </div>
      <div className="px-4 py-2 border-t border-white/10 shrink-0 bg-gradient-to-r from-[#0a1628] to-[#0f2540]">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-3 text-[10px] text-white/50">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block rounded"/>대지</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-400 inline-block rounded"/>이격거리</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block rounded"/>일조사선</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-400 inline-block rounded"/>도로사선</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-400 inline-block rounded"/>지하주차</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded"/>최상층</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-400 inline-block rounded"/>5층 단위</span>
            {(layoutType === 'courtyard' || layoutType === 'cluster') && (
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block rounded"/>중정/조경</span>
            )}
          </div>
          <p className="text-[10px] text-white/25">드래그: 회전 · 스크롤: 줌</p>
        </div>
      </div>

      {/* 포토리얼 변환 로딩 */}
      {photoLoading && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-30">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-white text-sm font-medium">3D → 포토리얼 변환 중...</p>
          <p className="text-white/50 text-xs mt-1">5방향 캡처 → 2장 동시 생성 → 자동 점수 → 최적 선별 (40~90초)</p>
        </div>
      )}

      {/* 포토리얼 결과 오버레이 */}
      {photoResult && (
        <div className="absolute inset-0 bg-black/90 z-30 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-emerald-900/80 to-blue-900/80">
            <div>
              <p className="text-white text-sm font-bold">📸 3D → 포토리얼 변환 완료</p>
              <p className="text-white/60 text-[10px]">{photoScore || '2장 생성 → 자동 선별 완료'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                const a = document.createElement('a')
                a.href = photoResult
                a.download = `archiscan-${layoutName}-photorealistic.png`
                a.click()
              }} className="px-3 py-1 rounded bg-white/20 text-white text-xs hover:bg-white/30">다운로드</button>
              <button onClick={() => setPhotoResult(null)} className="px-3 py-1 rounded bg-white/10 text-white text-xs hover:bg-white/20">닫기</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2">
            <img src={photoResult} alt="Photorealistic rendering" className="w-full h-full object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  )
}
