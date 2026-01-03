-- 允许联系人字段为空，支持只导入公司信息
ALTER TABLE contacts ALTER COLUMN name DROP NOT NULL;
ALTER TABLE contacts ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_phone_key;
