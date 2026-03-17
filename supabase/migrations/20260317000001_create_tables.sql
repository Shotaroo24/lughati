-- ============================================================
-- Lughati — Initial schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- Tables
-- ============================================================

-- profiles: created automatically on sign-up
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_voice text default 'ar-XA-Wavenet-A',
  auto_play boolean default false,
  show_romanization boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- decks: a collection of flashcards
create table decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  last_studied_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- cards: individual flashcards inside a deck
create table cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid references decks(id) on delete cascade not null,
  arabic text not null,
  english text not null,
  romanization text,
  is_starred boolean default false,
  position integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- Indexes
-- ============================================================

create index idx_decks_user_id on decks(user_id);
create index idx_cards_deck_id on cards(deck_id);
create index idx_cards_starred on cards(deck_id, is_starred) where is_starred = true;

-- ============================================================
-- updated_at auto-update trigger
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();
create trigger decks_updated_at before update on decks
  for each row execute function update_updated_at();
create trigger cards_updated_at before update on cards
  for each row execute function update_updated_at();

-- ============================================================
-- Auto-create profile on sign-up
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
