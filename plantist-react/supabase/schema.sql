create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  name text not null default '',
  profile_image text not null default '',
  created_at timestamptz not null default now()
);

alter table public.accounts add column if not exists profile_image text not null default '';

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  species_type text not null default '',
  description text not null default '',
  manually_added_age_days integer not null default 0 check (manually_added_age_days >= 0),
  age_started_at timestamptz not null default now(),
  color text not null default '',
  size text not null default '',
  other_specs text not null default '',
  images jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.plants add column if not exists species_type text not null default '';
alter table public.plants add column if not exists description text not null default '';
alter table public.plants add column if not exists manually_added_age_days integer not null default 0;
alter table public.plants add column if not exists age_started_at timestamptz not null default now();
alter table public.plants add column if not exists color text not null default '';
alter table public.plants add column if not exists size text not null default '';
alter table public.plants add column if not exists other_specs text not null default '';
alter table public.plants add column if not exists images jsonb not null default '[]'::jsonb;
alter table public.plants add column if not exists timeline jsonb not null default '[]'::jsonb;

create table if not exists public.plant_protocols (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  level integer not null default 1 check (level between 1 and 7),
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 12000),
  attachment_url text,
  attachment_name text,
  attachment_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 12000),
  attachment_url text,
  attachment_name text,
  attachment_type text,
  created_at timestamptz not null default now()
);

create index if not exists plants_account_id_idx on public.plants(account_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_account_id_idx on public.posts(account_id);
create index if not exists replies_post_id_idx on public.replies(post_id);
create index if not exists replies_account_id_idx on public.replies(account_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare chosen_username text;
begin
  chosen_username := coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), split_part(coalesce(new.email, 'grower'), '@', 1));
  if exists (select 1 from public.accounts where username = chosen_username) then
    chosen_username := chosen_username || '_' || substr(new.id::text, 1, 8);
  end if;
  insert into public.accounts (id, username, name) values (new.id, chosen_username, coalesce(new.raw_user_meta_data ->> 'name', ''));
  insert into public.plant_protocols (account_id) values (new.id) on conflict (account_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.accounts enable row level security;
alter table public.plants enable row level security;
alter table public.plant_protocols enable row level security;
alter table public.posts enable row level security;
alter table public.replies enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.accounts;
create policy "Authenticated users can read profiles" on public.accounts for select to authenticated using (true);
drop policy if exists "Users can update their own profile" on public.accounts;
create policy "Users can update their own profile" on public.accounts for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can read their own plants" on public.plants;
create policy "Users can read their own plants" on public.plants for select to authenticated using (auth.uid() = account_id);
drop policy if exists "Users can create their own plants" on public.plants;
create policy "Users can create their own plants" on public.plants for insert to authenticated with check (auth.uid() = account_id);
drop policy if exists "Users can update their own plants" on public.plants;
create policy "Users can update their own plants" on public.plants for update to authenticated using (auth.uid() = account_id) with check (auth.uid() = account_id);
drop policy if exists "Users can delete their own plants" on public.plants;
create policy "Users can delete their own plants" on public.plants for delete to authenticated using (auth.uid() = account_id);

drop policy if exists "Users can read their own protocol" on public.plant_protocols;
create policy "Users can read their own protocol" on public.plant_protocols for select to authenticated using (auth.uid() = account_id);
drop policy if exists "Users can create their own protocol" on public.plant_protocols;
create policy "Users can create their own protocol" on public.plant_protocols for insert to authenticated with check (auth.uid() = account_id);
drop policy if exists "Users can update their own protocol" on public.plant_protocols;
create policy "Users can update their own protocol" on public.plant_protocols for update to authenticated using (auth.uid() = account_id) with check (auth.uid() = account_id);

drop policy if exists "Authenticated users can read posts" on public.posts;
create policy "Authenticated users can read posts" on public.posts for select to authenticated using (true);
drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts" on public.posts for insert to authenticated with check (auth.uid() = account_id);
drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts" on public.posts for update to authenticated using (auth.uid() = account_id) with check (auth.uid() = account_id);
drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts" on public.posts for delete to authenticated using (auth.uid() = account_id);

drop policy if exists "Authenticated users can read replies" on public.replies;
create policy "Authenticated users can read replies" on public.replies for select to authenticated using (true);
drop policy if exists "Users can create their own replies" on public.replies;
create policy "Users can create their own replies" on public.replies for insert to authenticated with check (auth.uid() = account_id and exists (select 1 from public.posts where public.posts.id = post_id));
drop policy if exists "Users can update their own replies" on public.replies;
create policy "Users can update their own replies" on public.replies for update to authenticated using (auth.uid() = account_id) with check (auth.uid() = account_id);
drop policy if exists "Users can delete their own replies" on public.replies;
create policy "Users can delete their own replies" on public.replies for delete to authenticated using (auth.uid() = account_id);

insert into storage.buckets (id, name, public, file_size_limit) values ('plantist', 'plantist', true, 10485760) on conflict (id) do update set public = true, file_size_limit = 10485760;
drop policy if exists "Public can view plantist files" on storage.objects;
create policy "Public can view plantist files" on storage.objects for select to anon, authenticated using (bucket_id = 'plantist');
drop policy if exists "Users can upload files to their own folder" on storage.objects;
create policy "Users can upload files to their own folder" on storage.objects for insert to authenticated with check (bucket_id = 'plantist' and (storage.foldername(name))[2] = auth.uid()::text and (storage.foldername(name))[1] in ('plants', 'forum', 'profile'));
drop policy if exists "Users can update their own files" on storage.objects;
create policy "Users can update their own files" on storage.objects for update to authenticated using (bucket_id = 'plantist' and (storage.foldername(name))[2] = auth.uid()::text) with check (bucket_id = 'plantist' and (storage.foldername(name))[2] = auth.uid()::text);
drop policy if exists "Users can delete their own files" on storage.objects;
create policy "Users can delete their own files" on storage.objects for delete to authenticated using (bucket_id = 'plantist' and (storage.foldername(name))[2] = auth.uid()::text);

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts') then alter publication supabase_realtime add table public.posts; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'replies') then alter publication supabase_realtime add table public.replies; end if;
end $$;
