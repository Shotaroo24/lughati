-- ============================================================
-- Lughati — Row Level Security (RLS)
-- Run this AFTER 20260317000001_create_tables.sql
-- ============================================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table decks enable row level security;
alter table cards enable row level security;

-- ============================================================
-- profiles policies: own row only
-- ============================================================

create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id);

-- ============================================================
-- decks policies: own decks only
-- ============================================================

create policy "decks_select_own"
  on decks for select
  using (auth.uid() = user_id);

create policy "decks_insert_own"
  on decks for insert
  with check (auth.uid() = user_id);

create policy "decks_update_own"
  on decks for update
  using (auth.uid() = user_id);

create policy "decks_delete_own"
  on decks for delete
  using (auth.uid() = user_id);

-- ============================================================
-- cards policies: cards in own decks only
-- ============================================================

create policy "cards_select_own"
  on cards for select
  using (
    deck_id in (select id from decks where user_id = auth.uid())
  );

create policy "cards_insert_own"
  on cards for insert
  with check (
    deck_id in (select id from decks where user_id = auth.uid())
  );

create policy "cards_update_own"
  on cards for update
  using (
    deck_id in (select id from decks where user_id = auth.uid())
  );

create policy "cards_delete_own"
  on cards for delete
  using (
    deck_id in (select id from decks where user_id = auth.uid())
  );
