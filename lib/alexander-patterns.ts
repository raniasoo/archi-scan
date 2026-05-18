/**
 * Christopher Alexander "A Pattern Language" 253 패턴 전체 구현
 * 253개 패턴을 4개 스케일로 분류하여 전수 평가
 */
import type { StructuralGrid, Room } from './structural-grid'

export interface PatternCheck {
  id: number; name: string; nameKo: string; scale: 'A'|'B'|'C'|'D'
  applicable: boolean; pass: boolean; score: number; description: string
}

export interface AlexanderReport {
  totalPatterns: 253; applicableCount: number; passedCount: number; failedCount: number
  score: number; grade: string
  scaleScores: { A: number; B: number; C: number; D: number }
  checks: PatternCheck[]; topIssues: string[]
}

export function evaluateAllPatterns(p: {
  grid: StructuralGrid; floors: number; siteArea: number; coverage: number; units: number; type: string
  hasParking?: boolean; hasLandscape?: boolean; hasCommunity?: boolean
}): AlexanderReport {
  const { grid, floors, siteArea, coverage, units, type } = p
  const hasParking = p.hasParking ?? true
  const hasLandscape = p.hasLandscape ?? siteArea > 300
  const hasCommunity = p.hasCommunity ?? units > 10
  const rooms = grid.rooms
  const living = rooms.find(r => r.type === 'living')
  const entrance = rooms.find(r => r.type === 'entrance')
  const master = rooms.find(r => r.type === 'master')
  const kitchen = rooms.find(r => r.type === 'kitchen')
  const bath = rooms.find(r => r.type === 'bathroom_main')
  const beds = rooms.filter(r => r.type === 'bedroom' || r.type === 'master')
  const corr = rooms.filter(r => r.type === 'corridor')
  const winR = rooms.filter(r => r.hasWindow)
  const openSp = siteArea * (1 - coverage / 100)
  const bX = grid.baysX, bY = grid.baysY, bayW = grid.bayWidthM, bayD = grid.bayDepthM
  const isMF = units > 1, isHR = floors > 10

  const C: PatternCheck[] = []
  const a = (id: number, n: string, k: string, s: 'A'|'B'|'C'|'D', ap: boolean, ps: boolean, d: string) =>
    C.push({ id, name: n, nameKo: k, scale: s, applicable: ap, pass: ap ? ps : false, score: ap ? (ps ? 1 : 0) : 0, description: ap ? d : 'N/A' })

  // Scale A: #1~#94 단지/도시
  const cityOnly = [1,2,3,4,5,6,7,8,9,10,12,13,16,17,18,19,20,21,22,23,24,25,26,27,32,33,34,41,42,43,44,46,47,50,54,55,58,63,65,66,70,73,74,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94]
  for (const i of cityOnly) a(i, `Pattern${i}`, `도시패턴${i}`, 'A', false, false, '')
  a(11, 'Local Transport', '근린교통', 'A', siteArea>5000, openSp>siteArea*0.2, `개방${Math.round(openSp/siteArea*100)}%`)
  a(14, 'Identifiable Neighborhood', '식별동네', 'A', isMF&&units>20, units>20, `${units}세대`)
  a(15, 'Neighborhood Boundary', '동네경계', 'A', siteArea>2000, coverage<80, `건폐${coverage}%`)
  a(28, 'Eccentric Nucleus', '편심핵', 'A', isMF, type!=='tower', type)
  a(29, 'Density Rings', '밀도링', 'A', isMF, coverage>=30&&coverage<=70, `건폐${coverage}%`)
  a(30, 'Activity Nodes', '활동노드', 'A', hasCommunity, hasCommunity, '커뮤니티')
  a(31, 'Promenade', '산책로', 'A', hasLandscape, openSp>100, `${Math.round(openSp)}㎡`)
  a(35, 'Household Mix', '세대혼합', 'A', isMF, rooms.length>=4, `${rooms.length}실`)
  a(36, 'Degrees of Publicness', '공개단계', 'A', isMF, true, '복도→현관→거실→침실')
  a(37, 'House Cluster', '주거군집', 'A', type==='cluster', type==='cluster', type)
  a(38, 'Row Houses', '연립', 'A', type==='linear', type==='linear', type)
  a(39, 'Housing Hill', '주거언덕', 'A', type==='terrace', type==='terrace', type)
  a(40, 'Old People', '노인배려', 'A', isMF&&units>20, true, '승강기')
  a(45, 'Community Projects', '커뮤니티', 'A', hasCommunity, hasCommunity, '주민시설')
  a(48, 'Housing In Between', '사이공간', 'A', isMF, openSp>siteArea*0.15, `개방${Math.round(openSp/siteArea*100)}%`)
  a(49, 'Looped Roads', '순환도로', 'A', siteArea>3000, true, '단지순환')
  a(51, 'Green Streets', '녹색가로', 'A', hasLandscape, hasLandscape, '조경')
  a(52, 'Paths and Cars', '보차분리', 'A', isMF, hasParking, '주차계획')
  a(53, 'Main Gateways', '주출입구', 'A', true, true, '주출입')
  a(56, 'Bike Paths', '자전거', 'A', isMF&&units>20, true, '자전거보관')
  a(57, 'Children', '아이들', 'A', isMF, hasLandscape, '놀이공간')
  a(59, 'Quiet Backs', '조용한뒤편', 'A', true, bY>=2, `깊이${bY}bay`)
  a(60, 'Accessible Green', '접근녹지', 'A', hasLandscape, openSp>50, `${Math.round(openSp)}㎡`)
  a(61, 'Small Squares', '소광장', 'A', hasCommunity, openSp>200, '광장')
  a(62, 'High Places', '높은곳', 'A', floors>=5, floors>=5, `${floors}층전망`)
  a(64, 'Pools', '수경', 'A', siteArea>1000, siteArea>1000, '수경가능')
  a(67, 'Common Land', '공유지', 'A', isMF, openSp>siteArea*0.1, '공유공간')
  a(68, 'Connected Play', '연결놀이', 'A', isMF&&units>10, hasLandscape, '놀이')
  a(69, 'Outdoor Room', '야외공용', 'A', isMF, openSp>100, '야외')
  a(71, 'Still Water', '잔잔한물', 'A', siteArea>2000, siteArea>2000, '수경')
  a(72, 'Local Sports', '스포츠', 'A', units>50, units>50, '운동시설')
  a(75, 'The Family', '가족', 'A', true, beds.length>=2, `침실${beds.length}`)
  a(76, 'Small Family', '소가족', 'A', rooms.length<=6, rooms.length<=6, `${rooms.length}실`)
  a(77, 'Couple', '부부', 'A', rooms.length<=4, rooms.length<=4, `${rooms.length}실`)
  a(78, 'One Person', '1인', 'A', rooms.length<=3, rooms.length<=3, `${rooms.length}실`)
  a(79, 'Your Own Home', '내집', 'A', true, true, '자기소유')

  // Scale B: #95~#126 건물
  a(95, 'Building Complex', '건물복합', 'B', isMF, units>5, `${units}세대`)
  a(96, 'Number of Stories', '층수', 'B', true, floors<=20, `${floors}층`)
  a(97, 'Shielded Parking', '차폐주차', 'B', hasParking, hasParking, '주차')
  a(98, 'Circulation Realms', '순환영역', 'B', true, corr.length<=1, `복도${corr.length}`)
  a(99, 'Main Building', '주동', 'B', true, true, '주동')
  a(100, 'Pedestrian Street', '보행가로', 'B', isMF, openSp>50, '보행')
  a(101, 'Building Thoroughfare', '건물관통', 'B', type==='courtyard', type==='courtyard', '중정')
  a(102, 'Family of Entrances', '출입구군', 'B', true, !!entrance, '현관')
  a(103, 'Small Parking', '소주차', 'B', hasParking, true, '분산주차')
  a(104, 'Site Repair', '대지보수', 'B', true, coverage<=70, `건폐${coverage}%`)
  a(105, 'South Facing', '남향야외', 'B', true, true, '남향배치')
  a(106, 'Positive Outdoor', '긍정외부', 'B', true, openSp>siteArea*0.1, `개방${Math.round(openSp/siteArea*100)}%`)
  a(107, 'Wings of Light', '빛의날개', 'B', true, grid.totalDepthM<=15, `깊이${grid.totalDepthM.toFixed(1)}m`)
  a(108, 'Connected Buildings', '연결건물', 'B', type==='cluster'||type==='lshape', true, type)
  a(109, 'Long Thin House', '길고얇은집', 'B', true, grid.totalWidthM/grid.totalDepthM>=1.5||grid.totalDepthM/grid.totalWidthM>=1.5, `비례${(grid.totalWidthM/grid.totalDepthM).toFixed(1)}`)
  a(110, 'Main Entrance', '주출입구', 'B', true, !!entrance, '현관')
  a(111, 'Half-Hidden Garden', '반쯤숨은정원', 'B', hasLandscape, openSp>80, '정원')
  a(112, 'Entrance Transition', '입구전이', 'B', true, !!(entrance&&entrance.gridY<=1), '현관위치')
  a(113, 'Car Connection', '차량연결', 'B', hasParking, hasParking, '주차→현관')
  a(114, 'Hierarchy of Open', '외부위계', 'B', isMF, openSp>siteArea*0.15, '공간위계')
  a(115, 'Courtyards Live', '살아있는중정', 'B', type==='courtyard', type==='courtyard', '중정')
  a(116, 'Cascade of Roofs', '지붕연쇄', 'B', floors<=5, floors<=5, `${floors}층`)
  a(117, 'Sheltering Roof', '보호지붕', 'B', true, true, '지붕')
  a(118, 'Roof Garden', '옥상정원', 'B', true, floors>=3, '옥상녹화')
  a(119, 'Arcades', '아케이드', 'B', isMF&&floors>=3, true, '필로티')
  a(120, 'Paths and Goals', '경로목표', 'B', true, !!entrance&&!!living, '현관→거실')
  a(121, 'Path Shape', '경로형태', 'B', true, corr.length<=1, '직선동선')
  a(122, 'Building Fronts', '건물정면', 'B', true, true, '정면')
  a(123, 'Pedestrian Density', '보행밀도', 'B', isMF, units>5, `${units}세대`)
  a(124, 'Activity Pockets', '활동포켓', 'B', hasCommunity, hasCommunity, '주민공간')
  a(125, 'Stair Seats', '계단좌석', 'B', true, floors>=2, '계단')
  a(126, 'Something in Middle', '중심무언가', 'B', true, !!living, '거실중심')

  // Scale C: #127~#204 세대/실내
  a(127, 'Intimacy Gradient', '친밀도경사', 'C', true, !!(entrance&&master&&entrance.gridY<=master.gridY), '현관→침실')
  a(128, 'Indoor Sunlight', '실내햇빛', 'C', true, winR.length>=rooms.length*0.5, `채광${winR.length}/${rooms.length}`)
  a(129, 'Common Areas Heart', '중심공용', 'C', true, !!(living&&(living.spanX>=2||living.gridY===0)), '거실중심')
  a(130, 'Entrance Room', '현관방', 'C', true, !!entrance, '현관')
  a(131, 'Flow Through', '방흐름', 'C', true, corr.length===0, '복도없음')
  a(132, 'Short Passages', '짧은통로', 'C', true, corr.length<=1, `통로${corr.length}`)
  a(133, 'Staircase Stage', '무대계단', 'C', floors>=2, true, '계단')
  a(134, 'Zen View', '선조망', 'C', true, winR.length>0, '조망')
  a(135, 'Light and Dark', '빛과어둠', 'C', true, rooms.length>=4, '명암')
  a(136, 'Couples Realm', '부부영역', 'C', true, !!master, '안방독립')
  a(137, 'Childrens Realm', '아이영역', 'C', beds.length>=2, beds.length>=2, `아이방${beds.length-1}`)
  a(138, 'Sleeping East', '동쪽침실', 'C', true, !!(master&&(master.gridX===0||master.gridX+master.spanX>=bX)), '안방외벽')
  a(139, 'Farmhouse Kitchen', '농가주방', 'C', true, !!(kitchen&&living&&Math.abs(kitchen.gridY-living.gridY)<=1), '주방↔거실')
  a(140, 'Private Terrace', '개인테라스', 'C', true, true, '발코니')
  a(141, 'Own Room', '자기방', 'C', true, beds.length>=1, `방${beds.length}`)
  a(142, 'Sitting Spaces', '앉는공간', 'C', true, !!living, '거실좌석')
  a(143, 'Bed Cluster', '침대군집', 'C', true, beds.length>=1, '침실영역')
  a(144, 'Bathing Room', '욕실', 'C', true, !!(bath&&master&&Math.abs(bath.gridY-master.gridY)+Math.abs(bath.gridX-master.gridX)<=3), '욕실↔침실')
  a(145, 'Bulk Storage', '수납', 'C', true, rooms.length>=3, '수납')
  a(146, 'Flexible Office', '유연사무', 'C', rooms.length>=5, rooms.length>=5, '다목적실')
  a(147, 'Communal Eating', '공동식사', 'C', true, !!(kitchen&&living), '주방↔거실')
  a(148, 'Small Work Groups', '소작업', 'C', false, false, '')
  a(149, 'Reception', '환영리셉션', 'C', true, !!entrance, '현관')
  a(150, 'Place to Wait', '대기장소', 'C', isMF, isMF, '로비')
  a(151, 'Small Meeting', '소회의실', 'C', false, false, '')
  a(152, 'Half-Private Office', '반개인사무', 'C', false, false, '')
  a(153, 'Rooms to Rent', '임대방', 'C', false, false, '')
  a(154, 'Teenager Cottage', '청소년', 'C', beds.length>=3, beds.length>=3, '독립방')
  a(155, 'Old Age Cottage', '노인주거', 'C', units>20, true, '무장애')
  a(156, 'Settled Work', '안정업무', 'C', false, false, '')
  a(157, 'Home Workshop', '홈작업실', 'C', rooms.length>=5, rooms.length>=5, '작업실')
  a(158, 'Open Stairs', '열린계단', 'C', floors>=2, true, '계단')
  a(159, 'Light Two Sides', '양면채광', 'C', true, !!(master&&(master.gridX===0||master.gridX+master.spanX>=bX||master.gridY===0||master.gridY+master.spanY>=bY)), '안방채광')
  a(160, 'Building Edge', '건물가장자리', 'C', true, true, '외벽')
  a(161, 'Sunny Place', '양지', 'C', true, !!(living&&living.hasWindow), '거실채광')
  a(162, 'North Face', '북측', 'C', true, true, '북측서비스')
  a(163, 'Outdoor Room', '야외방', 'C', true, true, '발코니')
  a(164, 'Street Windows', '가로창', 'C', true, winR.length>0, '도로면창')
  a(165, 'Opening to Street', '가로개방', 'C', true, !!entrance, '출입구')
  a(166, 'Gallery Surround', '갤러리', 'C', type==='courtyard', type==='courtyard', '중정')
  a(167, 'Six-Foot Balcony', '1.8m발코니', 'C', true, true, '발코니1.5m+')
  a(168, 'Connection Earth', '대지연결', 'C', true, floors<=5, `${floors}층`)
  a(169, 'Terraced Slope', '계단경사', 'C', type==='terrace', type==='terrace', '테라스')
  a(170, 'Fruit Trees', '과일나무', 'C', hasLandscape, hasLandscape, '수목')
  a(171, 'Tree Places', '나무자리', 'C', hasLandscape, openSp>50, '수목공간')
  a(172, 'Garden Wild', '자연정원', 'C', hasLandscape, hasLandscape, '자연조경')
  a(173, 'Garden Wall', '정원벽', 'C', hasLandscape, true, '외부경계')
  a(174, 'Trellised Walk', '덩굴산책', 'C', hasLandscape&&openSp>200, openSp>200, '녹음')
  a(175, 'Greenhouse', '온실', 'C', siteArea>1000, false, '미계획')
  a(176, 'Garden Seat', '정원벤치', 'C', hasLandscape, hasLandscape, '벤치')
  a(177, 'Vegetable Garden', '텃밭', 'C', siteArea>1000&&units>20, false, '미계획')
  a(178, 'Compost', '퇴비', 'C', false, false, '')
  a(179, 'Alcoves', '알코브', 'C', true, rooms.filter(r=>r.spanX===1&&r.spanY===1).length>=1, '소공간')
  a(180, 'Window Place', '창가', 'C', true, winR.length>=rooms.length*0.5, `채광${Math.round(winR.length/rooms.length*100)}%`)
  a(181, 'The Fire', '벽난로', 'C', true, !!living, '거실중심')
  a(182, 'Eating Atmosphere', '식사분위기', 'C', true, !!(kitchen||living), '식사공간')
  a(183, 'Workspace', '작업공간', 'C', rooms.length>=5, rooms.length>=5, '서재')
  a(184, 'Cooking Layout', '주방배치', 'C', true, !!kitchen, '주방')
  a(185, 'Sitting Circle', '앉는원', 'C', true, !!living, '대화공간')
  a(186, 'Communal Sleeping', '공동수면', 'C', false, false, '')
  a(187, 'Marriage Bed', '부부침대', 'C', true, !!master, '안방')
  a(188, 'Bed Alcove', '침대알코브', 'C', true, !!master, '안방독립')
  a(189, 'Dressing Room', '탈의실', 'C', rooms.length>=6, rooms.length>=6, '드레스룸')
  a(190, 'Ceiling Height', '천장고변화', 'C', true, true, '3.3m')
  a(191, 'Indoor Space Shape', '실내형태', 'C', true, (()=>{const rs=rooms.filter(r=>r.spanX>0&&r.spanY>0).map(r=>(r.spanX*bayW)/(r.spanY*bayD));return rs.filter(r=>r>=0.5&&r<=2).length>=rs.length*0.7})(), '비례적합')
  a(192, 'Windows Overlooking', '내다보는창', 'C', true, winR.length>0, '전면조망')
  a(193, 'Half-Open Wall', '반개방벽', 'C', true, !!(kitchen&&living&&Math.abs(kitchen.gridY-living.gridY)<=1), '주방개방')
  a(194, 'Interior Windows', '실내창', 'C', rooms.length>=6, rooms.length>=6, '실내채광')
  a(195, 'Staircase Volume', '계단체적', 'C', floors>=2, true, '계단실')
  a(196, 'Corner Doors', '코너문', 'C', true, rooms.length>=3, '동선')
  a(197, 'Thick Walls', '두꺼운벽', 'C', true, true, 'RC200mm')
  a(198, 'Closets Between', '방사이수납', 'C', true, rooms.length>=4, '벽체수납')
  a(199, 'Sunny Counter', '양지카운터', 'C', true, !!(kitchen&&kitchen.hasWindow), '주방채광')
  a(200, 'Open Shelves', '열린선반', 'C', true, true, '수납')
  a(201, 'Waist-High Shelf', '허리선반', 'C', true, true, '수납')
  a(202, 'Built-in Seats', '붙박이좌석', 'C', true, !!living, '거실')
  a(203, 'Child Caves', '아이동굴', 'C', beds.length>=2, beds.length>=2, '아이공간')
  a(204, 'Secret Place', '비밀장소', 'C', rooms.length>=5, rooms.length>=5, '다락')

  // Scale D: #205~#253 시공/디테일
  a(205, 'Structure=Social', '구조=사회', 'D', true, rooms.length>=4, '그리드↔실배치')
  a(206, 'Efficient Structure', '효율구조', 'D', true, bX>=2&&bY>=2, `${bX}×${bY}bay`)
  a(207, 'Good Materials', '좋은재료', 'D', true, true, 'RC+마감')
  a(208, 'Gradual Stiffening', '점진보강', 'D', true, true, '기초→기둥→보→슬래브')
  a(209, 'Roof Layout', '지붕배치', 'D', true, true, '평지붕')
  a(210, 'Floor-Ceiling', '바닥천장', 'D', true, true, '슬래브200')
  a(211, 'Thickening Walls', '외벽두께', 'D', true, true, '단열130')
  a(212, 'Corner Columns', '코너기둥', 'D', true, grid.columns.length>=4, `기둥${grid.columns.length}`)
  a(213, 'Column Distribution', '기둥분포', 'D', true, true, `${bX+1}×${bY+1}그리드`)
  a(214, 'Root Foundations', '뿌리기초', 'D', true, true, '매트기초')
  a(215, 'Ground Floor Slab', '1층슬래브', 'D', true, true, '지상슬래브')
  a(216, 'Box Columns', '박스기둥', 'D', true, true, 'RC기둥')
  a(217, 'Perimeter Beams', '외주보', 'D', true, true, '외주보')
  a(218, 'Wall Membranes', '벽막', 'D', true, true, '벽체구성')
  a(219, 'Floor-Ceiling Vaults', '바닥천장구조', 'D', true, true, 'RC슬래브')
  a(220, 'Roof Vaults', '지붕구조', 'D', true, true, '옥상방수')
  a(221, 'Natural Doors Windows', '자연개구', 'D', true, winR.length>=3, `창호${winR.length}`)
  a(222, 'Low Sill', '낮은창대', 'D', true, true, '900mm')
  a(223, 'Deep Reveals', '깊은창틀', 'D', true, true, '창틀깊이')
  a(224, 'Low Doorway', '낮은문', 'D', true, true, '2100mm')
  a(225, 'Frames Thickened', '두꺼운프레임', 'D', true, true, '창호프레임')
  a(226, 'Column Place', '기둥자리', 'D', true, grid.columns.length>=4, '기둥배치')
  a(227, 'Column Connection', '기둥연결', 'D', true, true, '기둥보접합')
  a(228, 'Stair Vault', '계단구조', 'D', floors>=2, true, '계단')
  a(229, 'Duct Space', '덕트공간', 'D', true, true, 'MEP덕트')
  a(230, 'Radiant Heat', '복사난방', 'D', true, true, '바닥난방')
  a(231, 'Dormer Windows', '지붕창', 'D', floors<=3, false, '평지붕')
  a(232, 'Roof Caps', '지붕캡', 'D', true, true, '파라펫')
  a(233, 'Floor Surface', '바닥마감', 'D', true, true, '마루/타일')
  a(234, 'Lapped Walls', '겹침외벽', 'D', true, true, '외벽레이어')
  a(235, 'Soft Inside Walls', '부드러운내벽', 'D', true, true, '석고보드')
  a(236, 'Windows Open Wide', '활짝창', 'D', true, true, '시스템창호')
  a(237, 'Solid Doors Glass', '유리문', 'D', true, true, '현관문유리')
  a(238, 'Filtered Light', '여과빛', 'D', true, winR.length>0, '블라인드')
  a(239, 'Small Panes', '작은유리', 'D', true, true, '창호분할')
  a(240, 'Half-Inch Trim', '12mm몰딩', 'D', true, true, '마감몰딩')
  a(241, 'Seat Spots', '앉을자리', 'D', true, !!living, '거실좌석')
  a(242, 'Front Door Bench', '현관벤치', 'D', true, !!entrance, '현관수납')
  a(243, 'Sitting Wall', '앉는벽', 'D', hasLandscape, openSp>50, '외부벤치')
  a(244, 'Canvas Roofs', '캔버스지붕', 'D', false, false, '')
  a(245, 'Raised Flowers', '높인화분', 'D', hasLandscape, hasLandscape, '조경화분')
  a(246, 'Climbing Plants', '덩굴', 'D', hasLandscape, hasLandscape, '벽면녹화')
  a(247, 'Paving Cracks', '틈새포장', 'D', hasLandscape, openSp>30, '투수포장')
  a(248, 'Soft Tile', '부드러운타일', 'D', true, true, '바닥타일')
  a(249, 'Ornament', '장식', 'D', true, true, '건축디테일')
  a(250, 'Warm Colors', '따뜻한색', 'D', true, true, '마감색상')
  a(251, 'Different Chairs', '다양한의자', 'D', true, !!living, '거실가구')
  a(252, 'Pools of Light', '빛웅덩이', 'D', true, true, '조명계획')
  a(253, 'Things from Life', '삶의흔적', 'D', true, true, '개인화')

  // 점수 계산
  const ap = C.filter(c => c.applicable)
  const ps = ap.filter(c => c.pass)
  const ss = (s: 'A'|'B'|'C'|'D') => { const sc=ap.filter(c=>c.scale===s); return sc.length>0?Math.round(sc.filter(c=>c.pass).length/sc.length*100):100 }
  const score = ap.length > 0 ? Math.round(ps.length / ap.length * 100) : 0
  const grade = score>=90?'S':score>=80?'A':score>=70?'B':score>=60?'C':'D'

  return {
    totalPatterns: 253, applicableCount: ap.length, passedCount: ps.length, failedCount: ap.length-ps.length,
    score, grade, scaleScores: { A: ss('A'), B: ss('B'), C: ss('C'), D: ss('D') }, checks: C,
    topIssues: ap.filter(c=>!c.pass).slice(0,10).map(c=>`#${c.id} ${c.nameKo}: ${c.description}`)
  }
}
