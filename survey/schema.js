// 전주BURI 기와 초콜릿 소비자 설문 — 문항 정의와 검증 규칙
// 브라우저(설문·관리자 화면)와 Cloudflare Pages Functions(서버 검증·CSV)가 같은 모듈을 사용합니다.
// 내부 저장에는 고정 문항 ID(id)를 사용하고, 화면 표시 번호(num)는 별도로 관리합니다.

export const SURVEY_VERSION = '2026-11-v2';
export const PROPOSED_PRICE = 27900;
export const AMOUNT_MAX = 1000000;
export const TEXT_MAX = 1000;
export const OTHER_MAX = 200;

export const FLAVORS = [
  { id: 'moju', name: '모주 초콜릿', short: '모주' },
  { id: 'lotus', name: '연잎 초콜릿', short: '연잎' },
  { id: 'coffee', name: '커피 초콜릿', short: '커피' },
];

// 상품 소개(E) 화면의 9구 선물세트 이미지. 확정 이미지를 survey/images/에 넣고 경로를 지정하세요.
// 비어 있으면 '상품 이미지 등록 예정' 영역만 표시합니다.
export const PRODUCT_IMAGE = { src: '', alt: '전주BURI 기와 초콜릿 9구 선물세트' };

// 상품 소개(E) 화면의 제품 정보. 실제 측정값·확정 정보가 정해지면 value에 입력합니다.
// value가 비어 있는 항목은 응답자 화면에 표시하지 않습니다(임의 수치를 노출하지 않기 위함).
export const PRODUCT_INFO = [
  { label: '초콜릿 1구 크기', value: '' },
  { label: '총중량', value: '' },
  { label: '패키지', value: '' },
  { label: '보관방법', value: '' },
  { label: '유통기한', value: '' },
];
// 패키지 시안 또는 시제품 사진(선택). 경로를 입력하면 제품 정보 아래에 표시합니다.
export const PACKAGE_IMAGE = { src: '', alt: '기와 초콜릿 9구 패키지' };

const opt = (value, label, extra = {}) => ({ value, label, ...extra });
const OTHER = (label = '기타') => opt('other', label, { other: true });

const SATISFACTION_LABELS = ['매우 불만족', '불만족', '보통', '만족', '매우 만족'];
const SWEETNESS = [
  opt(1, '지나치게 약함'), opt(2, '약간 약함'), opt(3, '적당함'), opt(4, '약간 강함'), opt(5, '지나치게 강함'),
];
const AROMA = [
  opt(1, '지나치게 약해 특징을 느끼기 어려움'), opt(2, '약간 약함'), opt(3, '적당함'),
  opt(4, '약간 강함'), opt(5, '지나치게 강해 부담스러움'),
];
const IMPROVEMENTS = [
  opt('sweet_strong', '단맛이 강함'),
  opt('sweet_weak', '단맛이 부족함'),
  opt('aroma_artificial', '향이 강하거나 인위적으로 느껴짐'),
  opt('flavor_weak', '특징적인 풍미가 약함'),
  opt('bitter', '쓴맛이나 떫은맛이 거슬림'),
  opt('texture', '식감이나 입안에서 녹는 느낌이 아쉬움'),
  opt('aftertaste', '먹고 난 뒤의 맛이 아쉬움'),
  opt('none', '특별히 개선할 점 없음', { exclusive: true }),
  OTHER('기타'),
];
const scaleOptions = (labels) => labels.map((label, i) => opt(i + 1, label));

export const SECTIONS = {
  A: '응답자 기본정보',
  B: '초콜릿 3종 시식 평가',
  C: '초콜릿 3종 비교 및 콘셉트 평가',
  D: '실제 여행 기념품 구매 경험',
  E: '기와 초콜릿 상품 평가 및 가격 수용성',
  F: '판매가격 공개 및 구매 판단',
  G: '구매 저해요인 및 상품 개선 방향',
  H: '판매채널 및 최종 구매 판단',
};

