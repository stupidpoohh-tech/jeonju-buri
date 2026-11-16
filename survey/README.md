# 전주BURI 기와 초콜릿 소비자 설문

기존 홈페이지(`index.html`, `app.js`, `styles.css`, `editorial.css`, `products.js`, `assets/`)와 분리된 설문 전용 모듈입니다. 기존 파일은 수정하지 않았습니다.

| 경로 | 내용 |
|---|---|
| `/survey/` | 언어 선택 화면(한국어 / English) |
| `/survey/ko/` | 한국어 설문(로그인 없음, 모바일 우선) |
| `/survey/en/` | 영어 설문(문항·선택지·척도·조건은 한국어와 동일) |
| `/survey/admin/` | 관리자 대시보드(비밀번호 인증, 한국어) |
| `POST /api/survey/responses` | 응답 제출(서버 재검증 후 D1 저장) |
| `GET /api/survey/admin/responses` | 전체 응답 조회(관리자) |
| `GET /api/survey/admin/export?type=respondents\|flavors` | CSV 다운로드(관리자, UTF-8 BOM) |

## 조사 경로별 QR코드 URL

| 용도 | URL |
|---|---|
| 회사 조사 | `https://jeonju-buri.pages.dev/survey?source=office` |
| 한옥마을 현장 조사 | `https://jeonju-buri.pages.dev/survey?source=hanok` |
| 일반 접속 | `https://jeonju-buri.pages.dev/survey` |

모두 언어 선택 화면으로 연결되며, 언어를 고른 뒤에도 `source`가 유지됩니다(예: `/survey/en/?source=hanok`). `source`는 QR 배포 경로를 구분하는 운영용 값이며, 응답자의 위치·국적을 뜻하지 않습니다. 정해진 값(office, hanok) 외에는 general로 저장합니다.

## 파일

- `survey/schema.js` — 문항·선택지 코드·고정 문항 ID·조건·검증 규칙(한국어 원문). 설문 화면, 관리자 화면, 서버가 같은 파일을 사용합니다.
- `survey/i18n.js` — 다국어 리소스. 화면 문구(한·영)와 영어 문항·선택지 문구를 문항 ID·선택지 코드 기준으로 매핑합니다. `missingTranslations()`로 영어 누락을 검사합니다.
- `survey/index.html` — 언어 선택 화면, `survey/ko/index.html`·`survey/en/index.html` — 언어별 설문 진입점(같은 `app.js` 사용)
- `survey/index.html`, `survey/app.js`, `survey/survey.css` — 설문 화면
- `survey/admin/` — 관리자 화면
- `survey/db/migrations/2026-11-v5-multilingual.sql` — 운영 DB에 적용할 v5 열 추가 문(한 줄에 한 문장, D1 콘솔에서 한 줄씩 실행)
- `survey/db/schema.sql` — D1 테이블 정의(`survey_responses`, `survey_flavor_ratings`, `survey_purchase_intent`)
- `functions/api/survey/` — Cloudflare Pages Functions(서버). `_lib.js`는 공용 도구이며 라우트가 아닙니다.

## 배포 설정(Cloudflare Pages)

저장소에 `wrangler.toml`을 두지 않았습니다. 대시보드 설정을 그대로 유지하기 위해서입니다.

1. D1 데이터베이스 생성: Cloudflare 대시보드 → Workers & Pages → D1 → Create (예: `buri-survey`)
2. 테이블 생성: D1 콘솔에 `survey/db/schema.sql` 내용을 실행하거나
   `npx wrangler d1 execute buri-survey --remote --file=survey/db/schema.sql`
3. Pages 프로젝트 → Settings → Bindings → D1 database 추가
   - Variable name: `SURVEY_DB` / Database: 위에서 만든 DB (Production, Preview 각각)
4. Pages 프로젝트 → Settings → Variables and Secrets → **Secret** 추가
   - `SURVEY_ADMIN_PASSWORD`: 관리자 비밀번호(12자 이상, 브라우저 코드에 포함되지 않음)
5. 재배포 후 `/survey/` 접속 확인

