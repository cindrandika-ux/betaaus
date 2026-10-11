-- Supabase schema untuk BETA.AUS Feedback
-- Jalankan di Supabase Dashboard > SQL Editor > New query > Run

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  rating int not null check (rating between 1 and 5),
  categories text[] not null default '{}',
  message text,
  contact text,
  store text not null default 'BETA.AUS',
  created_at timestamptz not null default now()
);

alter table public.feedbacks enable row level security;

-- Siapa pun boleh kirim rating (form publik)
drop policy if exists "allow_insert_anon" on public.feedbacks;
create policy "allow_insert_anon"
  on public.feedbacks for insert
  to anon, authenticated
  with check (true);

-- Admin baca + hapus lewat anon key (halaman admin sudah dikunci login lokal)
drop policy if exists "allow_read_anon" on public.feedbacks;
create policy "allow_read_anon"
  on public.feedbacks for select
  to anon, authenticated
  using (true);

drop policy if exists "allow_delete_anon" on public.feedbacks;
create policy "allow_delete_anon"
  on public.feedbacks for delete
  to anon, authenticated
  using (true);
