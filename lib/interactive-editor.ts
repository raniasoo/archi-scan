/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Phase 3: Interactive Layout Editor
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 실시간 인터랙티브 건물 배치 편집 엔진
 * Three.js 3D 뷰에서 건물을 드래그하면 즉시:
 *   - 일조사선 위반 여부 시각화 (빨간색 오버레이)
 *   - 인동간격 검증 표시 (경고선)
 *   - 이격거리 경계 표시 (파란 점선)
 *   - ROI/세대수/용적률 실시간 재계산
 * 
 * building-volume-3d.tsx에 통합하여 사용
 * 
 * 사용법:
 *   const editor = new LayoutEditor(scene, camera, renderer, site, constraints)
 *   editor.enableInteractive()
 *   editor.onUpdate((metrics) => { // UI 업데이트 })
 */

import {
  calcNorthSolarMaxHeight,
  calcWinterShadowLength,
  calcWinterSunlightHours,
  checkBuildingSpacing,
  type BuildingPlacement,
  type LegalConstraints,
  type SiteGeometry,
} from './constraint-solver'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 편집 가능한 건물 객체 */
export interface EditableBuilding {
  id: string
  meshId: string              // Three.js mesh UUID
  label: string               // "A동", "B동" 등
  
  // 현재 위치 (대지 중심 기준, m)
  x: number
  z: number
  width: number
  depth: number
  floors: number
  height: number
  
  // 상태
  isSelected: boolean
  isDragging: boolean
  isValid: boolean            // 현재 위치가 법규 준수인지
  violations: string[]        // 현재 위치의 위반 사항
}

/** 실시간 메트릭 (드래그 중 업데이트) */
export interface LiveMetrics {
  coverageRatio: number
  floorAreaRatio: number
  units: number
  isLegallyCompliant: boolean
  violations: string[]
  
  // 일조
  northSolarMaxHeight: number
  winterSunlightHours: number
  shadowLength: number
  solarViolation: boolean
  
  // 인동간격
  minBuildingSpacing: number
  spacingCompliant: boolean
  
  // 이격거리
  setbackCompliant: boolean
  
  // 경제성
  estimatedROI: number
  estimatedGFA: number
}

/** 시각화 오버레이 */
export interface ConstraintOverlay {
  // 이격거리 경계선 (파란 점선)
  setbackBoundary: {
    north: number; south: number; east: number; west: number
  }
  
  // 일조사선 높이 제한선 (노란색 면)
  solarEnvelopeFaces: {
    northMaxHeight: number    // 북측 최대 높이
    stepHeights: { distance: number; maxHeight: number }[]
  }
  
  // 인동간격 최소선 (주황색 선)
  spacingGuides: {
    fromId: string; toId: string
    requiredSpacing: number; actualSpacing: number
    compliant: boolean
  }[]
  
  // 그림자 영역 (반투명 회색)
  shadowArea: {
    buildingId: string
    shadowLength: number
    shadowDirection: number   // 각도 (도)
  }[]
}

/** 편집 이벤트 콜백 */
export type OnUpdateCallback = (metrics: LiveMetrics, overlay: ConstraintOverlay) => void
export type OnBuildingSelectCallback = (building: EditableBuilding | null) => void
export type OnBuildingMoveCallback = (building: EditableBuilding, newX: number, newZ: number) => void

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Layout Editor Engine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 인터랙티브 레이아웃 편집기
 * 
 * Three.js scene에 건물 메쉬를 등록하고,
 * 사용자 드래그 시 실시간으로 제약조건을 검증합니다.
 */
export class LayoutEditor {
  private buildings: Map<string, EditableBuilding> = new Map()
  private site: SiteGeometry
  private constraints: LegalConstraints
  
  private isInteractive: boolean = false
  private selectedBuildingId: string | null = null
  private dragStartX: number = 0
  private dragStartZ: number = 0
  
  // 콜백
  private onUpdateCallbacks: OnUpdateCallback[] = []
  private onSelectCallbacks: OnBuildingSelectCallback[] = []
  private onMoveCallbacks: OnBuildingMoveCallback[] = []
  
  // 스냅 그리드
  private snapGrid: number = 0.5 // 0.5m 단위 스냅
  
  constructor(
    site: SiteGeometry,
    constraints: LegalConstraints,
    options?: { snapGrid?: number }
  ) {
    this.site = site
    this.constraints = constraints
    if (options?.snapGrid) this.snapGrid = options.snapGrid
  }
  
  // ── 건물 등록 ──
  
  /** 편집 가능한 건물 추가 (대지 이격거리 기반 자동 클램핑) */
  addBuilding(building: Omit<EditableBuilding, 'isSelected' | 'isDragging' | 'isValid' | 'violations'>): void {
    // ━━━ 대지 이격거리 기반 건물 크기 자동 클램핑 ━━━
    // 소형 대지에서 건물 크기가 이격거리를 넘지 않도록 보장
    const usableWidth = this.site.width - this.constraints.setbackSide * 2
    const usableDepth = this.site.depth - this.constraints.setbackFront - this.constraints.setbackRear
    
    const clampedWidth = Math.min(building.width, usableWidth * 0.95)  // 5% 여유
    const clampedDepth = Math.min(building.depth, usableDepth * 0.95)
    
    // 위치도 경계 안으로 클램핑
    const halfW = this.site.width / 2
    const halfD = this.site.depth / 2
    const maxX = halfW - this.constraints.setbackSide - clampedWidth / 2
    const minX = -maxX
    const maxZ = halfD - this.constraints.setbackFront - clampedDepth / 2
    const minZ = -halfD + this.constraints.setbackRear + clampedDepth / 2
    
    const clampedX = Math.max(minX, Math.min(maxX, building.x))
    const clampedZ = Math.max(minZ, Math.min(maxZ, building.z))
    
    // 정북사선 높이 제한 자동 적용
    let clampedFloors = building.floors
    let clampedHeight = building.height
    if (this.constraints.northSolarApplied) {
      const northEdge = clampedZ - clampedDepth / 2
      const northSetback = halfD + northEdge
      const maxH = calcNorthSolarMaxHeight(northSetback, this.constraints.maxHeight)
      if (clampedHeight > maxH) {
        clampedHeight = maxH
        clampedFloors = Math.floor(maxH / 3.3)
      }
    }
    
    this.buildings.set(building.id, {
      ...building,
      width: clampedWidth,
      depth: clampedDepth,
      x: clampedX,
      z: clampedZ,
      floors: clampedFloors,
      height: clampedHeight,
      isSelected: false,
      isDragging: false,
      isValid: true,
      violations: [],
    })
    this.validateAll()
  }
  
  /** 건물 제거 */
  removeBuilding(id: string): void {
    this.buildings.delete(id)
    if (this.selectedBuildingId === id) {
      this.selectedBuildingId = null
    }
    this.validateAll()
  }
  
  /** 모든 건물 초기화 */
  clearBuildings(): void {
    this.buildings.clear()
    this.selectedBuildingId = null
  }
  
  /** 등록된 건물 목록 */
  getBuildings(): EditableBuilding[] {
    return Array.from(this.buildings.values())
  }
  
  // ── 인터랙티브 모드 ──
  
  /** 인터랙티브 편집 모드 활성화 */
  enableInteractive(): void {
    this.isInteractive = true
  }
  
  /** 인터랙티브 편집 모드 비활성화 */
  disableInteractive(): void {
    this.isInteractive = false
    this.selectedBuildingId = null
    for (const b of this.buildings.values()) {
      b.isSelected = false
      b.isDragging = false
    }
  }
  
  isEnabled(): boolean {
    return this.isInteractive
  }
  
  // ── 이벤트 핸들러 (Three.js에서 호출) ──
  
  /** 건물 선택 (클릭) */
  selectBuilding(meshId: string): EditableBuilding | null {
    if (!this.isInteractive) return null
    
    // 이전 선택 해제
    for (const b of this.buildings.values()) {
      b.isSelected = false
    }
    
    // 새 선택
    for (const b of this.buildings.values()) {
      if (b.meshId === meshId) {
        b.isSelected = true
        this.selectedBuildingId = b.id
        this.onSelectCallbacks.forEach(cb => cb(b))
        return b
      }
    }
    
    this.selectedBuildingId = null
    this.onSelectCallbacks.forEach(cb => cb(null))
    return null
  }
  
  /** 드래그 시작 */
  startDrag(worldX: number, worldZ: number): boolean {
    if (!this.isInteractive || !this.selectedBuildingId) return false
    
    const building = this.buildings.get(this.selectedBuildingId)
    if (!building) return false
    
    building.isDragging = true
    this.dragStartX = worldX - building.x
    this.dragStartZ = worldZ - building.z
    return true
  }
  
  /** 드래그 이동 */
  moveDrag(worldX: number, worldZ: number): EditableBuilding | null {
    if (!this.isInteractive || !this.selectedBuildingId) return null
    
    const building = this.buildings.get(this.selectedBuildingId)
    if (!building || !building.isDragging) return null
    
    // 스냅 그리드 적용
    let newX = worldX - this.dragStartX
    let newZ = worldZ - this.dragStartZ
    
    if (this.snapGrid > 0) {
      newX = Math.round(newX / this.snapGrid) * this.snapGrid
      newZ = Math.round(newZ / this.snapGrid) * this.snapGrid
    }
    
    // 대지 경계 내 제한
    const halfW = this.site.width / 2
    const halfD = this.site.depth / 2
    const minX = -halfW + this.constraints.setbackSide + building.width / 2
    const maxX = halfW - this.constraints.setbackSide - building.width / 2
    const minZ = -halfD + this.constraints.setbackRear + building.depth / 2
    const maxZ = halfD - this.constraints.setbackFront - building.depth / 2
    
    newX = Math.max(minX, Math.min(maxX, newX))
    newZ = Math.max(minZ, Math.min(maxZ, newZ))
    
    building.x = newX
    building.z = newZ
    
    // 실시간 검증
    this.validateAll()
    
    // 콜백
    this.onMoveCallbacks.forEach(cb => cb(building, newX, newZ))
    
    return building
  }
  
  /** 드래그 종료 */
  endDrag(): void {
    if (!this.selectedBuildingId) return
    
    const building = this.buildings.get(this.selectedBuildingId)
    if (building) {
      building.isDragging = false
    }
    
    this.validateAll()
  }
  
  // ── 제약조건 실시간 검증 ──
  
  /** 모든 건물의 제약조건을 검증하고 메트릭/오버레이를 업데이트 */
  validateAll(): LiveMetrics {
    const placements = this.buildingsToplacements()
    const violations: string[] = []
    
    // ── 건폐율 ──
    const totalFootprint = placements.reduce((sum, p) => sum + p.width * p.depth, 0)
    const coverageRatio = Math.round((totalFootprint / this.site.area) * 1000) / 10
    if (coverageRatio > this.constraints.maxCoverageRatio) {
      violations.push(`건폐율 ${coverageRatio}% > ${this.constraints.maxCoverageRatio}%`)
    }
    
    // ── 용적률 ──
    const gfa = placements.reduce((sum, p) => sum + p.width * p.depth * p.floors, 0)
    const floorAreaRatio = Math.round((gfa / this.site.area) * 1000) / 10
    if (floorAreaRatio > this.constraints.maxFloorAreaRatio) {
      violations.push(`용적률 ${floorAreaRatio}% > ${this.constraints.maxFloorAreaRatio}%`)
    }
    
    // ── 이격거리 ──
    let setbackCompliant = true
    for (const p of placements) {
      const halfW = this.site.width / 2
      const halfD = this.site.depth / 2
      const left = p.centerX - p.width / 2
      const right = p.centerX + p.width / 2
      const south = p.centerZ + p.depth / 2
      const north = p.centerZ - p.depth / 2
      
      if (left < -halfW + this.constraints.setbackSide ||
          right > halfW - this.constraints.setbackSide ||
          south > halfD - this.constraints.setbackFront ||
          north < -halfD + this.constraints.setbackRear) {
        setbackCompliant = false
        violations.push('이격거리 위반')
        break
      }
    }
    
    // ── 정북사선 ──
    let northSolarMaxHeight = this.constraints.maxHeight
    let solarViolation = false
    if (this.constraints.northSolarApplied) {
      for (const p of placements) {
        const northEdge = p.centerZ - p.depth / 2
        const northSetback = (this.site.depth / 2) + northEdge
        const maxH = calcNorthSolarMaxHeight(northSetback, this.constraints.maxHeight)
        northSolarMaxHeight = Math.min(northSolarMaxHeight, maxH)
        
        if (p.height > maxH) {
          solarViolation = true
          violations.push(`정북사선: ${p.height.toFixed(1)}m > ${maxH.toFixed(1)}m`)
        }
      }
    }
    
    // ── 인동간격 ──
    const spacingResult = checkBuildingSpacing(placements, this.site.latitude)
    if (!spacingResult.compliant) {
      violations.push(...spacingResult.violations)
    }
    
    // ── 일조 ──
    const tallest = Math.max(...placements.map(p => p.height), 0)
    const shadowLen = calcWinterShadowLength(tallest, this.site.latitude)
    
    let winterSunlightHours = 6
    if (placements.length >= 2) {
      const sorted = [...placements].sort((a, b) => a.centerZ - b.centerZ)
      for (let i = 0; i < sorted.length - 1; i++) {
        const gap = (sorted[i + 1].centerZ - sorted[i + 1].depth / 2) -
                    (sorted[i].centerZ + sorted[i].depth / 2)
        const hours = calcWinterSunlightHours(sorted[i].height, Math.max(0, gap), this.site.latitude)
        winterSunlightHours = Math.min(winterSunlightHours, hours)
      }
    }
    
    // ── 세대수/ROI ──
    const netArea = gfa * 0.72
    const units = Math.max(Math.floor(netArea / 84), 1)
    const estimatedROI = gfa > 0 ? Math.round((netArea * 8000000 / (this.site.area * 5000000 + gfa * 4500000) - 1) * 1000) / 10 : 0
    
    // ── 건물별 검증 ──
    for (const b of this.buildings.values()) {
      b.violations = []
      const p = placements.find(pl => pl.centerX === b.x && pl.centerZ === b.z)
      if (!p) continue
      
      // 정북사선 개별 체크
      if (this.constraints.northSolarApplied) {
        const northEdge = b.z - b.depth / 2
        const northSetback = (this.site.depth / 2) + northEdge
        const maxH = calcNorthSolarMaxHeight(northSetback, this.constraints.maxHeight)
        if (b.height > maxH) {
          b.violations.push(`정북사선 위반: ${b.height.toFixed(0)}m > ${maxH.toFixed(0)}m`)
        }
      }
      
      b.isValid = b.violations.length === 0
    }
    
    const metrics: LiveMetrics = {
      coverageRatio,
      floorAreaRatio,
      units,
      isLegallyCompliant: violations.length === 0,
      violations,
      northSolarMaxHeight: Math.round(northSolarMaxHeight * 10) / 10,
      winterSunlightHours: Math.round(winterSunlightHours * 10) / 10,
      shadowLength: Math.round(shadowLen * 10) / 10,
      solarViolation,
      minBuildingSpacing: spacingResult.minSpacing,
      spacingCompliant: spacingResult.compliant,
      setbackCompliant,
      estimatedROI,
      estimatedGFA: Math.round(gfa),
    }
    
    // 오버레이 생성
    const overlay = this.generateOverlay(placements)
    
    // 콜백
    this.onUpdateCallbacks.forEach(cb => cb(metrics, overlay))
    
    return metrics
  }
  
  // ── 오버레이 생성 ──
  
  private generateOverlay(placements: BuildingPlacement[]): ConstraintOverlay {
    const halfW = this.site.width / 2
    const halfD = this.site.depth / 2
    
    // 이격거리 경계
    const setbackBoundary = {
      north: -halfD + this.constraints.setbackRear,
      south: halfD - this.constraints.setbackFront,
      east: halfW - this.constraints.setbackSide,
      west: -halfW + this.constraints.setbackSide,
    }
    
    // 정북사선 높이 제한
    const stepHeights: { distance: number; maxHeight: number }[] = []
    if (this.constraints.northSolarApplied) {
      for (let d = 1.5; d <= this.site.depth; d += 1) {
        stepHeights.push({
          distance: d,
          maxHeight: calcNorthSolarMaxHeight(d, this.constraints.maxHeight),
        })
      }
    }
    
    // 인동간격 가이드
    const spacingGuides: ConstraintOverlay['spacingGuides'] = []
    const buildings = Array.from(this.buildings.values())
    for (let i = 0; i < buildings.length; i++) {
      for (let j = i + 1; j < buildings.length; j++) {
        const a = buildings[i], b = buildings[j]
        const tallHeight = Math.max(a.height, b.height)
        const required = tallHeight * 0.8
        const nsGap = Math.abs(a.z - b.z) - (a.depth + b.depth) / 2
        
        spacingGuides.push({
          fromId: a.id,
          toId: b.id,
          requiredSpacing: required,
          actualSpacing: nsGap,
          compliant: nsGap >= required,
        })
      }
    }
    
    // 그림자 영역
    const shadowArea = placements.map((p, i) => ({
      buildingId: buildings[i]?.id || `building-${i}`,
      shadowLength: calcWinterShadowLength(p.height, this.site.latitude),
      shadowDirection: 180, // 남쪽으로 (동지 남중)
    }))
    
    return {
      setbackBoundary,
      solarEnvelopeFaces: {
        northMaxHeight: this.constraints.northSolarApplied
          ? calcNorthSolarMaxHeight(this.constraints.setbackRear, this.constraints.maxHeight)
          : this.constraints.maxHeight,
        stepHeights,
      },
      spacingGuides,
      shadowArea,
    }
  }
  
  // ── 유틸리티 ──
  
  private buildingsToplacements(): BuildingPlacement[] {
    return Array.from(this.buildings.values()).map(b => ({
      centerX: b.x,
      centerZ: b.z,
      width: b.width,
      depth: b.depth,
      floors: b.floors,
      height: b.height,
    }))
  }
  
  // ── 콜백 등록 ──
  
  /** 메트릭 업데이트 콜백 등록 */
  onUpdate(callback: OnUpdateCallback): () => void {
    this.onUpdateCallbacks.push(callback)
    return () => {
      this.onUpdateCallbacks = this.onUpdateCallbacks.filter(cb => cb !== callback)
    }
  }
  
  /** 건물 선택 콜백 등록 */
  onSelect(callback: OnBuildingSelectCallback): () => void {
    this.onSelectCallbacks.push(callback)
    return () => {
      this.onSelectCallbacks = this.onSelectCallbacks.filter(cb => cb !== callback)
    }
  }
  
  /** 건물 이동 콜백 등록 */
  onMove(callback: OnBuildingMoveCallback): () => void {
    this.onMoveCallbacks.push(callback)
    return () => {
      this.onMoveCallbacks = this.onMoveCallbacks.filter(cb => cb !== callback)
    }
  }
  
  // ── 상태 조회 ──
  
  getSelectedBuilding(): EditableBuilding | null {
    if (!this.selectedBuildingId) return null
    return this.buildings.get(this.selectedBuildingId) || null
  }
  
  /** 현재 배치의 최적화 점수 (0~100) */
  getOptimizationScore(): number {
    const metrics = this.validateAll()
    
    const legalScore = metrics.isLegallyCompliant ? 40 : 10
    const solarScore = metrics.winterSunlightHours >= 4 ? 25 : 
                       metrics.winterSunlightHours >= 2 ? 12 : 0
    const spacingScore = metrics.spacingCompliant ? 15 : 5
    const roiScore = Math.min(20, Math.max(0, metrics.estimatedROI))
    
    return Math.round(legalScore + solarScore + spacingScore + roiScore)
  }
  
  /** 건물 수동 이동 (UI 버튼용) */
  moveBuilding(id: string, deltaX: number, deltaZ: number): void {
    const building = this.buildings.get(id)
    if (!building) return
    
    building.x += deltaX
    building.z += deltaZ
    
    this.validateAll()
    this.onMoveCallbacks.forEach(cb => cb(building, building.x, building.z))
  }
  
  /** 건물 층수 변경 */
  changeBuildingFloors(id: string, newFloors: number): void {
    const building = this.buildings.get(id)
    if (!building) return
    
    building.floors = Math.max(1, Math.min(this.constraints.maxFloors, newFloors))
    building.height = building.floors * 3.3
    
    this.validateAll()
  }
  
  /** 건물 크기 변경 */
  resizeBuilding(id: string, newWidth: number, newDepth: number): void {
    const building = this.buildings.get(id)
    if (!building) return
    
    building.width = Math.max(6, newWidth)
    building.depth = Math.max(6, newDepth)
    
    this.validateAll()
  }
  
  /** 전체 배치를 자동 최적화 (Phase 1 GA 솔버 결과 적용) */
  applyOptimizedLayout(placements: BuildingPlacement[], labels?: string[]): void {
    this.clearBuildings()
    
    placements.forEach((p, i) => {
      this.addBuilding({
        id: `building-${i}`,
        meshId: '',
        label: labels?.[i] || `${String.fromCharCode(65 + i)}동`,
        x: p.centerX,
        z: p.centerZ,
        width: p.width,
        depth: p.depth,
        floors: p.floors,
        height: p.height,
      })
    })
    
    this.validateAll()
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// React Hook (building-volume-3d.tsx 통합용)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Three.js 3D 뷰에서 인터랙티브 편집을 위한 React Hook 인터페이스
 * 
 * 사용 예:
 *   const editor = useLayoutEditor(site, constraints)
 *   // Three.js에서: raycaster로 클릭 감지 → editor.selectBuilding(mesh.uuid)
 *   // Three.js에서: onPointerMove → editor.moveDrag(worldX, worldZ)
 *   // UI에서: editor.metrics로 실시간 정보 표시
 */
export interface UseLayoutEditorResult {
  editor: LayoutEditor
  isInteractive: boolean
  selectedBuilding: EditableBuilding | null
  metrics: LiveMetrics | null
  overlay: ConstraintOverlay | null
  
  enable: () => void
  disable: () => void
  selectById: (meshId: string) => void
  startDrag: (worldX: number, worldZ: number) => void
  moveDrag: (worldX: number, worldZ: number) => void
  endDrag: () => void
}

/**
 * LayoutEditor를 React 상태로 래핑하는 팩토리 함수
 * (실제 React Hook은 building-volume-3d.tsx에서 useState/useRef와 함께 사용)
 */
export function createLayoutEditor(
  site: SiteGeometry,
  constraints: LegalConstraints
): LayoutEditor {
  return new LayoutEditor(site, constraints)
}
