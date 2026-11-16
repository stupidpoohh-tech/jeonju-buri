// 전주BURI 설문 — 다국어 리소스(한국어·영어)
// 문항 ID, 선택지 코드, 조건부 로직, 척도는 schema.js 하나만 사용합니다.
// 이 파일은 화면에 보이는 문구만 언어별로 바꿉니다. 응답은 언어와 관계없이 같은 코드로 저장됩니다.
import { STEPS, SECTIONS, FLAVORS, COUNTRY_NAMES, PRODUCT_INFO } from './schema.js';

// ---------- 화면 문구 ----------
export const UI = {
  ko: {
    locale: 'ko-KR',
    docTitle: '전주BURI 기와 초콜릿 소비자 시식 및 시장반응 조사',
    prev: '이전', next: '다음', submit: '제출하기', resubmit: '다시 제출하기', submitting: '제출 중…',
    stepCount: (i, n) => `${i} / ${n} 단계`,
    stepAria: (i, n) => `${n}단계 중 ${i}단계`,
    progressLabel: '설문 진행률',
    navLabel: '설문 단계 이동',
    skip: '본문으로 이동',
    otherPlaceholder: '기타 내용을 입력해 주세요',
    otherAria: (num) => `Q${num} 기타 내용`,
    counterUnitExact: (n) => `${n}개 선택`,
    counterUnitMax: (n) => `최대 ${n}개`,
    counter: (c, unit) => `${c}개 선택 (${unit})`,
    counterFull: (c, unit) => `${c}개 선택 (${unit}) — 다른 항목으로 바꾸려면 선택한 항목을 먼저 해제해 주세요.`,
    scalePicked: (v, label) => `${v}점 · ${label}`,
    scaleAria: (v, label) => `${v}점 ${label}`,
    freeTextAria: (num) => `Q${num} 자유의견`,
    selectAria: (num) => `Q${num} 선택`,
    amountLabel: '금액 직접 입력',
    amountUnit: '원',
    amountAria: (num) => `Q${num} 금액(원)`,
    amountPreview: (n) => `입력 금액: ${koreanAmount(n)}`,
    amountTooMuch: (max) => ` — ${max.toLocaleString('ko-KR')}원 이하로 입력해 주세요`,
    wtpConfirm: '‘다음’을 누르면 판매가격이 안내되며, 이후에는 이 문항의 응답을 수정할 수 없습니다.',
    wtpLocked: '판매가격이 공개된 이후에는 처음 응답한 금액을 보존하기 위해 이 문항을 수정할 수 없습니다.',
    tabsAria: '평가할 초콜릿 선택',
    panelTitle: (f) => `${f.name} 평가`,
    tabName: (f) => f.name,
    flavorIntro: () => '',
    nextFlavor: '다음 맛 평가하기 →',
    tabDone: '평가 완료',
    tabPartial: (d, t) => `${d} / ${t} 작성`,
    tabNone: '미평가',
    tabAria: (name, c) => `${name}, ${c.complete ? '평가 완료' : `${c.total}문항 중 ${c.done}문항 작성`}`,
    tabAnnounce: (name) => `${name} 평가 화면입니다.`,
    part: (s) => `PART ${s}`,
    sectionLabel: (s, name) => `${s}. ${name}`,
    productLead: [
      '다음은 전주BURI에서 개발 중인 기와 초콜릿 9구 선물세트의 상품 기획안입니다.',
      '전주 한옥의 기와를 형상화한 초콜릿으로, 모주·연잎·커피 세 가지 맛을 각각 3구씩 구성한 제품입니다.',
    ],
    productImagePending: '기와 초콜릿 9구 상품 이미지 등록 예정',
    compoTitle: '제품 구성',
    compoEach: '3구',
    compoTotal: '총 9구',
    infoTitle: '제품 정보',
    prototypeNote: '※ 본 제품은 개발 중인 시제품으로, 최종 판매 제품의 사양과 디자인은 변경될 수 있습니다.',
    productAssume: '실제 전주 여행 중 이 제품을 선물 또는 기념품으로 구매하는 상황을 가정하고 응답해 주세요.',
    allergyTitle: '⚠ 알레르기 주의',
    allergyLines: [
      '시나몬 또는 초콜릿에 알레르기가 있으신 분은 시식하지 마시기 바랍니다.',
      '시식 중이나 시식 후 이상 증상이 나타나면 즉시 섭취를 중단하고 진행자에게 알려 주세요.',
    ],
    ingredientsLabel: '주요 원재료',
    introEyebrow: '전주BURI 소비자 조사',
    introTitle: '전주BURI 기와 초콜릿 소비자 시식 및 시장반응 조사',
    introBody: [
      '개발 중인 초콜릿 시제품의 맛과 상품성을 알아보는 설문입니다.',
      '정답은 없습니다. 맛이 아쉽거나 살 생각이 없어도 솔직하게 답해 주세요.',
    ],
    facts: (n) => [
      ['시식 제품', '모주·연잎·커피 초콜릿 3종 (개발 중인 시제품)'],
      ['구성', `${n}단계 · 이전 단계로 돌아가 수정 가능`],
      ['익명', '이름·연락처·소속 등 개인정보는 수집하지 않음'],
    ],
    changeLang: 'Change language / 언어 변경',
    doneRecord: (when) => `이 기기에서 ${when ? `${when}에 ` : ''}설문 응답이 제출된 기록이 있습니다.`,
    doneRecord2: '이미 참여하셨다면 중복 응답은 삼가 주세요. 다른 분이 이어서 참여하시는 경우에는 그대로 시작하시면 됩니다.',
    draftSaved: (when, step) => `작성 중이던 응답이 이 기기에 저장되어 있습니다.${when ? ` (마지막 저장 ${when}, ${step}단계)` : ''}`,
    resume: '이어서 작성하기',
    restart: '처음부터 새로 시작하기',
    restartConfirm: '저장된 응답을 지우고 처음부터 새로 시작할까요?',
    start: '설문 시작하기',
    doneBadge: '응답이 정상적으로 제출되었습니다',
    doneTitle: '설문에 참여해 주셔서 감사합니다.',
    doneBody: '응답해 주신 의견은 전주BURI 기와 초콜릿의 맛과 상품 구성 개선을 위한 자료로 활용됩니다.',
    doneMeta: (when, id) => `제출 시각 ${when}${id ? ` · 응답 번호 ${id}` : ''}`,
    nextPerson: '다음 분 응답 시작하기',
    stepAnnounce: (i, title) => `${i}단계: ${title}`,
    tastingErrTitle: '아직 평가하지 않은 문항이 있습니다.',
    tastingErrBody: ' 세 가지 맛의 문항을 모두 응답해야 다음 단계로 이동할 수 있습니다.',
    tastingErrAnnounce: (name) => `${name}에 응답하지 않은 문항이 있습니다.`,
    errTitle: '응답하지 않았거나 확인이 필요한 문항이 있습니다.',
    submitErrTitle: '응답을 제출하지 못했습니다.',
    submitErrKeep: '작성하신 응답은 이 기기에 그대로 보관되어 있습니다. 아래 ‘다시 제출하기’ 버튼을 눌러 주세요.',
    submitting2: '응답을 제출하고 있습니다.',
    errTimeout: '서버 응답이 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
    errNetwork: '네트워크에 연결할 수 없습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
    errVersion: '설문이 갱신되었습니다. 페이지를 새로고침한 뒤 다시 제출해 주세요.',
    errStorage: '응답을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    errServer: (code) => `서버 오류가 발생했습니다. (코드 ${code})`,
    errCheck: '응답 내용을 확인해 주세요.',
    submitFailAnnounce: '응답을 제출하지 못했습니다. 다시 제출하기 버튼을 눌러 주세요.',
    submitOkAnnounce: '응답이 정상적으로 제출되었습니다.',
  },
  en: {
    locale: 'en-US',
    docTitle: 'Jeonju BURI Giwa Chocolate Tasting Survey',
    prev: 'Back', next: 'Next', submit: 'Submit', resubmit: 'Submit again', submitting: 'Submitting…',
    stepCount: (i, n) => `Step ${i} of ${n}`,
    stepAria: (i, n) => `Step ${i} of ${n}`,
    progressLabel: 'Survey progress',
    navLabel: 'Survey navigation',
    skip: 'Skip to content',
    otherPlaceholder: 'Please specify',
    otherAria: (num) => `Q${num} other answer`,
    counterUnitExact: (n) => `choose ${n}`,
    counterUnitMax: (n) => `up to ${n}`,
    counter: (c, unit) => `${c} selected (${unit})`,
    counterFull: (c, unit) => `${c} selected (${unit}). To change, unselect one first.`,
    scalePicked: (v, label) => `${v} · ${label}`,
    scaleAria: (v, label) => `${v} – ${label}`,
    freeTextAria: (num) => `Q${num} comments`,
    selectAria: (num) => `Q${num} choose one`,
    amountLabel: 'Enter an amount',
    amountUnit: 'KRW',
    amountAria: (num) => `Q${num} amount in KRW`,
    amountPreview: (n) => `Entered: KRW ${n.toLocaleString('en-US')} (₩${n.toLocaleString('en-US')})`,
    amountTooMuch: (max) => ` — please enter KRW ${max.toLocaleString('en-US')} or less`,
    wtpConfirm: 'After you tap “Next”, the proposed price will be shown and you will not be able to change this answer.',
    wtpLocked: 'This answer is locked because the proposed price has already been shown. This keeps your original answer unchanged.',
    tabsAria: 'Choose a chocolate to rate',
    panelTitle: (f) => f.en,
    tabName: (f) => f.enShort,
    flavorIntro: (f) => (f.id === 'moju' ? 'Inspired by Moju, a traditional drink from Jeonju.' : ''),
    nextFlavor: 'Next chocolate →',
    tabDone: 'Done',
    tabPartial: (d, t) => `${d} of ${t} answered`,
    tabNone: 'Not started',
    tabAria: (name, c) => `${name}, ${c.complete ? 'done' : `${c.done} of ${c.total} answered`}`,
    tabAnnounce: (name) => `Now rating: ${name}`,
    part: (s) => `PART ${s}`,
    sectionLabel: (s, name) => `${s}. ${name}`,
    productLead: [
      'Below is a product plan for a 9-piece Giwa Chocolate gift set being developed by Jeonju BURI.',
      'Giwa Chocolate is a chocolate gift set inspired by the curved roof tiles of traditional Korean houses. It has three flavors — Moju, Lotus Leaf, and Coffee — with 3 pieces of each.',
    ],
    productImagePending: 'Product image coming soon',
    compoTitle: 'Contents',
    compoEach: '3 pieces',
    compoTotal: 'Total: 9 pieces',
    infoTitle: 'Product details',
    prototypeNote: '※ This is a prototype still in development. The final product’s specifications and design may change.',
    productAssume: 'Please answer as if you were buying this product as a gift or souvenir during a trip to Jeonju.',
    allergyTitle: '⚠ Allergy notice',
    allergyLines: [
      'If you are allergic to cinnamon or chocolate, please do not taste the samples.',
      'If you notice any reaction during or after tasting, stop eating and tell a staff member right away.',
    ],
    ingredientsLabel: 'Main ingredients',
    introEyebrow: 'JEONJU BURI',
    introTitle: 'Giwa Chocolate Tasting Survey',
    introBody: [
      'This survey asks about the taste and appeal of chocolate prototypes we are developing.',
      'There are no right or wrong answers. Please be honest, even if you did not like the taste or would not buy it.',
    ],
    facts: (n) => [
      ['Samples', 'Moju, Lotus Leaf, and Coffee Chocolate (prototypes)'],
      ['Length', `${n} steps · you can go back and change answers`],
      ['Anonymous', 'We do not collect your name, contact details, or workplace'],
    ],
    changeLang: '언어 변경 / Change language',
    doneRecord: (when) => `A response was already submitted from this device${when ? ` on ${when}` : ''}.`,
    doneRecord2: 'If you have already taken part, please do not answer again. If someone else is using this device, please go ahead.',
    draftSaved: (when, step) => `You have an unfinished response saved on this device.${when ? ` (Last saved ${when}, step ${step})` : ''}`,
    resume: 'Continue',
    restart: 'Start over',
    restartConfirm: 'Delete the saved answers and start over?',
    start: 'Start the survey',
    doneBadge: 'Your response has been submitted',
    doneTitle: 'Thank you for participating!',
    doneBody: 'Your feedback will help us improve the taste and overall design of Jeonju BURI’s Giwa Chocolate gift set.',
    doneMeta: (when, id) => `Submitted ${when}${id ? ` · Response no. ${id}` : ''}`,
    nextPerson: 'Start a new response for the next person',
    stepAnnounce: (i, title) => `Step ${i}: ${title}`,
    tastingErrTitle: 'Some questions have not been answered yet.',
    tastingErrBody: ' Please rate all three chocolates to continue.',
    tastingErrAnnounce: (name) => `Some questions about the ${name} are not answered yet.`,
    errTitle: 'Some answers are missing or need checking.',
    submitErrTitle: 'We could not submit your response.',
    submitErrKeep: 'Your answers are still saved on this device. Please tap “Submit again” below.',
    submitting2: 'Submitting your response.',
    errTimeout: 'The server is taking too long to respond. Please check your connection and try again.',
    errNetwork: 'We cannot connect to the network. Please check your internet connection and try again.',
    errVersion: 'The survey has been updated. Please refresh the page and submit again.',
    errStorage: 'We could not save your response. Please try again in a moment.',
    errServer: (code) => `A server error occurred. (Code ${code})`,
    errCheck: 'Please check your answers.',
    submitFailAnnounce: 'We could not submit your response. Please tap Submit again.',
    submitOkAnnounce: 'Your response has been submitted.',
  },
};

