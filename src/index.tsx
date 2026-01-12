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
  
  try {
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
  
  if (results.length === 0) {
    return c.json([])
  }
  
  // 성능 최적화: 월별/주별 조회 시에는 상세 정보 생략 (빠른 로딩)
  // 일별 조회나 검색 시에만 상세 정보 포함
  const includeDetails = view === 'day' || (search && search.length >= 2)
  
  if (!includeDetails) {
    // 간단한 집계 정보만 추가 (청구/하불 합계)
    const orderIds = results.map((order: any) => order.id)
    
    // 청구/하불 합계를 한 번에 조회
    const billingsQuery = `
      SELECT order_id, SUM(amount) as total 
      FROM billings 
      WHERE order_id IN (SELECT id FROM transport_orders WHERE strftime('%Y-%m', work_datetime) = ?)
      GROUP BY order_id
    `
    const paymentsQuery = `
      SELECT order_id, SUM(amount) as total 
      FROM payments 
      WHERE order_id IN (SELECT id FROM transport_orders WHERE strftime('%Y-%m', work_datetime) = ?)
      GROUP BY order_id
    `
    
    const [billingsRes, paymentsRes] = await Promise.all([
      env.DB.prepare(billingsQuery).bind(date).all(),
      env.DB.prepare(paymentsQuery).bind(date).all()
    ])
    
    const billingTotals: any = {}
    const paymentTotals: any = {}
    
    billingsRes.results.forEach((b: any) => {
      billingTotals[b.order_id] = b.total || 0
    })
    
    paymentsRes.results.forEach((p: any) => {
      paymentTotals[p.order_id] = p.total || 0
    })
    
    // 비고 정보도 함께 조회
    const remarksQuery = `
      SELECT order_id, content, importance, created_at 
      FROM order_remarks 
      WHERE order_id IN (SELECT id FROM transport_orders WHERE strftime('%Y-%m', work_datetime) = ?)
      ORDER BY importance DESC, created_at DESC
    `
    const remarksRes = await env.DB.prepare(remarksQuery).bind(date).all()
    
    const remarksMap: any = {}
    remarksRes.results.forEach((r: any) => {
      if (!remarksMap[r.order_id]) {
        remarksMap[r.order_id] = []
      }
      remarksMap[r.order_id].push(r)
    })
    
    const ordersWithTotals = results.map((order: any) => ({
      ...order,
      remarks: remarksMap[order.id] || [],
      billings: [{ amount: billingTotals[order.id] || 0 }],
      payments: [{ amount: paymentTotals[order.id] || 0 }]
    }))
    
    return c.json(ordersWithTotals)
  }
  
  // 일별 조회: 상세 정보 포함
  const orderIds = results.map((order: any) => order.id)
  
  // SQLite 변수 제한 (999개) 회피: 배치 처리
  // Cloudflare D1 실제 제한을 고려하여 작은 배치 사용
  const batchSize = 50
  let allRemarks: any[] = []
  let allBillings: any[] = []
  let allPayments: any[] = []
  
  for (let i = 0; i < orderIds.length; i += batchSize) {
    const batch = orderIds.slice(i, i + batchSize)
    const idsPlaceholder = batch.map(() => '?').join(',')
    
    // 순차 실행으로 변경하여 변수 제한 회피
    const remarksRes = await env.DB.prepare(`SELECT * FROM order_remarks WHERE order_id IN (${idsPlaceholder}) ORDER BY created_at ASC`)
      .bind(...batch).all()
    const billingsRes = await env.DB.prepare(`SELECT * FROM billings WHERE order_id IN (${idsPlaceholder})`)
      .bind(...batch).all()
    const paymentsRes = await env.DB.prepare(`SELECT * FROM payments WHERE order_id IN (${idsPlaceholder})`)
      .bind(...batch).all()
    
    allRemarks = allRemarks.concat(remarksRes.results)
    allBillings = allBillings.concat(billingsRes.results)
    allPayments = allPayments.concat(paymentsRes.results)
  }
  
  const remarksRes = { results: allRemarks }
  const billingsRes = { results: allBillings }
  const paymentsRes = { results: allPayments }
  
  const remarksByOrderId: any = {}
  const billingsByOrderId: any = {}
  const paymentsByOrderId: any = {}
  
  remarksRes.results.forEach((r: any) => {
    if (!remarksByOrderId[r.order_id]) remarksByOrderId[r.order_id] = []
    remarksByOrderId[r.order_id].push(r)
  })
  
  billingsRes.results.forEach((b: any) => {
    if (!billingsByOrderId[b.order_id]) billingsByOrderId[b.order_id] = []
    billingsByOrderId[b.order_id].push(b)
  })
  
  paymentsRes.results.forEach((p: any) => {
    if (!paymentsByOrderId[p.order_id]) paymentsByOrderId[p.order_id] = []
    paymentsByOrderId[p.order_id].push(p)
  })
  
  const ordersWithDetails = results.map((order: any) => ({
    ...order,
    remarks: remarksByOrderId[order.id] || [],
    billings: billingsByOrderId[order.id] || [],
    payments: paymentsByOrderId[order.id] || []
  }))
  
  return c.json(ordersWithDetails)
  } catch (error: any) {
    console.error('Orders API Error:', error)
    return c.json({ 
      error: error.message || 'Internal Server Error',
      stack: error.stack,
      details: `View: ${view}, Date: ${date}, Search: ${search}, Type: ${type}`
    }, 500)
  }
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
  
  try {
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
    
    // ✅ 필수 필드 검증 (최소한으로 유지)
    if (!order_type) {
      return c.json({ error: '오더 타입(order_type)은 필수입니다' }, 400)
    }
    if (!billing_company) {
      return c.json({ error: '청구처(billing_company)는 필수입니다' }, 400)
    }
    if (!shipper) {
      return c.json({ error: '화주(shipper)는 필수입니다' }, 400)
    }
    
    // ✅ work_datetime 자동 생성: 없으면 현재 시간으로 설정
    let finalWorkDatetime = work_datetime
    if (!finalWorkDatetime || finalWorkDatetime === 'undefined' || finalWorkDatetime === 'null') {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hour = String(now.getHours()).padStart(2, '0')
      const minute = String(now.getMinutes()).padStart(2, '0')
      finalWorkDatetime = `${year}-${month}-${day} ${hour}:${minute}`
      console.warn(`⚠️ work_datetime이 없어서 자동 생성: ${finalWorkDatetime}`)
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
      order_type, billing_company, shipper, work_site || null, work_site_code || null,
      contact_person || null, contact_phone || null, finalWorkDatetime,
      booking_number || null, container_size || null, shipping_line || null, vessel_name || null,
      export_country || null, berth_date || null, departure_date || null, weight || null,
      container_number || null, tw || null, seal_number || null,
      bl_number || null, do_status || null, customs_clearance || null, order_no || null,
      loading_location || null, loading_location_code || null,
      unloading_location || null, unloading_location_code || null,
      dispatch_company || null, vehicle_info || null, status || 'pending', weighing_required || 0
    ).run()
    
    const orderId = result.meta.last_row_id
    
    // 청구처-화주 자동 학습: 새로운 조합이면 자동으로 billing_shippers에 추가
    if (billing_company && shipper) {
      try {
        // billing_company_sales에서 청구처 ID 조회
        const billingCompanySales = await env.DB.prepare(
          'SELECT id FROM billing_company_sales WHERE billing_company = ?'
        ).bind(billing_company).first()
        
        if (billingCompanySales) {
          // 이미 등록된 화주인지 확인
          const existingShipper = await env.DB.prepare(
            'SELECT id FROM billing_shippers WHERE billing_company_id = ? AND shipper_name = ?'
          ).bind(billingCompanySales.id, shipper).first()
          
          // 없으면 자동으로 추가
          if (!existingShipper) {
            await env.DB.prepare(
              'INSERT INTO billing_shippers (billing_company_id, shipper_name, memo) VALUES (?, ?, ?)'
            ).bind(billingCompanySales.id, shipper, '자동 학습').run()
            console.log(`✅ 자동 학습: ${billing_company} → ${shipper}`)
          }
        }
      } catch (error) {
        console.error('Auto-learning shipper error:', error)
        // 학습 실패해도 오더 생성은 계속 진행
      }
    }
    
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
    
    return c.json({ orderId: orderId, message: '오더가 생성되었습니다' })
  } catch (error: any) {
    console.error('Create Order Error:', error)
    return c.json({ 
      error: error.message || 'Internal Server Error',
      stack: error.stack
    }, 500)
  }
})

