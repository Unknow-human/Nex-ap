-- ============================================================
-- NEXUS ARENA — Schéma Supabase (Postgres)
-- Migration depuis Firebase/Firestore
-- À exécuter dans l'éditeur SQL du projet Supabase (ou via
-- `supabase db push` si vous utilisez la CLI).
-- ============================================================

-- Extension nécessaire pour gen_random_uuid()
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. PROFILES (remplace la collection Firestore "players")
-- ------------------------------------------------------------
create table if not exists profiles (
  uid uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  agent_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Profiles lisibles par tous les utilisateurs authentifiés"
  on profiles for select
  using (true);

create policy "Un utilisateur ne peut créer que son propre profil"
  on profiles for insert
  with check (auth.uid() = uid);

create policy "Un utilisateur ne peut modifier que son propre profil"
  on profiles for update
  using (auth.uid() = uid);

-- ------------------------------------------------------------
-- 2. CHAT GLOBAL (remplace la collection Firestore "chat")
-- ------------------------------------------------------------
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  creator_id uuid references auth.users(id),
  message text not null,
  message_type text not null default 'message', -- 'message' | 'audio' | 'combat-log'
  audio_url text,
  attempt jsonb, -- { code, bp, mp } pour les logs de combat
  created_at timestamptz default now(),
  timestamp_ms bigint not null default (extract(epoch from now()) * 1000)
);

create index if not exists idx_chat_messages_created_at on chat_messages (created_at desc);

alter table chat_messages enable row level security;

create policy "Chat global lisible par tous"
  on chat_messages for select
  using (true);

create policy "Seul l'auteur peut poster en son nom"
  on chat_messages for insert
  with check (auth.uid() = creator_id);

-- ------------------------------------------------------------
-- 3. ARENAS (remplace la collection Firestore "arenas")
-- Les joueurs et tentatives restent en JSONB pour coller au
-- modèle existant côté app (players[], attempts[]) et limiter
-- la réécriture du moteur de jeu pendant la migration.
-- ------------------------------------------------------------
create table if not exists arenas (
  id text primary key, -- ex: "ARENA-AB12CD"
  secret_code text not null,
  creator_id uuid references auth.users(id),
  creator_name text,
  players jsonb not null default '[]'::jsonb,
  attempts jsonb not null default '[]'::jsonb,
  status text not null default 'waiting', -- waiting | active | playing | completed
  difficulty text,
  winner_id uuid,
  game_started boolean default false,
  game_started_at bigint,
  completed_at bigint,
  created_at_ms bigint not null,
  expires_at_ms bigint not null,
  last_updated_ms bigint not null,
  created_at timestamptz default now()
);

create index if not exists idx_arenas_status on arenas (status);
create index if not exists idx_arenas_expires_at on arenas (expires_at_ms);

alter table arenas enable row level security;

create policy "Arenas lisibles par tous les joueurs authentifiés"
  on arenas for select
  using (true);

create policy "Seul un utilisateur authentifié peut créer une arena"
  on arenas for insert
  with check (auth.uid() = creator_id);

-- Update ouvert aux joueurs authentifiés (rejoindre/jouer) ; la
-- vérification fine (le joueur fait partie de la partie) est
-- faite côté RPC pour les opérations sensibles (add_arena_attempt).
create policy "Un utilisateur authentifié peut mettre à jour une arena"
  on arenas for update
  using (auth.uid() is not null);

-- ------------------------------------------------------------
-- 4. ARENA CHAT (remplace la collection Firestore "arenaChat")
-- ------------------------------------------------------------
create table if not exists arena_chat_messages (
  id uuid primary key default gen_random_uuid(),
  arena_id text not null references arenas(id) on delete cascade,
  player_id text not null,
  player_name text,
  creator_id uuid references auth.users(id),
  message text not null,
  created_at timestamptz default now(),
  timestamp_ms bigint not null default (extract(epoch from now()) * 1000)
);

create index if not exists idx_arena_chat_arena_id on arena_chat_messages (arena_id, created_at asc);

alter table arena_chat_messages enable row level security;

create policy "Chat d'arena lisible par tous les authentifiés"
  on arena_chat_messages for select
  using (true);

create policy "Seul l'auteur peut poster en son nom dans le chat d'arena"
  on arena_chat_messages for insert
  with check (auth.uid() = creator_id);

