const order = {
  order_type: "lcl",
  billing_company: "막스만",
  shipper: "케타와 트레이딩",
  work_site: "경상남도 창원시 진해구 신항 8로 117",
  contact_person: "심성민",
  contact_phone: "010-8594-8764",
  work_datetime: "2026-01-14 10:00",
  shipping_line: "XXXX",
  loading_location: "대구 달서천로 352-5",
  unloading_location: "용성유로지스㈜ CFS 내 1층 제이콘솔라인 (03078027) / 부산본부세관 경상남도 창원시 진해구 신항 8로 117 1번 게이트",
  dispatch_company: "유진로직스",
  vehicle_info: "",
  status: "pending",
  weighing_required: 0,
  remarks: [
    { content: "상차일: 2026.01.14 10:00", importance: 1 },
    { content: "하차일: 2026.01.14 당착", importance: 1 },
    { content: "61BOX / 804.50 KG / 6.56CBM", importance: 1 },
    { content: "패킹리스트에 부킹넘버 기재 후 도착보고 바랍니다", importance: 2 },
    { content: "BOOKING NO: JBKK2601012", importance: 1 },
    { content: "BUSAN - BANGKOK, THAILAND", importance: 1 },
    { content: "청구 165,000 / 하불 150,000", importance: 1 }
  ]
};

async function registerOrder() {
  try {
    console.log(`🚀 오더를 등록합니다: ${order.billing_company} - ${order.shipper}\n`);
    
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
    console.log(`✅ 등록 성공!`);
    console.log(`   청구처: ${order.billing_company}`);
    console.log(`   화주: ${order.shipper}`);
    console.log(`   진행일시: ${order.work_datetime}`);
    console.log(`   오더 ID: ${result.orderId}`);
    console.log(`\n🎉 완료!`);
    
  } catch (error) {
    console.error(`\n❌ 등록 실패: ${error.message}`);
    console.error(`\n상세 정보:`);
    console.error(`   청구처: ${order.billing_company}`);
    console.error(`   화주: ${order.shipper}`);
    console.error(`   진행일시: ${order.work_datetime}`);
    process.exit(1);
  }
}

registerOrder();
