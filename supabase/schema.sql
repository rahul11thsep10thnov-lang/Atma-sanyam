-- PoliceExams — Supabase / PostgreSQL schema
-- Run this in the Supabase SQL editor (or `supabase db push`) on a fresh
-- project. Safe to re-run: every statement is guarded with IF NOT EXISTS /
-- OR REPLACE where possible.
--
-- Content tables (states, subjects, exams, exam_configs, questions, ...)
-- are readable by everyone but writable only by admins. User-owned tables
-- (test_attempts, bookmarks, wrong_questions, ...) are readable/writable
-- only by their owner. See the RLS policies at the bottom of this file.

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================
do $$ begin
  create type exam_type as enum ('constable', 'si');
exception when duplicate_object then null; end $$;

do $$ begin
  create type difficulty_level as enum ('easy', 'moderate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type question_status as enum ('draft', 'under_review', 'approved', 'published', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_reason as enum (
    'wrong_answer', 'wrong_question', 'poor_explanation',
    'out_of_syllabus', 'too_difficult', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('open', 'reviewed', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mock_type as enum ('full', 'subject', 'topic', 'state_gk', 'police_gk', 'current_affairs');
exception when duplicate_object then null; end $$;

do $$ begin
  create type update_type as enum (
    'notification', 'application', 'correction', 'admit_card', 'exam_date',
    'answer_key', 'result', 'cutoff', 'physical_test', 'document_verification'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ca_category as enum ('daily', 'weekly', 'monthly', 'state', 'police');
exception when duplicate_object then null; end $$;

do $$ begin
  create type leaderboard_period as enum ('weekly', 'monthly', 'state');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

-- ============================================================
-- Core reference tables
-- ============================================================
create table if not exists public.states (
  code text primary key,
  name text not null,
  hinglish_name text not null,
  capital text not null,
  formation_year int,
  total_districts int,
  high_court text,
  police_board_name text,
  police_board_short text
);

create table if not exists public.subjects (
  id text primary key,
  name text not null,
  hinglish_name text not null
);

create table if not exists public.topics (
  id text primary key,
  subject_id text not null references public.subjects(id) on delete cascade,
  name text not null
);

-- profiles: 1-1 with auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role user_role not null default 'user',
  points int not null default 0,
  streak_count int not null default 0,
  last_quiz_date date,
  home_state text references public.states(code),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Exam catalog + configuration
-- ============================================================
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  state_code text not null references public.states(code) on delete cascade,
  exam_type exam_type not null,
  slug text unique not null,
  title text not null,
  created_at timestamptz not null default now(),
  unique (state_code, exam_type)
);

create table if not exists public.exam_configs (
  exam_id uuid primary key references public.exams(id) on delete cascade,
  overview text,
  eligibility text,
  age_limit_text text,
  educational_qualification_text text,
  vacancy int,
  vacancy_source_note text default 'Official notification ka wait karein.',
  application_start date,
  application_end date,
  exam_date date,
  pattern jsonb not null default '{}'::jsonb,
  syllabus jsonb not null default '[]'::jsonb,
  physical_standards jsonb not null default '[]'::jsonb,
  physical_efficiency jsonb not null default '[]'::jsonb,
  medical_requirements text,
  selection_process jsonb not null default '[]'::jsonb,
  cutoff_note text default 'Official notification ka wait karein.',
  admit_card_note text,
  result_note text default 'Official notification ka wait karein.',
  official_notification_url text,
  last_verified text,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Questions
-- ============================================================
create table if not exists public.questions (
  id text primary key,
  state_code text not null references public.states(code),
  exam_type exam_type not null,
  subject_id text not null references public.subjects(id),
  topic text not null,
  difficulty difficulty_level not null,
  question text not null,
  correct_answer smallint not null check (correct_answer between 0 and 3),
  explanation text not null,
  source text not null,
  year int,
  language text not null default 'hinglish',
  tags text[] not null default '{}',
  status question_status not null default 'draft',
  is_sample boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references public.questions(id) on delete cascade,
  option_key char(1) not null check (option_key in ('A', 'B', 'C', 'D')),
  option_text text not null,
  unique (question_id, option_key)
);

create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references public.questions(id) on delete cascade,
  user_id uuid references public.profiles(id),
  reason report_reason not null,
  note text,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);

-- ============================================================
-- PYQ
-- ============================================================
create table if not exists public.pyq_papers (
  id text primary key,
  state_code text not null references public.states(code),
  exam_type exam_type not null,
  year int not null,
  shift text,
  title text not null,
  is_sample boolean not null default true
);

create table if not exists public.pyq_questions (
  pyq_paper_id text not null references public.pyq_papers(id) on delete cascade,
  question_id text not null references public.questions(id) on delete cascade,
  position int not null,
  primary key (pyq_paper_id, question_id)
);

-- ============================================================
-- Mock tests
-- ============================================================
create table if not exists public.mock_tests (
  id text primary key,
  state_code text not null references public.states(code),
  exam_type exam_type not null,
  title text not null,
  type mock_type not null,
  subject_id text references public.subjects(id),
  question_count int not null,
  duration_minutes int not null,
  marks_per_question numeric not null default 2,
  negative_marks numeric not null default 0
);

create table if not exists public.mock_questions (
  mock_test_id text not null references public.mock_tests(id) on delete cascade,
  question_id text not null references public.questions(id) on delete cascade,
  position int not null,
  primary key (mock_test_id, question_id)
);

-- ============================================================
-- Attempts (mock tests, PYQ, quick practice, daily quiz)
-- ============================================================
create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  mock_test_id text references public.mock_tests(id),
  pyq_paper_id text references public.pyq_papers(id),
  attempt_type text not null default 'mock', -- mock | pyq | practice | daily_quiz
  score numeric not null default 0,
  correct int not null default 0,
  incorrect int not null default 0,
  skipped int not null default 0,
  accuracy numeric not null default 0,
  time_taken_seconds int not null default 0,
  submitted_at timestamptz not null default now()
);

create table if not exists public.test_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  question_id text not null references public.questions(id),
  selected smallint,
  marked_for_review boolean not null default false,
  time_taken_seconds int not null default 0,
  is_correct boolean not null default false
);

