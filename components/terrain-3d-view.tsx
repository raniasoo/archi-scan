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
  const [compassAngle, setCompassAngle] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rotationRef = useRef({ x: 0.4, y: 0.5 })
  const zoomRef = useRef(1)
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  const init = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.clientWidth, H = canvas.clientHeight
    if (W < 10 || H < 10) return
    canvas.width = W; canvas.height = H

    const MESH_SIZE = 100
    const TARGET_MAX_Z = MESH_SIZE * 0.3

    try {

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a2332)
    scene.fog = new THREE.Fog(0x1a2332, MESH_SIZE * 1.5, MESH_SIZE * 4)

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 2000)
    cameraRef.current = camera
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    rendererRef.current = renderer
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true

    // 표고 데이터 (12x12 = 144개 — URL 길이 제한 내)
    const DATA_GRID = 10, RANGE = 0.004
    const MESH_GRID = 40

    let rawElevations: number[]
    try {
      const r = await fetch(`/api/elevation-grid?lat=${lat}&lng=${lng}&grid=${DATA_GRID}&range=${RANGE}`)
      const d = await r.json()
      rawElevations = d.elevations?.length ? d.elevations : new Array(DATA_GRID * DATA_GRID).fill(0)
    } catch {
      rawElevations = new Array(DATA_GRID * DATA_GRID).fill(0)
    }

    // 12x12 → 40x40 바이리니어 보간
    const elevations = new Array(MESH_GRID * MESH_GRID).fill(0)
    for (let my = 0; my < MESH_GRID; my++) {
      for (let mx = 0; mx < MESH_GRID; mx++) {
        const fx = mx / (MESH_GRID - 1) * (DATA_GRID - 1)
        const fy = my / (MESH_GRID - 1) * (DATA_GRID - 1)
        const ix = Math.min(Math.floor(fx), DATA_GRID - 2)
        const iy = Math.min(Math.floor(fy), DATA_GRID - 2)
        const dx = fx - ix, dy = fy - iy
        const e00 = rawElevations[iy * DATA_GRID + ix]
        const e10 = rawElevations[iy * DATA_GRID + ix + 1]
        const e01 = rawElevations[(iy + 1) * DATA_GRID + ix]
        const e11 = rawElevations[(iy + 1) * DATA_GRID + ix + 1]
        elevations[my * MESH_GRID + mx] = e00 * (1 - dx) * (1 - dy) + e10 * dx * (1 - dy) + e01 * (1 - dx) * dy + e11 * dx * dy
      }
    }
    const GRID = MESH_GRID

    const minE = Math.min(...elevations), maxE = Math.max(...elevations)
    const eRange = Math.max(maxE - minE, 1)

    // 지형 메시
    const geo = new THREE.PlaneGeometry(MESH_SIZE, MESH_SIZE, GRID - 1, GRID - 1)
    const verts = geo.attributes.position.array as Float32Array

    // 높이를 메시 폭의 30%로 제한
    let maxZ = 0

    // 1차: 실제 표고 적용 (0~TARGET_MAX_Z 범위로 정규화)
    for (let i = 0; i < GRID * GRID; i++) {
      const norm = (elevations[i] - minE) / eRange
      verts[i * 3 + 2] = norm * TARGET_MAX_Z
    }

    // 2차: 미세 굴곡 (경사 급한 곳 울퉁불퉁)
    for (let gy = 1; gy < GRID - 1; gy++) {
      for (let gx = 1; gx < GRID - 1; gx++) {
        const idx = gy * GRID + gx
        const dN = elevations[idx] - elevations[(gy - 1) * GRID + gx]
        const dS = elevations[idx] - elevations[(gy + 1) * GRID + gx]
        const dE = elevations[idx] - elevations[gy * GRID + gx + 1]
        const dW = elevations[idx] - elevations[gy * GRID + gx - 1]
        const localSlope = Math.abs(dN) + Math.abs(dS) + Math.abs(dE) + Math.abs(dW)
        const noise = (Math.sin(gx * 3.7 + gy * 2.3) * 0.5 + Math.cos(gx * 1.3 - gy * 4.1) * 0.3) * localSlope * 0.02
        verts[idx * 3 + 2] += noise * TARGET_MAX_Z * 0.1
      }
    }

    for (let i = 0; i < GRID * GRID; i++) {
      if (verts[i * 3 + 2] > maxZ) maxZ = verts[i * 3 + 2]
      if (verts[i * 3 + 2] < 0) verts[i * 3 + 2] = 0
    }
    if (maxZ < 1) maxZ = TARGET_MAX_Z
    geo.computeVertexNormals()

    // 높이별 색상 (초록 → 연두 → 노랑 → 갈색)
    const colors = new Float32Array(GRID * GRID * 3)
    for (let i = 0; i < GRID * GRID; i++) {
      const h = maxZ > 0 ? verts[i * 3 + 2] / maxZ : 0
      let r, g, b
      if (h < 0.2) { r = 0.15; g = 0.5; b = 0.2 }
      else if (h < 0.4) { const t = (h - 0.2) * 5; r = 0.15 + t * 0.35; g = 0.5 + t * 0.15; b = 0.2 - t * 0.1 }
      else if (h < 0.6) { const t = (h - 0.4) * 5; r = 0.5 + t * 0.3; g = 0.65 - t * 0.1; b = 0.1 - t * 0.02 }
      else if (h < 0.8) { const t = (h - 0.6) * 5; r = 0.8 - t * 0.05; g = 0.55 - t * 0.15; b = 0.08 + t * 0.12 }
      else { const t = (h - 0.8) * 5; r = 0.75 + t * 0.15; g = 0.4 + t * 0.1; b = 0.2 + t * 0.15 }
      colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide,
    })
    const terrain = new THREE.Mesh(geo, mat)
    terrain.rotation.x = -Math.PI / 2
    terrain.receiveShadow = true
    scene.add(terrain)

    // 와이어프레임 오버레이 (지형 굴곡 강조)
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x000000, wireframe: true, opacity: 0.08, transparent: true,
    })
    const wire = new THREE.Mesh(geo, wireMat)
    wire.rotation.x = -Math.PI / 2
    wire.position.y = 0.1
    scene.add(wire)

    // 등고선 (5m 간격)
    const contourInterval = eRange > 30 ? 10 : eRange > 10 ? 5 : 2
    const contourCount = Math.floor(eRange / contourInterval)
    for (let c = 1; c <= contourCount; c++) {
      const contourElev = minE + c * contourInterval
      const contourNorm = (contourElev - minE) / eRange
      const contourZ = contourNorm * TARGET_MAX_Z
      const contourPts: THREE.Vector3[] = []
      // 가로 스캔
      for (let gy = 0; gy < GRID - 1; gy++) {
        for (let gx = 0; gx < GRID - 1; gx++) {
          const e00 = elevations[gy * GRID + gx]
          const e10 = elevations[gy * GRID + gx + 1]
          if ((e00 - contourElev) * (e10 - contourElev) < 0) {
            const t = (contourElev - e00) / (e10 - e00)
            const x = -MESH_SIZE/2 + (gx + t) * (MESH_SIZE / (GRID - 1))
            const z2 = -MESH_SIZE/2 + gy * (MESH_SIZE / (GRID - 1))
            contourPts.push(new THREE.Vector3(x, contourZ + 0.3, -z2))
          }
          const e01 = elevations[(gy + 1) * GRID + gx]
          if ((e00 - contourElev) * (e01 - contourElev) < 0) {
            const t = (contourElev - e00) / (e01 - e00)
            const x = -MESH_SIZE/2 + gx * (MESH_SIZE / (GRID - 1))
            const z2 = -MESH_SIZE/2 + (gy + t) * (MESH_SIZE / (GRID - 1))
            contourPts.push(new THREE.Vector3(x, contourZ + 0.3, -z2))
          }
        }
      }
      if (contourPts.length > 2) {
        const cGeo = new THREE.BufferGeometry().setFromPoints(contourPts)
        const isMajor = c % 2 === 0
        const cMat = new THREE.PointsMaterial({
          color: isMajor ? 0xffffff : 0xcccccc,
          size: isMajor ? 1.5 : 0.8,
          opacity: isMajor ? 0.6 : 0.3,
          transparent: true,
        })
        scene.add(new THREE.Points(cGeo, cMat))
      }
    }

    // 마커
    const markerGeo = new THREE.CylinderGeometry(0.4, 0.4, 12, 8)
    const markerMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b })
    const marker = new THREE.Mesh(markerGeo, markerMat)
    const cIdx = Math.floor(GRID * GRID / 2)
    const centerZ = (elevations[cIdx] - minE) / eRange * TARGET_MAX_Z
    marker.position.set(0, centerZ + 6, 0)
    scene.add(marker)
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.5 })
    )
    sphere.position.set(0, centerZ + 13, 0)
    scene.add(sphere)

    // 조명 — 낮은 ambient + 강한 방향성 = 극적인 그림자
    scene.add(new THREE.AmbientLight(0x334466, 0.3))
    const sun = new THREE.DirectionalLight(0xffeedd, 2.0)
    sun.position.set(MESH_SIZE * 0.5, TARGET_MAX_Z + 40, -MESH_SIZE * 0.3)
    sun.castShadow = true
    scene.add(sun)
    scene.add(new THREE.HemisphereLight(0x87CEEB, 0x332211, 0.4))

    // 표고 범위 라벨 (HTML 오버레이)
    const infoDiv = document.createElement('div')
    infoDiv.style.cssText = 'position:absolute;top:8px;left:8px;color:rgba(255,255,255,0.8);font:10px/1.4 sans-serif;background:rgba(0,0,0,0.5);padding:4px 8px;border-radius:4px;pointer-events:none'
    infoDiv.innerHTML = `▲ ${maxE.toFixed(0)}m &nbsp;▼ ${minE.toFixed(0)}m &nbsp;차이 ${eRange.toFixed(0)}m`

    // 애니메이션
    const camDist = MESH_SIZE * 1.2
    let lastCompass = 0
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      const rx = Math.max(0.1, Math.min(1.2, rotationRef.current.x))
      const ry = rotationRef.current.y
      const d = camDist / zoomRef.current
      camera.position.set(d * Math.cos(rx) * Math.sin(ry), d * Math.sin(rx), d * Math.cos(rx) * Math.cos(ry))
      camera.lookAt(0, TARGET_MAX_Z * 0.3, 0)
      renderer.render(scene, camera)
      // 나침반 업데이트 (10fps)
      const now = Date.now()
      if (now - lastCompass > 100) {
        lastCompass = now
        setCompassAngle(-ry * 180 / Math.PI)
      }
    }
    animate()
    setLoading(false)

    } catch (err) {
      console.error('3D terrain init error:', err)
      setLoading(false)
    }
  }, [lat, lng])

  useEffect(() => {
    init()
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [init])

  // expand 시 리사이즈
  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = rendererRef.current
    const camera = cameraRef.current
    if (!canvas || !renderer || !camera) return
    const t = setTimeout(() => {
      const W = canvas.clientWidth, H = canvas.clientHeight
      if (W > 10 && H > 10) {
        canvas.width = W; canvas.height = H
        camera.aspect = W / H
        camera.updateProjectionMatrix()
        renderer.setSize(W, H)
      }
    }, 100)
    return () => clearTimeout(t)
  }, [expanded])

  const onPD = (e: React.PointerEvent) => { isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY } }
  const onPM = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    rotationRef.current.y += (e.clientX - lastMouse.current.x) * 0.008
    rotationRef.current.x += (e.clientY - lastMouse.current.y) * 0.008
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }
  const onPU = () => { isDragging.current = false }
  const onW = (e: React.WheelEvent) => { zoomRef.current = Math.max(0.3, Math.min(3, zoomRef.current - e.deltaY * 0.001)) }

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
        {/* 나침반 — 모델 회전에 연동 */}
        <div className="absolute top-2 right-2 pointer-events-none">
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="22" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
            <g transform={`rotate(${compassAngle}, 24, 24)`}>
              <polygon points="24,5 20,22 24,19 28,22" fill="#ef4444"/>
              <polygon points="24,43 20,26 24,29 28,26" fill="#94a3b8"/>
              <text x="24" y="15" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">N</text>
            </g>
          </svg>
        </div>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
            <p className="text-xs text-white/70">3D 지형 로딩중...</p>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white/80 pointer-events-none">
          {address || '대상지'} · 3D 지형
        </div>
        <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white/80 pointer-events-none flex gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#268033'}}/>낮음</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#80a610'}}/>중간</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#c08c14'}}/>높음</span>
        </div>
      </div>
    </div>
  )
}
