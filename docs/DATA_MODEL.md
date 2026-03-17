# Lughati — データモデル（Supabase / PostgreSQL）

## テーブル

### profiles（ユーザー設定）
サインアップ時に自動作成される。

| カラム | 型 | デフォルト | 説明 |
|--------|-----|-----------|------|
| id | uuid (PK) | auth.uid() | auth.usersへの参照 |
| display_name | text | null | 表示名（任意） |
| preferred_voice | text | 'ar-XA-Wavenet-A' | 女性(A) または 男性(B) |
| auto_play | boolean | false | カード表示時に自動再生 |
| show_romanization | boolean | true | ローマ字表示 |
| created_at | timestamptz | now() | 作成日時 |
| updated_at | timestamptz | now() | 更新日時（自動） |

### decks（デッキ）
単語カードのまとまり。

| カラム | 型 | デフォルト | 説明 |
|--------|-----|-----------|------|
| id | uuid (PK) | gen_random_uuid() | 自動生成 |
| user_id | uuid (FK) | auth.uid() | 所有ユーザー |
| title | text | （必須） | デッキ名 |
| description | text | null | 説明（任意） |
| last_studied_at | timestamptz | null | 最終学習日 |
| created_at | timestamptz | now() | 作成日時 |
| updated_at | timestamptz | now() | 更新日時（自動） |

### cards（カード）
デッキ内の各単語カード。

| カラム | 型 | デフォルト | 説明 |
|--------|-----|-----------|------|
| id | uuid (PK) | gen_random_uuid() | 自動生成 |
| deck_id | uuid (FK) | （必須） | decks(id)への参照、CASCADE削除 |
| arabic | text | （必須） | アラビア語（表面） |
| english | text | （必須） | 英語訳（裏面） |
| romanization | text | null | ローマ字表記（任意） |
| is_starred | boolean | false | 星マーク（お気に入り） |
| position | integer | （自動） | デッキ内の並び順 |
| created_at | timestamptz | now() | 作成日時 |
| updated_at | timestamptz | now() | 更新日時（自動） |

## SQLマイグレーション

```sql
-- UUID拡張を有効化
create extension if not exists "uuid-ossp";

-- profilesテーブル
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_voice text default 'ar-XA-Wavenet-A',
  auto_play boolean default false,
  show_romanization boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- decksテーブル
create table decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  last_studied_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- cardsテーブル
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

-- インデックス
create index idx_decks_user_id on decks(user_id);
create index idx_cards_deck_id on cards(deck_id);
create index idx_cards_starred on cards(deck_id, is_starred) where is_starred = true;

-- updated_atの自動更新
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

-- サインアップ時にプロフィールを自動作成
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
```

## 行レベルセキュリティ（RLS）

```sql
-- 全テーブルでRLSを有効化
alter table profiles enable row level security;
alter table decks enable row level security;
alter table cards enable row level security;

-- profiles: 自分のプロフィールのみアクセス可能
create policy "自分のプロフィール閲覧"
  on profiles for select using (auth.uid() = id);
create policy "自分のプロフィール更新"
  on profiles for update using (auth.uid() = id);

-- decks: 自分のデッキのみCRUD可能
create policy "自分のデッキ閲覧"
  on decks for select using (auth.uid() = user_id);
create policy "自分のデッキ作成"
  on decks for insert with check (auth.uid() = user_id);
create policy "自分のデッキ更新"
  on decks for update using (auth.uid() = user_id);
create policy "自分のデッキ削除"
  on decks for delete using (auth.uid() = user_id);

-- cards: 自分のデッキ内のカードのみCRUD可能
create policy "自分のカード閲覧"
  on cards for select using (
    deck_id in (select id from decks where user_id = auth.uid())
  );
create policy "自分のデッキにカード作成"
  on cards for insert with check (
    deck_id in (select id from decks where user_id = auth.uid())
  );
create policy "自分のカード更新"
  on cards for update using (
    deck_id in (select id from decks where user_id = auth.uid())
  );
create policy "自分のカード削除"
  on cards for delete using (
    deck_id in (select id from decks where user_id = auth.uid())
  );
```

## TypeScript型定義

```typescript
export interface Profile {
  id: string;
  display_name: string | null;
  preferred_voice: 'ar-XA-Wavenet-A' | 'ar-XA-Wavenet-B';
  auto_play: boolean;
  show_romanization: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  last_studied_at: string | null;
  created_at: string;
  updated_at: string;
  card_count?: number; // クエリで算出
}

export interface Card {
  id: string;
  deck_id: string;
  arabic: string;
  english: string;
  romanization: string | null;
  is_starred: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}
```
