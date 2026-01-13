// ============================================
// 전역 상태 관리
// ============================================
const state = {
  currentPage: 'orders',  // 초기 페이지를 오더 목록으로 변경
  currentView: 'month',
  currentDate: dayjs().format('YYYY-MM-DD'), // 날짜 입력 필드를 위해 YYYY-MM-DD 형식으로 초기화
  currentOrderType: 'all',
  searchQuery: '',
  orders: [],
  selectedOrder: null,
  locationCodes: [],
  shippingLines: [],
  dispatchCompanies: [],
  billingCompanies: [],
  shippers: [],
  workSites: [],
  todos: [],
  inputMode: 'text',  // 'text', 'form', 'excel'
  formOrderType: 'container_export',  // 폼 입력 시 선택된 오더 타입
  isLoading: false  // 로딩 상태 추가
}

// ============================================
// 유틸리티 함수
// ============================================

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

function formatTime(date) {
  return dayjs(date).format('HH:mm')
}

function parseOrderText(text, orderType) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  const order = { order_type: orderType, remarks: [] }
  
  // 컨테이너 사이즈 기반 타입 자동 판별을 위한 임시 변수
  let detectedContainerSize = null
  
  for (const line of lines) {
    // BKG 파싱 (여러 형식 지원)
    if (line.startsWith('BKG') || line.startsWith('BKG /') || line.startsWith('BKG  :')) {
      const match = line.match(/BKG\s*[:/]\s*([A-Z0-9]+)(?:\s*\/\s*(.+))?/i)
      if (match) {
        order.booking_number = match[1]?.trim()
        if (match[2]) {
          order.container_size = match[2]?.replace(/\*\d+/g, '').trim() // *1 제거
          detectedContainerSize = order.container_size
        }
      }
    }
    // CON 파싱
    else if (line.startsWith('CON') || line.startsWith('CON :')) {
      const match = line.match(/CON\s*:\s*([A-Z0-9]+)(?:\s*\/\s*T\.W\s*(.+))?/i)
      if (match) {
        order.container_number = match[1]?.trim()
        if (match[2]) order.tw = match[2]?.trim()
      }
    }
    // SEAL 파싱
    else if (line.startsWith('SEAL') || line.startsWith('SEAL :')) {
      order.seal_number = line.split(':')[1]?.trim()
    }
    // 컨테이너 수출
    else if (line.startsWith('BKG/SIZE') || line.startsWith('BKG / SIZE')) {
      const match = line.match(/:\s*(.+?)(?:\s*\/\s*(.+))?$/)
      if (match) {
        order.booking_number = match[1]?.trim()
        order.container_size = match[2]?.trim()
        detectedContainerSize = order.container_size
      }
    }
    // 컨테이너 수입
    else if (line.startsWith('BL :') || line.startsWith('BL:') || line.startsWith('BL ')) {
      order.bl_number = line.split(':')[1]?.trim() || line.replace('BL', '').trim()
    }
    else if (line.startsWith('CON/SIZE') || line.startsWith('CON / SIZE')) {
      const match = line.match(/:\s*(.+?)(?:\s*\/\s*(.+))?$/)
      if (match) {
        order.container_number = match[1]?.trim()
        order.container_size = match[2]?.trim()
        detectedContainerSize = order.container_size
      }
    }
    else if (line.startsWith('컨테이너 넘버') || line.startsWith('컨테이너 넘버 /')) {
      const match = line.match(/:\s*(.+?)(?:\s*\/\s*SIZE\s*:\s*(.+))?$/i)
      if (match) {
        order.container_number = match[1]?.trim()
        if (match[2]) {
          order.container_size = match[2]?.trim()
          detectedContainerSize = order.container_size
        }
      }
    }
    // 공통
    else if (line.startsWith('청구처') || line.startsWith('청구처 :')) {
      order.billing_company = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('화주') || line.startsWith('화주 :')) {
      order.shipper = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('작업지') || line.startsWith('작업지 :')) {
      order.work_site = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('담당자')) {
      const match = line.match(/:\s*(.+?)(?:\s*\/\s*(.+))?$/)
      if (match) {
        order.contact_person = match[1]?.trim()
        order.contact_phone = match[2]?.trim()
      }
    }
    else if (line.startsWith('작업일시') || line.startsWith('작업일시 :') || line.startsWith('진행일시') || line.startsWith('진행일시 :')) {
      // ✅ CRITICAL FIX: 콜론이 여러 개 있을 수 있으므로 첫 콜론 이후 전체를 가져옴
      const colonIndex = line.indexOf(':')
      const dateStr = colonIndex >= 0 ? line.substring(colonIndex + 1).trim() : ''
      
      // "2026.01.08 09:00", "2026.01.19 13:00", "2026.010.08", "2206.01.08" 형식 파싱
      if (dateStr) {
        // 날짜와 시간을 모두 추출
        const match = dateStr.match(/(\d{4})\.(\d{1,3})\.(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/)
        if (match) {
          let year = match[1]
          let month = match[2]
          let day = match[3]
          
          // 연도 오타 수정 (2206 → 2026)
          if (year.startsWith('22') && parseInt(year) > 2200) {
            year = '20' + year.substring(2)
          }
          
          // 월 오타 수정 (010 → 01)
          if (month.length > 2) {
            month = month.replace(/^0+/, '')
          }
          
          month = month.padStart(2, '0')
          day = day.padStart(2, '0')
          
          // ✅ 시간 파싱: HH:mm 형식을 우선 추출
          let hour = '09'  // 기본값: 오전 9시
          let minute = '00'
          
          if (match[4] && match[5]) {
            // HH:mm 형식이 명시되어 있으면 사용
            hour = match[4].padStart(2, '0')
            minute = match[5]
          } else {
            // 시간이 없으면 오전/오후 키워드 확인
            if (dateStr.includes('오후')) {
              hour = '14'
            } else if (dateStr.includes('오전')) {
              hour = '09'
            }
            // 기타: 기본값 09:00 사용
          }
          
          order.work_datetime = `${year}-${month}-${day} ${hour}:${minute}`
        }
      }
    }
    else if (line.startsWith('선사') || line.startsWith('선사 :')) {
      order.shipping_line = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('모선') || line.startsWith('모선 :')) {
      // 모선명과 항차 정보를 모두 포함 (예: HYUNDAI TOKYO / 0161W)
      order.vessel_name = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('수출국') || line.startsWith('수출국 :')) {
      order.export_country = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('접안일')) {
      const match = line.match(/:\s*(.+?)(?:\s*\/\s*(.+))?$/)
      if (match) {
        order.berth_date = match[1]?.trim()
        order.departure_date = match[2]?.trim()
      }
    }
    else if (line.startsWith('상차지')) {
      const match = line.match(/:\s*(.+?)(?:\s*\/\s*(.+))?$/)
      if (match) {
        order.loading_location = match[1]?.trim()
        if (match[2]) order.unloading_location = match[2]?.trim()
      }
    }
    else if (line.startsWith('하차지') && !line.startsWith('상차지')) {
      // 하차지만 별도로 있는 경우
      order.unloading_location = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('상차일') || line.startsWith('상차일 :')) {
      // LCL 상차일
      const dateStr = line.split(':')[1]?.trim()
      if (dateStr && !order.work_datetime) {
        // 날짜 파싱: 2026.01.08 또는 2026.01.08 오후 상차 또는 2026-01.08 오후 상차
        const match = dateStr.match(/(\d{4})[\.\-](\d{1,3})[\.\-](\d{1,2})/)
        if (match) {
          let year = match[1]
          let month = match[2].length > 2 ? match[2].replace(/^0+/, '') : match[2]
          let day = match[3]
          
          // 시간 정보 추출 (오전/오후/시간)
          let hour = '09' // 기본값: 오전 9시
          let minute = '00'
          
          // 1) HH:mm 형식이 있으면 우선 추출
          const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})/)
          if (timeMatch) {
            hour = timeMatch[1].padStart(2, '0')
            minute = timeMatch[2]
          } 
          // 2) 오전/오후 키워드로 판단
          else if (dateStr.includes('오후')) {
            hour = '14' // 오후는 14시로 가정
          } else if (dateStr.includes('오전')) {
            hour = '09' // 오전은 09시로 가정
          }
          // 3) "시간 추후 공유", "시간 추후", "추후" 등이 있으면 기본 09:00
          else if (dateStr.includes('추후') || dateStr.includes('미정')) {
            hour = '09'
          }
          
          order.work_datetime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour}:${minute}`
        } else {
          // 날짜 형식이 없으면 오늘 날짜 + 09:00으로 기본 설정
          console.warn(`⚠️  상차일 파싱 실패: ${dateStr}`)
        }
      }
    }
    else if (line.startsWith('하차일') || line.startsWith('하차일 :')) {
      // LCL 하차일 (비고로 저장)
      const dateInfo = line.split(':')[1]?.trim()
      if (dateInfo) {
        order.remarks.push({
          content: `하차일: ${dateInfo}`,
          importance: 1
        })
      }
    }
    else if (line.startsWith('차량정보') || line.startsWith('차량정보 :')) {
      // LCL 차량정보
      order.vehicle_info = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('중량') || line.startsWith('중량 :')) {
      order.weight = line.split(':')[1]?.trim()
      if (order.weight && (order.weight.includes('계근') || order.weight.includes('공만차'))) {
        order.weighing_required = true
      }
    }
    else if (line.startsWith('배차') || line.startsWith('배차 :')) {
      order.dispatch_company = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('차량') || line.startsWith('차량 :') || line.startsWith('차량:')) {
      order.vehicle_info = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('컨,씰') || line.startsWith('컨테이너 넘버')) {
      const match = line.match(/:\s*(.+?)(?:\s*\/\s*(.+?))?(?:\s*\/\s*(.+))?$/)
      if (match) {
        order.container_number = match[1]?.trim()
        if (match[2]) order.seal_number = match[2]?.trim()
        if (match[3]) order.tw = match[3]?.trim()
      }
    }
    else if (line.startsWith('T.W')) {
      order.tw = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('DO :') || line.startsWith('DO:')) {
      order.do_status = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('면장') || line.startsWith('면장 :')) {
      order.customs_clearance = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('NO :') || line.startsWith('NO:')) {
      order.order_no = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('**') || line.startsWith('*')) {
      // 비고 처리
      const content = line.replace(/^\*+\s*/, '').trim()
      if (content) {
        order.remarks.push({
          content: content,
          importance: line.startsWith('**') ? 2 : 1
        })
      }
    }
  }
  
  // 컨테이너 사이즈 기반 오더 타입 자동 판별
  // HC, HQ, GP, FR → 컨테이너 수출/수입
  // BK → LCL
  if (detectedContainerSize) {
    const sizeUpper = detectedContainerSize.toUpperCase()
    const isContainerType = /HC|HQ|GP|FR/.test(sizeUpper)
    const isLCLType = /BK/.test(sizeUpper)
    
    if (isLCLType) {
      order.order_type = 'lcl'
    } else if (isContainerType) {
      // 수출/수입 구분은 기존 orderType 유지
      if (orderType === 'container_export' || orderType === 'container_import') {
        order.order_type = orderType
      }
    }
  }
  
  // 상태 자동 판단
  if (order.order_type === 'container_export') {
    if (!order.dispatch_company) {
      order.status = 'unassigned'
    } else if (!order.container_number || !order.seal_number || !order.vehicle_info) {
      order.status = 'undispatched'
    } else {
      order.status = 'completed'
    }
  } else if (order.order_type === 'container_import' || order.order_type === 'lcl') {
    if (!order.vehicle_info) {
      order.status = 'undispatched'
    } else {
      order.status = 'completed'
    }
  }
  
  // undefined 값을 null로 변환 (D1 데이터베이스 호환성)
  Object.keys(order).forEach(key => {
    if (order[key] === undefined) {
      order[key] = null
    }
  })
  
  return order
}

function generateAssignmentCopy(order) {
  if (!order) return ''
  
  let text = ''
  
  if (order.order_type === 'container_export') {
    text = `진행일시 : ${order.work_datetime}
화주 : ${order.shipper}
BKG / 사이즈 : ${order.booking_number} / ${order.container_size}
상차지 / 하차지 / 작업지 : ${order.loading_location} / ${order.unloading_location} / ${order.work_site}`
  } else if (order.order_type === 'container_import') {
    text = `진행일시 : ${order.work_datetime}
화주 : ${order.shipper}
BL / 컨테이너 넘버 : ${order.bl_number} / ${order.container_number}
상차지OR하차지 / 작업지 : ${order.loading_location || order.unloading_location} / ${order.work_site}`
  } else if (order.order_type === 'lcl') {
    text = `청구처 : ${order.billing_company}
화주 : ${order.shipper}
선사 : ${order.shipping_line}
상차지 : ${order.loading_location}
하차지 : ${order.unloading_location}`
  }
  
  return text
}

function generateDispatchCopy(order) {
  if (!order) return ''
  
  let text = ''
  const remarks = order.remarks || []
  const importantRemarks = remarks.filter(r => r.importance >= 2)
  
  if (order.order_type === 'container_export') {
    text = `화주/작업지
${order.shipper} / ${order.work_site}
BKG / SIZE : ${order.booking_number} / ${order.container_size}
진행일시 : ${order.work_datetime}
CON : ${order.container_number}
배차정보 : ${order.dispatch_company} / ${order.vehicle_info}

* 모선 : ${order.vessel_name}
* 수출국 : ${order.export_country}
* 접안일 : ${order.berth_date}

${importantRemarks.map(r => '* ' + r.content).join('\n')}`
  } else if (order.order_type === 'container_import') {
    text = `화주/작업지
${order.shipper} / ${order.work_site}
BL : ${order.bl_number}
진행일시 : ${order.work_datetime}
CON : ${order.container_number}
배차정보 : ${order.dispatch_company} / ${order.vehicle_info}

${importantRemarks.map(r => '* ' + r.content).join('\n')}`
  } else if (order.order_type === 'lcl') {
    text = `청구처 : ${order.billing_company}
화주 : ${order.shipper}
선사 : ${order.shipping_line}
상차지 : ${order.loading_location}
하차지 : ${order.unloading_location}
차량 : ${order.vehicle_info}

${importantRemarks.map(r => '* ' + r.content).join('\n')}`
  }
  
  return text
}

// ============================================
// API 호출 함수
// ============================================

async function fetchOrders() {
  try {
    state.isLoading = true
    renderOrderList() // 로딩 표시
    
    // 월별 뷰일 때는 YYYY-MM 형식으로 변환
    let dateParam = state.currentDate
    if (state.currentView === 'month' && dateParam && dateParam.length > 7) {
      dateParam = dateParam.substring(0, 7) // "2025-12-01" -> "2025-12"
    }
    
    const params = new URLSearchParams({
      view: state.currentView,
      date: dateParam,
      type: state.currentOrderType
    })
    
    if (state.searchQuery) {
      params.append('search', state.searchQuery)
    }
    
    const response = await axios.get(`/api/orders?${params}`)
    state.orders = response.data
  } catch (error) {
    console.error('오더 조회 실패:', error)
    alert('오더 조회에 실패했습니다.')
  } finally {
    state.isLoading = false
    renderOrderList()
  }
}

async function createOrder(orderData) {
  try {
    await axios.post('/api/orders', orderData)
    alert('오더가 생성되었습니다.')
    fetchOrders()
  } catch (error) {
    console.error('오더 생성 실패:', error)
    alert('오더 생성에 실패했습니다.')
  }
}

async function updateOrder(id, orderData) {
  try {
    await axios.put(`/api/orders/${id}`, orderData)
    alert('오더가 수정되었습니다.')
    fetchOrders()
  } catch (error) {
    console.error('오더 수정 실패:', error)
    alert('오더 수정에 실패했습니다.')
  }
}

async function deleteOrder(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return
  
  try {
    await axios.delete(`/api/orders/${id}`)
    alert('오더가 삭제되었습니다.')
    fetchOrders()
  } catch (error) {
    console.error('오더 삭제 실패:', error)
    alert('오더 삭제에 실패했습니다.')
  }
}

async function editOrder(id) {
  // 오더 상세 정보 가져오기 (비고 포함)
  const response = await axios.get(`/api/orders/${id}`)
  const order = response.data
  
  if (!order) {
    alert('오더를 찾을 수 없습니다.')
    return
  }
  
  // 모든 모달 닫기
  document.querySelectorAll('.fixed').forEach(modal => modal.remove())
  
  // 비고 HTML 생성
  const remarksHtml = order.remarks && order.remarks.length > 0 
    ? order.remarks.map(r => `
        <div class="flex items-center justify-between p-2 bg-gray-50 rounded mb-2">
          <span class="text-sm">${r.content}</span>
          <button type="button" onclick="deleteRemark(${r.id}, ${id})" class="text-red-500 hover:text-red-700">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `).join('')
    : '<p class="text-sm text-gray-400">비고가 없습니다.</p>'
  
  // 수정 모달 생성
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-2xl font-bold">오더 수정</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-600 hover:text-gray-800">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>
      
      <form id="editOrderForm" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">청구처</label>
            <input type="text" name="billing_company" id="edit_billing_company" value="${order.billing_company}" class="w-full border rounded px-3 py-2" required onchange="fetchSalesPersonForBillingCompany(this.value, 'edit_sales_person')">
            <div id="edit_sales_person_container" class="mt-1 text-sm text-blue-600"></div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">화주</label>
            <input type="text" name="shipper" value="${order.shipper}" class="w-full border rounded px-3 py-2" required>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">작업지</label>
            <input type="text" name="work_site" value="${order.work_site || ''}" class="w-full border rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">작업일시</label>
            <input type="datetime-local" name="work_datetime" value="${order.work_datetime.replace(' ', 'T').substring(0, 16)}" class="w-full border rounded px-3 py-2" required>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">BKG/BL/NO</label>
            <input type="text" name="booking_number" value="${order.booking_number || order.bl_number || order.order_no || ''}" class="w-full border rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">컨테이너 사이즈</label>
            <input type="text" name="container_size" value="${order.container_size || ''}" class="w-full border rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">상차지</label>
            <input type="text" name="loading_location" value="${order.loading_location || ''}" class="w-full border rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">하차지</label>
            <input type="text" name="unloading_location" value="${order.unloading_location || ''}" class="w-full border rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">배차업체</label>
            <input type="text" name="dispatch_company" value="${order.dispatch_company || ''}" class="w-full border rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">차량정보</label>
            <input type="text" name="vehicle_info" value="${order.vehicle_info || ''}" class="w-full border rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">담당자</label>
            <input type="text" name="contact_person" value="${order.contact_person || ''}" class="w-full border rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">연락처</label>
            <input type="text" name="contact_phone" value="${order.contact_phone || ''}" class="w-full border rounded px-3 py-2">
          </div>
        </div>
        
        <!-- 비고 섹션 -->
        <div class="border-t pt-4 mt-4">
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium">비고</label>
            <button type="button" onclick="addRemarkInEdit(${id})" class="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">
              <i class="fas fa-plus mr-1"></i>추가
            </button>
          </div>
          <div id="remarksList" class="space-y-2">
            ${remarksHtml}
          </div>
        </div>
        
        <div class="flex justify-end space-x-2">
          <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 border rounded hover:bg-gray-100">
            취소
          </button>
          <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <i class="fas fa-save mr-1"></i>저장
          </button>
        </div>
      </form>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // 폼 제출 핸들러
  document.getElementById('editOrderForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData)
    
    // 작업일시 변환
    data.work_datetime = data.work_datetime.replace('T', ' ') + ':00'
    
    // BKG/BL/NO 처리
    if (order.order_type === 'container_export') {
      data.booking_number = data.booking_number
      data.bl_number = ''
      data.order_no = ''
    } else if (order.order_type === 'container_import') {
      data.bl_number = data.booking_number
      data.booking_number = ''
      data.order_no = ''
    } else {
      data.order_no = data.booking_number
      data.booking_number = ''
      data.bl_number = ''
    }
    
    // 기존 데이터 유지
    data.order_type = order.order_type
    data.status = order.status || 'pending'
    data.weighing_required = order.weighing_required || 0
    data.work_site_code = order.work_site_code || ''
    data.shipping_line = order.shipping_line || ''
    data.vessel_name = order.vessel_name || ''
    data.export_country = order.export_country || ''
    data.berth_date = order.berth_date || ''
    data.departure_date = order.departure_date || ''
    data.weight = order.weight || ''
    data.container_number = order.container_number || ''
    data.tw = order.tw || ''
    data.seal_number = order.seal_number || ''
    data.do_status = order.do_status || ''
    data.customs_clearance = order.customs_clearance || ''
    data.loading_location_code = order.loading_location_code || ''
    data.unloading_location_code = order.unloading_location_code || ''
    
    try {
      await axios.put(`/api/orders/${id}`, data)
      alert('오더가 수정되었습니다.')
      modal.remove()
      fetchOrders()
    } catch (error) {
      console.error('오더 수정 실패:', error)
      alert('오더 수정에 실패했습니다.')
    }
  })
}

async function fetchLocationCodes() {
  try {
    const response = await axios.get('/api/location-codes')
    state.locationCodes = response.data
  } catch (error) {
    console.error('상하차지 코드 조회 실패:', error)
  }
}

async function fetchShippingLines() {
  try {
    const response = await axios.get('/api/shipping-lines')
    state.shippingLines = response.data
  } catch (error) {
    console.error('선사 코드 조회 실패:', error)
  }
}

async function fetchDispatchCompanies() {
  try {
    const response = await axios.get('/api/dispatch-companies')
    state.dispatchCompanies = response.data
  } catch (error) {
    console.error('협력업체 조회 실패:', error)
  }
}

async function fetchTodos() {
  try {
    const response = await axios.get('/api/todos')
    state.todos = response.data
    renderTodoList()
  } catch (error) {
    console.error('할일 조회 실패:', error)
  }
}

async function createTodo(content, orderId = null) {
  try {
    await axios.post('/api/todos', { 
      content,
      order_id: orderId 
    })
    fetchTodos()
  } catch (error) {
    console.error('할일 생성 실패:', error)
  }
}

async function toggleTodo(id, completed) {
  try {
    await axios.put(`/api/todos/${id}`, { completed })
    fetchTodos()
  } catch (error) {
    console.error('할일 수정 실패:', error)
  }
}

async function deleteTodo(id) {
  try {
    await axios.delete(`/api/todos/${id}`)
    fetchTodos()
  } catch (error) {
    console.error('할일 삭제 실패:', error)
  }
}

// ============================================
// 화주 빠른 검색
// ============================================

let searchTimeout = null
window.quickSearchShipper = async function(event) {
  const query = event.target.value.trim()
  const resultsDiv = document.getElementById('quickSearchResults')
  
  if (query.length < 2) {
    resultsDiv.classList.add('hidden')
    return
  }
  
  // 디바운스
  if (searchTimeout) clearTimeout(searchTimeout)
  
  searchTimeout = setTimeout(async () => {
    try {
      resultsDiv.innerHTML = '<div class="p-4 text-center"><i class="fas fa-spinner fa-spin text-gray-400"></i></div>'
      resultsDiv.classList.remove('hidden')
      
      // 새로운 API 사용
      const response = await axios.get(`/api/billing-shippers?search=${encodeURIComponent(query)}`)
      const shippers = response.data
      
      if (shippers.length === 0) {
        resultsDiv.innerHTML = '<div class="p-4 text-gray-500 text-sm">검색 결과가 없습니다</div>'
        return
      }
      
      // 결과 표시 (최대 10개만)
      const html = shippers.slice(0, 10).map(s => `
        <div class="p-3 hover:bg-gray-50 cursor-pointer border-b" 
             onclick="showShipperDetails(${s.id}, '${s.shipper.replace(/'/g, "\\'")}', '${s.billing_company.replace(/'/g, "\\'")}')">
          <div class="font-semibold text-sm">${s.shipper}</div>
          <div class="text-xs text-gray-500">${s.billing_company}</div>
          ${s.memo ? `<div class="text-xs text-gray-400">${s.memo}</div>` : ''}
        </div>
      `).join('')
      
      resultsDiv.innerHTML = html
    } catch (error) {
      console.error('검색 실패:', error)
      resultsDiv.innerHTML = '<div class="p-4 text-red-500 text-sm">검색 중 오류가 발생했습니다</div>'
    }
  }, 300)
}

// 검색 결과 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
  const searchInput = document.getElementById('quickShipperSearch')
  const resultsDiv = document.getElementById('quickSearchResults')
  
  if (searchInput && resultsDiv && !searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
    resultsDiv.classList.add('hidden')
  }
})

// 화주 정보 빠른 보기
window.showShipperDetails = async function(shipperId, shipperName, billingCompany) {
  // 검색창 닫기
  document.getElementById('quickSearchResults').classList.add('hidden')
  document.getElementById('quickShipperSearch').value = ''
  
  // 간단한 정보 모달 표시
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold">화주 정보</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-600 hover:text-gray-800">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="space-y-3">
        <div>
          <div class="text-sm text-gray-500">화주명</div>
          <div class="font-semibold text-lg">${shipperName}</div>
        </div>
        <div>
          <div class="text-sm text-gray-500">청구처</div>
          <div class="font-semibold">${billingCompany}</div>
        </div>
      </div>
      
      <div class="mt-6 flex justify-end space-x-2">
        <button onclick="changePage('clients'); this.closest('.fixed').remove()" 
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          거래처 관리로 이동
        </button>
        <button onclick="this.closest('.fixed').remove()" 
                class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
          닫기
        </button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
}

// 화주 정보 빠른 보기 (기존 함수 - 하위 호환성)
window.showShipperQuick = async function(billingCompanyId, shipperId, shipperName, billingCompany) {
  showShipperDetails(shipperId, shipperName, billingCompany)
}

// ============================================
// UI 렌더링 함수
// ============================================

function renderNavigation() {
  return `
    <nav class="bg-white shadow-md border-b-2 border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex items-center justify-between h-16">
          <!-- 데스크톱 네비게이션 -->
          <div class="flex items-center space-x-8 desktop-nav w-full">
            <h1 class="text-xl font-bold text-gray-800">
              <i class="fas fa-truck mr-2 text-blue-600"></i>운송사 관리 시스템
            </h1>
            <div class="flex space-x-2">
              <button onclick="changePage('orders')" class="nav-link ${state.currentPage === 'orders' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'} px-4 py-2 rounded-lg font-semibold transition-all duration-200 transform ${state.currentPage === 'orders' ? 'scale-105' : 'hover:scale-105'}">
                <i class="fas fa-list mr-2"></i>오더 관리
              </button>
              <button onclick="changePage('create-order')" class="nav-link ${state.currentPage === 'create-order' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'} px-4 py-2 rounded-lg font-semibold transition-all duration-200 transform ${state.currentPage === 'create-order' ? 'scale-105' : 'hover:scale-105'}">
                <i class="fas fa-plus mr-2"></i>오더 입력
              </button>
              <button onclick="changePage('clients')" class="nav-link ${state.currentPage === 'clients' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'} px-4 py-2 rounded-lg font-semibold transition-all duration-200 transform ${state.currentPage === 'clients' ? 'scale-105' : 'hover:scale-105'}">
                <i class="fas fa-building mr-2"></i>거래처 관리
              </button>
              <button onclick="changePage('codes')" class="nav-link ${state.currentPage === 'codes' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'} px-4 py-2 rounded-lg font-semibold transition-all duration-200 transform ${state.currentPage === 'codes' ? 'scale-105' : 'hover:scale-105'}">
                <i class="fas fa-code mr-2"></i>코드 관리
              </button>
              <button onclick="changePage('todos')" class="nav-link ${state.currentPage === 'todos' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'} px-4 py-2 rounded-lg font-semibold transition-all duration-200 transform ${state.currentPage === 'todos' ? 'scale-105' : 'hover:scale-105'}">
                <i class="fas fa-tasks mr-2"></i>할일
              </button>
            </div>
            
            <!-- 화주 빠른 검색 -->
            <div class="ml-auto relative">
              <input type="text" 
                     id="quickShipperSearch"
                     placeholder="화주 검색..."
                     class="px-4 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                     onkeyup="quickSearchShipper(event)">
              <div id="quickSearchResults" class="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto hidden z-50"></div>
            </div>
          </div>
          
          <!-- 모바일 네비게이션 -->
          <div class="mobile-nav flex items-center justify-between w-full" style="display: none;">
            <h1 class="text-lg font-bold text-gray-800">
              <i class="fas fa-truck mr-2 text-blue-600"></i>운송 관리
            </h1>
            <button onclick="toggleMobileMenu()" class="p-2 text-gray-600 hover:text-gray-900">
              <i class="fas fa-bars text-2xl"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
    
    <!-- 상단바 고정으로 인한 공간 확보 -->
    <div style="height: 64px;"></div>
    
    <!-- 모바일 메뉴 오버레이 -->
    <div id="menuOverlay" class="menu-overlay" onclick="toggleMobileMenu()"></div>
    
    <!-- 모바일 사이드 메뉴 -->
    <div id="mobileMenu" class="mobile-menu">
      <div class="p-4 border-b flex items-center justify-between">
        <h2 class="text-lg font-bold text-gray-800">메뉴</h2>
        <button onclick="toggleMobileMenu()" class="p-2 text-gray-600 hover:text-gray-900">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      <div class="p-4">
        <button onclick="changePage('orders'); toggleMobileMenu()" class="w-full text-left px-4 py-3 rounded-lg mb-2 font-semibold ${state.currentPage === 'orders' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}">
          <i class="fas fa-list mr-2"></i>오더 관리
        </button>
        <button onclick="changePage('create-order'); toggleMobileMenu()" class="w-full text-left px-4 py-3 rounded-lg mb-2 font-semibold ${state.currentPage === 'create-order' ? 'bg-green-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}">
          <i class="fas fa-plus mr-2"></i>오더 입력
        </button>
        <button onclick="changePage('clients'); toggleMobileMenu()" class="w-full text-left px-4 py-3 rounded-lg mb-2 font-semibold ${state.currentPage === 'clients' ? 'bg-purple-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}">
          <i class="fas fa-building mr-2"></i>거래처 관리
        </button>
        <button onclick="changePage('codes'); toggleMobileMenu()" class="w-full text-left px-4 py-3 rounded-lg mb-2 font-semibold ${state.currentPage === 'codes' ? 'bg-orange-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}">
          <i class="fas fa-code mr-2"></i>코드 관리
        </button>
        <button onclick="changePage('todos'); toggleMobileMenu()" class="w-full text-left px-4 py-3 rounded-lg mb-2 font-semibold ${state.currentPage === 'todos' ? 'bg-red-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}">
          <i class="fas fa-tasks mr-2"></i>할일
        </button>
      </div>
    </div>
  `
}

function renderOrderFilters() {
  return `
    <div class="bg-white p-3 md:p-4 rounded-lg shadow mb-4">
      <div class="filter-group flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-0 mb-4">
        <div class="button-group flex space-x-2">
          <button onclick="changeView('month')" class="flex-1 md:flex-none px-3 md:px-4 py-2 rounded text-sm md:text-base ${state.currentView === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200'}">
            월별
          </button>
          <button onclick="changeView('week')" class="flex-1 md:flex-none px-3 md:px-4 py-2 rounded text-sm md:text-base ${state.currentView === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200'}">
            주별
          </button>
          <button onclick="changeView('day')" class="flex-1 md:flex-none px-3 md:px-4 py-2 rounded text-sm md:text-base ${state.currentView === 'day' ? 'bg-blue-500 text-white' : 'bg-gray-200'}">
            일별
          </button>
        </div>
        
        <div class="date-nav flex space-x-2 items-center justify-between md:justify-start">
          <button onclick="navigatePeriod(-1)" class="px-3 md:px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-base md:text-lg" title="이전 ${state.currentView === 'month' ? '월' : state.currentView === 'week' ? '주' : '날짜'}">
            <i class="fas fa-chevron-left"></i>
          </button>
          <input type="date" id="dateFilter" value="${state.currentDate}" 
                 onchange="changeDate(this.value)" 
                 class="px-2 md:px-3 py-2 border rounded text-sm md:text-base flex-1 md:flex-none">
          <button onclick="navigatePeriod(1)" class="px-3 md:px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-base md:text-lg" title="다음 ${state.currentView === 'month' ? '월' : state.currentView === 'week' ? '주' : '날짜'}">
            <i class="fas fa-chevron-right"></i>
          </button>
          <button onclick="changeDate(dayjs().format('YYYY-MM-DD'))" class="px-3 md:px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm md:text-base whitespace-nowrap">
            오늘
          </button>
        </div>
      </div>
      
      <div class="flex items-center space-x-4">
        <select id="typeFilter" onchange="changeOrderType(this.value)" class="px-3 py-2 border rounded">
          <option value="all" ${state.currentOrderType === 'all' ? 'selected' : ''}>전체</option>
          <option value="container_export" ${state.currentOrderType === 'container_export' ? 'selected' : ''}>컨테이너 수출</option>
          <option value="container_import" ${state.currentOrderType === 'container_import' ? 'selected' : ''}>컨테이너 수입</option>
          <option value="bulk" ${state.currentOrderType === 'bulk' ? 'selected' : ''}>벌크화물</option>
          <option value="lcl" ${state.currentOrderType === 'lcl' ? 'selected' : ''}>LCL</option>
        </select>
        
        <input type="text" id="searchInput" 
               placeholder="검색 (2~3글자)" 
               value="${state.searchQuery}"
               oninput="handleSearch(this.value)"
               class="flex-1 px-3 py-2 border rounded">
               
        <button onclick="downloadExcel()" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          <i class="fas fa-download mr-1"></i>전산다운
        </button>
      </div>
    </div>
  `
}

function renderOrderCard(order) {
  const typeLabel = {
    'container_export': '수출',
    'container_import': '수입',
    'bulk': '벌크',
    'lcl': 'LCL'
  }[order.order_type]
  
  const typeColor = {
    'container_export': 'bg-green-100 text-green-800 border-green-300',
    'container_import': 'bg-blue-100 text-blue-800 border-blue-300',
    'bulk': 'bg-gray-100 text-gray-800 border-gray-300',
    'lcl': 'bg-yellow-100 text-yellow-800 border-yellow-300'
  }[order.order_type]
  
  // 배차/차량정보 없으면 배경색 변경
  const hasDispatch = order.dispatch_company && order.dispatch_company.trim() !== ''
  const hasVehicle = order.vehicle_info && order.vehicle_info.trim() !== ''
  const needsAssignment = !hasDispatch || !hasVehicle
  const bgColor = needsAssignment ? 'bg-red-50' : 'bg-white'
  const borderColor = needsAssignment ? 'border-red-400' : typeColor.split(' ')[2]
  
  const totalBilling = (order.billings || []).reduce((sum, b) => sum + parseFloat(b.amount || 0), 0)
  const totalPayment = (order.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
  
  return `
    <div class="border-l-4 ${typeColor} ${bgColor} p-3 rounded shadow-sm mb-2 cursor-pointer hover:shadow-md transition border ${borderColor}" 
         onclick="viewOrderDetail(${order.id})">
      <div class="flex items-start justify-between mb-2">
        <span class="px-2 py-1 text-xs font-semibold rounded ${typeColor}">
          ${typeLabel}
          ${needsAssignment ? '<i class="fas fa-exclamation-triangle ml-1 text-red-600"></i>' : ''}
        </span>
        <span class="text-xs text-gray-500">${formatTime(order.work_datetime)}</span>
      </div>
      <div class="text-sm font-bold mb-1">${order.booking_number || order.bl_number || order.order_no || '-'}</div>
      <div class="text-xs text-gray-600 mb-1">
        <i class="fas fa-building mr-1"></i>${order.billing_company}
      </div>
      <div class="text-xs text-gray-600 mb-1">
        <i class="fas fa-user mr-1"></i>${order.shipper}
      </div>
      ${order.order_type === 'lcl' ? `
        <div class="text-xs text-gray-600 mb-1">
          <i class="fas fa-arrow-up mr-1 text-green-600"></i>상차: ${order.loading_location || '-'}
        </div>
        <div class="text-xs text-gray-600 mb-1">
          <i class="fas fa-arrow-down mr-1 text-blue-600"></i>하차: ${order.unloading_location || '-'}
        </div>
      ` : `
        ${order.work_site ? `<div class="text-xs text-gray-600 mb-1"><i class="fas fa-map-marker-alt mr-1"></i>${order.work_site}</div>` : ''}
      `}
      ${hasDispatch ? `<div class="text-xs text-gray-600 mb-1"><i class="fas fa-truck mr-1 text-green-600"></i>${order.dispatch_company}</div>` : '<div class="text-xs text-red-600 mb-1"><i class="fas fa-truck mr-1"></i>배차 미지정</div>'}
      ${hasVehicle ? `<div class="text-xs text-gray-500"><i class="fas fa-car mr-1 text-green-600"></i>${order.vehicle_info}</div>` : '<div class="text-xs text-red-600"><i class="fas fa-car mr-1"></i>차량 미배정</div>'}
    </div>
  `
}

function renderOrderList() {
  const listContainer = document.getElementById('orderListContainer')
  if (!listContainer) return
  
  // 로딩 중 표시
  if (state.isLoading) {
    listContainer.innerHTML = `
      <div class="flex items-center justify-center py-20">
        <div class="text-center">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
          <p class="text-gray-600">오더를 불러오는 중...</p>
        </div>
      </div>
    `
    return
  }
  
  // 월별/주별 뷰: 카드 형식
  if (state.currentView === 'month' || state.currentView === 'week') {
    // 날짜별로 그룹핑
    const ordersByDate = {}
    state.orders.forEach(order => {
      const date = order.work_datetime.split(' ')[0]
      if (!ordersByDate[date]) {
        ordersByDate[date] = []
      }
      ordersByDate[date].push(order)
    })
    
    const dates = Object.keys(ordersByDate).sort()
    const daysHtml = dates.map(date => {
      const orders = ordersByDate[date]
      const dayName = dayjs(date).format('ddd')
      const dayNum = dayjs(date).format('D')
      
      return `
        <div class="border rounded-lg bg-gray-50 p-2">
          <div class="font-bold mb-2 text-sm border-b pb-1 cursor-pointer hover:bg-gray-200 px-2 py-1 rounded transition" 
               onclick="changeToDayView('${date}')">
            ${dayjs(date).format('M월 D일')} (${dayName}) <span class="text-xs text-gray-500">${orders.length}건</span>
            <i class="fas fa-search text-xs ml-1 text-blue-500"></i>
          </div>
          <div class="space-y-1 max-h-96 overflow-y-auto">
            ${orders.map(order => renderOrderCard(order)).join('')}
          </div>
        </div>
      `
    }).join('')
    
    listContainer.innerHTML = `
      <div class="grid ${state.currentView === 'week' ? 'grid-cols-7' : 'grid-cols-4'} gap-2">
        ${daysHtml || '<div class="col-span-full text-center text-gray-500 py-8">오더가 없습니다</div>'}
      </div>
    `
    return
  }
  
  // 일별 뷰: 메모장 스타일 좌우 2분할
  if (state.orders.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-20">
        <i class="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
        <p class="text-gray-500">오더가 없습니다</p>
      </div>
    `
    return
  }
  
  // 좌측: 간단한 텍스트 목록
  const textList = state.orders.map((order, index) => {
    const typeLabel = {
      'container_export': '수출',
      'container_import': '수입',
      'bulk': '벌크',
      'lcl': 'LCL'
    }[order.order_type]
    
    const hasDispatch = order.dispatch_company && order.dispatch_company.trim() !== ''
    const hasVehicle = order.vehicle_info && order.vehicle_info.trim() !== ''
    const needsAssignment = !hasDispatch || !hasVehicle
    
    const icon = needsAssignment ? '🔴' : '✅'
    const textColor = needsAssignment ? 'text-red-600' : 'text-gray-700'
    
    return `
      <div class="mb-4 p-3 border-l-4 ${needsAssignment ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'} rounded cursor-pointer hover:bg-blue-50 transition" 
           onclick="selectOrder(${index})">
        <div class="font-mono text-xs ${textColor}">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold">${icon} ${typeLabel} #${index + 1}</span>
            <span class="text-gray-500">${formatTime(order.work_datetime)}</span>
          </div>
          <div class="space-y-0.5 text-xs">
            <div><span class="text-gray-500">청구처:</span> ${order.billing_company || '-'}</div>
            <div><span class="text-gray-500">화주:</span> ${order.shipper || '-'}</div>
            <div><span class="text-gray-500">BKG:</span> ${order.booking_number || order.bl_number || order.order_no || '-'}</div>
            ${hasDispatch ? `<div class="text-green-600"><span class="text-gray-500">배차:</span> ${order.dispatch_company}</div>` : '<div class="text-red-600">⚠️ 배차 미지정</div>'}
          </div>
        </div>
      </div>
    `
  }).join('')
  
  // 우측: 상세 카드 (선택된 오더)
  const ordersHtml = state.orders.map((order, index) => {
    const statusClass = `status-${order.status}`
    const typeLabel = {
      'container_export': '컨수출',
      'container_import': '컨수입',
      'bulk': '벌크',
      'lcl': 'LCL'
    }[order.order_type]
    
    const typeColor = {
      'container_export': 'bg-blue-100 text-blue-800',
      'container_import': 'bg-green-100 text-green-800',
      'bulk': 'bg-orange-100 text-orange-800',
      'lcl': 'bg-purple-100 text-purple-800'
    }[order.order_type]
    
    // 배차/차량정보 체크
    const hasDispatch = order.dispatch_company && order.dispatch_company.trim() !== ''
    const hasVehicle = order.vehicle_info && order.vehicle_info.trim() !== ''
    const needsAssignment = !hasDispatch || !hasVehicle
    const cardBorderClass = needsAssignment ? 'border-red-400 border-2' : 'border-gray-200'
    
    const totalBilling = (order.billings || []).reduce((sum, b) => sum + parseFloat(b.amount || 0), 0)
    const totalPayment = (order.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    const profit = totalBilling - totalPayment
    
    // LCL일 때는 작업지 대신 상하차지 강조
    const workSiteDisplay = order.order_type === 'lcl' 
      ? `<div class="text-sm">
           <span class="text-blue-600 font-semibold">상차: ${order.loading_location || '미정'}</span><br>
           <span class="text-green-600 font-semibold">하차: ${order.unloading_location || '미정'}</span>
         </div>`
      : `<div class="text-sm font-medium">${order.work_site || '-'}</div>`
    
    return `
      <div class="bg-white rounded-lg shadow-sm p-6 font-mono text-sm" data-order-id="${order.id}" id="order-detail-${order.id}">
        <!-- 헤더 -->
        <div class="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-800">
          <div class="flex items-center gap-2">
            <span class="font-bold text-lg">${typeLabel} #${order.id}</span>
            ${needsAssignment ? '<span class="text-red-600 font-bold">🔴 배차필요</span>' : '<span class="text-green-600">✅</span>'}
          </div>
          <button onclick="toggleEditMode(${order.id})" 
                  class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">
            <i class="fas fa-edit mr-1"></i><span id="edit-btn-text-${order.id}">수정</span>
          </button>
        </div>
        
        <!-- 메모장 스타일 내용 -->
        <div id="view-mode-${order.id}" class="space-y-2 whitespace-pre-wrap">
청구처: ${order.billing_company}
화주: ${order.shipper}
작업일시: ${formatDate(order.work_datetime)}

BKG/BL: ${order.booking_number || order.bl_number || order.order_no || '-'}
${order.order_type === 'container_export' || order.order_type === 'container_import' ? `컨테이너: ${order.container_size || '-'}
컨테이너 번호: ${order.container_number || '-'}
씰 번호: ${order.seal_number || '-'}
T.W: ${order.tw || '-'}` : ''}
${order.order_type === 'lcl' && order.container_size ? `차량 종류: ${order.container_size}` : ''}
${order.shipping_line ? `선사: ${order.shipping_line}` : ''}
${order.vessel_name ? `모선: ${order.vessel_name}` : ''}
${order.export_country ? `수출국: ${order.export_country}` : ''}
${order.berth_date ? `접안일: ${order.berth_date}` : ''}
${order.departure_date ? `출항일: ${order.departure_date}` : ''}
${order.weight ? `중량: ${order.weight}` : ''}
${order.bl_number ? `BL: ${order.bl_number}` : ''}
${order.do_status ? `DO: ${order.do_status}` : ''}
${order.customs_clearance ? `통관: ${order.customs_clearance}` : ''}
${order.order_no ? `오더번호: ${order.order_no}` : ''}

${order.loading_location ? `상차지: ${order.loading_location}` : ''}
${order.loading_location_code ? `상차지 코드: ${order.loading_location_code}` : ''}
${order.unloading_location ? `하차지: ${order.unloading_location}` : ''}
${order.unloading_location_code ? `하차지 코드: ${order.unloading_location_code}` : ''}
${order.work_site ? `작업지: ${order.work_site}` : ''}
${order.work_site_code ? `작업지 코드: ${order.work_site_code}` : ''}

배차업체: ${order.dispatch_company || '⚠️ 미지정'}
차량정보: ${order.vehicle_info || '미배정'}
${order.contact_person || order.contact_phone ? `담당자: ${order.contact_person || '-'} / ${order.contact_phone || '-'}` : ''}

💰 청구: ${totalBilling.toLocaleString()}원 (${(order.billings || []).length}건)
💰 하불: ${totalPayment.toLocaleString()}원 (${(order.payments || []).length}건)
💰 수익: ${profit.toLocaleString()}원

${(order.remarks || []).length > 0 ? `\n📝 비고:\n${(order.remarks || []).map(r => `${'⭐'.repeat(r.importance)} ${r.content}`).join('\n')}` : ''}
        </div>
        
        <!-- 수정 모드 (숨김) -->
        <div id="edit-mode-${order.id}" class="hidden">
          <textarea id="edit-textarea-${order.id}" 
                    class="w-full h-96 p-4 border-2 border-blue-500 rounded font-mono text-sm focus:outline-none"
                    placeholder="메모장처럼 수정하세요..."></textarea>
          <div class="flex gap-2 mt-3">
            <button onclick="saveOrderEdit(${order.id})" 
                    class="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold">
              <i class="fas fa-save mr-1"></i>저장
            </button>
            <button onclick="cancelOrderEdit(${order.id})" 
                    class="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-semibold">
              <i class="fas fa-times mr-1"></i>취소
            </button>
          </div>
        </div>
        
        <!-- 청구/하불 관리 버튼 -->
        <div class="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
          <button onclick="showAddBillingModal(${order.id})" 
                  class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <i class="fas fa-plus mr-1"></i>청구 추가
          </button>
          <button onclick="showAddPaymentModal(${order.id})" 
                  class="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
            <i class="fas fa-plus mr-1"></i>하불 추가
          </button>
        </div>
        
        <!-- 액션 버튼들 -->
        <div class="grid grid-cols-2 gap-2 mt-3">
          <button onclick="copyToClipboard(generateAssignmentCopy(state.orders[${index}]))" 
                  class="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
            <i class="fas fa-copy mr-1"></i>배정 복사
          </button>
          <button onclick="copyToClipboard(generateDispatchCopy(state.orders[${index}]))" 
                  class="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
            <i class="fas fa-copy mr-1"></i>배차 복사
          </button>
        </div>
      </div>
    `
  }).join('')
  
  listContainer.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-200px)]">
      <!-- 좌측: 상세 정보 -->
      <div class="lg:col-span-3 border-r pr-4 overflow-y-auto" id="orderDetailsPanel">
        <div class="text-center py-20 text-gray-400">
          <i class="fas fa-hand-pointer text-6xl mb-4"></i>
          <p>오른쪽 목록에서 오더를 선택하세요</p>
        </div>
      </div>
      
      <!-- 우측: 텍스트 목록 -->
      <div class="lg:col-span-2 overflow-y-auto">
        <div class="mb-3 p-3 bg-blue-50 rounded-lg">
          <h3 class="font-bold text-sm flex items-center">
            <i class="fas fa-list mr-2"></i>
            오더 목록 (${state.orders.length}건)
          </h3>
        </div>
        ${textList}
      </div>
    </div>
    </div>
    
    <!-- 숨겨진 카드 데이터 -->
    <div id="orderCardsData" style="display: none;">
      ${ordersHtml}
    </div>
  `
  
  // 첫 번째 오더 자동 선택
  if (state.orders.length > 0) {
    setTimeout(() => selectOrder(0), 100)
  }
}

// 오더 선택 함수
function selectOrder(index) {
  const panel = document.getElementById('orderDetailsPanel')
  const cardsData = document.getElementById('orderCardsData')
  
  if (!panel || !cardsData) return
  
  const cards = cardsData.children
  if (cards[index]) {
    panel.innerHTML = cards[index].outerHTML
    
    // 모든 항목의 하이라이트 제거
    document.querySelectorAll('#orderListContainer .border-l-4').forEach(item => {
      item.classList.remove('bg-blue-100', 'border-blue-500')
    })
    
    // 선택된 항목 하이라이트
    const selectedItem = document.querySelectorAll('#orderListContainer .border-l-4')[index]
    if (selectedItem) {
      selectedItem.classList.add('bg-blue-100', 'border-blue-500')
      selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }
}

// 수정 모드 전환
function toggleEditMode(orderId) {
  const viewMode = document.getElementById(`view-mode-${orderId}`)
  const editMode = document.getElementById(`edit-mode-${orderId}`)
  const textarea = document.getElementById(`edit-textarea-${orderId}`)
  const btnText = document.getElementById(`edit-btn-text-${orderId}`)
  
  if (viewMode.classList.contains('hidden')) {
    // 수정 모드 → 보기 모드
    viewMode.classList.remove('hidden')
    editMode.classList.add('hidden')
    btnText.textContent = '수정'
  } else {
    // 보기 모드 → 수정 모드
    textarea.value = viewMode.textContent.trim()
    viewMode.classList.add('hidden')
    editMode.classList.remove('hidden')
    btnText.textContent = '취소'
  }
}

// 수정 취소
function cancelOrderEdit(orderId) {
  const viewMode = document.getElementById(`view-mode-${orderId}`)
  const editMode = document.getElementById(`edit-mode-${orderId}`)
  const btnText = document.getElementById(`edit-btn-text-${orderId}`)
  
  viewMode.classList.remove('hidden')
  editMode.classList.add('hidden')
  btnText.textContent = '수정'
}

// 수정 저장
async function saveOrderEdit(orderId) {
  const textarea = document.getElementById(`edit-textarea-${orderId}`)
  const text = textarea.value.trim()
  
  if (!text) {
    alert('내용을 입력해주세요.')
    return
  }
  
  // 텍스트 파싱
  const lines = text.split('\n')  // ✅ 수정: \\n → \n
  const updates = {}
  
  lines.forEach(line => {
    const match = line.match(/^([^:]+):\s*(.+)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      
      // 필드 매핑
      if (key === '청구처') updates.billing_company = value
      else if (key === '화주') updates.shipper = value
      else if (key === '작업일시' || key === '진행일시') {
        // 날짜 형식 변환: 2026.01.19 13:00 → 2026-01-19 13:00
        updates.work_datetime = value.replace(/\./g, '-')
      }
      else if (key === 'BKG/BL') updates.booking_number = value
      else if (key === '컨테이너') updates.container_size = value
      else if (key === '차량 종류') updates.container_size = value
      else if (key === '컨테이너 번호') updates.container_number = value
      else if (key === '씰 번호') updates.seal_number = value
      else if (key === 'T.W') updates.tw = value
      else if (key === '선사') updates.shipping_line = value
      else if (key === '모선') updates.vessel_name = value
      else if (key === '수출국') updates.export_country = value
      else if (key === '접안일') updates.berth_date = value
      else if (key === '출항일') updates.departure_date = value
      else if (key === '중량') updates.weight = value
      else if (key === 'BL') updates.bl_number = value
      else if (key === 'DO') updates.do_status = value
      else if (key === '통관') updates.customs_clearance = value
      else if (key === '오더번호') updates.order_no = value
      else if (key === '상차지') updates.loading_location = value
      else if (key === '상차지 코드') updates.loading_location_code = value
      else if (key === '하차지') updates.unloading_location = value
      else if (key === '하차지 코드') updates.unloading_location_code = value
      else if (key === '작업지') updates.work_site = value
      else if (key === '작업지 코드') updates.work_site_code = value
      else if (key === '배차업체') updates.dispatch_company = value
      else if (key === '차량정보') updates.vehicle_info = value
      else if (key === '담당자') {
        const parts = value.split('/')
        if (parts[0]) updates.contact_person = parts[0].trim()
        if (parts[1]) updates.contact_phone = parts[1].trim()
      }
    }
  })
  
  if (Object.keys(updates).length === 0) {
    alert('수정할 내용이 없습니다.')
    return
  }
  
  try {
    await axios.put(`/api/orders/${orderId}`, updates)
    alert('수정되었습니다.')
    
    // 오더 목록 새로고침
    await fetchOrders()
    
    // 현재 오더 다시 선택
    const index = state.orders.findIndex(o => o.id === orderId)
    if (index >= 0) {
      setTimeout(() => selectOrder(index), 100)
    }
  } catch (error) {
    console.error('수정 실패:', error)
    alert('수정에 실패했습니다: ' + (error.response?.data?.error || error.message))
  }
}

function renderCreateOrderPage() {
  return `
    <div class="bg-white p-6 rounded-lg shadow">
      <h2 class="text-2xl font-bold mb-6">오더 입력</h2>
      
      <!-- 입력 방식 선택 탭 -->
      <div class="flex space-x-2 mb-6 border-b">
        <button onclick="changeInputMode('text')" id="tab-text" class="px-4 py-2 font-semibold ${state.inputMode === 'text' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}">
          <i class="fas fa-paste mr-1"></i>텍스트 붙여넣기
        </button>
        <button onclick="changeInputMode('form')" id="tab-form" class="px-4 py-2 font-semibold ${state.inputMode === 'form' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}">
          <i class="fas fa-edit mr-1"></i>직접 입력
        </button>
        <button onclick="changeInputMode('excel')" id="tab-excel" class="px-4 py-2 font-semibold ${state.inputMode === 'excel' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}">
          <i class="fas fa-file-excel mr-1"></i>엑셀 업로드
        </button>
      </div>
      
      <div id="inputContent"></div>
    </div>
  `
}

function renderTodoList() {
  const todosHtml = state.todos.map(todo => {
    // 오더 연결 정보 표시
    const orderInfo = todo.order_id ? `
      <span class="text-xs text-blue-600 ml-2 cursor-pointer hover:underline" 
            onclick="goToOrderFromTodo(${todo.order_id})">
        <i class="fas fa-link"></i> 오더 #${todo.order_id}
      </span>
    ` : ''
    
    return `
      <li class="flex items-center justify-between p-3 border-b hover:bg-gray-50">
        <div class="flex items-center flex-1">
          <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                 onchange="toggleTodo(${todo.id}, this.checked)"
                 class="mr-3">
          <div class="flex-1">
            <span class="${todo.completed ? 'line-through text-gray-400' : ''}">${todo.content}</span>
            ${orderInfo}
          </div>
        </div>
        <button onclick="deleteTodo(${todo.id})" class="text-red-600 hover:text-red-800">
          <i class="fas fa-trash"></i>
        </button>
      </li>
    `
  }).join('')
  
  const todoContainer = document.getElementById('todoContainer')
  if (todoContainer) {
    todoContainer.innerHTML = `
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="text-lg font-bold mb-4">할일 목록</h3>
        <div class="mb-4">
          <input type="text" id="newTodoInput" 
                 placeholder="할일 입력..." 
                 class="w-full px-3 py-2 border rounded mb-2"
                 onkeypress="if(event.key==='Enter') addTodo()">
          <div class="flex items-center space-x-2">
            <input type="number" id="linkedOrderId" 
                   placeholder="연결할 오더 ID (선택)" 
                   class="flex-1 px-3 py-2 border rounded text-sm">
            <button onclick="addTodo()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              <i class="fas fa-plus mr-1"></i>추가
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-1">💡 오더 상세에서 "할일 추가" 버튼을 사용하면 자동으로 연결됩니다</p>
        </div>
        <ul>
          ${todosHtml || '<li class="p-3 text-center text-gray-500">할일이 없습니다</li>'}
        </ul>
      </div>
    `
  }
}

function renderCodesManagementPage() {
  return `
    <div class="grid grid-cols-2 gap-6">
      <!-- 상하차지 코드 관리 -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-2xl font-bold mb-4">
          <i class="fas fa-map-marker-alt mr-2"></i>상하차지 코드 관리
        </h2>
        <div class="mb-4">
          <button onclick="showAddLocationCodeModal()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <i class="fas fa-plus mr-1"></i>추가
          </button>
        </div>
        <div class="overflow-auto max-h-96">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                <th class="px-3 py-2 text-left">상하차지명</th>
                <th class="px-3 py-2 text-left">코드</th>
                <th class="px-3 py-2 text-left">배차업체</th>
                <th class="px-3 py-2 text-center">수정</th>
                <th class="px-3 py-2 text-center">삭제</th>
              </tr>
            </thead>
            <tbody>
              ${state.locationCodes.map(loc => `
                <tr class="border-b hover:bg-gray-50">
                  <td class="px-3 py-2">${loc.name}</td>
                  <td class="px-3 py-2">${loc.code}</td>
                  <td class="px-3 py-2">${loc.dispatch_company || '-'}</td>
                  <td class="px-3 py-2 text-center">
                    <button onclick="editLocationCode(${loc.id})" class="text-blue-600 hover:text-blue-800">
                      <i class="fas fa-edit"></i>
                    </button>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <button onclick="deleteLocationCode(${loc.id})" class="text-red-600 hover:text-red-800">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- 선사 코드 관리 -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-2xl font-bold mb-4">
          <i class="fas fa-ship mr-2"></i>선사 코드 관리
        </h2>
        <div class="mb-4">
          <button onclick="showAddShippingLineModal()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <i class="fas fa-plus mr-1"></i>추가
          </button>
        </div>
        <div class="overflow-auto max-h-96">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                <th class="px-3 py-2 text-left">선사명</th>
                <th class="px-3 py-2 text-left">코드</th>
                <th class="px-3 py-2 text-center">수정</th>
                <th class="px-3 py-2 text-center">삭제</th>
              </tr>
            </thead>
            <tbody>
              ${state.shippingLines.map(ship => `
                <tr class="border-b hover:bg-gray-50">
                  <td class="px-3 py-2">${ship.name}</td>
                  <td class="px-3 py-2">${ship.code}</td>
                  <td class="px-3 py-2 text-center">
                    <button onclick="editShippingLine(${ship.id})" class="text-blue-600 hover:text-blue-800">
                      <i class="fas fa-edit"></i>
                    </button>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <button onclick="deleteShippingLine(${ship.id})" class="text-red-600 hover:text-red-800">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- 협력업체 (하불업체) 관리 -->
      <div class="bg-white p-6 rounded-lg shadow col-span-2">
        <h2 class="text-2xl font-bold mb-4">
          <i class="fas fa-truck mr-2"></i>협력업체 (하불업체) 관리
        </h2>
        <div class="mb-4 flex space-x-2">
          <button onclick="showAddDispatchCompanyModal()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <i class="fas fa-plus mr-1"></i>추가
          </button>
          <button onclick="showUploadDispatchCompaniesModal()" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            <i class="fas fa-file-excel mr-1"></i>엑셀 업로드
          </button>
        </div>
        <div class="overflow-auto max-h-96">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                <th class="px-3 py-2 text-left">업체명</th>
                <th class="px-3 py-2 text-left">담당자</th>
                <th class="px-3 py-2 text-left">연락처</th>
                <th class="px-3 py-2 text-left">운송</th>
                <th class="px-3 py-2 text-left">운송지역</th>
                <th class="px-3 py-2 text-left">비고</th>
                <th class="px-3 py-2 text-center">수정</th>
                <th class="px-3 py-2 text-center">삭제</th>
              </tr>
            </thead>
            <tbody>
              ${state.dispatchCompanies.map(company => `
                <tr class="border-b hover:bg-gray-50">
                  <td class="px-3 py-2">${company.name}</td>
                  <td class="px-3 py-2">${company.manager || '-'}</td>
                  <td class="px-3 py-2">${company.contact || '-'}</td>
                  <td class="px-3 py-2">${company.transport_type || '-'}</td>
                  <td class="px-3 py-2">${company.transport_area || '-'}</td>
                  <td class="px-3 py-2 text-xs">${company.remarks || '-'}</td>
                  <td class="px-3 py-2 text-center">
                    <button onclick="editDispatchCompany(${company.id})" class="text-blue-600 hover:text-blue-800">
                      <i class="fas fa-edit"></i>
                    </button>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <button onclick="deleteDispatchCompany(${company.id})" class="text-red-600 hover:text-red-800">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
}

function renderClientsManagementPage() {
  return `
    <div class="bg-white p-6 rounded-lg shadow">
      <h2 class="text-2xl font-bold mb-4">
        <i class="fas fa-building mr-2"></i>거래처 관리
      </h2>
      
      <!-- 탭 버튼 -->
      <div class="flex space-x-2 mb-4 border-b">
        <button onclick="switchClientTab('billing-sales')" 
                id="tab-btn-billing-sales"
                class="px-4 py-2 font-semibold border-b-2 border-blue-600 text-blue-600">
          청구처-영업담당자
        </button>
        <button onclick="switchClientTab('shippers')" 
                id="tab-btn-shippers"
                class="px-4 py-2 font-semibold border-b-2 border-transparent text-gray-600 hover:text-gray-800">
          화주 검색
        </button>
      </div>
      
      <!-- 청구처-영업담당자 탭 -->
      <div id="client-tab-billing-sales" class="client-tab-content">
        <p class="text-gray-600 mb-4">청구처별 영업담당자를 관리합니다.</p>
        
        <div class="mb-4 flex justify-between items-center">
          <button onclick="showAddBillingSalesModal()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <i class="fas fa-plus mr-1"></i>청구처 추가
          </button>
          <input type="text" id="billingSalesSearch" placeholder="청구처 검색..." 
                 oninput="filterBillingSales(this.value)" 
                 class="px-3 py-2 border rounded w-64">
        </div>
        
        <div id="billingSalesTableContainer" class="overflow-auto">
          <div class="text-center py-8">
            <i class="fas fa-spinner fa-spin text-3xl text-gray-400"></i>
            <p class="text-gray-500 mt-2">로딩 중...</p>
          </div>
        </div>
      </div>
      
      <!-- 화주 검색 탭 -->
      <div id="client-tab-shippers" class="client-tab-content" style="display: none;">
        <p class="text-gray-600 mb-4">청구처별 화주를 검색하고 관리합니다.</p>
        
        <div class="mb-4">
          <input type="text" id="shipperSearchInput" placeholder="화주명 검색..." 
                 oninput="searchShippers(this.value)" 
                 class="px-3 py-2 border rounded w-full">
        </div>
        
        <div id="shipperSearchResults" class="overflow-auto">
          <div class="text-center py-8 text-gray-500">
            <i class="fas fa-search text-4xl mb-2"></i>
            <p>화주명을 입력하여 검색하세요</p>
          </div>
        </div>
      </div>
    </div>
  `
}

// 거래처 관리 탭 전환
function switchClientTab(tabName) {
  // 모든 탭 숨기기
  document.querySelectorAll('.client-tab-content').forEach(tab => {
    tab.style.display = 'none'
  })
  
  // 모든 탭 버튼 비활성화
  document.querySelectorAll('[id^="tab-btn-"]').forEach(btn => {
    btn.className = 'px-4 py-2 font-semibold border-b-2 border-transparent text-gray-600 hover:text-gray-800'
  })
  
  // 선택된 탭 보이기
  const selectedTab = document.getElementById(`client-tab-${tabName}`)
  if (selectedTab) {
    selectedTab.style.display = 'block'
  }
  
  // 선택된 탭 버튼 활성화
  const selectedBtn = document.getElementById(`tab-btn-${tabName}`)
  if (selectedBtn) {
    selectedBtn.className = 'px-4 py-2 font-semibold border-b-2 border-blue-600 text-blue-600'
  }
}

// 화주 검색
async function searchShippers(query) {
  const resultsContainer = document.getElementById('shipperSearchResults')
  
  if (!query || query.trim() === '') {
    resultsContainer.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-search text-4xl mb-2"></i>
        <p>화주명을 입력하여 검색하세요</p>
      </div>
    `
    return
  }
  
  resultsContainer.innerHTML = `
    <div class="text-center py-8">
      <i class="fas fa-spinner fa-spin text-3xl text-gray-400"></i>
      <p class="text-gray-500 mt-2">검색 중...</p>
    </div>
  `
  
  try {
    const response = await axios.get(`/api/billing-shippers?search=${encodeURIComponent(query)}`)
    const shippers = response.data
    
    if (shippers.length === 0) {
      resultsContainer.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-inbox text-4xl mb-2"></i>
          <p>"${query}"에 대한 검색 결과가 없습니다</p>
        </div>
      `
      return
    }
    
    // 청구처별로 그룹핑
    const groupedByBilling = {}
    shippers.forEach(s => {
      if (!groupedByBilling[s.billing_company]) {
        groupedByBilling[s.billing_company] = []
      }
      groupedByBilling[s.billing_company].push(s)
    })
    
    const html = `
      <div class="space-y-4">
        <div class="text-sm text-gray-600 mb-2">
          <i class="fas fa-check-circle text-green-600"></i> 총 ${shippers.length}개의 화주가 ${Object.keys(groupedByBilling).length}개 청구처에서 발견되었습니다
        </div>
        ${Object.entries(groupedByBilling).map(([billingCompany, shipperList]) => `
          <div class="border rounded-lg p-4 bg-gray-50">
            <div class="font-bold text-lg mb-2 text-blue-800">
              <i class="fas fa-building mr-2"></i>${billingCompany}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              ${shipperList.map(s => `
                <div class="bg-white p-2 rounded border hover:shadow-md transition">
                  <div class="flex items-center justify-between">
                    <span class="font-semibold">${s.shipper}</span>
                    <button onclick="deleteShipper(${s.id}, '${s.shipper}')" 
                            class="text-red-600 hover:text-red-800 text-sm">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                  ${s.memo ? `<div class="text-xs text-gray-500 mt-1">${s.memo}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `
    
    resultsContainer.innerHTML = html
  } catch (error) {
    console.error('화주 검색 실패:', error)
    resultsContainer.innerHTML = `
      <div class="text-center py-8 text-red-500">
        <i class="fas fa-exclamation-circle text-4xl mb-2"></i>
        <p>검색 중 오류가 발생했습니다</p>
      </div>
    `
  }
}

// 화주 삭제
async function deleteShipper(id, shipperName) {
  if (!confirm(`"${shipperName}" 화주를 삭제하시겠습니까?`)) return
  
  try {
    await axios.delete(`/api/billing-shippers/${id}`)
    alert('삭제되었습니다.')
    // 현재 검색어로 다시 검색
    const searchInput = document.getElementById('shipperSearchInput')
    if (searchInput) {
      searchShippers(searchInput.value)
    }
  } catch (error) {
    console.error('화주 삭제 실패:', error)
    alert('삭제에 실패했습니다.')
  }
}

// 코드 관리 함수들
async function deleteLocationCode(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return
  try {
    await axios.delete(`/api/location-codes/${id}`)
    fetchLocationCodes()
    alert('삭제되었습니다.')
  } catch (error) {
    console.error('삭제 실패:', error)
    alert('삭제에 실패했습니다.')
  }
}

async function deleteShippingLine(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return
  try {
    await axios.delete(`/api/shipping-lines/${id}`)
    fetchShippingLines()
    alert('삭제되었습니다.')
  } catch (error) {
    console.error('삭제 실패:', error)
    alert('삭제에 실패했습니다.')
  }
}

async function deleteDispatchCompany(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return
  try {
    await axios.delete(`/api/dispatch-companies/${id}`)
    fetchDispatchCompanies()
    alert('삭제되었습니다.')
  } catch (error) {
    console.error('삭제 실패:', error)
    alert('삭제에 실패했습니다.')
  }
}

function showAddLocationCodeModal() {
  const modalHtml = `
    <div id="locationModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">상하차지 코드 추가</h3>
          <button onclick="closeLocationModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block font-semibold mb-1">상하차지명 *</label>
            <input type="text" id="location_name" class="w-full px-3 py-2 border rounded" required>
          </div>
          
          <div>
            <label class="block font-semibold mb-1">코드 *</label>
            <input type="text" id="location_code" class="w-full px-3 py-2 border rounded" required>
          </div>
          
          <div>
            <label class="block font-semibold mb-1">배차업체</label>
            <input type="text" id="location_dispatch_company" class="w-full px-3 py-2 border rounded">
          </div>
          
          <div class="flex justify-end space-x-2 mt-6">
            <button onclick="closeLocationModal()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
              취소
            </button>
            <button onclick="saveLocationCode()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', modalHtml)
}

async function editLocationCode(id) {
  const location = state.locationCodes.find(l => l.id === id)
  if (!location) return
  
  const modalHtml = `
    <div id="locationModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">상하차지 코드 수정</h3>
          <button onclick="closeLocationModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block font-semibold mb-1">상하차지명 *</label>
            <input type="text" id="location_name" value="${location.name}" class="w-full px-3 py-2 border rounded" required>
          </div>
          
          <div>
            <label class="block font-semibold mb-1">코드 *</label>
            <input type="text" id="location_code" value="${location.code}" class="w-full px-3 py-2 border rounded" required>
          </div>
          
          <div>
            <label class="block font-semibold mb-1">배차업체</label>
            <input type="text" id="location_dispatch_company" value="${location.dispatch_company || ''}" class="w-full px-3 py-2 border rounded">
          </div>
          
          <div class="flex justify-end space-x-2 mt-6">
            <button onclick="closeLocationModal()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
              취소
            </button>
            <button onclick="updateLocationCode(${location.id})" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              수정
            </button>
          </div>
        </div>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', modalHtml)
}

function closeLocationModal() {
  const modal = document.getElementById('locationModal')
  if (modal) modal.remove()
}

async function saveLocationCode() {
  const name = document.getElementById('location_name').value.trim()
  const code = document.getElementById('location_code').value.trim()
  
  if (!name || !code) {
    alert('상하차지명과 코드는 필수입니다.')
    return
  }
  
  const data = {
    name,
    code,
    dispatch_company: document.getElementById('location_dispatch_company').value.trim()
  }
  
  try {
    await axios.post('/api/location-codes', data)
    alert('상하차지 코드가 추가되었습니다.')
    closeLocationModal()
    await fetchLocationCodes()
    renderApp()
  } catch (error) {
    console.error('상하차지 코드 추가 실패:', error)
    alert('상하차지 코드 추가에 실패했습니다.')
  }
}

async function updateLocationCode(id) {
  const name = document.getElementById('location_name').value.trim()
  const code = document.getElementById('location_code').value.trim()
  
  if (!name || !code) {
    alert('상하차지명과 코드는 필수입니다.')
    return
  }
  
  const data = {
    name,
    code,
    dispatch_company: document.getElementById('location_dispatch_company').value.trim()
  }
  
  try {
    await axios.put(`/api/location-codes/${id}`, data)
    alert('상하차지 코드가 수정되었습니다.')
    closeLocationModal()
    await fetchLocationCodes()
    renderApp()
  } catch (error) {
    console.error('상하차지 코드 수정 실패:', error)
    alert('상하차지 코드 수정에 실패했습니다.')
  }
}

function showAddShippingLineModal() {
  const modalHtml = `
    <div id="shippingModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">선사 코드 추가</h3>
          <button onclick="closeShippingModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block font-semibold mb-1">선사명 *</label>
            <input type="text" id="shipping_name" class="w-full px-3 py-2 border rounded" required>
          </div>
          
          <div>
            <label class="block font-semibold mb-1">코드 *</label>
            <input type="text" id="shipping_code" class="w-full px-3 py-2 border rounded" required>
          </div>
          
          <div class="flex justify-end space-x-2 mt-6">
            <button onclick="closeShippingModal()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
              취소
            </button>
            <button onclick="saveShippingLine()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', modalHtml)
}

async function editShippingLine(id) {
  const shipping = state.shippingLines.find(s => s.id === id)
  if (!shipping) return
  
  const modalHtml = `
    <div id="shippingModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">선사 코드 수정</h3>
          <button onclick="closeShippingModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block font-semibold mb-1">선사명 *</label>
            <input type="text" id="shipping_name" value="${shipping.name}" class="w-full px-3 py-2 border rounded" required>
          </div>
          
          <div>
            <label class="block font-semibold mb-1">코드 *</label>
            <input type="text" id="shipping_code" value="${shipping.code}" class="w-full px-3 py-2 border rounded" required>
          </div>
          
          <div class="flex justify-end space-x-2 mt-6">
            <button onclick="closeShippingModal()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
              취소
            </button>
            <button onclick="updateShippingLine(${shipping.id})" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              수정
            </button>
          </div>
        </div>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', modalHtml)
}

function closeShippingModal() {
  const modal = document.getElementById('shippingModal')
  if (modal) modal.remove()
}

async function saveShippingLine() {
  const name = document.getElementById('shipping_name').value.trim()
  const code = document.getElementById('shipping_code').value.trim()
  
  if (!name || !code) {
    alert('선사명과 코드는 필수입니다.')
    return
  }
  
  const data = { name, code }
  
  try {
    await axios.post('/api/shipping-lines', data)
    alert('선사 코드가 추가되었습니다.')
    closeShippingModal()
    await fetchShippingLines()
    renderApp()
  } catch (error) {
    console.error('선사 코드 추가 실패:', error)
    alert('선사 코드 추가에 실패했습니다.')
  }
}

async function updateShippingLine(id) {
  const name = document.getElementById('shipping_name').value.trim()
  const code = document.getElementById('shipping_code').value.trim()
  
  if (!name || !code) {
    alert('선사명과 코드는 필수입니다.')
    return
  }
  
  const data = { name, code }
  
  try {
    await axios.put(`/api/shipping-lines/${id}`, data)
    alert('선사 코드가 수정되었습니다.')
    closeShippingModal()
    await fetchShippingLines()
    renderApp()
  } catch (error) {
    console.error('선사 코드 수정 실패:', error)
    alert('선사 코드 수정에 실패했습니다.')
  }
}

function showAddDispatchCompanyModal() {
  const modalHtml = `
    <div id="dispatchModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">협력업체 추가</h3>
          <button onclick="closeDispatchModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block font-semibold mb-1">업체명 *</label>
            <input type="text" id="dispatch_name" class="w-full px-3 py-2 border rounded" required>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-semibold mb-1">담당자</label>
              <input type="text" id="dispatch_manager" class="w-full px-3 py-2 border rounded">
            </div>
            <div>
              <label class="block font-semibold mb-1">연락처</label>
              <input type="text" id="dispatch_contact" class="w-full px-3 py-2 border rounded">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-semibold mb-1">운송유형</label>
              <input type="text" id="dispatch_transport_type" placeholder="DRY, HC, RF 등" class="w-full px-3 py-2 border rounded">
            </div>
            <div>
              <label class="block font-semibold mb-1">운송지역</label>
              <input type="text" id="dispatch_transport_area" placeholder="부산, 광양 등" class="w-full px-3 py-2 border rounded">
            </div>
          </div>
          
          <div>
            <label class="block font-semibold mb-1">비고</label>
            <textarea id="dispatch_notes" rows="3" class="w-full px-3 py-2 border rounded"></textarea>
          </div>
          
          <div class="flex justify-end space-x-2 mt-6">
            <button onclick="closeDispatchModal()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
              취소
            </button>
            <button onclick="saveDispatchCompany()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', modalHtml)
}

async function editDispatchCompany(id) {
  const company = state.dispatchCompanies.find(c => c.id === id)
  if (!company) return
  
  const modalHtml = `
    <div id="dispatchModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">협력업체 수정</h3>
          <button onclick="closeDispatchModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block font-semibold mb-1">업체명 *</label>
            <input type="text" id="dispatch_name" value="${company.name}" class="w-full px-3 py-2 border rounded" required>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-semibold mb-1">담당자</label>
              <input type="text" id="dispatch_manager" value="${company.manager || ''}" class="w-full px-3 py-2 border rounded">
            </div>
            <div>
              <label class="block font-semibold mb-1">연락처</label>
              <input type="text" id="dispatch_contact" value="${company.contact || ''}" class="w-full px-3 py-2 border rounded">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-semibold mb-1">운송유형</label>
              <input type="text" id="dispatch_transport_type" value="${company.transport_type || ''}" placeholder="DRY, HC, RF 등" class="w-full px-3 py-2 border rounded">
            </div>
            <div>
              <label class="block font-semibold mb-1">운송지역</label>
              <input type="text" id="dispatch_transport_area" value="${company.transport_area || ''}" placeholder="부산, 광양 등" class="w-full px-3 py-2 border rounded">
            </div>
          </div>
          
          <div>
            <label class="block font-semibold mb-1">비고</label>
            <textarea id="dispatch_notes" rows="3" class="w-full px-3 py-2 border rounded">${company.notes || ''}</textarea>
          </div>
          
          <div class="flex justify-end space-x-2 mt-6">
            <button onclick="closeDispatchModal()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
              취소
            </button>
            <button onclick="updateDispatchCompany(${company.id})" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              수정
            </button>
          </div>
        </div>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', modalHtml)
}

function closeDispatchModal() {
  const modal = document.getElementById('dispatchModal')
  if (modal) modal.remove()
}

async function saveDispatchCompany() {
  const name = document.getElementById('dispatch_name').value.trim()
  if (!name) {
    alert('업체명은 필수입니다.')
    return
  }
  
  const data = {
    name,
    manager: document.getElementById('dispatch_manager').value.trim(),
    contact: document.getElementById('dispatch_contact').value.trim(),
    transport_type: document.getElementById('dispatch_transport_type').value.trim(),
    transport_area: document.getElementById('dispatch_transport_area').value.trim(),
    notes: document.getElementById('dispatch_notes').value.trim()
  }
  
  try {
    await axios.post('/api/dispatch-companies', data)
    alert('협력업체가 추가되었습니다.')
    closeDispatchModal()
    await fetchDispatchCompanies()
    renderApp()
  } catch (error) {
    console.error('협력업체 추가 실패:', error)
    alert('협력업체 추가에 실패했습니다.')
  }
}

async function updateDispatchCompany(id) {
  const name = document.getElementById('dispatch_name').value.trim()
  if (!name) {
    alert('업체명은 필수입니다.')
    return
  }
  
  const data = {
    name,
    manager: document.getElementById('dispatch_manager').value.trim(),
    contact: document.getElementById('dispatch_contact').value.trim(),
    transport_type: document.getElementById('dispatch_transport_type').value.trim(),
    transport_area: document.getElementById('dispatch_transport_area').value.trim(),
    notes: document.getElementById('dispatch_notes').value.trim()
  }
  
  try {
    await axios.put(`/api/dispatch-companies/${id}`, data)
    alert('협력업체가 수정되었습니다.')
    closeDispatchModal()
    await fetchDispatchCompanies()
    renderApp()
  } catch (error) {
    console.error('협력업체 수정 실패:', error)
    alert('협력업체 수정에 실패했습니다.')
  }
}

function showUploadDispatchCompaniesModal() {
  const modalHtml = `
    <div id="uploadModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-xl">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">협력업체 엑셀 업로드</h3>
          <button onclick="closeUploadModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="mb-4">
          <p class="text-sm text-gray-600 mb-2">엑셀 파일 형식:</p>
          <ul class="text-xs text-gray-500 list-disc list-inside">
            <li>1열: 구분 (운송 등)</li>
            <li>2열: 업체명</li>
            <li>3열: 담당자</li>
            <li>4열: 연락처</li>
            <li>5열: 운송유형 (DRY, HC 등)</li>
            <li>6열: 운송지역</li>
          </ul>
        </div>
        
        <div class="mb-4">
          <input type="file" id="dispatch_excel_file" accept=".xlsx,.xls" class="w-full px-3 py-2 border rounded">
        </div>
        
        <div class="flex justify-end space-x-2">
          <button onclick="closeUploadModal()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
            취소
          </button>
          <button onclick="uploadDispatchExcel()" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            업로드
          </button>
        </div>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', modalHtml)
}

function closeUploadModal() {
  const modal = document.getElementById('uploadModal')
  if (modal) modal.remove()
}

async function uploadDispatchExcel() {
  const fileInput = document.getElementById('dispatch_excel_file')
  const file = fileInput.files[0]
  
  if (!file) {
    alert('파일을 선택해주세요.')
    return
  }
  
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    const response = await axios.post('/api/admin/import-dispatch-companies-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-Admin-Key': 'reset-transport-db-2024'
      }
    })
    
    alert(`협력업체 데이터 업로드 완료\n업데이트: ${response.data.updated}개\n신규: ${response.data.inserted}개`)
    closeUploadModal()
    await fetchDispatchCompanies()
    renderApp()
  } catch (error) {
    console.error('엑셀 업로드 실패:', error)
    alert('엑셀 업로드에 실패했습니다.')
  }
}

function showAddBillingCompanyModal() {
  alert('청구업체 추가 모달은 곧 구현됩니다.')
}

// ============================================
// 직접 입력 폼 관련 함수
// ============================================

function changeFormOrderType(type) {
  state.formOrderType = type
  renderFormFields()
}

function renderFormFields() {
  const container = document.getElementById('formFields')
  if (!container) return
  
  let fieldsHtml = ''
  
  if (state.formOrderType === 'container_export') {
    fieldsHtml = `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-semibold">BKG / SIZE :</label>
            <input type="text" id="field_bkg" placeholder="HASLK01251101730 / 40HQ" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">청구처 :</label>
            <input type="text" id="field_billing" placeholder="베스트부품" class="w-full px-3 py-2 border rounded" onchange="fetchSalesPersonForBillingCompany(this.value, 'form_sales_person')">
            <div id="form_sales_person_container" class="mt-1 text-sm text-blue-600"></div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-semibold">화주 :</label>
            <input type="text" id="field_shipper" placeholder="베스트부품" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">작업지 :</label>
            <input type="text" id="field_worksite" placeholder="경기도 김포시 월곶면 갈산리 171-54" class="w-full px-3 py-2 border rounded">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-semibold">담당자 / 연락처 :</label>
            <input type="text" id="field_contact" placeholder="이상로 이사님 / 010-7290-2112" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">작업일시 :</label>
            <input type="datetime-local" id="field_datetime" class="w-full px-3 py-2 border rounded">
          </div>
        </div>
        
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 font-semibold">선사 :</label>
            <input type="text" id="field_shipping" placeholder="HAS 흥아라인" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">모선 :</label>
            <input type="text" id="field_vessel" placeholder="SURABAYA VOYAGR / 9011N" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">수출국 :</label>
            <input type="text" id="field_export" placeholder="BUSAN / VLADIVOSTOK" class="w-full px-3 py-2 border rounded">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-semibold">접안일 / 출항일 :</label>
            <input type="text" id="field_berth" placeholder="11월29일 / 11월29일" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">상차지 / 하차지 :</label>
            <input type="text" id="field_location" placeholder="인천승진CY / BPT 신선대" class="w-full px-3 py-2 border rounded">
          </div>
        </div>
        
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 font-semibold">중량 :</label>
            <input type="text" id="field_weight" placeholder="ABT.10TON / 계근 必" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">배차 :</label>
            <input type="text" id="field_dispatch" placeholder="양양운수" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">차량 :</label>
            <input type="text" id="field_vehicle" placeholder="경기99바1133 / 010-3219-4316" class="w-full px-3 py-2 border rounded">
          </div>
        </div>
        
        <div>
          <label class="block mb-1 font-semibold">컨테이너 넘버 / T.W / 씰 넘버 :</label>
          <input type="text" id="field_container" placeholder="DFSU2964946 / 2,815 KGS / HAL133314" class="w-full px-3 py-2 border rounded">
        </div>
        
        <div>
          <label class="block mb-1 font-semibold">* 비고 :</label>
          <textarea id="field_remarks" rows="3" placeholder="비고 내용 입력..." class="w-full px-3 py-2 border rounded"></textarea>
          <div class="mt-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">중요도:</label>
            <select id="field_remarks_importance" class="w-full px-3 py-2 border rounded">
              <option value="0">🟢 낮음 (Low)</option>
              <option value="1" selected>🟡 보통 (Medium)</option>
              <option value="2">🔴 높음 (High)</option>
              <option value="3">🔥 긴급 (Urgent)</option>
            </select>
          </div>
        </div>
        
        <button onclick="submitFormOrder()" class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <i class="fas fa-save mr-2"></i>오더 생성
        </button>
      </div>
    `
  } else if (state.formOrderType === 'container_import') {
    fieldsHtml = `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-semibold">BL :</label>
            <input type="text" id="field_bl" placeholder="HASLC05251003220" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">컨테이너 넘버 / SIZE :</label>
            <input type="text" id="field_container_size" placeholder="HLHU8486174 / 40HQ*1" class="w-full px-3 py-2 border rounded">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-semibold">청구처 :</label>
            <input type="text" id="field_billing" placeholder="제이디쉬핑라인" class="w-full px-3 py-2 border rounded" onchange="fetchSalesPersonForBillingCompany(this.value, 'form_sales_person')">
            <div id="form_sales_person_container" class="mt-1 text-sm text-blue-600"></div>
          </div>
          <div>
            <label class="block mb-1 font-semibold">화주 :</label>
            <input type="text" id="field_shipper" placeholder="바스엔" class="w-full px-3 py-2 border rounded">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-semibold">작업지 :</label>
            <input type="text" id="field_worksite" placeholder="인천 서구 원당대로 395-99" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">담당자 / 연락처 :</label>
            <input type="text" id="field_contact" placeholder="이진완과장님 / 010-9355-8283" class="w-full px-3 py-2 border rounded">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-semibold">작업일시 :</label>
            <input type="datetime-local" id="field_datetime" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">선사 :</label>
            <input type="text" id="field_shipping" placeholder="HAS 흥아라인" class="w-full px-3 py-2 border rounded">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-semibold">모선 :</label>
            <input type="text" id="field_vessel" placeholder="선명 입력" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">접안일 / 출항일 :</label>
            <input type="text" id="field_berth" placeholder="11월29일 / 11월29일" class="w-full px-3 py-2 border rounded">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-semibold">상차지 / 하차지 :</label>
            <input type="text" id="field_location" placeholder="ICT / ICT" class="w-full px-3 py-2 border rounded">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block mb-1 font-semibold">DO :</label>
              <input type="text" id="field_do" placeholder="ㅇ" class="w-full px-3 py-2 border rounded">
            </div>
            <div>
              <label class="block mb-1 font-semibold">면장 :</label>
              <input type="text" id="field_customs" placeholder="ㅇ" class="w-full px-3 py-2 border rounded">
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-semibold">배차 :</label>
            <input type="text" id="field_dispatch" placeholder="로지아이솔루션" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">차량 :</label>
            <input type="text" id="field_vehicle" placeholder="인천99아8737 / 김경주 기사님 / 010-7455-3430" class="w-full px-3 py-2 border rounded">
          </div>
        </div>
        
        <div>
          <label class="block mb-1 font-semibold">* 비고 :</label>
          <textarea id="field_remarks" rows="3" placeholder="비고 내용 입력..." class="w-full px-3 py-2 border rounded"></textarea>
          <div class="mt-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">중요도:</label>
            <select id="field_remarks_importance" class="w-full px-3 py-2 border rounded">
              <option value="0">🟢 낮음 (Low)</option>
              <option value="1" selected>🟡 보통 (Medium)</option>
              <option value="2">🔴 높음 (High)</option>
              <option value="3">🔥 긴급 (Urgent)</option>
            </select>
          </div>
        </div>
        
        <button onclick="submitFormOrder()" class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <i class="fas fa-save mr-2"></i>오더 생성
        </button>
      </div>
    `
  } else {
    // 벌크화물 또는 LCL
    fieldsHtml = `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-semibold">NO :</label>
            <input type="text" id="field_no" placeholder="오더 번호" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">청구처 :</label>
            <input type="text" id="field_billing" placeholder="청구처명" class="w-full px-3 py-2 border rounded" onchange="fetchSalesPersonForBillingCompany(this.value, 'form_sales_person')">
            <div id="form_sales_person_container" class="mt-1 text-sm text-blue-600"></div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-semibold">화주 :</label>
            <input type="text" id="field_shipper" placeholder="화주명" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">선사 :</label>
            <input type="text" id="field_shipping" placeholder="선사명" class="w-full px-3 py-2 border rounded">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-semibold">상차지 :</label>
            <input type="text" id="field_loading" placeholder="상차지 위치" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">하차지 :</label>
            <input type="text" id="field_unloading" placeholder="하차지 위치" class="w-full px-3 py-2 border rounded">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-semibold">상차일 (작업일시) :</label>
            <input type="datetime-local" id="field_loading_datetime" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">하차일 (선택) :</label>
            <input type="datetime-local" id="field_unloading_datetime" class="w-full px-3 py-2 border rounded">
          </div>
        </div>
        
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 font-semibold">배차 :</label>
            <input type="text" id="field_dispatch" placeholder="배차업체" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">차량 :</label>
            <input type="text" id="field_vehicle" placeholder="차량 번호" class="w-full px-3 py-2 border rounded">
          </div>
          <div>
            <label class="block mb-1 font-semibold">차량정보 :</label>
            <input type="text" id="field_vehicle_info" placeholder="기사님 정보" class="w-full px-3 py-2 border rounded">
          </div>
        </div>
        
        <div>
          <label class="block mb-1 font-semibold">* 비고 :</label>
          <textarea id="field_remarks" rows="3" placeholder="비고 내용 입력..." class="w-full px-3 py-2 border rounded"></textarea>
          <div class="mt-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">중요도:</label>
            <select id="field_remarks_importance" class="w-full px-3 py-2 border rounded">
              <option value="0">🟢 낮음 (Low)</option>
              <option value="1" selected>🟡 보통 (Medium)</option>
              <option value="2">🔴 높음 (High)</option>
              <option value="3">🔥 긴급 (Urgent)</option>
            </select>
          </div>
        </div>
        
        <button onclick="submitFormOrder()" class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <i class="fas fa-save mr-2"></i>오더 생성
        </button>
      </div>
    `
  }
  
  container.innerHTML = fieldsHtml
}

async function submitFormOrder() {
  try {
    const orderType = state.formOrderType
    
    // LCL/벌크 타입 전용 필드
    let billingCompany, shipper, shippingLine, loadingLocation, unloadingLocation
    let loadingDatetime, unloadingDatetime, dispatchCompany, vehicle, vehicleInfo
    let workDatetime = null
    
    // 컨테이너 타입 전용 필드
    let workSite, containerSize, bookingNumber, blNumber, vesselName, containerInfo
    
    if (orderType === 'lcl' || orderType === 'bulk') {
      // LCL/벌크 폼의 필드 ID
      billingCompany = document.getElementById('field_billing')?.value
      shipper = document.getElementById('field_shipper')?.value
      shippingLine = document.getElementById('field_shipping')?.value
      loadingLocation = document.getElementById('field_loading')?.value
      unloadingLocation = document.getElementById('field_unloading')?.value
      loadingDatetime = document.getElementById('field_loading_datetime')?.value
      unloadingDatetime = document.getElementById('field_unloading_datetime')?.value
      dispatchCompany = document.getElementById('field_dispatch')?.value
      vehicle = document.getElementById('field_vehicle')?.value
      vehicleInfo = document.getElementById('field_vehicle_info')?.value
      
      // 필수 필드 검증 (LCL/벌크)
      if (!billingCompany || !shipper) {
        alert('청구처, 화주는 필수 입력 항목입니다.')
        return
      }
      
      if (!loadingDatetime && !unloadingDatetime) {
        alert('상차일 또는 하차일 중 최소 하나는 입력해야 합니다.')
        return
      }
      
      // work_datetime은 상차일을 기본으로 사용 (없으면 하차일)
      workDatetime = loadingDatetime || unloadingDatetime
      
    } else {
      // 컨테이너 수출/수입 폼의 필드 ID
      billingCompany = document.getElementById('field_billing_company')?.value
      shipper = document.getElementById('field_shipper')?.value
      workSite = document.getElementById('field_work_site')?.value
      workDatetime = document.getElementById('field_work_datetime')?.value
      containerSize = document.getElementById('field_container_size')?.value
      loadingLocation = document.getElementById('field_loading_location')?.value
      unloadingLocation = document.getElementById('field_unloading_location')?.value
      dispatchCompany = document.getElementById('field_dispatch_company')?.value
      bookingNumber = document.getElementById('field_booking_number')?.value
      blNumber = document.getElementById('field_bl_number')?.value
      shippingLine = document.getElementById('field_shipping_line')?.value
      vesselName = document.getElementById('field_vessel_name')?.value
      containerInfo = document.getElementById('field_container')?.value
      
      // 필수 필드 검증 (컨테이너)
      if (!billingCompany || !shipper || !workDatetime) {
        alert('청구처, 화주, 작업일시는 필수 입력 항목입니다.')
        return
      }
    }
    
    // 비고 및 중요도
    const remarksText = document.getElementById('field_remarks')?.value
    const remarksImportance = parseInt(document.getElementById('field_remarks_importance')?.value || '1')
    
    // 컨테이너 정보 파싱 (컨테이너 넘버 / T.W / 씰 넘버)
    let containerNumber = null
    let tw = null
    let sealNumber = null
    if (containerInfo) {
      const parts = containerInfo.split('/').map(p => p.trim())
      containerNumber = parts[0] || null
      tw = parts[1] || null
      sealNumber = parts[2] || null
    }
    
    // 오더 데이터 구성
    const orderData = {
      order_type: orderType,
      billing_company: billingCompany,
      shipper: shipper,
      work_site: workSite,
      work_datetime: workDatetime,
      container_size: containerSize,
      loading_location: loadingLocation,
      unloading_location: unloadingLocation,
      dispatch_company: dispatchCompany,
      booking_number: bookingNumber,
      bl_number: blNumber,
      shipping_line: shippingLine,
      vessel_name: vesselName,
      container_number: containerNumber,
      tw: tw,
      seal_number: sealNumber,
      vehicle_info: vehicle || vehicleInfo,
      status: 'pending'
    }
    
    // 비고 추가
    if (remarksText && remarksText.trim()) {
      orderData.remarks = [{
        content: remarksText.trim(),
        importance: remarksImportance
      }]
    }
    
    // LCL/벌크 타입에서 상차일/하차일 정보를 비고에 추가
    if (orderType === 'lcl' || orderType === 'bulk') {
      const dateInfo = []
      if (loadingDatetime) {
        dateInfo.push(`상차일: ${loadingDatetime}`)
      }
      if (unloadingDatetime) {
        dateInfo.push(`하차일: ${unloadingDatetime}`)
      }
      
      if (dateInfo.length > 0) {
        const dateRemark = dateInfo.join(' / ')
        if (orderData.remarks) {
          orderData.remarks.push({
            content: dateRemark,
            importance: 1
          })
        } else {
          orderData.remarks = [{
            content: dateRemark,
            importance: 1
          }]
        }
      }
    }
    
    // API 호출
    const response = await axios.post('/api/orders', orderData)
    
    if (response.data && response.status === 200) {
      alert(`오더가 성공적으로 생성되었습니다!${response.data.id ? ' (ID: ' + response.data.id + ')' : ''}`)
      
      // 폼 초기화
      document.querySelectorAll('input[type="text"], input[type="datetime-local"], textarea').forEach(input => {
        input.value = ''
      })
      
      // 오더 목록으로 이동
      state.currentPage = 'orders'
      render()
      fetchOrders()
    }
  } catch (error) {
    console.error('오더 생성 실패:', error)
    alert(`오더 생성 실패: ${error.response?.data?.error || error.message}`)
  }
}

// ============================================
// 엑셀 업로드 관련 함수
// ============================================

async function handleExcelUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  const progressDiv = document.getElementById('uploadProgress')
  progressDiv.innerHTML = `
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600">엑셀 파일 업로드 및 파싱 중...</p>
    </div>
  `
  
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await axios.post('/api/import/excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    if (response.data.success) {
      progressDiv.innerHTML = `
        <div class="bg-green-50 border border-green-200 rounded p-4">
          <h3 class="text-lg font-bold text-green-800 mb-2">
            <i class="fas fa-check-circle mr-2"></i>업로드 성공!
          </h3>
          <p class="text-green-700">
            총 ${response.data.imported}개의 오더가 생성되었습니다.
          </p>
          ${response.data.errors > 0 ? `
            <p class="text-orange-600 mt-2">
              <i class="fas fa-exclamation-triangle mr-1"></i>
              ${response.data.errors}개의 오류가 발생했습니다.
            </p>
          ` : ''}
          <button onclick="changePage('orders')" class="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            오더 목록 보기
          </button>
        </div>
      `
    } else {
      throw new Error('업로드 실패')
    }
  } catch (error) {
    console.error('업로드 오류:', error)
    progressDiv.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded p-4">
        <h3 class="text-lg font-bold text-red-800 mb-2">
          <i class="fas fa-times-circle mr-2"></i>업로드 실패
        </h3>
        <p class="text-red-700">${error.response?.data?.error || error.message}</p>
        <button onclick="changeInputMode('excel')" class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          다시 시도
        </button>
      </div>
    `
  }
}

// ============================================
// 이벤트 핸들러
// ============================================

function changePage(page) {
  state.currentPage = page
  if (page === 'create-order') {
    state.inputMode = 'text'  // 오더 입력 페이지 진입 시 텍스트 모드로 초기화
  }
  render()
  
  // 페이지별 데이터 로드 (탭이 이미 로드되어 있으면 다시 로드하지 않음)
  if (page === 'orders' && state.orders.length === 0) {
    fetchOrders()
  } else if (page === 'todos') {
    fetchTodos()  // TODO는 항상 최신 데이터 로드
  } else if (page === 'create-order') {
    renderInputContent()
  } else if (page === 'clients') {
    const clientsContainer = document.getElementById('clientsContainer')
    if (!clientsContainer || clientsContainer.innerHTML.trim() === '') {
      fetchBillingSales()
    }
  }
}

function changeInputMode(mode) {
  state.inputMode = mode
  renderInputContent()
}

function renderInputContent() {
  const container = document.getElementById('inputContent')
  if (!container) return
  
  if (state.inputMode === 'text') {
    container.innerHTML = renderTextInputMode()
  } else if (state.inputMode === 'form') {
    container.innerHTML = renderFormInputMode()
    setTimeout(() => renderFormFields(), 0)  // 폼 필드 렌더링
  } else if (state.inputMode === 'excel') {
    container.innerHTML = renderExcelInputMode()
  }
  
  // 탭 활성화 표시 업데이트
  document.querySelectorAll('[id^="tab-"]').forEach(tab => {
    tab.className = tab.id === `tab-${state.inputMode}` 
      ? 'px-4 py-2 font-semibold border-b-2 border-blue-500 text-blue-600'
      : 'px-4 py-2 font-semibold text-gray-600'
  })
}

function renderTextInputMode() {
  return `
    <div class="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <p class="text-sm text-gray-700 mb-2">
        <i class="fas fa-info-circle text-blue-500 mr-1"></i>
        <strong>사용 방법:</strong> 메모장처럼 자유롭게 입력하세요. 빈 줄로 오더를 구분하며, 실시간으로 파싱됩니다.
      </p>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- 입력 영역 -->
      <div>
        <label class="block mb-2 font-semibold text-lg">
          <i class="fas fa-edit mr-2"></i>오더 메모
        </label>
        <textarea id="orderTextInput" rows="30" 
                  class="w-full h-[calc(100vh-280px)] px-4 py-3 border-2 rounded-lg font-mono text-sm focus:border-blue-500 focus:outline-none resize-none"
                    oninput="updateOrderPreview()"
                  placeholder="메모장처럼 자유롭게 입력하세요...

수출
청구처 : 스마트해운항공
배차 : 다원
진행일시 : 2026.01.09
화주 : ISP COMPANY
BKG : SNKO010260102386
선사 : SKR
모선 : NAGOYA TRADER 2602W
상차지 / 하차지 : 평택 / 평택

수입
청구처 : 선인터내셔날
화주 : 에스엔엠코퍼레이션
BL : SNLGZGKL000014
상차지 / 하차지 : BIT / BIT"></textarea>
      </div>
      
      <!-- 미리보기 영역 -->
      <div>
        <label class="block mb-2 font-semibold text-lg">
          <i class="fas fa-eye mr-2"></i>오더 미리보기 <span class="text-sm text-gray-500" id="orderCount"></span>
        </label>
        <div id="orderPreview" class="border-2 border-gray-200 rounded-lg h-[calc(100vh-280px)] overflow-y-auto bg-gray-50 p-4 space-y-4"></div>
        
        <div class="mt-4 text-center">
          <button onclick="bulkCreateOrders()" 
                  class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg disabled:bg-gray-400"
                  id="createOrdersBtn" disabled>
            <i class="fas fa-check-circle mr-2"></i><span id="createBtnText">오더 생성</span>
          </button>
        </div>
      </div>
    </div>
  `
}

function renderFormInputMode() {
  return `
    <div class="mb-6">
      <label class="block mb-2 font-semibold">오더 타입 선택</label>
      <select id="formOrderType" onchange="changeFormOrderType(this.value)" class="w-full px-3 py-2 border rounded">
        <option value="container_export" ${state.formOrderType === 'container_export' ? 'selected' : ''}>컨테이너 수출</option>
        <option value="container_import" ${state.formOrderType === 'container_import' ? 'selected' : ''}>컨테이너 수입</option>
        <option value="bulk" ${state.formOrderType === 'bulk' ? 'selected' : ''}>벌크화물</option>
        <option value="lcl" ${state.formOrderType === 'lcl' ? 'selected' : ''}>LCL</option>
      </select>
    </div>
    
    <div id="formFields"></div>
  `
}

function renderExcelInputMode() {
  return `
    <div class="text-center py-8">
      <div class="mb-6">
        <i class="fas fa-file-excel text-6xl text-green-600 mb-4"></i>
        <h3 class="text-xl font-bold mb-2">엑셀 파일 업로드</h3>
        <p class="text-gray-600 mb-4">오더 정보가 포함된 엑셀 파일을 업로드하세요.</p>
        <p class="text-sm text-gray-500">지원 형식: .xlsx, .xls</p>
      </div>
      
      <div class="max-w-md mx-auto">
        <input type="file" id="excelFileInput" accept=".xlsx,.xls" class="hidden" onchange="handleExcelUpload(event)">
        <button onclick="document.getElementById('excelFileInput').click()" 
                class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-lg">
          <i class="fas fa-upload mr-2"></i>파일 선택
        </button>
      </div>
      
      <div id="uploadProgress" class="mt-6"></div>
    </div>
  `
}

function changeView(view) {
  state.currentView = view
  render()
  fetchOrders()
}

function changeToDayView(date) {
  state.currentView = 'day'
  state.currentDate = date
  render()
  fetchOrders()
}

function changeDate(date) {
  state.currentDate = date
  render()
  fetchOrders()
}

function navigatePeriod(direction) {
  // direction: -1 (이전), 1 (다음)
  const currentDate = dayjs(state.currentDate)
  let newDate
  
  if (state.currentView === 'month') {
    newDate = currentDate.add(direction, 'month')
  } else if (state.currentView === 'week') {
    newDate = currentDate.add(direction * 7, 'day')
  } else {
    // day
    newDate = currentDate.add(direction, 'day')
  }
  
  state.currentDate = newDate.format('YYYY-MM-DD')
  render()
  fetchOrders()
}

// 이전 함수명 호환성 유지
function navigateDay(direction) {
  navigatePeriod(direction)
}

function toggleMobileMenu() {
  const overlay = document.getElementById('menuOverlay')
  const menu = document.getElementById('mobileMenu')
  
  if (overlay && menu) {
    overlay.classList.toggle('active')
    menu.classList.toggle('active')
  }
}

function changeOrderType(type) {
  state.currentOrderType = type
  fetchOrders()
}

// 오더 타입별 양식 템플릿
function getOrderTemplate(orderType) {
  const templates = {
    container_export: `BKG / SIZE : 
청구처 : 
화주 : 
작업지 : 
담당자 / 연락처 : 
작업일시 : 2025.12.23(월) 08:30
선사 : 
모선 : 
수출국 : 
접안일 / 출항일 : 
상차지 / 하차지 : 
배차 : 
차량 : 
특이사항 : `,

    container_import: `BL : 
컨테이너 넘버 / SIZE : 
청구처 : 
화주 : 
작업지 : 
담당자 / 연락처 : 
작업일시 : 2025.12.23(월) 08:30
선사 : 
모선 : 
접안일 / 출항일 : 
상차지 / 하차지 : 
DO : 
면장 : 
배차 : 
차량 : 
특이사항 : `,

    bulk: `청구처 : 
화주 : 
선사 : 
상차지 : 
하차지 : 
상차일 : 2025.12.23(월) 08:30
하차일 : 2025.12.24(화) 14:00
배차 : 
차량 : 
차량정보 : 
특이사항 : `,

    lcl: `청구처 : 
화주 : 
선사 : 
상차지 : 
하차지 : 
상차일 : 2025.12.23(월) 08:30
하차일 : 2025.12.24(화) 14:00
배차 : 
차량 : 
차량정보 : 
특이사항 : `
  }
  
  return templates[orderType] || templates.container_export
}

// 양식 복사 함수
function copyOrderTemplate() {
  const orderType = document.getElementById('newOrderType')?.value || 'container_export'
  const template = getOrderTemplate(orderType)
  
  // 클립보드에 복사
  navigator.clipboard.writeText(template).then(() => {
    // 성공 메시지
    const button = event.target.closest('button')
    const originalText = button.innerHTML
    
    button.innerHTML = '<i class="fas fa-check mr-2"></i>복사 완료!'
    button.className = 'w-full px-4 py-2 bg-green-700 text-white rounded flex items-center justify-center'
    
    setTimeout(() => {
      button.innerHTML = originalText
      button.className = 'w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center'
    }, 2000)
  }).catch(err => {
    console.error('복사 실패:', err)
    alert('복사에 실패했습니다. 브라우저 설정을 확인해주세요.')
  })
}

// 템플릿 버튼 텍스트 업데이트
function updateTemplateButton() {
  const orderType = document.getElementById('newOrderType')?.value
  const buttonText = document.getElementById('templateButtonText')
  
  if (buttonText) {
    const typeNames = {
      container_export: '컨테이너 수출',
      container_import: '컨테이너 수입',
      bulk: '벌크화물',
      lcl: 'LCL'
    }
    
    buttonText.textContent = `${typeNames[orderType] || '컨테이너 수출'} 양식 복사`
  }
}

function handleSearch(query) {
  state.searchQuery = query
  if (query.length >= 2 || query.length === 0) {
    fetchOrders()
  }
}

function viewOrderDetail(id) {
  const order = state.orders.find(o => o.id === id)
  if (!order) return
  
  state.selectedOrder = order
  
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-2xl font-bold">오더 상세</h3>
        <div class="flex items-center space-x-2">
          <button onclick="editOrder(${order.id})" 
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
            <i class="fas fa-edit mr-2"></i>수정
          </button>
          <button onclick="if(confirm('정말 삭제하시겠습니까?')) { deleteOrder(${order.id}); this.closest('.fixed').remove(); }" 
                  class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">
            <i class="fas fa-trash mr-2"></i>삭제
          </button>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-600 hover:text-gray-800 px-3 py-2">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div><strong>타입:</strong> ${order.order_type}</div>
        <div><strong>작업일시:</strong> ${formatDate(order.work_datetime)}</div>
        <div><strong>청구처:</strong> ${order.billing_company}</div>
        <div><strong>화주:</strong> ${order.shipper}</div>
        <div><strong>작업지:</strong> ${order.work_site || '-'}</div>
        <div><strong>담당자:</strong> ${order.contact_person || '-'} / ${order.contact_phone || '-'}</div>
        <div><strong>상차지:</strong> ${order.loading_location || '-'}</div>
        <div><strong>하차지:</strong> ${order.unloading_location || '-'}</div>
        <div><strong>배차업체:</strong> ${order.dispatch_company || '-'}</div>
        <div><strong>차량:</strong> ${order.vehicle_info || '-'}</div>
      </div>
      
      <div class="flex space-x-2 mb-6">
        <button onclick="copyToClipboard(generateAssignmentCopy(state.selectedOrder))" 
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <i class="fas fa-copy mr-1"></i>배정 복사
        </button>
        <button onclick="copyToClipboard(generateDispatchCopy(state.selectedOrder))" 
                class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          <i class="fas fa-copy mr-1"></i>배차 복사
        </button>
        <button onclick="addTodoForOrder(${order.id})" 
                class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
          <i class="fas fa-tasks mr-1"></i>할일 추가
        </button>
        <button onclick="editOrder(${order.id})" 
                class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
          <i class="fas fa-edit mr-1"></i>수정
        </button>
        <button onclick="deleteOrder(${order.id}); this.closest('.fixed').remove()" 
                class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          <i class="fas fa-trash mr-1"></i>삭제
        </button>
      </div>
      
      <div class="mb-4">
        <h4 class="font-bold mb-2">비고</h4>
        <ul class="space-y-1">
          ${(order.remarks || []).map(r => `
            <li class="flex items-center">
              <span class="mr-2">${'⭐'.repeat(r.importance)}</span>
              <span>${r.content}</span>
            </li>
          `).join('')}
        </ul>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="flex justify-between items-center mb-2">
            <h4 class="font-bold">청구</h4>
            <button onclick="showAddBillingModal(${order.id})" class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
              <i class="fas fa-plus mr-1"></i>추가
            </button>
          </div>
          <ul class="space-y-1">
            ${(order.billings || []).map(b => `
              <li class="flex justify-between items-center bg-gray-50 px-2 py-1 rounded">
                <span>${b.amount.toLocaleString()}원 ${b.description ? '- ' + b.description : ''}</span>
                <button onclick="deleteBilling(${b.id})" class="text-red-600 hover:text-red-800 text-sm">
                  <i class="fas fa-trash"></i>
                </button>
              </li>
            `).join('') || '<li class="text-gray-500">없음</li>'}
          </ul>
          <div class="mt-2 text-sm font-semibold">
            합계: ${(order.billings || []).reduce((sum, b) => sum + b.amount, 0).toLocaleString()}원
          </div>
        </div>
        <div>
          <div class="flex justify-between items-center mb-2">
            <h4 class="font-bold">하불</h4>
            <button onclick="showAddPaymentModal(${order.id})" class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
              <i class="fas fa-plus mr-1"></i>추가
            </button>
          </div>
          <ul class="space-y-1">
            ${(order.payments || []).map(p => `
              <li class="flex justify-between items-center bg-gray-50 px-2 py-1 rounded">
                <span>${p.amount.toLocaleString()}원 ${p.description ? '- ' + p.description : ''}</span>
                <button onclick="deletePayment(${p.id})" class="text-red-600 hover:text-red-800 text-sm">
                  <i class="fas fa-trash"></i>
                </button>
              </li>
            `).join('') || '<li class="text-gray-500">없음</li>'}
          </ul>
          <div class="mt-2 text-sm font-semibold">
            합계: ${(order.payments || []).reduce((sum, p) => sum + p.amount, 0).toLocaleString()}원
          </div>
        </div>
      </div>
      
      <div class="mt-4 p-3 bg-blue-50 rounded">
        <div class="text-lg font-bold text-blue-800">
          수익: ${((order.billings || []).reduce((sum, b) => sum + b.amount, 0) - (order.payments || []).reduce((sum, p) => sum + p.amount, 0)).toLocaleString()}원
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
}

// 빠른 파싱 (여러 오더)
async function quickParseOrders() {
  const text = document.getElementById('orderTextInput').value
  
  if (!text.trim()) {
    alert('텍스트를 입력해주세요.')
    return
  }
  
  // "수출", "수입", "LCL", "벌크"를 기준으로 오더 구분
  const lines = text.split('\n')
  const blocks = []
  let currentBlock = []
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // 오더 타입 키워드로 시작하면 새 블록 시작
    if (trimmedLine === '수출' || trimmedLine === '수입' || trimmedLine === 'LCL' || trimmedLine === '벌크') {
      // 이전 블록이 있으면 저장
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n'))
      }
      // 새 블록 시작
      currentBlock = [line]
    } else if (trimmedLine) {
      // 내용이 있으면 현재 블록에 추가
      currentBlock.push(line)
    }
  }
  
  // 마지막 블록 추가
  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n'))
  }
  
  if (blocks.length === 0) {
    alert('오더 정보를 찾을 수 없습니다.\n\n각 오더는 "수출", "수입", "LCL", "벌크"로 시작해야 합니다.')
    return
  }
  
  const preview = document.getElementById('orderPreview')
  preview.innerHTML = `
    <div class="border-t pt-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold">
          <i class="fas fa-list mr-2"></i>파싱된 오더 (${blocks.length}건)
        </h3>
        <button onclick="confirmCreateMultipleOrders()" 
                class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
          <i class="fas fa-check mr-2"></i>전체 생성
        </button>
      </div>
      
      <div class="space-y-4" id="parsedOrdersList"></div>
    </div>
  `
  
  const parsedOrders = []
  const listContainer = document.getElementById('parsedOrdersList')
  
  blocks.forEach((block, index) => {
    // 오더 타입 자동 감지
    const firstLine = block.trim().split('\\n')[0].trim()
    let orderType = 'container_export'
    
    if (firstLine === '수출') orderType = 'container_export'
    else if (firstLine === '수입') orderType = 'container_import'
    else if (firstLine === 'LCL') orderType = 'lcl'
    else if (firstLine === '벌크') orderType = 'bulk'
    
    const parsed = parseOrderText(block, orderType)
    parsedOrders.push(parsed)
    
    // 카드 형식으로 표시
    const typeLabel = {
      'container_export': '컨수출',
      'container_import': '컨수입',
      'bulk': '벌크',
      'lcl': 'LCL'
    }[orderType]
    
    const typeColor = {
      'container_export': 'bg-blue-100 text-blue-800',
      'container_import': 'bg-green-100 text-green-800',
      'bulk': 'bg-orange-100 text-orange-800',
      'lcl': 'bg-purple-100 text-purple-800'
    }[orderType]
    
    const card = document.createElement('div')
    card.className = 'bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow'
    card.innerHTML = `
      <div class="flex items-center justify-between mb-3 pb-2 border-b">
        <span class="px-3 py-1 rounded-full text-xs font-bold ${typeColor}">${typeLabel}</span>
        <span class="text-sm text-gray-500">오더 #${index + 1}</span>
      </div>
      
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span class="text-gray-500">청구처:</span>
          <span class="font-semibold ml-1">${parsed.billing_company || '-'}</span>
        </div>
        <div>
          <span class="text-gray-500">화주:</span>
          <span class="font-semibold ml-1">${parsed.shipper || '-'}</span>
        </div>
        <div>
          <span class="text-gray-500">작업일시:</span>
          <span class="font-semibold ml-1">${parsed.work_datetime || '-'}</span>
        </div>
        <div>
          <span class="text-gray-500">BKG/BL:</span>
          <span class="font-mono text-xs font-semibold ml-1">${parsed.booking_number || parsed.bl_number || '-'}</span>
        </div>
        ${parsed.work_site ? `
        <div class="col-span-2">
          <span class="text-gray-500">작업지:</span>
          <span class="font-semibold ml-1">${parsed.work_site}</span>
        </div>
        ` : ''}
      </div>
    `
    
    listContainer.appendChild(card)
  })
  
  // 전역 변수에 저장
  window.parsedOrdersCache = parsedOrders
}

async function confirmCreateMultipleOrders() {
  if (!window.parsedOrdersCache || window.parsedOrdersCache.length === 0) {
    alert('파싱된 오더가 없습니다.')
    return
  }
  
  const orders = window.parsedOrdersCache
  
  if (!confirm(`${orders.length}건의 오더를 생성하시겠습니까?`)) {
    return
  }
  
  const preview = document.getElementById('orderPreview')
  preview.innerHTML = `
    <div class="border-t pt-6 text-center">
      <i class="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
      <p class="text-gray-600">오더 생성 중...</p>
    </div>
  `
  
  let success = 0
  let failed = 0
  const errors = []
  
  for (let i = 0; i < orders.length; i++) {
    try {
      await axios.post('/api/orders', orders[i])
      success++
    } catch (error) {
      failed++
      errors.push(`오더 #${i + 1}: ${error.response?.data?.error || error.message}`)
    }
  }
  
  preview.innerHTML = `
    <div class="border-t pt-6">
      <div class="bg-white rounded-lg p-6 text-center">
        <i class="fas fa-check-circle text-6xl text-green-500 mb-4"></i>
        <h3 class="text-2xl font-bold mb-4">오더 생성 완료</h3>
        <div class="text-lg mb-6">
          <span class="text-green-600 font-bold">${success}건 성공</span>
          ${failed > 0 ? `<span class="text-red-600 font-bold ml-4">${failed}건 실패</span>` : ''}
        </div>
        ${errors.length > 0 ? `
          <div class="text-left bg-red-50 p-4 rounded mb-4">
            <h4 class="font-bold text-red-800 mb-2">실패 내역:</h4>
            <ul class="text-sm text-red-700 space-y-1">
              ${errors.map(e => `<li>• ${e}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        <button onclick="changePage('orders')" 
                class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <i class="fas fa-list mr-2"></i>오더 목록으로
        </button>
      </div>
    </div>
  `
  
  // 캐시 초기화
  window.parsedOrdersCache = null
  document.getElementById('orderTextInput').value = ''
}

// 실시간 오더 미리보기
let updatePreviewTimer = null
function updateOrderPreview() {
  // 디바운스 처리 (500ms 대기)
  if (updatePreviewTimer) clearTimeout(updatePreviewTimer)
  
  updatePreviewTimer = setTimeout(() => {
    const textarea = document.getElementById('orderTextInput')
    const preview = document.getElementById('orderPreview')
    const countSpan = document.getElementById('orderCount')
    const createBtn = document.getElementById('createOrdersBtn')
    
    if (!textarea || !preview) return
    
    const text = textarea.value.trim()
    
    if (!text) {
      preview.innerHTML = `
        <div class="text-center text-gray-400 py-12">
          <i class="fas fa-inbox text-6xl mb-3"></i>
          <p>왼쪽에 오더를 입력하면<br>실시간으로 미리보기가 표시됩니다</p>
        </div>
      `
      countSpan.textContent = ''
      createBtn.disabled = true
      window.parsedOrdersCache = []
      return
    }
    
    // "수출", "수입", "LCL", "벌크"를 기준으로 오더 구분
    const lines = text.split('\n')
    const blocks = []
    let currentBlock = []
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // 오더 타입 키워드로 시작하면 새 블록 시작
      if (trimmedLine === '수출' || trimmedLine === '수입' || trimmedLine === 'LCL' || trimmedLine === '벌크') {
        // 이전 블록이 있으면 저장
        if (currentBlock.length > 0) {
          blocks.push(currentBlock.join('\n'))
        }
        // 새 블록 시작
        currentBlock = [line]
      } else if (trimmedLine) {
        // 내용이 있으면 현재 블록에 추가
        currentBlock.push(line)
      }
    }
    
    // 마지막 블록 추가
    if (currentBlock.length > 0) {
      blocks.push(currentBlock.join('\n'))
    }
    
    if (blocks.length === 0) {
      preview.innerHTML = '<div class="text-gray-500 text-center py-4">오더 정보를 입력해주세요<br><small class="text-xs text-gray-400 mt-2">각 오더는 "수출", "수입", "LCL", "벌크"로 시작</small></div>'
      countSpan.textContent = ''
      createBtn.disabled = true
      window.parsedOrdersCache = []
      return
    }
    
    const parsedOrders = []
    let previewHTML = ''
    
    blocks.forEach((block, index) => {
      // 오더 타입 자동 감지
      const firstLine = block.trim().split('\n')[0].trim()
      let orderType = 'container_export'
      
      if (firstLine === '수출') orderType = 'container_export'
      else if (firstLine === '수입') orderType = 'container_import'
      else if (firstLine === 'LCL') orderType = 'lcl'
      else if (firstLine === '벌크') orderType = 'bulk'
      
      const parsed = parseOrderText(block, orderType)
      parsedOrders.push(parsed)
      
      // 카드 형식으로 표시
      const typeLabel = {
        'container_export': '컨수출',
        'container_import': '컨수입',
        'bulk': '벌크',
        'lcl': 'LCL'
      }[orderType]
      
      const typeColor = {
        'container_export': 'bg-blue-100 text-blue-800',
        'container_import': 'bg-green-100 text-green-800',
        'bulk': 'bg-orange-100 text-orange-800',
        'lcl': 'bg-purple-100 text-purple-800'
      }[orderType]
      
      previewHTML += `
        <div class="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
          <div class="flex items-center justify-between mb-3 pb-2 border-b">
            <span class="px-3 py-1 rounded-full text-xs font-bold ${typeColor}">${typeLabel}</span>
            <span class="text-sm text-gray-500">#${index + 1}</span>
          </div>
          
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-gray-500">청구처:</span>
              <span class="font-semibold ml-1">${parsed.billing_company || '-'}</span>
            </div>
            <div>
              <span class="text-gray-500">화주:</span>
              <span class="font-semibold ml-1">${parsed.shipper || '-'}</span>
            </div>
            <div>
              <span class="text-gray-500">작업일시:</span>
              <span class="font-semibold ml-1">${parsed.work_datetime || '-'}</span>
            </div>
            <div>
              <span class="text-gray-500">BKG/BL:</span>
              <span class="font-mono text-xs font-semibold ml-1">${parsed.booking_number || parsed.bl_number || '-'}</span>
            </div>
            ${parsed.work_site ? `
            <div class="col-span-2">
              <span class="text-gray-500">작업지:</span>
              <span class="font-semibold ml-1 text-xs">${parsed.work_site}</span>
            </div>
            ` : ''}
            ${parsed.dispatch_company ? `
            <div>
              <span class="text-gray-500">배차:</span>
              <span class="font-semibold ml-1">${parsed.dispatch_company}</span>
            </div>
            ` : ''}
            ${parsed.loading_location && parsed.loading_location !== '—' ? `
            <div class="col-span-2">
              <span class="text-gray-500">상차지:</span>
              <span class="font-semibold ml-1 text-xs">${parsed.loading_location}</span>
            </div>
            ` : ''}
            ${parsed.unloading_location && parsed.unloading_location !== '—' ? `
            <div class="col-span-2">
              <span class="text-gray-500">하차지:</span>
              <span class="font-semibold ml-1 text-xs">${parsed.unloading_location}</span>
            </div>
            ` : ''}
          </div>
        </div>
      `
    })
    
    preview.innerHTML = previewHTML
    countSpan.textContent = `(${blocks.length}건)`
    createBtn.disabled = blocks.length === 0
    document.getElementById('createBtnText').textContent = `오더 ${blocks.length}건 생성`
    
    // 전역 변수에 저장
    window.parsedOrdersCache = parsedOrders
  }, 500)
}

// 일괄 오더 생성
async function bulkCreateOrders() {
  if (!window.parsedOrdersCache || window.parsedOrdersCache.length === 0) {
    alert('파싱된 오더가 없습니다.')
    return
  }
  
  const orders = window.parsedOrdersCache
  
  // ✅ 필수 필드 검증 (청구처, 화주, 오더타입)
  const invalidOrders = []
  orders.forEach((order, index) => {
    if (!order.billing_company || !order.shipper || !order.order_type) {
      invalidOrders.push({
        index: index + 1,
        order,
        missing: [
          !order.billing_company && '청구처',
          !order.shipper && '화주',
          !order.order_type && '오더타입'
        ].filter(Boolean)
      })
    }
  })
  
  if (invalidOrders.length > 0) {
    const errorMsg = invalidOrders.map(item => 
      `오더 #${item.index}: ${item.missing.join(', ')} 누락`
    ).join('\n')
    alert(`⚠️ 다음 오더의 필수 정보가 누락되었습니다:\n\n${errorMsg}\n\n필수 정보: 청구처, 화주`)
    return
  }
  
  if (!confirm(`${orders.length}건의 오더를 생성하시겠습니까?\n\n등록 후 수정 가능하니 안심하세요! 😊`)) {
    return
  }
  
  const btn = document.getElementById('createOrdersBtn')
  const btnText = document.getElementById('createBtnText')
  const originalText = btnText.textContent
  
  btn.disabled = true
  btnText.textContent = '생성 중...'
  
  let successCount = 0
  let failCount = 0
  const errors = []
  const failedOrders = []
  
  for (let i = 0; i < orders.length; i++) {
    try {
      console.log(`\n📝 오더 #${i+1} 등록 시작:`, {
        billing_company: orders[i].billing_company,
        shipper: orders[i].shipper,
        order_type: orders[i].order_type
      })
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orders[i])
      })
      
      if (response.ok) {
        const result = await response.json()
        successCount++
        btnText.textContent = `생성 중... (${successCount}/${orders.length})`
        console.log(`✅ 오더 #${i+1} 등록 성공! ID: ${result.orderId}`)
      } else {
        failCount++
        const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류' }))
        const errorMsg = `오더 #${i+1} (${orders[i].billing_company} - ${orders[i].shipper}): ${errorData.error || errorData.message || response.statusText}`
        errors.push(errorMsg)
        failedOrders.push({ index: i + 1, order: orders[i], error: errorData })
        console.error(`❌ ${errorMsg}`, errorData)
      }
      
      // API 과부하 방지 (100ms 딜레이)
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      failCount++
      const errorMsg = `오더 #${i+1} (${orders[i].billing_company} - ${orders[i].shipper}): 네트워크 오류 - ${error.message}`
      errors.push(errorMsg)
      failedOrders.push({ index: i + 1, order: orders[i], error: error.message })
      console.error(`❌ ${errorMsg}`, error)
    }
  }
  
  btn.disabled = false
  btnText.textContent = originalText
  
  if (failCount === 0) {
    alert(`✅ ${successCount}건의 오더가 모두 성공적으로 생성되었습니다!\n\n일별현황에서 확인하세요! 🎉`)
    // 입력 초기화
    document.getElementById('orderTextInput').value = ''
    updateOrderPreview()
    // 오더 목록으로 이동
    changePage('orders')
  } else {
    console.error('❌ 오더 생성 실패 상세:', errors)
    console.error('❌ 실패한 오더:', failedOrders)
    
    // 실패한 오더를 localStorage에 저장
    localStorage.setItem('failedOrders', JSON.stringify(failedOrders))
    
    const errorSummary = errors.slice(0, 3).join('\n')
    const moreErrors = errors.length > 3 ? `\n... 외 ${errors.length - 3}건 (콘솔 확인)` : ''
    
    alert(`⚠️ 등록 결과:\n✅ 성공: ${successCount}건\n❌ 실패: ${failCount}건\n\n실패 상세:\n${errorSummary}${moreErrors}\n\n💡 실패한 오더는 다시 시도할 수 있습니다.\n   콘솔(F12)에서 상세 정보를 확인하세요.`)
    
    // 성공한 오더가 있으면 목록 새로고침
    if (successCount > 0) {
      fetchOrders()
    }
  }
}

