-- 전주BURI 기와 초콜릿 소비자 설문 — Cloudflare D1(SQLite) 스키마 (설문 버전 2026-11-v5)
-- 기존 서비스에는 데이터베이스가 없으므로 설문 전용 D1 데이터베이스에 적용합니다.
-- 적용: npx wrangler d1 execute <DB 이름> --remote --file=survey/db/schema.sql
-- 선택지 값은 survey/schema.js의 고정 코드로 저장합니다(표시 문구는 schema.js에서 매핑).
-- 다중 선택은 JSON 배열 문자열로 저장합니다.

-- 응답자 1명 = 1행
CREATE TABLE IF NOT EXISTS survey_responses (
  id                       TEXT PRIMARY KEY,          -- 고유 응답 ID(UUID)
  survey_version           TEXT NOT NULL,
  prototype_version        TEXT,                      -- 시식 시제품 버전(v5에서 추가)
  survey_language          TEXT,                      -- 응답 언어 ko | en (v5에서 추가, 이전 응답은 NULL = 한국어)
  survey_source            TEXT,                      -- 조사 경로 office | hanok | general (QR 배포 경로, v5에서 추가)
  submitted_at             TEXT NOT NULL,             -- 서버 수신 시각(ISO 8601, UTC)
  started_at               TEXT,                      -- 설문 시작 시각(브라우저 기준)
  duration_sec             INTEGER,                   -- 시작~제출 소요시간(초), 비정상 값은 NULL
  age_group                TEXT NOT NULL,             -- Q1
  gender                   TEXT,                      -- Q2 여성/남성 (v4에서 추가, 이전 응답은 NULL)
  occupation               TEXT,                      -- Q3 직장인/학생/기타 (v3에서 추가, 이전 응답은 NULL)
  occupation_other         TEXT,                      -- Q3 기타 내용
  residence                TEXT NOT NULL,             -- Q4
  residence_country        TEXT,                      -- Q4-1 거주국가 ISO 3166-1 alpha-2(국내 거주는 KR, 목록 외는 other) (v5에서 추가)
  residence_country_other  TEXT,                      -- Q4-1 목록에 없는 국가 직접 입력
  jeonju_visit             TEXT NOT NULL,             -- Q5
  moju_experience          TEXT NOT NULL,             -- Q6
  best_taste               TEXT NOT NULL,             -- Q19
  most_unique              TEXT NOT NULL,             -- Q20
  souvenir_fit             TEXT NOT NULL,             -- Q22 JSON 배열(v4부터 복수 선택, 이전 응답은 단일 코드 문자열)
  device_prior_submissions INTEGER NOT NULL DEFAULT 0 -- 같은 브라우저에서 이전에 제출한 횟수(재참여 구분용)
);
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted ON survey_responses (submitted_at);

-- 응답자 1명 × 맛 3종 = 3행
CREATE TABLE IF NOT EXISTS survey_flavor_ratings (
  response_id          TEXT NOT NULL REFERENCES survey_responses (id) ON DELETE CASCADE,
  flavor               TEXT NOT NULL CHECK (flavor IN ('moju', 'lotus', 'coffee')),
  satisfaction         INTEGER NOT NULL CHECK (satisfaction BETWEEN 1 AND 5), -- Q7·Q11·Q15  1 매우 불만족 ~ 5 매우 만족
  sweetness            INTEGER NOT NULL CHECK (sweetness BETWEEN 1 AND 5),    -- Q8·Q12·Q16 1 지나치게 약함 ~ 5 지나치게 강함
  aroma                INTEGER NOT NULL CHECK (aroma BETWEEN 1 AND 5),        -- Q9·Q13·Q17 1 지나치게 약함 ~ 5 지나치게 강함
  improvements         TEXT NOT NULL,                                         -- Q10·Q14·Q18 JSON 배열
  improvements_other   TEXT,
  concept_fit          INTEGER NOT NULL CHECK (concept_fit BETWEEN 1 AND 5),  -- Q21 제품명 기대 적합도
  PRIMARY KEY (response_id, flavor)
);
CREATE INDEX IF NOT EXISTS idx_survey_flavor_ratings_flavor ON survey_flavor_ratings (flavor);

-- 응답자 1명 = 1행
CREATE TABLE IF NOT EXISTS survey_purchase_intent (
  response_id              TEXT PRIMARY KEY REFERENCES survey_responses (id) ON DELETE CASCADE,
  souv_freq                TEXT NOT NULL,    -- Q23
  souv_spend_amount        INTEGER,          -- Q24 원 단위(Q23 '구매한 적 없음'이면 NULL)
  souv_spend_unknown       INTEGER,          -- Q24 금액 기억 안 남(1/0, 비해당이면 NULL)
  souv_target              TEXT NOT NULL,    -- Q25 JSON 배열
  souv_criteria            TEXT NOT NULL,    -- Q26 JSON 배열(2개 또는 '구매할 생각 없음' 1개)
  souv_criteria_other      TEXT,
  wtp_amount               INTEGER,          -- Q27 원 단위, 구매 의향 없음이면 NULL
  wtp_no_intent            INTEGER NOT NULL, -- Q27 가격과 관계없이 구매 의향 없음(1/0)
  wtp_revised_after_price  INTEGER NOT NULL DEFAULT 0, -- 가격 공개 이후 Q27를 수정했는지(1/0)
  intent_27900             TEXT NOT NULL,    -- Q28
  choice_30000             TEXT NOT NULL,    -- Q29
  reason_buy               TEXT NOT NULL,    -- Q30① JSON 배열(최대 2개, Q29 전주BURI 선택자만)
  reason_buy_other         TEXT,
  reason_not               TEXT NOT NULL,    -- Q30② JSON 배열(최대 2개, Q29 그 외 선택자만)
  reason_not_other         TEXT,
  lower_price_intent       TEXT,             -- Q30-1 1만 원대 중반 제품 라인 구매의향(Q30②에서 가격 관련 이유 선택자만, v4에서 추가)
  info_needed              TEXT NOT NULL,    -- Q31 1개 선택
  info_needed_other        TEXT,
  improve_priority         TEXT NOT NULL,    -- Q32 1개 선택
  improve_priority_other   TEXT,
  use_occasion             TEXT NOT NULL,    -- Q33 JSON 배열(v4부터 복수 선택, 이전 응답은 단일 코드 문자열)
  channel                  TEXT NOT NULL,    -- Q34
  online_intent            TEXT NOT NULL,    -- Q35
  final_comment            TEXT              -- Q36
);
