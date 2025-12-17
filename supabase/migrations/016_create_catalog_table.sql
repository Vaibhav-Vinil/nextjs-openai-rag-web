-- Create catalog table to store product catalog data
create table if not exists product_catalog (
  id text primary key default 'catalog',
  data jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

-- Create index for better query performance
create index if not exists idx_product_catalog_updated_at on product_catalog(updated_at);

-- Add RLS policy to allow public read access
alter table product_catalog enable row level security;

create policy "Public product catalog is viewable by everyone." 
on product_catalog for select 
using (true);

-- Function to update the updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Trigger to update the updated_at column
create trigger update_product_catalog_updated_at
before update on product_catalog
for each row
execute function update_updated_at_column();