export const flavorQuestions = (flavor, index) => {
  const base = 5 + index * 4;
  return [
    { id: `${flavor.id}_satisfaction`, num: base, type: 'scale', required: true, flavor: flavor.id, short: '전반적 만족도',
      title: `${flavor.name}의 전반적인 맛은 얼마나 만족스럽습니까?`,
      options: scaleOptions(SATISFACTION_LABELS), scaleEnds: ['매우 불만족', '매우 만족'] },
    { id: `${flavor.id}_sweetness`, num: base + 1, type: 'single', required: true, flavor: flavor.id, short: '단맛',
      title: `${flavor.name}의 단맛은 어떻게 느껴집니까?`, options: SWEETNESS },
    { id: `${flavor.id}_aroma`, num: base + 2, type: 'single', required: true, flavor: flavor.id, short: '향·풍미',
      title: `${flavor.name}의 특징적인 향과 풍미는 어떻게 느껴집니까?`, options: AROMA },
    { id: `${flavor.id}_improve`, num: base + 3, type: 'multi', required: true, flavor: flavor.id, short: '개선 요소',
      title: `${flavor.name}에서 개선이 필요하다고 생각하는 요소는 무엇입니까?`, hint: '복수 선택 가능',
      options: IMPROVEMENTS },
  ];
};

const FLAVOR_CHOICE = FLAVORS.map((f) => opt(f.id, f.name));
const REASON_TITLE = '앞선 선택에서 가장 중요하게 작용한 이유는 무엇입니까?';

