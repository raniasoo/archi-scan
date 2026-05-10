"use client"

import { useEffect, useRef, useState } from "react"
import { X, RotateCcw, ZoomIn, ZoomOut } from "lucide-react"

interface BuildingVolume3DProps {
  layoutName: string
  layoutType: 'tower' | 'courtyard' | 'lshape' | 'linear' | 'cluster'
  floors: number
  siteArea: number
  coverage: number
  floorHeight?: number
  sitePolygon?: { coords: [number, number][], centroid: [number, number] } | null
  onClose: () => void
}

type Block = { x: number; z: number; w: number; d: number; label?: string }

function getLayoutBlocks(type: string): Block[] {
  switch (type) {
    case 'tower':   return [{ x: 0, z: 0, w: 0.45, d: 0.45, label: 'TOWER' }]
    case 'linear':  return [{ x: 0, z: 0, w: 0.85, d: 0.30, label: 'SLAB' }]
    case 'lshape':  return [
      { x: -0.21, z: 0,    w: 0.42, d: 0.75, label: 'A동' },
      { x:  0.21, z:-0.18, w: 0.42, d: 0.40, label: 'B동' },
    ]
    case 'courtyard': return [
      { x:  0,     z:-0.27, w: 0.76, d: 0.22, label: '북동' },
      { x: -0.27,  z: 0.10, w: 0.22, d: 0.48, label: '서동' },
      { x:  0.27,  z: 0.10, w: 0.22, d: 0.48, label: '동동' },
    ]
    case 'cluster': return [
      { x:-0.30, z:-0.28, w: 0.24, d: 0.22, label: 'A동' },
      { x: 0.02, z:-0.28, w: 0.24, d: 0.22, label: 'B동' },
      { x: 0.34, z:-0.25, w: 0.24, d: 0.22, label: 'C동' },
      { x:-0.22, z: 0.10, w: 0.24, d: 0.22, label: 'D동' },
      { x: 0.12, z: 0.08, w: 0.24, d: 0.22, label: 'E동' },
      { x: 0.40, z: 0.12, w: 0.24, d: 0.22, label: 'F동' },
    ]
    default: return [{ x: 0, z: 0, w: 0.55, d: 0.55 }]
  }
}

function getBlockFloors(idx: number, total: number, type: string): number {
  if (type === 'lshape')    return idx === 0 ? total : Math.max(3, Math.floor(total * 0.65))
  if (type === 'courtyard') return idx === 0 ? total : Math.max(4, Math.floor(total * 0.75))
  if (type === 'cluster')   return Math.max(2, Math.floor(total * ([1, 0.85, 0.9, 1, 0.85, 0.9][idx] ?? 0.85)))
  return total
}

