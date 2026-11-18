-- 씩씩케어 DB 스키마 (Supabase / Postgres). 새 프로젝트에 그대로 실행하면 된다.
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

-- ---- 씩씩케어 확장 (2026-11-16) ----
-- 보험 청구 서류: 입원 병원, 실손24 지원 여부, 받아둔 서류
alter table public.cases
  add column if not exists hospital text,
  add column if not exists silson24 text check (silson24 in ('yes','no')),
  add column if not exists docs_checked jsonb not null default '[]'::jsonb;

-- 저녁 안부 체크. 하루 한 줄.
create table if not exists public.daily_checks (
  case_id uuid not null references public.cases(id) on delete cascade,
  check_date date not null,
  med_morning boolean not null default false,
  med_lunch boolean not null default false,
  med_dinner boolean not null default false,
  side_effect boolean not null default false,
  temp text not null default 'normal' check (temp in ('normal','mild','high')),
  temp_c numeric(3,1) check (temp_c is null or temp_c between 35 and 42), -- 미열·고열일 때 잰 체온(℃)
  wound_issue boolean not null default false,
  pain int not null default 0 check (pain between 0 and 10),
  bowel text not null default 'good' check (bowel in ('good','constipation','diarrhea')),
  notes text,
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (case_id, check_date)
);

-- 서류에서 옮겨 적은 글자. 원본 사진은 저장하지 않는다. 챗봇은 이 글자만 근거로 답한다.
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  doc_type text not null check (doc_type in ('receipt','medication','guide','certificate','message','other')),
  transcript text not null,
  created_at timestamptz not null default now()
);
create index if not exists documents_case_idx on public.documents(case_id, created_at desc);

alter table public.daily_checks enable row level security;
alter table public.documents enable row level security;

-- ---- 출시 준비 (2026-11-16) ----
-- 카카오 로그인(되찾기)은 카카오 회원번호만, 앱 푸시는 기기 토큰만 둔다. seen_at은 새 소식을 마지막으로 본 시각.
alter table public.members
  add column if not exists kakao_id text,
  add column if not exists push_token text,
  add column if not exists seen_at timestamptz not null default now();

-- ---- 환자 중심 케어 모드 확장 (2026-11-17) ----
-- 1. cases: 환자 전용 안부 링크 토큰(/p/<토큰>) 및 1인 가구 셀프 케어 여부
alter table public.cases
  add column if not exists patient_token text unique,
  add column if not exists is_self_care boolean not null default false;

-- 2. daily_checks: 기록 주체 구분 (가족 대리 기록 vs 환자 본인 직접 기록)
alter table public.daily_checks
  add column if not exists source_role text not null default 'family' check (source_role in ('family', 'patient'));
create index if not exists members_kakao_idx on public.members(kakao_id);

-- 할 일 시간(외래 오후 2시)과 반복(매일 소독). 반복은 완료할 때 다음 회차를 새로 만든다.
alter table public.tasks
  add column if not exists due_time time,
  add column if not exists repeat text check (repeat in ('daily','weekly'));

-- 누가 한 일인지. 내가 한 일은 내 새 소식에서 뺀다.
alter table public.activity
  add column if not exists member_id uuid references public.members(id) on delete set null;

-- ---- 자동 파기 (2026-11-16) ----
-- 마지막 이용일로부터 keep_days(기본 365일)가 지난 케이스를 모든 기록과 함께 지운다. dry=true면 지우지 않고 대상 수만 돌려준다.
-- 마지막 이용일 = 케이스 생성·가족 활동·이벤트(화면 열기 포함)·안부 기록·할 일 완료 중 가장 늦은 시각. 매일 /api/cron/purge가 부른다.
create or replace function public.purge_inactive_cases(keep_days int default 365, dry boolean default false)
returns int
language plpgsql
set search_path = public
as $$
declare n int;
begin
  if keep_days < 180 then
    raise exception 'keep_days는 180일 이상이어야 해요 (실수로 전부 지우는 것을 막는 안전장치)';
  end if;

  create temp table _gone on commit drop as
    select c.id from cases c
    where greatest(
      c.created_at,
      coalesce((select max(a.created_at) from activity a where a.case_id = c.id), c.created_at),
      coalesce((select max(e.created_at) from events e where e.case_id = c.id), c.created_at),
      coalesce((select max(d.updated_at) from daily_checks d where d.case_id = c.id), c.created_at),
      coalesce((select max(t.done_at) from tasks t where t.case_id = c.id), c.created_at)
    ) < now() - make_interval(days => keep_days);

  select count(*) into n from _gone;
  if not dry then
    delete from events where case_id in (select id from _gone);  -- 이벤트는 외래키가 없어 따로 지운다
    delete from cases where id in (select id from _gone);        -- 나머지는 on delete cascade
  end if;
  return n;
end;
$$;

revoke all on function public.purge_inactive_cases(int, boolean) from public, anon, authenticated;
grant execute on function public.purge_inactive_cases(int, boolean) to service_role;

-- 찜한 지원(구성원별). 기본 지원은 b:<id>, 추가 확인처는 x:<id>. 케이스·구성원이 지워지면 함께 지워진다.
create table if not exists saved_benefits (
  member_id uuid not null references members(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  item text not null check (item ~ '^(b|x):[a-z0-9_]{1,60}$'),
  created_at timestamptz not null default now(),
  primary key (member_id, item)
);
create index if not exists saved_benefits_case_idx on saved_benefits(case_id);
alter table saved_benefits enable row level security;

-- ---- 운영 DB 반영 누락분 (2026-11-17) ----
-- 위 create table에는 있었지만 이미 만든 DB에는 없던 것. 같은 문장을 다시 돌려도 안전하다.
alter table public.daily_checks add column if not exists notes text;
alter table public.documents drop constraint if exists documents_doc_type_check;
alter table public.documents add constraint documents_doc_type_check check (doc_type in ('receipt','medication','guide','certificate','message','other'));

-- 서류함 정리본 (2026-11-17): 원문에서 그대로 옮긴 핵심 줄만 [{label, value}]. 원문(transcript)은 그대로 둔다.
alter table public.documents add column if not exists summary jsonb;
-- 서류 양식 (2026-11-17): 종류별 칸 {values, meds}. AI가 원문에서 채우고 사람이 확인·수정한다. confirmed_at이 있으면 사람이 확인한 값.
alter table public.documents add column if not exists fields jsonb, add column if not exists confirmed_at timestamptz;

-- 지원 제도와 이어진 할 일 (lib/benefits의 id). null이면 지원과 무관
alter table public.tasks add column if not exists benefit_id text;
