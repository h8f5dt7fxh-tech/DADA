-- Add order_id column to todos table for linking todos with orders
ALTER TABLE todos ADD COLUMN order_id INTEGER;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_todos_order_id ON todos(order_id);