function parseAndPreviewOrder() {
  const orderType = document.getElementById('newOrderType').value
  const text = document.getElementById('orderTextInput').value
  
  if (!text.trim()) {
    alert('텍스트를 입력해주세요.')
    return
  }
  
  const parsedOrder = parseOrderText(text, orderType)
  
  const preview = document.getElementById('orderPreview')
  preview.innerHTML = `
    <div class="border-t pt-6">
      <h3 class="text-xl font-bold mb-4">파싱 결과 미리보기</h3>
      <pre class="bg-gray-100 p-4 rounded overflow-auto">${JSON.stringify(parsedOrder, null, 2)}</pre>
      <button onclick="confirmCreateOrder(${JSON.stringify(parsedOrder).replace(/"/g, '&quot;')})" 
              class="mt-4 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">
        <i class="fas fa-check mr-2"></i>오더 생성
      </button>
    </div>
  `
}

function confirmCreateOrder(orderData) {
  createOrder(orderData)
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('클립보드에 복사되었습니다.')
  }).catch(() => {
    alert('복사에 실패했습니다.')
  })
}

// ============================================
// 청구/하불 관리 함수
// ============================================

function showAddBillingModal(orderId) {
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold">청구 추가</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-600 hover:text-gray-800">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="space-y-4">
        <div>
          <label class="block mb-1 font-semibold">계정명 (선택):</label>
          <input type="text" id="billingAccountName" placeholder="예: 본계정, 추가청구1, 삼성전자" 
                 class="w-full px-3 py-2 border rounded focus:border-blue-500">
          <p class="text-xs text-gray-500 mt-1">* 엑셀 다운로드 시 BKG/BL 앞에 표시됩니다</p>
        </div>
        
        <div>
          <label class="block mb-1 font-semibold">금액 (필수):</label>
          <input type="number" id="billingAmount" placeholder="500000" 
                 class="w-full px-3 py-2 border rounded focus:border-blue-500">
        </div>
        
        <div class="flex space-x-2">
          <button onclick="submitBilling(${orderId})" 
                  class="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <i class="fas fa-save mr-1"></i>저장
          </button>
          <button onclick="this.closest('.fixed').remove()" 
                  class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
            취소
          </button>
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
}

