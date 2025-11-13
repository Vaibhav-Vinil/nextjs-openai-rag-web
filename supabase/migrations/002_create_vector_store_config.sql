create table if not exists vector_store_config (
  key text primary key,
  store_id text,
  store_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger update_vector_store_config_updated_at
  before update on vector_store_config
  for each row
  execute procedure update_updated_at_column();

