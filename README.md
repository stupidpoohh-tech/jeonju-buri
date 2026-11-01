# 전주BURI — Concept website

HOME · BRAND · SHOP · NOTICE | 화이트 에디토리얼 레이아웃

## 비율 및 스크롤 모션 조정
- HOME 전용 스타일은 `home.css`에서 관리합니다.
- 본문 최대 너비 1120px, 히어로 최대 너비 1240px / 높이 350~480px로 조정했습니다.
- 모바일은 히어로 문구와 사진을 분리하고, 사진 2장을 나란히 배치합니다.
- 모바일 카테고리는 가로 카드, 브랜드 스토리는 2열로 구성해 과도한 세로 길이를 줄였습니다.
- IntersectionObserver로 스크롤 진입 시 부드러운 페이드·상향 이동을 적용합니다.
  카드에는 짧은 순차 지연을 두며, 키보드 포커스와 `prefers-reduced-motion`을 지원합니다.
  별도 애니메이션 라이브러리나 상시 스크롤 이벤트는 사용하지 않습니다.
- 320/390/768/1280/1440/1920px에서 가로 넘침, 메뉴와 상세·필터,
  스크롤 모션 및 동작 줄이기 설정을 검증했습니다.

## HOME 레이아웃 (2026-11-02)
- 얇은 안내 바, 미니멀 메뉴, 2분할 이미지 히어로와 왼쪽 텍스트
- 데스크톱 4열 / 모바일 2열의 선택한 컬렉션과 상품 상세 연결
- 초콜릿·쿠키·차 카테고리: `#shop/chocolate`, `#shop/cookie`, `#shop/tea` 필터 링크
- 기존 상품 사진과 직접 제작한 한옥 선화, 타이포그래피를 배치한 비대칭 브랜드 스토리
- 판매 실적을 가정하지 않도록 ‘베스트셀러’ 대신 ‘선택한 컬렉션’ 표기
- 기존 9개 이미지 및 상품 설명 보존. 가격·재고·결제 기능 없음

검증: 320/390/768/1440px 화면 너비, 메뉴 4개, 카테고리 링크 3개,
SHOP 상세 9개 및 HOME 상세 4개, Escape/닫기 동작, JavaScript 오류 없음.

## 이 사이트에 포함된 것
- 상품 이미지 **9장**(assets 폴더)과 상품별 설명
- SHOP 카테고리 필터와 상품 상세 팝업
- 모바일 반응형 레이아웃, 키보드 접근성
- 정적 HTML/CSS/JavaScript (별도 설치나 빌드 불필요)
- 현재 **브랜드 및 상품 콘셉트 소개 사이트**: 구매·결제·회원가입·주문·재고 관리 기능 없음

## 파일 구조
```
index.html
styles.css
home.css
app.js
assets/
  giwa-sleeve.webp
  jeonju-moon.webp
  giwa-collection.webp
  lotus-giwa.webp
  hanok-pop-up.webp
  hanok-cookie.webp
  lotus-tea.webp
  cookie-tower.webp
  gonggi-cookie.webp
```

## 웹브라우저에서 확인하기
`index.html`을 열거나, 로컬 서버 실행: `python -m http.server 8080` 후 http://localhost:8080 방문.

## GitHub + Cloudflare Pages 배포
1. GitHub에서 새 저장소 `jeonju-buri` 생성.
2. 다운로드한 zip의 압축을 풀어 **폴더 안 파일들**(`index.html`, `styles.css`, `app.js`, `assets/`, `README.md`)을 저장소 최상단에 업로드. zip 파일을 그대로 올리지 말 것.
3. Cloudflare → Workers & Pages → Create application → Pages → Import an existing Git repository / Connect to Git → GitHub 저장소 선택.
4. Framework preset: **None** / Production branch: `main` / Build command: `exit 0`(혹은 비워둠) / Build output directory: **`.`** / Root directory: 기본값(저장소 최상단).
5. Save and Deploy. `https://프로젝트명.pages.dev` 주소로 접속.
6. 이후 GitHub의 main 브랜치에 변경 사항을 커밋하면 자동으로 다시 배포됨.

※ 메뉴가 열리지 않으면 JS 파일 경로와 확장자를 확인하세요. 이미지가 누락되면 `assets/` 폴더가 함께 업로드되었는지 확인하세요.

공식 참고: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/

## 향후 커머스 확장
주문/결제 서버, PG 결제 승인, 주문·배송·취소·환불, 운영자 관리 및 사업자 관련 절차는 실제 판매 시작 전에 **별도 구축**해야 함. UI만 있다고 실제 결제가 작동하지는 않음.