function showAddPaymentModal(orderId) {
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold">하불 추가</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-600 hover:text-gray-800">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="space-y-4">
        <div>
          <label class="block mb-1 font-semibold">계정명 (선택):</label>
          <input type="text" id="paymentAccountName" placeholder="예: 업체A, 업체B, 로지아이솔루션" 
                 class="w-full px-3 py-2 border rounded focus:border-green-500">
          <p class="text-xs text-gray-500 mt-1">* 엑셀 다운로드 시 BKG/BL 앞에 표시됩니다</p>
        </div>
        
        <div>
          <label class="block mb-1 font-semibold">금액 (필수):</label>
          <input type="number" id="paymentAmount" placeholder="400000" 
                 class="w-full px-3 py-2 border rounded focus:border-green-500">
        </div>
        
        <div class="flex space-x-2">
          <button onclick="submitPayment(${orderId})" 
                  class="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            <i class="fas fa-save mr-1"></i>저장
          </button>
          <button onclick="this.closest('.fixed').remove()" 
                  class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
            취소
          </button>
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
}

async function submitBilling(orderId) {
  const accountName = document.getElementById('billingAccountName').value.trim()
  const amount = parseFloat(document.getElementById('billingAmount').value)
  
  if (!amount || amount <= 0) {
    alert('금액을 입력해주세요.')
    return
  }
  
  try {
    await axios.post(`/api/orders/${orderId}/billings`, {
      amount: amount,
      description: accountName
    })
    
    // 모달 닫기
    document.querySelector('.fixed').remove()
    
    // 오더 목록 새로고침
    await fetchOrders()
    
    // 상세 모달 다시 열기
    viewOrderDetail(orderId)
    
    alert('청구가 추가되었습니다.')
  } catch (error) {
    console.error('청구 추가 실패:', error)
    alert('청구 추가에 실패했습니다.')
  }
}

