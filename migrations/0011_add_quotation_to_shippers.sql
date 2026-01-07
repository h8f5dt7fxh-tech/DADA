-- Add quotation and photo to billing_shippers table
ALTER TABLE billing_shippers ADD COLUMN quotation TEXT;
ALTER TABLE billing_shippers ADD COLUMN photo_url TEXT;
