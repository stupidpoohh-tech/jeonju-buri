-- 전주BURI 기와 초콜릿 소비자 설문 — Cloudflare D1(SQLite) 스키마
-- 기존 서비스에는 데이터베이스가 없으므로 설문 전용 D1 데이터베이스에 적용합니다.
-- 적용: npx wrangler d1 execute <DB 이름> --remote --file=survey/db/schema.sql
-- 선택지 값은 survey/schema.js의 고정 코드로 저장합니다(표시 문구는 schema.js에서 매핑).
-- 다중 선택은 JSON 배열 문자열로 저장합니다.

-- 응답자 1명 = 1행
CREATE TABLE IF NOT EXISTS survey_responses (
  id                       TEXT PRIMARY KEY,          -- 고유 응답 ID(UUID)
  survey_version           TEXT NOT NULL,
  submitted_at             TEXT NOT NULL,             -- 서버 수신 시각(ISO 8601, UTC)
  started_at               TEXT,                      -- 설문 시작 시각(브라우저 기준)
  duration_sec             INTEGER,                   -- 시작~제출 소요시간(초), 비정상 값은 NULL
  age_group                TEXT NOT NULL,             -- Q1
  jeonju_visit             TEXT NOT NULL,             -- Q2
  moju_experience          TEXT NOT NULL,             -- Q3
  best_taste               TEXT NOT NULL,             -- Q16
  most_unique              TEXT NOT NULL,             -- Q17
  souvenir_fit             TEXT NOT NULL,             -- Q19
  device_prior_submissions INTEGER NOT NULL DEFAULT 0 -- 같은 브라우저에서 이전에 제출한 횟수(재참여 구분용)
);
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted ON survey_responses (submitted_at);

-- 응답자 1명 × 맛 3종 = 3행
CREATE TABLE IF NOT EXISTS survey_flavor_ratings (
  response_id          TEXT NOT NULL REFERENCES survey_responses (id) ON DELETE CASCADE,
  flavor               TEXT NOT NULL CHECK (flavor IN ('moju', 'lotus', 'coffee')),
  satisfaction         INTEGER NOT NULL CHECK (satisfaction BETWEEN 1 AND 5), -- 1 매우 불만족 ~ 5 매우 만족
  sweetness            INTEGER NOT NULL CHECK (sweetness BETWEEN 1 AND 5),    -- 1 지나치게 약함 ~ 5 지나치게 강함
  aroma                INTEGER NOT NULL CHECK (aroma BETWEEN 1 AND 5),        -- 1 지나치게 약함 ~ 5 지나치게 강함
  improvements         TEXT NOT NULL,                                         -- JSON 배열
  improvements_other   TEXT,
  concept_fit          INTEGER NOT NULL CHECK (concept_fit BETWEEN 1 AND 5),  -- Q18
  improvement_comment  TEXT,                                                  -- Q20
  PRIMARY KEY (response_id, flavor)
);
CREATE INDEX IF NOT EXISTS idx_survey_flavor_ratings_flavor ON survey_flavor_ratings (flavor);

-- 응답자 1명 = 1행
CREATE TABLE IF NOT EXISTS survey_purchase_intent (
  response_id              TEXT PRIMARY KEY REFERENCES survey_responses (id) ON DELETE CASCADE,
  souv_freq                TEXT NOT NULL,    -- Q21
  souv_spend               TEXT NOT NULL,    -- Q22
  souv_target              TEXT NOT NULL,    -- Q23 JSON 배열
  souv_criteria            TEXT NOT NULL,    -- Q24 JSON 배열(2개)
  souv_criteria_other      TEXT,
  wtp_amount               INTEGER,          -- Q25 원 단위, 구매 의향 없음이면 NULL
  wtp_no_intent            INTEGER NOT NULL, -- Q25 가격과 관계없이 구매 의향 없음(1/0)
  wtp_revised_after_price  INTEGER NOT NULL DEFAULT 0, -- 가격 안내 이후 Q25를 수정했는지(1/0)
  intent_27900             TEXT NOT NULL,    -- Q26
  choice_30000             TEXT NOT NULL,    -- Q27
  reason_not               TEXT NOT NULL,    -- Q28 JSON 배열(Q27 비선택자만)
  reason_not_other         TEXT,
  reason_buy               TEXT NOT NULL,    -- Q29 JSON 배열(Q27 선택자만)
  reason_buy_other         TEXT,
  info_needed              TEXT NOT NULL,    -- Q30 JSON 배열
  info_needed_other        TEXT,
  improve_priority         TEXT NOT NULL,    -- Q31
  improve_priority_other   TEXT,
  hesitation               TEXT NOT NULL,    -- Q32
  use_occasion             TEXT NOT NULL,    -- Q33
  channel                  TEXT NOT NULL,    -- Q34
  online_intent            TEXT NOT NULL,    -- Q35
  final_comment            TEXT              -- Q36
);
