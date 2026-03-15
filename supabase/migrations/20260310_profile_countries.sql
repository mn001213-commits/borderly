-- Add origin_country, rename country_code to residence_country
alter table profiles add column if not exists residence_country text;
alter table profiles add column if not exists origin_country text;

-- Migrate existing data
update profiles set residence_country = country_code where residence_country is null and country_code is not null;