-- ------------------------------------------------------------
-- 5. RECORDS (remplace la collection Firestore "records")
-- ------------------------------------------------------------
create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  player_id uuid references auth.users(id),
  attempts int not null,
  time_seconds int not null,
  mode text not null, -- SOLO | MULTI-LOCAL | MULTI-ONLINE
  difficulty text,
  opponent_name text,
  timestamp_ms bigint not null,
  created_at timestamptz default now()
);

create index if not exists idx_records_timestamp on records (timestamp_ms desc);

alter table records enable row level security;

create policy "Records lisibles par tous"
  on records for select
  using (true);

create policy "Seul l'auteur peut créer son propre record"
  on records for insert
  with check (auth.uid() = player_id);

-- ------------------------------------------------------------
-- 6. MATCH POOL (remplace la collection Firestore "matchPool")
-- File d'attente pour le matchmaking aléatoire
-- ------------------------------------------------------------
create table if not exists match_pool (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id),
  player_name text,
  status text not null default 'waiting', -- waiting | matched
  match_id text,
  matched_with uuid,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

create index if not exists idx_match_pool_status on match_pool (status, expires_at);

alter table match_pool enable row level security;

create policy "Pool visible par les utilisateurs authentifiés"
  on match_pool for select
  using (auth.uid() is not null);

create policy "Un joueur ne peut s'inscrire que lui-même dans le pool"
  on match_pool for insert
  with check (auth.uid() = player_id);

create policy "Un joueur peut quitter/annuler sa propre entrée"
  on match_pool for delete
  using (auth.uid() = player_id);

-- ------------------------------------------------------------
-- 7. RPC : matchmaking atomique
-- Remplace la logique client de matchmaking.ts qui risquait un
-- appariement en double lors d'accès concurrents. Le
-- FOR UPDATE SKIP LOCKED garantit qu'un seul appelant peut
-- "gagner" un adversaire donné.
-- ------------------------------------------------------------
create or replace function find_match(p_player_id uuid, p_pool_id uuid)
returns table (
  match_id text,
  opponent_id uuid,
  opponent_name text
)
language plpgsql
security definer
as $$
declare
  v_opponent record;
  v_match_id text;
begin
  -- Verrouille et prend le premier adversaire disponible en attente
  select id, player_id, player_name into v_opponent
  from match_pool
  where status = 'waiting'
    and player_id <> p_player_id
    and expires_at > now()
  order by created_at asc
  limit 1
  for update skip locked;

  if v_opponent.id is null then
    return; -- aucune ligne renvoyée = pas d'adversaire trouvé
  end if;

  v_match_id := 'match_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 6);

  update match_pool
  set status = 'matched', matched_with = v_opponent.player_id, match_id = v_match_id
  where id = p_pool_id;

  update match_pool
  set status = 'matched', matched_with = p_player_id, match_id = v_match_id
  where id = v_opponent.id;

  return query select v_match_id, v_opponent.player_id, v_opponent.player_name;
end;
$$;

-- ------------------------------------------------------------
-- 8. RPC : ajout atomique d'une tentative à une arena
-- Évite les races entre deux joueurs qui soumettent en même
-- temps (lecture-modification-écriture non atomique en client).
-- ------------------------------------------------------------
create or replace function add_arena_attempt(p_arena_id text, p_attempt jsonb)
returns void
language plpgsql
security definer
as $$
begin
  update arenas
  set attempts = attempts || jsonb_build_array(p_attempt),
      last_updated_ms = extract(epoch from now()) * 1000
  where id = p_arena_id;
end;
$$;

-- ------------------------------------------------------------
-- 9. Realtime : activer les tables sur la publication par défaut
-- ------------------------------------------------------------
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table arenas;
alter publication supabase_realtime add table arena_chat_messages;