function koreanAmount(n) {
  if (!n) return '';
  const man = Math.floor(n / 10000);
  const rest = n % 10000;
  const parts = [];
  if (man) parts.push(`${man.toLocaleString('ko-KR')}만`);
  if (rest) parts.push(rest.toLocaleString('ko-KR'));
  return `${parts.join(' ')}원`;
}

// ---------- 영어 문항 ----------
export const SECTIONS_EN = {
  A: 'About You',
  B: 'Tasting the Three Chocolates',
  C: 'Comparing the Chocolates',
  D: 'Food Souvenir Purchases While Traveling',
  E: 'Product Evaluation and Price',
  F: 'Proposed Price and Purchase Decision',
  G: 'Purchase Barriers and Improvements',
  H: 'Sales Channels and Final Feedback',
};

export const STEP_INTRO_EN = {
  tasting: [
    'Please taste the Moju, Lotus Leaf, and Coffee Chocolates and rate each one.',
    'You will know the name of each chocolate while tasting. Please rate how much you like its actual taste and what could be improved.',
    'You can move on after rating all three.',
    'Use the Moju / Lotus Leaf / Coffee tabs below to switch between chocolates at any time.',
  ],
  compare: ['Now that you have tasted all three, please compare them.'],
  experience: [
    'The next questions are about food souvenirs you have bought while traveling.',
    'Please answer based on purchases you paid for yourself.',
  ],
  price: [
    'The proposed retail price of this product is KRW 27,900 (₩27,900).',
    'From here on, please answer as if you had to pay this price.',
  ],
  improve: [
    'The next questions will help us improve the product and make it easier to buy.',
    'Please choose what matters to you when deciding whether to buy.',
  ],
};

