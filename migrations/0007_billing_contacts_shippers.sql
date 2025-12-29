-- 청구처별 담당자 테이블 (1:N)
CREATE TABLE IF NOT EXISTS billing_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  billing_company_id INTEGER NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (billing_company_id) REFERENCES billing_company_sales(id) ON DELETE CASCADE
);

-- 청구처별 화주 테이블 (1:N)
CREATE TABLE IF NOT EXISTS billing_shippers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  billing_company_id INTEGER NOT NULL,
  shipper_name TEXT NOT NULL,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (billing_company_id) REFERENCES billing_company_sales(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_billing_contacts_company ON billing_contacts(billing_company_id);
CREATE INDEX IF NOT EXISTS idx_billing_shippers_company ON billing_shippers(billing_company_id);

-- 기존 컬럼 제거 (SQLite는 ALTER TABLE DROP COLUMN을 지원하지 않으므로 주석 처리)
-- 참고: 기존 contact_person, shipper_name 컬럼은 그대로 두고 새 테이블 사용