-- ------------------------------------------------------------
-- 10. Nettoyage périodique (à brancher sur pg_cron si disponible
-- sur votre plan Supabase, sinon appelé depuis l'app comme avant)
-- ------------------------------------------------------------
create or replace function cleanup_expired_data()
returns void
language plpgsql
security definer
as $$
begin
  delete from match_pool where expires_at < now();
  delete from arenas where status = 'waiting' and expires_at_ms < (extract(epoch from now()) * 1000);
  delete from chat_messages where created_at < now() - interval '30 days';
end;
$$;

-- Si l'extension pg_cron est activée sur votre projet Supabase :
-- select cron.schedule('cleanup-nexus-arena', '0 * * * *', 'select cleanup_expired_data()');

-- ------------------------------------------------------------
-- 11. RPC : agrégations de records
-- Remplace les Firebase Cloud Functions (functions/index.js :
-- getTopRecords, getPlayerStats, getDifficultyStats, getGlobalStats).
-- Ces agrégations tournent nativement dans Postgres, appelables
-- depuis le client via supabase.rpc('...') — plus besoin d'une
-- couche de fonctions serverless séparée pour de la lecture.
-- ------------------------------------------------------------

-- Top records (les plus rapides), remplace getTopRecords
create or replace function get_top_records(p_limit int default 10)
returns setof records
language sql
stable
as $$
  select * from records
  order by time_seconds asc
  limit p_limit;
$$;

-- Stats d'un joueur, remplace getPlayerStats
create or replace function get_player_stats(p_agent_name text)
returns table (
  total_games bigint,
  best_time int,
  average_time numeric
)
language sql
stable
as $$
  select
    count(*) as total_games,
    min(time_seconds) as best_time,
    round(avg(time_seconds), 0) as average_time
  from records
  where agent_name = p_agent_name;
$$;

-- Stats par difficulté, remplace getDifficultyStats
create or replace function get_difficulty_stats()
returns table (
  difficulty text,
  games bigint,
  average_time numeric
)
language sql
stable
as $$
  select
    difficulty,
    count(*) as games,
    round(avg(time_seconds), 0) as average_time
  from records
  where difficulty is not null
  group by difficulty;
$$;

-- Stats globales, remplace getGlobalStats
create or replace function get_global_stats()
returns table (
  total_games bigint,
  average_time numeric
)
language sql
stable
as $$
  select
    count(*) as total_games,
    round(avg(time_seconds), 0) as average_time
  from records;
$$;

-- ------------------------------------------------------------
-- 8. STORAGE — bucket "audio-messages" (chat vocal)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('audio-messages', 'audio-messages', true)
on conflict (id) do update set public = true;

create policy "Audio lisible par tous"
  on storage.objects for select
  using (bucket_id = 'audio-messages');

create policy "Utilisateur authentifié peut uploader dans audio-messages"
  on storage.objects for insert
  with check (bucket_id = 'audio-messages' and auth.role() = 'authenticated');

create policy "Auteur peut supprimer son propre fichier audio"
  on storage.objects for delete
  using (bucket_id = 'audio-messages' and owner = auth.uid());

-- ============================================================
-- ÉTAPE 3/4 — ELO, streaks, amis, défis directs
-- Choix validés par l'utilisateur :
--  - ELO actif sur tous les modes ; en SOLO, converti en score
--    (pas d'adversaire réel, donc uniquement gagnant, jamais perdant).
--  - Classement continu (rang numérique), pas de paliers de ligue.
--  - Streaks : victoires consécutives + streak de jours joués.
--  - Amis ajoutés automatiquement après une partie MULTI-ONLINE.
--  - Classements global ET entre amis.
--  - Défi direct d'un ami (sans code de salle à partager).
--
-- Choix techniques (non demandés explicitement, tranchés pour
-- rester cohérent avec l'existant) :
--  - Le mode MULTI-LOCAL (deux joueurs nommés sur un même
--    appareil, sans compte séparé) N'ALIMENTE PAS l'ELO ni le
--    win_streak : il n'y a qu'un seul compte authentifié pour
--    les deux joueurs locaux, donc un vrai classement par nom
--    serait à la fois non fiable (n'importe qui peut taper
--    n'importe quel nom) et non comparable à un compte réel.
--    Il déclenche uniquement le streak quotidien (touch_daily_streak),
--    qui concerne l'appareil/compte, pas le mode de jeu.
--  - Le win_streak (victoires consécutives) compte les victoires
--    SOLO (toujours une "victoire" par définition du jeu) ET les
--    victoires MULTI-ONLINE ; il est remis à zéro uniquement par
--    une défaite MULTI-ONLINE (le seul mode avec un vrai perdant).
-- ============================================================

-- ------------------------------------------------------------
-- 12. PLAYER_STATS — ELO, victoires, streaks (par compte)
-- ------------------------------------------------------------
create table if not exists player_stats (
  uid uuid primary key references auth.users(id) on delete cascade,
  elo_rating int not null default 1200,
  games_played int not null default 0,
  wins int not null default 0,
  win_streak int not null default 0,
  best_win_streak int not null default 0,
  daily_streak int not null default 0,
  best_daily_streak int not null default 0,
  last_played_date date,
  updated_at timestamptz default now()
);

alter table player_stats enable row level security;

create policy "Stats lisibles par tous"
  on player_stats for select
  using (true);

-- Aucune policy insert/update pour les clients : toutes les écritures
-- passent par les RPC `security definer` ci-dessous (mêmes garanties
-- d'atomicité que add_arena_attempt / find_match).

-- ------------------------------------------------------------
-- 13. FRIENDS — liste d'amis (ajout auto après une partie en ligne)
-- ------------------------------------------------------------
create table if not exists friends (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  friend_name text,
  created_at timestamptz default now(),
  unique (player_id, friend_id)
);

create index if not exists idx_friends_player_id on friends (player_id);

alter table friends enable row level security;

create policy "Un utilisateur voit sa propre liste d'amis"
  on friends for select
  using (auth.uid() = player_id);

-- Écriture uniquement via record_match_result (security definer).

-- ------------------------------------------------------------
-- 14. CHALLENGES — défi direct d'un ami (sans code de salle)
-- ------------------------------------------------------------
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  from_player_id uuid not null references auth.users(id) on delete cascade,
  from_player_name text,
  to_player_id uuid not null references auth.users(id) on delete cascade,
  arena_id text references arenas(id) on delete cascade,
  status text not null default 'pending', -- pending | accepted | declined | expired
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes')
);

create index if not exists idx_challenges_to_player on challenges (to_player_id, status);

alter table challenges enable row level security;

create policy "Un utilisateur voit les défis qui le concernent"
  on challenges for select
  using (auth.uid() = to_player_id or auth.uid() = from_player_id);

-- Écriture uniquement via create_challenge / respond_challenge (security definer).

alter publication supabase_realtime add table challenges;

-- ------------------------------------------------------------
-- 15. RPC : streak quotidien (partagée par toutes les parties
-- terminées, y compris MULTI-LOCAL)
-- ------------------------------------------------------------
create or replace function touch_daily_streak(p_uid uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_last date;
  v_streak int;
  v_best int;
  v_today date := (now() at time zone 'utc')::date;
begin
  insert into player_stats (uid) values (p_uid)
  on conflict (uid) do nothing;

  select last_played_date, daily_streak, best_daily_streak
  into v_last, v_streak, v_best
  from player_stats where uid = p_uid
  for update;

  if v_last is null or v_last < v_today - 1 then
    v_streak := 1;
  elsif v_last = v_today - 1 then
    v_streak := v_streak + 1;
  end if;
  -- si v_last = v_today : déjà compté aujourd'hui, streak inchangé

  v_best := greatest(v_best, v_streak);

  update player_stats
  set daily_streak = v_streak,
      best_daily_streak = v_best,
      last_played_date = v_today,
      updated_at = now()
  where uid = p_uid;
end;
$$;

-- ------------------------------------------------------------
-- 16. RPC : résultat d'une partie SOLO (ELO "converti en score")
-- Pas d'adversaire : uniquement un gain, jamais une perte, dont
-- l'ampleur dépend de la difficulté et de l'efficacité (nombre de
-- tentatives). Incrémente aussi le win_streak (une partie SOLO
-- terminée est toujours une victoire).
-- ------------------------------------------------------------
create or replace function record_solo_result(
  p_uid uuid,
  p_difficulty text,
  p_attempts int
)
returns table (new_elo int, elo_delta int)
language plpgsql
security definer
as $$
declare
  v_base int;
  v_efficiency numeric;
  v_delta int;
  v_streak int;
  v_best_streak int;
begin
  insert into player_stats (uid) values (p_uid)
  on conflict (uid) do nothing;

  v_base := case p_difficulty
    when 'DEBUTANT' then 15
    when 'NORMAL' then 25
    when 'EXPERT' then 40
    when 'IMPOSSIBLE' then 60
    else 20
  end;

  -- Efficacité : jusqu'à 1.4x pour une victoire en 1 tentative,
  -- décroît de 0.05 par tentative supplémentaire, plancher 0.5x.
  v_efficiency := greatest(0.5, least(1.4, 1.4 - (greatest(p_attempts, 1) - 1) * 0.05));
  v_delta := greatest(1, round(v_base * v_efficiency)::int);

  select win_streak, best_win_streak into v_streak, v_best_streak
  from player_stats where uid = p_uid for update;

  v_streak := coalesce(v_streak, 0) + 1;
  v_best_streak := greatest(coalesce(v_best_streak, 0), v_streak);

  update player_stats
  set elo_rating = elo_rating + v_delta,
      games_played = games_played + 1,
      win_streak = v_streak,
      best_win_streak = v_best_streak,
      updated_at = now()
  where uid = p_uid;

  perform touch_daily_streak(p_uid);

  return query
    select elo_rating, v_delta from player_stats where uid = p_uid;
end;
$$;

-- ------------------------------------------------------------
-- 17. RPC : résultat d'un match MULTI-ONLINE (ELO standard)
-- Idempotente : ne s'applique qu'une fois par arène, quel que
-- soit le nombre de fois où les 2 clients l'appellent
-- (protégée par arenas.elo_processed).
-- ------------------------------------------------------------
alter table arenas add column if not exists elo_processed boolean not null default false;
alter table arenas add column if not exists abandoned_by uuid;

create or replace function record_match_result(p_arena_id text)
returns table (winner_new_elo int, loser_new_elo int, winner_delta int, loser_delta int)
language plpgsql
security definer
as $$
declare
  v_arena record;
  v_players jsonb;
  v_winner_id uuid;
  v_loser_id uuid;
  v_winner_name text;
  v_loser_name text;
  v_winner_elo int;
  v_loser_elo int;
  v_expected_winner numeric;
  v_k int := 32;
  v_delta int;
  v_streak int;
  v_best_streak int;
begin
  select * into v_arena from arenas where id = p_arena_id for update;

  if v_arena.id is null or v_arena.elo_processed or v_arena.winner_id is null then
    return; -- pas trouvée, déjà traitée, ou partie pas terminée
  end if;

  v_players := v_arena.players;
  if jsonb_array_length(v_players) < 2 then
    update arenas set elo_processed = true where id = p_arena_id;
    return;
  end if;

  v_winner_id := v_arena.winner_id;

  select (p->>'id')::uuid, p->>'name' into v_loser_id, v_loser_name
  from jsonb_array_elements(v_players) p
  where (p->>'id')::uuid <> v_winner_id
  limit 1;

  select p->>'name' into v_winner_name
  from jsonb_array_elements(v_players) p
  where (p->>'id')::uuid = v_winner_id
  limit 1;

  if v_loser_id is null then
    update arenas set elo_processed = true where id = p_arena_id;
    return;
  end if;

  insert into player_stats (uid) values (v_winner_id) on conflict (uid) do nothing;
  insert into player_stats (uid) values (v_loser_id) on conflict (uid) do nothing;

  select elo_rating into v_winner_elo from player_stats where uid = v_winner_id for update;
  select elo_rating into v_loser_elo from player_stats where uid = v_loser_id for update;

  -- Formule ELO standard (K=32)
  v_expected_winner := 1.0 / (1.0 + power(10, (v_loser_elo - v_winner_elo) / 400.0));
  v_delta := round(v_k * (1 - v_expected_winner))::int;
  v_delta := greatest(v_delta, 1);

  -- Gagnant : ELO + streak de victoires
  select win_streak, best_win_streak into v_streak, v_best_streak
  from player_stats where uid = v_winner_id;
  v_streak := coalesce(v_streak, 0) + 1;
  v_best_streak := greatest(coalesce(v_best_streak, 0), v_streak);

  update player_stats
  set elo_rating = elo_rating + v_delta,
      games_played = games_played + 1,
      wins = wins + 1,
      win_streak = v_streak,
      best_win_streak = v_best_streak,
      updated_at = now()
  where uid = v_winner_id;

  -- Perdant : ELO - streak remise à zéro
  update player_stats
  set elo_rating = greatest(100, elo_rating - v_delta),
      games_played = games_played + 1,
      win_streak = 0,
      updated_at = now()
  where uid = v_loser_id;

  perform touch_daily_streak(v_winner_id);
  perform touch_daily_streak(v_loser_id);

  -- Ajout automatique en amis (bidirectionnel), idempotent
  insert into friends (player_id, friend_id, friend_name)
  values (v_winner_id, v_loser_id, v_loser_name)
  on conflict (player_id, friend_id) do update set friend_name = excluded.friend_name;

  insert into friends (player_id, friend_id, friend_name)
  values (v_loser_id, v_winner_id, v_winner_name)
  on conflict (player_id, friend_id) do update set friend_name = excluded.friend_name;

  update arenas set elo_processed = true where id = p_arena_id;

  return query
    select
      (select elo_rating from player_stats where uid = v_winner_id),
      (select elo_rating from player_stats where uid = v_loser_id),
      v_delta,
      -v_delta;
end;
$$;

-- ------------------------------------------------------------
-- 18. RPC : classements (global et entre amis)
-- ------------------------------------------------------------
create or replace function get_leaderboard_global(p_limit int default 50)
returns table (
  uid uuid,
  agent_name text,
  elo_rating int,
  wins int,
  games_played int,
  win_streak int
)
language sql
stable
as $$
  select p.uid, coalesce(pr.agent_name, pr.display_name, 'Joueur'), p.elo_rating, p.wins, p.games_played, p.win_streak
  from player_stats p
  join profiles pr on pr.uid = p.uid
  order by p.elo_rating desc
  limit p_limit;
$$;

create or replace function get_leaderboard_friends(p_uid uuid)
returns table (
  uid uuid,
  agent_name text,
  elo_rating int,
  wins int,
  games_played int,
  win_streak int
)
language sql
stable
as $$
  select p.uid, coalesce(pr.agent_name, pr.display_name, 'Joueur'), p.elo_rating, p.wins, p.games_played, p.win_streak
  from player_stats p
  join profiles pr on pr.uid = p.uid
  where p.uid = p_uid
     or p.uid in (select friend_id from friends where player_id = p_uid)
  order by p.elo_rating desc;
$$;

-- Rang global d'un joueur (pour afficher "#123" même hors du top N)
create or replace function get_my_rank(p_uid uuid)
returns int
language sql
stable
as $$
  select count(*)::int + 1
  from player_stats
  where elo_rating > (select elo_rating from player_stats where uid = p_uid);
$$;

-- ------------------------------------------------------------
-- 19. RPC : défi direct d'un ami (crée l'arène + le défi en un appel)
-- ------------------------------------------------------------
create or replace function create_challenge(p_to_uid uuid, p_to_name text, p_from_name text)
returns table (arena_id text, secret_code text, challenge_id uuid)
language plpgsql
security definer
as $$
declare
  v_arena_id text;
  v_secret_code text;
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
  v_challenge_id uuid;
  v_from_uid uuid := auth.uid();
begin
  if v_from_uid is null or v_from_uid = p_to_uid then
    raise exception 'Défi invalide';
  end if;

  v_arena_id := 'ARENA-' || upper(substr(md5(random()::text), 1, 6));
  v_secret_code := lpad((floor(random() * 10000))::text, 4, '0');

  insert into arenas (
    id, secret_code, creator_id, creator_name, players, status,
    created_at_ms, expires_at_ms, last_updated_ms, game_started, attempts
  ) values (
    v_arena_id, v_secret_code, v_from_uid, p_from_name,
    jsonb_build_array(jsonb_build_object('id', v_from_uid, 'name', p_from_name, 'joinedAt', v_now)),
    'waiting', v_now, v_now + 5 * 60 * 1000, v_now, false, '[]'::jsonb
  );

  insert into challenges (from_player_id, from_player_name, to_player_id, arena_id)
  values (v_from_uid, p_from_name, p_to_uid, v_arena_id)
  returning id into v_challenge_id;

  return query select v_arena_id, v_secret_code, v_challenge_id;
end;
$$;

-- Répondre à un défi (accepter/refuser) — l'acceptation renvoie les
-- infos nécessaires pour que le client rejoigne l'arène via le flux
-- existant (improvedArenaService.joinArena), sans dupliquer cette
-- logique côté SQL.
create or replace function respond_challenge(p_challenge_id uuid, p_accept boolean)
returns table (arena_id text)
language plpgsql
security definer
as $$
declare
  v_challenge record;
begin
  select * into v_challenge from challenges where id = p_challenge_id for update;

  if v_challenge.id is null or v_challenge.to_player_id <> auth.uid() or v_challenge.status <> 'pending' then
    return;
  end if;

  update challenges
  set status = case when p_accept then 'accepted' else 'declined' end
  where id = p_challenge_id;

  if p_accept then
    return query select v_challenge.arena_id;
  end if;
end;
$$;
