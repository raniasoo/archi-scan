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

type Block = { x: number; z: number; w: number; d: number; label?: string; color?: number }

function getLayoutBlocks(type: string): Block[] {
  switch (type) {
    case 'tower':
      return [{ x: 0, z: 0, w: 0.45, d: 0.45, label: 'TOWER', color: 0x1a3a7a }]
    case 'linear':
      return [{ x: 0, z: 0, w: 0.85, d: 0.30, label: 'SLAB', color: 0x1a5a7a }]
    case 'lshape':
      return [
        { x: -0.21, z: 0, w: 0.42, d: 0.75, label: 'A동', color: 0x1a4a8a },
        { x: 0.21, z: -0.18, w: 0.42, d: 0.40, label: 'B동', color: 0x1a5a8a },
      ]
    case 'courtyard':
      return [
        { x: 0, z: -0.27, w: 0.76, d: 0.22, label: '북동', color: 0x1a4a8a },
        { x: -0.27, z: 0.10, w: 0.22, d: 0.48, label: '서동', color: 0x154070 },
        { x: 0.27, z: 0.10, w: 0.22, d: 0.48, label: '동동', color: 0x154070 },
      ]
    case 'cluster':
      return [
        { x: -0.26, z: -0.22, w: 0.36, d: 0.34, label: 'A동', color: 0x1a4a8a },
        { x: 0.26, z: -0.22, w: 0.36, d: 0.34, label: 'B동', color: 0x1a4a8a },
        { x: -0.26, z: 0.22, w: 0.36, d: 0.34, label: 'C동', color: 0x1a4a8a },
        { x: 0.26, z: 0.22, w: 0.36, d: 0.34, label: 'D동', color: 0x1a4a8a },
      ]
    default:
      return [{ x: 0, z: 0, w: 0.55, d: 0.55, color: 0x1a4a8a }]
  }
}

function getBlockFloors(idx: number, total: number, type: string): number {
  if (type === 'lshape') return idx === 0 ? total : Math.max(3, Math.floor(total * 0.65))
  if (type === 'courtyard') return idx === 0 ? total : Math.max(4, Math.floor(total * 0.75))
  if (type === 'cluster') return Math.max(3, Math.floor(total * [1, 0.85, 0.9, 0.8][idx] ?? 0.85))
  return total
}

