// 설문 관리자 대시보드 — 실제 저장된 응답만 집계합니다.
import { FLAVORS, QUESTION_BY_ID, FLAVOR_OPTIONS, PROPOSED_PRICE, labelOf, SURVEY_VERSION } from '../schema.js';

const API = '/api/survey/admin';
const TOKEN_KEY = 'buriSurvey.adminToken';
const $ = (s, r = document) => r.querySelector(s);
const qn = (id) => `Q${QUESTION_BY_ID[id].num}`;
const flavorQs = (key) => FLAVORS.map((f) => qn(`${f.id}_${key}`)).join('·');

const ss = {
  get() { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(v) { try { sessionStorage.setItem(TOKEN_KEY, v); } catch { /* 저장 불가 시 메모리만 사용 */ } },
  del() { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* 무시 */ } },
};
let token = ss.get();
let data = [];

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '–');
const fmt1 = (n) => (n === null || Number.isNaN(n) ? '–' : n.toFixed(2));
const won = (n) => `${Math.round(n).toLocaleString('ko-KR')}원`;
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
function median(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const kst = (iso) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
const kstDay = (iso) => new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString().slice(0, 10);
const durationText = (sec) => (sec == null ? '–' : `${Math.floor(sec / 60)}분 ${String(sec % 60).padStart(2, '0')}초`);

// ---------- 인증 · 불러오기 ----------
async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) }, cache: 'no-store' });
  return res;
}

async function load() {
  const dash = $('#ad-dashboard');
  dash.replaceChildren(h('p', { class: 'ad-empty', role: 'status', text: '응답을 불러오는 중입니다…' }));
  let res;
  try { res = await api('/responses'); } catch { return showMessage('서버에 연결할 수 없습니다. 네트워크를 확인한 뒤 새로고침해 주세요.'); }
  if (res.status === 401) { logout('인증이 만료되었거나 비밀번호가 올바르지 않습니다.'); return; }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return showMessage(body.message || `오류가 발생했습니다. (코드 ${res.status})`);
  data = body.responses || [];
  render(body.generatedAt);
}
function showMessage(msg) {
  $('#ad-dashboard').replaceChildren(h('div', { class: 'sv-alert sv-alert--error', role: 'alert', text: msg }));
}

function showLogin(msg) {
  $('#ad-login').hidden = false;
  $('#ad-dashboard').hidden = true;
  $('#ad-actions').hidden = true;
  $('#ad-nav').hidden = true;
  $('#ad-login-error').textContent = msg || '';
  $('#ad-password').focus();
}
function showDashboard() {
  $('#ad-login').hidden = true;
  $('#ad-dashboard').hidden = false;
  $('#ad-actions').hidden = false;
  $('#ad-nav').hidden = false;
}
function logout(msg) { token = null; ss.del(); data = []; $('#ad-dashboard').replaceChildren(); showLogin(msg); }

$('#ad-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = $('#ad-password').value;
  if (!pw) { $('#ad-login-error').textContent = '비밀번호를 입력해 주세요.'; return; }
  const btn = $('#ad-login-btn');
  btn.disabled = true; btn.classList.add('is-busy'); btn.textContent = '확인 중…';
  token = pw;
  try {
    const res = await api('/responses');
    if (res.status === 401) { token = null; $('#ad-login-error').textContent = '비밀번호가 올바르지 않습니다.'; return; }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { token = null; $('#ad-login-error').textContent = body.message || `오류가 발생했습니다. (코드 ${res.status})`; return; }
    ss.set(pw);
    $('#ad-password').value = '';
    showDashboard();
    data = body.responses || [];
    render(body.generatedAt);
    $('#ad-main').focus();
  } catch {
    token = null; $('#ad-login-error').textContent = '서버에 연결할 수 없습니다.';
  } finally {
    btn.disabled = false; btn.classList.remove('is-busy'); btn.textContent = '확인';
  }
});
$('#ad-refresh').addEventListener('click', load);
$('#ad-logout').addEventListener('click', () => logout('로그아웃했습니다.'));