-- ============================================================
-- Study notes / current affairs / exam updates / physical requirements
-- ============================================================
create table if not exists public.study_notes (
  id text primary key,
  slug text unique not null,
  title text not null,
  subject_id text not null references public.subjects(id),
  state_code text references public.states(code),
  quick_concept text,
  important_facts text[] not null default '{}',
  revision text[] not null default '{}',
  practice_question_ids text[] not null default '{}'
);

create table if not exists public.current_affairs (
  id text primary key,
  date date not null,
  category ca_category not null,
  state_code text references public.states(code),
  title text not null,
  summary text not null,
  source text not null
);

create table if not exists public.exam_updates (
  id text primary key,
  state_code text not null references public.states(code),
  exam_type exam_type not null,
  type update_type not null,
  title text not null,
  date date not null,
  status text not null,
  source text not null,
  is_sample boolean not null default true
);

create table if not exists public.physical_requirements (
  id uuid primary key default gen_random_uuid(),
  state_code text not null references public.states(code),
  exam_type exam_type not null,
  category text not null,
  height text,
  chest text,
  weight text,
  pet_event text,
  pet_standard text
);

-- ============================================================
-- User-generated: bookmarks, wrong questions, leaderboard, badges
-- ============================================================
create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null references public.questions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists public.wrong_questions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null references public.questions(id) on delete cascade,
  wrong_count int not null default 1,
  last_wrong_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period leaderboard_period not null,
  period_key text not null, -- e.g. '2026-W03', '2026-01', or a state code
  state_code text references public.states(code),
  points int not null default 0,
  questions_attempted int not null default 0,
  accuracy numeric not null default 0,
  unique (user_id, period, period_key)
);

create table if not exists public.badges (
  id text primary key,
  code text unique not null,
  name text not null,
  description text not null,
  icon text
);

create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ============================================================
-- Helper function: is the current user an admin?
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.states enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.profiles enable row level security;
alter table public.exams enable row level security;
alter table public.exam_configs enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.question_reports enable row level security;
alter table public.pyq_papers enable row level security;
alter table public.pyq_questions enable row level security;
alter table public.mock_tests enable row level security;
alter table public.mock_questions enable row level security;
alter table public.test_attempts enable row level security;
alter table public.test_answers enable row level security;
alter table public.study_notes enable row level security;
alter table public.current_affairs enable row level security;
alter table public.exam_updates enable row level security;
alter table public.physical_requirements enable row level security;
alter table public.bookmarks enable row level security;
alter table public.wrong_questions enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