async function submitPayment(orderId) {
  const accountName = document.getElementById('paymentAccountName').value.trim()
  const amount = parseFloat(document.getElementById('paymentAmount').value)
  
  if (!amount || amount <= 0) {
    alert('금액을 입력해주세요.')
    return
  }
  
  try {
    await axios.post(`/api/orders/${orderId}/payments`, {
      amount: amount,
      description: accountName
    })
    
    // 모달 닫기
    document.querySelector('.fixed').remove()
    
    // 오더 목록 새로고침
    await fetchOrders()
    
    // 상세 모달 다시 열기
    viewOrderDetail(orderId)
    
    alert('하불이 추가되었습니다.')
  } catch (error) {
    console.error('하불 추가 실패:', error)
    alert('하불 추가에 실패했습니다.')
  }
}

async function deleteBilling(billingId) {
  if (!confirm('이 청구를 삭제하시겠습니까?')) return
  
  try {
    await axios.delete(`/api/billings/${billingId}`)
    
    // 오더 목록 새로고침
    await fetchOrders()
    
    // 상세 모달 닫고 다시 열기
    const orderId = state.selectedOrder.id
    document.querySelector('.fixed').remove()
    viewOrderDetail(orderId)
    
    alert('청구가 삭제되었습니다.')
  } catch (error) {
    console.error('청구 삭제 실패:', error)
    alert('청구 삭제에 실패했습니다.')
  }
}