// ---------- 차트 구성 요소 ----------
function barList(items, total, { unit = '명' } = {}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return h('ul', { class: 'ad-bars' }, items.map((i) => h('li', { class: `ad-bar ${i.cls || ''}`, title: `${i.label}: ${i.count}${unit} (${pct(i.count, total)})` },
    h('span', { class: 'ad-bar__label', text: i.label }),
    h('span', { class: 'ad-bar__track', 'aria-hidden': 'true' }, h('span', { class: 'ad-bar__fill', style: { width: `${(i.count / max) * 100}%` } })),
    h('span', { class: 'ad-bar__value' }, `${i.count}${unit} `, h('small', { text: pct(i.count, total) })))));
}
function panel(title, sub, ...content) {
  return h('div', { class: 'ad-panel' }, h('h3', { text: title }), sub ? h('p', { class: 'ad-sub', text: sub }) : null, ...content);
}
function legend() {
  return h('ul', { class: 'ad-legend', 'aria-label': '범례' }, FLAVORS.map((f) => h('li', { class: `ad-s-${f.id}` },
    h('span', { class: 'ad-swatch', style: { background: 'var(--ad-bar)' } }), f.name)));
}
// 맛 3종을 같은 축에서 비교하는 그룹 막대(선택지별 비율)
function flavorGroups(options, getter) {
  const n = data.length;
  return h('div', {}, legend(), options.map((o) => h('div', { class: 'ad-group' },
    h('p', { class: 'ad-group__label', text: o.label }),
    FLAVORS.map((f) => {
      const c = data.filter((r) => getter(r.flavors[f.id] || {}, o.value)).length;
      return h('div', { class: `ad-bar ad-s-${f.id}`, title: `${f.name} · ${o.label}: ${c}명 (${pct(c, n)})` },
        h('span', { class: 'ad-bar__label', text: f.short }),
        h('span', { class: 'ad-bar__track', 'aria-hidden': 'true' }, h('span', { class: 'ad-bar__fill', style: { width: `${n ? (c / n) * 100 : 0}%` } })),
        h('span', { class: 'ad-bar__value' }, `${c}명 `, h('small', { text: pct(c, n) })));
    }))));
}
function countSingle(id, getter) {
  const q = QUESTION_BY_ID[id];
  return q.options.map((o) => ({ label: o.label, count: data.filter((r) => getter(r) === o.value).length }));
}
function countMulti(id, getter, base) {
  const q = QUESTION_BY_ID[id];
  const rows = base || data;
  return q.options.map((o) => ({ label: o.label, count: rows.filter((r) => (getter(r) || []).includes(o.value)).length }))
    .sort((a, b) => b.count - a.count);
}
function tableEl(head, rows, numCols = []) {
  return h('div', { class: 'ad-table-wrap' }, h('table', { class: 'ad-table' },
    h('thead', {}, h('tr', {}, head.map((t, i) => h('th', { class: numCols.includes(i) ? 'num' : null, scope: 'col', text: t })))),
    h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c, i) => h('td', { class: numCols.includes(i) ? 'num' : null }, c)))))));
}
const flavorCell = (f) => h('span', { class: `ad-s-${f.id}` }, h('span', { class: 'ad-flavor-dot', style: { background: 'var(--ad-bar)' } }), f.name);

// ---------- 화면 ----------
function render(generatedAt) {
  const dash = $('#ad-dashboard');
  const n = data.length;
  const head = h('p', { class: 'ad-sub ad-msg', text: `설문 버전 ${SURVEY_VERSION} · 조회 시각 ${generatedAt ? kst(generatedAt) : ''} · 실제 저장된 응답 ${n}건 기준` });
  if (!n) {
    dash.replaceChildren(head, h('div', { class: 'ad-panel' }, h('p', { class: 'ad-empty', text: '아직 제출된 응답이 없습니다.' })), downloadSection());
    return;
  }
  dash.replaceChildren(head, overview(), flavorSection(), purchaseSection(), commentSection(), respondentSection(), downloadSection());
}