const OTHER_EN = 'Other';
const INTENT_EN = {
  definitely: 'I would definitely buy it',
  likely: 'I would likely buy it',
  maybe: 'I might buy it, depending on the situation',
  unlikely: 'I would be unlikely to buy it',
  no: 'I would not buy it',
};

// 맛별 평가 문항(맛 이름이 들어가는 템플릿)
const FLAVOR_EN = {
  satisfaction: (n) => ({
    title: `How satisfied are you with the overall taste of the ${n}?`, short: 'Overall taste',
    options: { 1: 'Very dissatisfied', 2: 'Dissatisfied', 3: 'Neutral', 4: 'Satisfied', 5: 'Very satisfied' },
    scaleEnds: ['Very dissatisfied', 'Very satisfied'],
  }),
  sweetness: (n) => ({
    title: `How would you rate the sweetness of the ${n}?`, short: 'Sweetness',
    options: { 1: 'Much too weak', 2: 'Slightly too weak', 3: 'Just right', 4: 'Slightly too strong', 5: 'Much too strong' },
  }),
  aroma: (n) => ({
    title: `How would you rate the intensity of the distinctive flavor and aroma of the ${n}?`, short: 'Flavor and aroma',
    options: { 1: 'Much too weak to notice', 2: 'Slightly too weak', 3: 'Just right', 4: 'Slightly too strong', 5: 'Much too strong' },
  }),
  improve: (n) => ({
    title: `What do you think needs improvement in the ${n}?`, short: 'Improvements', hint: 'Select all that apply',
    options: {
      sweet_strong: 'Too sweet', sweet_weak: 'Not sweet enough', aroma_artificial: 'Aroma is too strong or tastes artificial',
      flavor_weak: 'Distinctive flavor is too weak', bitter: 'Unpleasant bitterness or astringency',
      texture: 'Texture or melting sensation could be improved', aftertaste: 'Unpleasant aftertaste',
      none: 'Nothing needs improvement', other: OTHER_EN,
    },
  }),
};

