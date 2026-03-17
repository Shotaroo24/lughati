-- ============================================================
-- Migration 003: フォルダ機能
-- ============================================================
-- 実行方法: Supabase ダッシュボード > SQL Editor に貼り付けて実行
-- ============================================================

-- ── 1. folders テーブル作成 ────────────────────────────────────────────────

create table if not exists folders (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  name       text        not null,
  position   integer     not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_folders_user_id on folders(user_id);

-- ── 2. RLS ────────────────────────────────────────────────────────────────

alter table folders enable row level security;

create policy "自分のフォルダ閲覧"
  on folders for select using (auth.uid() = user_id);

create policy "自分のフォルダ作成"
  on folders for insert with check (auth.uid() = user_id);

create policy "自分のフォルダ更新"
  on folders for update using (auth.uid() = user_id);

create policy "自分のフォルダ削除"
  on folders for delete using (auth.uid() = user_id);

-- ── 3. decks に folder_id 追加 ────────────────────────────────────────────
-- on delete restrict: フォルダを削除する前にデッキを移動させる

alter table decks
  add column if not exists folder_id uuid references folders(id) on delete restrict;

-- ── 4. 既存デッキをデフォルトフォルダに移行 ──────────────────────────────

-- 各ユーザーに「マイフォルダ」を作成し、既存デッキを割り当てる
with new_folders as (
  insert into folders (id, user_id, name, position)
  select gen_random_uuid(), p.id, 'マイフォルダ', 0
  from profiles p
  -- フォルダがまだないユーザーのみ対象
  where not exists (
    select 1 from folders f where f.user_id = p.id
  )
  returning id, user_id
)
update decks d
set folder_id = nf.id
from new_folders nf
where nf.user_id = d.user_id
  and d.folder_id is null;
