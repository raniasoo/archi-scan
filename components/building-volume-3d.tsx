"use client"

import { useEffect, useRef, useState } from "react"
import { X, RotateCcw, ZoomIn, ZoomOut } from "lucide-react"

interface BuildingVolume3DProps {
  layoutName: string
  floors: number
  siteArea: number
  coverage: number   // 건폐율 %
  floorHeight?: number  // 층고 m (기본 3.3m)
  sitePolygon?: { coords: [number, number][], centroid: [number, number] } | null
  onClose: () => void
}

export function BuildingVolume3D({
  layoutName,
  floors,
  siteArea,
  coverage,
  floorHeight = 3.3,
  sitePolygon,
  onClose,
}: BuildingVolume3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<any>(null)
  const rendererRef = useRef<any>(null)
  const cameraRef = useRef<any>(null)
  const frameRef = useRef<number>(0)
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const rotation = useRef({ x: 0.4, y: 0.5 })
  const zoom = useRef(1)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let THREE: any
    let mounted = true

    const init = async () => {
      // Three.js 동적 import
      try {
        THREE = await import('three')
      } catch {
        console.error('Three.js 로드 실패')
        return
      }
      if (!mounted || !canvasRef.current) return

      const canvas = canvasRef.current
      const W = canvas.clientWidth || 400
      const H = canvas.clientHeight || 400

      // Renderer
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setSize(W, H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      rendererRef.current = renderer

      // Scene
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x0a1628)
      sceneRef.current = scene

      // Camera
      const siteSize = Math.sqrt(siteArea)
      const camDist = siteSize * 2.2
      const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, camDist * 20)
      camera.position.set(camDist, camDist * 0.8, camDist)
      camera.lookAt(0, (floors * floorHeight) / 2, 0)
      cameraRef.current = camera

      // Lights
      const ambient = new THREE.AmbientLight(0x334466, 0.8)
      scene.add(ambient)
      const sun = new THREE.DirectionalLight(0x88bbff, 1.2)
      sun.position.set(siteSize * 2, siteSize * 3, siteSize * 2)
      sun.castShadow = true
      scene.add(sun)
      const fill = new THREE.DirectionalLight(0x44aacc, 0.4)
      fill.position.set(-siteSize, siteSize, -siteSize)
      scene.add(fill)

      // ===== 대지 (바닥) =====
      const groundGeo = new THREE.PlaneGeometry(siteSize * 1.6, siteSize * 1.6)
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0x0d2137, roughness: 0.9, metalness: 0.1,
      })
      const ground = new THREE.Mesh(groundGeo, groundMat)
      ground.rotation.x = -Math.PI / 2
      ground.receiveShadow = true
      scene.add(ground)

      // 대지 경계선
      const siteHalf = siteSize / 2
      const sitePts = sitePolygon?.coords.length
        ? (() => {
            const [cLng, cLat] = sitePolygon.centroid
            const LAT_M = 111319, LNG_M = 111319 * Math.cos(cLat * Math.PI / 180)
            const raw = sitePolygon.coords.map(([lng, lat]) => [
              (lng - cLng) * LNG_M, (lat - cLat) * LAT_M
            ])
            const cx = raw.reduce((s, p) => s + p[0], 0) / raw.length
            const cy = raw.reduce((s, p) => s + p[1], 0) / raw.length
            return raw.map(([x, y]) => new THREE.Vector3(x - cx, 0.05, -(y - cy)))
          })()
        : [
            new THREE.Vector3(-siteHalf, 0.05, -siteHalf),
            new THREE.Vector3(siteHalf, 0.05, -siteHalf),
            new THREE.Vector3(siteHalf, 0.05, siteHalf),
            new THREE.Vector3(-siteHalf, 0.05, siteHalf),
            new THREE.Vector3(-siteHalf, 0.05, -siteHalf),
          ]
      const siteLineGeo = new THREE.BufferGeometry().setFromPoints([...sitePts, sitePts[0]])
      const siteLineMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 })
      scene.add(new THREE.Line(siteLineGeo, siteLineMat))

      // ===== 건물 볼륨 =====
      const buildingRatio = Math.sqrt(coverage / 100)
      const buildW = siteSize * buildingRatio
      const buildD = siteSize * buildingRatio
      const totalH = floors * floorHeight

      // 건물 본체 (ExtrudeGeometry 또는 BoxGeometry)
      const buildingShape = new THREE.Shape()
      buildingShape.moveTo(-buildW / 2, -buildD / 2)
      buildingShape.lineTo(buildW / 2, -buildD / 2)
      buildingShape.lineTo(buildW / 2, buildD / 2)
      buildingShape.lineTo(-buildW / 2, buildD / 2)
      buildingShape.closePath()

      const extrudeSettings = { depth: totalH, bevelEnabled: false }
      const buildGeo = new THREE.ExtrudeGeometry(buildingShape, extrudeSettings)
      buildGeo.rotateX(-Math.PI / 2)

      // 반투명 메인 매스
      const buildMat = new THREE.MeshStandardMaterial({
        color: 0x1a4a7a, roughness: 0.3, metalness: 0.6,
        transparent: true, opacity: 0.85,
        side: THREE.DoubleSide,
      })
      const building = new THREE.Mesh(buildGeo, buildMat)
      building.castShadow = true
      building.receiveShadow = true
      scene.add(building)

      // 와이어프레임 엣지
      const edgesGeo = new THREE.EdgesGeometry(buildGeo)
      const edgesMat = new THREE.LineBasicMaterial({ color: 0x60a5fa, linewidth: 1.5 })
      scene.add(new THREE.LineSegments(edgesGeo, edgesMat))

      // ===== 층 구분선 =====
      for (let f = 1; f < floors; f++) {
        const y = f * floorHeight
        const floorLinePts = [
          new THREE.Vector3(-buildW / 2, y, -buildD / 2),
          new THREE.Vector3(buildW / 2, y, -buildD / 2),
          new THREE.Vector3(buildW / 2, y, buildD / 2),
          new THREE.Vector3(-buildW / 2, y, buildD / 2),
          new THREE.Vector3(-buildW / 2, y, -buildD / 2),
        ]
        const floorGeo = new THREE.BufferGeometry().setFromPoints(floorLinePts)
        const floorMat = new THREE.LineBasicMaterial({
          color: f % 5 === 0 ? 0x22d3ee : 0x1e4d7a,
          transparent: true, opacity: f % 5 === 0 ? 0.9 : 0.4,
        })
        scene.add(new THREE.Line(floorGeo, floorMat))
      }

      // 최상층 강조
      const topY = totalH
      const topLinePts = [
        new THREE.Vector3(-buildW / 2, topY, -buildD / 2),
        new THREE.Vector3(buildW / 2, topY, -buildD / 2),
        new THREE.Vector3(buildW / 2, topY, buildD / 2),
        new THREE.Vector3(-buildW / 2, topY, buildD / 2),
        new THREE.Vector3(-buildW / 2, topY, -buildD / 2),
      ]
      const topGeo = new THREE.BufferGeometry().setFromPoints(topLinePts)
      scene.add(new THREE.Line(topGeo, new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 })))

      // ===== 이격거리 표시 (점선 효과) =====
      const setback = Math.max(2, siteSize * 0.05)
      const setbackHW = siteHalf - setback
      const setbackPts = [
        new THREE.Vector3(-setbackHW, 0.1, -setbackHW),
        new THREE.Vector3(setbackHW, 0.1, -setbackHW),
        new THREE.Vector3(setbackHW, 0.1, setbackHW),
        new THREE.Vector3(-setbackHW, 0.1, setbackHW),
        new THREE.Vector3(-setbackHW, 0.1, -setbackHW),
      ]
      const setbackGeo = new THREE.BufferGeometry().setFromPoints(setbackPts)
      const setbackMat = new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 2, gapSize: 1.5, scale: 1 })
      const setbackLine = new THREE.Line(setbackGeo, setbackMat)
      setbackLine.computeLineDistances()
      scene.add(setbackLine)

      // 그리드
      const grid = new THREE.GridHelper(siteSize * 1.6, 20, 0x1e3a5f, 0x0d2137)
      grid.position.y = -0.01
      scene.add(grid)

      setLoaded(true)

      // ===== 렌더 루프 =====
      const animate = () => {
        if (!mounted) return
        frameRef.current = requestAnimationFrame(animate)

        // 카메라 궤도 회전
        const r = cameraRef.current
        const dist = camDist / zoom.current
        const ry = rotation.current.y
        const rx = Math.max(-0.1, Math.min(1.2, rotation.current.x))
        r.position.x = dist * Math.cos(rx) * Math.sin(ry)
        r.position.y = dist * Math.sin(rx)
        r.position.z = dist * Math.cos(rx) * Math.cos(ry)
        r.lookAt(0, totalH * 0.4, 0)

        renderer.render(scene, r)
      }
      animate()
    }

    init()

    return () => {
      mounted = false
      cancelAnimationFrame(frameRef.current)
      rendererRef.current?.dispose()
    }
  }, [siteArea, floors, floorHeight, coverage, sitePolygon, layoutName])

  // 마우스/터치 이벤트
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e
    lastMouse.current = { x: clientX, y: clientY }
  }

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current) return
    const { clientX, clientY } = 'touches' in e ? e.touches[0] : e
    const dx = clientX - lastMouse.current.x
    const dy = clientY - lastMouse.current.y
    rotation.current.y += dx * 0.008
    rotation.current.x += dy * 0.008
    lastMouse.current = { x: clientX, y: clientY }
  }

  const handleMouseUp = () => { isDragging.current = false }

  const handleWheel = (e: React.WheelEvent) => {
    zoom.current = Math.max(0.4, Math.min(3, zoom.current - e.deltaY * 0.001))
  }

  const reset = () => {
    rotation.current = { x: 0.4, y: 0.5 }
    zoom.current = 1
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <div>
          <span className="text-sm font-bold text-foreground">3D 볼륨 모델</span>
          <span className="text-xs text-muted-foreground ml-2">
            {layoutName} · {floors}층 · {(siteArea * coverage / 100).toLocaleString(undefined, {maximumFractionDigits:0})}㎡
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { zoom.current = Math.min(3, zoom.current + 0.2) }} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onClick={() => { zoom.current = Math.max(0.4, zoom.current - 0.2) }} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <ZoomOut className="h-4 w-4" />
          </button>
          <button onClick={reset} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 캔버스 */}
      <div className="flex-1 relative">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">3D 모델 생성 중...</p>
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          onWheel={handleWheel}
        />
      </div>

      {/* 범례 + 안내 */}
      <div className="px-4 py-2.5 border-t border-border/50 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 inline-block" />대지경계</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400 inline-block" />이격거리</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 inline-block" />최상층</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-cyan-400 inline-block" />5층 단위</span>
        </div>
        <p className="text-[10px] text-muted-foreground">드래그: 회전 · 스크롤: 줌</p>
      </div>
    </div>
  )
}
