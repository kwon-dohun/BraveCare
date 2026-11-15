-- 퇴원노트 DB 스키마 (Supabase / Postgres). 새 프로젝트에 그대로 실행하면 된다.
-- 모든 접근은 서버(service role)만 한다. RLS를 켜고 정책을 두지 않아 공개 키로는 아무것도 읽히지 않는다.

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  admin_token text not null unique,
  share_token text not null unique,
  share_expires_at timestamptz not null default now() + interval '7 days',
  input jsonb not null,
  consent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin','member')),
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('prep','question','schedule','admin','custom')),
  due_date date,
  rel_day int, -- 퇴원일 기준 D±n. null이면 사용자가 날짜를 직접 정한 것(퇴원일 변경을 따라가지 않음)
  assignee_id uuid references public.members(id) on delete set null,
  done boolean not null default false,
  done_at timestamptz,
  done_by text,
  memo text,
  source text not null check (source in ('template','doc','manual','benefit')),
  source_quote text, -- 안내문에서 온 항목의 원문
  created_at timestamptz not null default now()
);

create table public.benefit_status (
  case_id uuid not null references public.cases(id) on delete cascade,
  benefit_id text not null,
  status text not null default 'none' check (status in ('none','applied','approved','rejected','dropped')),
  docs_checked jsonb not null default '[]'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (case_id, benefit_id)
);

create table public.activity (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- KPI용 이벤트 로그. 개인 식별 정보(이름·토큰)는 넣지 않는다.
create table public.events (
  id bigint generated always as identity primary key,
  case_id uuid,
  name text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index on public.members(case_id);
create index on public.tasks(case_id);
create index on public.activity(case_id, created_at desc);
create index on public.events(case_id, name, created_at);

alter table public.cases enable row level security;
alter table public.members enable row level security;
alter table public.tasks enable row level security;
alter table public.benefit_status enable row level security;
alter table public.activity enable row level security;
alter table public.events enable row level security;
