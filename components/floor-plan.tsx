"use client"

import type { DesignStrategy } from "@/lib/design-strategy"

interface FloorPlanProps {
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
  floor: number
  totalFloors: number
  strategy?: DesignStrategy
}

export function FloorPlan({ type, floor, totalFloors, strategy = "profitability" }: FloorPlanProps) {
  const isGroundFloor = floor === 1
  const isBasementOrParking = floor <= 0
  const isTopFloor = floor === totalFloors
  const isLowFloor = floor <= 3
  const isMidFloor = floor > 3 && floor < totalFloors - 2
  const isHighFloor = floor >= totalFloors - 2

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
    if (isGroundFloor) return "1층 (로비/상가/주차)"
    if (floor === 2) return "2층 (저층 세대)"
    if (isTopFloor) return `${floor}층 (최상층/펜트하우스)`
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
          
          {/* Lobby */}
          <rect x="70" y="5" width="60" height="50" fill="#06b6d420" stroke="#06b6d4" strokeWidth="1.5" />
          <text x="100" y="30" fontSize="9" textAnchor="middle" fill="#06b6d4" fontWeight="500">로비</text>
          <text x="100" y="42" fontSize="7" textAnchor="middle" fill="#06b6d4">Lobby</text>
          
          {/* Elevator/Stairs Core */}
          <rect x="75" y="60" width="50" height="35" fill="#64748b40" stroke="#64748b" strokeWidth="2" />
          <rect x="80" y="65" width="18" height="25" fill="#475569" />
          <text x="89" y="80" fontSize="6" textAnchor="middle" fill="white">EV</text>
          <rect x="102" y="65" width="18" height="25" fill="#334155" />
          <text x="111" y="80" fontSize="6" textAnchor="middle" fill="white">계단</text>
          
          {/* Commercial/Amenity Spaces */}
          <rect x="5" y="5" width="60" height="50" fill="#f59e0b20" stroke="#f59e0b" strokeWidth="1" />
          <text x="35" y="28" fontSize="8" textAnchor="middle" fill="#f59e0b">상가</text>
          <text x="35" y="40" fontSize="7" textAnchor="middle" fill="#f59e0b">65㎡</text>
          
          <rect x="135" y="5" width="60" height="50" fill="#f59e0b20" stroke="#f59e0b" strokeWidth="1" />
          <text x="165" y="28" fontSize="8" textAnchor="middle" fill="#f59e0b">상가</text>
          <text x="165" y="40" fontSize="7" textAnchor="middle" fill="#f59e0b">65㎡</text>
          
          {/* Parking Area */}
          <rect x="5" y="100" width="190" height="55" fill="#64748b15" stroke="#64748b" strokeWidth="1" strokeDasharray="4" />
          <text x="100" y="125" fontSize="10" textAnchor="middle" fill="#64748b">주차장</text>
          <text x="100" y="140" fontSize="8" textAnchor="middle" fill="#64748b">10대 / 기계식</text>
          
          {/* Parking Spots */}
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={15 + i * 36} y={105} width="30" height="18" fill="#64748b30" stroke="#64748b" strokeWidth="0.5" />
          ))}
          
          {/* Entrance */}
          <rect x="90" y="155" width="20" height="8" fill="#2dd4bf" />
          <text x="100" y="175" fontSize="7" textAnchor="middle" fill="#2dd4bf">주출입구</text>
        </g>
      )}

      {/* Upper Floors - Tower Type */}
      {!isGroundFloor && type === "tower" && (
        <g transform="translate(50, 20)">
          <rect x="0" y="0" width="200" height="160" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          
          {/* Units based on strategy */}
          {strategy === "view-priority" || strategy === "privacy-priority" ? (
            // 대형 세대 2-3개
            <>
              <rect x="5" y="5" width="90" height="70" fill={colors.secondary} stroke={colors.primary} strokeWidth="1.5" />
              <text x="50" y="32" fontSize="10" textAnchor="middle" fill={colors.primary} fontWeight="500">A호</text>
              <text x="50" y="47" fontSize="8" textAnchor="middle" fill={colors.primary}>115㎡ (대형)</text>
              {/* Interior rooms */}
              <rect x="10" y="10" width="35" height="25" fill="#22c55e20" stroke="#22c55e" strokeWidth="0.5" />
              <text x="27" y="25" fontSize="6" textAnchor="middle" fill="#22c55e">주침실</text>
              <rect x="50" y="10" width="40" height="30" fill="#f59e0b20" stroke="#f59e0b" strokeWidth="0.5" />
              <text x="70" y="28" fontSize="6" textAnchor="middle" fill="#f59e0b">거실</text>
              {unitConfig.hasBalcony && (
                <rect x="5" y="60" width="85" height="12" fill="#0ea5e920" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="2" />
              )}
              
              <rect x="105" y="5" width="90" height="70" fill={colors.secondary} stroke={colors.primary} strokeWidth="1.5" />
              <text x="150" y="32" fontSize="10" textAnchor="middle" fill={colors.primary} fontWeight="500">B호</text>
              <text x="150" y="47" fontSize="8" textAnchor="middle" fill={colors.primary}>115㎡ (대형)</text>
              {unitConfig.hasBalcony && (
                <rect x="110" y="60" width="80" height="12" fill="#0ea5e920" stroke="#0ea5e9" strokeWidth="0.5" strokeDasharray="2" />
              )}
            </>
          ) : strategy === "area-maximize" || strategy === "profitability" ? (
            // 소형 세대 많이
            <>
              <rect x="5" y="5" width="60" height="50" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="35" y="25" fontSize="9" textAnchor="middle" fill={colors.primary}>A호</text>
              <text x="35" y="38" fontSize="7" textAnchor="middle" fill={colors.primary}>59㎡</text>
              
              <rect x="70" y="5" width="60" height="50" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="100" y="25" fontSize="9" textAnchor="middle" fill={colors.primary}>B호</text>
              <text x="100" y="38" fontSize="7" textAnchor="middle" fill={colors.primary}>59㎡</text>
              
              <rect x="135" y="5" width="60" height="50" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="165" y="25" fontSize="9" textAnchor="middle" fill={colors.primary}>C호</text>
              <text x="165" y="38" fontSize="7" textAnchor="middle" fill={colors.primary}>59㎡</text>
              
              <rect x="5" y="95" width="60" height="50" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="35" y="115" fontSize="9" textAnchor="middle" fill={colors.primary}>D호</text>
              <text x="35" y="128" fontSize="7" textAnchor="middle" fill={colors.primary}>59㎡</text>
              
              <rect x="70" y="95" width="60" height="50" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="100" y="115" fontSize="9" textAnchor="middle" fill={colors.primary}>E호</text>
              <text x="100" y="128" fontSize="7" textAnchor="middle" fill={colors.primary}>59㎡</text>
              
              <rect x="135" y="95" width="60" height="50" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="165" y="115" fontSize="9" textAnchor="middle" fill={colors.primary}>F호</text>
              <text x="165" y="128" fontSize="7" textAnchor="middle" fill={colors.primary}>59㎡</text>
            </>
          ) : (
            // 중형 세대 4개 (기본)
            <>
              <rect x="5" y="5" width="90" height="70" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="50" y="32" fontSize="10" textAnchor="middle" fill={colors.primary}>A호</text>
              <text x="50" y="47" fontSize="8" textAnchor="middle" fill={colors.primary}>84㎡</text>
              
              <rect x="105" y="5" width="90" height="70" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="150" y="32" fontSize="10" textAnchor="middle" fill={colors.primary}>B호</text>
              <text x="150" y="47" fontSize="8" textAnchor="middle" fill={colors.primary}>84㎡</text>
              
              <rect x="5" y="85" width="90" height="70" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="50" y="115" fontSize="10" textAnchor="middle" fill={colors.primary}>C호</text>
              <text x="50" y="130" fontSize="8" textAnchor="middle" fill={colors.primary}>84㎡</text>
              
              <rect x="105" y="85" width="90" height="70" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x="150" y="115" fontSize="10" textAnchor="middle" fill={colors.primary}>D호</text>
              <text x="150" y="130" fontSize="8" textAnchor="middle" fill={colors.primary}>84㎡</text>
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
          
          {/* Main Entrance/Lobby */}
          <rect x="95" y="5" width="50" height="35" fill="#06b6d420" stroke="#06b6d4" strokeWidth="1.5" />
          <text x="120" y="25" fontSize="8" textAnchor="middle" fill="#06b6d4">로비</text>
          
          {/* Commercial Spaces */}
          <rect x="5" y="5" width="85" height="35" fill="#f59e0b20" stroke="#f59e0b" strokeWidth="1" />
          <text x="47" y="25" fontSize="8" textAnchor="middle" fill="#f59e0b">상가 A</text>
          
          <rect x="150" y="5" width="85" height="35" fill="#f59e0b20" stroke="#f59e0b" strokeWidth="1" />
          <text x="192" y="25" fontSize="8" textAnchor="middle" fill="#f59e0b">상가 B</text>
          
          {/* Central Courtyard */}
          <rect x="50" y="50" width="140" height="70" fill="#22c55e15" stroke="#22c55e" strokeWidth="1" />
          <text x="120" y="85" fontSize="10" textAnchor="middle" fill="#22c55e">중정 / 조경</text>
          <text x="120" y="100" fontSize="7" textAnchor="middle" fill="#22c55e">커뮤니티 공간</text>
          
          {/* Side Corridors with Parking */}
          <rect x="5" y="45" width="40" height="80" fill="#64748b15" stroke="#64748b" strokeWidth="1" strokeDasharray="3" />
          <text x="25" y="88" fontSize="6" textAnchor="middle" fill="#64748b" transform="rotate(-90, 25, 85)">주차/복도</text>
          
          <rect x="195" y="45" width="40" height="80" fill="#64748b15" stroke="#64748b" strokeWidth="1" strokeDasharray="3" />
          
          {/* Lower Units - Ground Floor Amenities */}
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
          
          {/* Top wing units */}
          <rect x="5" y="5" width="70" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="40" y="22" fontSize="9" textAnchor="middle" fill={colors.primary}>A호</text>
          <text x="40" y="35" fontSize="7" textAnchor="middle" fill={colors.primary}>{unitConfig.unitSize === "대형" ? "115㎡" : unitConfig.unitSize === "소형" ? "59㎡" : "84㎡"}</text>
          
          <rect x="85" y="5" width="70" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="120" y="22" fontSize="9" textAnchor="middle" fill={colors.primary}>B호</text>
          <text x="120" y="35" fontSize="7" textAnchor="middle" fill={colors.primary}>{unitConfig.unitSize === "대형" ? "115㎡" : unitConfig.unitSize === "소형" ? "59㎡" : "84㎡"}</text>
          
          <rect x="165" y="5" width="70" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="200" y="22" fontSize="9" textAnchor="middle" fill={colors.primary}>C호</text>
          <text x="200" y="35" fontSize="7" textAnchor="middle" fill={colors.primary}>{unitConfig.unitSize === "대형" ? "115㎡" : unitConfig.unitSize === "소형" ? "59㎡" : "84㎡"}</text>
          
          {/* Courtyard */}
          <rect x="50" y="50" width="140" height="70" fill="#22c55e15" stroke="#22c55e" strokeWidth="1" strokeDasharray="4" />
          <text x="120" y="90" fontSize="10" textAnchor="middle" fill="#22c55e">중정</text>
          
          {/* Side corridors */}
          <rect x="5" y="50" width="40" height="70" fill="#64748b20" stroke="#64748b" strokeWidth="1" />
          <text x="25" y="90" fontSize="7" textAnchor="middle" fill="#64748b" transform="rotate(-90, 25, 85)">복도</text>
          <rect x="195" y="50" width="40" height="70" fill="#64748b20" stroke="#64748b" strokeWidth="1" />
          
          {/* Bottom wing units */}
          <rect x="5" y="125" width="70" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="40" y="142" fontSize="9" textAnchor="middle" fill={colors.primary}>D호</text>
          <text x="40" y="155" fontSize="7" textAnchor="middle" fill={colors.primary}>{unitConfig.unitSize === "대형" ? "115㎡" : unitConfig.unitSize === "소형" ? "59㎡" : "84㎡"}</text>
          
          <rect x="85" y="125" width="70" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="120" y="142" fontSize="9" textAnchor="middle" fill={colors.primary}>E호</text>
          <text x="120" y="155" fontSize="7" textAnchor="middle" fill={colors.primary}>{unitConfig.unitSize === "대형" ? "115㎡" : unitConfig.unitSize === "소형" ? "59㎡" : "84㎡"}</text>
          
          <rect x="165" y="125" width="70" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="200" y="142" fontSize="9" textAnchor="middle" fill={colors.primary}>F호</text>
          <text x="200" y="155" fontSize="7" textAnchor="middle" fill={colors.primary}>{unitConfig.unitSize === "대형" ? "115㎡" : unitConfig.unitSize === "소형" ? "59㎡" : "84㎡"}</text>
        </g>
      )}
      
      {/* Ground Floor - L-Shape Type */}
      {isGroundFloor && type === "lshape" && (
        <g transform="translate(25, 10)">
          {/* Vertical wing */}
          <rect x="0" y="0" width="80" height="140" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          {/* Horizontal wing */}
          <rect x="0" y="140" width="250" height="50" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          
          {/* Lobby in corner */}
          <rect x="5" y="100" width="70" height="35" fill="#06b6d420" stroke="#06b6d4" strokeWidth="1.5" />
          <text x="40" y="120" fontSize="9" textAnchor="middle" fill="#06b6d4">로비</text>
          
          {/* Commercial in vertical wing */}
          <rect x="5" y="5" width="70" height="40" fill="#f59e0b20" stroke="#f59e0b" strokeWidth="1" />
          <text x="40" y="28" fontSize="8" textAnchor="middle" fill="#f59e0b">상가</text>
          
          <rect x="5" y="50" width="70" height="45" fill="#f59e0b20" stroke="#f59e0b" strokeWidth="1" />
          <text x="40" y="75" fontSize="8" textAnchor="middle" fill="#f59e0b">상가</text>
          
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
          
          {/* Vertical wing units */}
          <rect x="5" y="5" width="70" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="40" y="22" fontSize="9" textAnchor="middle" fill={colors.primary}>A호</text>
          <text x="40" y="35" fontSize="7" textAnchor="middle" fill={colors.primary}>{unitConfig.unitSize === "대형" ? "115㎡" : unitConfig.unitSize === "소형" ? "59㎡" : "84㎡"}</text>
          
          <rect x="5" y="50" width="70" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="40" y="67" fontSize="9" textAnchor="middle" fill={colors.primary}>B호</text>
          <text x="40" y="80" fontSize="7" textAnchor="middle" fill={colors.primary}>{unitConfig.unitSize === "대형" ? "115㎡" : unitConfig.unitSize === "소형" ? "59㎡" : "84㎡"}</text>
          
          <rect x="5" y="95" width="70" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="40" y="112" fontSize="9" textAnchor="middle" fill={colors.primary}>C호</text>
          <text x="40" y="125" fontSize="7" textAnchor="middle" fill={colors.primary}>{unitConfig.unitSize === "대형" ? "115㎡" : unitConfig.unitSize === "소형" ? "59㎡" : "84㎡"}</text>
          
          {/* Core at corner */}
          <rect x="5" y="145" width="40" height="40" fill="#64748b40" stroke="#64748b" strokeWidth="2" />
          <text x="25" y="168" fontSize="7" textAnchor="middle" fill="#64748b">코어</text>
          
          {/* Horizontal wing units */}
          <rect x="50" y="145" width="60" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="80" y="162" fontSize="9" textAnchor="middle" fill={colors.primary}>D호</text>
          <text x="80" y="175" fontSize="7" textAnchor="middle" fill={colors.primary}>{unitConfig.unitSize === "대형" ? "115㎡" : unitConfig.unitSize === "소형" ? "59㎡" : "84㎡"}</text>
          
          <rect x="115" y="145" width="60" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="145" y="162" fontSize="9" textAnchor="middle" fill={colors.primary}>E호</text>
          <text x="145" y="175" fontSize="7" textAnchor="middle" fill={colors.primary}>{unitConfig.unitSize === "대형" ? "115㎡" : unitConfig.unitSize === "소형" ? "59㎡" : "84㎡"}</text>
          
          <rect x="180" y="145" width="65" height="40" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="212" y="162" fontSize="9" textAnchor="middle" fill={colors.primary}>F호</text>
          <text x="212" y="175" fontSize="7" textAnchor="middle" fill={colors.primary}>{unitConfig.unitSize === "대형" ? "115㎡" : unitConfig.unitSize === "소형" ? "59㎡" : "84㎡"}</text>
        </g>
      )}

      {/* Linear Type - Ground Floor */}
      {isGroundFloor && type === "linear" && (
        <g transform="translate(15, 40)">
          <rect x="0" y="0" width="270" height="120" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          
          {/* Lobby */}
          <rect x="110" y="5" width="50" height="40" fill="#06b6d420" stroke="#06b6d4" strokeWidth="1.5" />
          <text x="135" y="28" fontSize="9" textAnchor="middle" fill="#06b6d4">로비</text>
          
          {/* Commercial */}
          <rect x="5" y="5" width="100" height="40" fill="#f59e0b20" stroke="#f59e0b" strokeWidth="1" />
          <text x="55" y="28" fontSize="8" textAnchor="middle" fill="#f59e0b">상가</text>
          
          <rect x="165" y="5" width="100" height="40" fill="#f59e0b20" stroke="#f59e0b" strokeWidth="1" />
          <text x="215" y="28" fontSize="8" textAnchor="middle" fill="#f59e0b">상가</text>
          
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
          
          {/* Units in a row */}
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect x={5 + i * 52} y="5" width="50" height="75" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
              <text x={30 + i * 52} y="35" fontSize="9" textAnchor="middle" fill={colors.primary}>{String.fromCharCode(65 + i)}호</text>
              <text x={30 + i * 52} y="50" fontSize="7" textAnchor="middle" fill={colors.primary}>{unitConfig.unitSize === "대형" ? "115㎡" : unitConfig.unitSize === "소형" ? "59㎡" : "84㎡"}</text>
            </g>
          ))}
          
          {/* Corridor */}
          <rect x="5" y="85" width="260" height="30" fill="#64748b20" stroke="#64748b" strokeWidth="1" />
          <text x="135" y="103" fontSize="8" textAnchor="middle" fill="#64748b">복도 / 코어</text>
        </g>
      )}

      {/* Cluster Type - Ground Floor */}
      {isGroundFloor && type === "cluster" && (
        <g transform="translate(30, 20)">
          {/* Building A */}
          <rect x="0" y="0" width="100" height="70" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          <rect x="5" y="5" width="90" height="40" fill="#f59e0b20" stroke="#f59e0b" strokeWidth="1" />
          <text x="50" y="28" fontSize="8" textAnchor="middle" fill="#f59e0b">상가/로비 A</text>
          <rect x="5" y="50" width="90" height="15" fill="#64748b20" stroke="#64748b" strokeWidth="0.5" />
          <text x="50" y="60" fontSize="6" textAnchor="middle" fill="#64748b">주차</text>
          
          {/* Building B */}
          <rect x="140" y="0" width="100" height="70" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          <rect x="145" y="5" width="90" height="40" fill="#f59e0b20" stroke="#f59e0b" strokeWidth="1" />
          <text x="190" y="28" fontSize="8" textAnchor="middle" fill="#f59e0b">상가/로비 B</text>
          <rect x="145" y="50" width="90" height="15" fill="#64748b20" stroke="#64748b" strokeWidth="0.5" />
          
          {/* Central Open Space */}
          <rect x="50" y="85" width="140" height="60" fill="#22c55e15" stroke="#22c55e" strokeWidth="1" strokeDasharray="4" />
          <text x="120" y="118" fontSize="9" textAnchor="middle" fill="#22c55e">중앙 정원</text>
          
          {/* Building C */}
          <rect x="0" y="90" width="45" height="60" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground" />
          <rect x="195" y="90" width="45" height="60" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground" />
          
          {/* Entrance */}
          <rect x="110" y="145" width="20" height="8" fill="#2dd4bf" />
        </g>
      )}
      
      {/* Cluster Type - Upper Floors */}
      {!isGroundFloor && type === "cluster" && (
        <g transform="translate(30, 20)">
          {/* Building A */}
          <rect x="0" y="0" width="100" height="70" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          <rect x="5" y="5" width="42" height="60" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="26" y="32" fontSize="8" textAnchor="middle" fill={colors.primary}>A호</text>
          <rect x="52" y="5" width="42" height="60" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="73" y="32" fontSize="8" textAnchor="middle" fill={colors.primary}>B호</text>
          
          {/* Building B */}
          <rect x="140" y="0" width="100" height="70" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground" />
          <rect x="145" y="5" width="42" height="60" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="166" y="32" fontSize="8" textAnchor="middle" fill={colors.primary}>C호</text>
          <rect x="192" y="5" width="42" height="60" fill={colors.secondary} stroke={colors.primary} strokeWidth="1" />
          <text x="213" y="32" fontSize="8" textAnchor="middle" fill={colors.primary}>D호</text>
          
          {/* Central Open Space */}
          <rect x="50" y="85" width="140" height="60" fill="#22c55e15" stroke="#22c55e" strokeWidth="1" strokeDasharray="4" />
          <text x="120" y="118" fontSize="9" textAnchor="middle" fill="#22c55e">중정 공간</text>
          
          {/* Side Buildings */}
          <rect x="0" y="90" width="45" height="60" fill={colors.secondary} stroke={colors.primary} strokeWidth="2" />
          <text x="22" y="123" fontSize="8" textAnchor="middle" fill={colors.primary}>E호</text>
          
          <rect x="195" y="90" width="45" height="60" fill={colors.secondary} stroke={colors.primary} strokeWidth="2" />
          <text x="217" y="123" fontSize="8" textAnchor="middle" fill={colors.primary}>F호</text>
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
