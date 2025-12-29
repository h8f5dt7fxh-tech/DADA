// ============================================
// 전역 상태 관리
// ============================================
const state = {
  currentPage: 'create-order',  // 초기 페이지를 오더 입력으로 변경
  currentView: 'month',
  currentDate: dayjs().format('YYYY-MM-DD'), // 현재 날짜로 초기화
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
    // 컨테이너 수출
    if (line.startsWith('BKG/SIZE') || line.startsWith('BKG / SIZE')) {
      const match = line.match(/:\s*(.+?)(?:\s*\/\s*(.+))?$/)
      if (match) {
        order.booking_number = match[1]?.trim()
        order.container_size = match[2]?.trim()
        detectedContainerSize = order.container_size
      }
    }
    // 컨테이너 수입
    else if (line.startsWith('BL :') || line.startsWith('BL:')) {
      order.bl_number = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('CON/SIZE') || line.startsWith('CON / SIZE')) {
      const match = line.match(/:\s*(.+?)(?:\s*\/\s*(.+))?$/)
      if (match) {
        order.container_number = match[1]?.trim()
        order.container_size = match[2]?.trim()
        detectedContainerSize = order.container_size
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
    else if (line.startsWith('작업일시') || line.startsWith('작업일시 :')) {
      const dateStr = line.split(':')[1]?.trim()
      // "2025.12.02(화) 08:30" 형식 파싱
      const match = dateStr?.match(/(\d{4})\.(\d{2})\.(\d{2}).*?(\d{2}):(\d{2})/)
      if (match) {
        order.work_datetime = `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`
      }
    }
    else if (line.startsWith('선사') || line.startsWith('선사 :')) {
      order.shipping_line = line.split(':')[1]?.trim()
    }
    else if (line.startsWith('모선') || line.startsWith('모선 :')) {
      const match = line.match(/:\s*(.+?)(?:\s*\/\s*(.+))?$/)
      if (match) {
        order.vessel_name = match[1]?.trim()
      }
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
        order.unloading_location = match[2]?.trim()
      }
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
// UI 렌더링 함수
// ============================================

function renderNavigation() {
  return `
    <nav class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex items-center justify-between h-16">
          <!-- 데스크톱 네비게이션 -->
          <div class="flex items-center space-x-8 desktop-nav w-full">
            <h1 class="text-xl font-bold text-gray-800">
              <i class="fas fa-truck mr-2"></i>운송사 관리 시스템
            </h1>
            <div class="flex space-x-4">
              <button onclick="changePage('orders')" class="nav-link ${state.currentPage === 'orders' ? 'tab-active' : ''} px-3 py-2">
                <i class="fas fa-list mr-1"></i>오더 관리
              </button>
              <button onclick="changePage('create-order')" class="nav-link ${state.currentPage === 'create-order' ? 'tab-active' : ''} px-3 py-2">
                <i class="fas fa-plus mr-1"></i>오더 입력
              </button>
              <button onclick="changePage('clients')" class="nav-link ${state.currentPage === 'clients' ? 'tab-active' : ''} px-3 py-2">
                <i class="fas fa-building mr-1"></i>거래처 관리
              </button>
              <button onclick="changePage('codes')" class="nav-link ${state.currentPage === 'codes' ? 'tab-active' : ''} px-3 py-2">
                <i class="fas fa-code mr-1"></i>코드 관리
              </button>
              <button onclick="changePage('todos')" class="nav-link ${state.currentPage === 'todos' ? 'tab-active' : ''} px-3 py-2">
                <i class="fas fa-tasks mr-1"></i>할일
              </button>
            </div>
          </div>
          
          <!-- 모바일 네비게이션 -->
          <div class="mobile-nav flex items-center justify-between w-full" style="display: none;">
            <h1 class="text-lg font-bold text-gray-800">
              <i class="fas fa-truck mr-2"></i>운송 관리
            </h1>
            <button onclick="toggleMobileMenu()" class="p-2 text-gray-600 hover:text-gray-900">
              <i class="fas fa-bars text-2xl"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
    
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
        <button onclick="changePage('orders'); toggleMobileMenu()" class="w-full text-left px-4 py-3 rounded mb-2 ${state.currentPage === 'orders' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}">
          <i class="fas fa-list mr-2"></i>오더 관리
        </button>
        <button onclick="changePage('create-order'); toggleMobileMenu()" class="w-full text-left px-4 py-3 rounded mb-2 ${state.currentPage === 'create-order' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}">
          <i class="fas fa-plus mr-2"></i>오더 입력
        </button>
        <button onclick="changePage('clients'); toggleMobileMenu()" class="w-full text-left px-4 py-3 rounded mb-2 ${state.currentPage === 'clients' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}">
          <i class="fas fa-building mr-2"></i>거래처 관리
        </button>
        <button onclick="changePage('codes'); toggleMobileMenu()" class="w-full text-left px-4 py-3 rounded mb-2 ${state.currentPage === 'codes' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}">
          <i class="fas fa-code mr-2"></i>코드 관리
        </button>
        <button onclick="changePage('todos'); toggleMobileMenu()" class="w-full text-left px-4 py-3 rounded mb-2 ${state.currentPage === 'todos' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}">
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
  
  const totalBilling = (order.billings || []).reduce((sum, b) => sum + parseFloat(b.amount || 0), 0)
  const totalPayment = (order.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
  
  return `
    <div class="border-l-4 ${typeColor} bg-white p-3 rounded shadow-sm mb-2 cursor-pointer hover:shadow-md transition" 
         onclick="viewOrderDetail(${order.id})">
      <div class="flex items-start justify-between mb-2">
        <span class="px-2 py-1 text-xs font-semibold rounded ${typeColor}">
          ${typeLabel}
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
      ${order.dispatch_company ? `<div class="text-xs text-gray-600 mb-1"><i class="fas fa-truck mr-1"></i>${order.dispatch_company}</div>` : ''}
      ${order.vehicle_info ? `<div class="text-xs text-gray-500"><i class="fas fa-car mr-1"></i>${order.vehicle_info}</div>` : ''}
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
  
  // 일별 뷰: 테이블 형식
  const ordersHtml = state.orders.map(order => {
    const statusClass = `status-${order.status}`
    const typeLabel = {
      'container_export': '컨수출',
      'container_import': '컨수입',
      'bulk': '벌크',
      'lcl': 'LCL'
    }[order.order_type]
    
    const totalBilling = (order.billings || []).reduce((sum, b) => sum + parseFloat(b.amount || 0), 0)
    const totalPayment = (order.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    const profit = totalBilling - totalPayment
    
    return `
      <tr class="${statusClass} hover:bg-gray-100 cursor-pointer" onclick="viewOrderDetail(${order.id})">
        <td class="px-4 py-3 border-b">${typeLabel}</td>
        <td class="px-4 py-3 border-b">${formatDate(order.work_datetime)}</td>
        <td class="px-4 py-3 border-b">${order.billing_company}</td>
        <td class="px-4 py-3 border-b">${order.shipper}</td>
        <td class="px-4 py-3 border-b">${order.work_site || '-'}</td>
        <td class="px-4 py-3 border-b">${order.booking_number || order.bl_number || order.order_no || '-'}</td>
        <td class="px-4 py-3 border-b">${order.loading_location || '-'} → ${order.unloading_location || '-'}</td>
        <td class="px-4 py-3 border-b">${order.dispatch_company || '-'}</td>
        <td class="px-4 py-3 border-b text-right">${totalBilling.toLocaleString()}원</td>
        <td class="px-4 py-3 border-b text-right">${totalPayment.toLocaleString()}원</td>
        <td class="px-4 py-3 border-b text-right font-semibold ${profit >= 0 ? 'text-blue-600' : 'text-red-600'}">
          ${profit.toLocaleString()}원
        </td>
        <td class="px-4 py-3 border-b">
          ${order.weighing_required ? '<i class="fas fa-balance-scale text-yellow-600" title="계근"></i>' : ''}
          ${order.status === 'completed' ? '<i class="fas fa-check-circle text-green-600"></i>' : ''}
        </td>
      </tr>
    `
  }).join('')
  
  listContainer.innerHTML = `
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-4 py-3 text-left">구분</th>
            <th class="px-4 py-3 text-left">작업일시</th>
            <th class="px-4 py-3 text-left">청구처</th>
            <th class="px-4 py-3 text-left">화주</th>
            <th class="px-4 py-3 text-left">작업지</th>
            <th class="px-4 py-3 text-left">BKG/BL/NO</th>
            <th class="px-4 py-3 text-left">상하차지</th>
            <th class="px-4 py-3 text-left">배차업체</th>
            <th class="px-4 py-3 text-right">청구</th>
            <th class="px-4 py-3 text-right">하불</th>
            <th class="px-4 py-3 text-right">수익</th>
            <th class="px-4 py-3 text-center">상태</th>
          </tr>
        </thead>
        <tbody>
          ${ordersHtml || '<tr><td colspan="12" class="px-4 py-8 text-center text-gray-500">오더가 없습니다</td></tr>'}
        </tbody>
      </table>
    </div>
  `
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
        <i class="fas fa-building mr-2"></i>거래처 관리 (청구처-영업담당자)
      </h2>
      <p class="text-gray-600 mb-4">청구처별 영업담당자를 관리합니다.</p>
      
      <div class="mb-4 flex justify-between items-center">
        <button onclick="showAddBillingSalesModal()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <i class="fas fa-plus mr-1"></i>청구처 추가
        </button>
        <input type="text" id="billingSalesSearch" placeholder="검색..." 
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
  `
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

async function deleteDispatchCompany(id) {
  if (!confirm('이 협력업체를 삭제하시겠습니까?')) return
  
  try {
    await axios.delete(`/api/dispatch-companies/${id}`)
    alert('협력업체가 삭제되었습니다.')
    await fetchDispatchCompanies()
    renderApp()
  } catch (error) {
    console.error('협력업체 삭제 실패:', error)
    alert('협력업체 삭제에 실패했습니다.')
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
  
  if (page === 'orders') {
    fetchOrders()
  } else if (page === 'todos') {
    fetchTodos()
  } else if (page === 'create-order') {
    renderInputContent()
  } else if (page === 'clients') {
    fetchBillingSales()
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
    <div class="mb-6">
      <label class="block mb-2 font-semibold">오더 타입</label>
      <select id="newOrderType" onchange="updateTemplateButton()" class="w-full px-3 py-2 border rounded">
        <option value="container_export">컨테이너 수출</option>
        <option value="container_import">컨테이너 수입</option>
        <option value="bulk">벌크화물</option>
        <option value="lcl">LCL</option>
      </select>
    </div>
    
    <div class="mb-4">
      <button onclick="copyOrderTemplate()" class="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center">
        <i class="fas fa-copy mr-2"></i>
        <span id="templateButtonText">컨테이너 수출 양식 복사</span>
      </button>
    </div>
    
    <div class="mb-6">
      <label class="block mb-2 font-semibold">텍스트 붙여넣기 (자동 파싱)</label>
      <textarea id="orderTextInput" rows="15" 
                class="w-full px-3 py-2 border rounded font-mono text-sm"
                placeholder="오더 정보를 붙여넣으세요..."></textarea>
    </div>
    
    <div class="flex space-x-4">
      <button onclick="parseAndPreviewOrder()" class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        <i class="fas fa-magic mr-2"></i>파싱 및 미리보기
      </button>
    </div>
    
    <div id="orderPreview" class="mt-6"></div>
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
        <button onclick="this.closest('.fixed').remove()" class="text-gray-600 hover:text-gray-800">
          <i class="fas fa-times text-2xl"></i>
        </button>
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
  
  let content = ''
  
  if (state.currentPage === 'orders') {
    content = `
      ${renderOrderFilters()}
      <div id="orderListContainer"></div>
    `
  } else if (state.currentPage === 'create-order') {
    content = renderCreateOrderPage()
    setTimeout(() => renderInputContent(), 0)  // 렌더링 후 내용 채우기
  } else if (state.currentPage === 'todos') {
    content = `<div id="todoContainer"></div>`
  } else if (state.currentPage === 'codes') {
    content = renderCodesManagementPage()
  } else if (state.currentPage === 'clients') {
    content = renderClientsManagementPage()
  } else {
    content = `
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-2xl font-bold mb-4">${state.currentPage}</h2>
        <p class="text-gray-600">이 페이지는 곧 구현됩니다.</p>
      </div>
    `
  }
  
  app.innerHTML = `
    ${renderNavigation()}
    <div class="max-w-7xl mx-auto px-4 py-6">
      ${content}
    </div>
  `
  
  // 페이지별 데이터 로드
  if (state.currentPage === 'orders') {
    fetchOrders()
  } else if (state.currentPage === 'todos') {
    fetchTodos()
  } else if (state.currentPage === 'codes') {
    // 코드 데이터는 이미 로드됨 (무한 루프 방지 - render() 호출 제거)
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
          <th class="px-4 py-3 text-left border">담당자</th>
          <th class="px-4 py-3 text-left border">화주</th>
          <th class="px-4 py-3 text-left border">메모</th>
          <th class="px-4 py-3 text-center border">등록일</th>
          <th class="px-4 py-3 text-center border w-32">관리</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(item => `
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 border font-semibold">${item.billing_company}</td>
            <td class="px-4 py-3 border">
              <i class="fas fa-user mr-1 text-blue-600"></i>${item.sales_person}
            </td>
            <td class="px-4 py-3 border text-sm">${item.contact_person || '-'}</td>
            <td class="px-4 py-3 border text-sm">${item.shipper_name || '-'}</td>
            <td class="px-4 py-3 border text-sm text-gray-600">${item.memo ? (item.memo.length > 20 ? item.memo.substring(0, 20) + '...' : item.memo) : '-'}</td>
            <td class="px-4 py-3 border text-center text-sm text-gray-600">
              ${new Date(item.created_at).toLocaleDateString('ko-KR')}
            </td>
            <td class="px-4 py-3 border text-center">
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

// ============================================
// 초기화
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  fetchLocationCodes()
  fetchShippingLines()
  fetchDispatchCompanies()
  render()
})
