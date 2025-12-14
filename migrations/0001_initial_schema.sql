-- 상차지/하차지 코드 관리
CREATE TABLE IF NOT EXISTS location_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL,
  dispatch_company TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 선사 코드 관리
CREATE TABLE IF NOT EXISTS shipping_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 하불업체 (협력업체) 관리
CREATE TABLE IF NOT EXISTS dispatch_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  payment_level TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 청구업체 관리
CREATE TABLE IF NOT EXISTS billing_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 화주 관리 (청구업체 하위)
CREATE TABLE IF NOT EXISTS shippers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  billing_company_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (billing_company_id) REFERENCES billing_companies(id) ON DELETE CASCADE
);

-- 작업지 관리 (화주 하위)
CREATE TABLE IF NOT EXISTS work_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipper_id INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  contact_person TEXT,
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipper_id) REFERENCES shippers(id) ON DELETE CASCADE
);

-- 운송 오더 관리
CREATE TABLE IF NOT EXISTS transport_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_type TEXT NOT NULL CHECK(order_type IN ('container_export', 'container_import', 'bulk', 'lcl')),
  
  -- 공통 필드
  billing_company TEXT NOT NULL,
  shipper TEXT NOT NULL,
  work_site TEXT,
  work_site_code TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  work_datetime TEXT NOT NULL,
  
  -- 컨테이너 수출 전용
  booking_number TEXT,
  container_size TEXT,
  shipping_line TEXT,
  vessel_name TEXT,
  export_country TEXT,
  berth_date TEXT,
  departure_date TEXT,
  weight TEXT,
  container_number TEXT,
  tw TEXT,
  seal_number TEXT,
  
  -- 컨테이너 수입 전용
  bl_number TEXT,
  do_status TEXT,
  customs_clearance TEXT,
  
  -- LCL/벌크 전용
  order_no TEXT,
  
  -- 공통 배차 정보
  loading_location TEXT,
  loading_location_code TEXT,
  unloading_location TEXT,
  unloading_location_code TEXT,
  dispatch_company TEXT,
  vehicle_info TEXT,
  
  -- 상태 관리
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'unassigned', 'undispatched', 'completed')),
  weighing_required BOOLEAN DEFAULT 0,
  
  -- 메타데이터
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 비고 관리
CREATE TABLE IF NOT EXISTS order_remarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 0 CHECK(importance IN (0, 1, 2, 3)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES transport_orders(id) ON DELETE CASCADE
);

-- 청구 관리
CREATE TABLE IF NOT EXISTS billings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES transport_orders(id) ON DELETE CASCADE
);

-- 하불 관리
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES transport_orders(id) ON DELETE CASCADE
);

-- 할일 관리
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  completed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_orders_datetime ON transport_orders(work_datetime);
CREATE INDEX IF NOT EXISTS idx_orders_type ON transport_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_status ON transport_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_shipper ON transport_orders(shipper);
CREATE INDEX IF NOT EXISTS idx_orders_billing ON transport_orders(billing_company);
CREATE INDEX IF NOT EXISTS idx_remarks_order ON order_remarks(order_id);
CREATE INDEX IF NOT EXISTS idx_billings_order ON billings(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