바인딩이 없으면 설문 제출 API는 503을 반환하고(응답은 브라우저에 보관), 기존 홈페이지에는 영향이 없습니다.

## 확정 후 입력할 항목

- 상품 이미지: 확정 이미지를 `survey/images/`에 넣고 `survey/schema.js`의 `PRODUCT_IMAGE.src`에 경로(예: `./images/giwa-9.webp`)를 입력합니다. 비어 있으면 '이미지 등록 예정' 영역만 표시합니다.
- 제품 정보(E 영역): `PRODUCT_INFO`의 초콜릿 1구 크기·총중량·패키지·보관방법·유통기한 `value`에 실제 측정값·확정 정보를 입력합니다. 값이 빈 항목은 화면에 표시하지 않습니다. 패키지 사진은 `PACKAGE_IMAGE.src`에 경로를 입력합니다.
- 시식 안내의 주요 원재료: `PRODUCT_NOTICE.ingredients`(ko·en)에 확인된 정보를 입력하면 시작 화면 알레르기 안내 아래에 표시됩니다.
- 시제품이 바뀌면 `PROTOTYPE_VERSION`을 바꿔 응답을 구분합니다.
- 영어 제품 정보는 `PRODUCT_INFO`의 `valueEn`에 입력합니다.
- 문항·선택지를 바꾸면 `SURVEY_VERSION`을 올리고, `survey/i18n.js`의 영어 문구도 함께 추가합니다. 이전 버전 화면에서 제출하면 새로고침 안내(409)를 받습니다.

## 데이터 구조

- Q2 성별(`gender`)은 설문 버전 v4에서 추가되어 그 이전 응답은 NULL입니다.
- Q3 직업(`occupation`)은 설문 버전 v3에서 추가되어 그 이전 응답은 NULL입니다.
- 선택지는 고정 코드로 저장하고, 표시 문구는 `schema.js`에서 매핑합니다.
- 단맛·향 평가는 1(지나치게 약함)~5(지나치게 강함), 만족도·제품명 기대 적합도(Q21)는 1~5 정수입니다.
- 다중 선택은 JSON 배열. CSV에서는 선택지별 0/1 열로 펼칩니다.
- Q24(최근 기념품 결제금액)은 Q23에서 '구매한 적 없음'을 고르면 표시하지 않고 NULL로 저장합니다.
- Q26은 2개 선택, 또는 '먹거리 기념품을 구매할 생각이 없음' 단독 선택입니다.
- Q30은 Q29 응답에 따라 ① 선택 이유(`reason_buy`) 또는 ② 비선택 이유(`reason_not`) 중 하나만 표시·저장되며 최대 2개입니다. 해당하지 않는 쪽은 빈 배열입니다.
- Q22(기념품 적합 맛)·Q33(적합한 구매 상황)은 v4부터 복수 선택(JSON 배열)입니다. 이전 응답의 단일 값은 관리자 화면·CSV에서 1개짜리 배열로 읽습니다.
- Q30-1(`lower_price_intent`)은 Q30②에서 ‘27,900원이라는 가격이 비싸게 느껴져서’ 또는 ‘가격에 비해 초콜릿 양이 적다고 느껴져서’를 고른 응답자에게만 표시합니다.
- Q29의 비교 상품 이미지는 `survey/images/competitor-chocopie.webp`입니다.
- `wtp_revised_after_price`: F 영역(가격 공개) 이후 이전 단계로 돌아가 Q27을 수정한 경우 1.
- 응답 언어(`survey_language`)·조사 경로(`survey_source`)·거주국가(`residence_country`, ISO 3166-1 alpha-2, 국내 거주는 KR)·시제품 버전(`prototype_version`)은 v5에서 추가되었습니다. v5 이전 응답은 관리자 화면·CSV에서 언어 ko, 경로 general로 읽고 `meta_recorded`=0으로 구분합니다.
- Q27(최대 지불의향)은 가격 공개 이후 수정할 수 없도록 잠급니다(최초 응답 보존).
- `device_prior_submissions`: 같은 브라우저에서 이전에 제출한 횟수(재참여 구분용, 차단하지 않음).
