# 전주BURI 기와 초콜릿 소비자 설문

기존 홈페이지(`index.html`, `app.js`, `styles.css`, `editorial.css`, `products.js`, `assets/`)와 분리된 설문 전용 모듈입니다. 기존 파일은 수정하지 않았습니다.

| 경로 | 내용 |
|---|---|
| `/survey/` | 응답자용 설문(로그인 없음, 모바일 우선) |
| `/survey/admin/` | 관리자 대시보드(비밀번호 인증) |
| `POST /api/survey/responses` | 응답 제출(서버 재검증 후 D1 저장) |
| `GET /api/survey/admin/responses` | 전체 응답 조회(관리자) |
| `GET /api/survey/admin/export?type=respondents\|flavors` | CSV 다운로드(관리자, UTF-8 BOM) |

## 파일

- `survey/schema.js` — 문항·선택지·고정 문항 ID·검증 규칙. 설문 화면, 관리자 화면, 서버가 같은 파일을 사용합니다.
- `survey/index.html`, `survey/app.js`, `survey/survey.css` — 설문 화면
- `survey/admin/` — 관리자 화면
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
- 맛별 콘셉트 설명(Q18): `FLAVOR_CONCEPTS`에 문구를 입력하면 콘셉트 적합도 문항에 표시됩니다.
- 문항·선택지를 바꾸면 `SURVEY_VERSION`을 올립니다. 이전 버전 화면에서 제출하면 새로고침 안내(409)를 받습니다.

## 데이터 구조

- 선택지는 고정 코드로 저장하고, 표시 문구는 `schema.js`에서 매핑합니다.
- 단맛·향 평가는 1(지나치게 약함)~5(지나치게 강함), 만족도·콘셉트 적합도는 1~5 정수입니다.
- 다중 선택은 JSON 배열. CSV에서는 선택지별 0/1 열로 펼칩니다.
- Q28·Q29는 Q27 응답에 따라 한쪽만 저장되고, 해당하지 않는 쪽은 빈 배열입니다.
- `wtp_revised_after_price`: 27,900원 안내 이후 이전 단계로 돌아가 Q25를 수정한 경우 1.
- `device_prior_submissions`: 같은 브라우저에서 이전에 제출한 횟수(재참여 구분용, 차단하지 않음).
