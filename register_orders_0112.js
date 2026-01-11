const orders = [
  {
    order_type: "container_import",
    billing_company: "제이디쉬핑라인",
    shipper: "바스엔",
    work_site: "인천 서구 원당대로 395-99(오류동)",
    contact_person: "이진완 과장님",
    contact_phone: "010-9355-8283",
    work_datetime: "2026-01-12 08:30",
    bl_number: "CULVXMN2502002 - XMLINC2502003",
    container_size: "40HC",
    container_number: "TXGU5416977",
    shipping_line: "CUL 벤라인 (BEN)",
    loading_location: "한진인천",
    unloading_location: "한진인천",
    dispatch_company: "태성",
    vehicle_info: "경기98아1013 / 전철수 기사님 / 010-8224-7520",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "프리타임 11일", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "에이원",
    shipper: "블루망고커머셜",
    work_site: "부산 강서구 식만로 33-17 / DS 글로벌",
    contact_person: "이정민 대표님",
    contact_phone: "010-7117-1511",
    work_datetime: "2026-01-12 14:00",
    booking_number: "PUS26A01984",
    container_size: "40RH",
    container_number: "",
    seal_number: "",
    shipping_line: "NSL",
    vessel_name: "SUNNY LAVENDER (KSVD-02) / 2601S",
    export_country: "BUSAN - MANILA(PHMNL)",
    berth_date: "1-13",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "세화",
    vehicle_info: "",
    status: "pending",
    weighing_required: 0,
    remarks: [
      { content: "-20'C / 환풍기 클로즈 / 발전기 부착 & 가동하여 운송 요망", importance: 2 },
      { content: "PTI -> 남성해운에서 직접 오더 <픽업 지정일 : 1/09>", importance: 1 },
      { content: "남성해운 DEM 5일 제공", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "교범해운항공",
    shipper: "심텍",
    work_site: "경남 양산시 상북면 상삼리 785",
    contact_person: "",
    contact_phone: "",
    work_datetime: "2026-01-12 09:00",
    booking_number: "HASLK01251206492",
    container_size: "40HC",
    container_number: "SKHU9321812",
    tw: "3,840 KGS",
    seal_number: "164206",
    shipping_line: "HAS",
    vessel_name: "HOCHIMINH VOYAGER(HMVY-01) / 2601S",
    export_country: "BUSAN - PENANG/ GEORGETOWN (MYPEN)",
    berth_date: "1-12",
    loading_location: "BIT",
    unloading_location: "BIT",
    dispatch_company: "부강",
    vehicle_info: "부산99사7858 / 조성래 기사님 / 010-5157-8684",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "DG", importance: 2 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "교범해운항공",
    shipper: "심텍",
    work_site: "경남 양산시 상북면 상삼리 785",
    contact_person: "",
    contact_phone: "",
    work_datetime: "2026-01-12 09:50",
    booking_number: "HASLK01251206492",
    container_size: "40HC",
    container_number: "HLHU8464299",
    tw: "3,700 KGS",
    seal_number: "HAL063880",
    shipping_line: "HAS",
    vessel_name: "HOCHIMINH VOYAGER(HMVY-01) / 2601S",
    export_country: "BUSAN - PENANG/ GEORGETOWN (MYPEN)",
    berth_date: "1-12",
    loading_location: "BIT",
    unloading_location: "BIT",
    dispatch_company: "부강",
    vehicle_info: "경남99바2136 / 최인섭 기사님 / 010-3693-4527",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "DG", importance: 2 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "교범해운항공",
    shipper: "심텍",
    work_site: "경남 양산시 상북면 상삼리 785",
    contact_person: "",
    contact_phone: "",
    work_datetime: "2026-01-12 12:50",
    booking_number: "HASLK01251208798",
    container_size: "40HC",
    container_number: "",
    seal_number: "",
    shipping_line: "HAS",
    vessel_name: "HOCHIMINH VOYAGER / 2601S",
    export_country: "",
    berth_date: "1-11",
    loading_location: "BIT",
    unloading_location: "BIT",
    dispatch_company: "부강",
    vehicle_info: "",
    status: "pending",
    weighing_required: 0,
    remarks: [
      { content: "DG", importance: 2 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "교범해운항공",
    shipper: "심텍",
    work_site: "경남 양산시 상북면 상삼리 785",
    contact_person: "",
    contact_phone: "",
    work_datetime: "2026-01-12 13:00",
    booking_number: "HASLK01251208798",
    container_size: "20GP",
    container_number: "",
    seal_number: "",
    shipping_line: "HAS",
    vessel_name: "HOCHIMINH VOYAGER / 2601S",
    export_country: "",
    berth_date: "1-11",
    loading_location: "BIT",
    unloading_location: "BIT",
    dispatch_company: "부강",
    vehicle_info: "",
    status: "pending",
    weighing_required: 0,
    remarks: [
      { content: "DG", importance: 2 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "오.에스.티",
    shipper: "I BOXEZZ",
    work_site: "충남 아산시 탕정면 선문로 254번길 72",
    contact_person: "최홍근 사장님",
    contact_phone: "010-4326-1222",
    work_datetime: "2026-01-12 14:00",
    booking_number: "SEL6A0721400",
    container_size: "40HC",
    container_number: "",
    seal_number: "",
    shipping_line: "SML",
    vessel_name: "STARSHIP TAURUS(NSST-02) / 2602S",
    export_country: "INCHEON - SHEKOU, HUANGDONG(CNSHK)",
    berth_date: "1-17",
    loading_location: "SNCT",
    unloading_location: "SNCT",
    dispatch_company: "태성",
    vehicle_info: "",
    status: "pending",
    weighing_required: 0,
    remarks: []
  },
  {
    order_type: "container_export",
    billing_company: "엠투닉스",
    shipper: "엠투닉스",
    work_site: "경기도 김포시 월곳면 갈산리 518-31",
    contact_person: "신상훈 이사님",
    contact_phone: "010-4138-5382",
    work_datetime: "2026-01-12 09:00",
    booking_number: "CMC26010807",
    container_size: "40HC",
    container_number: "HPCU4613069",
    tw: "3,700 KGS",
    seal_number: "224198",
    shipping_line: "HAD HDASCO",
    vessel_name: "ZHI YING HE SHUN(ZYHS-1) / APS1237",
    export_country: "BUSAN - TAICANG(CNTAG)",
    berth_date: "1-15",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "부강",
    vehicle_info: "부산99사3894 / 옥재성 기사님 / 010-2988-7831",
    status: "completed",
    weighing_required: 1,
    remarks: [
      { content: "공만차 계근진행건 ( KGS)", importance: 2 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "삼진해운",
    shipper: "니프코 울산",
    work_site: "LG 안산공장 - 경기도 안산시 단원구 해봉로 352 ( 신길동 ) 반월공단 14B 3L",
    contact_person: "한봉암 과장님",
    contact_phone: "010-6238-3077",
    work_datetime: "2026-01-12 09:00",
    booking_number: "005FX33500",
    container_size: "20GP",
    container_number: "WHSU2922835",
    tw: "2,190 KGS",
    seal_number: "WHA1210235",
    shipping_line: "WHL",
    vessel_name: "WAN HAI 521(W521-01) / W038",
    export_country: "BUSAN - CHENNAI,INDIA(INMAA)",
    berth_date: "1-14",
    loading_location: "인천",
    unloading_location: "DGT",
    dispatch_company: "천일",
    vehicle_info: "경기99바9259 / 이승재 기사님 / 010-8103-3828",
    status: "completed",
    weighing_required: 1,
    remarks: [
      { content: "인천픽업비용", importance: 1 },
      { content: "공만차 계근", importance: 2 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "삼진해운",
    shipper: "니프코 울산",
    work_site: "LG 안산공장 - 경기도 안산시 단원구 해봉로 352 ( 신길동 ) 반월공단 14B 3L",
    contact_person: "한봉암 과장님",
    contact_phone: "010-6238-3077",
    work_datetime: "2026-01-12 10:00",
    booking_number: "SELA32413710",
    container_size: "40HC",
    container_number: "KOCU5115138",
    tw: "3,700 KGS",
    seal_number: "25H0367809",
    shipping_line: "HMM",
    vessel_name: "HYUNDAI TOKYO / 0161W",
    export_country: "BUSAN - KAYYUPALLI, CHENNAI (INKAT)",
    berth_date: "1-21",
    loading_location: "부곡",
    unloading_location: "HPNT",
    dispatch_company: "양양",
    vehicle_info: "경기99바1135 / 김동순 기사님 / 010-3726-2338",
    status: "completed",
    weighing_required: 1,
    remarks: [
      { content: "공만차 계근", importance: 2 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "예스지투엠",
    shipper: "예스지투엠",
    work_site: "부산시 기장군 정관읍 용수공단 2길 34",
    contact_person: "사무실",
    contact_phone: "051-517-2444",
    work_datetime: "2026-01-12 13:00",
    booking_number: "SELM92437300",
    container_size: "40HC",
    container_number: "",
    seal_number: "",
    shipping_line: "HMM",
    vessel_name: "HYUNDAI SATURN(OTST-01) / 0051E",
    export_country: "BUSAN - NEW YORK,NY (USNY2)",
    berth_date: "1-14",
    loading_location: "HPNT",
    unloading_location: "HPNT",
    dispatch_company: "부강",
    vehicle_info: "",
    status: "pending",
    weighing_required: 1,
    remarks: [
      { content: "계근진행건", importance: 2 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "예스지투엠",
    shipper: "예스지투엠",
    work_site: "부산시 기장군 정관읍 용수공단 2길 34",
    contact_person: "사무실",
    contact_phone: "051-517-2444",
    work_datetime: "2026-01-12 15:00",
    booking_number: "SELM72785100",
    container_size: "40HC",
    container_number: "",
    seal_number: "",
    shipping_line: "HMM",
    vessel_name: "HMM OPAL(HOOP-002) / 0009E",
    export_country: "BUSAN - LONG BEACH, CA (USLB6)",
    berth_date: "1-16",
    loading_location: "HPNT",
    unloading_location: "HPNT",
    dispatch_company: "부강",
    vehicle_info: "",
    status: "pending",
    weighing_required: 1,
    remarks: [
      { content: "계근진행건", importance: 2 }
    ]
  },
  {
    order_type: "lcl",
    billing_company: "삼진해운",
    shipper: "건화이엔지",
    work_site: "부산광역시 강서구 신항로 96-72(성북동)",
    contact_person: "김도훈 차장님",
    contact_phone: "051-466-3372, 010-4464-1127",
    work_datetime: "2026-01-12 14:00",
    shipping_line: "ONE",
    loading_location: "건화이엔지 2공장 / 경북 경산시 진량읍 공단 5로 13",
    unloading_location: "비아이디씨 / 부산광역시 강서구 신항로 96-72(성북동)",
    dispatch_company: "유진로직스",
    vehicle_info: "",
    status: "pending",
    weighing_required: 0,
    remarks: [
      { content: "상차일: 2026.01.12 14:00", importance: 1 },
      { content: "하차일: 2026.01.13 10:00", importance: 1 },
      { content: "상차지 담당자: 이준호 매니저님 / 010-4857-6385", importance: 1 },
      { content: "BKG : SELF9839600 / 40HC*1", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "마리타임허브",
    shipper: "쿠쿠전자",
    work_site: "쿠쿠전자 2공장 (경남 양산시 충렬로 143)",
    contact_person: "이수권 기장님",
    contact_phone: "010-5027-2573",
    work_datetime: "2026-01-12 08:20",
    booking_number: "HASLK02260100223",
    container_size: "40HC",
    container_number: "SEKU4426195",
    tw: "3,700 KGS",
    seal_number: "HAL063868",
    shipping_line: "HAS",
    vessel_name: "HEUNG-A JANICE(HAJN-03) / 2602W",
    export_country: "BUSAN - QINGDAO(CNTAO)",
    berth_date: "1-19",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "부강",
    vehicle_info: "부산99사9560 / 조영진 기사님 / 010-3556-1555",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "QINGDAO", importance: 1 },
      { content: "시간엄수", importance: 2 }
    ]
  },
  {
    order_type: "lcl",
    billing_company: "스마트해운항공",
    shipper: "JS GLOTECH",
    work_site: "부산시 남구 북항로 179 (감만동) 허치슨터미널 CFS 2층",
    contact_person: "인철 팀장",
    contact_phone: "051-630-8436",
    work_datetime: "2026-01-12 09:00",
    shipping_line: "NSL",
    loading_location: "세계수출포장 / 강서구 공항로 361번길 8",
    unloading_location: "장풍CFS 신감만보세 창고 / 장치장 코드: 03006049 /부산시 남구 북항로 179 (감만동) 허치슨터미널 CFS 2층",
    dispatch_company: "유진로직스",
    vehicle_info: "",
    status: "pending",
    weighing_required: 0,
    remarks: [
      { content: "상차일: 2026.01.12 오전", importance: 1 },
      { content: "하차일: 2026.01.12 오후", importance: 1 },
      { content: "차량: 5톤", importance: 1 },
      { content: "상차지 연락처: 010-5430-1333", importance: 1 },
      { content: "3,635.00 kg & 9,823 cbm, 6 wooden boxes", importance: 1 },
      { content: "청구 14만", importance: 1 }
    ]
  },
  {
    order_type: "lcl",
    billing_company: "스마트해운항공",
    shipper: "JS GLOTECH",
    work_site: "부산시 남구 북항로 179 (감만동) 허치슨터미널 CFS 2층",
    contact_person: "인철 팀장",
    contact_phone: "051-630-8436",
    work_datetime: "2026-01-12 09:00",
    shipping_line: "NSL",
    loading_location: "비에이치테크 / 경남 김해시 진례면 하이테크로 68",
    unloading_location: "장풍CFS 신감만보세 창고 / 장치장 코드: 03006049 /부산시 남구 북항로 179 (감만동) 허치슨터미널 CFS 2층",
    dispatch_company: "유진로직스",
    vehicle_info: "",
    status: "pending",
    weighing_required: 0,
    remarks: [
      { content: "상차일: 2026.01.12 오전", importance: 1 },
      { content: "하차일: 2026.01.12 오후", importance: 1 },
      { content: "차량: 1.5톤", importance: 1 },
      { content: "상차지 담당자: 한상백 / 010-4408-0876", importance: 1 },
      { content: "1,170.00 kg & 0,880 cbm, 1 wooden box", importance: 1 },
      { content: "청구 10만", importance: 1 }
    ]
  },
  {
    order_type: "lcl",
    billing_company: "스마트해운항공",
    shipper: "JS GLOTECH",
    work_site: "부산시 남구 북항로 179 (감만동) 허치슨터미널 CFS 2층",
    contact_person: "인철 팀장",
    contact_phone: "051-630-8436",
    work_datetime: "2026-01-12 09:00",
    shipping_line: "NSL",
    loading_location: "진성메탈 / 창원시 성산구 공단로 166번길 13-22",
    unloading_location: "장풍CFS 신감만보세 창고 / 장치장 코드: 03006049 /부산시 남구 북항로 179 (감만동) 허치슨터미널 CFS 2층",
    dispatch_company: "유진로직스",
    vehicle_info: "",
    status: "pending",
    weighing_required: 0,
    remarks: [
      { content: "상차일: 2026.01.12 오전", importance: 1 },
      { content: "하차일: 2026.01.12 오후", importance: 1 },
      { content: "차량: 5톤", importance: 1 },
      { content: "상차지 담당자: 강인철 이사님 / 010-3874-9051", importance: 1 },
      { content: "4,598.50 kg & 3,690 cbm, 11 bundles", importance: 1 },
      { content: "청구 18만", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "로커스로지스틱스",
    shipper: "인피니타스",
    work_site: "디앤케이물류㈜ 부산 남구 신선로 294, 부산항터미널 신선대 CFS 24번창고 1층",
    contact_person: "진예진 계장님",
    contact_phone: "070-4887-2098",
    work_datetime: "2026-01-12 14:00",
    bl_number: "SITGWUPUG15916",
    container_size: "40HC",
    container_number: "TRHU5783443",
    shipping_line: "SITC",
    loading_location: "",
    unloading_location: "",
    dispatch_company: "디앤케이물류",
    vehicle_info: "",
    status: "pending",
    weighing_required: 0,
    remarks: [
      { content: "CFS 적출작업건", importance: 1 }
    ]
  },
  {
    order_type: "lcl",
    billing_company: "로커스로지스틱스",
    shipper: "인피니타스",
    work_site: "부산 강서구 녹산산업북로 433",
    contact_person: "",
    contact_phone: "",
    work_datetime: "2026-01-12 13:00",
    shipping_line: "SITC",
    loading_location: "디앤케이물류㈜ 부산 남구 신선로 294, 부산항터미널 신선대 CFS 24번창고 1층",
    unloading_location: "부산 강서구 녹산산업북로 433",
    dispatch_company: "",
    vehicle_info: "",
    status: "pending",
    weighing_required: 0,
    remarks: [
      { content: "상차일: 2026.01.12 13시 적출 상차", importance: 1 },
      { content: "하차일: 2026.01.12 하차", importance: 1 },
      { content: "차량: 5톤", importance: 1 },
      { content: "상차지 담당자: 진예진 계장님 / 070-4887-2098", importance: 1 },
      { content: "BL : SITGWUPUG15916", importance: 1 },
      { content: "컨테이너 넘버 / SIZE : TRHU5783443 / 40HC", importance: 1 },
      { content: "청구 :16만", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "지엠씨로지스틱스",
    shipper: "윌트레이드",
    work_site: "대구광역시 서구 와룡로 73길 40, C동(중리동)",
    contact_person: "",
    contact_phone: "053-558-0400",
    work_datetime: "2026-01-12 07:30",
    bl_number: "HASLC01251225117",
    container_size: "20GP",
    container_number: "SKLU2400076",
    tw: "7,176 KG",
    shipping_line: "HAS",
    loading_location: "BIT",
    unloading_location: "BIT",
    dispatch_company: "백승운수",
    vehicle_info: "충북98바1550 / 최세진기사 / 010-4112-7233",
    status: "completed",
    weighing_required: 0,
    remarks: []
  },
  {
    order_type: "container_import",
    billing_company: "예일해운항공",
    shipper: "류테크",
    work_site: "대구광역시 달서구 대천동 688",
    contact_person: "김현주",
    contact_phone: "010-3548-6423",
    work_datetime: "2026-01-12 10:00",
    bl_number: "SNKO03K251202926",
    container_size: "20GP",
    container_number: "HALU2306393",
    tw: "7,176 KG",
    shipping_line: "HAS",
    loading_location: "허치슨",
    unloading_location: "허치슨",
    dispatch_company: "백승운수",
    vehicle_info: "충북98바1550 / 최세진기사 / 010-4112-7233",
    status: "completed",
    weighing_required: 0,
    remarks: []
  }
];

async function registerOrders() {
  console.log(`🚀 총 ${orders.length}건의 오더를 등록합니다...\n`);
  
  let successCount = 0;
  let failCount = 0;
  const failures = [];

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    try {
      const response = await fetch('https://transport-system-f56.pages.dev/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      successCount++;
      console.log(`✅ [${i+1}/${orders.length}] ${order.billing_company} - ${order.shipper} (ID: ${result.orderId})`);
    } catch (error) {
      failCount++;
      const errorMsg = `❌ [${i+1}/${orders.length}] ${order.billing_company} - ${order.shipper}: ${error.message}`;
      console.error(errorMsg);
      failures.push({ index: i+1, order, error: error.message });
    }
  }

  console.log(`\n📊 등록 완료!`);
  console.log(`✅ 성공: ${successCount}건`);
  console.log(`❌ 실패: ${failCount}건`);

  if (failures.length > 0) {
    console.log(`\n⚠️  실패 내역:`);
    failures.forEach(f => {
      console.log(`[${f.index}] ${f.order.billing_company} - ${f.order.shipper}: ${f.error}`);
    });
  }
}

registerOrders();
