const orders = [
  {
    order_type: "container_export",
    billing_company: "베스트부품",
    shipper: "베스트부품",
    work_site: "경기도 김포시 월곶면 갈산리 171-54",
    contact_person: "이상로 이사님",
    contact_phone: "010-7290-2112",
    work_datetime: "2026-01-08 09:00",
    booking_number: "KSLU2502830",
    container_size: "40HC",
    container_number: "DYLU5132726",
    tw: "3,760 KGS",
    seal_number: "DYL816811",
    shipping_line: "DYS",
    vessel_name: "HT HUIZHOU(JHHZ-02) / 2514N",
    export_country: "VLADIVOSTOK(RUVVO)",
    berth_date: "26-1-2",
    loading_location: "부곡",
    unloading_location: "BPT 신선대",
    dispatch_company: "양양운수",
    vehicle_info: "경기99바1120 / 유인선 기사님 / 010-3790-5151",
    status: "completed",
    weighing_required: 1,
    remarks: [
      { content: "REN 27오일 건", importance: 1 },
      { content: "공만차 계근 진행 건 ( KGS)", importance: 1 },
      { content: "ABT. 24톤 고중량건", importance: 1 },
      { content: "엠티&작업사진 必", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "베스트부품",
    shipper: "베스트부품",
    work_site: "경기도 김포시 월곶면 갈산리 171-54",
    contact_person: "이상로 이사님",
    contact_phone: "010-7290-2112",
    work_datetime: "2026-01-08 10:30",
    booking_number: "KSLA2600254",
    container_size: "40HC",
    container_number: "DYLU5132768",
    tw: "3,760 KGS",
    seal_number: "DYL816828",
    shipping_line: "DYS",
    vessel_name: "HT HUIZHOU(JHHZ-02) / 2514N",
    export_country: "BUSAN / VLADIVOSTOK ( RUVVO)",
    berth_date: "1-12",
    loading_location: "부곡",
    unloading_location: "BPTS",
    dispatch_company: "양양",
    vehicle_info: "경기99바1119 / 우기성 기사님 / 010-9915-6583",
    status: "completed",
    weighing_required: 1,
    remarks: [
      { content: "REN 28 오일건", importance: 1 },
      { content: "공만차 계근 진행 건 ( KGS)", importance: 1 },
      { content: "ABT. 24톤 고중량건", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "베스트부품",
    shipper: "베스트부품",
    work_site: "경기도 김포시 월곶면 갈산리 171-54",
    contact_person: "이상로 이사님",
    contact_phone: "010-7290-2112",
    work_datetime: "2026-01-08 13:00",
    booking_number: "PUS26A01430",
    container_size: "40HC",
    container_number: "NSSU7099928",
    tw: "3,820",
    seal_number: "NSL526326",
    shipping_line: "NSL",
    vessel_name: "SKY JADE(CKSJ-01) / 2601W",
    export_country: "BUSAN / VLADIVOSTOK ( RUVVO)",
    berth_date: "1-12",
    loading_location: "부곡",
    unloading_location: "신감만 허치슨",
    dispatch_company: "양양",
    vehicle_info: "경기99바1118 / 양병관 기사님 / 010-9102-5244",
    status: "completed",
    weighing_required: 1,
    remarks: [
      { content: "ASP 부품건", importance: 1 },
      { content: "공만차 계근 진행 건 ( KGS)", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "교범해운항공",
    shipper: "리라홈",
    work_site: "경기도 부천시 오정구 오정로95번길 66 부천내동복합물류센터 9층 (로지쓰리 3PL)",
    contact_person: "박성덕이사님",
    contact_phone: "010-6281-2090",
    work_datetime: "2026-01-08 10:00",
    bl_number: "CNGBINC9DV236 - STSFE2601021",
    container_number: "DRYU2791177",
    container_size: "20GP",
    shipping_line: "COS",
    loading_location: "한진인천",
    unloading_location: "한진인천",
    dispatch_company: "태성",
    vehicle_info: "경기89사3963 / 김지한 기사님 / 010-3895-8544",
    status: "completed"
  },
  {
    order_type: "container_export",
    billing_company: "스마트해운항공",
    shipper: "PTK",
    work_site: "경기도 김포시 양촌읍황금로 89번길 50",
    contact_person: "엄지수",
    contact_phone: "010-8717-8658",
    work_datetime: "2026-01-08 15:30",
    booking_number: "PANSEL26015056",
    container_size: "20GP",
    container_number: "KDCU2152389",
    tw: "2,015 KGS",
    seal_number: "DWS1182468",
    shipping_line: "POL",
    vessel_name: "HONOR PROSPER / 2226W",
    export_country: "INCHEON / QINGDAO",
    berth_date: "1-13",
    loading_location: "SOC 픽업지",
    unloading_location: "SNCT",
    dispatch_company: "태성",
    vehicle_info: "경기93바3633 / 조현철 기사님 / 010-4769-5001",
    status: "completed",
    remarks: [
      { content: "SOC밴 픽업건", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "지엠씨로지스틱스",
    shipper: "하이컴프",
    work_site: "경기도 파주시 문산읍 통일로 2077-37 / 유니하이테크",
    contact_person: "남궁환 차장",
    contact_phone: "010-5204-3592, 010-4180-4782",
    work_datetime: "2026-01-08 08:30",
    bl_number: "SSHAINC8YN446",
    container_number: "CSLU2044530",
    container_size: "20GP",
    shipping_line: "COS",
    loading_location: "인천한진",
    unloading_location: "인천한진",
    dispatch_company: "태성",
    vehicle_info: "서울86바5011 / 김영은 기사님 / 010-5321-0166",
    status: "completed"
  },
  {
    order_type: "container_export",
    billing_company: "대흥알앤티",
    shipper: "TOPK",
    work_site: "김해시 진례면 서부로 436번길 37-28",
    contact_person: "박민규 과장님",
    contact_phone: "010-7708-0287",
    work_datetime: "2026-01-08 14:00",
    booking_number: "HSLI010260100240",
    container_size: "20GP",
    shipping_line: "HSL",
    vessel_name: "STAR PIONEER / 2601W",
    export_country: "BUSAN - XINGANG",
    berth_date: "1-10",
    loading_location: "KBCT",
    unloading_location: "KBCT",
    dispatch_company: "에스더블유",
    vehicle_info: "부산95아7458 / 박철민 기사님 / 010-7157-9785",
    status: "completed",
    remarks: [
      { content: "인보이스 넘버 : TDCNTJ-L1-2601-2", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "지엘에스코퍼레이션",
    shipper: "다인물산",
    work_site: "경기도 김포시 양촌읍 황금 6로 8",
    work_datetime: "2026-01-08 09:00",
    booking_number: "DF260105004",
    container_size: "40HC",
    container_number: "DDFU4600086",
    seal_number: "DIFC267915",
    shipping_line: "DFC 단동훼리",
    vessel_name: "ORIENTAL PEARL VIII / DFCL-005) . 3498W",
    export_country: "INCHEON - DANDONG",
    berth_date: "1-12",
    loading_location: "인천신국제여객",
    unloading_location: "인천신국제여객",
    dispatch_company: "태성",
    vehicle_info: "인천99아2020 / 오순석 기사님 / 010-8832-5633",
    status: "completed",
    weighing_required: 1,
    remarks: [
      { content: "계근", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "혜원글로벌",
    shipper: "대성스틸",
    work_site: "경기도 평택시 포승읍",
    work_datetime: "2026-01-08 00:00",
    booking_number: "DJSCPTK250002061",
    container_size: "20GP",
    shipping_line: "DJS",
    vessel_name: "PEGASUS PROTO(DPRT-01) / 2601S",
    export_country: "평택 / HO CHI MINH CITY(VNSGN)",
    berth_date: "1-11",
    loading_location: "평택",
    unloading_location: "평택",
    dispatch_company: "다원",
    status: "undispatched",
    remarks: [
      { content: "4'COIL / 19,158 KGS", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "혜원글로벌",
    shipper: "대성스틸",
    work_site: "경기도 평택시 포승읍",
    work_datetime: "2026-01-08 00:00",
    booking_number: "DJSCPTK250002061",
    container_size: "20GP",
    shipping_line: "DJS",
    vessel_name: "PEGASUS PROTO(DPRT-01) / 2601S",
    export_country: "평택 / HO CHI MINH CITY(VNSGN)",
    berth_date: "1-11",
    loading_location: "평택",
    unloading_location: "평택",
    dispatch_company: "다원",
    status: "undispatched",
    remarks: [
      { content: "4'COIL / 19,158 KGS", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "가보팜스",
    shipper: "가보팜스",
    work_site: "전남 나주시 동수농공단지길 30-2번지",
    work_datetime: "2026-01-08 09:00",
    booking_number: "SEL6A0258200",
    container_size: "20GP",
    container_number: "CAIU6468897",
    tw: "2,150 KGS",
    seal_number: "SM784861",
    shipping_line: "SML",
    vessel_name: "SM TOKYO(SMTK-01) / 2601W",
    export_country: "광양-하이퐁",
    berth_date: "1-9",
    loading_location: "광양",
    unloading_location: "광양",
    dispatch_company: "오식도",
    vehicle_info: "전남98아4016 / 최용택 기사님 / 010-5429-6799",
    status: "completed",
    remarks: [
      { content: "청구 434,000 / 하불 340,700", importance: 1 }
    ],
    billings: [
      { amount: 434000, description: "" }
    ],
    payments: [
      { amount: 340700, description: "" }
    ]
  },
  {
    order_type: "lcl",
    billing_company: "삼진해운",
    shipper: "현대포리텍",
    work_site: "충청북도 음성군 읍성읍 신용로 56-20번지",
    work_datetime: "2026-01-08 14:00",
    shipping_line: "WHL",
    loading_location: "1공장 / 충청북도 음성군 읍성읍 신용로 56-20번지",
    unloading_location: "부산광역시 강서구 신항로 96-72(성북동) / 비아이디씨",
    dispatch_company: "유진로직스",
    vehicle_info: "부산93아8017 / 강대우 기사님 / 010-4066-7904",
    container_size: "8톤",
    status: "completed",
    remarks: [
      { content: "하차일: 2026.01.09 오전", importance: 1 },
      { content: "1,300 * 1,100 * 1,700 [8파레트/7톤]", importance: 1 },
      { content: "005FX33745", importance: 1 }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "선인터내셔날",
    shipper: "에스엔엠코퍼레이션",
    work_site: "경남 김해시 한림면 안곡로 460 / 씨엔텍",
    contact_person: "오광태 이사님",
    contact_phone: "010-5278-4992",
    work_datetime: "2026-01-08 09:00",
    bl_number: "SNLGZGKL000014",
    container_number: "SNBU2467570",
    container_size: "20GP",
    shipping_line: "SNL SINOTRANS",
    loading_location: "BIT",
    unloading_location: "BIT",
    dispatch_company: "에스더블유",
    vehicle_info: "울산80아6771 / 정해수 기사님 / 010-9121-2622",
    status: "completed"
  },
  {
    order_type: "container_export",
    billing_company: "스마트해운항공",
    shipper: "STOLIFT",
    work_site: "인천 중구 서해대로210번길 39 (지번: 신흥동3가 45-9) 주) 현대로지스앤팩",
    contact_phone: "032-886-6080",
    work_datetime: "2026-01-08 10:00",
    booking_number: "TS26016249",
    container_size: "40HC",
    container_number: "TSSU5018774",
    seal_number: "TSX4204921",
    shipping_line: "TSL TS LINE",
    vessel_name: "IBN AL ABBAR 332S",
    export_country: "INCHEON - SHEKOU",
    berth_date: "1-13",
    loading_location: "ICT",
    unloading_location: "ICT",
    vehicle_info: "인천99바5536 / 정원희 기사님 / 010-3320-4281",
    status: "completed",
    remarks: [
      { content: "까르네 통관건", importance: 1 },
      { content: "BL : CKCOSHK0021072", importance: 1 }
    ]
  },
  {
    order_type: "lcl",
    billing_company: "막스만",
    shipper: "FC STEEL",
    work_site: "충남 서산시 성연면 성연3로 133-25",
    work_datetime: "2026-01-08 13:00",
    shipping_line: "XXXX",
    loading_location: "충남 서산시 성연면 성연3로 133-25 / 가나스틸 ㈜",
    unloading_location: "경남 창원시 진해구 두동남로 16 / 장치장코드 : 03006021 / 광진신항물류센터",
    dispatch_company: "로지스팟",
    vehicle_info: "부산90바8516 / 김종관 기사님 / 010-3576-4048",
    status: "completed",
    remarks: [
      { content: "하차일: 1/9 (금) 오전 최대한 빠른 하차", importance: 1 },
      { content: "POL : Busan / POD : Jakarta", importance: 1 },
      { content: "WOODEN PACKING 1'PKG // 50*50*630-1 / 588KG", importance: 1 },
      { content: "BKG : JKT26010029", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "스마트해운항공",
    shipper: "삼진스틸",
    work_site: "경기도 김포시 양촌읍 황금로 23번길 92",
    contact_person: "정호준 부장님",
    contact_phone: "031-997-2943",
    work_datetime: "2026-01-08 13:00",
    booking_number: "INC26A00415",
    container_number: "NSSU0212143",
    tw: "2,100 KGS",
    seal_number: "NSL476466",
    shipping_line: "NSL",
    vessel_name: "XIN HE DA / 2736W",
    berth_date: "1-10",
    loading_location: "한진인천",
    unloading_location: "한진인천",
    dispatch_company: "태성",
    vehicle_info: "경기85바3233 / 임홍석 기사님 / 010-4125-7435",
    status: "completed"
  },
  {
    order_type: "lcl",
    billing_company: "유스타해운",
    shipper: "천인에이엠피",
    work_site: "인천광역시 연수구 송도미래로30 B동 320호 (3층)",
    work_datetime: "2026-01-08 14:00",
    shipping_line: "XXXX",
    loading_location: "인천광역시 연수구 송도미래로30 B동 320호 (3층)",
    unloading_location: "(주)부산크로스독 신항 CFS 본부세관 / 창고코드 : 03078010 / 경상남도 창원시 진해구 신항4로 15-82",
    dispatch_company: "유진로직스",
    vehicle_info: "인천85바1395 / 권경용 기사님 / 010-3101-1925",
    container_size: "1톤",
    status: "completed",
    remarks: [
      { content: "하차일: 2026.01.09 오전 하차", importance: 1 },
      { content: "수량: 3BOX", importance: 1 },
      { content: "크기 및 중량: 1. 122X 95X102 (CM) / 407 kg // 2. 122X 95X102 (CM) / 390 kg // 3. 84X67X76(CM) / 95 kg", importance: 1 },
      { content: "도착보고 필수", importance: 2 },
      { content: "청구 : 27 / 하불 : 24", importance: 1 },
      { content: "코드 : 29011", importance: 1 }
    ],
    billings: [
      { amount: 270000, description: "" }
    ],
    payments: [
      { amount: 240000, description: "" }
    ]
  },
  {
    order_type: "container_import",
    billing_company: "디티씨",
    shipper: "삼각메탈",
    work_site: "제이엔씨메탈 / 경기도 김포시 대곶면 옹정로 14-1",
    contact_person: "박대준 대표님",
    contact_phone: "010-4024-9203",
    work_datetime: "2026-01-08 08:00",
    bl_number: "KMTCKSP0008318",
    container_number: "UETU5449465",
    container_size: "40HC",
    shipping_line: "KMD",
    loading_location: "PNIT",
    unloading_location: "PNIT",
    dispatch_company: "에스더블유",
    status: "undispatched",
    remarks: [
      { content: "인천(구항)수입 > 김포 대곶면 : 40'(덤핑) 339,000원", importance: 1 },
      { content: "부산라운드수입 > 김포 대곶면 : 40'(덤핑) 1,415,000원", importance: 1 }
    ]
  }
];

async function registerOrders() {
  console.log(`🚀 총 ${orders.length}건의 오더를 등록합니다...\n`);
  
  let success = 0;
  let failed = 0;
  const errors = [];

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

      if (response.ok) {
        const result = await response.json();
        success++;
        console.log(`✅ [${i + 1}/${orders.length}] ${order.billing_company} - ${order.shipper} (ID: ${result.id})`);
      } else {
        const error = await response.json();
        failed++;
        errors.push(`[${i + 1}] ${order.billing_company} - ${order.shipper}: ${error.error}`);
        console.error(`❌ [${i + 1}/${orders.length}] ${order.billing_company} - ${order.shipper}: ${error.error}`);
      }
    } catch (error) {
      failed++;
      errors.push(`[${i + 1}] ${order.billing_company} - ${order.shipper}: ${error.message}`);
      console.error(`❌ [${i + 1}/${orders.length}] ${order.billing_company} - ${order.shipper}: ${error.message}`);
    }
  }

  console.log(`\n📊 등록 완료!`);
  console.log(`✅ 성공: ${success}건`);
  console.log(`❌ 실패: ${failed}건`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️ 실패한 오더:`);
    errors.forEach(err => console.log(err));
  }
}

registerOrders().catch(console.error);
