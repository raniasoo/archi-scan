"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Box, Maximize2 } from "lucide-react"
import * as THREE from "three"

interface Terrain3DViewProps {
  lng: number
  lat: number
  address?: string
  className?: string
}

export function Terrain3DView({ lng, lat, address, className = "" }: Terrain3DViewProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const frameRef = useRef<number>(0)
  const rotationRef = useRef({ x: 0.6, y: 0.4 })
  const zoomRef = useRef(1)
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  const init = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const W = canvas.clientWidth, H = canvas.clientHeight
    if (W < 10 || H < 10) return
    canvas.width = W; canvas.height = H

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1e293b)
    scene.fog = new THREE.Fog(0x1e293b, 300, 600)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 2000)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    rendererRef.current = renderer

    // 1) 표고 데이터
    const GRID = 32, RANGE = 0.003
    const points: Array<{ lat: number; lng: number }> = []
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        points.push({
          lat: lat + RANGE - (gy / (GRID - 1)) * RANGE * 2,
          lng: lng - RANGE + (gx / (GRID - 1)) * RANGE * 2,
        })
      }
    }

    let elevations: number[]
    try {
      const lats = points.map(p => p.lat.toFixed(6)).join(',')
      const lngs = points.map(p => p.lng.toFixed(6)).join(',')
      const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`)
      const d = await r.json()
      elevations = d.elevation || new Array(GRID * GRID).fill(0)
    } catch {
      elevations = new Array(GRID * GRID).fill(0)
    }

    const minE = Math.min(...elevations), maxE = Math.max(...elevations)
    const eRange = Math.max(maxE - minE, 1)

    // 2) 지형 메시
    const geo = new THREE.PlaneGeometry(120, 120, GRID - 1, GRID - 1)
    const verts = geo.attributes.position.array as Float32Array

    const exaggeration = eRange < 3 ? 25 : eRange < 8 ? 18 : eRange < 20 ? 12 : 8
    let maxZ = 0
    for (let i = 0; i < GRID * GRID; i++) {
      const norm = (elevations[i] - minE) / eRange
      const z = norm * exaggeration * 15
      verts[i * 3 + 2] = z
      if (z > maxZ) maxZ = z
    }
    geo.computeVertexNormals()

    // 3) 타일 텍스처 (같은 origin → CORS 문제 없음)
    const texCanvas = document.createElement('canvas')
    texCanvas.width = 512; texCanvas.height = 512
    const ctx = texCanvas.getContext('2d')!
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(0, 0, 512, 512)

    const z16 = 16, n = Math.pow(2, z16)
    const tx = Math.floor((lng + 180) / 360 * n)
    const ty = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n)

    const texture = new THREE.CanvasTexture(texCanvas)
    texture.minFilter = THREE.LinearFilter

    // Base 타일 로드
    const loadTile = (layer: string, dx: number, dy: number, alpha: number): Promise<void> =>
      new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          if (alpha < 1) ctx.globalAlpha = alpha
          ctx.drawImage(img, (dx + 1) * (512 / 3), (dy + 1) * (512 / 3), 512 / 3, 512 / 3)
          if (alpha < 1) ctx.globalAlpha = 1
          texture.needsUpdate = true
          resolve()
        }
        img.onerror = () => resolve()
        img.src = `/api/tile?layer=${layer}&z=${z16}&x=${tx + dx}&y=${ty + dy}`
      })

    // Base 9장 로드
    const basePs: Promise<void>[] = []
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        basePs.push(loadTile('Base', dx, dy, 1))

    Promise.all(basePs).then(() => {
      // 지적도 오버레이 9장
      const cadPs: Promise<void>[] = []
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          cadPs.push(loadTile('lt_c_cadastral', dx, dy, 0.8))
      return Promise.all(cadPs)
    }).then(() => {
      texture.needsUpdate = true
      setLoading(false)
    })

    // 머티리얼
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7,
      metalness: 0,
      side: THREE.DoubleSide,
    })

    const terrain = new THREE.Mesh(geo, mat)
    terrain.rotation.x = -Math.PI / 2
    terrain.receiveShadow = true
    scene.add(terrain)

    // 마커
    const markerGeo = new THREE.CylinderGeometry(0.3, 0.3, 15, 8)
    const markerMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b })
    const marker = new THREE.Mesh(markerGeo, markerMat)
    const centerElev = (elevations[Math.floor(GRID * GRID / 2)] - minE) / eRange * exaggeration * 15
    marker.position.set(0, centerElev + 7.5, 0)
    scene.add(marker)

    const sphereGeo = new THREE.SphereGeometry(1.5, 16, 16)
    const sphereMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.5 })
    const sphere = new THREE.Mesh(sphereGeo, sphereMat)
    sphere.position.set(0, centerElev + 16, 0)
    scene.add(sphere)

    // 조명
    scene.add(new THREE.AmbientLight(0xffffff, 0.35))
    const dir = new THREE.DirectionalLight(0xffffff, 1.2)
    dir.position.set(80, 150, 30)
    dir.castShadow = true
    scene.add(dir)
    scene.add(new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.4))

    // 애니메이션
    const camDist = maxZ + 130
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      const rx = Math.max(0.1, Math.min(1.2, rotationRef.current.x))
      const ry = rotationRef.current.y
      const d = camDist / zoomRef.current
      camera.position.set(
        d * Math.cos(rx) * Math.sin(ry),
        d * Math.sin(rx),
        d * Math.cos(rx) * Math.cos(ry)
      )
      camera.lookAt(0, maxZ * 0.3, 0)
      renderer.render(scene, camera)
    }
    animate()
    setLoading(false)
  }, [lat, lng])

  useEffect(() => {
    init()
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      rendererRef.current?.dispose()
    }
  }, [init])

  // 마우스/터치 이벤트
  const onPD = (e: React.PointerEvent) => {
    isDragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }
  const onPM = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    rotationRef.current.y += (e.clientX - lastMouse.current.x) * 0.008
    rotationRef.current.x += (e.clientY - lastMouse.current.y) * 0.008
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }
  const onPU = () => { isDragging.current = false }
  const onW = (e: React.WheelEvent) => {
    zoomRef.current = Math.max(0.3, Math.min(3, zoomRef.current - e.deltaY * 0.001))
  }

  return (
    <div className={`rounded-xl border border-border/60 bg-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border-b border-border/40">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Box className="h-3.5 w-3.5 text-primary" />
          <span>3D 지적도</span>
          <span className="text-[10px] text-muted-foreground">(드래그: 회전 / 핀치: 줌)</span>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>
      <div className={`relative ${expanded ? 'h-[400px] sm:h-[500px]' : 'h-[260px] sm:h-[320px]'} transition-all`}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerLeave={onPU} onWheel={onW}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
            <p className="text-xs text-white/70">3D 지적도 로딩중...</p>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-[10px] text-white/70 pointer-events-none">
          {address || '대상지'} · 3D 지적도
        </div>
      </div>
    </div>
  )
}