const countryOptionsEn = Object.fromEntries(Object.entries(COUNTRY_NAMES).map(([c, v]) => [c, v.en]));

export const QUESTIONS_EN = {
  age: {
    title: 'What is your age group?', short: 'Age group',
    options: { '20_24': '20–24', '25_29': '25–29', '30_34': '30–34', '35_39': '35–39', '40_49': '40–49', '50_59': '50–59', '60_plus': '60 or older' },
  },
  gender: { title: 'What is your gender?', short: 'Gender', options: { female: 'Female', male: 'Male' } },
  occupation: {
    title: 'Which of the following best describes your current occupation?', short: 'Occupation',
    options: { worker: 'Employed (office or company worker)', student: 'Student', other: OTHER_EN },
  },
  residence: {
    title: 'Where do you currently live?', short: 'Place of residence',
    options: {
      jeonju: 'Jeonju', jeonbuk_other: 'Elsewhere in Jeonbuk State (Jeollabuk-do)', capital: 'Seoul Capital Area (Seoul, Gyeonggi, Incheon)',
      other_domestic: 'Elsewhere in Korea', overseas: 'Outside Korea',
    },
  },
  residence_country: {
    title: 'Which country do you currently live in?', short: 'Country of residence',
    note: 'Please choose the country where you live now, not your nationality.', placeholder: 'Select a country',
    options: { ...countryOptionsEn, other: 'Other (not listed)' },
  },
  visit: {
    title: 'Which of the following best describes your experience visiting Jeonju?', short: 'Jeonju visits',
    options: {
      visiting_now: 'I am visiting Jeonju as a tourist right now.',
      within_1y: 'I visited Jeonju as a tourist within the past year.',
      within_3y: 'I visited Jeonju as a tourist between 1 and 3 years ago.',
      over_3y: 'I last visited Jeonju more than 3 years ago.',
      never: 'I have never visited Jeonju.',
      resident: 'I currently live in Jeonju.',
    },
  },
  moju_exp: {
    title: 'Have you ever tried Moju, a traditional drink from Jeonju?', short: 'Tried Moju',
    options: { yes: 'Yes', no: 'No', unsure: 'I’m not sure' },
  },
  best_taste: {
    title: 'Which of the three chocolates did you find the most delicious?', short: 'Most delicious',
    options: { moju: 'Moju Chocolate', lotus: 'Lotus Leaf Chocolate', coffee: 'Coffee Chocolate', similar: 'All three were about the same', none: 'I didn’t like any of them' },
  },
  most_unique: {
    title: 'Compared with typical chocolate, which one had the most unique taste?', short: 'Most unique',
    options: { moju: 'Moju Chocolate', lotus: 'Lotus Leaf Chocolate', coffee: 'Coffee Chocolate', similar: 'All three were about the same', no_diff: 'I didn’t notice any particular difference' },
  },
  concept_fit: {
    title: 'How well does the actual taste of each chocolate match what you expected from its name?', short: 'Match with name',
    hint: 'Rate each from 1 (not at all) to 5 (very well).',
    options: { 1: 'Not at all', 2: 'Not well', 3: 'Neutral', 4: 'Well', 5: 'Very well' },
    scaleEnds: ['Not at all', 'Very well'],
  },
  souvenir_fit: {
    title: 'Which flavor would make the best souvenir of a trip to Jeonju?', short: 'Best souvenir flavor', hint: 'Select all that apply',
    options: { moju: 'Moju Chocolate', lotus: 'Lotus Leaf Chocolate', coffee: 'Coffee Chocolate', none: 'None of them' },
  },
  souv_freq: {
    title: 'In the past year, how many times have you bought food souvenirs while traveling?', short: 'Souvenir purchases (past year)',
    options: { '5_plus': '5 or more times', '3_4': '3–4 times', '1_2': '1–2 times', none: 'Never' },
  },
  souv_spend: {
    title: 'How much did you pay for the most recent food souvenir you bought in the past year?', short: 'Last souvenir price',
    note: 'If you bought several items, answer for one item or one gift set. Please enter the amount in Korean won (KRW). If you paid in another currency, an approximate amount is fine.',
    noneLabel: 'I bought one but don’t remember the price',
  },
  souv_target: {
    title: 'When you buy food souvenirs while traveling, who are they usually for?', short: 'Who souvenirs are for', hint: 'Select all that apply',
    options: { self: 'Myself', partner: 'My partner or spouse', family: 'Family', friend: 'Close friends', coworker: 'Coworkers', acquaintance: 'Acquaintances or groups', none: 'I don’t buy food souvenirs' },
  },
  souv_criteria: {
    title: 'What are the two most important things to you when buying food souvenirs while traveling?', short: 'Key buying factors', hint: 'Choose 2',
    note: '“I don’t plan to buy food souvenirs” cannot be combined with other answers.',
    options: {
      taste: 'Taste and food quality', local: 'Local character and symbolism of the place', package: 'Premium packaging',
      value: 'Quantity and contents for the price', rarity: 'Hard to find anywhere else', brand: 'Brand recognition and trust',
      portable: 'Easy to store and carry', other: OTHER_EN, no_intent: 'I don’t plan to buy food souvenirs',
    },
  },
  wtp: {
    title: 'Before seeing the proposed retail price, what is the maximum amount you would be willing to pay for this 9-piece chocolate gift set?',
    short: 'Maximum price you would pay',
    note: 'Assume there are no discounts or special offers. Enter the most you would actually pay, in Korean won (KRW).',
    noneLabel: 'I would not purchase this product at any price.',
  },
  intent_27900: {
    title: 'Imagine you are buying a gift during a trip to Jeonju. Would you buy the 9-piece Giwa Chocolate gift set if it cost KRW 27,900?',
    short: 'Purchase intent at KRW 27,900', options: INTENT_EN,
  },
  choice_30000: {
    title: 'Imagine you can buy only one food souvenir before leaving Jeonju, with a budget of KRW 30,000. Which would you choose?',
    short: 'Choice with a KRW 30,000 budget',
    image: { alt: 'An orange gift box and an individually wrapped handmade choco pie', caption: 'Comparison example · Choco pie, 10 pieces, KRW 23,000' },
    options: {
      buri: 'Jeonju BURI Giwa Chocolate, 9 pieces (KRW 27,900)', known: 'A Jeonju food souvenir I already know or prefer',
      other_food: 'A different kind of food souvenir', save: 'I would not buy a food souvenir and would save the money',
    },
  },
  reason_buy: {
    title: 'What were the most important reasons for your choice?', short: 'Reasons for choosing', hint: 'Choose up to 2',
    note: (num) => `You chose the Jeonju BURI Giwa Chocolate in Q${num}. Please tell us why.`,
    options: {
      taste_satisfied: 'I liked the taste of the chocolates I tried', special_flavor: 'Special flavors such as Moju, Lotus Leaf, and Coffee',
      design: 'The unique design inspired by Giwa roof tiles', memento: 'It is a good way to remember my trip to Jeonju',
      premium: 'It looks premium enough to give as a gift', differentiated: 'It stands out from souvenirs from other regions',
      price_ok: 'The price and contents seem reasonable', other: OTHER_EN,
    },
  },
  reason_not: {
    title: 'What were the most important reasons for your choice?', short: 'Reasons for not choosing', hint: 'Choose up to 2',
    note: (num) => `You chose something other than the Jeonju BURI Giwa Chocolate in Q${num}. Please tell us why.`,
    options: {
      price_high: 'KRW 27,900 feels too expensive', small_qty: 'There seems to be too little chocolate for the price',
      quality_doubt: 'I’m not confident enough about the taste and quality', not_special: 'It doesn’t feel special enough as a Jeonju souvenir',
      prefer_other: 'I already have another product I prefer', taste_mismatch: 'It may not suit the taste of the person I’m buying for',
      storage: 'I’m worried about storing or carrying chocolate', package: 'The packaging or design didn’t meet my expectations',
      no_interest: 'I’m not interested in chocolate as a gift', no_spend: 'I don’t want to spend money on souvenirs', other: OTHER_EN,
    },
  },
  lower_price_intent: {
    title: 'If there were a different product line with a different set of contents, priced in the mid-KRW 10,000 range (around KRW 15,000), would you buy it?',
    short: 'Intent for a ~KRW 15,000 line',
    note: 'We are asking because you chose a price-related reason in the previous question.',
    options: INTENT_EN,
  },
  info_needed: {
    title: 'What would you most like to check first before deciding to buy this product?', short: 'What to check first', hint: 'Choose 1',
    options: {
      size: 'The actual size and weight of the 9 pieces', taste_composition: 'The overall taste and contents, including all three flavors',
      ingredients: 'Ingredients and quality', package: 'How finished and premium the actual packaging is',
      storage: 'How to store it and its shelf life', reviews: 'Brand reliability and customer reviews', value: 'Value for money',
      none: 'Nothing else to check', other: OTHER_EN,
    },
  },
  improve_priority: {
    title: 'What should be improved first to make you more likely to buy Giwa Chocolate?', short: 'Top improvement', hint: 'Choose 1',
    options: {
      price_down: 'A lower price', size_up: 'Larger chocolates or more pieces', taste: 'Better taste',
      local: 'A stronger sense of Jeonju’s character', package: 'More premium packaging', portable: 'Easier to store and carry',
      enough: 'The current set is good as it is', other: OTHER_EN,
    },
  },
  use_occasion: {
    title: 'In what situations would this product be a good purchase for you?', short: 'Suitable occasions', hint: 'Select all that apply',
    options: {
      gift_close: 'A special gift for family, a partner, or friends during a trip to Jeonju', gift_work: 'A gift for coworkers or acquaintances during a trip to Jeonju',
      self: 'A souvenir to enjoy myself', special_day: 'A gift for holidays or special occasions',
      online_rebuy: 'Ordering it again online after my trip', none: 'I can’t think of a situation',
    },
  },
  channel: {
    title: 'Where would you be most likely to buy this product?', short: 'Preferred sales channel',
    options: {
      hanok_shop: 'A souvenir shop in Jeonju Hanok Village', select_shop: 'A design or lifestyle select shop in Jeonju',
      hotel: 'A shop in a Jeonju hotel or accommodation', dessert: 'A dessert shop in Jeonju', official_online: 'The brand’s official online store',
      gift_platform: 'An online gifting platform', none: 'I would not buy it',
    },
  },
  online_intent: {
    title: 'Even if you didn’t buy Giwa Chocolate during your trip, would you buy it online after your trip?', short: 'Online purchase intent',
    options: {
      active: 'Yes, I would actively buy it', when_gift: 'Yes, when I need a gift', depends: 'Maybe, depending on shipping costs or discounts',
      no_online: 'I would not buy it online', no_product: 'I would not buy this product at all',
    },
  },
  final_comment: {
    title: 'Finally, please tell us the most important reason you would pay for Giwa Chocolate, or anything that makes you hesitate.',
    short: 'Final comments', hint: 'Optional',
  },
};

