"use client"
import { getBuildingDimensionsInMeters } from "@/lib/building-geometry"

interface BuildingFootprintProps {
  type: "tower" | "courtyard" | "lshape" | "linear" | "cluster"
  siteArea: number
  coverage: number
  isSelected?: boolean
}

export function BuildingFootprint({ type, siteArea, coverage, isSelected }: BuildingFootprintProps) {
  const buildingColor = isSelected ? "#2dd4bf" : "#3b82f6"
  const buildingColorLight = isSelected ? "#2dd4bf40" : "#3b82f640"
  
  // Calculate dimensions based on site area
  const siteSide = Math.sqrt(siteArea)
  const scale = 200 / siteSide
  
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full">
      {/* Grid pattern */}
      <defs>
        <pattern id={`grid-${type}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border" />
        </pattern>
      </defs>
      
      {/* Site boundary */}
      <rect 
        x="10" 
        y="10" 
        width="180" 
        height="180" 
        fill={`url(#grid-${type})`}
        stroke="currentColor" 
        strokeWidth="2" 
        strokeDasharray="4 2"
        className="text-muted-foreground"
      />
      
      {/* Building footprints based on type */}
      {type === "tower" && (
        <>
          {/* Main tower */}
          <rect x="60" y="40" width="80" height="80" fill={buildingColor} rx="4" />
          <rect x="65" y="45" width="70" height="70" fill={buildingColorLight} rx="2" />
          {/* Core */}
          <rect x="85" y="65" width="30" height="30" fill="#1e293b" rx="2" />
          {/* Entrance */}
          <rect x="90" y="120" width="20" height="15" fill={buildingColor} />
          {/* Landscaping */}
          <circle cx="40" cy="160" r="15" fill="#22c55e" opacity="0.3" />
          <circle cx="160" cy="160" r="12" fill="#22c55e" opacity="0.3" />
          <circle cx="40" cy="60" r="10" fill="#22c55e" opacity="0.3" />
        </>
      )}
      
      {type === "courtyard" && (
        <>
          {/* Top wing */}
          <rect x="30" y="25" width="140" height="30" fill={buildingColor} rx="4" />
          {/* Left wing */}
          <rect x="30" y="25" width="30" height="120" fill={buildingColor} rx="4" />
          {/* Right wing */}
          <rect x="140" y="25" width="30" height="120" fill={buildingColor} rx="4" />
          {/* Bottom wing */}
          <rect x="30" y="145" width="140" height="30" fill={buildingColor} rx="4" />
          {/* Central courtyard */}
          <rect x="60" y="55" width="80" height="90" fill="#22c55e" opacity="0.2" rx="4" />
          <circle cx="100" cy="100" r="20" fill="#22c55e" opacity="0.3" />
          {/* Inner details */}
          <rect x="35" y="30" width="20" height="20" fill={buildingColorLight} rx="2" />
          <rect x="145" y="30" width="20" height="20" fill={buildingColorLight} rx="2" />
        </>
      )}
      
      {type === "lshape" && (
        <>
          {/* Vertical wing */}
          <rect x="30" y="25" width="45" height="150" fill={buildingColor} rx="4" />
          {/* Horizontal wing */}
          <rect x="30" y="130" width="140" height="45" fill={buildingColor} rx="4" />
          {/* Inner detail */}
          <rect x="35" y="30" width="35" height="95" fill={buildingColorLight} rx="2" />
          <rect x="80" y="135" width="85" height="35" fill={buildingColorLight} rx="2" />
          {/* Open space */}
          <rect x="80" y="30" width="85" height="95" fill="#22c55e" opacity="0.15" rx="4" />
          {/* Landscaping */}
          <circle cx="120" cy="75" r="18" fill="#22c55e" opacity="0.3" />
          <circle cx="145" cy="95" r="12" fill="#22c55e" opacity="0.25" />
        </>
      )}

      {type === "linear" && (
        <>
          {/* Main linear building */}
          <rect x="20" y="70" width="160" height="60" fill={buildingColor} rx="4" />
          <rect x="25" y="75" width="150" height="50" fill={buildingColorLight} rx="2" />
          {/* Unit divisions */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line 
              key={i} 
              x1={50 + i * 30} 
              y1="75" 
              x2={50 + i * 30} 
              y2="125" 
              stroke={buildingColor} 
              strokeWidth="1" 
              opacity="0.5"
            />
          ))}
          {/* Core */}
          <rect x="90" y="80" width="20" height="40" fill="#1e293b" rx="2" />
          {/* Entrance */}
          <rect x="93" y="130" width="14" height="10" fill={buildingColor} />
          {/* Landscaping - front and back */}
          <rect x="20" y="145" width="160" height="25" fill="#22c55e" opacity="0.15" rx="4" />
          <rect x="20" y="30" width="160" height="35" fill="#22c55e" opacity="0.15" rx="4" />
          <circle cx="50" cy="50" r="10" fill="#22c55e" opacity="0.3" />
          <circle cx="100" cy="160" r="12" fill="#22c55e" opacity="0.3" />
          <circle cx="150" cy="50" r="10" fill="#22c55e" opacity="0.3" />
        </>
      )}

      {type === "cluster" && (
        <>
          {/* Building A - top left */}
          <rect x="25" y="25" width="55" height="55" fill={buildingColor} rx="4" />
          <rect x="30" y="30" width="45" height="45" fill={buildingColorLight} rx="2" />
          {/* Building B - top right */}
          <rect x="120" y="25" width="55" height="55" fill={buildingColor} rx="4" />
          <rect x="125" y="30" width="45" height="45" fill={buildingColorLight} rx="2" />
          {/* Building C - bottom left */}
          <rect x="25" y="120" width="55" height="55" fill={buildingColor} rx="4" />
          <rect x="30" y="125" width="45" height="45" fill={buildingColorLight} rx="2" />
          {/* Building D - bottom right */}
          <rect x="120" y="120" width="55" height="55" fill={buildingColor} rx="4" />
          <rect x="125" y="125" width="45" height="45" fill={buildingColorLight} rx="2" />
          {/* Central garden/courtyard */}
          <rect x="85" y="85" width="30" height="30" fill="#22c55e" opacity="0.3" rx="15" />
          {/* Connecting pathways */}
          <rect x="80" y="50" width="40" height="8" fill="#64748b" opacity="0.2" rx="2" />
          <rect x="80" y="142" width="40" height="8" fill="#64748b" opacity="0.2" rx="2" />
          <rect x="50" y="85" width="8" height="30" fill="#64748b" opacity="0.2" rx="2" />
          <rect x="142" y="85" width="8" height="30" fill="#64748b" opacity="0.2" rx="2" />
          {/* Garden spaces between buildings */}
          <circle cx="100" cy="100" r="10" fill="#22c55e" opacity="0.4" />
        </>
      )}
      
      {/* North arrow */}
      <g transform="translate(175, 25)">
        <polygon points="0,-10 5,5 0,0 -5,5" fill="currentColor" className="text-muted-foreground" />
        <text x="0" y="15" fontSize="8" textAnchor="middle" fill="currentColor" className="text-muted-foreground">N</text>
      </g>
      
      {/* Scale indicator */}
      <g transform="translate(20, 190)">
        <line x1="0" y1="0" x2="40" y2="0" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
        <line x1="0" y1="-3" x2="0" y2="3" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
        <line x1="40" y1="-3" x2="40" y2="3" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
        <text x="20" y="12" fontSize="7" textAnchor="middle" fill="currentColor" className="text-muted-foreground">
          {Math.round(40 / scale)}m
        </text>
      </g>
    </svg>
  )
}