export const STEPS = [
  {
    id: 'basic', section: 'A', title: SECTIONS.A,
    questions: [
      { id: 'age', num: 1, type: 'single', required: true, short: '연령대', title: '연령대는 어떻게 되십니까?',
        options: [opt('20_24', '20~24세'), opt('25_29', '25~29세'), opt('30_34', '30~34세'), opt('35_39', '35~39세'),
          opt('40_49', '40~49세'), opt('50_59', '50~59세'), opt('60_plus', '60세 이상')] },
      { id: 'residence', num: 2, type: 'single', required: true, short: '거주지역', title: '현재 거주지역은 어디입니까?',
        options: [opt('jeonju', '전주시'), opt('jeonbuk_other', '전북특별자치도 내 다른 지역'), opt('capital', '수도권(서울·경기·인천)'),
          opt('other_domestic', '그 외 국내 지역'), opt('overseas', '해외')] },
      { id: 'visit', num: 3, type: 'single', required: true, short: '전주 방문 경험', title: '전주 방문 경험에 해당하는 항목을 선택해 주세요.',
        options: [opt('within_1y', '최근 1년 이내 관광 목적으로 방문'), opt('within_3y', '1년 초과~3년 이내 관광 목적으로 방문'),
          opt('over_3y', '3년 이전에 방문'), opt('never', '방문 경험 없음'), opt('resident', '현재 전주 거주자')] },
      { id: 'moju_exp', num: 4, type: 'single', required: true, short: '모주 음용 경험', title: '전주의 전통 음료인 모주를 마셔본 경험이 있습니까?',
        options: [opt('yes', '있음'), opt('no', '없음'), opt('unsure', '잘 모르겠음')] },
    ],
  },
  {
    id: 'tasting', section: 'B', title: SECTIONS.B, type: 'tasting',
    intro: [
      '지금부터 모주·연잎·커피 초콜릿 세 가지를 각각 시식하고 평가해 주세요.',
      '각 초콜릿의 이름을 확인한 상태에서 실제 맛에 대한 만족도와 개선이 필요한 요소를 평가합니다.',
      '세 가지 맛을 모두 시식한 후 다음 단계로 이동할 수 있습니다.',
      '아래 모주 초콜릿 / 연잎 초콜릿 / 커피 초콜릿 탭을 자유롭게 이동하며 응답해 주세요.',
    ],
    questions: FLAVORS.flatMap((f, i) => flavorQuestions(f, i)),
  },
  {
    id: 'compare', section: 'C', title: SECTIONS.C,
    intro: ['세 가지 초콜릿을 모두 시식하셨다면, 각각의 맛을 비교하여 평가해 주세요.'],
    questions: [
      { id: 'best_taste', num: 17, type: 'single', required: true, short: '가장 맛있는 초콜릿',
        title: '세 가지 초콜릿 중 가장 맛있다고 느낀 것은 무엇입니까?',
        options: [...FLAVOR_CHOICE, opt('similar', '세 가지 모두 비슷함'), opt('none', '모두 선호하지 않음')] },
      { id: 'most_unique', num: 18, type: 'single', required: true, short: '가장 독특한 초콜릿',
        title: '일반적인 초콜릿과 비교하여 가장 독특한 맛이라고 느낀 것은 무엇입니까?',
        options: [...FLAVOR_CHOICE, opt('similar', '세 가지 모두 비슷함'), opt('no_diff', '특별한 차이를 느끼지 못함')] },
      { id: 'concept_fit', num: 19, type: 'matrix', required: true, short: '제품명 기대 적합도',
        title: '각 초콜릿의 실제 맛이 제품명에서 기대한 맛이나 풍미와 얼마나 잘 어울린다고 생각하십니까?',
        hint: '각각 1점(전혀 어울리지 않음)~5점(매우 잘 어울림)으로 평가해 주세요.',
        scaleEnds: ['전혀 어울리지 않음', '매우 잘 어울림'],
        rows: FLAVORS.map((f) => ({ id: `${f.id}_concept_fit`, flavor: f.id, label: f.name })),
        options: scaleOptions(['전혀 어울리지 않음', '어울리지 않음', '보통', '어울림', '매우 잘 어울림']) },
      { id: 'souvenir_fit', num: 20, type: 'single', required: true, short: '기념품 적합 맛',
        title: '세 가지 제품 중 전주 여행 기념품으로 가장 적합하다고 생각하는 맛은 무엇입니까?',
        options: [...FLAVOR_CHOICE, opt('all', '세 가지 모두 적합함'), opt('none', '모두 적합하지 않음')] },
    ],
  },
  {
    id: 'experience', section: 'D', title: SECTIONS.D,
    intro: [
      '다음은 실제 여행에서 먹거리 기념품을 구매한 경험에 관한 질문입니다.',
      '본인이 직접 비용을 지불한 경험을 기준으로 응답해 주세요.',
    ],
    questions: [
      { id: 'souv_freq', num: 21, type: 'single', required: true, short: '최근 1년 기념품 구매 횟수',
        title: '최근 1년 동안 여행지에서 먹거리 기념품을 직접 구매한 횟수는 몇 회입니까?',
        options: [opt('5_plus', '5회 이상'), opt('3_4', '3~4회'), opt('1_2', '1~2회'), opt('none', '구매한 적 없음')] },
      { id: 'souv_spend', num: 22, type: 'amount', required: true, short: '최근 기념품 결제금액',
        title: '최근 1년 동안 가장 마지막으로 구매한 여행지 먹거리 기념품 한 개의 실제 결제금액은 얼마였습니까?',
        note: '여러 상품을 구매했다면 개별 상품 또는 선물세트 1개 기준으로 응답해 주세요.',
        amountKey: 'souv_spend_amount', noneKey: 'souv_spend_unknown', noneLabel: '구매했으나 금액이 기억나지 않음',
        showIf: { id: 'souv_freq', notIn: ['none'] } },
      { id: 'souv_target', num: 23, type: 'multi', required: true, short: '구매 대상',
        title: '여행지에서 먹거리 기념품을 구매한다면 주로 누구를 위한 것입니까?', hint: '복수 선택 가능',
        options: [opt('self', '본인'), opt('partner', '연인·배우자'), opt('family', '가족'), opt('friend', '친한 친구'),
          opt('coworker', '직장 동료'), opt('acquaintance', '지인·단체'), opt('none', '먹거리 기념품을 구매하지 않음', { exclusive: true })] },
      { id: 'souv_criteria', num: 24, type: 'multi', required: true, exact: 2, short: '중요 구매 기준',
        title: '여행지에서 먹거리 기념품을 구매할 때 가장 중요하게 생각하는 요소 두 가지는 무엇입니까?', hint: '2개 선택',
        note: '‘먹거리 기념품을 구매할 생각이 없음’은 다른 항목과 중복 선택할 수 없습니다.',
        options: [opt('taste', '맛과 식품 품질'), opt('local', '여행지의 특색과 상징성'), opt('package', '고급스러운 패키지'),
          opt('value', '가격 대비 양과 구성'), opt('rarity', '다른 곳에서 구매하기 어려운 희소성'),
          opt('brand', '브랜드 인지도와 신뢰도'), opt('portable', '보관 및 휴대 편의성'), OTHER(),
          opt('no_intent', '먹거리 기념품을 구매할 생각이 없음', { exclusive: true })] },
    ],
  },
  {
    id: 'product', section: 'E', title: SECTIONS.E, type: 'product',
    questions: [
      { id: 'wtp', num: 25, type: 'amount', required: true, short: '최대 지불의향 금액',
        title: '판매가격을 안내받기 전, 이 제품 9구 선물세트에 지불할 의향이 있는 최대 금액은 얼마입니까?',
        note: '할인이나 특별한 혜택이 없다는 가정하에, 실제로 지불할 수 있다고 생각하는 최대 금액을 입력해 주세요.',
        amountKey: 'wtp_amount', noneKey: 'wtp_none', noneLabel: '가격과 관계없이 구매 의향 없음' },
    ],
  },
  {
    id: 'price', section: 'F', title: SECTIONS.F,
    intro: [
      '이 제품의 검토 중인 판매가격은 27,900원입니다.',
      '지금부터는 실제로 이 가격을 지불해야 하는 상황이라고 가정하고 응답해 주세요.',
    ],
    questions: [
      { id: 'intent_27900', num: 26, type: 'single', required: true, short: '27,900원 구매의향',
        title: '전주 여행 중 직접 선물을 구매하는 상황이라고 가정하겠습니다. 기와 초콜릿 9구 선물세트의 판매가격이 27,900원이라면 구매하시겠습니까?',
        options: [opt('definitely', '반드시 구매할 것 같음'), opt('likely', '구매할 가능성이 높음'), opt('maybe', '상황에 따라 구매할 수도 있음'),
          opt('unlikely', '구매할 가능성이 낮음'), opt('no', '구매하지 않을 것임')] },
      { id: 'choice_30000', num: 27, type: 'single', required: true, short: '예산 3만원 선택',
        title: '전주 여행을 마치기 전, 먹거리 기념품을 하나만 구매할 수 있고 예산은 30,000원이라고 가정하겠습니다. 무엇을 선택하시겠습니까?',
        options: [opt('buri', '전주BURI 기와 초콜릿 9구 (27,900원)'), opt('known', '기존에 알고 있거나 선호하는 전주 먹거리 기념품'),
          opt('other_food', '다른 종류의 먹거리 기념품'), opt('save', '먹거리 기념품을 구매하지 않고 돈을 아끼겠음')] },
      // Q28은 Q27 응답에 따라 ① 선택 이유(reason_buy) 또는 ② 비선택 이유(reason_not) 중 하나만 표시합니다.
      { id: 'reason_buy', num: 28, type: 'multi', required: true, max: 2, short: '선택 이유',
        title: REASON_TITLE, hint: '최대 2개 선택', note: 'Q27에서 전주BURI 기와 초콜릿을 선택하신 이유를 골라 주세요.',
        showIf: { id: 'choice_30000', in: ['buri'] },
        options: [opt('taste_satisfied', '시식한 초콜릿의 맛이 만족스러워서'), opt('special_flavor', '모주·연잎·커피 등의 특별한 맛 때문에'),
          opt('design', '기와를 형상화한 독특한 디자인 때문에'), opt('memento', '전주 여행을 기념하기에 적합해서'),
          opt('premium', '선물하기에 고급스러워 보여서'), opt('differentiated', '다른 지역 기념품과 차별화되어서'),
          opt('price_ok', '가격과 구성이 적절하다고 생각해서'), OTHER()] },
      { id: 'reason_not', num: 28, type: 'multi', required: true, max: 2, short: '비선택 이유',
        title: REASON_TITLE, hint: '최대 2개 선택', note: 'Q27에서 전주BURI 기와 초콜릿 이외의 선택지를 고르신 이유를 골라 주세요.',
        showIf: { id: 'choice_30000', notIn: ['buri'] },
        options: [opt('small_qty', '가격에 비해 초콜릿 양이 적다고 느껴져서'), opt('quality_doubt', '초콜릿의 맛과 품질을 충분히 확신하지 못해서'),
          opt('not_special', '전주 기념품으로서의 특별함이 부족해서'), opt('prefer_other', '이미 선호하는 다른 상품이 있어서'),
          opt('taste_mismatch', '선물받을 사람의 취향과 맞지 않아서'), opt('storage', '초콜릿의 보관·운반이 걱정되어서'),
          opt('package', '패키지나 디자인이 기대에 미치지 못해서'), opt('no_interest', '초콜릿 선물 자체에 관심이 없어서'),
          opt('no_spend', '기념품 구매에 돈을 쓰고 싶지 않아서'), OTHER()] },
    ],
  },
  {
    id: 'improve', section: 'G', title: SECTIONS.G,
    intro: [
      '다음은 기와 초콜릿의 상품성과 구매 편의성을 개선하기 위한 질문입니다.',
      '실제로 구매를 결정할 때 중요하다고 생각하는 사항을 선택해 주세요.',
    ],
    questions: [
      { id: 'info_needed', num: 29, type: 'single', required: true, short: '구매 전 확인 정보', hint: '1개 선택',
        title: '이 제품의 구매를 결정하기 전에 가장 먼저 확인하고 싶은 것은 무엇입니까?',
        options: [opt('size', '실제 초콜릿 9구의 크기와 중량'), opt('taste_composition', '세 가지 맛을 포함한 전체적인 맛과 구성'),
          opt('ingredients', '원재료와 품질'), opt('package', '실제 패키지의 완성도와 고급스러움'), opt('storage', '보관방법과 유통기한'),
          opt('reviews', '브랜드 신뢰도 및 구매 후기'), opt('value', '가격 대비 가치'),
          opt('none', '추가로 확인할 사항 없음'), OTHER()] },
      { id: 'improve_priority', num: 30, type: 'single', required: true, short: '우선 개선 요소', hint: '1개 선택',
        title: '기와 초콜릿의 구매의향을 높이기 위해 가장 우선적으로 개선해야 할 요소는 무엇입니까?',
        options: [opt('price_down', '가격 인하'), opt('size_up', '초콜릿 크기 또는 수량 확대'), opt('taste', '맛의 완성도 향상'),
          opt('local', '전주 특색을 느낄 수 있는 요소 강화'), opt('package', '패키지 고급화'), opt('portable', '보관 및 휴대 편의성 개선'),
          opt('enough', '현재 구성으로 충분함'), OTHER()] },
      { id: 'use_occasion', num: 31, type: 'single', required: true, short: '적합한 구매 상황',
        title: '이 제품을 실제로 구매한다면 어떤 상황이 가장 적합하다고 생각하십니까?',
        options: [opt('gift_close', '전주 여행 중 가족·연인·친구를 위한 특별한 선물'), opt('gift_work', '전주 여행 중 직장 동료·지인에게 주는 선물'),
          opt('self', '본인이 먹기 위한 여행 기념품'), opt('special_day', '명절·기념일 등 특별한 날의 선물'),
          opt('online_rebuy', '여행 후 온라인 재구매'), opt('none', '구매할 상황이 떠오르지 않음')] },
    ],
  },
  {
    id: 'channel', section: 'H', title: SECTIONS.H,
    questions: [
      { id: 'channel', num: 32, type: 'single', required: true, short: '선호 판매채널',
        title: '이 제품을 어디에서 판매한다면 구매할 가능성이 가장 높습니까?',
        options: [opt('hanok_shop', '전주 한옥마을 기념품 전문점'), opt('select_shop', '전주 지역 디자인·라이프스타일 편집숍'),
          opt('hotel', '전주 호텔·숙박시설 내 판매 공간'), opt('dessert', '전주 지역 디저트 전문점'), opt('official_online', '브랜드 공식 온라인몰'),
          opt('gift_platform', '온라인 선물하기 플랫폼'), opt('none', '구매할 의향 없음')] },
      { id: 'online_intent', num: 33, type: 'single', required: true, short: '온라인 구매의향',
        title: '전주 여행 중 기와 초콜릿을 구매하지 않았더라도, 여행 후 온라인에서 구매할 의향이 있습니까?',
        options: [opt('active', '적극적으로 구매할 의향 있음'), opt('when_gift', '선물할 일이 생기면 구매할 의향 있음'),
          opt('depends', '배송비·할인 혜택에 따라 고려'), opt('no_online', '온라인으로는 구매할 의향 없음'), opt('no_product', '제품 자체를 구매할 의향 없음')] },
      { id: 'final_comment', num: 34, type: 'text', required: false, short: '최종 자유의견',
        title: '마지막으로, 기와 초콜릿을 실제 돈을 내고 구매할지 결정할 때 가장 중요한 이유나 망설이는 점을 자유롭게 작성해 주세요.',
        hint: '선택 응답' },
    ],
  },
];