export const PRODUCT_INFO_EN = ['Size per piece', 'Total weight', 'Packaging', 'Storage', 'Shelf life'];

// ---------- 언어별 문항 생성 ----------
const clone = (x) => JSON.parse(JSON.stringify(x));

function applyEn(q, en, byId) {
  if (!en) return q;
  const out = { ...q };
  if (en.title) out.title = en.title;
  if (en.short) out.short = en.short;
  out.hint = en.hint || (q.hint ? null : q.hint);
  if (en.note !== undefined) out.note = typeof en.note === 'function' ? en.note(byId.choice_30000.num) : en.note;
  else out.note = null;
  if (en.placeholder) out.placeholder = en.placeholder;
  if (en.noneLabel) out.noneLabel = en.noneLabel;
  if (en.scaleEnds) out.scaleEnds = en.scaleEnds;
  if (q.options) out.options = q.options.map((o) => ({ ...o, label: en.options?.[o.value] ?? `⟪${o.value}⟫` }));
  if (q.image) out.image = { ...q.image, ...(en.image || {}) };
  if (q.rows) out.rows = q.rows.map((r) => ({ ...r, label: FLAVORS.find((f) => f.id === r.flavor)?.en ?? r.label }));
  return out;
}

// 표시 언어에 맞춘 단계·문항 목록. 문항 ID·선택지 코드·조건은 원본과 같습니다.
export function localize(lang) {
  if (lang !== 'en') {
    const steps = STEPS;
    return { lang: 'ko', steps, byId: Object.fromEntries(steps.flatMap((s) => s.questions).map((q) => [q.id, q])), sections: SECTIONS, ui: UI.ko,
      productInfo: PRODUCT_INFO.map((i) => ({ label: i.label, value: i.value })), flavorName: (f) => f.name };
  }
  const koById = Object.fromEntries(STEPS.flatMap((s) => s.questions).map((q) => [q.id, q]));
  const steps = STEPS.map((s) => ({
    ...s,
    title: SECTIONS_EN[s.section],
    intro: s.intro ? STEP_INTRO_EN[s.id] : s.intro,
    questions: s.questions.map((q) => {
      if (q.flavor) {
        const f = FLAVORS.find((x) => x.id === q.flavor);
        const key = q.id.slice(f.id.length + 1);
        return applyEn(q, FLAVOR_EN[key](f.en), koById);
      }
      return applyEn(q, QUESTIONS_EN[q.id], koById);
    }),
  }));
  return {
    lang: 'en', steps, byId: Object.fromEntries(steps.flatMap((s) => s.questions).map((q) => [q.id, q])), sections: SECTIONS_EN, ui: UI.en,
    productInfo: PRODUCT_INFO.map((i, n) => ({ label: PRODUCT_INFO_EN[n], value: i.valueEn ?? '' })), flavorName: (f) => f.en,
  };
}