/** 프로시저럴 창문 텍스처 Phase 2 — 프레임, 커튼, AC실외기, 발코니 난간 */
function makeWindowTex(floorCount: number, winCols: number): HTMLCanvasElement {
  const W = 512, H = 512, c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')!
  // 외벽 (미세 텍스처 콘크리트)
  g.fillStyle = '#bfc5cc'
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
  layoutName, layoutType, floors, siteArea, coverage, floorHeight = 3.3, sitePolygon, onClose
}: BuildingVolume3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rendererRef  = useRef<any>(null)
  const cameraRef    = useRef<any>(null)
  const isDragging   = useRef(false)
  const lastMouse    = useRef({ x: 0, y: 0 })
  const rotation     = useRef({ x: 0.45, y: 0.6 })
  const zoom         = useRef(1)
  const [loaded, setLoaded]       = useState(false)
  const [compassAngle, setCompassAngle] = useState(0)
  const [blockInfo, setBlockInfo] = useState<{ label: string; floors: number }[]>([])
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    let THREE: any, mounted = true, animId = 0

    const go = async (W: number, H: number) => {
      if (!mounted || !canvasRef.current) return
      try { THREE = await import('three') } catch (e: any) { setError(e.message); return }
      
      // 포스트프로세싱은 기본 렌더링 시작 후 비동기 로드
      let EffectComposer: any, RenderPass: any, UnrealBloomPass: any, ShaderPass: any
      if (!mounted || !canvasRef.current) return

      const canvas = canvasRef.current
      const S = Math.sqrt(siteArea)
      const camDist = S * 2.5

      /* ── Renderer (ACES Tone Mapping) ── */
      const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
      r.setSize(W, H)
      r.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2))
      r.shadowMap.enabled = true
      r.shadowMap.type = THREE.PCFSoftShadowMap
      r.toneMapping = THREE.ACESFilmicToneMapping
      r.toneMappingExposure = 1.15
      r.outputColorSpace = THREE.SRGBColorSpace
      rendererRef.current = r
      
      // ━━━ 포스트프로세싱 체인 (Bloom + Vignette) ━━━
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
          
          // Vignette (가장자리 어둡게)
          if (ShaderPass) {
            const vignetteShader = {
              uniforms: {
                tDiffuse: { value: null },
                offset: { value: 1.0 },
                darkness: { value: 1.3 },
              },
              vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
              fragmentShader: `uniform sampler2D tDiffuse; uniform float offset; uniform float darkness; varying vec2 vUv;
                void main() {
                  vec4 texel = texture2D(tDiffuse, vUv);
                  vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
                  float dist = length(uv);
                  float vig = smoothstep(0.8, offset * 0.5, dist * (darkness + offset));
                  texel.rgb = mix(texel.rgb * 0.3, texel.rgb, vig);
                  gl_FragColor = texel;
                }`,
            }
            composer.addPass(new ShaderPass(vignetteShader))
          }
          
          console.log('[3D] Post-processing enabled: Bloom + Vignette ✅')
        } catch (e) {
          console.warn('[3D] Post-processing setup failed:', e)
          composer = null
        }
      }

      /* ── Scene (그라데이션 하늘) ── */
      const scene = new THREE.Scene()
      const skyC = document.createElement('canvas')
      skyC.width = 2; skyC.height = 512
      const skyG = skyC.getContext('2d')!
      const sg = skyG.createLinearGradient(0, 0, 0, 512)
      sg.addColorStop(0, '#081422'); sg.addColorStop(0.3, '#0e2138')
      sg.addColorStop(0.65, '#15304d'); sg.addColorStop(1, '#1c3d5c')
      skyG.fillStyle = sg; skyG.fillRect(0, 0, 2, 512)
      const skyTex = new THREE.CanvasTexture(skyC)
      skyTex.mapping = THREE.EquirectangularReflectionMapping
      scene.background = skyTex
      scene.environment = skyTex
      scene.fog = new THREE.FogExp2(0x0e2138, 0.0012)

      /* ── Camera ── */
      const cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 5000)
      cameraRef.current = cam

      /* ── Lights (HDR 3점 조명) ── */
      scene.add(new THREE.HemisphereLight(0x88b4d8, 0x283828, 0.7))
      const sun = new THREE.DirectionalLight(0xffeedd, 3.2)
      sun.position.set(S * 1.5, S * 3, S * 1.5)
      sun.castShadow = true
      sun.shadow.mapSize.set(2048, 2048)
      const sc = sun.shadow.camera
      sc.left = sc.bottom = -S * 1.5; sc.right = sc.top = S * 1.5
      sc.near = 0.5; sc.far = S * 8
      sun.shadow.bias = -0.001; sun.shadow.normalBias = 0.02
      scene.add(sun)
      scene.add(Object.assign(new THREE.DirectionalLight(0x88aacc, 0.7), { position: new THREE.Vector3(-S, S * 0.5, -S * 0.5) }))
      scene.add(Object.assign(new THREE.DirectionalLight(0x4466aa, 0.35), { position: new THREE.Vector3(-S * 0.5, S * 0.3, S * 2) }))

      /* ── Ground (잔디) ── */
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
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(S * 4, S * 4),
        new THREE.MeshStandardMaterial({ map: gTex, roughness: 0.95, color: 0x1a3a22 }))
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true
      scene.add(ground)

      // 미세 그리드
      const grid = new THREE.GridHelper(S * 3, 30, 0x1a3040, 0x152535)
      grid.position.y = 0.03; grid.material.opacity = 0.35; grid.material.transparent = true
      scene.add(grid)

      // 대지면
      const sf = new THREE.Mesh(new THREE.PlaneGeometry(S, S),
        new THREE.MeshStandardMaterial({ color: 0x3a4550, roughness: 0.8, metalness: 0.05 }))
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

      // 이격거리
      const sh = S / 2 - S * 0.04
      const sbPts = [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a, b]) => new THREE.Vector3(a * sh, 0.15, b * sh))
      const sbLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(sbPts),
        new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 1.5, gapSize: 1.2, opacity: 0.6, transparent: true }))
      sbLine.computeLineDistances(); scene.add(sbLine)

      /* ── 건물 (PBR + 창문 텍스처) ── */
      const blocks = getLayoutBlocks(layoutType)
      const info: { label: string; floors: number }[] = []

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

        // 창문 텍스처
        const wCols = Math.max(3, Math.round(bW / 3.5))
        const wTex = new THREE.CanvasTexture(makeWindowTex(bF, wCols))
        wTex.wrapS = wTex.wrapT = THREE.RepeatWrapping

        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
          map: wTex, roughness: 0.32, metalness: 0.12,
          color: 0xd0d5dc, envMapIntensity: 0.5, side: THREE.DoubleSide,
        }))
        mesh.position.set(bX, 0, bZ); mesh.castShadow = true; mesh.receiveShadow = true
        scene.add(mesh)

        // 에지
        scene.add(Object.assign(new THREE.LineSegments(new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: 0x8aa8c8, transparent: true, opacity: 0.25 })),
          { position: new THREE.Vector3(bX, 0, bZ) }))

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

      /* ── 도로 Phase 2 (인도, 횡단보도, 연석) ── */
      const roadW = S * 1.2, roadD = 6
      // 차도
      const road = new THREE.Mesh(new THREE.PlaneGeometry(roadW, roadD),
        new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.85 }))
      road.rotation.x = -Math.PI / 2; road.position.set(0, 0.04, S / 2 + roadD / 2 + 4); road.receiveShadow = true
      scene.add(road)
      // 중앙선 (노란색)
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(roadW * 0.85, 0.12),
        new THREE.MeshBasicMaterial({ color: 0xcccc00 }))
      cl.rotation.x = -Math.PI / 2; cl.position.set(0, 0.07, S / 2 + roadD / 2 + 4)
      scene.add(cl)
      // 차선 (흰색 점선)
      for (let i = -5; i <= 5; i++) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.08),
          new THREE.MeshBasicMaterial({ color: 0xdddddd }))
        dash.rotation.x = -Math.PI / 2
        dash.position.set(i * S * 0.1, 0.07, S / 2 + roadD / 2 + 4 + roadD * 0.22)
        scene.add(dash)
      }
      // 인도 (양쪽)
      const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x8a8078, roughness: 0.75, metalness: 0.05 })
      const swNear = new THREE.Mesh(new THREE.PlaneGeometry(roadW, 2), sidewalkMat)
      swNear.rotation.x = -Math.PI / 2; swNear.position.set(0, 0.06, S / 2 + 2)
      swNear.receiveShadow = true; scene.add(swNear)
      const swFar = new THREE.Mesh(new THREE.PlaneGeometry(roadW, 2), sidewalkMat)
      swFar.rotation.x = -Math.PI / 2; swFar.position.set(0, 0.06, S / 2 + roadD + 5)
      swFar.receiveShadow = true; scene.add(swFar)
      // 연석 (커브)
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

      // 지하주차 출입구 (대지 전면)
      const parkRamp = new THREE.Mesh(new THREE.BoxGeometry(5, 0.15, 4),
        new THREE.MeshStandardMaterial({ color: 0x353d45, roughness: 0.7 }))
      parkRamp.position.set(-S * 0.25, 0.08, S / 2 - 0.5); scene.add(parkRamp)
      // 경사로 (어두운 색)
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 3),
        new THREE.MeshStandardMaterial({ color: 0x252d35, roughness: 0.8 }))
      ramp.position.set(-S * 0.25, 0.05, S / 2 - 2); scene.add(ramp)
      // 출입구 캐노피
      const pCanopy = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.1, 1),
        new THREE.MeshStandardMaterial({ color: 0x606870, metalness: 0.4, roughness: 0.3 }))
      pCanopy.position.set(-S * 0.25, 2.8, S / 2 + 0.5); scene.add(pCanopy)
      // "주차" 표시 (작은 사각형)
      const pSign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x2266ff }))
      pSign.position.set(-S * 0.25, 2.2, S / 2 + 0.01); scene.add(pSign)

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

      } catch (e) { console.warn('[3D] 조경/디테일 렌더링 실패 (기본 건물은 표시됨):', e) }

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

      // ━━━ 포스트프로세싱 비동기 후로딩 (기본 렌더링은 이미 시작됨) ━━━
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
        } catch { /* 포스트프로세싱 없이 기본 렌더링 유지 */ }
      }, 500)

      return () => window.removeEventListener('resize', onResize)
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
  }, [siteArea, floors, floorHeight, coverage, sitePolygon, layoutType])

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
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 bg-gradient-to-r from-[#0a1628] to-[#0f2540]">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-bold text-white">{layoutName}</p>
            <p className="text-[10px] text-blue-300/80">{LABELS[layoutType]} · {floors}층 · {siteArea.toLocaleString()}㎡</p>
          </div>
          {blockInfo.length > 1 && (
            <div className="hidden sm:flex gap-1.5">
              {blockInfo.map((b, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 text-[10px] font-medium border border-blue-500/20">{b.label} {b.floors}F</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1.5">
          {[
            { icon: <ZoomIn className="h-4 w-4"/>, fn: () => { zoom.current = Math.min(4, zoom.current + 0.25) } },
            { icon: <ZoomOut className="h-4 w-4"/>, fn: () => { zoom.current = Math.max(0.3, zoom.current - 0.25) } },
            { icon: <RotateCcw className="h-4 w-4"/>, fn: () => { rotation.current = { x: 0.45, y: 0.6 }; zoom.current = 1 } },
            { icon: <X className="h-4 w-4"/>, fn: onClose },
          ].map((btn, i) => (
            <button key={i} onClick={btn.fn} className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors">{btn.icon}</button>
          ))}
        </div>
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
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded"/>최상층</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-400 inline-block rounded"/>5층 단위</span>
            {(layoutType === 'courtyard' || layoutType === 'cluster') && (
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block rounded"/>중정/조경</span>
            )}
          </div>
          <p className="text-[10px] text-white/25">드래그: 회전 · 스크롤: 줌</p>
        </div>
      </div>
    </div>
  )
}