function overview() {
  const n = data.length;
  const durations = data.map((r) => r.duration_sec).filter((x) => Number.isInteger(x));
  const days = {};
  data.forEach((r) => { const d = kstDay(r.submitted_at); days[d] = (days[d] || 0) + 1; });
  const repeat = data.filter((r) => r.device_prior_submissions > 0).length;
  return h('section', { class: 'ad-section', id: 'overview', 'aria-labelledby': 'ov-t' },
    h('h2', { id: 'ov-t', text: 'A. 설문 현황' }),
    h('div', { class: 'ad-stats' },
      stat('총 제출 응답', `${n}건`),
      stat('응답 소요시간 중앙값', durationText(median(durations) == null ? null : Math.round(median(durations))), `평균 ${durationText(mean(durations) == null ? null : Math.round(mean(durations)))} · ${durations.length}건 기준`),
      stat('동일 기기 재참여 응답', `${repeat}건`, '같은 브라우저에서 이전 제출 기록이 있는 응답')),
    h('div', { class: 'ad-grid' },
      panel('응답 일자별 추이', '한국 시간 기준 제출 일자', barList(Object.keys(days).sort().map((d) => ({ label: d, count: days[d] })), n, { unit: '건' })),
      panel('연령대 분포', qn('age'), barList(countSingle('age', (r) => r.age_group), n)),
      panel('거주지역 분포', qn('residence'), barList(countSingle('residence', (r) => r.residence), n)),
      panel('전주 방문 경험 분포', qn('visit'), barList(countSingle('visit', (r) => r.jeonju_visit), n)),
      panel('모주 음용 경험', qn('moju_exp'), barList(countSingle('moju_exp', (r) => r.moju_experience), n))));
}
function stat(label, value, note) {
  return h('div', { class: 'ad-stat' }, h('p', { class: 'ad-stat__label', text: label }), h('p', { class: 'ad-stat__value', text: value }), note ? h('p', { class: 'ad-stat__note', text: note }) : null);
}

function flavorSection() {
  const n = data.length;
  const rows = FLAVORS.map((f) => {
    const xs = data.map((r) => r.flavors[f.id]).filter(Boolean);
    const sat = xs.map((x) => x.satisfaction);
    const top2 = sat.filter((v) => v >= 4).length;
    return [flavorCell(f), String(xs.length), fmt1(mean(sat)), pct(top2, xs.length), fmt1(mean(xs.map((x) => x.sweetness))),
      pct(xs.filter((x) => x.sweetness === 3).length, xs.length), fmt1(mean(xs.map((x) => x.aroma))),
      pct(xs.filter((x) => x.aroma === 3).length, xs.length), fmt1(mean(xs.map((x) => x.concept_fit)))];
  });
  const improveRows = FLAVOR_OPTIONS.improvements.map((o) => [o.label, ...FLAVORS.map((f) => {
    const c = data.filter((r) => (r.flavors[f.id]?.improvements || []).includes(o.value)).length;
    return `${c}명 (${pct(c, n)})`;
  })]);
  const choice = (id, key) => barList(countSingle(id, (r) => r[key]), n);
  return h('section', { class: 'ad-section', id: 'flavors', 'aria-labelledby': 'fl-t' },
    h('h2', { id: 'fl-t', text: 'B. 맛별 평가 결과' }),
    h('div', { class: 'ad-grid' },
      h('div', { class: 'ad-panel ad-panel--wide' }, h('h3', { text: '맛 3종 비교 요약' }),
        h('p', { class: 'ad-sub', text: '만족도·제품명 기대 적합도: 1~5점 평균. 단맛·향: 1(지나치게 약함)~5(지나치게 강함) 평균, 3이 ‘적당함’.' }),
        tableEl(['맛', '응답', '평균 만족도', '만족(4~5점)', '단맛 평균', '단맛 적당함', '향·풍미 평균', '향·풍미 적당함', '제품명 기대 적합도'], rows, [1, 2, 3, 4, 5, 6, 7, 8])),
      panel('만족도 분포', flavorQs('satisfaction'), flavorGroups(FLAVOR_OPTIONS.satisfaction.map((o) => ({ ...o, label: `${o.value}점 ${o.label}` })), (x, v) => x.satisfaction === v)),
      panel('단맛 평가 분포', flavorQs('sweetness'), flavorGroups(FLAVOR_OPTIONS.sweetness, (x, v) => x.sweetness === v)),
      panel('향·풍미 평가 분포', flavorQs('aroma'), flavorGroups(FLAVOR_OPTIONS.aroma, (x, v) => x.aroma === v)),
      panel('제품명 기대 적합도 분포', qn('concept_fit'), flavorGroups(FLAVOR_OPTIONS.concept_fit.map((o) => ({ ...o, label: `${o.value}점 ${o.label}` })), (x, v) => x.concept_fit === v)),
      h('div', { class: 'ad-panel ad-panel--wide' }, h('h3', { text: '맛별 개선 요구' }), h('p', { class: 'ad-sub', text: `${flavorQs('improve')} 복수 선택, 비율은 전체 응답자 대비` }),
        tableEl(['개선 요소', ...FLAVORS.map((f) => f.name)], improveRows, [1, 2, 3])),
      panel('가장 맛있는 초콜릿', qn('best_taste'), choice('best_taste', 'best_taste')),
      panel('가장 독특한 초콜릿', qn('most_unique'), choice('most_unique', 'most_unique')),
      panel('전주 기념품으로 적합한 맛', qn('souvenir_fit'), choice('souvenir_fit', 'souvenir_fit'))));
}