export const ALL_QUESTIONS = STEPS.flatMap((s) => s.questions.map((q) => ({ ...q, step: s.id })));
export const QUESTION_BY_ID = Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, q]));

export function isVisible(q, answers) {
  if (!q.showIf) return true;
  const v = answers[q.showIf.id];
  if (v === undefined || v === null || v === '') return false;
  if (q.showIf.in) return q.showIf.in.includes(v);
  if (q.showIf.notIn) return !q.showIf.notIn.includes(v);
  return true;
}

const hasText = (v) => typeof v === 'string' && v.trim().length > 0;
const optionValues = (q) => q.options.map((o) => o.value);
export const selectLimit = (q) => q.exact || q.max || null;

// 문항 하나를 검증하고 오류 메시지(없으면 null)를 돌려줍니다.
export function validateQuestion(q, answers) {
  if (!isVisible(q, answers)) return null;
  const v = answers[q.id];
  switch (q.type) {
    case 'single':
    case 'scale': {
      if (v === undefined || v === null || v === '') return q.required ? '항목을 선택해 주세요.' : null;
      if (!optionValues(q).includes(v)) return '선택한 값이 올바르지 않습니다.';
      const o = q.options.find((x) => x.value === v);
      if (o.other && !hasText(answers[`${q.id}_other`])) return '기타 내용을 입력해 주세요.';
      return null;
    }
    case 'multi': {
      const arr = Array.isArray(v) ? v : [];
      if (!arr.length) return q.required ? (q.exact ? `${q.exact}개를 선택해 주세요.` : '하나 이상 선택해 주세요.') : null;
      if (new Set(arr).size !== arr.length || arr.some((x) => !optionValues(q).includes(x))) return '선택한 값이 올바르지 않습니다.';
      const excl = q.options.filter((o) => o.exclusive).map((o) => o.value);
      const pickedExcl = arr.filter((x) => excl.includes(x));
      if (pickedExcl.length && arr.length > 1) return `‘${q.options.find((o) => o.value === pickedExcl[0]).label}’은 다른 항목과 함께 선택할 수 없습니다.`;
      if (pickedExcl.length) return null; // 단독 선택한 배타 항목은 개수 조건을 적용하지 않습니다.
      if (q.exact && arr.length !== q.exact) return `정확히 ${q.exact}개를 선택해 주세요. (현재 ${arr.length}개)`;
      if (q.max && arr.length > q.max) return `최대 ${q.max}개까지 선택할 수 있습니다. (현재 ${arr.length}개)`;
      if (arr.includes('other') && !hasText(answers[`${q.id}_other`])) return '기타 내용을 입력해 주세요.';
      return null;
    }
    case 'matrix': {
      const missing = q.rows.filter((r) => !optionValues(q).includes(answers[r.id]));
      if (missing.length && q.required) return `${missing.map((r) => r.label).join(', ')}의 점수를 선택해 주세요.`;
      return null;
    }
    case 'amount': {
      if (answers[q.noneKey] === true) return null;
      const n = answers[q.amountKey];
      if (n === undefined || n === null || n === '') return `금액을 입력하거나 ‘${q.noneLabel}’을 선택해 주세요.`;
      if (!Number.isInteger(n) || n < 1 || n > AMOUNT_MAX) return `1원부터 ${AMOUNT_MAX.toLocaleString('ko-KR')}원 사이의 금액을 입력해 주세요.`;
      return null;
    }
    case 'text':
      if (v !== undefined && v !== null && typeof v !== 'string') return '입력값이 올바르지 않습니다.';
      if (typeof v === 'string' && v.length > TEXT_MAX) return `${TEXT_MAX}자 이내로 입력해 주세요.`;
      return null;
    default:
      return null;
  }
}

