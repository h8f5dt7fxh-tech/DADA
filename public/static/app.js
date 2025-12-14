// ============================================
// 전역 상태 관리
// ============================================
const state = {
  currentPage: 'orders',
  currentView: 'day',
  currentDate: dayjs().format('YYYY-MM-DD'),
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
  todos: []
}

// ============================================
// 유틸리티 함수
// ============================================

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

function parseOrderText(text, orderType) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  const order = { order_type: orderType, remarks: [] }
  
  for (const line of lines) {
    // 컨테이너 수출
    if (line.startsWith('BKG/SIZE') || line.startsWith('BKG / SIZE')) {
      const match = line.match(/:\s*(.+?)(?:\s*\/\s*(.+))?$/)
      if (match) {
        order.booking_number = match[1]?.trim()
        order.container_size = match[2]?.trim()
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
  
  // 상태 자동 판단
  if (orderType === 'container_export') {
    if (!order.dispatch_company) {
      order.status = 'unassigned'
    } else if (!order.container_number || !order.seal_number || !order.vehicle_info) {
      order.status = 'undispatched'
    } else {
      order.status = 'completed'
    }
  } else if (orderType === 'container_import' || orderType === 'lcl') {
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
    const params = new URLSearchParams({
      view: state.currentView,
      date: state.currentDate,
      type: state.currentOrderType
    })
    
    if (state.searchQuery) {
      params.append('search', state.searchQuery)
    }
    
    const response = await axios.get(`/api/orders?${params}`)
    state.orders = response.data
    renderOrderList()
  } catch (error) {
    console.error('오더 조회 실패:', error)
    alert('오더 조회에 실패했습니다.')
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

async function createTodo(content) {
  try {
    await axios.post('/api/todos', { content })
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
          <div class="flex items-center space-x-8">
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
        </div>
      </div>
    </nav>
  `
}

function renderOrderFilters() {
  return `
    <div class="bg-white p-4 rounded-lg shadow mb-4">
      <div class="flex items-center justify-between mb-4">
        <div class="flex space-x-2">
          <button onclick="changeView('day')" class="px-4 py-2 rounded ${state.currentView === 'day' ? 'bg-blue-500 text-white' : 'bg-gray-200'}">
            일별
          </button>
          <button onclick="changeView('week')" class="px-4 py-2 rounded ${state.currentView === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200'}">
            주별
          </button>
          <button onclick="changeView('month')" class="px-4 py-2 rounded ${state.currentView === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200'}">
            월별
          </button>
        </div>
        
        <div class="flex space-x-2">
          <input type="date" id="dateFilter" value="${state.currentDate}" 
                 onchange="changeDate(this.value)" 
                 class="px-3 py-2 border rounded">
          <button onclick="changeDate(dayjs().format('YYYY-MM-DD'))" class="px-4 py-2 bg-gray-200 rounded">
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

function renderOrderList() {
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
  
  const listContainer = document.getElementById('orderListContainer')
  if (listContainer) {
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
}

function renderCreateOrderPage() {
  return `
    <div class="bg-white p-6 rounded-lg shadow">
      <h2 class="text-2xl font-bold mb-6">오더 입력</h2>
      
      <div class="mb-6">
        <label class="block mb-2 font-semibold">오더 타입</label>
        <select id="newOrderType" class="w-full px-3 py-2 border rounded">
          <option value="container_export">컨테이너 수출</option>
          <option value="container_import">컨테이너 수입</option>
          <option value="bulk">벌크화물</option>
          <option value="lcl">LCL</option>
        </select>
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
        <button onclick="showManualInput()" class="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
          <i class="fas fa-edit mr-2"></i>직접 입력
        </button>
      </div>
      
      <div id="orderPreview" class="mt-6"></div>
    </div>
  `
}

function renderTodoList() {
  const todosHtml = state.todos.map(todo => `
    <li class="flex items-center justify-between p-3 border-b hover:bg-gray-50">
      <div class="flex items-center flex-1">
        <input type="checkbox" ${todo.completed ? 'checked' : ''} 
               onchange="toggleTodo(${todo.id}, this.checked)"
               class="mr-3">
        <span class="${todo.completed ? 'line-through text-gray-400' : ''}">${todo.content}</span>
      </div>
      <button onclick="deleteTodo(${todo.id})" class="text-red-600 hover:text-red-800">
        <i class="fas fa-trash"></i>
      </button>
    </li>
  `).join('')
  
  const todoContainer = document.getElementById('todoContainer')
  if (todoContainer) {
    todoContainer.innerHTML = `
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="text-lg font-bold mb-4">할일 목록</h3>
        <div class="mb-4">
          <input type="text" id="newTodoInput" 
                 placeholder="할일 입력..." 
                 class="w-full px-3 py-2 border rounded"
                 onkeypress="if(event.key==='Enter') addTodo()">
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
                <th class="px-3 py-2 text-center">삭제</th>
              </tr>
            </thead>
            <tbody>
              ${state.shippingLines.map(ship => `
                <tr class="border-b hover:bg-gray-50">
                  <td class="px-3 py-2">${ship.name}</td>
                  <td class="px-3 py-2">${ship.code}</td>
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
        <div class="mb-4">
          <button onclick="showAddDispatchCompanyModal()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <i class="fas fa-plus mr-1"></i>추가
          </button>
        </div>
        <div class="overflow-auto max-h-96">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                <th class="px-3 py-2 text-left">업체명</th>
                <th class="px-3 py-2 text-left">하불 금액 수준</th>
                <th class="px-3 py-2 text-left">비고</th>
                <th class="px-3 py-2 text-center">수정</th>
                <th class="px-3 py-2 text-center">삭제</th>
              </tr>
            </thead>
            <tbody>
              ${state.dispatchCompanies.map(company => `
                <tr class="border-b hover:bg-gray-50">
                  <td class="px-3 py-2">${company.name}</td>
                  <td class="px-3 py-2">${company.payment_level || '-'}</td>
                  <td class="px-3 py-2">${company.notes || '-'}</td>
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
      <p class="text-gray-600 mb-4">청구업체 - 화주 - 작업지 계층 구조로 관리됩니다.</p>
      
      <div class="mb-4">
        <button onclick="showAddBillingCompanyModal()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <i class="fas fa-plus mr-1"></i>청구업체 추가
        </button>
      </div>
      
      <div class="text-gray-500 text-center py-8">
        <p>거래처 관리 UI는 곧 완성됩니다.</p>
        <p class="text-sm mt-2">API는 이미 구현되어 있어 백엔드에서 사용 가능합니다.</p>
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
  alert('상하차지 코드 추가 모달은 곧 구현됩니다.')
}

function showAddShippingLineModal() {
  alert('선사 코드 추가 모달은 곧 구현됩니다.')
}

function showAddDispatchCompanyModal() {
  alert('협력업체 추가 모달은 곧 구현됩니다.')
}

function editDispatchCompany(id) {
  alert('협력업체 수정 모달은 곧 구현됩니다.')
}

function showAddBillingCompanyModal() {
  alert('청구업체 추가 모달은 곧 구현됩니다.')
}

// ============================================
// 이벤트 핸들러
// ============================================

function changePage(page) {
  state.currentPage = page
  render()
  
  if (page === 'orders') {
    fetchOrders()
  } else if (page === 'todos') {
    fetchTodos()
  }
}

function changeView(view) {
  state.currentView = view
  fetchOrders()
}

function changeDate(date) {
  state.currentDate = date
  fetchOrders()
}

function changeOrderType(type) {
  state.currentOrderType = type
  fetchOrders()
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
          <h4 class="font-bold mb-2">청구</h4>
          <ul>
            ${(order.billings || []).map(b => `
              <li>${b.amount.toLocaleString()}원 ${b.description ? '- ' + b.description : ''}</li>
            `).join('') || '<li class="text-gray-500">없음</li>'}
          </ul>
        </div>
        <div>
          <h4 class="font-bold mb-2">하불</h4>
          <ul>
            ${(order.payments || []).map(p => `
              <li>${p.amount.toLocaleString()}원 ${p.description ? '- ' + p.description : ''}</li>
            `).join('') || '<li class="text-gray-500">없음</li>'}
          </ul>
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

function addTodo() {
  const input = document.getElementById('newTodoInput')
  const content = input.value.trim()
  
  if (content) {
    createTodo(content)
    input.value = ''
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
    // 코드 데이터는 이미 로드됨
    render()
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