function purchaseSection() {
  const n = data.length;
  const P = (r) => r.purchase || {};
  const amounts = data.map((r) => P(r).wtp_amount).filter((x) => Number.isInteger(x));
  const noIntent = data.filter((r) => P(r).wtp_no_intent).length;
  const revised = data.filter((r) => P(r).wtp_revised_after_price).length;
  const buckets = [[0, 10000, '10,000원 미만'], [10000, 15000, '10,000~14,999원'], [15000, 20000, '15,000~19,999원'], [20000, 25000, '20,000~24,999원'],
    [25000, PROPOSED_PRICE, `25,000~${(PROPOSED_PRICE - 1).toLocaleString('ko-KR')}원`], [PROPOSED_PRICE, 30000, `${PROPOSED_PRICE.toLocaleString('ko-KR')}~29,999원`],
    [30000, 35000, '30,000~34,999원'], [35000, 40000, '35,000~39,999원'], [40000, Infinity, '40,000원 이상']]
    .map(([a, b, label]) => ({ label, count: amounts.filter((x) => x >= a && x < b).length }));
  buckets.push({ label: '가격과 관계없이 구매 의향 없음', count: noIntent });
  const spends = data.map((r) => P(r).souv_spend_amount).filter((x) => Number.isInteger(x));
  const spendBase = data.filter((r) => P(r).souv_freq && P(r).souv_freq !== 'none').length;
  const spendBuckets = [[0, 10000, '10,000원 미만'], [10000, 20000, '10,000~19,999원'], [20000, 25000, '20,000~24,999원'],
    [25000, 30000, '25,000~29,999원'], [30000, 40000, '30,000~39,999원'], [40000, Infinity, '40,000원 이상']]
    .map(([a, b, label]) => ({ label, count: spends.filter((x) => x >= a && x < b).length }));
  spendBuckets.push({ label: '금액이 기억나지 않음', count: data.filter((r) => P(r).souv_spend_unknown === true).length });
  const atOrAbove = amounts.filter((x) => x >= PROPOSED_PRICE).length;
  const notBuri = data.filter((r) => P(r).choice_30000 && P(r).choice_30000 !== 'buri');
  const buri = data.filter((r) => P(r).choice_30000 === 'buri');
  const sp = (id) => barList(countSingle(id, (r) => P(r)[id]), n);
  const mp = (id, base) => barList(countMulti(id, (r) => P(r)[id], base), (base || data).length);
  return h('section', { class: 'ad-section', id: 'purchase', 'aria-labelledby': 'pu-t' },
    h('h2', { id: 'pu-t', text: 'C. 구매의향' }),
    h('div', { class: 'ad-stats' },
      stat('최대 지불의향 중앙값', median(amounts) == null ? '–' : won(median(amounts)), `금액 입력 ${amounts.length}명 기준 · 평균 ${mean(amounts) == null ? '–' : won(mean(amounts))}`),
      stat(`${PROPOSED_PRICE.toLocaleString('ko-KR')}원 이상 지불의향`, pct(atOrAbove, n), `${atOrAbove}명 / 전체 ${n}명`),
      stat('가격 무관 구매 의향 없음', `${noIntent}명`, pct(noIntent, n)),
      stat(`가격 공개 후 ${qn('wtp')} 수정`, `${revised}명`, '지불의향 분석 시 확인 필요')),
    h('div', { class: 'ad-grid' },
      panel('최대 지불의향 금액 분포', qn('wtp'), barList(buckets, n)),
      panel(`${PROPOSED_PRICE.toLocaleString('ko-KR')}원 구매의향`, qn('intent_27900'), sp('intent_27900')),
      panel('예산 30,000원 선택(경쟁상품 대비)', qn('choice_30000'), sp('choice_30000')),
      panel('선택 이유 (전주BURI 선택자)', `${qn('reason_buy')}① · 최대 2개 · 해당 응답자 ${buri.length}명 기준`, buri.length ? mp('reason_buy', buri) : h('p', { class: 'ad-empty', text: '해당 응답 없음' })),
      panel('비선택 이유 (그 외 선택자)', `${qn('reason_not')}② · 최대 2개 · 해당 응답자 ${notBuri.length}명 기준`, notBuri.length ? mp('reason_not', notBuri) : h('p', { class: 'ad-empty', text: '해당 응답 없음' })),
      panel('구매 전 가장 먼저 확인하고 싶은 정보', qn('info_needed'), sp('info_needed')),
      panel('우선 개선 요소', qn('improve_priority'), sp('improve_priority')),
      panel('적합한 구매 상황', qn('use_occasion'), sp('use_occasion')),
      panel('판매채널 선호도', qn('channel'), sp('channel')),
      panel('여행 후 온라인 구매의향', qn('online_intent'), sp('online_intent')),
      panel('최근 1년 기념품 구매 횟수', qn('souv_freq'), sp('souv_freq')),
      panel('최근 기념품 결제금액', `${qn('souv_spend')} · 구매 경험자 ${spendBase}명 기준 · 중앙값 ${median(spends) == null ? '–' : won(median(spends))}`, barList(spendBuckets, spendBase)),
      panel('기념품 구매 대상', `${qn('souv_target')} 복수 선택`, mp('souv_target')),
      panel('기념품 구매 시 중요 요소', `${qn('souv_criteria')} 2개 선택`, mp('souv_criteria'))));
}

