import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 설정
app.use('/api/*', cors())

// 정적 파일 제공
app.use('/static/*', serveStatic({ root: './public' }))

// ============================================
// API Routes - 운송 오더 관리
// ============================================

// 오더 목록 조회 (필터링, 검색 지원)
app.get('/api/orders', async (c) => {
  const { env } = c
  const { view = 'day', date, search, type } = c.req.query()
  
  let query = 'SELECT * FROM transport_orders WHERE 1=1'
  const params: any[] = []
  
  // 타입 필터
  if (type && type !== 'all') {
    query += ' AND order_type = ?'
    params.push(type)
  }
  
  // 날짜 필터 (view: day, week, month)
  if (date) {
    if (view === 'day') {
      query += ' AND DATE(work_datetime) = ?'
      params.push(date)
    } else if (view === 'week') {
      query += ' AND DATE(work_datetime) >= ? AND DATE(work_datetime) < DATE(?, "+7 days")'
      params.push(date, date)
    } else if (view === 'month') {
      query += ' AND strftime("%Y-%m", work_datetime) = ?'
      params.push(date)
    }
  }
  
  // 검색 (2~3글자 검색)
  if (search && search.length >= 2) {
    query += ` AND (
      shipper LIKE ? OR 
      billing_company LIKE ? OR 
      booking_number LIKE ? OR 
      bl_number LIKE ? OR 
      container_number LIKE ? OR
      work_site LIKE ?
    )`
    const searchPattern = `%${search}%`
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
  }
  
  query += ' ORDER BY work_datetime ASC'
  
  const stmt = env.DB.prepare(query).bind(...params)
  const { results } = await stmt.all()
  
  // 각 오더에 대한 비고, 청구, 하불 정보 가져오기
  const ordersWithDetails = await Promise.all(
    results.map(async (order: any) => {
      const remarks = await env.DB.prepare('SELECT * FROM order_remarks WHERE order_id = ? ORDER BY created_at ASC')
        .bind(order.id).all()
      const billings = await env.DB.prepare('SELECT * FROM billings WHERE order_id = ?')
        .bind(order.id).all()
      const payments = await env.DB.prepare('SELECT * FROM payments WHERE order_id = ?')
        .bind(order.id).all()
      
      return {
        ...order,
        remarks: remarks.results,
        billings: billings.results,
        payments: payments.results
      }
    })
  )
  
  return c.json(ordersWithDetails)
})

// 오더 상세 조회
app.get('/api/orders/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  
  const order = await env.DB.prepare('SELECT * FROM transport_orders WHERE id = ?')
    .bind(id).first()
  
  if (!order) {
    return c.json({ error: '오더를 찾을 수 없습니다' }, 404)
  }
  
  const remarks = await env.DB.prepare('SELECT * FROM order_remarks WHERE order_id = ? ORDER BY created_at ASC')
    .bind(id).all()
  const billings = await env.DB.prepare('SELECT * FROM billings WHERE order_id = ?')
    .bind(id).all()
  const payments = await env.DB.prepare('SELECT * FROM payments WHERE order_id = ?')
    .bind(id).all()
  
  return c.json({
    ...order,
    remarks: remarks.results,
    billings: billings.results,
    payments: payments.results
  })
})

