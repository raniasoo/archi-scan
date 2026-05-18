/**
 * Phase 7: IFC 2x3 내보내기
 * 
 * 간이 IFC 파일 생성 — Revit/ArchiCAD에서 열기 가능
 * ISO 10303-21 (STEP) 형식
 * 
 * 포함 요소:
 *   IfcProject → IfcSite → IfcBuilding → IfcBuildingStorey
 *   → IfcSpace (각 방) + IfcWallStandardCase (벽체)
 */

import type { StructuralGrid, Room } from './structural-grid'
import type { StructuralCalc } from './structural-calc'

let entityId = 100

function nextId(): number { return entityId++ }

function ifcStr(s: string): string { return `'${s.replace(/'/g, "''")}'` }
function ifcReal(n: number): string { return n.toFixed(6) }
function ifcPoint(x: number, y: number, z: number): string {
  const id = nextId()
  return `#${id}=IFCCARTESIANPOINT((${ifcReal(x)},${ifcReal(y)},${ifcReal(z)}));\n`
}

export function generateIFC(params: {
  grid: StructuralGrid
  calc: StructuralCalc
  floors: number
  floorHeight: number
  projectName: string
  address: string
}): string {
  const { grid, calc, floors, floorHeight, projectName, address } = params
  entityId = 100
  
  const bayW = grid.bayWidthM
  const bayD = grid.bayDepthM
  const totalW = grid.totalWidthM
  const totalD = grid.totalDepthM
  
  // ━━━ HEADER ━━━
  let ifc = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('${projectName}.ifc','${new Date().toISOString()}',('Archi-Scan'),('Archi-Scan AI'),'IFC2X3','Archi-Scan','');
FILE_SCHEMA(('IFC2X3'));
ENDSEC;
DATA;
`

  // ━━━ 기본 엔티티 ━━━
  const personId = nextId()
  ifc += `#${personId}=IFCPERSON($,$,${ifcStr('Archi-Scan')},$,$,$,$,$);\n`
  
  const orgId = nextId()
  ifc += `#${orgId}=IFCORGANIZATION($,${ifcStr('Archi-Scan AI')},$,$,$);\n`
  
  const personOrgId = nextId()
  ifc += `#${personOrgId}=IFCPERSONANDORGANIZATION(#${personId},#${orgId},$);\n`
  
  const appId = nextId()
  ifc += `#${appId}=IFCAPPLICATION(#${orgId},${ifcStr('1.0')},${ifcStr('Archi-Scan')},${ifcStr('ArchScan')});\n`
  
  const ownerHistId = nextId()
  ifc += `#${ownerHistId}=IFCOWNERHISTORY(#${personOrgId},#${appId},$,.NOCHANGE.,$,#${personOrgId},#${appId},${Math.floor(Date.now() / 1000)});\n`
  
  // 단위
  const dimExpId = nextId()
  ifc += `#${dimExpId}=IFCDIMENSIONALEXPONENTS(0,0,0,0,0,0,0);\n`
  
  const siLenId = nextId()
  ifc += `#${siLenId}=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);\n`
  const siAreaId = nextId()
  ifc += `#${siAreaId}=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);\n`
  const siVolId = nextId()
  ifc += `#${siVolId}=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);\n`
  const siAngId = nextId()
  ifc += `#${siAngId}=IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.);\n`
  
  const unitsId = nextId()
  ifc += `#${unitsId}=IFCUNITASSIGNMENT((#${siLenId},#${siAreaId},#${siVolId},#${siAngId}));\n`
  
  // 좌표계
  const originPtId = nextId()
  ifc += `#${originPtId}=IFCCARTESIANPOINT((0.,0.,0.));\n`
  const dirZId = nextId()
  ifc += `#${dirZId}=IFCDIRECTION((0.,0.,1.));\n`
  const dirXId = nextId()
  ifc += `#${dirXId}=IFCDIRECTION((1.,0.,0.));\n`
  const axis2Id = nextId()
  ifc += `#${axis2Id}=IFCAXIS2PLACEMENT3D(#${originPtId},#${dirZId},#${dirXId});\n`
  
  const contextId = nextId()
  ifc += `#${contextId}=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-5,#${axis2Id},$);\n`
  
  // ━━━ PROJECT ━━━
  const projId = nextId()
  ifc += `#${projId}=IFCPROJECT('${generateGuid()}',#${ownerHistId},${ifcStr(projectName)},$,$,$,$,(#${contextId}),#${unitsId});\n`
  
  // ━━━ SITE ━━━
  const sitePlaceId = nextId()
  ifc += `#${sitePlaceId}=IFCLOCALPLACEMENT($,#${axis2Id});\n`
  const siteId = nextId()
  ifc += `#${siteId}=IFCSITE('${generateGuid()}',#${ownerHistId},${ifcStr(address)},$,$,#${sitePlaceId},$,$,.ELEMENT.,$,$,$,$,$);\n`
  
  // ━━━ BUILDING ━━━
  const bldPlaceId = nextId()
  ifc += `#${bldPlaceId}=IFCLOCALPLACEMENT(#${sitePlaceId},#${axis2Id});\n`
  const bldId = nextId()
  ifc += `#${bldId}=IFCBUILDING('${generateGuid()}',#${ownerHistId},${ifcStr(projectName)},$,$,#${bldPlaceId},$,$,.ELEMENT.,$,$,$);\n`
  
  // ━━━ STORIES + SPACES ━━━
  const storeyIds: number[] = []
  
  for (let f = 0; f < floors; f++) {
    const elevation = f * floorHeight
    
    // Storey placement
    const stPtId = nextId()
    ifc += `#${stPtId}=IFCCARTESIANPOINT((0.,0.,${ifcReal(elevation)}));\n`
    const stAxisId = nextId()
    ifc += `#${stAxisId}=IFCAXIS2PLACEMENT3D(#${stPtId},#${dirZId},#${dirXId});\n`
    const stPlaceId = nextId()
    ifc += `#${stPlaceId}=IFCLOCALPLACEMENT(#${bldPlaceId},#${stAxisId});\n`
    
    const storeyId = nextId()
    ifc += `#${storeyId}=IFCBUILDINGSTOREY('${generateGuid()}',#${ownerHistId},${ifcStr(`${f + 1}F`)},$,$,#${stPlaceId},$,$,.ELEMENT.,${ifcReal(elevation)});\n`
    storeyIds.push(storeyId)
    
    // Spaces (각 방)
    const spaceIds: number[] = []
    for (const room of grid.rooms) {
      const rx = room.gridX * bayW
      const ry = room.gridY * bayD
      const rw = room.spanX * bayW
      const rd = room.spanY * bayD
      
      const spPtId = nextId()
      ifc += `#${spPtId}=IFCCARTESIANPOINT((${ifcReal(rx)},${ifcReal(ry)},0.));\n`
      const spAxisId = nextId()
      ifc += `#${spAxisId}=IFCAXIS2PLACEMENT3D(#${spPtId},#${dirZId},#${dirXId});\n`
      const spPlaceId = nextId()
      ifc += `#${spPlaceId}=IFCLOCALPLACEMENT(#${stPlaceId},#${spAxisId});\n`
      
      const spaceId = nextId()
      ifc += `#${spaceId}=IFCSPACE('${generateGuid()}',#${ownerHistId},${ifcStr(room.label)},$,$,#${spPlaceId},$,$,.ELEMENT.,.INTERNAL.,$);\n`
      spaceIds.push(spaceId)
    }
    
    // Storey → Spaces 관계
    if (spaceIds.length > 0) {
      const relId = nextId()
      ifc += `#${relId}=IFCRELAGGREGATES('${generateGuid()}',#${ownerHistId},$,$,#${storeyId},(${spaceIds.map(id => `#${id}`).join(',')}));\n`
    }
  }
  
  // Building → Storeys 관계
  if (storeyIds.length > 0) {
    const relBldId = nextId()
    ifc += `#${relBldId}=IFCRELAGGREGATES('${generateGuid()}',#${ownerHistId},$,$,#${bldId},(${storeyIds.map(id => `#${id}`).join(',')}));\n`
  }
  
  // Site → Building 관계
  const relSiteId = nextId()
  ifc += `#${relSiteId}=IFCRELAGGREGATES('${generateGuid()}',#${ownerHistId},$,$,#${siteId},(#${bldId}));\n`
  
  // Project → Site 관계
  const relProjId = nextId()
  ifc += `#${relProjId}=IFCRELAGGREGATES('${generateGuid()}',#${ownerHistId},$,$,#${projId},(#${siteId}));\n`
  
  // ━━━ 속성 세트: 구조 계산 결과 ━━━
  const propVals: number[] = []
  
  const pFck = nextId()
  ifc += `#${pFck}=IFCPROPERTYSINGLEVALUE(${ifcStr('Fck')},$,IFCPRESSUREMEASURE(${calc.summary.fck * 1e6}),$);\n`
  propVals.push(pFck)
  
  const pFy = nextId()
  ifc += `#${pFy}=IFCPROPERTYSINGLEVALUE(${ifcStr('Fy')},$,IFCPRESSUREMEASURE(${calc.summary.fy * 1e6}),$);\n`
  propVals.push(pFy)
  
  const pWeight = nextId()
  ifc += `#${pWeight}=IFCPROPERTYSINGLEVALUE(${ifcStr('TotalWeight')},$,IFCMASSMEASURE(${Math.round(calc.summary.totalWeight * 100)}),$);\n`
  propVals.push(pWeight)
  
  const pSetId = nextId()
  ifc += `#${pSetId}=IFCPROPERTYSET('${generateGuid()}',#${ownerHistId},${ifcStr('Pset_StructuralDesign')},$,(${propVals.map(id => `#${id}`).join(',')}));\n`
  
  const relPropId = nextId()
  ifc += `#${relPropId}=IFCRELDEFINESBYPROPERTIES('${generateGuid()}',#${ownerHistId},$,$,(#${bldId}),#${pSetId});\n`
  
  ifc += `ENDSEC;
END-ISO-10303-21;
`
  
  return ifc
}

// 간이 GUID 생성 (IFC 22자 Base64)
function generateGuid(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$'
  let result = ''
  for (let i = 0; i < 22; i++) {
    result += chars[Math.floor(Math.random() * 64)]
  }
  return result
}

// ━━━ IFC 다운로드 ━━━
export function downloadIFC(ifcContent: string, filename: string): void {
  const blob = new Blob([ifcContent], { type: 'application/x-step' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