function commentList(items) {
  if (!items.length) return h('p', { class: 'ad-empty', text: '작성된 의견이 없습니다.' });
  return h('ul', { class: 'ad-comments' }, items.map((i) => h('li', {}, i.text, h('small', { text: i.meta }))));
}
function commentSection() {
  const meta = (r) => `${kst(r.submitted_at)} · ${labelOf('age', r.age_group)} · ${r.id.slice(0, 8)}`;
  const others = [];
  data.forEach((r) => {
    FLAVORS.forEach((f) => { const x = r.flavors[f.id]; if (x?.improvements_other) others.push({ text: `[${f.name} 개선 요소 기타] ${x.improvements_other}`, meta: meta(r) }); });
    const p = r.purchase || {};
    [['souv_criteria_other', qn('souv_criteria')], ['reason_buy_other', `${qn('reason_buy')}①`], ['reason_not_other', `${qn('reason_not')}②`], ['info_needed_other', qn('info_needed')], ['improve_priority_other', qn('improve_priority')]]
      .forEach(([k, q]) => { if (p[k]) others.push({ text: `[${q} 기타] ${p[k]}`, meta: meta(r) }); });
  });
  return h('section', { class: 'ad-section', id: 'comments', 'aria-labelledby': 'co-t' },
    h('h2', { id: 'co-t', text: 'D. 자유의견' }),
    h('div', { class: 'ad-grid' },
      panel('최종 구매 판단 의견', qn('final_comment'), commentList(data.filter((r) => r.purchase?.final_comment).map((r) => ({ text: r.purchase.final_comment, meta: meta(r) })))),
      panel('기타 입력 내용', '선택지의 ‘기타’ 직접 입력', commentList(others))));
}

