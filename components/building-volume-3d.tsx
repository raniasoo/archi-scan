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

/** 프로시저럴 창문 텍스처 */
function makeWindowTex(floorCount: number, winCols: number): HTMLCanvasElement {
  const W = 512, H = 512, c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')!
  // 외벽 (밝은 콘크리트)
  g.fillStyle = '#bfc5cc'
  g.fillRect(0, 0, W, H)
  const fH = H / floorCount, wW = W / winCols
  for (let f = 0; f < floorCount; f++) {
    const y = f * fH
    const isLobby = f === floorCount - 1
    for (let w = 0; w < winCols; w++) {
      const x = w * wW
      if (isLobby) {
        g.fillStyle = '#142a42'
        g.fillRect(x + wW * 0.06, y + fH * 0.12, wW * 0.88, fH * 0.75)
        g.fillStyle = 'rgba(100,170,220,0.25)'
        g.fillRect(x + wW * 0.08, y + fH * 0.15, wW * 0.38, fH * 0.65)
      } else {
        const wx = x + wW * 0.16, wy = y + fH * 0.18, ww = wW * 0.68, wh = fH * 0.58
        g.fillStyle = '#0e1e30'
        g.fillRect(wx, wy, ww, wh)
        const gr = g.createLinearGradient(wx, wy, wx + ww, wy + wh)
        gr.addColorStop(0, 'rgba(70,130,195,0.45)')
        gr.addColorStop(0.5, 'rgba(110,170,220,0.25)')
        gr.addColorStop(1, 'rgba(55,115,175,0.35)')
        g.fillStyle = gr
        g.fillRect(wx + 1, wy + 1, ww - 2, wh - 2)
        // 발코니
        g.fillStyle = '#98a0aa'
        g.fillRect(x + wW * 0.04, y + fH * 0.8, wW * 0.92, fH * 0.04)
        // 랜덤 실내조명
        if (Math.random() > 0.45) {
          g.fillStyle = `rgba(255,225,170,${0.06 + Math.random() * 0.1})`
          g.fillRect(wx + 2, wy + 2, ww - 4, wh - 4)
        }
      }
    }
    g.fillStyle = '#a5adb6'
    g.fillRect(0, y + fH - 1, W, 1.5)
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

      /* ── 조경 (나무) ── */
      if (layoutType === 'courtyard' || layoutType === 'cluster') {
        const cs = S * (layoutType === 'courtyard' ? 0.28 : 0.20)
        const court = new THREE.Mesh(new THREE.PlaneGeometry(cs, cs),
          new THREE.MeshStandardMaterial({ color: 0x2d6b3a, roughness: 0.85 }))
        court.rotation.x = -Math.PI / 2; court.position.y = 0.12; court.receiveShadow = true
        scene.add(court)
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
          [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a, b]) => new THREE.Vector3(a * cs / 2, 0.25, b * cs / 2))),
          new THREE.LineBasicMaterial({ color: 0x22c55e })))

        // 나무
        const tPos = layoutType === 'cluster'
          ? [[0,0],[-cs*0.3,-cs*0.3],[cs*0.3,cs*0.2],[-cs*0.15,cs*0.3]]
          : [[0,0],[-cs*0.25,-cs*0.25],[cs*0.25,cs*0.25]]
        tPos.forEach(([tx, tz]) => {
          const h = 3.5 + Math.random() * 3
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, h * 0.32, 6),
            new THREE.MeshStandardMaterial({ color: 0x5a3a28, roughness: 0.9 }))
          trunk.position.set(tx, h * 0.16, tz); trunk.castShadow = true; scene.add(trunk)
          const crown = new THREE.Mesh(new THREE.SphereGeometry(h * 0.28, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0x2a7a3a, roughness: 0.75 }))
          crown.position.set(tx, h * 0.5, tz); crown.castShadow = true; scene.add(crown)
        })
      }

      /* ── 도로 ── */
      const roadW = S * 1.2, roadD = 6
      const road = new THREE.Mesh(new THREE.PlaneGeometry(roadW, roadD),
        new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.9 }))
      road.rotation.x = -Math.PI / 2; road.position.set(0, 0.04, S / 2 + roadD / 2 + 2); road.receiveShadow = true
      scene.add(road)
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(roadW * 0.85, 0.12),
        new THREE.MeshBasicMaterial({ color: 0xcccc00 }))
      cl.rotation.x = -Math.PI / 2; cl.position.set(0, 0.07, S / 2 + roadD / 2 + 2)
      scene.add(cl)

      setBlockInfo(info); setLoaded(true)

      /* ── Resize ── */
      const onResize = () => {
        if (!containerRef.current || !rendererRef.current || !cameraRef.current) return
        const nW = containerRef.current.clientWidth, nH = containerRef.current.clientHeight
        if (nW > 0 && nH > 0) { rendererRef.current.setSize(nW, nH); cameraRef.current.aspect = nW / nH; cameraRef.current.updateProjectionMatrix() }
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
        r.render(scene, cam)
        const now = Date.now()
        if (now - lastCU > 100) { lastCU = now; setCompassAngle(-ry * 180 / Math.PI) }
      }
      animate()

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
              <p className="text-sm text-blue-300">포토리얼리스틱 3D 렌더링 중...</p>
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
