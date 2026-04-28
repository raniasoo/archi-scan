"use client"

import React from "react"
import type { DesignStrategy } from "@/lib/design-strategy"

interface FloorPlanProps {
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
  floor: number
  totalFloors: number
  strategy?: DesignStrategy
  zoneType?: string
  units?: number
  gfa?: number
}

export function FloorPlan({ type, floor, totalFloors, strategy = "profitability", zoneType, units = 0, gfa = 0 }: FloorPlanProps) {
  const isGroundFloor = floor === 1
  const isBasementOrParking = floor <= 0
  const isTopFloor = floor === totalFloors
  const isLowFloor = floor <= 3
  const isMidFloor = floor > 3 && floor < totalFloors - 2
  const isHighFloor = floor >= totalFloors - 2

  // 용도지역별 1층 상가 허용 여부
  // 전용주거지역: 상가 불가 → 전층 주거
  // 일반주거/준주거/상업: 상가 가능
  const allowCommercial = !zoneType || (
    !zoneType.includes('exclusive') && zoneType !== 'green-natural' && zoneType !== 'green-production'
  )
  
  // 1층 상가/세대 표시용 라벨과 색상
  const gfLabel = allowCommercial ? '상가' : '세대'
  const gfColor = allowCommercial ? '#f59e0b' : '#22c55e'
  const gfFill = allowCommercial ? '#f59e0b20' : '#22c55e20'

  // 동적 세대수 배분
  const totalUnits = units || 10
  const upperFloors = Math.max(totalFloors - 1, 1)
  const upperFloorUnits = totalFloors > 1 ? Math.ceil(totalUnits * 0.6 / upperFloors) : totalUnits
  const groundFloorUnits = totalFloors > 1 ? Math.max(totalUnits - (upperFloorUnits * upperFloors), 2) : totalUnits
  const currentFloorUnits = isGroundFloor ? groundFloorUnits : upperFloorUnits
  const totalGFA = gfa || (totalUnits * 59)
  const unitArea = Math.round(totalGFA / Math.max(totalUnits, 1))

  // 전략에 따른 색상 테마
  const getStrategyColors = () => {
    switch (strategy) {
      case "view-priority":
        return { primary: "#0ea5e9", secondary: "#0ea5e920", accent: "#06b6d4" }
      case "privacy-priority":
        return { primary: "#8b5cf6", secondary: "#8b5cf620", accent: "#a855f7" }
      case "area-maximize":
        return { primary: "#f59e0b", secondary: "#f59e0b20", accent: "#eab308" }
      case "parking-efficient":
        return { primary: "#64748b", secondary: "#64748b20", accent: "#475569" }
      case "profitability":
        return { primary: "#22c55e", secondary: "#22c55e20", accent: "#10b981" }
      case "livability":
        return { primary: "#ec4899", secondary: "#ec489920", accent: "#f472b6" }
      default:
        return { primary: "#3b82f6", secondary: "#3b82f620", accent: "#2563eb" }
    }
  }

  const colors = getStrategyColors()

  // 층별 설명 텍스트
  const getFloorDescription = () => {
    if (isGroundFloor) return `1층 (${groundFloorUnits}${gfLabel}+로비/주차)`
    if (floor === 2) return `2층 (${currentFloorUnits}세대)`
    if (isTopFloor) return `${floor}층 (최상층 ${currentFloorUnits}세대)`
    if (isHighFloor) return `${floor}층 (고층 세대)`
    if (isMidFloor) return `${floor}층 (기준층)`
    return `${floor}층`
  }

  // 전략에 따른 세대 크기 조정
  const getUnitConfig = () => {
    switch (strategy) {
      case "view-priority":
        return { unitCount: 2, unitSize: "대형", hasBalcony: true, hasOpenSpace: true }
      case "privacy-priority":
        return { unitCount: 3, unitSize: "중형", hasBalcony: true, hasOpenSpace: true }
      case "area-maximize":
        return { unitCount: 6, unitSize: "소형", hasBalcony: false, hasOpenSpace: false }
      case "parking-efficient":
        return { unitCount: 4, unitSize: "중형", hasBalcony: true, hasOpenSpace: false }
      case "profitability":
        return { unitCount: 5, unitSize: "소형", hasBalcony: false, hasOpenSpace: false }
      case "livability":
        return { unitCount: 4, unitSize: "중형", hasBalcony: true, hasOpenSpace: true }
      default:
        return { unitCount: 4, unitSize: "중형", hasBalcony: true, hasOpenSpace: false }
    }
  }

  const unitConfig = getUnitConfig()

  return (
    <svg 
      viewBox="0 0 300 200" 
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ 
        display: 'block',
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain'
      }}
    >
      <defs>
        <pattern id="floor-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-border" />
        </pattern>
        <linearGradient id="unitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} stopOpacity="0.2" />
          <stop offset="100%" stopColor={colors.primary} stopOpacity="0.1" />
        </linearGradient>
      </defs>
      
      {/* Background */}
      <rect x="0" y="0" width="300" height="200" fill="url(#floor-grid)" />
      
      {/* Ground Floor - Parking/Lobby/Commercial */}
      {isGroundFloor && type === "tower" && (
        <g transform="translate(50, 20)">
          <rect x="0" y="0" width="200" height="160" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          
          {/* Dynamic ground floor: units + lobby */}
          {(() => {
            const gfUnits = groundFloorUnits
            const totalSlots = gfUnits + 1
            const slotW = Math.floor(190 / totalSlots)
            const lobbyIdx = Math.floor(gfUnits / 2)
            const elements: React.ReactElement[] = []
            let unitIdx = 0
            for (let i = 0; i < totalSlots; i++) {
              const x = 5 + i * slotW; const w = slotW - 3
              if (i === lobbyIdx) {
                elements.push(<g key="lobby"><rect x={x} y={5} width={w} height={50} fill="#06b6d420" stroke="#06b6d4" strokeWidth="1.5" /><text x={x+w/2} y={30} fontSize="9" textAnchor="middle" fill="#06b6d4" fontWeight="500">로비</text></g>)
              } else {
                elements.push(<g key={`gf${unitIdx}`}><rect x={x} y={5} width={w} height={50} fill={gfFill} stroke={gfColor} strokeWidth="1" /><text x={x+w/2} y={30} fontSize="8" textAnchor="middle" fill={gfColor}>{gfLabel}</text></g>)
                unitIdx++
              }
            }
            return elements
          })()}
          
          {/* Elevator/Stairs Core */}
          <rect x="75" y="60" width="50" height="35" fill="#64748b40" stroke="#64748b" strokeWidth="2" />
          <rect x="80" y="65" width="18" height="25" fill="#475569" />
          <text x="89" y="80" fontSize="6" textAnchor="middle" fill="white">EV</text>
          <rect x="102" y="65" width="18" height="25" fill="#334155" />
          <text x="111" y="80" fontSize="6" textAnchor="middle" fill="white">계단</text>
          
          {/* Parking Area */}
          <rect x="5" y="100" width="190" height="55" fill="#64748b15" stroke="#64748b" strokeWidth="1" strokeDasharray="4" />
          <text x="100" y="130" fontSize="10" textAnchor="middle" fill="#64748b">주차장</text>
          
          {/* Entrance */}
          <rect x="90" y="155" width="20" height="8" fill="#2dd4bf" />
          <text x="100" y="175" fontSize="7" textAnchor="middle" fill="#2dd4bf">주출입구</text>
        </g>
      )}

      {/* Upper Floors - Tower Type */}
      {!isGroundFloor && type === "tower" && (
        <g transform="translate(50, 20)">
          <rect x="0" y="0" width="200" height="160" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          
          {currentFloorUnits <= 8 ? (
            /* Individual units for small buildings */
            (() => {
              const n = currentFloorUnits
              const topRow = Math.ceil(n / 2)
              const bottomRow = n - topRow
              const elements: React.ReactElement[] = []
              const tw = Math.floor((195) / Math.max(topRow, 1))
              for (let i = 0; i < topRow; i++) {
                const x = 5 + i * tw; const w = tw - 5
                elements.push(<g key={`t${i}`}><rect x={x} y={5} width={w} height={50} fill={colors.secondary} stroke={colors.primary} strokeWidth="1" /><text x={x+w/2} y={25} fontSize="9" textAnchor="middle" fill={colors.primary}>{String.fromCharCode(65+i)}호</text><text x={x+w/2} y={38} fontSize="7" textAnchor="middle" fill={colors.primary}>{unitArea}㎡</text></g>)
              }
              if (bottomRow > 0) {
                const bw = Math.floor((195) / Math.max(bottomRow, 1))
                for (let i = 0; i < bottomRow; i++) {
                  const x = 5 + i * bw; const w = bw - 5
                  elements.push(<g key={`b${i}`}><rect x={x} y={95} width={w} height={50} fill={colors.secondary} stroke={colors.primary} strokeWidth="1" /><text x={x+w/2} y={115} fontSize="9" textAnchor="middle" fill={colors.primary}>{String.fromCharCode(65+topRow+i)}호</text><text x={x+w/2} y={128} fontSize="7" textAnchor="middle" fill={colors.primary}>{unitArea}㎡</text></g>)
                }
              }
              return elements
            })()
          ) : (
            /* Compact summary for large buildings (9+ units/floor) */
            <>
              {/* 4 representative units */}
              <rect x="5" y="5" width="90" height="55" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="50" y="28" fontSize="10" textAnchor="middle" fill={colors.primary} fontWeight="500">A호</text>
              <text x="50" y="43" fontSize="8" textAnchor="middle" fill={colors.primary}>{unitArea}㎡</text>
              <rect x="105" y="5" width="90" height="55" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="150" y="28" fontSize="10" textAnchor="middle" fill={colors.primary} fontWeight="500">B호</text>
              <text x="150" y="43" fontSize="8" textAnchor="middle" fill={colors.primary}>{unitArea}㎡</text>
              {/* Summary label */}
              <rect x="5" y="95" width="190" height="55" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" strokeDasharray="3" />
              <text x="100" y="118" fontSize="11" textAnchor="middle" fill={colors.primary} fontWeight="600">... 외 {currentFloorUnits - 2}세대</text>
              <text x="100" y="135" fontSize="8" textAnchor="middle" fill={colors.primary}>기준층 총 {currentFloorUnits}세대 × {unitArea}㎡</text>
            </>
          )}
          
          {/* Core */}
          <rect x="75" y="60" width="50" height="30" fill="#64748b40" stroke="#64748b" strokeWidth="2" />
          <rect x="80" y="63" width="18" height="22" fill="#475569" />
          <text x="89" y="77" fontSize="5" textAnchor="middle" fill="white">EV</text>
          <rect x="102" y="63" width="18" height="22" fill="#334155" />
          <text x="111" y="77" fontSize="5" textAnchor="middle" fill="white">계단</text>
        </g>
      )}
      
      {/* Ground Floor - Courtyard Type */}
      {isGroundFloor && type === "courtyard" && (
        <g transform="translate(30, 15)">
          <rect x="0" y="0" width="240" height="170" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          
          {/* Dynamic top row: units + lobby */}
          {(() => {
            const topUnits = Math.min(groundFloorUnits, 4)
            const totalSlots = topUnits + 1
            const slotW = Math.floor(230 / totalSlots)
            const lobbyIdx = Math.floor(topUnits / 2)
            const elements: React.ReactElement[] = []
            let unitIdx = 0
            for (let i = 0; i < totalSlots; i++) {
              const x = 5 + i * slotW; const w = slotW - 3
              if (i === lobbyIdx) {
                elements.push(<g key="lobby"><rect x={x} y={5} width={w} height={35} fill="#06b6d420" stroke="#06b6d4" strokeWidth="1.5" /><text x={x+w/2} y={25} fontSize="8" textAnchor="middle" fill="#06b6d4">로비</text></g>)
              } else {
                elements.push(<g key={`gf${unitIdx}`}><rect x={x} y={5} width={w} height={35} fill={gfFill} stroke={gfColor} strokeWidth="1" /><text x={x+w/2} y={25} fontSize="8" textAnchor="middle" fill={gfColor}>{gfLabel} {String.fromCharCode(65 + unitIdx)}</text></g>)
                unitIdx++
              }
            }
            return elements
          })()}
          
          {/* Central Courtyard */}
          <rect x="50" y="50" width="140" height="70" fill="#22c55e15" stroke="#22c55e" strokeWidth="1" />
          <text x="120" y="85" fontSize="10" textAnchor="middle" fill="#22c55e">중정 / 조경</text>
          <text x="120" y="100" fontSize="7" textAnchor="middle" fill="#22c55e">커뮤니티 공간</text>
          
          {/* Side Corridors */}
          <rect x="5" y="45" width="40" height="80" fill="#64748b15" stroke="#64748b" strokeWidth="1" strokeDasharray="3" />
          <text x="25" y="88" fontSize="6" textAnchor="middle" fill="#64748b" transform="rotate(-90, 25, 85)">주차/복도</text>
          <rect x="195" y="45" width="40" height="80" fill="#64748b15" stroke="#64748b" strokeWidth="1" strokeDasharray="3" />
          
          {/* Lower Amenities */}
          <rect x="5" y="130" width="70" height="35" fill="#8b5cf620" stroke="#8b5cf6" strokeWidth="1" />
          <text x="40" y="150" fontSize="8" textAnchor="middle" fill="#8b5cf6">관리실</text>
          <rect x="85" y="130" width="70" height="35" fill="#64748b20" stroke="#64748b" strokeWidth="1" />
          <text x="120" y="150" fontSize="8" textAnchor="middle" fill="#64748b">기계실</text>
          <rect x="165" y="130" width="70" height="35" fill="#ec489920" stroke="#ec4899" strokeWidth="1" />
          <text x="200" y="150" fontSize="8" textAnchor="middle" fill="#ec4899">커뮤니티</text>
          
          {/* Entrance */}
          <rect x="110" y="162" width="20" height="8" fill="#2dd4bf" />
        </g>
      )}
      
      {/* Upper Floors - Courtyard Type */}
      {!isGroundFloor && type === "courtyard" && (
        <g transform="translate(30, 15)">
          <rect x="0" y="0" width="240" height="170" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          
          {currentFloorUnits <= 8 ? (
            /* Individual units */
            <>
              {(() => {
                const topCount = Math.ceil(currentFloorUnits / 2)
                const tw = Math.floor(230 / Math.max(topCount, 1))
                return Array.from({ length: topCount }, (_, i) => (
                  <g key={`t${i}`}><rect x={5 + i * tw} y={5} width={tw - 5} height={40} fill={colors.secondary} stroke={colors.primary} strokeWidth="1" /><text x={5 + i * tw + (tw - 5) / 2} y={22} fontSize="9" textAnchor="middle" fill={colors.primary}>{String.fromCharCode(65 + i)}호</text><text x={5 + i * tw + (tw - 5) / 2} y={35} fontSize="7" textAnchor="middle" fill={colors.primary}>{unitArea}㎡</text></g>
                ))
              })()}
              {(() => {
                const topCount = Math.ceil(currentFloorUnits / 2)
                const bottomCount = currentFloorUnits - topCount
                const bw = Math.floor(230 / Math.max(bottomCount, 1))
                return Array.from({ length: bottomCount }, (_, i) => (
                  <g key={`b${i}`}><rect x={5 + i * bw} y={125} width={bw - 5} height={40} fill={colors.secondary} stroke={colors.primary} strokeWidth="1" /><text x={5 + i * bw + (bw - 5) / 2} y={142} fontSize="9" textAnchor="middle" fill={colors.primary}>{String.fromCharCode(65 + topCount + i)}호</text><text x={5 + i * bw + (bw - 5) / 2} y={155} fontSize="7" textAnchor="middle" fill={colors.primary}>{unitArea}㎡</text></g>
                ))
              })()}
            </>
          ) : (
            /* Compact summary */
            <>
              <rect x="5" y="5" width="110" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="60" y="22" fontSize="9" textAnchor="middle" fill={colors.primary} fontWeight="500">A호 {unitArea}㎡</text>
              <rect x="125" y="5" width="110" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" strokeDasharray="3" />
              <text x="180" y="22" fontSize="8" textAnchor="middle" fill={colors.primary}>... 외 {Math.ceil(currentFloorUnits/2)-1}세대</text>
              <rect x="5" y="125" width="230" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" strokeDasharray="3" />
              <text x="120" y="142" fontSize="9" textAnchor="middle" fill={colors.primary} fontWeight="600">하단 윙 {currentFloorUnits - Math.ceil(currentFloorUnits/2)}세대 × {unitArea}㎡</text>
            </>
          )}
          
          {/* Courtyard */}
          <rect x="50" y="50" width="140" height="70" fill="#22c55e15" stroke="#22c55e" strokeWidth="1" strokeDasharray="4" />
          <text x="120" y="90" fontSize="10" textAnchor="middle" fill="#22c55e">중정</text>
          
          {/* Side corridors */}
          <rect x="5" y="50" width="40" height="70" fill="#64748b20" stroke="#64748b" strokeWidth="1" />
          <text x="25" y="90" fontSize="7" textAnchor="middle" fill="#64748b" transform="rotate(-90, 25, 85)">복도</text>
          <rect x="195" y="50" width="40" height="70" fill="#64748b20" stroke="#64748b" strokeWidth="1" />
        </g>
      )}
      
      {/* Ground Floor - L-Shape Type */}
      {isGroundFloor && type === "lshape" && (
        <g transform="translate(25, 10)">
          {/* Vertical wing */}
          <rect x="0" y="0" width="80" height="140" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          {/* Horizontal wing */}
          <rect x="0" y="140" width="250" height="50" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          
          {/* Dynamic vertical wing: units + lobby */}
          {(() => {
            const vUnits = Math.min(groundFloorUnits, 3)
            const totalSlots = vUnits + 1 // units + lobby
            const slotH = Math.floor(130 / totalSlots)
            const elements: React.ReactElement[] = []
            for (let i = 0; i < vUnits; i++) {
              elements.push(<g key={`gf${i}`}><rect x={5} y={5 + i * slotH} width={70} height={slotH - 5} fill={gfFill} stroke={gfColor} strokeWidth="1" /><text x={40} y={5 + i * slotH + (slotH - 5) / 2 + 3} fontSize="8" textAnchor="middle" fill={gfColor}>{gfLabel}</text></g>)
            }
            // Lobby at bottom of vertical wing
            elements.push(<g key="lobby"><rect x={5} y={5 + vUnits * slotH} width={70} height={slotH - 5} fill="#06b6d420" stroke="#06b6d4" strokeWidth="1.5" /><text x={40} y={5 + vUnits * slotH + (slotH - 5) / 2 + 3} fontSize="9" textAnchor="middle" fill="#06b6d4">로비</text></g>)
            return elements
          })()}
          
          {/* Parking in horizontal wing */}
          <rect x="85" y="145" width="160" height="40" fill="#64748b15" stroke="#64748b" strokeWidth="1" strokeDasharray="4" />
          <text x="165" y="168" fontSize="9" textAnchor="middle" fill="#64748b">주차장 / 기계실</text>
          
          {/* Entrance */}
          <rect x="30" y="182" width="20" height="8" fill="#2dd4bf" />
        </g>
      )}
      
      {/* Upper Floors - L-Shape Type */}
      {!isGroundFloor && type === "lshape" && (
        <g transform="translate(25, 10)">
          {/* Vertical wing */}
          <rect x="0" y="0" width="80" height="140" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          {/* Horizontal wing */}
          <rect x="0" y="140" width="250" height="50" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          
          {/* Dynamic vertical wing units */}
          {currentFloorUnits <= 8 ? (
            <>
              {(() => {
                const vCount = Math.ceil(currentFloorUnits / 2)
                const vh = Math.floor(130 / Math.max(vCount, 1))
                return Array.from({ length: vCount }, (_, i) => (
                  <g key={`v${i}`}><rect x={5} y={5 + i * vh} width={70} height={vh - 5} fill={colors.secondary} stroke={colors.primary} strokeWidth="1" /><text x={40} y={5 + i * vh + (vh - 5) / 2} fontSize="9" textAnchor="middle" fill={colors.primary}>{String.fromCharCode(65 + i)}호</text><text x={40} y={5 + i * vh + (vh - 5) / 2 + 13} fontSize="7" textAnchor="middle" fill={colors.primary}>{unitArea}㎡</text></g>
                ))
              })()}
            </>
          ) : (
            /* Compact vertical wing */
            <>
              <rect x="5" y="5" width="70" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="40" y="22" fontSize="9" textAnchor="middle" fill={colors.primary} fontWeight="500">A호 {unitArea}㎡</text>
              <rect x="5" y="50" width="70" height="85" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" strokeDasharray="3" />
              <text x="40" y="85" fontSize="8" textAnchor="middle" fill={colors.primary}>수직동</text>
              <text x="40" y="100" fontSize="8" textAnchor="middle" fill={colors.primary}>{Math.ceil(currentFloorUnits/2)}세대</text>
            </>
          )}
          
          {/* Core at corner */}
          <rect x="5" y="145" width="40" height="40" fill="#64748b40" stroke="#64748b" strokeWidth="2" />
          <text x="25" y="168" fontSize="7" textAnchor="middle" fill="#64748b">코어</text>
          
          {/* Dynamic horizontal wing units */}
          {currentFloorUnits <= 8 ? (
            (() => {
              const vCount = Math.ceil(currentFloorUnits / 2)
              const hCount = currentFloorUnits - vCount
              const hw = Math.floor(195 / Math.max(hCount, 1))
              return Array.from({ length: hCount }, (_, i) => (
                <g key={`h${i}`}><rect x={50 + i * hw} y={145} width={hw - 5} height={40} fill={colors.secondary} stroke={colors.primary} strokeWidth="1" /><text x={50 + i * hw + (hw - 5) / 2} y={162} fontSize="9" textAnchor="middle" fill={colors.primary}>{String.fromCharCode(65 + vCount + i)}호</text><text x={50 + i * hw + (hw - 5) / 2} y={175} fontSize="7" textAnchor="middle" fill={colors.primary}>{unitArea}㎡</text></g>
              ))
            })()
          ) : (
            /* Compact horizontal wing */
            <rect x="50" y="145" width="195" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" strokeDasharray="3">
            </rect>
          )}
          {currentFloorUnits > 8 && (
            <text x="147" y="168" fontSize="8" textAnchor="middle" fill={colors.primary}>수평동 {currentFloorUnits - Math.ceil(currentFloorUnits/2)}세대 × {unitArea}㎡</text>
          )}
        </g>
      )}

      {/* Linear Type - Ground Floor */}
      {isGroundFloor && type === "linear" && (
        <g transform="translate(15, 40)">
          <rect x="0" y="0" width="270" height="120" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          
          {/* Dynamic ground floor units + lobby */}
          {(() => {
            const gfUnits = groundFloorUnits
            const totalSlots = gfUnits + 1 // units + lobby
            const slotW = Math.floor(260 / totalSlots)
            const lobbyIdx = Math.floor(gfUnits / 2) // lobby in the middle
            const elements: React.ReactElement[] = []
            let unitIdx = 0
            for (let i = 0; i < totalSlots; i++) {
              const x = 5 + i * slotW
              const w = slotW - 4
              if (i === lobbyIdx) {
                // Lobby
                elements.push(
                  <g key="lobby">
                    <rect x={x} y={5} width={w} height={40} fill="#06b6d420" stroke="#06b6d4" strokeWidth="1.5" />
                    <text x={x + w/2} y={28} fontSize="9" textAnchor="middle" fill="#06b6d4">로비</text>
                  </g>
                )
              } else {
                // Unit or commercial
                elements.push(
                  <g key={`gf${unitIdx}`}>
                    <rect x={x} y={5} width={w} height={40} fill={gfFill} stroke={gfColor} strokeWidth="1" />
                    <text x={x + w/2} y={28} fontSize="8" textAnchor="middle" fill={gfColor}>{gfLabel}</text>
                  </g>
                )
                unitIdx++
              }
            }
            return elements
          })()}
          
          {/* Parking */}
          <rect x="5" y="50" width="260" height="65" fill="#64748b15" stroke="#64748b" strokeWidth="1" strokeDasharray="4" />
          <text x="135" y="85" fontSize="10" textAnchor="middle" fill="#64748b">주차장</text>
          
          {/* Entrance */}
          <rect x="125" y="112" width="20" height="8" fill="#2dd4bf" />
        </g>
      )}
      
      {/* Linear Type - Upper Floors */}
      {!isGroundFloor && type === "linear" && (
        <g transform="translate(15, 40)">
          <rect x="0" y="0" width="270" height="120" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          
          {currentFloorUnits <= 8 ? (
            Array.from({ length: currentFloorUnits }, (_, i) => {
              const uw = Math.floor(260 / Math.max(currentFloorUnits, 1))
              return (
                <g key={i}>
                  <rect x={5 + i * uw} y="5" width={uw - 4} height="75" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
                  <text x={5 + i * uw + (uw - 4) / 2} y="35" fontSize="9" textAnchor="middle" fill={colors.primary}>{String.fromCharCode(65 + i)}호</text>
                  <text x={5 + i * uw + (uw - 4) / 2} y="50" fontSize="7" textAnchor="middle" fill={colors.primary}>{unitArea}㎡</text>
                </g>
              )
            })
          ) : (
            /* Compact for 9+ units */
            <>
              <rect x="5" y="5" width="80" height="75" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="45" y="35" fontSize="10" textAnchor="middle" fill={colors.primary} fontWeight="500">A호</text>
              <text x="45" y="50" fontSize="8" textAnchor="middle" fill={colors.primary}>{unitArea}㎡</text>
              <rect x="90" y="5" width="80" height="75" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="130" y="35" fontSize="10" textAnchor="middle" fill={colors.primary} fontWeight="500">B호</text>
              <text x="130" y="50" fontSize="8" textAnchor="middle" fill={colors.primary}>{unitArea}㎡</text>
              <rect x="175" y="5" width="90" height="75" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" strokeDasharray="3" />
              <text x="220" y="30" fontSize="9" textAnchor="middle" fill={colors.primary} fontWeight="600">... 외 {currentFloorUnits - 2}세대</text>
              <text x="220" y="48" fontSize="7" textAnchor="middle" fill={colors.primary}>총 {currentFloorUnits}세대</text>
              <text x="220" y="62" fontSize="7" textAnchor="middle" fill={colors.primary}>× {unitArea}㎡</text>
            </>
          )}
          
          {/* Corridor */}
          <rect x="5" y="85" width="260" height="30" fill="#64748b20" stroke="#64748b" strokeWidth="1" />
          <text x="135" y="103" fontSize="8" textAnchor="middle" fill="#64748b">복도 / 코어</text>
        </g>
      )}

      {/* Cluster Type - Ground Floor */}
      {isGroundFloor && type === "cluster" && (
        <g transform="translate(30, 20)">
          {/* Dynamic cluster ground floor */}
          {(() => {
            const gfUnits = groundFloorUnits
            const bldgAUnits = Math.ceil(gfUnits / 2)
            const bldgBUnits = gfUnits - bldgAUnits
            const elements: React.ReactElement[] = []
            // Building A
            elements.push(<rect key="bA" x="0" y="0" width="100" height="70" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />)
            const aw = Math.floor(90 / (bldgAUnits + 1)) // units + lobby
            for (let i = 0; i < bldgAUnits; i++) {
              elements.push(<g key={`a${i}`}><rect x={5 + i * aw} y={5} width={aw - 3} height={40} fill={gfFill} stroke={gfColor} strokeWidth="1" /><text x={5 + i * aw + (aw - 3) / 2} y={28} fontSize="7" textAnchor="middle" fill={gfColor}>{gfLabel}</text></g>)
            }
            elements.push(<g key="lobbyA"><rect x={5 + bldgAUnits * aw} y={5} width={aw - 3} height={40} fill="#06b6d420" stroke="#06b6d4" strokeWidth="1" /><text x={5 + bldgAUnits * aw + (aw - 3) / 2} y={28} fontSize="7" textAnchor="middle" fill="#06b6d4">로비</text></g>)
            elements.push(<rect key="parkA" x="5" y="50" width="90" height="15" fill="#64748b20" stroke="#64748b" strokeWidth="0.5" />)
            // Building B
            elements.push(<rect key="bB" x="140" y="0" width="100" height="70" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />)
            const bw = Math.floor(90 / (bldgBUnits + 1))
            for (let i = 0; i < bldgBUnits; i++) {
              elements.push(<g key={`b${i}`}><rect x={145 + i * bw} y={5} width={bw - 3} height={40} fill={gfFill} stroke={gfColor} strokeWidth="1" /><text x={145 + i * bw + (bw - 3) / 2} y={28} fontSize="7" textAnchor="middle" fill={gfColor}>{gfLabel}</text></g>)
            }
            elements.push(<g key="lobbyB"><rect x={145 + bldgBUnits * bw} y={5} width={bw - 3} height={40} fill="#06b6d420" stroke="#06b6d4" strokeWidth="1" /><text x={145 + bldgBUnits * bw + (bw - 3) / 2} y={28} fontSize="7" textAnchor="middle" fill="#06b6d4">로비</text></g>)
            elements.push(<rect key="parkB" x="145" y="50" width="90" height="15" fill="#64748b20" stroke="#64748b" strokeWidth="0.5" />)
            return elements
          })()}
          
          {/* Central Open Space */}
          <rect x="50" y="85" width="140" height="60" fill="#22c55e15" stroke="#22c55e" strokeWidth="1" strokeDasharray="4" />
          <text x="120" y="118" fontSize="9" textAnchor="middle" fill="#22c55e">중앙 정원</text>
          
          {/* Side Buildings */}
          <rect x="0" y="90" width="45" height="60" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground" />
          <rect x="195" y="90" width="45" height="60" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground" />
          
          {/* Entrance */}
          <rect x="110" y="145" width="20" height="8" fill="#2dd4bf" />
        </g>
      )}
      
      {/* Cluster Type - Upper Floors */}
      {!isGroundFloor && type === "cluster" && (
        <g transform="translate(30, 20)">
          {/* Dynamic distribution across buildings */}
          {(() => {
            const n = currentFloorUnits
            const bldgA = Math.ceil(n / 3)
            const bldgB = Math.ceil((n - bldgA) / 2)
            const sides = n - bldgA - bldgB
            const elements: React.ReactElement[] = []
            let idx = 0
            // Building A
            elements.push(<rect key="bA" x="0" y="0" width="100" height="70" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />)
            const aw = Math.floor(90 / Math.max(bldgA, 1))
            for (let i = 0; i < bldgA; i++) {
              elements.push(
                <g key={`a${i}`}>
                  <rect x={5 + i * aw} y={5} width={aw - 3} height={60} fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
                  <text x={5 + i * aw + (aw - 3) / 2} y={32} fontSize="8" textAnchor="middle" fill={colors.primary}>{String.fromCharCode(65 + idx++)}호</text>
                </g>
              )
            }
            // Building B
            elements.push(<rect key="bB" x="140" y="0" width="100" height="70" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />)
            const bw = Math.floor(90 / Math.max(bldgB, 1))
            for (let i = 0; i < bldgB; i++) {
              elements.push(
                <g key={`b${i}`}>
                  <rect x={145 + i * bw} y={5} width={bw - 3} height={60} fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
                  <text x={145 + i * bw + (bw - 3) / 2} y={32} fontSize="8" textAnchor="middle" fill={colors.primary}>{String.fromCharCode(65 + idx++)}호</text>
                </g>
              )
            }
            // Central Open Space
            elements.push(<rect key="cs" x="50" y="85" width="140" height="60" fill="#22c55e15" stroke="#22c55e" strokeWidth="1" strokeDasharray="4" />)
            elements.push(<text key="cst" x="120" y="118" fontSize="9" textAnchor="middle" fill="#22c55e">중정 공간</text>)
            // Side buildings
            if (sides >= 1) {
              elements.push(<rect key="sL" x="0" y="90" width="45" height="60" fill={colors.secondary} stroke={colors.primary} strokeWidth="2" />)
              elements.push(<text key="sLt" x="22" y="123" fontSize="8" textAnchor="middle" fill={colors.primary}>{String.fromCharCode(65 + idx++)}호</text>)
            }
            if (sides >= 2) {
              elements.push(<rect key="sR" x="195" y="90" width="45" height="60" fill={colors.secondary} stroke={colors.primary} strokeWidth="2" />)
              elements.push(<text key="sRt" x="217" y="123" fontSize="8" textAnchor="middle" fill={colors.primary}>{String.fromCharCode(65 + idx++)}호</text>)
            }
            return elements
          })()}
        </g>
      )}
      
      {/* Floor label */}
      <text x="15" y="15" fontSize="10" fill="currentColor" className="text-foreground font-medium">
        {getFloorDescription()}
      </text>
      
      {/* Strategy indicator */}
      <text x="285" y="15" fontSize="8" textAnchor="end" fill={colors.primary}>
        {strategy === "view-priority" ? "조망형" : 
         strategy === "privacy-priority" ? "프라이버시형" :
         strategy === "area-maximize" ? "면적형" :
         strategy === "parking-efficient" ? "주차형" :
         strategy === "profitability" ? "사업성형" : "실거주형"}
      </text>
    </svg>
  )
}