function respondentSection() {
  const detail = h('div', { class: 'ad-detail', id: 'ad-detail', tabindex: '-1' });
  const rows = [...data].reverse().map((r) => [
    h('button', { type: 'button', class: 'ad-rowbtn', onclick: () => showDetail(r, detail) }, r.id.slice(0, 8)),
    kst(r.submitted_at), labelOf('age', r.age_group), labelOf('residence', r.residence), labelOf('visit', r.jeonju_visit), labelOf('moju_exp', r.moju_experience),
    ...FLAVORS.map((f) => String(r.flavors[f.id]?.satisfaction ?? '–')),
    r.purchase?.wtp_no_intent ? '의향 없음' : r.purchase?.wtp_amount != null ? won(r.purchase.wtp_amount) : '–',
    labelOf('intent_27900', r.purchase?.intent_27900)]);
  return h('section', { class: 'ad-section', id: 'respondents', 'aria-labelledby': 're-t' },
    h('h2', { id: 're-t', text: '응답자별 원문 조회' }),
    h('div', { class: 'ad-panel' }, h('p', { class: 'ad-sub', text: '응답 번호를 누르면 전체 응답을 볼 수 있습니다. 최근 제출 순.' }),
      tableEl(['응답 번호', '제출 일시', '연령대', '거주지역', '전주 방문', '모주 경험', '모주 만족', '연잎 만족', '커피 만족', '최대 지불의향', '27,900원 구매의향'], rows, [6, 7, 8, 9]),
      detail));
}

function showDetail(r, box) {
  const p = r.purchase || {};
  const list = (id, arr, other) => (arr && arr.length ? arr.map((v) => labelOf(id, v)).join(', ') + (other ? ` (기타: ${other})` : '') : '해당 없음');
  const pairs = (rows) => h('dl', {}, rows.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v == null || v === '' ? '–' : String(v) })]));
  const fl = FLAVORS.map((f) => {
    const x = r.flavors[f.id] || {};
    return [h('h4', { text: f.name }), pairs([
      ['전반적 만족도', x.satisfaction != null ? `${x.satisfaction}점` : null],
      ['단맛', labelOf(`${f.id}_sweetness`, x.sweetness)],
      ['향·풍미', labelOf(`${f.id}_aroma`, x.aroma)],
      ['개선 요소', list(`${f.id}_improve`, x.improvements, x.improvements_other)],
      ['제품명 기대 적합도', x.concept_fit != null ? `${x.concept_fit}점` : null]])];
  });
  box.replaceChildren(h('h3', { text: `응답 ${r.id}` }),
    h('h4', { text: '응답자 정보' }),
    pairs([['제출 일시', kst(r.submitted_at)], ['소요시간', durationText(r.duration_sec)], ['설문 버전', r.survey_version],
      ['동일 기기 이전 제출', `${r.device_prior_submissions}회`], [`${qn('age')} 연령대`, labelOf('age', r.age_group)],
      [`${qn('residence')} 거주지역`, labelOf('residence', r.residence)],
      [`${qn('visit')} 전주 방문 경험`, labelOf('visit', r.jeonju_visit)], [`${qn('moju_exp')} 모주 음용 경험`, labelOf('moju_exp', r.moju_experience)]]),
    ...fl.flat(),
    h('h4', { text: '비교 평가' }),
    pairs([[`${qn('best_taste')} 가장 맛있는 초콜릿`, labelOf('best_taste', r.best_taste)], [`${qn('most_unique')} 가장 독특한 초콜릿`, labelOf('most_unique', r.most_unique)],
      [`${qn('souvenir_fit')} 기념품 적합 맛`, labelOf('souvenir_fit', r.souvenir_fit)]]),
    h('h4', { text: '구매 경험 · 구매의향' }),
    pairs([[`${qn('souv_freq')} 구매 횟수`, labelOf('souv_freq', p.souv_freq)],
      [`${qn('souv_spend')} 결제금액`, p.souv_spend_unknown ? '구매했으나 금액이 기억나지 않음' : p.souv_spend_amount != null ? won(p.souv_spend_amount) : '해당 없음'],
      [`${qn('souv_target')} 구매 대상`, list('souv_target', p.souv_target)], [`${qn('souv_criteria')} 중요 요소`, list('souv_criteria', p.souv_criteria, p.souv_criteria_other)],
      [`${qn('wtp')} 최대 지불의향`, p.wtp_no_intent ? '가격과 관계없이 구매 의향 없음' : p.wtp_amount != null ? won(p.wtp_amount) : null],
      [`${qn('wtp')} 가격 공개 후 수정`, p.wtp_revised_after_price ? '예' : '아니오'],
      [`${qn('intent_27900')} 27,900원 구매의향`, labelOf('intent_27900', p.intent_27900)], [`${qn('choice_30000')} 예산 30,000원 선택`, labelOf('choice_30000', p.choice_30000)],
      [`${qn('reason_buy')}① 선택 이유`, list('reason_buy', p.reason_buy, p.reason_buy_other)], [`${qn('reason_not')}② 비선택 이유`, list('reason_not', p.reason_not, p.reason_not_other)],
      [`${qn('info_needed')} 먼저 확인하고 싶은 정보`, labelOf('info_needed', p.info_needed) + (p.info_needed_other ? ` (기타: ${p.info_needed_other})` : '')],
      [`${qn('improve_priority')} 우선 개선 요소`, labelOf('improve_priority', p.improve_priority) + (p.improve_priority_other ? ` (기타: ${p.improve_priority_other})` : '')],
      [`${qn('use_occasion')} 구매 상황`, labelOf('use_occasion', p.use_occasion)],
      [`${qn('channel')} 판매채널`, labelOf('channel', p.channel)], [`${qn('online_intent')} 온라인 구매의향`, labelOf('online_intent', p.online_intent)],
      [`${qn('final_comment')} 최종 의견`, p.final_comment]]));
  box.focus();
}

