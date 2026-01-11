const orders = [
  {
    order_type: "container_export",
    billing_company: "에이원",
    shipper: "블루망고커머셜",
    work_site: "경상북도 경산시 진량읍 현내길 76-6 / 경북통상",
    contact_person: "박진석 과장님",
    contact_phone: "010-3328-1208",
    work_datetime: "2026-01-09 13:00",
    booking_number: "PUS26A01982",
    container_size: "40RH",
    container_number: "BMOU9242985",
    tw: "4,420 KG",
    seal_number: "NSL555208",
    shipping_line: "NSL",
    vessel_name: "SUNNY LAVENDER(KSVD-02) / 2601S",
    export_country: "BUSAN - MANILA(PHMNL)",
    berth_date: "1-13",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "세화",
    vehicle_info: "부산98사7463 / 송병국 기사님 / 010-5744-8879",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "-20'C / 환풍기 클로즈 / 발전기 부착 & 가동하여 운송 요망", importance: 2 },
      { content: "PTI -> 남성해운에서 직접 오더 <픽업 지정일 : 1/09>", importance: 1 },
      { content: "남성해운 DEM 5일 제공", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "스마트해운항공",
    shipper: "현대사이트솔루션",
    work_site: "㈜조은수출포장/ 경북 경주시 외동읍 문구로 63-5",
    contact_person: "우조원과장님",
    contact_phone: "010-6496-1602, 054-771-2965",
    work_datetime: "2026-01-09 09:00",
    booking_number: "KR04296260",
    container_size: "40HC",
    container_number: "FCIU7537706",
    tw: "3,700 KGS",
    seal_number: "KSC655898",
    shipping_line: "KMD",
    vessel_name: "SUNNY ACACIA (KSAC-01) / 2601S",
    export_country: "BUSAN - SHANGHAI(CNSHA)",
    berth_date: "1-12",
    loading_location: "허치슨",
    unloading_location: "허치슨",
    dispatch_company: "에스지로",
    vehicle_info: "부산99사3953 / 이광호 기사님 / 010-3552-6907",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "청구 : 319,000원 (북항기준)", importance: 1 },
      { content: "선반입권 구매 (48,000원 // VAT 포함 - 52,800원)", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "에이에스로지스틱스",
    shipper: "영진토탈",
    work_site: "부산 기장군 장안읍 협동로 171",
    contact_person: "김정우 대표님",
    contact_phone: "010-3846-9431",
    work_datetime: "2026-01-09 09:00",
    bl_number: "SNKO03K251202907",
    container_size: "40HC",
    container_number: "HALU5675380",
    shipping_line: "SKR",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "부강",
    vehicle_info: "경남99바4305 / 이명수 기사님 / 010-3887-2881",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "40HC*10 중 1번째", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "에이에스로지스틱스",
    shipper: "영진토탈",
    work_site: "부산 기장군 장안읍 협동로 171",
    contact_person: "김정우 대표님",
    contact_phone: "010-3846-9431",
    work_datetime: "2026-01-09 09:20",
    bl_number: "SNKO03K251202907",
    container_size: "40HC",
    container_number: "HLHU6406159",
    shipping_line: "SKR",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "부강",
    vehicle_info: "부산99사2724 / 정보국 기사님 / 010-6707-3817",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "40HC*10 중 2번째", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "에이에스로지스틱스",
    shipper: "영진토탈",
    work_site: "부산 기장군 장안읍 협동로 171",
    contact_person: "김정우 대표님",
    contact_phone: "010-3846-9431",
    work_datetime: "2026-01-09 09:40",
    bl_number: "SNKO03K251202907",
    container_size: "40HC",
    container_number: "HLHU8104100",
    shipping_line: "SKR",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "부강",
    vehicle_info: "부산99사6862 / 김차암 기사님 / 010-3556-1316",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "40HC*10 중 3번째", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "에이에스로지스틱스",
    shipper: "영진토탈",
    work_site: "부산 기장군 장안읍 협동로 171",
    contact_person: "김정우 대표님",
    contact_phone: "010-3846-9431",
    work_datetime: "2026-01-09 10:00",
    bl_number: "SNKO03K251202907",
    container_size: "40HC",
    container_number: "HLHU8301394",
    shipping_line: "SKR",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "부강",
    vehicle_info: "부산98바7103 / 장병화 기사님 / 010-4597-8353",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "40HC*10 중 4번째", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "에이에스로지스틱스",
    shipper: "영진토탈",
    work_site: "부산 기장군 장안읍 협동로 171",
    contact_person: "김정우 대표님",
    contact_phone: "010-3846-9431",
    work_datetime: "2026-01-09 10:20",
    bl_number: "SNKO03K251202907",
    container_size: "40HC",
    container_number: "HLHU8358996",
    shipping_line: "SKR",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "부강",
    vehicle_info: "부산98사1958 / 김재규 기사님 / 010-5440-7149",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "40HC*10 중 5번째", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "에이에스로지스틱스",
    shipper: "영진토탈",
    work_site: "부산 기장군 장안읍 협동로 171",
    contact_person: "김정우 대표님",
    contact_phone: "010-3846-9431",
    work_datetime: "2026-01-09 10:40",
    bl_number: "SNKO03K251202907",
    container_size: "40HC",
    container_number: "HLHU8372145",
    shipping_line: "SKR",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "부강",
    vehicle_info: "부산98바7236 / 유상근 기사님 / 010-9074-4736",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "40HC*10 중 6번째", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "에이에스로지스틱스",
    shipper: "영진토탈",
    work_site: "부산 기장군 장안읍 협동로 171",
    contact_person: "김정우 대표님",
    contact_phone: "010-3846-9431",
    work_datetime: "2026-01-09 11:00",
    bl_number: "SNKO03K251202907",
    container_size: "40HC",
    container_number: "SKHU6349159",
    shipping_line: "SKR",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "부강",
    vehicle_info: "부산98바7145 / 김건호 기사님 / 010-3890-7145",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "40HC*10 중 7번째", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "에이에스로지스틱스",
    shipper: "영진토탈",
    work_site: "부산 기장군 장안읍 협동로 171",
    contact_person: "김정우 대표님",
    contact_phone: "010-3846-9431",
    work_datetime: "2026-01-09 11:20",
    bl_number: "SNKO03K251202907",
    container_size: "40HC",
    container_number: "SKHU6390569",
    shipping_line: "SKR",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "부강",
    vehicle_info: "경남99사2150 / 전용진 기사님 / 010-3550-7274",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "40HC*10 중 8번째", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "에이에스로지스틱스",
    shipper: "영진토탈",
    work_site: "부산 기장군 장안읍 협동로 171",
    contact_person: "김정우 대표님",
    contact_phone: "010-3846-9431",
    work_datetime: "2026-01-09 11:40",
    bl_number: "SNKO03K251202907",
    container_size: "40HC",
    container_number: "SKHU9316797",
    shipping_line: "SKR",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "부강",
    vehicle_info: "부산98나3313 / 심규진 기사님 / 010-2335-8564",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "40HC*10 중 9번째", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "에이에스로지스틱스",
    shipper: "영진토탈",
    work_site: "부산 기장군 장안읍 협동로 171",
    contact_person: "김정우 대표님",
    contact_phone: "010-3846-9431",
    work_datetime: "2026-01-09 12:00",
    bl_number: "SNKO03K251202907",
    container_size: "40HC",
    container_number: "SKHU9526540",
    shipping_line: "SKR",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "부강",
    vehicle_info: "부산98어4989 / 정병철 기사님 / 010-4549-8889",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "40HC*10 중 10번째 (완료)", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "스마트해운항공",
    shipper: "ISP COMPANY",
    work_site: "",
    contact_person: "",
    contact_phone: "",
    work_datetime: "2026-01-09 00:00",
    booking_number: "SNKO010260102386",
    container_size: "",
    container_number: "",
    seal_number: "",
    shipping_line: "SKR",
    vessel_name: "NAGOYA TRADER 2602W",
    export_country: "",
    berth_date: "",
    loading_location: "평택",
    unloading_location: "평택",
    dispatch_company: "다원",
    vehicle_info: "",
    status: "pending",
    weighing_required: 0,
    remarks: [
      { content: "차대번호 JTNAEACH2S8047995 (12/3 입고)", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "스마트해운항공",
    shipper: "ISP COMPANY",
    work_site: "",
    contact_person: "",
    contact_phone: "",
    work_datetime: "2026-01-09 00:00",
    booking_number: "SNKO010260101203",
    container_size: "",
    container_number: "",
    seal_number: "",
    shipping_line: "SKR",
    vessel_name: "NAGOYA TRADER 2605W",
    export_country: "",
    berth_date: "",
    loading_location: "평택",
    unloading_location: "평택",
    dispatch_company: "다원",
    vehicle_info: "",
    status: "pending",
    weighing_required: 0,
    remarks: [
      { content: "차대번호 JTNAEACHXS8050143 (10/17 입고)", importance: 1 }
    ]
  },
  {
    order_type: "lcl",
    billing_company: "솔루션팩",
    shipper: "앱티브",
    work_site: "충남 아산시 둔포면 아산밸리중앙로 154-30",
    contact_person: "김희찬 주임님",
    contact_phone: "010-7332-7578",
    work_datetime: "2026-01-09 09:00",
    shipping_line: "xxxx",
    loading_location: "디앤케이물류㈜ / 부산 남구 신선로 294, 부산항터미널 신선대 CFS 24번창고 1층",
    unloading_location: "앱티브 / 충남 아산시 둔포면 아산밸리중앙로 154-30",
    dispatch_company: "유진로직스",
    vehicle_info: "경기92아7921 / 정석준 기사님 / 010-3809-0951",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "상차일: 2026.01.09 오전 상차", importance: 1 },
      { content: "하차일: 2026.01.09 오후 하차", importance: 1 },
      { content: "차량: 11톤", importance: 1 },
      { content: "상차지 담당자: 진예진 계장님 / 070-4887-2098", importance: 1 },
      { content: "BL : CZOEOD25120030", importance: 1 },
      { content: "TCKU6159990/ES02062292(40`HC/5,649.000/15.360CBM/16PKG)", importance: 1 },
      { content: "1.2*0.8*1M ( 이단적재 불가능 ) , 16PKG", importance: 2 },
      { content: "인수증 체크", importance: 2 },
      { content: "하불 40.9만", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "더블유에스엘조인해운",
    shipper: "포켄스",
    work_site: "경기도 안성시 공단2로 100(신소현동) 포켄스",
    contact_person: "최진실 사원님",
    contact_phone: "010-3015-4557, 031-676-0861",
    work_datetime: "2026-01-09 14:30",
    booking_number: "HASLK02251201135",
    container_size: "20GP",
    container_number: "SKLU1624493",
    tw: "2,240 KGS",
    seal_number: "HAL094125",
    shipping_line: "HAS",
    vessel_name: "DONGJIN VENUS(DJVS-02) / 0315S",
    export_country: "BUSAN / TOKYO (JPTYO)",
    berth_date: "1-13",
    loading_location: "부곡 / KBCT",
    unloading_location: "KBCT",
    dispatch_company: "양양",
    vehicle_info: "경기99바1156 / 용우식 기사님 / 010-9181-0372",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "청구 : 755,000 , 하불 : 691,100", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "지엘에스코퍼레이션",
    shipper: "엠제이솔루션",
    work_site: "경남 김해시 칠산로 128-1 / 롯데김해물류센터",
    contact_person: "",
    contact_phone: "010-4830-9564",
    work_datetime: "2026-01-09 10:00",
    bl_number: "ONEYTAOFP811940",
    container_size: "40HC",
    container_number: "CAAU8792304",
    shipping_line: "ONE",
    loading_location: "",
    unloading_location: "",
    dispatch_company: "금길",
    vehicle_info: "부산98사2668 / 이강현 기사님 / 010-3780-0862",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "10시 차량", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "지엘에스코퍼레이션",
    shipper: "엠제이솔루션",
    work_site: "경남 김해시 칠산로 128-1 / 롯데김해물류센터",
    contact_person: "",
    contact_phone: "010-4830-9564",
    work_datetime: "2026-01-09 11:00",
    bl_number: "ONEYTAOFP811940",
    container_size: "40HC",
    container_number: "TLLU5563868",
    shipping_line: "ONE",
    loading_location: "",
    unloading_location: "",
    dispatch_company: "금길",
    vehicle_info: "경남99바7738 / 김태성 기사님 / 010-3577-9555",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "11시 차량", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "교범해운항공",
    shipper: "쇼카고",
    work_site: "대구 달서구 성서공단북로 2길 66 (파호동 206-4)",
    contact_person: "",
    contact_phone: "",
    work_datetime: "2026-01-09 11:00",
    booking_number: "SELE71823100",
    container_size: "",
    container_number: "HMMU6505237",
    tw: "3,700 KGS",
    seal_number: "25H0379810",
    shipping_line: "HMM",
    vessel_name: "HMM ST PETERSBURG(HOSP-01) / 0017W",
    export_country: "",
    berth_date: "",
    loading_location: "한진신항",
    unloading_location: "한진신항",
    dispatch_company: "부강",
    vehicle_info: "",
    status: "pending",
    weighing_required: 0,
    remarks: [
      { content: "선픽업건", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "마리타임허브",
    shipper: "쿠쿠전자",
    work_site: "쿠쿠전자 2공장 (경남 양산시 충렬로 143)",
    contact_person: "이수권 기장님",
    contact_phone: "010-5027-2573",
    work_datetime: "2026-01-09 13:00",
    booking_number: "HASLK02251101609",
    container_size: "40HC",
    container_number: "HLHU8379290",
    tw: "3,700KG",
    seal_number: "HAL199060",
    shipping_line: "HAS",
    vessel_name: "HEUNG-A JANICE(HAJN-02) / 2601W",
    export_country: "BUSAN - QINGDAO(CNTAO)",
    berth_date: "1-12",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "부강",
    vehicle_info: "경남99바3014 / 윤혁 기사님 / 010-8590-9105",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "QINGDAO", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "재성종합물류",
    shipper: "상정무역",
    work_site: "상정 포천 창고-경기도 포천시 가산면 마정로 96. 오른쪽 샛길로 들어오면 됩니다.",
    contact_person: "원창호이사님",
    contact_phone: "010-3021-2552",
    work_datetime: "2026-01-09 09:00",
    bl_number: "HDMUBOMA25578200",
    container_size: "40HC",
    container_number: "CAIU4568768",
    shipping_line: "HMM",
    loading_location: "SNCT",
    unloading_location: "SNCT",
    dispatch_company: "태성",
    vehicle_info: "인천98사4018 / 윤영완 기사님 / 010-5374-0097",
    status: "completed",
    weighing_required: 0,
    remarks: [
      { content: "지번주소로 네비검색하면 다른 곳으로 간다고 하니 도로명주소 참고", importance: 2 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "삼진해운",
    shipper: "니프코 아산",
    work_site: "충남 아산시 둔포면 아산밸리남로 146",
    contact_person: "이웅기 책임님",
    contact_phone: "010-9727-5072",
    work_datetime: "2026-01-09 13:00",
    booking_number: "005GX00359",
    container_size: "20GP",
    container_number: "WHSU2450718",
    tw: "2,190 KGS",
    seal_number: "WHA1768020",
    shipping_line: "WHL",
    vessel_name: "WAN HAI 521(W521-01) / W038",
    export_country: "BUSAN - CHENNAI,INDIA(INMAA)",
    berth_date: "1-14",
    loading_location: "BIT",
    unloading_location: "DGT",
    dispatch_company: "백승운수",
    vehicle_info: "충북98바1550 / 최세진기사 / 010-4112-7233",
    status: "completed",
    weighing_required: 1,
    remarks: [
      { content: "ABT. 4,000KGS", importance: 1 },
      { content: "공만차계근 진행", importance: 2 }
    ]
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