// 오더 생성
app.post('/api/orders', async (c) => {
  const { env } = c
  const body = await c.req.json()
  
  const {
    order_type, billing_company, shipper, work_site, work_site_code,
    contact_person, contact_phone, work_datetime,
    booking_number, container_size, shipping_line, vessel_name,
    export_country, berth_date, departure_date, weight,
    container_number, tw, seal_number,
    bl_number, do_status, customs_clearance, order_no,
    loading_location, loading_location_code,
    unloading_location, unloading_location_code,
    dispatch_company, vehicle_info, status, weighing_required,
    remarks, billings, payments
  } = body
  
  // 오더 삽입
  const result = await env.DB.prepare(`
    INSERT INTO transport_orders (
      order_type, billing_company, shipper, work_site, work_site_code,
      contact_person, contact_phone, work_datetime,
      booking_number, container_size, shipping_line, vessel_name,
      export_country, berth_date, departure_date, weight,
      container_number, tw, seal_number,
      bl_number, do_status, customs_clearance, order_no,
      loading_location, loading_location_code,
      unloading_location, unloading_location_code,
      dispatch_company, vehicle_info, status, weighing_required
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    order_type, billing_company, shipper, work_site, work_site_code,
    contact_person, contact_phone, work_datetime,
    booking_number, container_size, shipping_line, vessel_name,
    export_country, berth_date, departure_date, weight,
    container_number, tw, seal_number,
    bl_number, do_status, customs_clearance, order_no,
    loading_location, loading_location_code,
    unloading_location, unloading_location_code,
    dispatch_company, vehicle_info, status || 'pending', weighing_required || 0
  ).run()
  
  const orderId = result.meta.last_row_id
  
  // 비고 삽입
  if (remarks && Array.isArray(remarks)) {
    for (const remark of remarks) {
      await env.DB.prepare('INSERT INTO order_remarks (order_id, content, importance) VALUES (?, ?, ?)')
        .bind(orderId, remark.content, remark.importance || 0).run()
    }
  }
  
  // 청구 삽입
  if (billings && Array.isArray(billings)) {
    for (const billing of billings) {
      await env.DB.prepare('INSERT INTO billings (order_id, amount, description) VALUES (?, ?, ?)')
        .bind(orderId, billing.amount, billing.description || '').run()
    }
  }
  
  // 하불 삽입
  if (payments && Array.isArray(payments)) {
    for (const payment of payments) {
      await env.DB.prepare('INSERT INTO payments (order_id, amount, description) VALUES (?, ?, ?)')
        .bind(orderId, payment.amount, payment.description || '').run()
    }
  }
  
  return c.json({ id: orderId, message: '오더가 생성되었습니다' })
})

// 오더 수정
app.put('/api/orders/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  const body = await c.req.json()
  
  const {
    order_type, billing_company, shipper, work_site, work_site_code,
    contact_person, contact_phone, work_datetime,
    booking_number, container_size, shipping_line, vessel_name,
    export_country, berth_date, departure_date, weight,
    container_number, tw, seal_number,
    bl_number, do_status, customs_clearance, order_no,
    loading_location, loading_location_code,
    unloading_location, unloading_location_code,
    dispatch_company, vehicle_info, status, weighing_required
  } = body
  
  await env.DB.prepare(`
    UPDATE transport_orders SET
      order_type = ?, billing_company = ?, shipper = ?, work_site = ?, work_site_code = ?,
      contact_person = ?, contact_phone = ?, work_datetime = ?,
      booking_number = ?, container_size = ?, shipping_line = ?, vessel_name = ?,
      export_country = ?, berth_date = ?, departure_date = ?, weight = ?,
      container_number = ?, tw = ?, seal_number = ?,
      bl_number = ?, do_status = ?, customs_clearance = ?, order_no = ?,
      loading_location = ?, loading_location_code = ?,
      unloading_location = ?, unloading_location_code = ?,
      dispatch_company = ?, vehicle_info = ?, status = ?, weighing_required = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    order_type, billing_company, shipper, work_site, work_site_code,
    contact_person, contact_phone, work_datetime,
    booking_number, container_size, shipping_line, vessel_name,
    export_country, berth_date, departure_date, weight,
    container_number, tw, seal_number,
    bl_number, do_status, customs_clearance, order_no,
    loading_location, loading_location_code,
    unloading_location, unloading_location_code,
    dispatch_company, vehicle_info, status, weighing_required,
    id
  ).run()
  
  return c.json({ message: '오더가 수정되었습니다' })
})

// 오더 삭제
app.delete('/api/orders/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  
  await env.DB.prepare('DELETE FROM transport_orders WHERE id = ?').bind(id).run()
  
  return c.json({ message: '오더가 삭제되었습니다' })
})

