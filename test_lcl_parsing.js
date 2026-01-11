// LCL 날짜 파싱 테스트
const testCases = [
  { input: "2026.01.13 시간 추후 공유예정", expected: "2026-01-13 09:00" },
  { input: "2026.01.13 오후 상차", expected: "2026-01-13 14:00" },
  { input: "2026.01.13 오전 상차", expected: "2026-01-13 09:00" },
  { input: "2026-01.08 오후 상차", expected: "2026-01-08 14:00" },
  { input: "2026.01.12 14:00", expected: "2026-01-12 14:00" },
  { input: "2026.01.12 오전", expected: "2026-01-12 09:00" },
];

function parseLoadingDate(dateStr) {
  if (!dateStr) return null;
  
  // 날짜 파싱: 2026.01.08 또는 2026-01.08 등
  const match = dateStr.match(/(\d{4})[\.\-](\d{1,3})[\.\-](\d{1,2})/);
  if (!match) {
    console.warn(`⚠️  상차일 파싱 실패: ${dateStr}`);
    return null;
  }
  
  let year = match[1];
  let month = match[2].length > 2 ? match[2].replace(/^0+/, '') : match[2];
  let day = match[3];
  
  // 시간 정보 추출
  let hour = '09'; // 기본값: 오전 9시
  let minute = '00';
  
  // 1) HH:mm 형식이 있으면 우선 추출
  const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    hour = timeMatch[1].padStart(2, '0');
    minute = timeMatch[2];
  } 
  // 2) 오전/오후 키워드로 판단
  else if (dateStr.includes('오후')) {
    hour = '14';
  } else if (dateStr.includes('오전')) {
    hour = '09';
  }
  // 3) "시간 추후 공유", "시간 추후", "추후" 등이 있으면 기본 09:00
  else if (dateStr.includes('추후') || dateStr.includes('미정')) {
    hour = '09';
  }
  
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour}:${minute}`;
}

console.log('🧪 LCL 날짜 파싱 테스트\n');

let passCount = 0;
let failCount = 0;

testCases.forEach((test, index) => {
  const result = parseLoadingDate(test.input);
  const pass = result === test.expected;
  
  if (pass) {
    console.log(`✅ Test ${index + 1}: PASS`);
    passCount++;
  } else {
    console.log(`❌ Test ${index + 1}: FAIL`);
    console.log(`   Input: ${test.input}`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Got: ${result}`);
    failCount++;
  }
});

console.log(`\n📊 결과: ${passCount}/${testCases.length} 통과`);
if (failCount === 0) {
  console.log('🎉 모든 테스트 통과!');
} else {
  console.log(`⚠️  ${failCount}개 테스트 실패`);
}
