const orders = [
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
  }
];

async function registerOrders() {
  console.log(`🚀 LCL 오더 ${orders.length}건을 등록합니다...\n`);
  
  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    try {
      const response = await fetch('http://localhost:3000/api/orders', {
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