// ============================================
// API Routes - 비고 관리
// ============================================

app.post('/api/orders/:id/remarks', async (c) => {
  const { env } = c
  const orderId = c.req.param('id')
  const { content, importance } = await c.req.json()
  
  const result = await env.DB.prepare('INSERT INTO order_remarks (order_id, content, importance) VALUES (?, ?, ?)')
    .bind(orderId, content, importance || 0).run()
  
  return c.json({ id: result.meta.last_row_id })
})

app.delete('/api/remarks/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  
  await env.DB.prepare('DELETE FROM order_remarks WHERE id = ?').bind(id).run()
  
  return c.json({ message: '비고가 삭제되었습니다' })
})

// ============================================
// API Routes - 청구/하불 관리
// ============================================

app.post('/api/orders/:id/billings', async (c) => {
  const { env } = c
  const orderId = c.req.param('id')
  const { amount, description } = await c.req.json()
  
  const result = await env.DB.prepare('INSERT INTO billings (order_id, amount, description) VALUES (?, ?, ?)')
    .bind(orderId, amount, description || '').run()
  
  return c.json({ id: result.meta.last_row_id })
})

app.delete('/api/billings/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  
  await env.DB.prepare('DELETE FROM billings WHERE id = ?').bind(id).run()
  
  return c.json({ message: '청구가 삭제되었습니다' })
})

app.post('/api/orders/:id/payments', async (c) => {
  const { env } = c
  const orderId = c.req.param('id')
  const { amount, description } = await c.req.json()
  
  const result = await env.DB.prepare('INSERT INTO payments (order_id, amount, description) VALUES (?, ?, ?)')
    .bind(orderId, amount, description || '').run()
  
  return c.json({ id: result.meta.last_row_id })
})

app.delete('/api/payments/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  
  await env.DB.prepare('DELETE FROM payments WHERE id = ?').bind(id).run()
  
  return c.json({ message: '하불이 삭제되었습니다' })
})

// ============================================
// API Routes - 거래처 관리
// ============================================

// 청구업체 관리
app.get('/api/billing-companies', async (c) => {
  const { env } = c
  const { results } = await env.DB.prepare('SELECT * FROM billing_companies ORDER BY name').all()
  return c.json(results)
})

app.post('/api/billing-companies', async (c) => {
  const { env } = c
  const { name } = await c.req.json()
  
  const result = await env.DB.prepare('INSERT INTO billing_companies (name) VALUES (?)')
    .bind(name).run()
  
  return c.json({ id: result.meta.last_row_id })
})

app.delete('/api/billing-companies/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  
  await env.DB.prepare('DELETE FROM billing_companies WHERE id = ?').bind(id).run()
  
  return c.json({ message: '청구업체가 삭제되었습니다' })
})

// 화주 관리
app.get('/api/shippers', async (c) => {
  const { env } = c
  const { billing_company_id } = c.req.query()
  
  let query = 'SELECT * FROM shippers'
  const params: any[] = []
  
  if (billing_company_id) {
    query += ' WHERE billing_company_id = ?'
    params.push(billing_company_id)
  }
  
  query += ' ORDER BY name'
  
  const { results } = await env.DB.prepare(query).bind(...params).all()
  return c.json(results)
})

app.post('/api/shippers', async (c) => {
  const { env } = c
  const { billing_company_id, name, contact_person } = await c.req.json()
  
  const result = await env.DB.prepare('INSERT INTO shippers (billing_company_id, name, contact_person) VALUES (?, ?, ?)')
    .bind(billing_company_id, name, contact_person || '').run()
  
  return c.json({ id: result.meta.last_row_id })
})

app.delete('/api/shippers/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  
  await env.DB.prepare('DELETE FROM shippers WHERE id = ?').bind(id).run()
  
  return c.json({ message: '화주가 삭제되었습니다' })
})

