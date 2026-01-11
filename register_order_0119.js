const order = {
  order_type: "container_export",
  billing_company: "삼진해운",
  shipper: "니프코 울산",
  work_site: "승평수출포장 / 부산광역시 강서구 녹산산단 407로 31",
  contact_person: "",
  contact_phone: "051-831-9155",
  work_datetime: "2026-01-19 13:00",
  booking_number: "SELA32413715",
  container_size: "40HC",
  container_number: "",
  seal_number: "",
  shipping_line: "HMM",
  vessel_name: "HYUNDAI TOKYO / 0161W",
  export_country: "BUSNA - KATTUPALLI, CHENNAI(INKAT)",
  berth_date: "1-21",
  loading_location: "현대신항",
  unloading_location: "현대신항",
  dispatch_company: "",
  vehicle_info: "",
  status: "pending",
  weighing_required: 1,
  remarks: [
    { content: "계근", importance: 2 }
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