async function deletePayment(paymentId) {
  if (!confirm('이 하불을 삭제하시겠습니까?')) return
  
  try {
    await axios.delete(`/api/payments/${paymentId}`)
    
    // 오더 목록 새로고침
    await fetchOrders()
    
    // 상세 모달 닫고 다시 열기
    const orderId = state.selectedOrder.id
    document.querySelector('.fixed').remove()
    viewOrderDetail(orderId)
    
    alert('하불이 삭제되었습니다.')
  } catch (error) {
    console.error('하불 삭제 실패:', error)
    alert('하불 삭제에 실패했습니다.')
  }
}

function addTodo() {
  const input = document.getElementById('newTodoInput')
  const orderIdInput = document.getElementById('linkedOrderId')
  const content = input.value.trim()
  const orderId = orderIdInput ? parseInt(orderIdInput.value) : null
  
  if (content) {
    createTodo(content, orderId)
    input.value = ''
    if (orderIdInput) orderIdInput.value = ''
  }
}

function downloadExcel() {
  const params = new URLSearchParams({
    view: state.currentView,
    date: state.currentDate,
    type: state.currentOrderType
  })
  
  window.location.href = `/api/export/excel?${params}`
}

// ============================================
// 메인 렌더링
// ============================================

function render() {
  const app = document.getElementById('app')
  
  // 첫 렌더링인지 확인
  const isFirstRender = !document.getElementById('tab-orders')
  
  if (isFirstRender) {
    // 첫 렌더링: 모든 탭 생성
    app.innerHTML = `
      ${renderNavigation()}
      <div class="max-w-7xl mx-auto px-4 py-6">
        <div id="tab-orders" class="tab-content" style="display: none;">
          ${renderOrderFilters()}
          <div id="orderListContainer"></div>
        </div>
        <div id="tab-create-order" class="tab-content" style="display: none;">
          ${renderCreateOrderPage()}
        </div>
        <div id="tab-todos" class="tab-content" style="display: none;">
          <div id="todoContainer"></div>
        </div>
        <div id="tab-codes" class="tab-content" style="display: none;">
          ${renderCodesManagementPage()}
        </div>
        <div id="tab-clients" class="tab-content" style="display: none;">
          ${renderClientsManagementPage()}
        </div>
      </div>
    `
  }
  
  // 네비게이션만 업데이트 (탭 활성화 상태)
  const navContainer = document.querySelector('.max-w-7xl.mx-auto.px-4.py-6')
  if (navContainer && navContainer.previousElementSibling) {
    navContainer.previousElementSibling.outerHTML = renderNavigation()
  }
  
  // 모든 탭 숨기기
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none'
  })
  
  // 현재 탭만 보이기
  const currentTab = document.getElementById(`tab-${state.currentPage}`)
  if (currentTab) {
    currentTab.style.display = 'block'
  }
  
  // 페이지별 초기화 (첫 렌더링 또는 페이지 전환 시)
  if (isFirstRender || state.currentPage === 'orders') {
    if (state.currentPage === 'orders' && !state.orders.length) {
      fetchOrders()
    }
  }
  
  if (state.currentPage === 'create-order' && isFirstRender) {
    setTimeout(() => renderInputContent(), 0)
  }
  
  if (state.currentPage === 'todos' && isFirstRender) {
    fetchTodos()
  }
}