export function validateStep(stepId, answers) {
  const step = STEPS.find((s) => s.id === stepId);
  const errors = {};
  for (const q of step.questions) {
    const e = validateQuestion(q, answers);
    if (e) errors[q.id] = e;
  }
  return errors;
}

export function validateAll(answers) {
  const errors = {};
  for (const s of STEPS) Object.assign(errors, validateStep(s.id, answers));
  return errors;
}

export function flavorCompletion(flavorId, answers) {
  const qs = STEPS.find((s) => s.id === 'tasting').questions.filter((q) => q.flavor === flavorId);
  const done = qs.filter((q) => !validateQuestion(q, answers)).length;
  return { done, total: qs.length, complete: done === qs.length };
}

const cleanText = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

// 화면 상태(answers)를 저장용 구조로 정리합니다. 숨겨진 조건부 문항과 선택하지 않은 기타 입력은 제외합니다.
// 검증(validateAll)을 통과한 answers에만 사용합니다.
export function normalizeAnswers(answers) {
  const visible = (id) => isVisible(QUESTION_BY_ID[id], answers);
  const single = (id) => (visible(id) ? answers[id] ?? null : null);
  const multi = (id) => (visible(id) && Array.isArray(answers[id]) ? [...answers[id]] : []);
  const otherFor = (id) => {
    const q = QUESTION_BY_ID[id];
    if (!visible(id)) return null;
    const v = answers[id];
    const picked = q.type === 'multi' ? (v || []).includes('other') : v === 'other';
    return picked ? cleanText(answers[`${id}_other`], OTHER_MAX) : null;
  };
  const amount = (id) => {
    const q = QUESTION_BY_ID[id];
    if (!visible(id)) return { amount: null, none: null };
    const none = answers[q.noneKey] === true;
    return { amount: none ? null : answers[q.amountKey], none };
  };
  const respondent = {
    age_group: single('age'),
    residence: single('residence'),
    jeonju_visit: single('visit'),
    moju_experience: single('moju_exp'),
    best_taste: single('best_taste'),
    most_unique: single('most_unique'),
    souvenir_fit: single('souvenir_fit'),
  };
  const flavors = FLAVORS.map((f) => ({
    flavor: f.id,
    satisfaction: answers[`${f.id}_satisfaction`],
    sweetness: answers[`${f.id}_sweetness`],
    aroma: answers[`${f.id}_aroma`],
    improvements: multi(`${f.id}_improve`),
    improvements_other: otherFor(`${f.id}_improve`),
    concept_fit: answers[`${f.id}_concept_fit`],
  }));
  const spend = amount('souv_spend');
  const wtp = amount('wtp');
  const purchase = {
    souv_freq: single('souv_freq'),
    souv_spend_amount: spend.amount,
    souv_spend_unknown: spend.none,
    souv_target: multi('souv_target'),
    souv_criteria: multi('souv_criteria'),
    souv_criteria_other: otherFor('souv_criteria'),
    wtp_amount: wtp.amount,
    wtp_no_intent: wtp.none === true,
    intent_27900: single('intent_27900'),
    choice_30000: single('choice_30000'),
    reason_buy: multi('reason_buy'),
    reason_buy_other: otherFor('reason_buy'),
    reason_not: multi('reason_not'),
    reason_not_other: otherFor('reason_not'),
    info_needed: single('info_needed'),
    info_needed_other: otherFor('info_needed'),
    improve_priority: single('improve_priority'),
    improve_priority_other: otherFor('improve_priority'),
    use_occasion: single('use_occasion'),
    channel: single('channel'),
    online_intent: single('online_intent'),
    final_comment: cleanText(answers.final_comment, TEXT_MAX),
  };
  return { respondent, flavors, purchase };
}

export function labelOf(questionId, value) {
  const q = QUESTION_BY_ID[questionId];
  if (!q || !q.options) return value == null ? '' : String(value);
  const o = q.options.find((x) => x.value === value);
  return o ? o.label : value == null ? '' : String(value);
}

// 맛별 평가 문항의 선택지(맛 공통). 관리자 화면·CSV에서 사용합니다.
export const FLAVOR_OPTIONS = {
  satisfaction: scaleOptions(SATISFACTION_LABELS),
  sweetness: SWEETNESS,
  aroma: AROMA,
  improvements: IMPROVEMENTS,
  concept_fit: QUESTION_BY_ID.concept_fit.options,
};
