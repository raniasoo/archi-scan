// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 한국 건축 LoRA 학습 데이터 — 200개 지점
// 서울 25개 자치구 + 경기도 주요 도시 전역 커버
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface TrainingPoint {
  lat: number; lng: number
  category: 'villa' | 'apartment' | 'commercial' | 'luxury' | 'officetel' | 'mixed'
  district: string
  caption: string
  heading?: number
}

export const TRAINING_POINTS: TrainingPoint[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. 한국 빌라/다세대 (70개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 강남/서초
  { lat: 37.5172, lng: 127.0473, category: 'villa', district: '강남구 논현동', caption: 'Korean multi-family villa, 4-story walk-up, beige exterior tiles, pilotis ground floor parking, balcony with laundry drying racks, external staircase, flat roof with water tanks, narrow residential alley in Gangnam' },
  { lat: 37.5145, lng: 127.0412, category: 'villa', district: '강남구 논현동', caption: 'Korean villa apartment, 5-story residential building, exposed concrete and tile facade, metal railing balconies, rooftop equipment visible, parked cars at street level' },
  { lat: 37.5089, lng: 127.0632, category: 'villa', district: '강남구 삼성동', caption: 'Modern Korean villa, 4-story multi-unit housing, clean white facade with gray accents, pilotis parking underneath, AC outdoor units on facade' },
  { lat: 37.4923, lng: 127.0156, category: 'villa', district: '서초구 서초동', caption: 'Seocho Korean villa, 4-story residential, modern renovation, dark gray and white exterior, glass railing balcony' },
  { lat: 37.4856, lng: 127.0344, category: 'villa', district: '서초구 방배동', caption: 'Bangbae-dong villa, 3-story walk-up, red brick lower half, cream painted upper, external staircase with metal railing' },
  // 마포/서대문/은평
  { lat: 37.5662, lng: 126.9247, category: 'villa', district: '마포구 연남동', caption: 'Yeonnam-dong Korean villa, 3-story walk-up apartment, red brick exterior, old-style external staircase, narrow alley, mature trees' },
  { lat: 37.5493, lng: 126.9134, category: 'villa', district: '마포구 합정동', caption: 'Hapjeong Korean multi-family housing, 4-story villa, renovated facade with modern tiles, rooftop terrace, street-level parking' },
  { lat: 37.5584, lng: 126.9265, category: 'villa', district: '마포구 연남동', caption: 'Korean villa with rooftop garden, 4-story residential, warm-toned exterior paint, balcony with plants, external metal staircase' },
  { lat: 37.5712, lng: 126.9456, category: 'villa', district: '마포구 대흥동', caption: 'Korean neighborhood villa near subway station, 4-story, convenience store at ground level, residential above, narrow street' },
  { lat: 37.5791, lng: 126.9368, category: 'villa', district: '서대문구 연희동', caption: 'Yeonhui-dong Korean villa, 4-story upscale multi-family, stone base wall, quality window frames, private garden' },
  { lat: 37.6019, lng: 126.9292, category: 'villa', district: '은평구 응암동', caption: 'Korean villa in older neighborhood, 3-story walk-up, aging facade with partial renovation, external gas pipes visible' },
  { lat: 37.6128, lng: 126.9189, category: 'villa', district: '은평구 녹번동', caption: 'Renovated Korean villa, 4-story with new paint and windows, hillside location, retaining wall, narrow uphill road' },
  // 성북/노원/도봉
  { lat: 37.5894, lng: 127.0167, category: 'villa', district: '성북구 정릉동', caption: 'Korean hillside villa, 3-story multi-family on sloped terrain, retaining wall at base, exposed pipes, narrow uphill road' },
  { lat: 37.6543, lng: 127.0557, category: 'villa', district: '노원구 상계동', caption: 'Korean suburban villa, 4-story walk-up near apartment complex, beige tile exterior, communal parking area, wide sidewalk' },
  { lat: 37.6389, lng: 127.0234, category: 'villa', district: '강북구 수유동', caption: 'Suyu-dong Korean villa, 3-story on hillside, concrete block wall boundary, steep stairway entrance, dense residential' },
  { lat: 37.6678, lng: 127.0345, category: 'villa', district: '도봉구 방학동', caption: 'Dobong Korean villa, 4-story with basement parking entrance, flat roof with satellite dish, residential neighborhood' },
  // 관악/동작/영등포
  { lat: 37.4784, lng: 126.9516, category: 'villa', district: '관악구 신림동', caption: 'Korean student-area villa near university, 5-story narrow building, many AC units on facade, convenience store at ground floor' },
  { lat: 37.5013, lng: 126.9389, category: 'villa', district: '동작구 사당동', caption: 'Sadang-dong Korean villa, 4-story residential, white and gray exterior, metal gate entrance, motorcycle parking' },
  { lat: 37.4912, lng: 126.9234, category: 'villa', district: '동작구 상도동', caption: 'Sangdo-dong Korean villa, 3-story, yellow brick facade, laundry poles on roof, steep neighborhood road' },
  { lat: 37.5234, lng: 126.8956, category: 'villa', district: '영등포구 당산동', caption: 'Dangsan Korean villa, 4-story near station, commercial ground floor, residential above, busy urban street' },
  // 송파/강동
  { lat: 37.5048, lng: 127.1167, category: 'villa', district: '송파구 가락동', caption: 'Korean villa in Songpa, 4-story multi-family housing, brown brick exterior, organized parking lot, landscaping' },
  { lat: 37.5301, lng: 127.1237, category: 'villa', district: '강동구 명일동', caption: 'Gangdong district Korean villa, 3-story residential, simple rectangular design, exposed concrete base, vinyl windows' },
  { lat: 37.5189, lng: 127.1089, category: 'villa', district: '송파구 문정동', caption: 'Munjeong Korean villa, 5-story new construction, modern design with aluminum panels, underground parking ramp' },
  // 성동/광진/중랑
  { lat: 37.5634, lng: 127.0389, category: 'villa', district: '성동구 행당동', caption: 'Haengdang-dong Korean villa, 4-story on hillside, stone wall boundary, narrow one-way street, dense urban housing' },
  { lat: 37.5478, lng: 127.0812, category: 'villa', district: '광진구 자양동', caption: 'Jayang-dong Korean villa, 4-story near river, brick and tile facade, small front garden, residential block' },
  { lat: 37.5956, lng: 127.0934, category: 'villa', district: '중랑구 면목동', caption: 'Myeonmok-dong Korean villa, 3-story older construction, painted concrete exterior, metal gate, narrow alley access' },
  // 양천/강서/구로
  { lat: 37.5178, lng: 126.8567, category: 'villa', district: '양천구 목동', caption: 'Mokdong Korean villa, 4-story modern design near apartment town, clean facade, structured parking' },
  { lat: 37.5589, lng: 126.8234, category: 'villa', district: '강서구 화곡동', caption: 'Hwagok Korean villa, 3-story walk-up, aging but maintained, flower pots on stairs, quiet residential street' },
  { lat: 37.4889, lng: 126.8823, category: 'villa', district: '구로구 개봉동', caption: 'Gaebong Korean villa, 4-story near station, recent renovation, insulated exterior, CCTV camera visible' },
  // 금천/관악
  { lat: 37.4567, lng: 126.8978, category: 'villa', district: '금천구 시흥동', caption: 'Siheung-dong Korean villa, 5-story with small commercial at ground, densely packed neighborhood, multiple mailboxes' },
  // 경기도
  { lat: 37.3943, lng: 127.1115, category: 'villa', district: '성남시 수정구', caption: 'Korean villa in Seongnam, 4-story multi-family housing, exposed brick, pilotis parking, laundry hanging on balcony' },
  { lat: 37.6584, lng: 127.0768, category: 'villa', district: '의정부시', caption: 'Korean suburban villa in Uijeongbu, 5-story walk-up, light pink exterior, commercial sign at ground floor' },
  { lat: 37.3219, lng: 126.8312, category: 'villa', district: '안산시 단원구', caption: 'Industrial city Korean villa, 4-story multi-family, utilitarian design, vinyl siding, shared parking' },
  { lat: 37.7517, lng: 127.0477, category: 'villa', district: '양주시', caption: 'New construction Korean villa, 4-story modern design, clean facade, structured parking, new residential area' },
  { lat: 37.4834, lng: 126.7834, category: 'villa', district: '부천시', caption: 'Bucheon Korean villa, 4-story, typical suburban residential, cream exterior, small balconies, street parking' },
  { lat: 37.4412, lng: 127.1567, category: 'villa', district: '성남시 중원구', caption: 'Seongnam inner city villa, 3-story older building, red brick, external staircase, small front yard' },
  { lat: 37.7412, lng: 127.0234, category: 'villa', district: '양주시 덕정동', caption: 'Suburban Korean villa in Yangju, 3-story new build, light gray exterior, wide residential road, parking lot' },
  { lat: 37.2934, lng: 127.0089, category: 'villa', district: '수원시 권선구', caption: 'Suwon Korean villa, 4-story, beige and brown exterior, pilotis parking, residential neighborhood near industrial area' },
  { lat: 37.3567, lng: 127.1089, category: 'villa', district: '용인시 수지구', caption: 'Suji Korean villa, 4-story modern design, white and gray, well-maintained garden, suburban residential street' },
  { lat: 37.5934, lng: 126.8345, category: 'villa', district: '김포시', caption: 'Gimpo new town Korean villa, 4-story recent construction, modern materials, wide road, new development area' },
  // 추가 서울 지역
  { lat: 37.5723, lng: 126.9912, category: 'villa', district: '종로구 동숭동', caption: 'Daehak-ro area Korean villa, 3-story near university, aged exterior, small garden, cultural neighborhood' },
  { lat: 37.5534, lng: 126.9823, category: 'villa', district: '중구 신당동', caption: 'Sindang-dong Korean villa, 4-story, traditional residential area, renovated exterior, steep hillside' },
  { lat: 37.5412, lng: 127.0012, category: 'villa', district: '용산구 보광동', caption: 'Bogwang-dong Korean villa, 3-story near Itaewon, narrow hillside alley, stone retaining wall, compact design' },
  { lat: 37.5667, lng: 127.0567, category: 'villa', district: '성동구 금호동', caption: 'Geumho-dong Korean villa, 4-story on steep hill, panoramic city view, multiple stairways, dense residential' },
  { lat: 37.6234, lng: 126.9134, category: 'villa', district: '은평구 구산동', caption: 'Gusan-dong Korean villa, 3-story with small yard, aging concrete block, traditional Korean gate, quiet residential' },
  { lat: 37.5812, lng: 127.0089, category: 'villa', district: '종로구 창신동', caption: 'Changsin-dong Korean villa on hillside, 3-story, stone steps to entrance, narrow winding alley, old Seoul atmosphere' },
  { lat: 37.4978, lng: 127.0767, category: 'villa', district: '강남구 대치동', caption: 'Daechi-dong Korean villa, 4-story premium residential, quality tiles, parking gate, well-maintained landscaping' },
  { lat: 37.5356, lng: 127.0934, category: 'villa', district: '광진구 구의동', caption: 'Guui-dong Korean villa, 4-story near Han River, modern renovation, gray metal panels, rooftop terrace' },
  { lat: 37.6123, lng: 127.0567, category: 'villa', district: '노원구 월계동', caption: 'Wolgye-dong Korean villa, 5-story near train station, commercial ground floor, residential upper, busy intersection' },
  { lat: 37.4756, lng: 126.9623, category: 'villa', district: '관악구 봉천동', caption: 'Bongcheon-dong student housing villa, 5-story narrow, many doorbells, delivery boxes piled, university neighborhood' },
  { lat: 37.5089, lng: 126.8912, category: 'villa', district: '구로구 구로동', caption: 'Guro industrial area villa, 4-story worker housing, simple design, shared parking, near factories' },
  { lat: 37.5478, lng: 126.8678, category: 'villa', district: '양천구 신정동', caption: 'Sinjeong-dong Korean villa, 4-story with basement, beige tile, decorative front gate, quiet suburban street' },
  { lat: 37.4634, lng: 126.9234, category: 'villa', district: '금천구 독산동', caption: 'Doksan-dong Korean villa, 3-story older construction, green painted exterior, metal staircase, compact lot' },
  { lat: 37.5723, lng: 127.0734, category: 'villa', district: '광진구 화양동', caption: 'Hwayang-dong Korean villa near Konkuk Univ, 4-story, cafe at ground floor, student housing above, vibrant street' },
  { lat: 37.6234, lng: 127.0789, category: 'villa', district: '중랑구 상봉동', caption: 'Sangbong Korean villa, 3-story near market, traditional neighborhood, narrow alley, communal water tap visible' },
  { lat: 37.5156, lng: 127.0389, category: 'villa', district: '강남구 역삼동', caption: 'Yeoksam Korean villa, 4-story between office buildings, renovated modern facade, premium location, narrow lot' },
  { lat: 37.5434, lng: 126.9567, category: 'villa', district: '용산구 한강로', caption: 'Hangang-ro Korean villa, 5-story near station redevelopment area, aging exterior, mixed commercial-residential' },
  { lat: 37.3756, lng: 126.9534, category: 'villa', district: '안양시 만안구', caption: 'Anyang Korean villa, 4-story suburban, cream colored exterior, standard design, residential neighborhood' },
  { lat: 37.4123, lng: 127.1278, category: 'villa', district: '성남시 분당구', caption: 'Bundang villa near park, 3-story premium, natural stone cladding, well-maintained garden, upscale suburb' },
  { lat: 37.3412, lng: 126.7678, category: 'villa', district: '시흥시', caption: 'Siheung Korean villa, 4-story new build, modern exterior, wide residential street, affordable housing area' },
  { lat: 37.2789, lng: 127.0178, category: 'villa', district: '수원시 팔달구', caption: 'Suwon old town Korean villa, 3-story, traditional street, mixed with small shops, historical neighborhood' },
  { lat: 37.6534, lng: 127.1123, category: 'villa', district: '남양주시', caption: 'Namyangju Korean villa, 4-story new construction, suburban development, modern materials, mountain backdrop' },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. 한국 아파트 단지 (40개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { lat: 37.5133, lng: 127.1001, category: 'apartment', district: '송파구 잠실동', caption: 'Korean apartment complex, high-rise residential towers, numbered building signs, underground parking entrance, landscaped common area, children playground, Jamsil Seoul' },
  { lat: 37.3947, lng: 127.1112, category: 'apartment', district: '분당구 정자동', caption: 'Bundang new city apartment complex, modern high-rise towers, well-maintained gardens, community facilities, wide pedestrian paths' },
  { lat: 37.5512, lng: 127.0737, category: 'apartment', district: '성동구 성수동', caption: 'Korean apartment in urban area, mid-rise 15-story buildings, renovated facade, parking structure, mature trees' },
  { lat: 37.6313, lng: 127.0477, category: 'apartment', district: '노원구 하계동', caption: 'Large Korean apartment complex, uniform 20-story towers in rows, communal green space, basketball court, 1990s housing' },
  { lat: 37.4844, lng: 126.9017, category: 'apartment', district: '금천구 가산동', caption: 'Korean apartment towers near industrial area, 25-story residential buildings, parking ramp entrance, convenience facilities' },
  { lat: 37.4265, lng: 127.0986, category: 'apartment', district: '성남시 분당구', caption: 'Premium Bundang apartment, 30-story luxury residential tower, glass curtain wall, landscaped entrance with water feature' },
  { lat: 37.5584, lng: 126.8567, category: 'apartment', district: '강서구 마곡동', caption: 'Magok new development apartment, modern 35-story towers, eco-friendly design, rooftop solar panels, smart home features' },
  { lat: 37.3714, lng: 127.1063, category: 'apartment', district: '용인시 수지구', caption: 'Suji Korean apartment complex, multiple 20-story buildings, hillside development, community park, school nearby' },
  { lat: 37.5023, lng: 127.0823, category: 'apartment', district: '송파구 오금동', caption: 'Ogeum apartment complex, 12-story mid-rise, well-maintained common area, underground parking, neighborhood park' },
  { lat: 37.5312, lng: 126.8734, category: 'apartment', district: '양천구 목동', caption: 'Mokdong apartment town, uniform 15-story buildings, grid layout, large playground, tree-lined walkways, iconic Seoul suburb' },
  { lat: 37.6478, lng: 127.0612, category: 'apartment', district: '노원구 중계동', caption: 'Junggye apartment complex, 25-story towers, large scale development, commercial area at ground level, bus stop' },
  { lat: 37.5178, lng: 127.0378, category: 'apartment', district: '강남구 대치동', caption: 'Daechi apartment, premium 20-story complex, stone facade, high-end landscaping, security guard booth, Gangnam' },
  { lat: 37.5556, lng: 126.9678, category: 'apartment', district: '용산구 이촌동', caption: 'Ichon apartment complex along Han River, 30-story riverside towers, panoramic river view, large complex with amenities' },
  { lat: 37.4912, lng: 127.0134, category: 'apartment', district: '서초구 반포동', caption: 'Banpo premium apartment, luxury 35-story towers, river view, underground shopping mall, doorman service' },
  { lat: 37.5867, lng: 127.0234, category: 'apartment', district: '성북구 장위동', caption: 'Jangwi redevelopment apartment, new 28-story towers replacing old housing, modern design, community center' },
  { lat: 37.5234, lng: 127.1178, category: 'apartment', district: '강동구 고덕동', caption: 'Godeok apartment complex, new town development, 25-story modern towers, smart city infrastructure, wide roads' },
  { lat: 37.4734, lng: 126.9589, category: 'apartment', district: '관악구 봉천동', caption: 'Bongcheon apartment on hillside, 15-story cluster, retaining wall visible, urban renewal project, city view' },
  { lat: 37.5478, lng: 126.8278, category: 'apartment', district: '강서구 등촌동', caption: 'Deungchon apartment, 20-story residential complex, well-maintained gardens, children facilities, bus route' },
  { lat: 37.3478, lng: 126.7712, category: 'apartment', district: '시흥시 정왕동', caption: 'Siheung new town apartment, 30-story towers, modern design, commercial podium, suburban development' },
  { lat: 37.2934, lng: 127.0534, category: 'apartment', district: '수원시 영통구', caption: 'Yeongtong apartment complex, 25-story buildings, Samsung employees housing, modern amenities, wide roads' },
  { lat: 37.3567, lng: 126.9412, category: 'apartment', district: '안양시 동안구', caption: 'Anyang Pyeongchon apartment town, 15-story 1990s complex, large central park, commercial street below' },
  { lat: 37.6523, lng: 126.8912, category: 'apartment', district: '고양시 일산동구', caption: 'Ilsan new town apartment, 20-story modern towers, lake park nearby, planned city layout, wide boulevards' },
  { lat: 37.7434, lng: 127.0534, category: 'apartment', district: '의정부시', caption: 'Uijeongbu apartment complex, 25-story near station, urban renewal, mountain backdrop, transit-oriented' },
  { lat: 37.3289, lng: 127.1089, category: 'apartment', district: '용인시 기흥구', caption: 'Giheung apartment complex, new development, 30-story towers, smart city, Samsung Digital City nearby' },
  { lat: 37.4089, lng: 126.8978, category: 'apartment', district: '안양시 만안구', caption: 'Anyang Korean apartment, 12-story mid-rise, 1980s construction, aging but maintained, street-level shops' },
  { lat: 37.5912, lng: 126.8234, category: 'apartment', district: '김포시 장기동', caption: 'Gimpo Hangang new town apartment, brand new 35-story towers, modern amenities, near airport, suburban' },
  { lat: 37.5634, lng: 126.8456, category: 'apartment', district: '강서구 방화동', caption: 'Banghwa apartment near Gimpo Airport, 15-story 2000s complex, well-maintained, community garden, quiet' },
  { lat: 37.5089, lng: 126.7834, category: 'apartment', district: '부천시 상동', caption: 'Bucheon Sangdong apartment, new town 25-story towers, lake nearby, commercial district, family housing' },
  { lat: 37.4034, lng: 127.0267, category: 'apartment', district: '과천시', caption: 'Gwacheon apartment complex, government housing, 15-story clean design, Seoul Grand Park nearby, quiet suburb' },
  { lat: 37.4523, lng: 126.7034, category: 'apartment', district: '인천시 남동구', caption: 'Incheon apartment complex, 20-story near industrial area, standard Korean apartment design, wide parking area' },
  { lat: 37.6812, lng: 127.0412, category: 'apartment', district: '도봉구 쌍문동', caption: 'Ssangmun apartment, 12-story older complex, renovation in progress, mountain view, traditional neighborhood' },
  { lat: 37.4234, lng: 127.1434, category: 'apartment', district: '성남시 분당구', caption: 'Pangyo techno-valley apartment, premium 30-story with IT company workers, modern design, green technology' },
  { lat: 37.5712, lng: 126.9812, category: 'apartment', district: '중구 약수동', caption: 'Yaksu-dong redevelopment apartment, new 28-story tower replacing old neighborhood, modern urban living' },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. 한국 상가주택/상가건물 (35개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { lat: 37.5563, lng: 126.9237, category: 'commercial', district: '마포구 서교동', caption: 'Korean commercial-residential mixed building in Hongdae area, ground floor cafes and shops with colorful signage, upper floors residential with balconies, narrow street' },
  { lat: 37.5667, lng: 126.9784, category: 'commercial', district: '종로구 관철동', caption: 'Korean commercial building in Jongno, 5-story mixed-use, neon signs and Korean text banners, restaurants at every floor' },
  { lat: 37.4979, lng: 127.0276, category: 'commercial', district: '서초구 서초동', caption: 'Seocho commercial-residential building, ground floor real estate office and pharmacy, upper floors residential, wide boulevard' },
  { lat: 37.5408, lng: 127.0696, category: 'commercial', district: '성동구 성수동', caption: 'Seongsu-dong renovated commercial building, former industrial converted to trendy cafe and studio, exposed brick' },
  { lat: 37.4844, lng: 127.0326, category: 'commercial', district: '서초구 방배동', caption: 'Korean neighborhood commercial building, 4-story, bakery and hair salon at ground floor, Korean signage, residential above' },
  { lat: 37.5574, lng: 126.9368, category: 'commercial', district: '마포구 상수동', caption: 'Sangsu-dong Korean mixed-use, boutique shops and cafes at street level, 3 residential floors above, renovated vintage' },
  { lat: 37.5722, lng: 126.9851, category: 'commercial', district: '종로구 익선동', caption: 'Traditional Korean commercial area, low-rise 2-3 story, hanok-style elements mixed with modern renovation, specialty shops' },
  { lat: 37.5102, lng: 127.0592, category: 'commercial', district: '강남구 삼성동', caption: 'Gangnam commercial building, 6-story modern office-retail, glass and stone facade, brand stores at ground floor' },
  { lat: 37.5167, lng: 127.0189, category: 'commercial', district: '강남구 역삼동', caption: 'Yeoksam commercial building, 5-story, academy hagwon signs, coffee shop at ground, office and tutoring above' },
  { lat: 37.5534, lng: 126.9234, category: 'commercial', district: '마포구 서교동', caption: 'Hongdae commercial street building, 4-story, vintage clothing shop, craft beer bar, music studio signage' },
  { lat: 37.5789, lng: 126.9912, category: 'commercial', district: '종로구 혜화동', caption: 'Hyehwa theater district commercial, 3-story, small theater entrance, restaurant, cultural neighborhood' },
  { lat: 37.5623, lng: 127.0423, category: 'commercial', district: '성동구 왕십리동', caption: 'Wangsimni commercial building, 5-story near station, Korean BBQ restaurant, real estate office, hospital' },
  { lat: 37.4912, lng: 126.9412, category: 'commercial', district: '동작구 노량진동', caption: 'Noryangjin commercial building, 4-story near fish market, seafood restaurants, study cafes, student area' },
  { lat: 37.5445, lng: 127.0156, category: 'commercial', district: '용산구 이태원동', caption: 'Itaewon commercial building, international restaurants, unique facade design, multi-cultural signage, trendy area' },
  { lat: 37.5134, lng: 126.9512, category: 'commercial', district: '영등포구 여의도동', caption: 'Yeouido commercial building, 8-story office-retail, modern glass facade, financial district, premium tenants' },
  { lat: 37.4712, lng: 126.8845, category: 'commercial', district: '구로구 디지털로', caption: 'Guro Digital Complex commercial, 6-story IT office-retail, modern design, tech company signs, food court' },
  { lat: 37.5945, lng: 127.0178, category: 'commercial', district: '성북구 동선동', caption: 'Traditional Korean commercial street, 3-story buildings, local bakery, laundry shop, neighborhood market' },
  { lat: 37.5289, lng: 126.8723, category: 'commercial', district: '양천구 목동', caption: 'Mokdong commercial strip, 4-story, hagwon academy signs, bookstore, after-school education district' },
  { lat: 37.3856, lng: 127.1234, category: 'commercial', district: '분당구 서현동', caption: 'Seohyeon commercial building, 5-story modern mixed-use, cafe franchise, dental clinic, academy, busy intersection' },
  { lat: 37.4789, lng: 127.0456, category: 'commercial', district: '강남구 수서동', caption: 'Suseo station area commercial, 4-story near SRT station, convenience store, restaurant, travel agency' },
  { lat: 37.6534, lng: 127.0234, category: 'commercial', district: '강북구 미아동', caption: 'Mia commercial building, 5-story, traditional market nearby, Korean restaurant, hardware store, busy local road' },
  { lat: 37.5312, lng: 126.9678, category: 'commercial', district: '용산구 한남동', caption: 'Hannam-dong trendy commercial, renovated building, art gallery, designer boutique, upscale dining, premium neighborhood' },
  { lat: 37.5078, lng: 127.0334, category: 'commercial', district: '서초구 서초동', caption: 'Seocho court district commercial, 4-story, law office, copy center, lunch restaurants, legal professional area' },
  { lat: 37.5867, lng: 126.9534, category: 'commercial', district: '서대문구 신촌동', caption: 'Sinchon university district commercial, 5-story, Korean fried chicken, PC bang, karaoke noraebang, student area' },
  { lat: 37.5456, lng: 126.9456, category: 'commercial', district: '마포구 공덕동', caption: 'Gongdeok station area commercial, 6-story modern, coffee chains, co-working space, office above, transit hub' },
  { lat: 37.4634, lng: 126.9089, category: 'commercial', district: '금천구 가산동', caption: 'Gasan digital valley commercial, modern building with tech company logos, food court, convenience facilities' },
  { lat: 37.6178, lng: 127.0789, category: 'commercial', district: '중랑구 망우동', caption: 'Mangwoo neighborhood commercial, 3-story traditional, butcher shop, small supermarket, Korean barbershop' },
  { lat: 37.3412, lng: 126.9234, category: 'commercial', district: '안양시 안양동', caption: 'Anyang commercial street, 4-story buildings, local businesses, Korean signage, suburban commercial district' },
  { lat: 37.2867, lng: 127.0089, category: 'commercial', district: '수원시 팔달구', caption: 'Suwon Hwaseong area commercial, traditional market buildings, Korean street food vendors, historic neighborhood' },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. 한국 고급 단독주택 (25개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { lat: 37.5923, lng: 126.9712, category: 'luxury', district: '종로구 평창동', caption: 'Korean luxury detached house in Pyeongchang-dong, natural stone facade, private garden with mature pine trees, iron gate entrance, premium materials, quiet upscale neighborhood' },
  { lat: 37.5342, lng: 127.0087, category: 'luxury', district: '용산구 한남동', caption: 'Hannam-dong luxury residence, modern minimalist design, exposed concrete and glass, private courtyard, high walls, architectural design home' },
  { lat: 37.5678, lng: 126.9543, category: 'luxury', district: '서대문구 연희동', caption: 'Yeonhui-dong upscale Korean house, 3-story detached, quality stone cladding, landscaped front yard, double garage' },
  { lat: 37.4981, lng: 127.0432, category: 'luxury', district: '강남구 논현동', caption: 'Modern Korean luxury villa in Gangnam, contemporary architecture, floor-to-ceiling windows, rooftop terrace, minimalist garden' },
  { lat: 37.5821, lng: 126.9623, category: 'luxury', district: '종로구 부암동', caption: 'Buam-dong Korean luxury home, traditional Korean aesthetic with modern comforts, stone wall, mature garden, mountain backdrop' },
  { lat: 37.3891, lng: 127.0923, category: 'luxury', district: '성남시 분당구', caption: 'Bundang luxury detached house, Western-Korean fusion design, large lot, professional landscaping, upscale suburb' },
  { lat: 37.5912, lng: 126.9678, category: 'luxury', district: '종로구 평창동', caption: 'Pyeongchang-dong modern mansion, 3-story concrete and glass, infinity pool visible, BMW in driveway, gated entrance' },
  { lat: 37.5378, lng: 127.0145, category: 'luxury', district: '용산구 한남동', caption: 'Hannam-dong diplomat residence area, European-style house, large garden, stone fence, security cameras, embassy nearby' },
  { lat: 37.5756, lng: 126.9589, category: 'luxury', district: '서대문구 홍은동', caption: 'Hongeun-dong premium house, modern Korean design, wood and stone exterior, terraced garden on hillside, city view' },
  { lat: 37.5034, lng: 127.0534, category: 'luxury', district: '강남구 청담동', caption: 'Cheongdam-dong luxury townhouse, minimalist white facade, private parking, designer landscaping, premium Gangnam location' },
  { lat: 37.5112, lng: 127.0289, category: 'luxury', district: '강남구 신사동', caption: 'Sinsa-dong luxury house, contemporary design with natural materials, roof garden, glass walls, Garosu-gil area' },
  { lat: 37.5867, lng: 126.9734, category: 'luxury', district: '종로구 평창동', caption: 'Traditional Korean hanok-inspired luxury house, curved tile roof, wooden columns, inner courtyard, modern amenities' },
  { lat: 37.4956, lng: 127.0612, category: 'luxury', district: '강남구 삼성동', caption: 'Samsung-dong luxury villa, 3-story modern, full glass southern facade, rooftop garden, Mercedes in garage, premium location' },
  { lat: 37.5445, lng: 127.0023, category: 'luxury', district: '용산구 이태원동', caption: 'Itaewon hill luxury house, international style, panoramic city view, swimming pool, multi-level terraced design' },
  { lat: 37.3956, lng: 127.1167, category: 'luxury', district: '성남시 분당구', caption: 'Pangyo luxury house, modern minimalist, large lot, professional landscaping, smart home features, tech suburb' },
  { lat: 37.5623, lng: 126.9712, category: 'luxury', district: '종로구 구기동', caption: 'Gugi-dong hillside luxury, traditional Korean wall with modern house inside, mature trees, quiet mountain neighborhood' },
  { lat: 37.5289, lng: 127.0178, category: 'luxury', district: '용산구 한남동', caption: 'Hannam THE HILL area luxury, modern architectural design, cantilevered structure, premium materials, gated community' },
  { lat: 37.5734, lng: 126.9478, category: 'luxury', district: '서대문구 연희동', caption: 'Yeonhui-dong professor neighborhood luxury house, brick and wood exterior, library visible through windows, scholarly area' },
  { lat: 37.4789, lng: 127.0389, category: 'luxury', district: '강남구 개포동', caption: 'Gaepo-dong luxury detached, 3-story contemporary, private elevator, home theater, wine cellar, exclusive Gangnam area' },
  { lat: 37.5512, lng: 127.0112, category: 'luxury', district: '용산구 보광동', caption: 'Bogwang-dong renovated luxury, old Korean house transformed into modern residence, mix of traditional and contemporary' },
  { lat: 37.6189, lng: 126.9345, category: 'luxury', district: '은평구 진관동', caption: 'Eunpyeong new town luxury house, Korean traditional village inspired, modern hanok, mountain view, quiet new development' },
  { lat: 37.4567, lng: 127.0089, category: 'luxury', district: '과천시', caption: 'Gwacheon luxury house near Seoul Grand Park, spacious lot, natural stone, Korean pine garden, government housing area' },
  { lat: 37.3734, lng: 127.0978, category: 'luxury', district: '용인시 수지구', caption: 'Suji hillside luxury villa, 3-story European Korean style, large garden, double garage, golf course view, wealthy suburb' },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. 한국 오피스텔/원룸 (15개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { lat: 37.5033, lng: 127.0498, category: 'officetel', district: '강남구 역삼동', caption: 'Korean officetel building, 15-story tall narrow tower, glass curtain wall, small unit windows in grid pattern, commercial ground floor, near subway station, Gangnam business district' },
  { lat: 37.5563, lng: 126.9723, category: 'officetel', district: '중구 충무로', caption: 'Korean urban officetel, 12-story mixed office-residential, modern facade, convenience store at ground, young professional housing' },
  { lat: 37.4743, lng: 126.8823, category: 'officetel', district: '광명시', caption: 'Suburban Korean officetel near KTX station, 20-story modern tower, commercial podium, transit-oriented development' },
  { lat: 37.5134, lng: 127.0589, category: 'officetel', district: '강남구 삼성동', caption: 'Premium Gangnam officetel, sleek modern design, floor-to-ceiling windows, lobby with concierge, rooftop amenities' },
  { lat: 37.5356, lng: 127.0045, category: 'officetel', district: '용산구 한강로', caption: 'Yongsan officetel near new development, 25-story modern tower, river view units, premium location, construction nearby' },
  { lat: 37.5478, lng: 126.9912, category: 'officetel', district: '중구 남대문로', caption: 'Central Seoul officetel, 18-story downtown, office-residential hybrid, bank at ground floor, business district' },
  { lat: 37.5023, lng: 127.0234, category: 'officetel', district: '서초구 서초동', caption: 'Seocho officetel complex, twin 20-story towers, commercial podium, gym and sauna facilities, professional area' },
  { lat: 37.5689, lng: 126.9256, category: 'officetel', district: '마포구 신촌동', caption: 'Sinchon student officetel, 12-story, small studio units, coin laundry at ground, near university, affordable' },
  { lat: 37.3912, lng: 127.1067, category: 'officetel', district: '분당구 서현동', caption: 'Bundang officetel, 22-story modern design, IT workers housing, cafe at lobby, well-connected transit' },
  { lat: 37.4834, lng: 126.8789, category: 'officetel', district: '구로구 디지털로', caption: 'Guro Digital Complex officetel, tech district housing, modern facade, shared amenities, young worker demographic' },
  { lat: 37.5234, lng: 126.8567, category: 'officetel', district: '양천구 목동', caption: 'Mokdong officetel, 15-story residential-office, modern suburban design, parking structure, family-oriented area' },
  { lat: 37.5812, lng: 127.0478, category: 'officetel', district: '동대문구 전농동', caption: 'Jeonnong officetel near university, 10-story budget design, small rooms, shared facilities, student rental market' },
  { lat: 37.6123, lng: 127.0634, category: 'officetel', district: '노원구 월계동', caption: 'Wolgye station officetel, 18-story transit-oriented, affordable housing, modern exterior, commuter convenience' },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. 한국 혼합용도 건물 (15개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { lat: 37.5447, lng: 126.9512, category: 'mixed', district: '용산구 이태원동', caption: 'Itaewon mixed-use building, 5-story, international restaurants and bars at ground floor, residential above, diverse architectural style, cosmopolitan neighborhood' },
  { lat: 37.5562, lng: 126.9366, category: 'mixed', district: '마포구 상수동', caption: 'Korean mixed-use development, cafe and design studio at ground floor, creative office on 2nd floor, residential loft above, renovated industrial' },
  { lat: 37.5103, lng: 127.0652, category: 'mixed', district: '강남구 삼성동', caption: 'Gangnam mixed-use complex, retail podium with luxury brands, office floors, residential penthouse at top, modern urban' },
  { lat: 37.5652, lng: 126.9834, category: 'mixed', district: '종로구 종로', caption: 'Historic Jongno mixed-use, traditional Korean commercial street building, modern renovation preserving historic elements' },
  { lat: 37.5489, lng: 127.0434, category: 'mixed', district: '성동구 성수동', caption: 'Seongsu mixed-use, converted factory building, co-working space, gallery cafe, loft apartments, exposed ductwork, trendy' },
  { lat: 37.5734, lng: 126.9189, category: 'mixed', district: '마포구 연남동', caption: 'Yeonnam-dong mixed-use, 4-story building, bookstore-cafe at ground, yoga studio 2nd floor, airbnb apartments above' },
  { lat: 37.5234, lng: 126.9345, category: 'mixed', district: '영등포구 여의도동', caption: 'Yeouido mixed-use tower, office building with residential floors at top, commercial podium, financial district location' },
  { lat: 37.4989, lng: 127.0378, category: 'mixed', district: '서초구 반포동', caption: 'Banpo mixed-use, 6-story, medical clinic and pharmacy at ground, hagwon academy 2-3F, residential duplex 4-6F' },
  { lat: 37.5623, lng: 127.0312, category: 'mixed', district: '성동구 행당동', caption: 'Haengdang mixed-use near station, convenience store and laundromat ground floor, small offices middle, studio apartments top' },
  { lat: 37.5178, lng: 127.0456, category: 'mixed', district: '강남구 역삼동', caption: 'Yeoksam mixed-use, 8-story modern building, WeWork-style co-working ground-3F, serviced apartments 4-8F, rooftop lounge' },
  { lat: 37.4834, lng: 127.0189, category: 'mixed', district: '서초구 양재동', caption: 'Yangjae mixed-use, 4-story near flower market, florist shop and cafe ground floor, art studio 2F, residential above' },
  { lat: 37.3978, lng: 127.1123, category: 'mixed', district: '분당구 판교동', caption: 'Pangyo mixed-use in tech valley, modern building with startup offices and residential units, rooftop garden, smart design' },
  { lat: 37.5534, lng: 126.9534, category: 'mixed', district: '용산구 한강로', caption: 'Yongsan development area mixed-use, new construction combining retail, office, and residential, modern glass and steel' },
  { lat: 37.5867, lng: 126.9423, category: 'mixed', district: '서대문구 북아현동', caption: 'Bukahyeon redevelopment mixed-use, new building replacing old neighborhood, commercial ground floor, apartments above, under construction nearby' },

  // ━━━ 추가 26개 (총 200개 달성) ━━━
  // 빌라 추가 8개
  { lat: 37.5423, lng: 127.0567, category: 'villa', district: '성동구 옥수동', caption: 'Oksu-dong Korean villa, 4-story near river, steep hillside, panoramic view, renovated exterior, premium location' },
  { lat: 37.5145, lng: 126.9178, category: 'villa', district: '영등포구 대림동', caption: 'Daerim-dong multicultural neighborhood villa, 4-story, Chinese and Korean signage, vibrant street, diverse tenants' },
  { lat: 37.6345, lng: 127.0123, category: 'villa', district: '강북구 번동', caption: 'Beon-dong Korean villa, 3-story compact design, narrow lot, shared wall with neighbor, typical dense urban housing' },
  { lat: 37.5534, lng: 127.0278, category: 'villa', district: '성동구 금호동', caption: 'Geumho-dong hilltop villa, 4-story with city view, concrete retaining wall, external staircase, artist neighborhood' },
  { lat: 37.4534, lng: 126.9567, category: 'villa', district: '관악구 인헌동', caption: 'Inheon-dong Korean villa near SNU, 3-story student housing, basic design, many delivery boxes, academic area' },
  { lat: 37.5956, lng: 127.0534, category: 'villa', district: '동대문구 회기동', caption: 'Hoegi Korean villa near Kyunghee Univ, 4-story, cafe at ground, student rooms above, campus neighborhood' },
  { lat: 37.4412, lng: 127.0489, category: 'villa', district: '강남구 세곡동', caption: 'Segok-dong new Korean villa, 4-story modern, clean design, new residential development, suburban Gangnam' },
  { lat: 37.6789, lng: 127.0612, category: 'villa', district: '노원구 공릉동', caption: 'Gongneung Korean villa near Seoul Tech, 4-story student housing, aging exterior, bicycle parking, affordable area' },
  // 아파트 추가 7개
  { lat: 37.5134, lng: 127.0912, category: 'apartment', district: '송파구 방이동', caption: 'Bangi Olympic apartment complex, 15-story 1988 Olympics housing, renovated facade, Olympic Park nearby, historic complex' },
  { lat: 37.5489, lng: 126.9489, category: 'apartment', district: '용산구 용산동', caption: 'Yongsan park apartment, 20-story near new national park, premium location, modern renovation, city center' },
  { lat: 37.4489, lng: 126.7234, category: 'apartment', district: '인천시 연수구', caption: 'Songdo international city apartment, 40-story supertall tower, glass facade, waterfront location, smart city' },
  { lat: 37.3567, lng: 127.0534, category: 'apartment', district: '용인시 처인구', caption: 'Yongin outer suburb apartment, 20-story standard Korean complex, agricultural surroundings, commuter housing' },
  { lat: 37.7012, lng: 127.0456, category: 'apartment', district: '의정부시 민락동', caption: 'Minrak new town apartment, 30-story modern towers, brand new development, wide roads, mountain backdrop' },
  { lat: 37.5012, lng: 127.0067, category: 'apartment', district: '서초구 잠원동', caption: 'Jamwon riverside apartment, 18-story Han River view, premium Seocho location, established wealthy neighborhood' },
  { lat: 37.5345, lng: 126.9012, category: 'apartment', district: '영등포구 여의도동', caption: 'Yeouido apartment, 35-story landmark tower, Han River panorama, full amenities, financial district residential' },
  // 상가 추가 6개
  { lat: 37.5756, lng: 126.9889, category: 'commercial', district: '종로구 대학로', caption: 'Daehak-ro theater district commercial, 4-story, small theater entrance, poster-covered walls, cultural landmark area' },
  { lat: 37.5189, lng: 127.0412, category: 'commercial', district: '강남구 역삼동', caption: 'Yeoksam IT commercial building, 5-story, startup offices, coding bootcamp sign, rooftop restaurant, tech corridor' },
  { lat: 37.4489, lng: 126.9534, category: 'commercial', district: '관악구 신림동', caption: 'Sillim test-prep district commercial, 4-story, 공무원학원 academy signs, study cafe, budget restaurant, exam culture' },
  { lat: 37.5812, lng: 126.9178, category: 'commercial', district: '마포구 망원동', caption: 'Mangwon-dong trendy commercial, 3-story, artisan bakery, indie bookstore, ceramic studio, hipster neighborhood' },
  { lat: 37.5012, lng: 127.0145, category: 'commercial', district: '서초구 서초동', caption: 'Seoul Central District Court area commercial, 4-story, law offices, legal bookstore, professional services, court district' },
  { lat: 37.4734, lng: 126.9178, category: 'commercial', district: '금천구 가산동', caption: 'Gasan outlet mall area commercial, modern retail building, fashion outlet signage, food court, suburban shopping' },
  // 고급주택 추가 2개
  { lat: 37.5856, lng: 126.9734, category: 'luxury', district: '종로구 삼청동', caption: 'Samcheong-dong luxury house, traditional hanok neighborhood, modern renovation behind historic wall, gallery nearby, cultural elite area' },
  { lat: 37.5289, lng: 127.0345, category: 'luxury', district: '강남구 압구정동', caption: 'Apgujeong luxury townhouse, 3-story modern minimalist, private parking, designer landscaping, Rodeo Street nearby, premium Gangnam' },
  // 오피스텔 추가 2개  
  { lat: 37.5278, lng: 126.9234, category: 'officetel', district: '영등포구 여의도동', caption: 'Yeouido financial district officetel, 25-story premium tower, panoramic river view, doorman service, corporate housing' },
  { lat: 37.3812, lng: 127.1178, category: 'officetel', district: '분당구 판교동', caption: 'Pangyo tech valley officetel, 20-story modern, IT worker housing, shared workspace at ground, smart building' },
  // 혼합 추가 1개
  { lat: 37.5412, lng: 127.0567, category: 'mixed', district: '성동구 성수동', caption: 'Seongsu creative hub mixed-use, converted shoe factory, design studio, organic cafe, rooftop event space, industrial chic' },
]