// ============================================
// 비고 관리 함수
// ============================================

async function addRemarkInEdit(orderId) {
  const content = prompt('비고 내용을 입력하세요:')
  if (!content || content.trim() === '') return
  
  try {
    await axios.post(`/api/orders/${orderId}/remarks`, { 
      content: content.trim(),
      importance: 1 
    })
    // 모달 닫고 다시 열기
    document.querySelector('.fixed').remove()
    editOrder(orderId)
  } catch (error) {
    console.error('비고 추가 실패:', error)
    alert('비고 추가에 실패했습니다.')
  }
}

async function deleteRemark(remarkId, orderId) {
  if (!confirm('이 비고를 삭제하시겠습니까?')) return
  
  try {
    await axios.delete(`/api/remarks/${remarkId}`)
    // 모달 닫고 다시 열기
    document.querySelector('.fixed').remove()
    editOrder(orderId)
  } catch (error) {
    console.error('비고 삭제 실패:', error)
    alert('비고 삭제에 실패했습니다.')
  }
}

// ============================================
// 할일-오더 연결 함수
// ============================================

async function addTodoForOrder(orderId) {
  const order = state.orders.find(o => o.id === orderId)
  if (!order) return
  
  const content = prompt(`오더 #${orderId} (${order.shipper})에 대한 할일을 입력하세요:`)
  if (!content || content.trim() === '') return
  
  try {
    await createTodo(content.trim(), orderId)
    alert('할일이 추가되었습니다. 할일 탭에서 확인하세요.')
  } catch (error) {
    console.error('할일 추가 실패:', error)
    alert('할일 추가에 실패했습니다.')
  }
}

function goToOrderFromTodo(orderId) {
  // 오더 관리 페이지로 이동
  state.currentPage = 'orders'
  render()
  
  // 오더 목록 로드 후 상세 보기
  fetchOrders().then(() => {
    // 약간의 딜레이 후 상세 모달 열기
    setTimeout(() => {
      viewOrderDetail(orderId)
    }, 100)
  })
}

// ============================================
// 영업담당자 자동 추천
// ============================================

async function fetchSalesPersonForBillingCompany(billingCompany, targetContainerId) {
  const container = document.getElementById(`${targetContainerId}_container`)
  if (!container) return
  
  if (!billingCompany || billingCompany.trim() === '') {
    container.innerHTML = ''
    return
  }
  
  try {
    const response = await axios.get(`/api/sales-person/${encodeURIComponent(billingCompany.trim())}`)
    const salesPerson = response.data.sales_person
    
    if (salesPerson) {
      container.innerHTML = `<i class="fas fa-user mr-1"></i>영업담당자: <strong>${salesPerson}</strong>`
    } else {
      container.innerHTML = '<i class="fas fa-info-circle mr-1"></i>영업담당자 정보 없음'
    }
  } catch (error) {
    console.error('영업담당자 조회 실패:', error)
    container.innerHTML = ''
  }
}