// 작업지 관리
app.get('/api/work-sites', async (c) => {
  const { env } = c
  const { shipper_id } = c.req.query()
  
  let query = 'SELECT * FROM work_sites'
  const params: any[] = []
  
  if (shipper_id) {
    query += ' WHERE shipper_id = ?'
    params.push(shipper_id)
  }
  
  query += ' ORDER BY name'
  
  const { results } = await env.DB.prepare(query).bind(...params).all()
  return c.json(results)
})

app.post('/api/work-sites', async (c) => {
  const { env } = c
  const { shipper_id, code, name, address, contact_person, phone } = await c.req.json()
  
  const result = await env.DB.prepare(`
    INSERT INTO work_sites (shipper_id, code, name, address, contact_person, phone) 
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(shipper_id, code, name, address || '', contact_person || '', phone || '').run()
  
  return c.json({ id: result.meta.last_row_id })
})

app.delete('/api/work-sites/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  
  await env.DB.prepare('DELETE FROM work_sites WHERE id = ?').bind(id).run()
  
  return c.json({ message: '작업지가 삭제되었습니다' })
})

// 하불업체 (협력업체) 관리
app.get('/api/dispatch-companies', async (c) => {
  const { env } = c
  const { results } = await env.DB.prepare('SELECT * FROM dispatch_companies ORDER BY name').all()
  return c.json(results)
})

app.post('/api/dispatch-companies', async (c) => {
  const { env } = c
  const { name, payment_level, notes } = await c.req.json()
  
  const result = await env.DB.prepare('INSERT INTO dispatch_companies (name, payment_level, notes) VALUES (?, ?, ?)')
    .bind(name, payment_level || '', notes || '').run()
  
  return c.json({ id: result.meta.last_row_id })
})

app.put('/api/dispatch-companies/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  const { name, payment_level, notes } = await c.req.json()
  
  await env.DB.prepare('UPDATE dispatch_companies SET name = ?, payment_level = ?, notes = ? WHERE id = ?')
    .bind(name, payment_level, notes, id).run()
  
  return c.json({ message: '하불업체가 수정되었습니다' })
})

app.delete('/api/dispatch-companies/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  
  await env.DB.prepare('DELETE FROM dispatch_companies WHERE id = ?').bind(id).run()
  
  return c.json({ message: '하불업체가 삭제되었습니다' })
})

// ============================================
// API Routes - 상하차지/선사 코드 관리
// ============================================

// 상하차지 코드 관리
app.get('/api/location-codes', async (c) => {
  const { env } = c
  const { results } = await env.DB.prepare('SELECT * FROM location_codes ORDER BY name').all()
  return c.json(results)
})

app.post('/api/location-codes', async (c) => {
  const { env } = c
  const { name, code, dispatch_company } = await c.req.json()
  
  const result = await env.DB.prepare('INSERT INTO location_codes (name, code, dispatch_company) VALUES (?, ?, ?)')
    .bind(name, code, dispatch_company || '').run()
  
  return c.json({ id: result.meta.last_row_id })
})

app.delete('/api/location-codes/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  
  await env.DB.prepare('DELETE FROM location_codes WHERE id = ?').bind(id).run()
  
  return c.json({ message: '상하차지 코드가 삭제되었습니다' })
})

// 선사 코드 관리
app.get('/api/shipping-lines', async (c) => {
  const { env } = c
  const { results } = await env.DB.prepare('SELECT * FROM shipping_lines ORDER BY name').all()
  return c.json(results)
})

app.post('/api/shipping-lines', async (c) => {
  const { env } = c
  const { name, code } = await c.req.json()
  
  const result = await env.DB.prepare('INSERT INTO shipping_lines (name, code) VALUES (?, ?)')
    .bind(name, code).run()
  
  return c.json({ id: result.meta.last_row_id })
})

app.delete('/api/shipping-lines/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  
  await env.DB.prepare('DELETE FROM shipping_lines WHERE id = ?').bind(id).run()
  
  return c.json({ message: '선사 코드가 삭제되었습니다' })
})

// ============================================
// API Routes - 할일 관리
// ============================================

app.get('/api/todos', async (c) => {
  const { env } = c
  const { results } = await env.DB.prepare('SELECT * FROM todos ORDER BY created_at DESC').all()
  return c.json(results)
})

app.post('/api/todos', async (c) => {
  const { env } = c
  const { content } = await c.req.json()
  
  const result = await env.DB.prepare('INSERT INTO todos (content) VALUES (?)')
    .bind(content).run()
  
  return c.json({ id: result.meta.last_row_id })
})

app.put('/api/todos/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  const { completed } = await c.req.json()
  
  await env.DB.prepare('UPDATE todos SET completed = ? WHERE id = ?')
    .bind(completed ? 1 : 0, id).run()
  
  return c.json({ message: '할일이 수정되었습니다' })
})

app.delete('/api/todos/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  
  await env.DB.prepare('DELETE FROM todos WHERE id = ?').bind(id).run()
  
  return c.json({ message: '할일이 삭제되었습니다' })
})

// ============================================
// API Routes - 엑셀 다운로드 (전산다운)
// ============================================

app.get('/api/export/excel', async (c) => {
  const { env } = c
  const { view = 'day', date, type } = c.req.query()
  
  // 오더 조회
  let query = 'SELECT * FROM transport_orders WHERE 1=1'
  const params: any[] = []
  
  if (type && type !== 'all') {
    query += ' AND order_type = ?'
    params.push(type)
  }
  
  if (date) {
    if (view === 'day') {
      query += ' AND DATE(work_datetime) = ?'
      params.push(date)
    } else if (view === 'week') {
      query += ' AND DATE(work_datetime) >= ? AND DATE(work_datetime) < DATE(?, "+7 days")'
      params.push(date, date)
    } else if (view === 'month') {
      query += ' AND strftime("%Y-%m", work_datetime) = ?'
      params.push(date)
    }
  }
  
  query += ' ORDER BY work_datetime ASC'
  
  const stmt = env.DB.prepare(query).bind(...params)
  const { results } = await stmt.all()
  
  // CSV 형식으로 변환
  const rows: string[][] = []
  
  // 헤더
  rows.push([
    '수입OR수출', '', '작업일', '청구처', '화주', '작업지코드', '작업지',
    '컨테이너사이즈', '상차지', '상차지코드', '하차지', '하차지코드',
    '선사', '선사코드', '선명', '접안일', '컨테이너넘버', '씰넘버',
    '배차업체', '차량정보', '배차업체2', '청구금액', '하불금액', '수익',
    'BKG/BL/NO', '담당자', '영업담당자', '비고'
  ])
  
  for (const order: any of results) {
    // 비고 조회
    const remarks = await env.DB.prepare('SELECT * FROM order_remarks WHERE order_id = ? AND importance >= 2')
      .bind(order.id).all()
    const remarkText = remarks.results.map((r: any) => r.content).join(' / ')
    
    // 청구/하불 조회
    const billings = await env.DB.prepare('SELECT SUM(amount) as total FROM billings WHERE order_id = ?')
      .bind(order.id).first()
    const payments = await env.DB.prepare('SELECT SUM(amount) as total FROM payments WHERE order_id = ?')
      .bind(order.id).first()
    
    const totalBilling = (billings as any)?.total || 0
    const totalPayment = (payments as any)?.total || 0
    const profit = totalBilling - totalPayment
    
    // 타입 표시
    let typeLabel = ''
    if (order.order_type === 'container_export') {
      typeLabel = '수출'
    } else if (order.order_type === 'container_import') {
      typeLabel = '수입'
    } else if (order.order_type === 'lcl') {
      typeLabel = 'LCL'
    } else {
      typeLabel = '벌크'
    }
    
    // BKG/BL/NO
    let bkgBlNo = ''
    if (order.order_type === 'container_export') {
      bkgBlNo = order.booking_number || ''
    } else if (order.order_type === 'container_import') {
      bkgBlNo = order.bl_number || ''
    } else {
      bkgBlNo = order.order_no || ''
    }
    
    rows.push([
      typeLabel,                              // A
      '',                                     // B
      order.work_datetime || '',              // C
      order.billing_company || '',            // D
      order.shipper || '',                    // E
      order.work_site_code || '',             // F
      order.work_site || '',                  // G
      order.container_size || '',             // H
      order.order_type === 'lcl' ? '' : (order.loading_location || ''),  // I
      order.order_type === 'lcl' ? '' : (order.loading_location_code || ''),  // J
      order.order_type === 'lcl' ? '' : (order.unloading_location || ''),  // K
      order.order_type === 'lcl' ? '' : (order.unloading_location_code || ''),  // L
      order.order_type === 'lcl' ? 'XXXX' : (order.shipping_line || ''),  // M
      order.shipping_line_code || '',         // N
      (order.order_type === 'container_import' || order.order_type === 'lcl') ? '-' : (order.vessel_name || ''),  // O
      (order.order_type === 'container_import' || order.order_type === 'lcl') ? '-' : (order.berth_date || ''),  // P
      order.order_type === 'lcl' ? (order.vehicle_info || '') : (order.container_number || ''),  // Q
      (order.order_type === 'container_import' || order.order_type === 'lcl') ? '-' : (order.seal_number || ''),  // R
      order.dispatch_company || '',           // S
      order.vehicle_info || '',               // T
      order.dispatch_company || '',           // U (중복)
      String(totalBilling),                   // V
      String(totalPayment),                   // W
      String(profit),                         // X
      bkgBlNo,                                // Y
      order.contact_person || '',             // Z
      '',                                     // AA
      remarkText                              // AB
    ])
  }
  
  // CSV 생성
  const csv = rows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  
  // UTF-8 BOM 추가 (엑셀에서 한글 깨짐 방지)
  const bom = '\uFEFF'
  
  return c.text(bom + csv, 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="transport_orders_${date || 'all'}.csv"`
  })
})

