-- Run this file if your existing Supabase project already has the original plantist schema.
-- Article content is readable publicly; personal ratings are private per account.
create table if not exists public.protocol_articles (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.accounts(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  author text not null default '',
  published_on date not null default current_date,
  source_url text,
  summary text not null default '',
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.protocol_article_ratings (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.protocol_articles(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  updated_at timestamptz not null default now(),
  unique (article_id, account_id)
);
create index if not exists protocol_articles_published_on_idx on public.protocol_articles(published_on desc);
create index if not exists protocol_articles_created_by_idx on public.protocol_articles(created_by);
create index if not exists protocol_article_ratings_account_idx on public.protocol_article_ratings(account_id);
alter table public.protocol_articles enable row level security;
alter table public.protocol_article_ratings enable row level security;
drop policy if exists "Anyone can read protocol articles" on public.protocol_articles;
create policy "Anyone can read protocol articles" on public.protocol_articles for select to anon, authenticated using (true);
drop policy if exists "Signed-in users can create protocol articles" on public.protocol_articles;
create policy "Signed-in users can create protocol articles" on public.protocol_articles for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "Authors can update their protocol articles" on public.protocol_articles;
create policy "Authors can update their protocol articles" on public.protocol_articles for update to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);
drop policy if exists "Authors can delete their protocol articles" on public.protocol_articles;
create policy "Authors can delete their protocol articles" on public.protocol_articles for delete to authenticated using (auth.uid() = created_by);
drop policy if exists "Users can read their own protocol ratings" on public.protocol_article_ratings;
create policy "Users can read their own protocol ratings" on public.protocol_article_ratings for select to authenticated using (auth.uid() = account_id);
drop policy if exists "Users can create their own protocol ratings" on public.protocol_article_ratings;
create policy "Users can create their own protocol ratings" on public.protocol_article_ratings for insert to authenticated with check (auth.uid() = account_id);
drop policy if exists "Users can update their own protocol ratings" on public.protocol_article_ratings;
create policy "Users can update their own protocol ratings" on public.protocol_article_ratings for update to authenticated using (auth.uid() = account_id) with check (auth.uid() = account_id);
drop policy if exists "Users can delete their own protocol ratings" on public.protocol_article_ratings;
create policy "Users can delete their own protocol ratings" on public.protocol_article_ratings for delete to authenticated using (auth.uid() = account_id);
