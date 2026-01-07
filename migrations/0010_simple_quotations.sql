-- Simple quotations table for text-based input
CREATE TABLE IF NOT EXISTS simple_quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  billing_company_id INTEGER NOT NULL,
  shipper_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (billing_company_id) REFERENCES billing_company_sales(id) ON DELETE CASCADE,
  FOREIGN KEY (shipper_id) REFERENCES billing_shippers(id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_simple_quotations_billing ON simple_quotations(billing_company_id);
CREATE INDEX IF NOT EXISTS idx_simple_quotations_shipper ON simple_quotations(shipper_id);