// ============================================
// API Routes - 엑셀 업로드 (오더 일괄 등록)
// ============================================

app.post('/api/import/excel', async (c) => {
  const { env } = c
  
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return c.json({ error: '파일이 없습니다' }, 400)
    }
    
    // 파일을 ArrayBuffer로 읽기
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    
    // XLSX 파싱 (동적 import 사용)
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
    
    const importedOrders = []
    const errors = []
    
    // 첫 번째 행은 헤더이므로 건너뛰기
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      
      // A열이 비어있으면 건너뛰기
      if (!row[0]) continue
      
      try {
        // 오더 타입 판단
        const typeStr = String(row[0] || '').trim()
        let orderType = 'bulk'
        
        if (typeStr.includes('수출')) {
          orderType = 'container_export'
        } else if (typeStr.includes('수입')) {
          orderType = 'container_import'
        } else if (typeStr.toUpperCase().includes('LCL')) {
          orderType = 'lcl'
        }
        
        // 오더 데이터 구성
        const orderData: any = {
          order_type: orderType,
          work_datetime: row[2] || '',  // C: 작업일
          billing_company: row[3] || '',  // D: 청구처
          shipper: row[4] || '',  // E: 화주
          work_site_code: row[5] || '',  // F: 작업지코드
          work_site: row[6] || '',  // G: 작업지
          container_size: row[7] || '',  // H: 컨테이너사이즈
          loading_location: row[8] || '',  // I: 상차지
          loading_location_code: row[9] || '',  // J: 상차지 코드
          unloading_location: row[10] || '',  // K: 하차지
          unloading_location_code: row[11] || '',  // L: 하차지 코드
          shipping_line: row[12] || '',  // M: 선사
          shipping_line_code: row[13] || '',  // N: 선사코드
          vessel_name: row[14] || '',  // O: 선명
          berth_date: row[15] || '',  // P: 접안일
          container_number: row[16] || '',  // Q: 컨테이너 넘버
          seal_number: row[17] || '',  // R: 씰넘버
          dispatch_company: row[18] || '',  // S: 배차업체
          vehicle_info: row[19] || '',  // T: 차량정보
          contact_person: row[25] || '',  // Z: 담당자
          status: 'pending',
          weighing_required: 0,
          remarks: []
        }
        
        // Y열: BKG/BL/NO
        if (row[24]) {
          const bkgBlNo = String(row[24])
          if (orderType === 'container_export') {
            orderData.booking_number = bkgBlNo
          } else if (orderType === 'container_import') {
            orderData.bl_number = bkgBlNo
          } else {
            orderData.order_no = bkgBlNo
          }
        }
        
        // AB열: 비고
        if (row[27]) {
          const remarkContent = String(row[27]).trim()
          if (remarkContent) {
            orderData.remarks.push({
              content: remarkContent,
              importance: 1
            })
          }
        }
        
        // 청구/하불
        orderData.billings = []
        orderData.payments = []
        
        if (row[21]) {  // V: 청구금액
          orderData.billings.push({
            amount: parseFloat(String(row[21])) || 0,
            description: ''
          })
        }
        
        if (row[22]) {  // W: 하불금액
          orderData.payments.push({
            amount: parseFloat(String(row[22])) || 0,
            description: ''
          })
        }
        
        // 오더 삽입
        const result = await env.DB.prepare(`
          INSERT INTO transport_orders (
            order_type, billing_company, shipper, work_site, work_site_code,
            contact_person, contact_phone, work_datetime,
            booking_number, container_size, shipping_line, vessel_name,
            export_country, berth_date, departure_date, weight,
            container_number, tw, seal_number,
            bl_number, do_status, customs_clearance, order_no,
            loading_location, loading_location_code,
            unloading_location, unloading_location_code,
            dispatch_company, vehicle_info, status, weighing_required
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          orderData.order_type, orderData.billing_company, orderData.shipper, 
          orderData.work_site, orderData.work_site_code,
          orderData.contact_person, '', orderData.work_datetime,
          orderData.booking_number, orderData.container_size, orderData.shipping_line, 
          orderData.vessel_name, '', orderData.berth_date, '', '',
          orderData.container_number, '', orderData.seal_number,
          orderData.bl_number, '', '', orderData.order_no,
          orderData.loading_location, orderData.loading_location_code,
          orderData.unloading_location, orderData.unloading_location_code,
          orderData.dispatch_company, orderData.vehicle_info, 
          orderData.status, orderData.weighing_required
        ).run()
        
        const orderId = result.meta.last_row_id
        
        // 비고 삽입
        for (const remark of orderData.remarks) {
          await env.DB.prepare('INSERT INTO order_remarks (order_id, content, importance) VALUES (?, ?, ?)')
            .bind(orderId, remark.content, remark.importance).run()
        }
        
        // 청구 삽입
        for (const billing of orderData.billings) {
          await env.DB.prepare('INSERT INTO billings (order_id, amount, description) VALUES (?, ?, ?)')
            .bind(orderId, billing.amount, billing.description).run()
        }
        
        // 하불 삽입
        for (const payment of orderData.payments) {
          await env.DB.prepare('INSERT INTO payments (order_id, amount, description) VALUES (?, ?, ?)')
            .bind(orderId, payment.amount, payment.description).run()
        }
        
        importedOrders.push({ row: i + 1, id: orderId })
      } catch (error: any) {
        errors.push({ row: i + 1, error: error.message })
      }
    }
    
    return c.json({
      success: true,
      imported: importedOrders.length,
      errors: errors.length,
      details: { importedOrders, errors }
    })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// ============================================
// 메인 페이지
// ============================================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>운송사 관리 시스템</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Noto Sans KR', sans-serif; }
          .tab-active { border-bottom: 3px solid #3b82f6; color: #3b82f6; font-weight: bold; }
          .status-pending { background-color: #fef3c7; }
          .status-unassigned { background-color: #fed7aa; }
          .status-undispatched { background-color: #fecaca; }
          .status-completed { background-color: #d1fae5; }
        </style>
    </head>
    <body class="bg-gray-50">
        <div id="app" class="min-h-screen"></div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
