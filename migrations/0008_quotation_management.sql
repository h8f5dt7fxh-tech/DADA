-- 견적 관리 테이블
CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  billing_company TEXT NOT NULL,
  shipper_name TEXT NOT NULL,
  work_site TEXT NOT NULL,
  route_type TEXT NOT NULL,  -- '부산신항편도', '부산신항왕복', '부산북항편도', '부산북항왕복', '인천신항왕복', '인천구항왕복', '평택왕복', '광양왕복'
  container_size TEXT,  -- '20GP', '40HC', '40HQ', etc
  price INTEGER NOT NULL,  -- 견적 가격
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 빠른 검색을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_quotations_billing_company ON quotations(billing_company);
CREATE INDEX IF NOT EXISTS idx_quotations_shipper ON quotations(shipper_name);
CREATE INDEX IF NOT EXISTS idx_quotations_work_site ON quotations(work_site);
CREATE INDEX IF NOT EXISTS idx_quotations_route ON quotations(route_type);
CREATE INDEX IF NOT EXISTS idx_quotations_composite ON quotations(billing_company, shipper_name, work_site, route_type);
