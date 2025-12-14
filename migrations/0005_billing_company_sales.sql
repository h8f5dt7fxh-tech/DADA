-- 청구처-영업담당자 매핑 테이블 생성
CREATE TABLE IF NOT EXISTS billing_company_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  billing_company TEXT NOT NULL UNIQUE,
  sales_person TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_billing_company_sales_company ON billing_company_sales(billing_company);