-- Public read-only content
create policy "public read states" on public.states for select using (true);
create policy "public read subjects" on public.subjects for select using (true);
create policy "public read topics" on public.topics for select using (true);
create policy "public read exams" on public.exams for select using (true);
create policy "public read exam_configs" on public.exam_configs for select using (true);
create policy "public read published questions" on public.questions
  for select using (status = 'published' or public.is_admin());
create policy "public read question_options" on public.question_options for select using (true);
create policy "public read pyq_papers" on public.pyq_papers for select using (true);
create policy "public read pyq_questions" on public.pyq_questions for select using (true);
create policy "public read mock_tests" on public.mock_tests for select using (true);
create policy "public read mock_questions" on public.mock_questions for select using (true);
create policy "public read study_notes" on public.study_notes for select using (true);
create policy "public read current_affairs" on public.current_affairs for select using (true);
create policy "public read exam_updates" on public.exam_updates for select using (true);
create policy "public read physical_requirements" on public.physical_requirements for select using (true);
create policy "public read badges" on public.badges for select using (true);

-- Admin-only writes on content tables
create policy "admin write states" on public.states for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write subjects" on public.subjects for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write topics" on public.topics for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write exams" on public.exams for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write exam_configs" on public.exam_configs for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write questions" on public.questions for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write question_options" on public.question_options for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write pyq_papers" on public.pyq_papers for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write pyq_questions" on public.pyq_questions for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write mock_tests" on public.mock_tests for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write mock_questions" on public.mock_questions for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write study_notes" on public.study_notes for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write current_affairs" on public.current_affairs for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write exam_updates" on public.exam_updates for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write physical_requirements" on public.physical_requirements for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write badges" on public.badges for all using (public.is_admin()) with check (public.is_admin());

-- Profiles: user reads/updates own row; admin reads all
create policy "read own profile" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Question reports: any signed-in user can file; user sees own, admin sees all
create policy "insert own report" on public.question_reports for insert with check (auth.uid() = user_id or user_id is null);
create policy "read own or admin reports" on public.question_reports for select using (auth.uid() = user_id or public.is_admin());
create policy "admin update reports" on public.question_reports for update using (public.is_admin());

-- Test attempts / answers: owner only (+ admin read)
create policy "own attempts select" on public.test_attempts for select using (auth.uid() = user_id or public.is_admin());
create policy "own attempts insert" on public.test_attempts for insert with check (auth.uid() = user_id or user_id is null);
create policy "own answers select" on public.test_answers for select using (
  exists (select 1 from public.test_attempts a where a.id = attempt_id and (a.user_id = auth.uid() or public.is_admin()))
);
create policy "own answers insert" on public.test_answers for insert with check (
  exists (select 1 from public.test_attempts a where a.id = attempt_id and (a.user_id = auth.uid() or a.user_id is null))
);

-- Bookmarks / wrong questions: owner only
create policy "own bookmarks" on public.bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own wrong_questions" on public.wrong_questions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Leaderboard: everyone can read (public ranking), only the system/admin writes
create policy "public read leaderboard" on public.leaderboard_entries for select using (true);
create policy "admin write leaderboard" on public.leaderboard_entries for all using (public.is_admin()) with check (public.is_admin());

-- User badges: owner + admin read, admin writes (awarded server-side)
create policy "read own or admin user_badges" on public.user_badges for select using (auth.uid() = user_id or public.is_admin());
create policy "admin write user_badges" on public.user_badges for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_questions_state_exam on public.questions(state_code, exam_type);
create index if not exists idx_questions_subject on public.questions(subject_id);
create index if not exists idx_questions_status on public.questions(status);
create index if not exists idx_test_attempts_user on public.test_attempts(user_id);
create index if not exists idx_test_answers_attempt on public.test_answers(attempt_id);
create index if not exists idx_exam_updates_state_exam on public.exam_updates(state_code, exam_type);
create index if not exists idx_current_affairs_date on public.current_affairs(date desc);
create index if not exists idx_leaderboard_period on public.leaderboard_entries(period, period_key);