// 오더 수정
app.put('/api/orders/:id', async (c) => {
  try {
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
    
    console.log(`🔄 오더 수정 시작: ID ${id}`)
    console.log('수정 데이터:', body)
    
    const result = await env.DB.prepare(`
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
    
    console.log(`✅ 오더 수정 완료: ID ${id}, Changes: ${result.meta.changes}`)
    
    // 청구처-화주 자동 학습: 새로운 조합이면 자동으로 billing_shippers에 추가
    if (billing_company && shipper) {
      try {
        // billing_company_sales에서 청구처 ID 조회
        const billingCompanySales = await env.DB.prepare(
          'SELECT id FROM billing_company_sales WHERE billing_company = ?'
        ).bind(billing_company).first()
        
        if (billingCompanySales) {
          // 이미 등록된 화주인지 확인
          const existingShipper = await env.DB.prepare(
            'SELECT id FROM billing_shippers WHERE billing_company_id = ? AND shipper_name = ?'
          ).bind(billingCompanySales.id, shipper).first()
          
          // 없으면 자동으로 추가
          if (!existingShipper) {
            await env.DB.prepare(
              'INSERT INTO billing_shippers (billing_company_id, shipper_name, memo) VALUES (?, ?, ?)'
            ).bind(billingCompanySales.id, shipper, '자동 학습').run()
            console.log(`✅ 자동 학습: ${billing_company} → ${shipper}`)
          }
        }
      } catch (error) {
        console.error('Auto-learning shipper error:', error)
        // 학습 실패해도 오더 수정은 계속 진행
      }
    }
    
    return c.json({ message: '오더가 수정되었습니다' })
  } catch (error: any) {
    console.error('❌ 오더 수정 실패:', error)
    return c.json({ 
      error: '오더 수정에 실패했습니다', 
      message: error.message,
      stack: error.stack 
    }, 500)
  }
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
  const { content, order_id } = await c.req.json()
  
  const result = await env.DB.prepare('INSERT INTO todos (content, order_id) VALUES (?, ?)')
    .bind(content, order_id || null).run()
  
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
// API Routes - 계정명 템플릿 관리
// ============================================

// 계정명 템플릿 목록 조회
app.get('/api/account-templates', async (c) => {
  const { env } = c
  const { type } = c.req.query()
  
  let query = 'SELECT * FROM account_templates'
  const params: any[] = []
  
  if (type && type !== 'all') {
    query += ' WHERE type = ? OR type = ?'
    params.push(type, 'both')
  }
  
  query += ' ORDER BY usage_count DESC, name ASC'
  
  const { results } = await env.DB.prepare(query).bind(...params).all()
  return c.json(results)
})

// 계정명 템플릿 생성
app.post('/api/account-templates', async (c) => {
  const { env } = c
  const { name, type, description } = await c.req.json()
  
  const result = await env.DB.prepare(`
    INSERT INTO account_templates (name, type, description) 
    VALUES (?, ?, ?)
  `).bind(name, type || 'both', description || '').run()
  
  return c.json({ id: result.meta.last_row_id })
})

// 계정명 템플릿 사용 횟수 증가
app.put('/api/account-templates/:id/use', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  
  await env.DB.prepare(`
    UPDATE account_templates 
    SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(id).run()
  
  return c.json({ message: '사용 횟수가 증가되었습니다' })
})

// 계정명 템플릿 수정
app.put('/api/account-templates/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  const { name, type, description } = await c.req.json()
  
  await env.DB.prepare(`
    UPDATE account_templates 
    SET name = ?, type = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(name, type, description, id).run()
  
  return c.json({ message: '템플릿이 수정되었습니다' })
})

// 계정명 템플릿 삭제
app.delete('/api/account-templates/:id', async (c) => {
  const { env } = c
  const id = c.req.param('id')
  
  await env.DB.prepare('DELETE FROM account_templates WHERE id = ?').bind(id).run()
  
  return c.json({ message: '템플릿이 삭제되었습니다' })
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
    
    // 청구/하불 조회 (개별 항목)
    const billingsResult = await env.DB.prepare('SELECT * FROM billings WHERE order_id = ? ORDER BY id')
      .bind(order.id).all()
    const paymentsResult = await env.DB.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id')
      .bind(order.id).all()
    
    const billings = billingsResult.results as any[]
    const payments = paymentsResult.results as any[]
    
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
    
    // BKG/BL/NO 기본값
    let baseBkgBlNo = ''
    if (order.order_type === 'container_export') {
      baseBkgBlNo = order.booking_number || ''
    } else if (order.order_type === 'container_import') {
      baseBkgBlNo = order.bl_number || ''
    } else {
      baseBkgBlNo = order.order_no || ''
    }
    
    // 청구/하불 중 더 많은 쪽의 개수만큼 행 생성
    const maxRows = Math.max(billings.length, payments.length, 1)
    
    for (let i = 0; i < maxRows; i++) {
      const billing = billings[i]
      const payment = payments[i]
      
      // 청구/하불 금액
      const billingAmount = billing ? String(billing.amount) : ''
      const paymentAmount = payment ? String(payment.amount) : ''
      const profit = (billing?.amount || 0) - (payment?.amount || 0)
      
      // BKG/BL/NO에 계정명 추가 (2건 이상일 때만)
      let bkgBlNo = baseBkgBlNo
      if (maxRows > 1) {
        const accountName = billing?.description || payment?.description || `계정${i + 1}`
        bkgBlNo = accountName ? `${accountName}_${baseBkgBlNo}` : baseBkgBlNo
      }
      
      // 컨테이너 넘버에도 계정명 추가 (2건 이상일 때)
      let containerNumber = order.container_number || ''
      if (maxRows > 1 && containerNumber) {
        const accountName = billing?.description || payment?.description || `계정${i + 1}`
        containerNumber = accountName ? `${accountName}_${containerNumber}` : containerNumber
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
        order.order_type === 'lcl' ? (order.vehicle_info || '') : containerNumber,  // Q (컨테이너 넘버에 계정명)
        (order.order_type === 'container_import' || order.order_type === 'lcl') ? '-' : (order.seal_number || ''),  // R
        order.dispatch_company || '',           // S
        order.vehicle_info || '',               // T
        order.dispatch_company || '',           // U (중복)
        billingAmount,                          // V (개별 청구금액)
        paymentAmount,                          // W (개별 하불금액)
        profit ? String(profit) : '',           // X (개별 수익)
        bkgBlNo,                                // Y (BKG/BL/NO에 계정명)
        order.contact_person || '',             // Z
        '',                                     // AA
        remarkText                              // AB
      ])
    }
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
    
    // 다중건 그룹핑을 위한 맵 (BKG/BL 기준)
    const orderGroups = new Map<string, any[]>()
    
    // 첫 번째 행은 헤더이므로 건너뛰기
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      
      // A열이 비어있으면 건너뛰기
      if (!row[0]) continue
      
      try {
        // 오더 타입 판단
        const typeStr = String(row[0] || '').trim()
        const containerSize = String(row[7] || '').trim().toUpperCase() // H열: 컨테이너 사이즈
        let orderType = 'bulk'
        
        // 컨테이너 사이즈 기반 타입 판별
        // HC, HQ, GP, FR → 컨테이너 수출/수입
        // BK → LCL
        const isContainerType = /HC|HQ|GP|FR/i.test(containerSize)
        const isLCLType = /BK/i.test(containerSize)
        
        if (isLCLType) {
          orderType = 'lcl'
        } else if (isContainerType) {
          // 수출/수입 구분
          if (typeStr.includes('수출')) {
            orderType = 'container_export'
          } else if (typeStr.includes('수입')) {
            orderType = 'container_import'
          } else {
            // 타입 문자열이 명확하지 않으면 기본값으로 수출
            orderType = 'container_export'
          }
        } else {
          // 기존 로직: 타입 문자열 기반
          if (typeStr.includes('수출')) {
            orderType = 'container_export'
          } else if (typeStr.includes('수입')) {
            orderType = 'container_import'
          } else if (typeStr.toUpperCase().includes('LCL')) {
            orderType = 'lcl'
          }
        }
        
        // Y열: BKG/BL/NO 추출 (계정명 제거)
        let rawBkgBlNo = String(row[24] || '').trim()
        let accountName = ''
        
        // 계정명_BKG 형식인 경우 분리
        if (rawBkgBlNo.includes('_')) {
          const parts = rawBkgBlNo.split('_')
          if (parts.length >= 2) {
            accountName = parts[0]
            rawBkgBlNo = parts.slice(1).join('_')
          }
        }
        
        // 컨테이너 넘버에서도 계정명 추출 (Q열)
        let containerNumber = String(row[16] || '').trim()
        if (containerNumber.includes('_') && !accountName) {
          const parts = containerNumber.split('_')
          if (parts.length >= 2) {
            accountName = parts[0]
            containerNumber = parts.slice(1).join('_')
          }
        }
        
        // 그룹 키 생성 (작업일 + BKG/BL + 화주)
        const workDate = String(row[2] || '').trim()
        const shipper = String(row[4] || '').trim()
        const groupKey = `${workDate}|${rawBkgBlNo}|${shipper}`
        
        // 오더 데이터 구성
        const orderData: any = {
          order_type: orderType,
          work_datetime: workDate,
          billing_company: row[3] || '',  // D: 청구처
          shipper: shipper,
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
          container_number: containerNumber,
          seal_number: row[17] || '',  // R: 씰넘버
          dispatch_company: row[20] || row[18] || '',  // U(20) 또는 S(18): 배차업체
          vehicle_info: row[19] || '',  // T: 차량정보
          contact_person: row[25] || '',  // Z: 담당자
          status: 'pending',
          weighing_required: 0,
          remarks: [],
          billing_amount: parseFloat(String(row[21] || '0')),  // V: 청구금액
          payment_amount: parseFloat(String(row[22] || '0')),  // W: 하불금액
          account_name: accountName  // 계정명
        }
        
        // BKG/BL/NO 설정
        if (rawBkgBlNo) {
          if (orderType === 'container_export') {
            orderData.booking_number = rawBkgBlNo
          } else if (orderType === 'container_import') {
            orderData.bl_number = rawBkgBlNo
          } else {
            orderData.order_no = rawBkgBlNo
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
        
        // 그룹에 추가 (같은 BKG/BL이면 그룹핑)
        if (!orderGroups.has(groupKey)) {
          orderGroups.set(groupKey, [])
        }
        orderGroups.get(groupKey)!.push(orderData)
        
      } catch (error: any) {
        errors.push({ row: i + 1, error: error.message })
      }
    }
    
    // 그룹별로 오더 생성 (다중건 자동 처리)
    for (const [groupKey, orders] of orderGroups.entries()) {
      try {
        // 첫 번째 오더 데이터를 기본으로 사용
        const baseOrder = orders[0]
        
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
          baseOrder.order_type, baseOrder.billing_company, baseOrder.shipper, 
          baseOrder.work_site, baseOrder.work_site_code,
          baseOrder.contact_person, '', baseOrder.work_datetime,
          baseOrder.booking_number, baseOrder.container_size, baseOrder.shipping_line, 
          baseOrder.vessel_name, '', baseOrder.berth_date, '', '',
          baseOrder.container_number, '', baseOrder.seal_number,
          baseOrder.bl_number, '', '', baseOrder.order_no,
          baseOrder.loading_location, baseOrder.loading_location_code,
          baseOrder.unloading_location, baseOrder.unloading_location_code,
          baseOrder.dispatch_company, baseOrder.vehicle_info, 
          baseOrder.status, baseOrder.weighing_required
        ).run()
        
        const orderId = result.meta.last_row_id
        
        // 비고 삽입 (중복 제거)
        const uniqueRemarks = new Set<string>()
        for (const order of orders) {
          for (const remark of order.remarks) {
            if (!uniqueRemarks.has(remark.content)) {
              uniqueRemarks.add(remark.content)
              await env.DB.prepare('INSERT INTO order_remarks (order_id, content, importance) VALUES (?, ?, ?)')
                .bind(orderId, remark.content, remark.importance).run()
            }
          }
        }
        
        // 청구/하불 삽입 (각 행마다 별도로 추가)
        for (const order of orders) {
          // 청구 추가
          if (order.billing_amount > 0) {
            await env.DB.prepare('INSERT INTO billings (order_id, amount, description) VALUES (?, ?, ?)')
              .bind(orderId, order.billing_amount, order.account_name || '').run()
          }
          
          // 하불 추가
          if (order.payment_amount > 0) {
            await env.DB.prepare('INSERT INTO payments (order_id, amount, description) VALUES (?, ?, ?)')
              .bind(orderId, order.payment_amount, order.account_name || '').run()
          }
        }
        
        importedOrders.push({ groupKey, orderId, count: orders.length })
      } catch (error: any) {
        errors.push({ groupKey, error: error.message })
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
// 데이터베이스 관리 API
// ============================================

// DB 초기화 (오더 데이터만 삭제)
app.delete('/api/admin/reset-orders', async (c) => {
  const { env } = c
  const authKey = c.req.header('X-Admin-Key')
  
  // 간단한 보안 체크 (실제로는 환경변수로 관리해야 함)
  if (authKey !== 'reset-transport-db-2024') {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  try {
    // 외래 키 제약 비활성화
    await env.DB.prepare('PRAGMA foreign_keys = OFF').run()
    
    // 오더 관련 테이블 데이터 삭제
    await env.DB.prepare('DELETE FROM billings').run()
    await env.DB.prepare('DELETE FROM payments').run()
    await env.DB.prepare('DELETE FROM order_remarks').run()
    await env.DB.prepare('DELETE FROM transport_orders').run()
    
    // 외래 키 제약 다시 활성화
    await env.DB.prepare('PRAGMA foreign_keys = ON').run()
    
    return c.json({ 
      success: true, 
      message: '오더 데이터가 모두 삭제되었습니다.' 
    })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 협력업체 테이블 마이그레이션
app.post('/api/admin/migrate-dispatch-companies', async (c) => {
  const { env } = c
  const authKey = c.req.header('X-Admin-Key')
  
  if (authKey !== 'reset-transport-db-2024') {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  try {
    // 컬럼이 이미 존재하는지 확인 후 추가
    const tableInfo = await env.DB.prepare("PRAGMA table_info(dispatch_companies)").all()
    const columnNames = tableInfo.results.map((col: any) => col.name)
    
    if (!columnNames.includes('manager')) {
      await env.DB.prepare('ALTER TABLE dispatch_companies ADD COLUMN manager TEXT').run()
    }
    if (!columnNames.includes('contact')) {
      await env.DB.prepare('ALTER TABLE dispatch_companies ADD COLUMN contact TEXT').run()
    }
    if (!columnNames.includes('transport_type')) {
      await env.DB.prepare('ALTER TABLE dispatch_companies ADD COLUMN transport_type TEXT').run()
    }
    if (!columnNames.includes('transport_area')) {
      await env.DB.prepare('ALTER TABLE dispatch_companies ADD COLUMN transport_area TEXT').run()
    }
    
    return c.json({ success: true, message: '협력업체 테이블 마이그레이션 완료' })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 청구처-영업담당자 테이블 생성
app.post('/api/admin/create-sales-mapping-table', async (c) => {
  const { env } = c
  const authKey = c.req.header('X-Admin-Key')
  
  if (authKey !== 'reset-transport-db-2024') {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS billing_company_sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        billing_company TEXT NOT NULL UNIQUE,
        sales_person TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_billing_company_sales_company 
      ON billing_company_sales(billing_company)
    `).run()
    
    return c.json({ success: true, message: '청구처-영업담당자 테이블 생성 완료' })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 청구처별 영업담당자 조회
app.get('/api/sales-person/:billingCompany', async (c) => {
  const { env } = c
  const billingCompany = decodeURIComponent(c.req.param('billingCompany'))
  
  try {
    const result = await env.DB.prepare(
      'SELECT sales_person FROM billing_company_sales WHERE billing_company = ?'
    ).bind(billingCompany).first()
    
    if (result) {
      return c.json({ billing_company: billingCompany, sales_person: result.sales_person })
    } else {
      return c.json({ billing_company: billingCompany, sales_person: null })
    }
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 청구처-영업담당자 전체 목록 조회
app.get('/api/billing-sales', async (c) => {
  const { env } = c
  
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM billing_company_sales ORDER BY billing_company ASC'
    ).all()
    
    return c.json(results)
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 청구처-영업담당자 추가/수정
app.post('/api/billing-sales', async (c) => {
  const { env } = c
  
  try {
    const { billing_company, sales_person, contact_person, shipper_name, memo } = await c.req.json()
    
    if (!billing_company || !sales_person) {
      return c.json({ error: '청구처명과 영업담당자는 필수입니다.' }, 400)
    }
    
    await env.DB.prepare(
      'INSERT OR REPLACE INTO billing_company_sales (billing_company, sales_person, contact_person, shipper_name, memo, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
    ).bind(billing_company, sales_person, contact_person || null, shipper_name || null, memo || null).run()
    
    return c.json({ success: true, billing_company, sales_person, contact_person, shipper_name, memo })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 청구처-영업담당자 삭제
app.delete('/api/billing-sales/:billingCompany', async (c) => {
  const { env } = c
  const billingCompany = decodeURIComponent(c.req.param('billingCompany'))
  
  try {
    await env.DB.prepare(
      'DELETE FROM billing_company_sales WHERE billing_company = ?'
    ).bind(billingCompany).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 청구처별 담당자 목록 조회
app.get('/api/billing-sales/:id/contacts', async (c) => {
  const { env } = c
  const id = parseInt(c.req.param('id'))
  
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM billing_contacts WHERE billing_company_id = ? ORDER BY created_at DESC'
    ).bind(id).all()
    
    return c.json(results)
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 청구처별 담당자 추가
app.post('/api/billing-sales/:id/contacts', async (c) => {
  const { env } = c
  const id = parseInt(c.req.param('id'))
  
  try {
    const { contact_name, contact_phone, memo } = await c.req.json()
    
    if (!contact_name) {
      return c.json({ error: '담당자명은 필수입니다.' }, 400)
    }
    
    const result = await env.DB.prepare(
      'INSERT INTO billing_contacts (billing_company_id, contact_name, contact_phone, memo) VALUES (?, ?, ?, ?)'
    ).bind(id, contact_name, contact_phone || null, memo || null).run()
    
    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 담당자 수정
app.put('/api/billing-contacts/:id', async (c) => {
  const { env } = c
  const id = parseInt(c.req.param('id'))
  
  try {
    const { contact_name, contact_phone, memo } = await c.req.json()
    
    if (!contact_name) {
      return c.json({ error: '담당자명은 필수입니다.' }, 400)
    }
    
    await env.DB.prepare(
      'UPDATE billing_contacts SET contact_name = ?, contact_phone = ?, memo = ? WHERE id = ?'
    ).bind(contact_name, contact_phone || null, memo || null, id).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 담당자 삭제
app.delete('/api/billing-contacts/:id', async (c) => {
  const { env } = c
  const id = parseInt(c.req.param('id'))
  
  try {
    await env.DB.prepare('DELETE FROM billing_contacts WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 청구처별 화주 목록 조회
app.get('/api/billing-sales/:id/shippers', async (c) => {
  const { env } = c
  const id = parseInt(c.req.param('id'))
  
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM billing_shippers WHERE billing_company_id = ? ORDER BY created_at DESC'
    ).bind(id).all()
    
    return c.json(results)
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 청구처별 화주 추가
app.post('/api/billing-sales/:id/shippers', async (c) => {
  const { env } = c
  const id = parseInt(c.req.param('id'))
  
  try {
    const { shipper_name, memo } = await c.req.json()
    
    if (!shipper_name) {
      return c.json({ error: '화주명은 필수입니다.' }, 400)
    }
    
    const result = await env.DB.prepare(
      'INSERT INTO billing_shippers (billing_company_id, shipper_name, memo) VALUES (?, ?, ?)'
    ).bind(id, shipper_name, memo || null).run()
    
    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 화주 수정
app.put('/api/billing-shippers/:id', async (c) => {
  const { env } = c
  const id = parseInt(c.req.param('id'))
  
  try {
    const body = await c.req.json()
    const { shipper_name, memo, quotation, photo_url } = body
    
    // shipper_name이 있으면 필수 검증
    if (shipper_name !== undefined && !shipper_name) {
      return c.json({ error: '화주명은 필수입니다.' }, 400)
    }
    
    // 동적으로 업데이트할 필드 구성
    const updates: string[] = []
    const params: any[] = []
    
    if (shipper_name !== undefined) {
      updates.push('shipper_name = ?')
      params.push(shipper_name)
    }
    
    if (memo !== undefined) {
      updates.push('memo = ?')
      params.push(memo || null)
    }
    
    if (quotation !== undefined) {
      updates.push('quotation = ?')
      params.push(quotation || null)
    }
    
    if (photo_url !== undefined) {
      updates.push('photo_url = ?')
      params.push(photo_url || null)
    }
    
    if (updates.length === 0) {
      return c.json({ error: '업데이트할 필드가 없습니다' }, 400)
    }
    
    params.push(id)
    
    await env.DB.prepare(
      `UPDATE billing_shippers SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 화주 삭제
app.delete('/api/billing-shippers/:id', async (c) => {
  const { env } = c
  const id = parseInt(c.req.param('id'))
  
  try {
    await env.DB.prepare('DELETE FROM billing_shippers WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 협력업체 대량 업데이트
app.post('/api/admin/import-dispatch-companies', async (c) => {
  const { env } = c
  const authKey = c.req.header('X-Admin-Key')
  
  if (authKey !== 'reset-transport-db-2024') {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  try {
    const { companies } = await c.req.json()
    let updated = 0
    let inserted = 0
    
    for (const company of companies) {
      // 기존 협력업체 확인
      const existing = await env.DB.prepare(
        'SELECT id FROM dispatch_companies WHERE name = ?'
      ).bind(company.name).first()
      
      if (existing) {
        // 업데이트
        await env.DB.prepare(`
          UPDATE dispatch_companies 
          SET manager = ?, contact = ?, transport_type = ?, transport_area = ?
          WHERE name = ?
        `).bind(
          company.manager, 
          company.contact, 
          company.transport_type, 
          company.transport_area,
          company.name
        ).run()
        updated++
      } else {
        // 신규 삽입
        await env.DB.prepare(`
          INSERT INTO dispatch_companies (name, manager, contact, transport_type, transport_area)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          company.name,
          company.manager,
          company.contact,
          company.transport_type,
          company.transport_area
        ).run()
        inserted++
      }
    }
    
    return c.json({ 
      success: true, 
      updated, 
      inserted, 
      total: companies.length 
    })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 청구처-영업담당자 대량 임포트
app.post('/api/admin/import-sales-mapping', async (c) => {
  const { env } = c
  const authKey = c.req.header('X-Admin-Key')
  
  if (authKey !== 'reset-transport-db-2024') {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  try {
    const { mappings } = await c.req.json()
    let updated = 0
    let inserted = 0
    
    for (const [billingCompany, salesPerson] of Object.entries(mappings)) {
      const existing = await env.DB.prepare(
        'SELECT id FROM billing_company_sales WHERE billing_company = ?'
      ).bind(billingCompany).first()
      
      if (existing) {
        await env.DB.prepare(`
          UPDATE billing_company_sales 
          SET sales_person = ?, updated_at = CURRENT_TIMESTAMP
          WHERE billing_company = ?
        `).bind(salesPerson, billingCompany).run()
        updated++
      } else {
        await env.DB.prepare(`
          INSERT INTO billing_company_sales (billing_company, sales_person)
          VALUES (?, ?)
        `).bind(billingCompany, salesPerson).run()
        inserted++
      }
    }
    
    return c.json({ 
      success: true, 
      updated, 
      inserted, 
      total: Object.keys(mappings).length 
    })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// ============================================
// API Routes - 견적 관리
// ============================================

// 견적 목록 조회 (검색 기능 포함)
app.get('/api/quotations', async (c) => {
  const { env } = c
  const { billing_company, shipper_name, work_site, route_type, search } = c.req.query()
  
  try {
    let query = 'SELECT * FROM quotations WHERE 1=1'
    const params: any[] = []
    
    // 개별 필터
    if (billing_company) {
      query += ' AND billing_company LIKE ?'
      params.push(`%${billing_company}%`)
    }
    if (shipper_name) {
      query += ' AND shipper_name LIKE ?'
      params.push(`%${shipper_name}%`)
    }
    if (work_site) {
      query += ' AND work_site LIKE ?'
      params.push(`%${work_site}%`)
    }
    if (route_type) {
      query += ' AND route_type = ?'
      params.push(route_type)
    }
    
    // 통합 검색 (모든 필드)
    if (search) {
      query += ' AND (billing_company LIKE ? OR shipper_name LIKE ? OR work_site LIKE ? OR route_type LIKE ?)'
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern, searchPattern)
    }
    
    query += ' ORDER BY updated_at DESC'
    
    const { results } = await env.DB.prepare(query).bind(...params).all()
    return c.json(results)
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 견적 추가
app.post('/api/quotations', async (c) => {
  const { env } = c
  
  try {
    const { billing_company, shipper_name, work_site, route_type, container_size, price, memo } = await c.req.json()
    
    const result = await env.DB.prepare(`
      INSERT INTO quotations (billing_company, shipper_name, work_site, route_type, container_size, price, memo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(billing_company, shipper_name, work_site, route_type, container_size || null, price, memo || null).run()
    
    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 견적 일괄 등록 (여러 개 한 번에)
app.post('/api/quotations/bulk', async (c) => {
  const { env } = c
  
  try {
    const { quotations } = await c.req.json()
    
    if (!Array.isArray(quotations) || quotations.length === 0) {
      return c.json({ error: '견적 데이터 배열이 필요합니다' }, 400)
    }
    
    let success = 0
    let failed = 0
    const errors: string[] = []
    
    for (const quote of quotations) {
      try {
        const { billing_company, shipper_name, work_site, route_type, container_size, price, memo } = quote
        
        // 필수 필드 검증
        if (!billing_company || !shipper_name || !work_site || !route_type || !price) {
          failed++
          errors.push(`누락된 필드: ${JSON.stringify(quote)}`)
          continue
        }
        
        await env.DB.prepare(`
          INSERT INTO quotations (billing_company, shipper_name, work_site, route_type, container_size, price, memo)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(billing_company, shipper_name, work_site, route_type, container_size || null, price, memo || null).run()
        
        success++
      } catch (error: any) {
        failed++
        errors.push(`${quote.billing_company}-${quote.shipper_name}: ${error.message}`)
      }
    }
    
    return c.json({ 
      success: true,
      total: quotations.length,
      inserted: success,
      failed,
      errors: errors.length > 0 ? errors.slice(0, 10) : []  // 최대 10개 에러만 반환
    })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 텍스트 자동 파싱 후 일괄 등록
app.post('/api/quotations/parse-text', async (c) => {
  const { env } = c
  
  try {
    const { text } = await c.req.json()
    
    if (!text || typeof text !== 'string') {
      return c.json({ error: '텍스트가 필요합니다' }, 400)
    }
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l)
    const quotations: any[] = []
    
    // 텍스트 파싱: 탭이나 여러 공백으로 구분
    // 형식: 청구처\t화주\t작업지\t노선\t컨테이너사이즈\t가격\t메모
    // 또는: 청구처  화주  작업지  노선  가격
    for (const line of lines) {
      // 탭 또는 2개 이상의 공백으로 분리
      const parts = line.split(/\t|  +/).map(p => p.trim()).filter(p => p)
      
      if (parts.length >= 5) {  // 최소 청구처, 화주, 작업지, 노선, 가격
        const quote: any = {
          billing_company: parts[0],
          shipper_name: parts[1],
          work_site: parts[2],
          route_type: parts[3],
          price: null,
          container_size: null,
          memo: null
        }
        
        // 가격 찾기 (숫자만 있는 필드)
        for (let i = 4; i < parts.length; i++) {
          const cleaned = parts[i].replace(/[,원]/g, '')
          if (/^\d+$/.test(cleaned)) {
            quote.price = parseInt(cleaned)
            // 가격 앞 필드가 컨테이너 사이즈일 수 있음
            if (i > 4 && /^(20|40)(GP|HC|HQ|BK|FR|OT)$/i.test(parts[i-1])) {
              quote.container_size = parts[i-1].toUpperCase()
            }
            // 가격 뒤 필드는 메모
            if (i < parts.length - 1) {
              quote.memo = parts.slice(i + 1).join(' ')
            }
            break
          }
        }
        
        if (quote.price) {
          quotations.push(quote)
        }
      }
    }
    
    if (quotations.length === 0) {
      return c.json({ 
        error: '파싱 가능한 데이터가 없습니다', 
        hint: '형식: 청구처  화주  작업지  노선  가격 (탭이나 공백으로 구분)'
      }, 400)
    }
    
    // 일괄 등록
    let success = 0
    let failed = 0
    const errors: string[] = []
    
    for (const quote of quotations) {
      try {
        await env.DB.prepare(`
          INSERT INTO quotations (billing_company, shipper_name, work_site, route_type, container_size, price, memo)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          quote.billing_company, 
          quote.shipper_name, 
          quote.work_site, 
          quote.route_type, 
          quote.container_size, 
          quote.price, 
          quote.memo
        ).run()
        
        success++
      } catch (error: any) {
        failed++
        errors.push(`${quote.billing_company}-${quote.shipper_name}: ${error.message}`)
      }
    }
    
    return c.json({ 
      success: true,
      parsed: quotations.length,
      inserted: success,
      failed,
      errors: errors.length > 0 ? errors.slice(0, 10) : [],
      sample: quotations.slice(0, 3)  // 처음 3개 샘플 보여주기
    })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 견적 수정
app.put('/api/quotations/:id', async (c) => {
  const { env } = c
  const id = parseInt(c.req.param('id'))
  
  try {
    const { billing_company, shipper_name, work_site, route_type, container_size, price, memo } = await c.req.json()
    
    await env.DB.prepare(`
      UPDATE quotations 
      SET billing_company = ?, shipper_name = ?, work_site = ?, route_type = ?, 
          container_size = ?, price = ?, memo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(billing_company, shipper_name, work_site, route_type, container_size || null, price, memo || null, id).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 견적 삭제
app.delete('/api/quotations/:id', async (c) => {
  const { env } = c
  const id = parseInt(c.req.param('id'))
  
  try {
    await env.DB.prepare('DELETE FROM quotations WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 빠른 검색: 청구처 → 화주 → 작업지 → 노선별 견적 조회
app.get('/api/quotations/quick-search', async (c) => {
  const { env } = c
  const { billing_company, shipper_name, work_site } = c.req.query()
  
  try {
    let query = 'SELECT * FROM quotations WHERE 1=1'
    const params: any[] = []
    
    if (billing_company) {
      query += ' AND billing_company = ?'
      params.push(billing_company)
    }
    if (shipper_name) {
      query += ' AND shipper_name = ?'
      params.push(shipper_name)
    }
    if (work_site) {
      query += ' AND work_site = ?'
      params.push(work_site)
    }
    
    query += ' ORDER BY route_type ASC'
    
    const { results } = await env.DB.prepare(query).bind(...params).all()
    return c.json(results)
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// ============================================
// API Routes - 화주별 견적 관리
// ============================================

// 화주별 견적 목록 조회
app.get('/api/shipper-quotations/:shipperId', async (c) => {
  const { env } = c
  const { shipperId } = c.req.param()
  
  try {
    const { results } = await env.DB.prepare(`
      SELECT * FROM shipper_quotations 
      WHERE shipper_id = ? 
      ORDER BY created_at DESC
    `).bind(shipperId).all()
    
    return c.json(results)
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 화주별 견적 추가
app.post('/api/shipper-quotations', async (c) => {
  const { env } = c
  
  try {
    const { shipper_id, billing_company_id, work_site, route_type, container_size, price, memo, photo_url } = await c.req.json()
    
    if (!shipper_id || !billing_company_id || !work_site || !route_type || !price) {
      return c.json({ error: '필수 필드가 누락되었습니다' }, 400)
    }
    
    const result = await env.DB.prepare(`
      INSERT INTO shipper_quotations (shipper_id, billing_company_id, work_site, route_type, container_size, price, memo, photo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(shipper_id, billing_company_id, work_site, route_type, container_size, price, memo, photo_url).run()
    
    return c.json({ id: result.meta.last_row_id, message: '견적이 추가되었습니다' })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 화주별 견적 수정
app.put('/api/shipper-quotations/:id', async (c) => {
  const { env } = c
  const { id } = c.req.param()
  
  try {
    const { work_site, route_type, container_size, price, memo, photo_url } = await c.req.json()
    
    if (!work_site || !route_type || !price) {
      return c.json({ error: '필수 필드가 누락되었습니다' }, 400)
    }
    
    // photo_url이 undefined가 아닐 때만 업데이트
    let query = `
      UPDATE shipper_quotations 
      SET work_site = ?, route_type = ?, container_size = ?, price = ?, memo = ?, updated_at = CURRENT_TIMESTAMP
    `
    const params = [work_site, route_type, container_size, price, memo]
    
    if (photo_url !== undefined) {
      query += `, photo_url = ?`
      params.push(photo_url)
    }
    
    query += ` WHERE id = ?`
    params.push(id)
    
    await env.DB.prepare(query).bind(...params).run()
    
    return c.json({ message: '견적이 수정되었습니다' })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 화주별 견적 삭제
app.delete('/api/shipper-quotations/:id', async (c) => {
  const { env } = c
  const { id } = c.req.param()
  
  try {
    await env.DB.prepare(`
      DELETE FROM shipper_quotations WHERE id = ?
    `).bind(id).run()
    
    return c.json({ message: '견적이 삭제되었습니다' })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// ============================================
// 간단 견적 관리 API
// ============================================

// 화주별 간단 견적 조회
app.get('/api/simple-quotations/:shipperId', async (c) => {
  const { env } = c
  const { shipperId } = c.req.param()
  
  try {
    const { results } = await env.DB.prepare(`
      SELECT * FROM simple_quotations 
      WHERE shipper_id = ? 
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(shipperId).all()
    
    return c.json(results.length > 0 ? results[0] : null)
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 화주별 간단 견적 저장/수정
app.post('/api/simple-quotations', async (c) => {
  const { env } = c
  
  try {
    const { shipper_id, billing_company_id, content } = await c.req.json()
    
    if (!shipper_id || !billing_company_id || !content) {
      return c.json({ error: '필수 필드가 누락되었습니다' }, 400)
    }
    
    // 기존 견적이 있는지 확인
    const existing = await env.DB.prepare(`
      SELECT id FROM simple_quotations WHERE shipper_id = ?
    `).bind(shipper_id).first()
    
    if (existing) {
      // 업데이트
      await env.DB.prepare(`
        UPDATE simple_quotations 
        SET content = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE shipper_id = ?
      `).bind(content, shipper_id).run()
      
      return c.json({ id: existing.id, message: '견적이 수정되었습니다' })
    } else {
      // 새로 생성
      const result = await env.DB.prepare(`
        INSERT INTO simple_quotations (shipper_id, billing_company_id, content)
        VALUES (?, ?, ?)
      `).bind(shipper_id, billing_company_id, content).run()
      
      return c.json({ id: result.meta.last_row_id, message: '견적이 추가되었습니다' })
    }
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// 화주별 간단 견적 삭제
app.delete('/api/simple-quotations/:shipperId', async (c) => {
  const { env } = c
  const { shipperId } = c.req.param()
  
  try {
    await env.DB.prepare(`
      DELETE FROM simple_quotations WHERE shipper_id = ?
    `).bind(shipperId).run()
    
    return c.json({ message: '견적이 삭제되었습니다' })
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
          
          /* 모바일 반응형 스타일 */
          @media (max-width: 768px) {
            .desktop-nav { display: none; }
            .mobile-nav { display: flex !important; }
            .filter-group { flex-direction: column; gap: 0.5rem; }
            .button-group { flex-wrap: wrap; }
            .date-nav { font-size: 0.875rem; }
            .date-nav button { padding: 0.5rem 0.75rem; }
            .order-card { font-size: 0.875rem; }
            .table-container { overflow-x: auto; }
          }
          
          @media (min-width: 769px) {
            .mobile-nav { display: none !important; }
            .desktop-nav { display: flex; }
          }
          
          /* 햄버거 메뉴 애니메이션 */
          .menu-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 40;
            display: none;
          }
          
          .menu-overlay.active { display: block; }
          
          .mobile-menu {
            position: fixed;
            top: 0;
            right: -100%;
            width: 80%;
            max-width: 300px;
            height: 100%;
            background: white;
            z-index: 50;
            transition: right 0.3s ease;
            box-shadow: -2px 0 10px rgba(0,0,0,0.1);
          }
          
          .mobile-menu.active { right: 0; }
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
