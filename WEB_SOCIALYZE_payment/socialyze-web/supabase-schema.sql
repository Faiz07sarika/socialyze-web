-- Jalankan di Supabase > SQL Editor (opsional, untuk menyimpan riwayat order)
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  invoice_id text unique not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  package_name text not null,
  package_price numeric not null,
  payment_method text not null,
  total_amount numeric not null,
  status text not null default 'PENDING',      -- PENDING | PAID | FAILED | EXPIRED
  payment_type text,
  midtrans_transaction_id text,
  snap_token text,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- RLS aktif tanpa policy = browser (anon key) TIDAK bisa baca/tulis.
-- Hanya server (service role key) yang bisa.
alter table orders enable row level security;