export function BuildingVolume3D({ layoutName, layoutType, floors, siteArea, coverage, floorHeight = 3.3, sitePolygon, onClose }: BuildingVolume3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<any>(null)
  const cameraRef = useRef<any>(null)
  const frameRef = useRef<number>(0)
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const rotation = useRef({ x: 0.45, y: 0.6 })
  const zoom = useRef(1)
  const [loaded, setLoaded] = useState(false)
  const [blockInfo, setBlockInfo] = useState<{ label: string; floors: number }[]>([])

  useEffect(() => {
    let THREE: any, mounted = true

    const init = async () => {
      try { THREE = await import('three') } catch { return }
      if (!mounted || !canvasRef.current) return

      const canvas = canvasRef.current
      const W = canvas.clientWidth || 400, H = canvas.clientHeight || 500
      const siteSize = Math.sqrt(siteArea)
      const camDist = siteSize * 2.5

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
      renderer.setSize(W, H); renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
      rendererRef.current = renderer

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x060d1a)
      scene.fog = new THREE.Fog(0x060d1a, 200, 900)

      const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 5000)
      cameraRef.current = camera

      // 조명
      scene.add(new THREE.AmbientLight(0x223366, 1.2))
      const sun = new THREE.DirectionalLight(0xaaccff, 2.0)
      sun.position.set(siteSize * 1.5, siteSize * 3, siteSize * 1.5)
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); scene.add(sun)
      scene.add(Object.assign(new THREE.DirectionalLight(0x4488bb, 0.6), { position: { x: -siteSize, y: siteSize, z: -siteSize, set(x:any,y:any,z:any){ this.x=x;this.y=y;this.z=z; return this } } }))
      const fill = new THREE.DirectionalLight(0x4488bb, 0.6)
      fill.position.set(-siteSize, siteSize, -siteSize); scene.add(fill)

      // 지면
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(siteSize * 3, siteSize * 3), new THREE.MeshStandardMaterial({ color: 0x090e1a, roughness: 1 }))
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground)
      const grid = new THREE.GridHelper(siteSize * 2.8, 28, 0x0d1f3a, 0x0d1f3a)
      grid.position.y = 0.02; scene.add(grid)

      // 대지 면
      const siteFloor = new THREE.Mesh(new THREE.PlaneGeometry(siteSize, siteSize), new THREE.MeshStandardMaterial({ color: 0x0a1f10, transparent: true, opacity: 0.55 }))
      siteFloor.rotation.x = -Math.PI / 2; siteFloor.position.y = 0.05; scene.add(siteFloor)

      // 대지 경계
      const bpts = sitePolygon?.coords.length
        ? (() => {
            const [cLng, cLat] = sitePolygon.centroid
            const LM = 111319 * Math.cos(cLat * Math.PI / 180), LatM = 111319
            const raw = sitePolygon.coords.map(([lng, lat]) => [(lng-cLng)*LM, (lat-cLat)*LatM])
            const cx = raw.reduce((s,p)=>s+p[0],0)/raw.length, cy = raw.reduce((s,p)=>s+p[1],0)/raw.length
            return [...raw.map(([x,y])=>new THREE.Vector3(x-cx, 0.2, -(y-cy))), new THREE.Vector3(raw[0][0]-cx, 0.2, -(raw[0][1]-cy))]
          })()
        : [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a,b])=>new THREE.Vector3(a*siteSize/2, 0.2, b*siteSize/2))
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bpts), new THREE.LineBasicMaterial({ color: 0x3b82f6 })))

      // 이격거리 점선
      const sh = siteSize/2 - siteSize*0.04
      const sbPts = [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a,b])=>new THREE.Vector3(a*sh,0.1,b*sh))
      const sbL = new THREE.Line(new THREE.BufferGeometry().setFromPoints(sbPts), new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 1.5, gapSize: 1.2 }))
      sbL.computeLineDistances(); scene.add(sbL)

      // ===== 배치안 타입별 건물 =====
      const blocks = getLayoutBlocks(layoutType)
      const info: { label: string; floors: number }[] = []

      blocks.forEach((blk, idx) => {
        const bF = getBlockFloors(idx, floors, layoutType)
        const totalH = bF * floorHeight
        const bW = siteSize * blk.w, bD = siteSize * blk.d
        const bX = siteSize * blk.x, bZ = siteSize * blk.z
        info.push({ label: blk.label ?? `동${idx+1}`, floors: bF })

        // Extrude
        const shape = new THREE.Shape()
        shape.moveTo(-bW/2,-bD/2); shape.lineTo(bW/2,-bD/2)
        shape.lineTo(bW/2,bD/2); shape.lineTo(-bW/2,bD/2); shape.closePath()
        const extGeo = new THREE.ExtrudeGeometry(shape, { depth: totalH, bevelEnabled: false })
        extGeo.rotateX(-Math.PI/2)

        const buildMesh = new THREE.Mesh(extGeo, new THREE.MeshStandardMaterial({
          color: blk.color ?? 0x1a4a8a, roughness: 0.12, metalness: 0.8,
          transparent: true, opacity: 0.90, side: THREE.DoubleSide,
        }))
        buildMesh.position.set(bX, 0, bZ); buildMesh.castShadow = true; buildMesh.receiveShadow = true
        scene.add(buildMesh)

        // 엣지
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(extGeo), new THREE.LineBasicMaterial({ color: 0x60a5fa }))
        edges.position.set(bX, 0, bZ); scene.add(edges)

        // 층 구분선
        for (let f = 1; f < bF; f++) {
          const y = f * floorHeight, major = f % 5 === 0
          const pts = [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a,b])=>new THREE.Vector3(bX+a*bW/2, y, bZ+b*bD/2))
          const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: major ? 0x22d3ee : 0x1e3d6a, transparent: true, opacity: major ? 0.9 : 0.3 }))
          scene.add(ln)
        }

        // 최상층
        const tPts = [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a,b])=>new THREE.Vector3(bX+a*bW/2, totalH, bZ+b*bD/2))
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tPts), new THREE.LineBasicMaterial({ color: 0x10b981 })))

        // 지붕
        const roof = new THREE.Mesh(new THREE.PlaneGeometry(bW, bD), new THREE.MeshStandardMaterial({ color: 0x3a9af8, roughness: 0.05, metalness: 0.95, transparent: true, opacity: 0.55 }))
        roof.rotation.x = -Math.PI/2; roof.position.set(bX, totalH+0.05, bZ); scene.add(roof)
      })

      // 중정 조경
      if (layoutType === 'courtyard' || layoutType === 'cluster') {
        const cs = siteSize * (layoutType === 'courtyard' ? 0.28 : 0.20)
        const court = new THREE.Mesh(new THREE.PlaneGeometry(cs, cs), new THREE.MeshStandardMaterial({ color: 0x0f3a1a, roughness: 0.9, transparent: true, opacity: 0.75 }))
        court.rotation.x = -Math.PI/2; court.position.y = 0.12; scene.add(court)
        const cPts = [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a,b])=>new THREE.Vector3(a*cs/2, 0.25, b*cs/2))
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cPts), new THREE.LineBasicMaterial({ color: 0x22c55e })))
      }

      setBlockInfo(info); setLoaded(true)

      const animate = () => {
        if (!mounted) return
        frameRef.current = requestAnimationFrame(animate)
        const cam = cameraRef.current, d = camDist / zoom.current
        const ry = rotation.current.y, rx = Math.max(0.05, Math.min(1.3, rotation.current.x))
        cam.position.set(d*Math.cos(rx)*Math.sin(ry), d*Math.sin(rx), d*Math.cos(rx)*Math.cos(ry))
        cam.lookAt(0, floors * floorHeight * 0.35, 0)
        renderer.render(scene, cam)
      }
      animate()
    }

    init()
    return () => { mounted = false; cancelAnimationFrame(frameRef.current); rendererRef.current?.dispose() }
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

  const TYPE_LABELS: Record<string, string> = { tower:'타워형', linear:'판상형', lshape:'ㄱ자형', courtyard:'중정형', cluster:'클러스터형' }

  return (
    <div className="fixed inset-0 z-[200] bg-[#060d1a] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-bold text-white">{layoutName}</p>
            <p className="text-[10px] text-blue-300">{TYPE_LABELS[layoutType]} · {floors}층 · {siteArea.toLocaleString()}㎡</p>
          </div>
          {blockInfo.length > 1 && (
            <div className="hidden sm:flex gap-1.5">
              {blockInfo.map((b,i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-medium">{b.label} {b.floors}F</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1.5">
          {[
            { icon: <ZoomIn className="h-4 w-4"/>, fn: ()=>{ zoom.current = Math.min(4, zoom.current+0.25) } },
            { icon: <ZoomOut className="h-4 w-4"/>, fn: ()=>{ zoom.current = Math.max(0.3, zoom.current-0.25) } },
            { icon: <RotateCcw className="h-4 w-4"/>, fn: ()=>{ rotation.current={x:0.45,y:0.6}; zoom.current=1 } },
            { icon: <X className="h-4 w-4"/>, fn: onClose },
          ].map((btn,i) => (
            <button key={i} onClick={btn.fn} className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors">
              {btn.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#060d1a]">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
              <p className="text-sm text-blue-300">{TYPE_LABELS[layoutType]} 3D 렌더링 중...</p>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerLeave={onPU} onWheel={onW}/>
      </div>

      <div className="px-4 py-2 border-t border-white/10 shrink-0 flex items-center justify-between">
        <div className="flex flex-wrap gap-3 text-[10px] text-white/35">
          <span className="flex items-center gap-1"><span className="w-3 h-px bg-blue-500 inline-block"/>대지</span>
          <span className="flex items-center gap-1"><span className="w-3 h-px bg-amber-400 inline-block"/>이격거리</span>
          <span className="flex items-center gap-1"><span className="w-3 h-px bg-emerald-400 inline-block"/>최상층</span>
          <span className="flex items-center gap-1"><span className="w-3 h-px bg-cyan-400 inline-block"/>5층 단위</span>
          {(layoutType==='courtyard'||layoutType==='cluster') && <span className="flex items-center gap-1"><span className="w-3 h-px bg-green-500 inline-block"/>중정/조경</span>}
        </div>
        <p className="text-[10px] text-white/25">드래그: 회전 · 스크롤: 줌</p>
      </div>
    </div>
  )
}
