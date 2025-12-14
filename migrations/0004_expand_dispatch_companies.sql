-- 협력업체(하불업체) 테이블 확장
-- 담당자, 연락처, 운송유형, 운송지역 컬럼 추가

ALTER TABLE dispatch_companies ADD COLUMN manager TEXT;
ALTER TABLE dispatch_companies ADD COLUMN contact TEXT;
ALTER TABLE dispatch_companies ADD COLUMN transport_type TEXT;
ALTER TABLE dispatch_companies ADD COLUMN transport_area TEXT;
