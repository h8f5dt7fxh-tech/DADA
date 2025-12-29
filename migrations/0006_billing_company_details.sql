-- 청구처 상세 정보 컬럼 추가
ALTER TABLE billing_company_sales ADD COLUMN contact_person TEXT;
ALTER TABLE billing_company_sales ADD COLUMN shipper_name TEXT;
ALTER TABLE billing_company_sales ADD COLUMN memo TEXT;