function downloadSection() {
  const msg = h('p', { class: 'ad-sub', role: 'status' });
  const dl = async (type, btn) => {
    btn.disabled = true; msg.textContent = 'CSV를 생성하는 중입니다…';
    try {
      const res = await api(`/export?type=${type}`);
      if (res.status === 401) { logout('인증이 만료되었습니다.'); return; }
      if (!res.ok) { msg.textContent = `다운로드에 실패했습니다. (코드 ${res.status})`; return; }
      const blob = await res.blob();
      const name = (res.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/)?.[1] || `buri-survey-${type}.csv`;
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: name });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      msg.textContent = `${name} 파일을 내려받았습니다.`;
    } catch { msg.textContent = '서버에 연결할 수 없습니다.'; } finally { btn.disabled = false; }
  };
  const b1 = h('button', { type: 'button', class: 'sv-btn sv-btn--primary sv-btn--small' }, '응답자별 전체 결과 CSV');
  const b2 = h('button', { type: 'button', class: 'sv-btn sv-btn--ghost sv-btn--small' }, '맛별 평가 데이터 CSV');
  b1.addEventListener('click', () => dl('respondents', b1));
  b2.addEventListener('click', () => dl('flavors', b2));
  return h('section', { class: 'ad-section', id: 'download', 'aria-labelledby': 'dl-t' },
    h('h2', { id: 'dl-t', text: 'E. 데이터 다운로드' }),
    h('div', { class: 'ad-panel' },
      h('p', { class: 'ad-sub', text: '엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 포함합니다. 응답자별 CSV는 1명당 1행이며 다중 선택은 선택지별 0/1 열로 나뉩니다. 맛별 CSV는 응답자 × 맛 1행입니다.' }),
      h('div', { class: 'ad-download' }, b1, b2), msg));
}

// ---------- 시작 ----------
if (token) { showDashboard(); load(); } else showLogin();
