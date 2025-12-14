-- 계정명 템플릿 관리
CREATE TABLE IF NOT EXISTS account_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('billing', 'payment', 'both')),
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_account_templates_type ON account_templates(type);
CREATE INDEX IF NOT EXISTS idx_account_templates_usage ON account_templates(usage_count DESC);
