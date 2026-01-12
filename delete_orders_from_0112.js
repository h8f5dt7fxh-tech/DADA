// 2026-01-12 이후 오더 일괄 삭제 스크립트
const orderIds = [
  1873, 1867, 1854, 1856, 1861, 1862, 1868, 1869, 1870, 1857,
  1863, 1874, 1858, 1859, 1864, 1872, 1855, 1860, 1866, 1871,
  1898, 1865, 1876, 1891, 1896, 1897, 1892, 1893, 1894, 1877,
  1878, 1895, 1880, 1881, 1882, 1885
];

async function deleteOrders() {
  let successCount = 0;
  let failCount = 0;
  
  console.log(`🗑️  2026-01-12 이후 오더 삭제 시작 (총 ${orderIds.length}건)\n`);
  
  for (const orderId of orderIds) {
    try {
      const response = await fetch(`https://transport-system-f56.pages.dev/api/orders/${orderId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        successCount++;
        console.log(`✅ 오더 #${orderId} 삭제 완료 (${successCount}/${orderIds.length})`);
      } else {
        failCount++;
        const errorText = await response.text();
        console.error(`❌ 오더 #${orderId} 삭제 실패: ${errorText}`);
      }
      
      // API 과부하 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      failCount++;
      console.error(`❌ 오더 #${orderId} 삭제 중 오류: ${error.message}`);
    }
  }
  
  console.log(`\n🎉 삭제 완료!`);
  console.log(`   성공: ${successCount}건`);
  console.log(`   실패: ${failCount}건`);
  console.log(`\n📋 유지된 날짜:`);
  console.log(`   2026-01-08: 18건`);
  console.log(`   2026-01-09: 22건`);
  console.log(`   2026-01-10: 1건`);
}

deleteOrders().catch(error => {
  console.error(`\n❌ 삭제 작업 실패: ${error.message}`);
  process.exit(1);
});
