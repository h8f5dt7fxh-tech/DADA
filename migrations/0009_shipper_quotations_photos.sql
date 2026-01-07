-- Add photo column to quotations table
ALTER TABLE quotations ADD COLUMN photo_url TEXT;

-- Create table for shipper quotations with photos
CREATE TABLE IF NOT EXISTS shipper_quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  billing_company_id INTEGER NOT NULL,
  shipper_id INTEGER NOT NULL,
  work_site TEXT NOT NULL,
  route_type TEXT NOT NULL,
  container_size TEXT,
  price REAL NOT NULL,
  memo TEXT,
  photo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (billing_company_id) REFERENCES billing_company_sales(id) ON DELETE CASCADE,
  FOREIGN KEY (shipper_id) REFERENCES billing_shippers(id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_shipper_quotations_billing ON shipper_quotations(billing_company_id);
CREATE INDEX IF NOT EXISTS idx_shipper_quotations_shipper ON shipper_quotations(shipper_id);
CREATE INDEX IF NOT EXISTS idx_shipper_quotations_route ON shipper_quotations(route_type);