// 번역 누락 검사(테스트용): 영어 문구가 없는 항목 목록을 돌려줍니다.
export function missingTranslations() {
  const missing = [];
  const L = localize('en');
  const hangul = /[ㄱ-힝]/;
  for (const s of L.steps) {
    if (hangul.test(s.title)) missing.push(`step:${s.id}:title`);
    (s.intro || []).forEach((t, i) => { if (!t || hangul.test(t)) missing.push(`step:${s.id}:intro${i}`); });
    if (s.intro && !STEP_INTRO_EN[s.id]) missing.push(`step:${s.id}:intro`);
    for (const q of s.questions) {
      const ko = STEPS.flatMap((x) => x.questions).find((x) => x.id === q.id);
      for (const k of ['hint', 'note', 'noneLabel', 'placeholder']) if (ko[k] && !q[k]) missing.push(`${q.id}:${k}(없음)`);
      for (const k of ['title', 'short', 'hint', 'note', 'noneLabel', 'placeholder']) {
        if (q[k] && hangul.test(q[k])) missing.push(`${q.id}:${k}`);
      }
      (q.options || []).forEach((o) => { if (/^⟪/.test(o.label) || hangul.test(o.label)) missing.push(`${q.id}:option:${o.value}`); });
      (q.scaleEnds || []).forEach((t) => { if (hangul.test(t)) missing.push(`${q.id}:scaleEnds`); });
      (q.rows || []).forEach((r) => { if (hangul.test(r.label)) missing.push(`${q.id}:row:${r.id}`); });
      if (q.image && (hangul.test(q.image.alt) || hangul.test(q.image.caption || ''))) missing.push(`${q.id}:image`);
    }
  }
  return missing;
}