// ============================================
// 거래처 관리 (청구처-영업담당자)
// ============================================

let allBillingSales = []

async function fetchBillingSales() {
  try {
    const response = await axios.get('/api/billing-sales')
    allBillingSales = response.data
    renderBillingSalesTable(allBillingSales)
  } catch (error) {
    console.error('거래처 목록 조회 실패:', error)
    const container = document.getElementById('billingSalesTableContainer')
    if (container) {
      container.innerHTML = '<div class="text-center py-8 text-red-500">데이터 로딩 실패</div>'
    }
  }
}

function renderBillingSalesTable(data) {
  const container = document.getElementById('billingSalesTableContainer')
  if (!container) return
  
  if (data.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-inbox text-4xl mb-2"></i>
        <p>등록된 청구처가 없습니다</p>
      </div>
    `
    return
  }
  
  const tableHtml = `
    <table class="w-full border-collapse">
      <thead class="bg-gray-100">
        <tr>
          <th class="px-4 py-3 text-left border">청구처명</th>
          <th class="px-4 py-3 text-left border">영업담당자</th>
          <th class="px-4 py-3 text-center border">담당자 수</th>
          <th class="px-4 py-3 text-center border">화주 수</th>
          <th class="px-4 py-3 text-left border">메모</th>
          <th class="px-4 py-3 text-center border">등록일</th>
          <th class="px-4 py-3 text-center border w-40">관리</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(item => `
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 border font-semibold">${item.billing_company}</td>
            <td class="px-4 py-3 border">
              <i class="fas fa-user mr-1 text-blue-600"></i>${item.sales_person}
            </td>
            <td class="px-4 py-3 border text-center">
              <span class="text-blue-600">-</span>
            </td>
            <td class="px-4 py-3 border text-center">
              <span class="text-blue-600">-</span>
            </td>
            <td class="px-4 py-3 border text-sm text-gray-600">${item.memo ? (item.memo.length > 20 ? item.memo.substring(0, 20) + '...' : item.memo) : '-'}</td>
            <td class="px-4 py-3 border text-center text-sm text-gray-600">
              ${new Date(item.created_at).toLocaleDateString('ko-KR')}
            </td>
            <td class="px-4 py-3 border text-center">
              <button onclick="window.viewBillingDetail(${item.id})" 
                      class="px-2 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 mr-1">
                <i class="fas fa-eye"></i>
              </button>
              <button onclick="window.editBillingSales(${item.id})" 
                      class="px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 mr-1">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="window.deleteBillingSales('${item.billing_company.replace(/'/g, "\\'")})" 
                      class="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="mt-4 text-sm text-gray-600">
      총 <strong>${data.length}</strong>개의 청구처
    </div>
  `
  
  container.innerHTML = tableHtml
}

function filterBillingSales(searchText) {
  if (!searchText || searchText.trim() === '') {
    renderBillingSalesTable(allBillingSales)
    return
  }
  
  const filtered = allBillingSales.filter(item => 
    item.billing_company.includes(searchText) || 
    item.sales_person.includes(searchText) ||
    (item.contact_person && item.contact_person.includes(searchText)) ||
    (item.shipper_name && item.shipper_name.includes(searchText)) ||
    (item.memo && item.memo.includes(searchText))
  )
  renderBillingSalesTable(filtered)
}

window.showAddBillingSalesModal = function() {
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <h3 class="text-xl font-bold mb-4">청구처 추가</h3>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block mb-2 font-semibold">청구처명 *</label>
          <input type="text" id="modal_billing_company" placeholder="청구처명 입력" 
                 class="w-full px-3 py-2 border rounded">
        </div>
        
        <div>
          <label class="block mb-2 font-semibold">영업담당자 *</label>
          <input type="text" id="modal_sales_person" placeholder="영업담당자 입력" 
                 class="w-full px-3 py-2 border rounded">
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block mb-2 font-semibold">담당자</label>
          <input type="text" id="modal_contact_person" placeholder="담당자 입력" 
                 class="w-full px-3 py-2 border rounded">
        </div>
        
        <div>
          <label class="block mb-2 font-semibold">화주</label>
          <input type="text" id="modal_shipper_name" placeholder="화주 입력" 
                 class="w-full px-3 py-2 border rounded">
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">메모</label>
        <textarea id="modal_memo" placeholder="메모 입력" rows="3"
                  class="w-full px-3 py-2 border rounded"></textarea>
      </div>
      
      <div class="flex justify-end space-x-2">
        <button onclick="this.closest('.fixed').remove()" 
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
          취소
        </button>
        <button onclick="window.saveBillingSales()" 
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <i class="fas fa-save mr-1"></i>저장
        </button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  document.getElementById('modal_billing_company').focus()
}

window.editBillingSales = function(id) {
  // ID로 데이터 찾기
  const item = allBillingSales.find(b => b.id === id)
  if (!item) {
    alert('데이터를 찾을 수 없습니다.')
    return
  }
  
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <h3 class="text-xl font-bold mb-4">청구처 수정</h3>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block mb-2 font-semibold">청구처명</label>
          <input type="text" id="modal_billing_company" value="${item.billing_company}" 
                 readonly class="w-full px-3 py-2 border rounded bg-gray-100">
        </div>
        
        <div>
          <label class="block mb-2 font-semibold">영업담당자 *</label>
          <input type="text" id="modal_sales_person" value="${item.sales_person}" 
                 class="w-full px-3 py-2 border rounded">
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block mb-2 font-semibold">담당자</label>
          <input type="text" id="modal_contact_person" value="${item.contact_person || ''}" 
                 class="w-full px-3 py-2 border rounded">
        </div>
        
        <div>
          <label class="block mb-2 font-semibold">화주</label>
          <input type="text" id="modal_shipper_name" value="${item.shipper_name || ''}" 
                 class="w-full px-3 py-2 border rounded">
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">메모</label>
        <textarea id="modal_memo" rows="3"
                  class="w-full px-3 py-2 border rounded">${item.memo || ''}</textarea>
      </div>
      
      <div class="flex justify-end space-x-2">
        <button onclick="this.closest('.fixed').remove()" 
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
          취소
        </button>
        <button onclick="window.saveBillingSales()" 
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <i class="fas fa-save mr-1"></i>수정
        </button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  document.getElementById('modal_sales_person').focus()
}

window.saveBillingSales = async function() {
  const billingCompany = document.getElementById('modal_billing_company')?.value.trim()
  const salesPerson = document.getElementById('modal_sales_person')?.value.trim()
  const contactPerson = document.getElementById('modal_contact_person')?.value.trim()
  const shipperName = document.getElementById('modal_shipper_name')?.value.trim()
  const memo = document.getElementById('modal_memo')?.value.trim()
  
  if (!billingCompany || !salesPerson) {
    alert('청구처명과 영업담당자를 모두 입력해주세요.')
    return
  }
  
  try {
    await axios.post('/api/billing-sales', {
      billing_company: billingCompany,
      sales_person: salesPerson,
      contact_person: contactPerson || null,
      shipper_name: shipperName || null,
      memo: memo || null
    })
    
    alert('저장되었습니다.')
    document.querySelector('.fixed')?.remove()
    fetchBillingSales()
  } catch (error) {
    console.error('저장 실패:', error)
    alert(`저장 실패: ${error.response?.data?.error || error.message}`)
  }
}

// 청구처 상세보기 (담당자/화주 관리)
window.viewBillingDetail = async function(id) {
  const item = allBillingSales.find(b => b.id === id)
  if (!item) {
    alert('데이터를 찾을 수 없습니다.')
    return
  }
  
  // 담당자 및 화주 데이터 로드
  let contacts = []
  let shippers = []
  
  try {
    const [contactsRes, shippersRes] = await Promise.all([
      axios.get(`/api/billing-sales/${id}/contacts`),
      axios.get(`/api/billing-sales/${id}/shippers`)
    ])
    contacts = contactsRes.data
    shippers = shippersRes.data
  } catch (error) {
    console.error('데이터 로드 실패:', error)
  }
  
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-2xl font-bold">
          <i class="fas fa-building mr-2 text-blue-600"></i>${item.billing_company}
        </h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>
      
      <!-- 기본 정보 -->
      <div class="mb-6 p-4 bg-gray-50 rounded">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="font-semibold text-gray-700">영업담당자:</span>
            <span class="ml-2"><i class="fas fa-user text-blue-600 mr-1"></i>${item.sales_person}</span>
          </div>
          <div>
            <span class="font-semibold text-gray-700">등록일:</span>
            <span class="ml-2">${new Date(item.created_at).toLocaleDateString('ko-KR')}</span>
          </div>
        </div>
        ${item.memo ? `
          <div class="mt-3">
            <span class="font-semibold text-gray-700">메모:</span>
            <p class="mt-1 text-gray-600">${item.memo}</p>
          </div>
        ` : ''}
      </div>
      
      <!-- 담당자 목록 -->
      <div class="mb-6">
        <div class="flex justify-between items-center mb-3">
          <h4 class="text-lg font-bold">
            <i class="fas fa-user-tie mr-2 text-green-600"></i>담당자 목록 (${contacts.length}명)
          </h4>
          <button onclick="window.showAddContactModal(${id})" 
                  class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
            <i class="fas fa-plus mr-1"></i>담당자 추가
          </button>
        </div>
        <div id="contacts_${id}" class="space-y-2">
          ${contacts.length === 0 ? '<p class="text-gray-500 text-center py-4">등록된 담당자가 없습니다</p>' : 
            contacts.map(contact => `
              <div class="p-3 border rounded hover:bg-gray-50 flex justify-between items-center">
                <div class="flex-1">
                  <div class="font-semibold">${contact.contact_name}</div>
                  ${contact.contact_phone ? `<div class="text-sm text-gray-600"><i class="fas fa-phone mr-1"></i>${contact.contact_phone}</div>` : ''}
                  ${contact.memo ? `<div class="text-sm text-gray-500 mt-1">${contact.memo}</div>` : ''}
                </div>
                <div class="flex space-x-1">
                  <button onclick="window.editContact(${contact.id}, ${id})" 
                          class="px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button onclick="window.deleteContact(${contact.id}, ${id})" 
                          class="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
      
      <!-- 화주 목록 -->
      <div>
        <div class="flex justify-between items-center mb-3">
          <h4 class="text-lg font-bold">
            <i class="fas fa-truck mr-2 text-purple-600"></i>화주 목록 (${shippers.length}개)
          </h4>
          <button onclick="window.showAddShipperModal(${id})" 
                  class="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
            <i class="fas fa-plus mr-1"></i>화주 추가
          </button>
        </div>
        <div id="shippers_${id}" class="grid grid-cols-1 gap-4">
          ${shippers.length === 0 ? '<p class="text-gray-500 text-center py-4">등록된 화주가 없습니다</p>' : 
            shippers.map(shipper => `
              <div class="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white">
                <div class="flex justify-between items-start mb-3">
                  <div class="flex-1">
                    <div class="font-bold text-xl text-gray-800">${shipper.shipper_name}</div>
                    ${shipper.memo ? `<div class="text-sm text-gray-600 mt-1">${shipper.memo}</div>` : ''}
                  </div>
                  <div class="flex gap-1">
                    <button onclick="window.editShipper(${shipper.id}, ${id})" 
                            class="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                      <i class="fas fa-edit"></i> 수정
                    </button>
                    <button onclick="window.deleteShipper(${shipper.id}, ${id})" 
                            class="px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600">
                      <i class="fas fa-trash"></i> 삭제
                    </button>
                  </div>
                </div>
                
                <!-- 통합 견적/비고 영역 -->
                <div class="border-t pt-3 mt-3">
                  <div class="flex justify-between items-center mb-3">
                    <span class="font-semibold text-gray-700">
                      <i class="fas fa-file-invoice-dollar mr-1 text-indigo-600"></i>견적 및 비고
                    </span>
                    <button onclick="window.editShipperQuotation(${shipper.id}, ${id})" 
                            class="px-3 py-1 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600">
                      <i class="fas fa-edit mr-1"></i>수정
                    </button>
                  </div>
                  
                  <!-- 견적 정보 -->
                  <div class="mb-3">
                    <span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded mb-2">📋 견적</span>
                    ${shipper.quotation ? `
                      <div class="bg-gray-50 rounded p-3 text-sm border" style="white-space: pre-wrap;">${shipper.quotation.split('\\n').map(line => {
                        line = line.trim()
                        if (!line) return '<br>'
                        if (/\\d+[,\\d]*\\s*원/.test(line)) {
                          return '<div class="text-green-600 font-semibold ml-4">' + line + '</div>'
                        } else if (/왕복|편도|수입|수출/.test(line)) {
                          return '<div class="text-blue-600 font-bold mt-2 mb-1">' + line + '</div>'
                        } else {
                          return '<div class="text-gray-700">' + line + '</div>'
                        }
                      }).join('')}</div>
                    ` : '<p class="text-gray-400 text-sm italic pl-3">견적 없음</p>'}
                  </div>
                  
                  <!-- 첨부 사진 -->
                  ${shipper.photo_url ? `
                    <div class="mb-3">
                      <span class="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded mb-2">📷 첨부 사진</span>
                      <div class="bg-white p-2 rounded border">
                        <img src="${shipper.photo_url}" alt="견적 사진" 
                             class="w-full max-w-md rounded cursor-pointer hover:opacity-90"
                             onclick="window.viewPhotoModal('${shipper.photo_url}')"
                             title="클릭하여 크게 보기">
                        <p class="text-xs text-gray-500 mt-1 text-center">💡 클릭하여 크게 보기</p>
                      </div>
                    </div>
                  ` : ''}
                  
                  <!-- 비고 -->
                  <div>
                    <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded mb-2">📝 비고</span>
                    <div class="bg-yellow-50 rounded p-3 text-sm border" style="white-space: pre-wrap;">
                      ${shipper.memo || '<span class="text-gray-400 italic">비고 없음</span>'}
                    </div>
                  </div>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
}

window.deleteBillingSales = async function(billingCompany) {
  if (!confirm(`"${billingCompany}"를 삭제하시겠습니까?`)) return
  
  try {
    await axios.delete(`/api/billing-sales/${encodeURIComponent(billingCompany)}`)
    alert('삭제되었습니다.')
    fetchBillingSales()
  } catch (error) {
    console.error('삭제 실패:', error)
    alert(`삭제 실패: ${error.response?.data?.error || error.message}`)
  }
}

// 담당자 추가 모달
window.showAddContactModal = function(billingCompanyId) {
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full" onclick="event.stopPropagation()">
      <h3 class="text-xl font-bold mb-4">담당자 추가</h3>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">담당자명 *</label>
        <input type="text" id="contact_name" placeholder="담당자명 입력" 
               class="w-full px-3 py-2 border rounded">
      </div>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">연락처</label>
        <input type="text" id="contact_phone" placeholder="연락처 입력" 
               class="w-full px-3 py-2 border rounded">
      </div>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">메모</label>
        <textarea id="contact_memo" rows="2" placeholder="메모 입력"
                  class="w-full px-3 py-2 border rounded"></textarea>
      </div>
      
      <div class="flex justify-end space-x-2">
        <button onclick="this.closest('.fixed').remove()" 
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
          취소
        </button>
        <button onclick="window.saveContact(${billingCompanyId})" 
                class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          <i class="fas fa-save mr-1"></i>저장
        </button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  document.getElementById('contact_name').focus()
}

// 담당자 저장
// 담당자 수정 모달
window.editContact = async function(contactId, billingCompanyId) {
  // 담당자 데이터 조회
  let contact = null
  try {
    const response = await axios.get(`/api/billing-sales/${billingCompanyId}/contacts`)
    contact = response.data.find(c => c.id === contactId)
  } catch (error) {
    console.error('데이터 로드 실패:', error)
    alert('데이터를 불러올 수 없습니다.')
    return
  }
  
  if (!contact) {
    alert('담당자를 찾을 수 없습니다.')
    return
  }
  
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full" onclick="event.stopPropagation()">
      <h3 class="text-xl font-bold mb-4">담당자 수정</h3>
      
      <input type="hidden" id="edit_contact_id" value="${contactId}">
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">담당자명 *</label>
        <input type="text" id="edit_contact_name" value="${contact.contact_name}" 
               class="w-full px-3 py-2 border rounded">
      </div>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">연락처</label>
        <input type="text" id="edit_contact_phone" value="${contact.contact_phone || ''}" 
               class="w-full px-3 py-2 border rounded">
      </div>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">메모</label>
        <textarea id="edit_contact_memo" rows="2"
                  class="w-full px-3 py-2 border rounded">${contact.memo || ''}</textarea>
      </div>
      
      <div class="flex justify-end space-x-2">
        <button onclick="this.closest('.fixed').remove()" 
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
          취소
        </button>
        <button onclick="window.updateContact(${billingCompanyId})" 
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <i class="fas fa-save mr-1"></i>수정
        </button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  document.getElementById('edit_contact_name').focus()
}

// 담당자 수정 저장
window.updateContact = async function(billingCompanyId) {
  const id = document.getElementById('edit_contact_id')?.value
  const name = document.getElementById('edit_contact_name')?.value.trim()
  const phone = document.getElementById('edit_contact_phone')?.value.trim()
  const memo = document.getElementById('edit_contact_memo')?.value.trim()
  
  if (!name) {
    alert('담당자명을 입력해주세요.')
    return
  }
  
  try {
    await axios.put(`/api/billing-contacts/${id}`, {
      contact_name: name,
      contact_phone: phone || null,
      memo: memo || null
    })
    
    alert('수정되었습니다.')
    document.querySelector('.fixed.z-\\[60\\]')?.remove()
    
    // 상세 모달 새로고침
    document.querySelector('.fixed.z-50')?.remove()
    window.viewBillingDetail(billingCompanyId)
  } catch (error) {
    console.error('수정 실패:', error)
    alert(`수정 실패: ${error.response?.data?.error || error.message}`)
  }
}

window.saveContact = async function(billingCompanyId) {
  const name = document.getElementById('contact_name')?.value.trim()
  const phone = document.getElementById('contact_phone')?.value.trim()
  const memo = document.getElementById('contact_memo')?.value.trim()
  
  if (!name) {
    alert('담당자명을 입력해주세요.')
    return
  }
  
  try {
    await axios.post(`/api/billing-sales/${billingCompanyId}/contacts`, {
      contact_name: name,
      contact_phone: phone || null,
      memo: memo || null
    })
    
    alert('담당자가 추가되었습니다.')
    document.querySelector('.fixed.z-\\[60\\]')?.remove()
    
    // 상세 모달 새로고침
    document.querySelector('.fixed.z-50')?.remove()
    window.viewBillingDetail(billingCompanyId)
  } catch (error) {
    console.error('저장 실패:', error)
    alert(`저장 실패: ${error.response?.data?.error || error.message}`)
  }
}

// 담당자 삭제
window.deleteContact = async function(contactId, billingCompanyId) {
  if (!confirm('정말 삭제하시겠습니까?')) return
  
  try {
    await axios.delete(`/api/billing-contacts/${contactId}`)
    alert('삭제되었습니다.')
    
    // 상세 모달 새로고침
    document.querySelector('.fixed')?.remove()
    window.viewBillingDetail(billingCompanyId)
  } catch (error) {
    console.error('삭제 실패:', error)
    alert(`삭제 실패: ${error.response?.data?.error || error.message}`)
  }
}

// 화주 추가 모달
window.showAddShipperModal = function(billingCompanyId) {
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full" onclick="event.stopPropagation()">
      <h3 class="text-xl font-bold mb-4">화주 추가</h3>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">화주명 *</label>
        <input type="text" id="shipper_name" placeholder="화주명 입력" 
               class="w-full px-3 py-2 border rounded">
      </div>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">메모</label>
        <textarea id="shipper_memo" rows="2" placeholder="메모 입력"
                  class="w-full px-3 py-2 border rounded"></textarea>
      </div>
      
      <div class="flex justify-end space-x-2">
        <button onclick="this.closest('.fixed').remove()" 
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
          취소
        </button>
        <button onclick="window.saveShipper(${billingCompanyId})" 
                class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
          <i class="fas fa-save mr-1"></i>저장
        </button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  document.getElementById('shipper_name').focus()
}

// 화주 저장
// 화주 수정 모달
window.editShipper = async function(shipperId, billingCompanyId) {
  // 화주 데이터 조회
  let shipper = null
  try {
    const response = await axios.get(`/api/billing-sales/${billingCompanyId}/shippers`)
    shipper = response.data.find(s => s.id === shipperId)
  } catch (error) {
    console.error('데이터 로드 실패:', error)
    alert('데이터를 불러올 수 없습니다.')
    return
  }
  
  if (!shipper) {
    alert('화주를 찾을 수 없습니다.')
    return
  }
  
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full" onclick="event.stopPropagation()">
      <h3 class="text-xl font-bold mb-4">화주 수정</h3>
      
      <input type="hidden" id="edit_shipper_id" value="${shipperId}">
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">화주명 *</label>
        <input type="text" id="edit_shipper_name" value="${shipper.shipper_name}" 
               class="w-full px-3 py-2 border rounded">
      </div>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">메모</label>
        <textarea id="edit_shipper_memo" rows="2"
                  class="w-full px-3 py-2 border rounded">${shipper.memo || ''}</textarea>
      </div>
      
      <div class="flex justify-end space-x-2">
        <button onclick="this.closest('.fixed').remove()" 
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
          취소
        </button>
        <button onclick="window.updateShipper(${billingCompanyId})" 
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <i class="fas fa-save mr-1"></i>수정
        </button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  document.getElementById('edit_shipper_name').focus()
}

// 화주 견적 편집
window.editShipperQuotation = async function(shipperId, billingCompanyId) {
  // 화주 데이터 조회
  let shipper = null
  try {
    const response = await axios.get(`/api/billing-sales/${billingCompanyId}/shippers`)
    shipper = response.data.find(s => s.id === shipperId)
  } catch (error) {
    console.error('데이터 로드 실패:', error)
    alert('데이터를 불러올 수 없습니다.')
    return
  }
  
  if (!shipper) {
    alert('화주를 찾을 수 없습니다.')
    return
  }
  
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold">
          <i class="fas fa-file-invoice-dollar mr-2 text-indigo-600"></i>${shipper.shipper_name} - 견적 작성
        </h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>
      
      <div class="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
        <p class="text-sm text-gray-700 mb-2">
          <i class="fas fa-info-circle text-blue-500 mr-1"></i>
          <strong>작성 방법:</strong> 자유롭게 입력하세요. 예시:
        </p>
        <pre class="text-xs text-gray-600 bg-white p-2 rounded">왕복 / 부산(북항)수입 - 경북경산시압량읍
20':  323,000 원
40':  366,000 원

왕복 / 부산(신항)수입 - 경북경산시압량읍
20':  318,000 원
40':  360,000 원</pre>
      </div>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">견적 내용</label>
        <textarea id="shipper_quotation_content" rows="12" 
                  placeholder="견적 내용을 자유롭게 입력하세요..."
                  class="w-full px-3 py-2 border rounded font-mono text-sm">${shipper.quotation || ''}</textarea>
      </div>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">사진</label>
        <input type="file" id="shipper_quotation_photo" accept="image/*" 
               class="w-full px-3 py-2 border rounded">
        <p class="text-xs text-gray-500 mt-1">JPG, PNG 형식 (최대 5MB)</p>
        ${shipper.photo_url ? `
          <div class="mt-2">
            <img src="${shipper.photo_url}" alt="기존 사진" class="w-32 h-32 object-cover rounded">
            <button onclick="window.deleteShipperPhoto(${shipperId}, ${billingCompanyId})"
                    class="mt-1 text-xs text-red-600 hover:text-red-700">
              <i class="fas fa-trash mr-1"></i>사진 삭제
            </button>
          </div>
        ` : ''}
      </div>
      
      <div class="flex justify-end space-x-2">
        <button onclick="this.closest('.fixed').remove()" 
                class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
          취소
        </button>
        <button onclick="window.saveShipperQuotation(${shipperId}, ${billingCompanyId})" 
                class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
          <i class="fas fa-save mr-1"></i>저장
        </button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
}

// 화주 견적 저장
window.saveShipperQuotation = async function(shipperId, billingCompanyId) {
  const content = document.getElementById('shipper_quotation_content').value.trim()
  const photoInput = document.getElementById('shipper_quotation_photo')
  
  let photoUrl = null
  
  // 사진 업로드 처리
  if (photoInput.files && photoInput.files[0]) {
    const file = photoInput.files[0]
    
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다')
      return
    }
    
    try {
      const reader = new FileReader()
      photoUrl = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    } catch (error) {
      console.error('파일 읽기 실패:', error)
      alert('파일을 읽을 수 없습니다')
      return
    }
  }
  
  try {
    const updateData = {
      quotation: content || null
    }
    
    if (photoUrl) {
      updateData.photo_url = photoUrl
    }
    
    await axios.put(`/api/billing-shippers/${shipperId}`, updateData)
    
    alert('견적이 저장되었습니다')
    document.querySelector('.fixed.z-\\[60\\]').remove()
    
    // 상세 모달 새로고침
    document.querySelector('.fixed.z-50')?.remove()
    window.viewBillingDetail(billingCompanyId)
  } catch (error) {
    console.error('견적 저장 실패:', error)
    alert('견적 저장에 실패했습니다')
  }
}

// 화주 사진 삭제
window.deleteShipperPhoto = async function(shipperId, billingCompanyId) {
  if (!confirm('사진을 삭제하시겠습니까?')) return
  
  try {
    await axios.put(`/api/billing-shippers/${shipperId}`, {
      photo_url: null
    })
    
    alert('사진이 삭제되었습니다')
    document.querySelector('.fixed.z-\\[60\\]').remove()
    
    // 상세 모달 새로고침
    document.querySelector('.fixed.z-50')?.remove()
    window.viewBillingDetail(billingCompanyId)
  } catch (error) {
    console.error('사진 삭제 실패:', error)
    alert('사진 삭제에 실패했습니다')
  }
}

// 화주 수정 저장
window.updateShipper = async function(billingCompanyId) {
  const id = document.getElementById('edit_shipper_id')?.value
  const name = document.getElementById('edit_shipper_name')?.value.trim()
  const memo = document.getElementById('edit_shipper_memo')?.value.trim()
  
  if (!name) {
    alert('화주명을 입력해주세요.')
    return
  }
  
  try {
    await axios.put(`/api/billing-shippers/${id}`, {
      shipper_name: name,
      memo: memo || null
    })
    
    alert('수정되었습니다.')
    document.querySelector('.fixed.z-\\[60\\]')?.remove()
    
    // 상세 모달 새로고침
    document.querySelector('.fixed.z-50')?.remove()
    window.viewBillingDetail(billingCompanyId)
  } catch (error) {
    console.error('수정 실패:', error)
    alert(`수정 실패: ${error.response?.data?.error || error.message}`)
  }
}

window.saveShipper = async function(billingCompanyId) {
  const name = document.getElementById('shipper_name')?.value.trim()
  const memo = document.getElementById('shipper_memo')?.value.trim()
  
  if (!name) {
    alert('화주명을 입력해주세요.')
    return
  }
  
  try {
    await axios.post(`/api/billing-sales/${billingCompanyId}/shippers`, {
      shipper_name: name,
      memo: memo || null
    })
    
    alert('화주가 추가되었습니다.')
    document.querySelector('.fixed.z-\\[60\\]')?.remove()
    
    // 상세 모달 새로고침
    document.querySelector('.fixed.z-50')?.remove()
    window.viewBillingDetail(billingCompanyId)
  } catch (error) {
    console.error('저장 실패:', error)
    alert(`저장 실패: ${error.response?.data?.error || error.message}`)
  }
}

// 화주 삭제
window.deleteShipper = async function(shipperId, billingCompanyId) {
  if (!confirm('정말 삭제하시겠습니까?')) return
  
  try {
    await axios.delete(`/api/billing-shippers/${shipperId}`)
    alert('삭제되었습니다.')
    
    // 상세 모달 새로고침
    document.querySelector('.fixed')?.remove()
    window.viewBillingDetail(billingCompanyId)
  } catch (error) {
    console.error('삭제 실패:', error)
    alert(`삭제 실패: ${error.response?.data?.error || error.message}`)
  }
}

// ============================================
// 화주 견적 관리 (간단 텍스트 방식)
// ============================================

window.viewShipperQuotations = async function(shipperId, billingCompanyId, shipperName) {
  let quotation = null
  
  try {
    const response = await axios.get(`/api/simple-quotations/${shipperId}`)
    quotation = response.data
  } catch (error) {
    console.error('견적 로드 실패:', error)
  }
  
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  // 견적 텍스트를 HTML로 변환 (줄바꿈 유지)
  const formatQuotation = (content) => {
    if (!content) return '<p class="text-gray-500">견적 내용이 없습니다</p>'
    
    return content.split('\n').map(line => {
      line = line.trim()
      if (!line) return '<br>'
      
      // 가격 라인 (숫자와 원이 있는 경우)
      if (/\d+[,\d]*\s*원/.test(line)) {
        return `<div class="text-lg font-semibold text-green-600 ml-4">${line}</div>`
      }
      // 헤더 라인 (왕복, 편도 등이 포함된 경우)
      else if (/왕복|편도|수입|수출/.test(line)) {
        return `<div class="text-xl font-bold text-blue-600 mt-4 mb-2">${line}</div>`
      }
      // 일반 텍스트
      else {
        return `<div class="text-gray-700">${line}</div>`
      }
    }).join('')
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-2xl font-bold">
          <i class="fas fa-file-invoice-dollar mr-2 text-indigo-600"></i>${shipperName} - 견적
        </h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>
      
      <div class="mb-4 flex gap-2">
        <button onclick="window.editSimpleQuotation(${shipperId}, ${billingCompanyId}, '${shipperName}')" 
                class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
          <i class="fas fa-edit mr-1"></i>${quotation ? '견적 수정' : '견적 작성'}
        </button>
        ${quotation ? `
          <button onclick="window.deleteSimpleQuotation(${shipperId}, '${shipperName}')" 
                  class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            <i class="fas fa-trash mr-1"></i>견적 삭제
          </button>
        ` : ''}
      </div>
      
      <div class="bg-gray-50 rounded-lg p-6 border border-gray-200">
        ${quotation ? formatQuotation(quotation.content) : '<p class="text-gray-500 text-center py-8">등록된 견적이 없습니다</p>'}
      </div>
      
      ${quotation ? `
        <div class="mt-4 text-sm text-gray-500 text-right">
          최종 수정: ${new Date(quotation.updated_at).toLocaleString('ko-KR')}
        </div>
      ` : ''}
    </div>
  `
  
  document.body.appendChild(modal)
}

// 간단 견적 편집
window.editSimpleQuotation = async function(shipperId, billingCompanyId, shipperName) {
  let currentContent = ''
  
  try {
    const response = await axios.get(`/api/simple-quotations/${shipperId}`)
    if (response.data) {
      currentContent = response.data.content
    }
  } catch (error) {
    console.error('견적 로드 실패:', error)
  }
  
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80] p-4'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold">
          <i class="fas fa-edit mr-2 text-indigo-600"></i>${shipperName} - 견적 작성
        </h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>
      
      <div class="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
        <p class="text-sm text-gray-700 mb-2">
          <i class="fas fa-info-circle text-blue-500 mr-1"></i>
          <strong>작성 방법:</strong> 자유롭게 입력하세요. 예시:
        </p>
        <pre class="text-xs text-gray-600 bg-white p-2 rounded">왕복 / 부산(북항)수입 - 경북경산시압량읍
20':  323,000 원
40':  366,000 원

왕복 / 부산(신항)수입 - 경북경산시압량읍
20':  318,000 원
40':  360,000 원</pre>
      </div>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">견적 내용</label>
        <textarea id="simple_quot_content" rows="15" 
                  placeholder="견적 내용을 자유롭게 입력하세요..."
                  class="w-full px-3 py-2 border rounded font-mono text-sm">${currentContent}</textarea>
      </div>
      
      <div class="flex justify-end space-x-2">
        <button onclick="this.closest('.fixed').remove()" 
                class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
          취소
        </button>
        <button onclick="window.saveSimpleQuotation(${shipperId}, ${billingCompanyId})" 
                class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
          <i class="fas fa-save mr-1"></i>저장
        </button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
}

// 간단 견적 저장
window.saveSimpleQuotation = async function(shipperId, billingCompanyId) {
  const content = document.getElementById('simple_quot_content').value.trim()
  
  if (!content) {
    alert('견적 내용을 입력하세요')
    return
  }
  
  try {
    await axios.post('/api/simple-quotations', {
      shipper_id: shipperId,
      billing_company_id: billingCompanyId,
      content: content
    })
    
    alert('견적이 저장되었습니다')
    document.querySelector('.fixed.z-\\[80\\]').remove()
    
    // 견적 목록 새로고침
    const listModal = document.querySelector('.fixed.z-\\[70\\]')
    if (listModal) {
      listModal.remove()
      window.viewShipperQuotations(shipperId, billingCompanyId, '')
    }
  } catch (error) {
    console.error('견적 저장 실패:', error)
    alert('견적 저장에 실패했습니다')
  }
}

// 간단 견적 삭제
window.deleteSimpleQuotation = async function(shipperId, shipperName) {
  if (!confirm(`${shipperName}의 견적을 삭제하시겠습니까?`)) {
    return
  }
  
  try {
    await axios.delete(`/api/simple-quotations/${shipperId}`)
    alert('견적이 삭제되었습니다')
    
    // 모달 닫고 재로드
    const modal = document.querySelector('.fixed.z-\\[70\\]')
    if (modal) {
      modal.remove()
    }
  } catch (error) {
    console.error('견적 삭제 실패:', error)
    alert('견적 삭제에 실패했습니다')
  }
}

// 구 견적 관리 함수들 (호환성 유지)
window.showAddQuotationModal = function(shipperId, billingCompanyId) {
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <h3 class="text-xl font-bold mb-4">견적 추가</h3>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block mb-2 font-semibold">작업지 *</label>
          <input type="text" id="quot_work_site" placeholder="예: 부산신항" 
                 class="w-full px-3 py-2 border rounded">
        </div>
        <div>
          <label class="block mb-2 font-semibold">노선 타입 *</label>
          <select id="quot_route_type" class="w-full px-3 py-2 border rounded">
            <option value="">선택</option>
            <option value="부산신항편도">부산신항편도</option>
            <option value="부산신항왕복">부산신항왕복</option>
            <option value="부산북항편도">부산북항편도</option>
            <option value="부산북항왕복">부산북항왕복</option>
            <option value="인천신항왕복">인천신항왕복</option>
            <option value="인천구항왕복">인천구항왕복</option>
            <option value="평택왕복">평택왕복</option>
            <option value="광양왕복">광양왕복</option>
          </select>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block mb-2 font-semibold">컨테이너 사이즈</label>
          <select id="quot_container_size" class="w-full px-3 py-2 border rounded">
            <option value="">선택</option>
            <option value="20GP">20GP</option>
            <option value="40GP">40GP</option>
            <option value="40HC">40HC</option>
            <option value="40HQ">40HQ</option>
            <option value="45HC">45HC</option>
          </select>
        </div>
        <div>
          <label class="block mb-2 font-semibold">가격 *</label>
          <input type="number" id="quot_price" placeholder="예: 250000" 
                 class="w-full px-3 py-2 border rounded">
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">메모</label>
        <textarea id="quot_memo" rows="2" placeholder="메모 입력"
                  class="w-full px-3 py-2 border rounded"></textarea>
      </div>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">사진</label>
        <input type="file" id="quot_photo" accept="image/*" 
               class="w-full px-3 py-2 border rounded">
        <p class="text-xs text-gray-500 mt-1">JPG, PNG 형식 (최대 5MB)</p>
      </div>
      
      <div class="flex justify-end space-x-2">
        <button onclick="this.closest('.fixed').remove()" 
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
          취소
        </button>
        <button onclick="window.saveQuotation(${shipperId}, ${billingCompanyId})" 
                class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
          <i class="fas fa-save mr-1"></i>저장
        </button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  document.getElementById('quot_work_site').focus()
}

window.saveQuotation = async function(shipperId, billingCompanyId) {
  const workSite = document.getElementById('quot_work_site')?.value.trim()
  const routeType = document.getElementById('quot_route_type')?.value
  const containerSize = document.getElementById('quot_container_size')?.value
  const price = document.getElementById('quot_price')?.value
  const memo = document.getElementById('quot_memo')?.value.trim()
  const photoFile = document.getElementById('quot_photo')?.files[0]
  
  if (!workSite || !routeType || !price) {
    alert('작업지, 노선 타입, 가격은 필수입니다.')
    return
  }
  
  try {
    let photoUrl = null
    
    // 사진 업로드 (Base64로 변환)
    if (photoFile) {
      if (photoFile.size > 5 * 1024 * 1024) {
        alert('사진 크기는 5MB 이하여야 합니다.')
        return
      }
      
      const reader = new FileReader()
      photoUrl = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsDataURL(photoFile)
      })
    }
    
    await axios.post('/api/shipper-quotations', {
      shipper_id: shipperId,
      billing_company_id: billingCompanyId,
      work_site: workSite,
      route_type: routeType,
      container_size: containerSize || null,
      price: parseFloat(price),
      memo: memo || null,
      photo_url: photoUrl
    })
    
    alert('견적이 추가되었습니다.')
    document.querySelector('.fixed.z-\\\\[80\\\\]')?.remove()
    
    // 견적 목록 새로고침
    document.querySelector('.fixed.z-\\\\[70\\\\]')?.remove()
    const billingItem = allBillingSales.find(b => b.id === billingCompanyId)
    if (billingItem) {
      const shipperItem = await axios.get(`/api/billing-sales/${billingCompanyId}/shippers`)
      const shipper = shipperItem.data.find(s => s.id === shipperId)
      if (shipper) {
        window.viewShipperQuotations(shipperId, billingCompanyId, shipper.shipper_name)
      }
    }
  } catch (error) {
    console.error('견적 추가 실패:', error)
    alert(`견적 추가 실패: ${error.response?.data?.error || error.message}`)
  }
}

window.editQuotation = async function(quotationId, shipperId, billingCompanyId) {
  let quotation = null
  try {
    const response = await axios.get(`/api/shipper-quotations/${shipperId}`)
    quotation = response.data.find(q => q.id === quotationId)
  } catch (error) {
    console.error('견적 로드 실패:', error)
    alert('견적을 불러올 수 없습니다.')
    return
  }
  
  if (!quotation) {
    alert('견적을 찾을 수 없습니다.')
    return
  }
  
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]'
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove()
  }
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <h3 class="text-xl font-bold mb-4">견적 수정</h3>
      
      <input type="hidden" id="edit_quot_id" value="${quotationId}">
      
      ${quotation.photo_url ? `
        <div class="mb-4">
          <label class="block mb-2 font-semibold">현재 사진</label>
          <img src="${quotation.photo_url}" alt="현재 사진" class="w-full h-48 object-cover rounded">
        </div>
      ` : ''}
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block mb-2 font-semibold">작업지 *</label>
          <input type="text" id="edit_quot_work_site" value="${quotation.work_site}" 
                 class="w-full px-3 py-2 border rounded">
        </div>
        <div>
          <label class="block mb-2 font-semibold">노선 타입 *</label>
          <select id="edit_quot_route_type" class="w-full px-3 py-2 border rounded">
            <option value="">선택</option>
            <option value="부산신항편도" ${quotation.route_type === '부산신항편도' ? 'selected' : ''}>부산신항편도</option>
            <option value="부산신항왕복" ${quotation.route_type === '부산신항왕복' ? 'selected' : ''}>부산신항왕복</option>
            <option value="부산북항편도" ${quotation.route_type === '부산북항편도' ? 'selected' : ''}>부산북항편도</option>
            <option value="부산북항왕복" ${quotation.route_type === '부산북항왕복' ? 'selected' : ''}>부산북항왕복</option>
            <option value="인천신항왕복" ${quotation.route_type === '인천신항왕복' ? 'selected' : ''}>인천신항왕복</option>
            <option value="인천구항왕복" ${quotation.route_type === '인천구항왕복' ? 'selected' : ''}>인천구항왕복</option>
            <option value="평택왕복" ${quotation.route_type === '평택왕복' ? 'selected' : ''}>평택왕복</option>
            <option value="광양왕복" ${quotation.route_type === '광양왕복' ? 'selected' : ''}>광양왕복</option>
          </select>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block mb-2 font-semibold">컨테이너 사이즈</label>
          <select id="edit_quot_container_size" class="w-full px-3 py-2 border rounded">
            <option value="">선택</option>
            <option value="20GP" ${quotation.container_size === '20GP' ? 'selected' : ''}>20GP</option>
            <option value="40GP" ${quotation.container_size === '40GP' ? 'selected' : ''}>40GP</option>
            <option value="40HC" ${quotation.container_size === '40HC' ? 'selected' : ''}>40HC</option>
            <option value="40HQ" ${quotation.container_size === '40HQ' ? 'selected' : ''}>40HQ</option>
            <option value="45HC" ${quotation.container_size === '45HC' ? 'selected' : ''}>45HC</option>
          </select>
        </div>
        <div>
          <label class="block mb-2 font-semibold">가격 *</label>
          <input type="number" id="edit_quot_price" value="${quotation.price}" 
                 class="w-full px-3 py-2 border rounded">
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">메모</label>
        <textarea id="edit_quot_memo" rows="2"
                  class="w-full px-3 py-2 border rounded">${quotation.memo || ''}</textarea>
      </div>
      
      <div class="mb-4">
        <label class="block mb-2 font-semibold">사진 변경</label>
        <input type="file" id="edit_quot_photo" accept="image/*" 
               class="w-full px-3 py-2 border rounded">
        <p class="text-xs text-gray-500 mt-1">JPG, PNG 형식 (최대 5MB) - 선택 시 기존 사진 덮어쓰기</p>
      </div>
      
      <div class="flex justify-end space-x-2">
        <button onclick="this.closest('.fixed').remove()" 
                class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
          취소
        </button>
        <button onclick="window.updateQuotation(${shipperId}, ${billingCompanyId})" 
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <i class="fas fa-save mr-1"></i>수정
        </button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  document.getElementById('edit_quot_work_site').focus()
}

window.updateQuotation = async function(shipperId, billingCompanyId) {
  const id = document.getElementById('edit_quot_id')?.value
  const workSite = document.getElementById('edit_quot_work_site')?.value.trim()
  const routeType = document.getElementById('edit_quot_route_type')?.value
  const containerSize = document.getElementById('edit_quot_container_size')?.value
  const price = document.getElementById('edit_quot_price')?.value
  const memo = document.getElementById('edit_quot_memo')?.value.trim()
  const photoFile = document.getElementById('edit_quot_photo')?.files[0]
  
  if (!workSite || !routeType || !price) {
    alert('작업지, 노선 타입, 가격은 필수입니다.')
    return
  }
  
  try {
    let photoUrl = undefined
    
    // 새 사진이 있으면 업로드
    if (photoFile) {
      if (photoFile.size > 5 * 1024 * 1024) {
        alert('사진 크기는 5MB 이하여야 합니다.')
        return
      }
      
      const reader = new FileReader()
      photoUrl = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsDataURL(photoFile)
      })
    }
    
    const data = {
      work_site: workSite,
      route_type: routeType,
      container_size: containerSize || null,
      price: parseFloat(price),
      memo: memo || null
    }
    
    if (photoUrl !== undefined) {
      data.photo_url = photoUrl
    }
    
    await axios.put(`/api/shipper-quotations/${id}`, data)
    
    alert('견적이 수정되었습니다.')
    document.querySelector('.fixed.z-\\\\[80\\\\]')?.remove()
    
    // 견적 목록 새로고침
    document.querySelector('.fixed.z-\\\\[70\\\\]')?.remove()
    const billingItem = allBillingSales.find(b => b.id === billingCompanyId)
    if (billingItem) {
      const shipperItem = await axios.get(`/api/billing-sales/${billingCompanyId}/shippers`)
      const shipper = shipperItem.data.find(s => s.id === shipperId)
      if (shipper) {
        window.viewShipperQuotations(shipperId, billingCompanyId, shipper.shipper_name)
      }
    }
  } catch (error) {
    console.error('견적 수정 실패:', error)
    alert(`견적 수정 실패: ${error.response?.data?.error || error.message}`)
  }
}

window.deleteQuotation = async function(quotationId, shipperId, billingCompanyId) {
  if (!confirm('이 견적을 삭제하시겠습니까?')) return
  
  try {
    await axios.delete(`/api/shipper-quotations/${quotationId}`)
    alert('견적이 삭제되었습니다.')
    
    // 견적 목록 새로고침
    document.querySelector('.fixed.z-\\\\[70\\\\]')?.remove()
    const billingItem = allBillingSales.find(b => b.id === billingCompanyId)
    if (billingItem) {
      const shipperItem = await axios.get(`/api/billing-sales/${billingCompanyId}/shippers`)
      const shipper = shipperItem.data.find(s => s.id === shipperId)
      if (shipper) {
        window.viewShipperQuotations(shipperId, billingCompanyId, shipper.shipper_name)
      }
    }
  } catch (error) {
    console.error('견적 삭제 실패:', error)
    alert(`견적 삭제 실패: ${error.response?.data?.error || error.message}`)
  }
}

window.viewPhotoModal = function(photoUrl) {
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[90] p-4'
  modal.onclick = () => modal.remove()
  
  modal.innerHTML = `
    <div class="max-w-4xl w-full" onclick="event.stopPropagation()">
      <div class="flex justify-end mb-2">
        <button onclick="this.closest('.fixed').remove()" 
                class="text-white hover:text-gray-300">
          <i class="fas fa-times text-3xl"></i>
        </button>
      </div>
      <img src="${photoUrl}" alt="사진 크게 보기" class="w-full h-auto rounded-lg">
    </div>
  `
  
  document.body.appendChild(modal)
}

// ============================================
// 초기화
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  fetchLocationCodes()
  fetchShippingLines()
  fetchDispatchCompanies()
  render()
})
