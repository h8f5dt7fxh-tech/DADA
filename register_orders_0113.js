const orders = [
  {
    order_type: "lcl",
    billing_company: "삼진해운",
    shipper: "트라이수출포장",
    work_site: "부산광역시 강서구 신항로 96-72(성북동)",
    contact_person: "김도훈 차장님",
    contact_phone: "051-466-3372, 010-4464-1127",
    work_datetime: "2026-01-13 09:00",
    shipping_line: "HMM",
    loading_location: "경북 구미시 첨단기업 5로 10-171",
    unloading_location: "비아이디씨 / 부산광역시 강서구 신항로 96-72(성북동)",
    dispatch_company: "두레",
    vehicle_info: "",
    status: "pending",
    weighing_required: 0,
    remarks: [
      { content: "상차일: 2026.01.13 시간 추후 공유예정", importance: 2 },
      { content: "하차일: 2026.01.14 10:00", importance: 1 },
      { content: "상차지 연락처: 054-476-9908", importance: 1 },
      { content: "BKG : SELM99545500 // 40HC*1 , 20GP*1", importance: 1 }
    ]
  },
  {
    order_type: "lcl",
    billing_company: "선인터내셔날",
    shipper: "한국폴리아세탈",
    work_site: "경기도 광주시 도착면 다람로 36번길 93-8",
    contact_person: "유선아차장",
    contact_phone: "010-6246-7647",
    work_datetime: "2026-01-13 14:00",
    shipping_line: "SKR",
    loading_location: "디앤케이 / 부산 남구 신선로 294, 부산항터미널 신선대 CFS 24번창고 1층",
    unloading_location: "성보화학 / 경기도 광주시 도착면 다람로 36번길 93-8",
    dispatch_company: "유진로직스",
    vehicle_info: "",
    status: "pending",
    weighing_required: 0,
    remarks: [
      { content: "상차일: 2026.01.13 오후 상차", importance: 1 },
      { content: "하차일: 2026.01.14 오전하차", importance: 1 },
      { content: "상차지 담당자: 진예진 계장님 / 070-4887-2098", importance: 1 },
      { content: "차량: 25톤윙바디 1대 = 40FT 1대", importance: 1 },
      { content: "BL : SNKO03N251200302", importance: 1 },
      { content: "25톤 적재 = 820kg x 30BAG / 100 * 100 * 높이 110~120cm정도", importance: 1 },
      { content: "M DO를 인수증으로 부탁드립니다.", importance: 2 },
      { content: "청구 63만", importance: 1 }
    ]
  },
  {
    order_type: "container_export",
    billing_company: "케이제이엔터프라이즈",
    shipper: "창영테크",
    work_site: "경기도 양주시 백석읍 부흥로 1000번길 100-37",
    contact_person: "",
    contact_phone: "010-9170-3041",
    work_datetime: "2026-01-13 14:00",
    booking_number: "A27GX00034",
    container_size: "20GP",
    container_number: "",
    seal_number: "",
    shipping_line: "IAL 인터아시아",
    vessel_name: "WAN HAI 325(W325-01) / S053",
    export_country: "INCHEON - TAIPEI (TWTPE)",
    berth_date: "1-16",
    loading_location: "SNCT",
    unloading_location: "SNCT",
    dispatch_company: "태성",
    vehicle_info: "",
    status: "pending",
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
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      successCount++;
      console.log(`✅ [${i+1}/${orders.length}] ${order.billing_company} - ${order.shipper} (ID: ${result.orderId || 'success'})`);
    } catch (error) {
      failCount++;
      const errorMsg = `❌ [${i+1}/${orders.length}] ${order.billing_company} - ${order.shipper}: ${error.message}`;
      console.error(errorMsg);
      failures.push({ index: i+1, order, error: error.message });
    }
    
    // 요청 사이에 약간의 지연 추가 (안정성)
    await new Promise(resolve => setTimeout(resolve, 200));
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
