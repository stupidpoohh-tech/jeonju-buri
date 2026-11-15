// 전주BURI 기와 초콜릿 소비자 설문 — 응답 화면
import {
  SURVEY_VERSION, STEPS, SECTIONS, FLAVORS, PRODUCT_IMAGE, PRODUCT_INFO, PACKAGE_IMAGE, TEXT_MAX, OTHER_MAX, AMOUNT_MAX, selectLimit,
  QUESTION_BY_ID, isVisible, validateQuestion, validateStep, validateAll, flavorCompletion,
} from './schema.js';

const API_URL = '/api/survey/responses';
const DRAFT_KEY = 'buriSurvey.draft.v1';
const DONE_KEY = 'buriSurvey.completed.v1';
const DRAFT_TTL = 24 * 3600 * 1000;
const SUBMIT_TIMEOUT = 20000;

const $ = (sel, root = document) => root.querySelector(sel);
const view = $('#sv-view');
const top = $('#sv-top');
const nav = $('#sv-nav');
const prevBtn = $('#sv-prev');
const nextBtn = $('#sv-next');
const statusEl = $('#sv-status');

// ---------- 저장소(임시 저장) ----------
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } },
  set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch { return false; } },
  del(key) { try { localStorage.removeItem(key); } catch { /* 무시 */ } },
};

const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));

function freshState() {
  return {
    responseId: uuid(), startedAt: null, answers: {}, step: -1, maxStep: 0, tab: FLAVORS[0].id,
    priceShown: false, wtpAtPrice: null, wtpRevised: false, savedAt: null,
  };
}
let state = freshState();
let submitting = false;
let submitError = null;
let doneInfo = null;
let saveTimer = null;

function saveDraft(now = false) {
  if (state.step < 0 || doneInfo) return;
  clearTimeout(saveTimer);
  const write = () => { state.savedAt = new Date().toISOString(); store.set(DRAFT_KEY, state); };
  if (now) write(); else saveTimer = setTimeout(write, 250);
}
window.addEventListener('pagehide', () => saveDraft(true));
function loadDraft() {
  const d = store.get(DRAFT_KEY);
  if (!d || typeof d !== 'object' || !d.answers || !d.responseId) return null;
  if (d.savedAt && Date.now() - new Date(d.savedAt).getTime() > DRAFT_TTL) { store.del(DRAFT_KEY); return null; }
  return { ...freshState(), ...d };
}

// ---------- DOM 도우미 ----------
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const announce = (msg) => { statusEl.textContent = ''; requestAnimationFrame(() => { statusEl.textContent = msg; }); };
const won = (n) => `${n.toLocaleString('ko-KR')}원`;
function koreanAmount(n) {
  if (!n) return '';
  const man = Math.floor(n / 10000);
  const rest = n % 10000;
  const parts = [];
  if (man) parts.push(`${man.toLocaleString('ko-KR')}만`);
  if (rest) parts.push(rest.toLocaleString('ko-KR'));
  return `${parts.join(' ')}원`;
}

function stickyOffset() {
  let off = top.hidden ? 0 : top.getBoundingClientRect().height;
  const tabs = $('.sv-tabs-wrap', view);
  if (tabs) off += tabs.getBoundingClientRect().height;
  return off + 12;
}
function scrollToEl(el) {
  const y = el.getBoundingClientRect().top + window.scrollY - stickyOffset();
  window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
}
function syncTopHeight() {
  document.documentElement.style.setProperty('--sv-top-h', `${top.hidden ? 0 : top.getBoundingClientRect().height}px`);
}
if ('ResizeObserver' in window) new ResizeObserver(syncTopHeight).observe(top);

// ---------- 문항 렌더링 ----------
function legend(q, extra) {
  return h('legend', { class: 'sv-q__legend', id: `q-${q.id}-title` },
    h('span', { class: 'sv-q__num', text: `Q${q.num}.` }), q.title,
    q.hint ? h('span', { class: 'sv-q__hint', text: `(${q.hint})` }) : null, extra || null);
}
function questionShell(q, ...body) {
  const err = h('p', { class: 'sv-q__error', id: `q-${q.id}-error`, role: 'alert' });
  const fs = h('fieldset', { class: 'sv-q', id: `q-${q.id}`, 'data-qid': q.id, 'aria-describedby': `q-${q.id}-error` },
    legend(q), q.note ? h('p', { class: 'sv-q__note', text: `※ ${q.note}` }) : null, ...body, err);
  if (!isVisible(q, state.answers)) fs.hidden = true;
  return fs;
}

function otherField(q) {
  const id = `q-${q.id}-other`;
  const input = h('input', {
    class: 'sv-input', type: 'text', id, maxlength: OTHER_MAX, autocomplete: 'off',
    'aria-label': `Q${q.num} 기타 내용`, placeholder: '기타 내용을 입력해 주세요',
    oninput: (e) => { state.answers[`${q.id}_other`] = e.target.value; changed(q.id); },
  });
  input.value = state.answers[`${q.id}_other`] || '';
  return h('div', { class: 'sv-other', id: `${id}-wrap` }, input);
}

function renderChoice(q) {
  const multi = q.type === 'multi';
  const name = `q-${q.id}`;
  const current = state.answers[q.id];
  const list = h('div', { class: 'sv-options' });
  let other = null;
  q.options.forEach((o, i) => {
    const checked = multi ? (current || []).includes(o.value) : current === o.value;
    const input = h('input', { type: multi ? 'checkbox' : 'radio', name, value: String(i), id: `${name}-${i}`, checked });
    input.addEventListener('change', () => onChoice(q, i, input.checked));
    list.append(h('label', { class: `sv-opt${multi ? ' sv-opt--multi' : ''}`, for: `${name}-${i}` },
      input, h('span', { class: 'sv-opt__mark', 'aria-hidden': 'true' }), h('span', { class: 'sv-opt__text', text: o.label })));
    if (o.other) { other = otherField(q); list.append(other); }
  });
  const counter = selectLimit(q) ? h('p', { class: 'sv-counter', id: `q-${q.id}-counter`, 'aria-live': 'polite' }) : null;
  const fs = questionShell(q, list, counter);
  syncChoice(q, fs);
  return fs;
}

function onChoice(q, index, checked) {
  const o = q.options[index];
  if (q.type === 'multi') {
    let arr = [...(state.answers[q.id] || [])];
    if (checked) {
      if (o.exclusive) arr = [o.value];
      else arr = arr.filter((v) => !q.options.find((x) => x.value === v)?.exclusive).concat(arr.includes(o.value) ? [] : [o.value]);
      const limit = selectLimit(q);
      if (limit && arr.length > limit) arr = arr.slice(arr.length - limit);
    } else arr = arr.filter((v) => v !== o.value);
    // 화면 순서대로 정렬
    state.answers[q.id] = q.options.map((x) => x.value).filter((v) => arr.includes(v));
  } else {
    state.answers[q.id] = o.value;
  }
  const fs = $(`#q-${q.id}`);
  if (fs) syncChoice(q, fs);
  changed(q.id);
}

function syncChoice(q, fs) {
  const multi = q.type === 'multi';
  const v = state.answers[q.id];
  const selected = multi ? (v || []) : (v === undefined ? [] : [v]);
  const limit = selectLimit(q);
  const inputs = fs.querySelectorAll(`input[name="q-${q.id}"]`);
  inputs.forEach((input) => {
    const o = q.options[Number(input.value)];
    input.checked = selected.includes(o.value);
    if (limit) input.disabled = !input.checked && !o.exclusive && selected.length >= limit;
  });
  const otherWrap = fs.querySelector('.sv-other');
  if (otherWrap) otherWrap.hidden = !selected.includes('other');
  const counter = fs.querySelector('.sv-counter');
  if (counter) {
    const exclusivePicked = selected.some((x) => q.options.find((o) => o.value === x)?.exclusive);
    const unit = q.exact ? `${limit}개 선택` : `최대 ${limit}개`;
    counter.textContent = exclusivePicked ? ''
      : selected.length >= limit
        ? `${selected.length}개 선택 (${unit}) — 다른 항목으로 바꾸려면 선택한 항목을 먼저 해제해 주세요.`
        : `${selected.length}개 선택 (${unit})`;
  }
}

function scaleRow(q, key, label) {
  const name = `q-${key}`;
  const current = state.answers[key];
  const picked = h('p', { class: 'sv-scale__picked', id: `${name}-picked`, 'aria-hidden': 'true' });
  const row = h('div', { class: 'sv-scale__row' });
  q.options.forEach((o, i) => {
    const input = h('input', { type: 'radio', name, value: String(i), id: `${name}-${i}`, checked: current === o.value, 'aria-label': `${o.value}점 ${o.label}` });
    input.addEventListener('change', () => {
      state.answers[key] = o.value;
      picked.textContent = `${o.value}점 · ${o.label}`;
      changed(q.id);
    });
    row.append(h('label', { class: 'sv-scale__btn', for: `${name}-${i}` }, input, h('span', { 'aria-hidden': 'true', text: String(o.value) })));
  });
  const cur = q.options.find((o) => o.value === current);
  if (cur) picked.textContent = `${cur.value}점 · ${cur.label}`;
  const ends = h('div', { class: 'sv-scale__ends', 'aria-hidden': 'true' }, h('span', { text: `1 ${q.scaleEnds[0]}` }), h('span', { text: `5 ${q.scaleEnds[1]}` }));
  return h('div', { class: 'sv-scale', role: label ? 'radiogroup' : null, 'aria-label': label || null }, row, ends, picked);
}

function renderScale(q) { return questionShell(q, scaleRow(q, q.id)); }

function renderMatrix(q) {
  const rows = q.rows.map((r) => {
    return h('div', { class: 'sv-matrix__row' },
      h('p', { class: 'sv-matrix__label', id: `q-${r.id}-label`, text: r.label }),
      scaleRow(q, r.id, `${r.label} ${q.short}`));
  });
  return questionShell(q, h('div', { class: 'sv-matrix' }, rows));
}

function textArea(id, value, label, onInput) {
  const count = h('p', { class: 'sv-charcount', 'aria-hidden': 'true' });
  const setCount = (v) => { count.textContent = `${v.length} / ${TEXT_MAX}`; };
  const ta = h('textarea', { class: 'sv-textarea', id, maxlength: TEXT_MAX, 'aria-label': label, rows: 4,
    oninput: (e) => { setCount(e.target.value); onInput(e.target.value); } });
  ta.value = value || '';
  setCount(ta.value);
  return [ta, count];
}

function renderText(q) {
  const [ta, count] = textArea(`q-${q.id}-input`, state.answers[q.id], `Q${q.num} 자유의견`, (v) => { state.answers[q.id] = v; changed(q.id); });
  return questionShell(q, ta, count);
}

function renderAmount(q) {
  const a = state.answers;
  const id = `q-${q.id}`;
  const preview = h('p', { class: 'sv-money__preview', id: `${id}-preview`, 'aria-live': 'polite' });
  const input = h('input', { class: 'sv-input sv-money__input', id: `${id}-amount`, type: 'text', inputmode: 'numeric',
    autocomplete: 'off', placeholder: '0', 'aria-label': `Q${q.num} 금액(원)`, 'aria-describedby': `${id}-preview` });
  const box = h('div', { class: 'sv-money' }, input, h('span', { class: 'sv-money__unit', 'aria-hidden': 'true', text: '원' }));
  const none = h('input', { type: 'checkbox', id: `${id}-none`, checked: a[q.noneKey] === true });
  const noneLabel = h('label', { class: 'sv-opt sv-opt--multi', for: `${id}-none` }, none,
    h('span', { class: 'sv-opt__mark', 'aria-hidden': 'true' }), h('span', { class: 'sv-opt__text', text: q.noneLabel }));
  const onChange = () => {
    if (q.id === 'wtp' && state.priceShown) {
      const now = JSON.stringify([a.wtp_amount ?? null, a.wtp_none === true]);
      if (now !== state.wtpAtPrice) state.wtpRevised = true;
    }
    changed(q.id);
  };
  const sync = () => {
    const off = a[q.noneKey] === true;
    input.disabled = off;
    box.classList.toggle('is-off', off);
    input.value = !off && Number.isInteger(a[q.amountKey]) ? a[q.amountKey].toLocaleString('ko-KR') : '';
    preview.textContent = !off && a[q.amountKey] ? `입력 금액: ${koreanAmount(a[q.amountKey])}` : '';
  };
  input.addEventListener('input', () => {
    const digits = input.value.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(0, 7);
    const n = digits ? Number(digits) : null;
    a[q.amountKey] = n;
    const caret = input.value.length - input.selectionStart;
    input.value = n ? n.toLocaleString('ko-KR') : '';
    const pos = Math.max(0, input.value.length - caret);
    try { input.setSelectionRange(pos, pos); } catch { /* 일부 입력 타입 */ }
    preview.textContent = n ? `입력 금액: ${koreanAmount(n)}${n > AMOUNT_MAX ? ` — ${won(AMOUNT_MAX)} 이하로 입력해 주세요` : ''}` : '';
    onChange();
  });
  none.addEventListener('change', () => { a[q.noneKey] = none.checked; sync(); onChange(); });
  sync();
  const notice = q.id === 'wtp' && state.priceShown
    ? h('p', { class: 'sv-alert sv-alert--info', text: '판매가격을 안내받기 전에 생각하셨던 금액을 기준으로 응답해 주세요.' }) : null;
  return questionShell(q, notice,
    h('label', { class: 'sv-label', for: `${id}-amount`, text: '금액 직접 입력' }), box, preview,
    h('div', { class: 'sv-options' }, noneLabel));
}

function renderQuestion(q) {
  switch (q.type) {
    case 'single': case 'multi': return renderChoice(q);
    case 'scale': return renderScale(q);
    case 'matrix': return renderMatrix(q);
    case 'text': return renderText(q);
    case 'amount': return renderAmount(q);
    default: return null;
  }
}

// ---------- 변경 처리 ----------
function changed(qid) {
  const q = QUESTION_BY_ID[qid];
  const fs = $(`#q-${qid}`);
  if (fs && fs.classList.contains('is-error') && !validateQuestion(q, state.answers)) setError(qid, null);
  // 조건부 문항 표시
  for (const step of STEPS) for (const other of step.questions) {
    if (!other.showIf || other.showIf.id !== qid) continue;
    const el = $(`#q-${other.id}`);
    if (el) { const vis = isVisible(other, state.answers); if (el.hidden === vis) { el.hidden = !vis; if (!vis) setError(other.id, null); } }
  }
  if (q && q.flavor) updateTabs();
  if (submitError) { submitError = null; const box = $('#sv-submit-error'); if (box) box.remove(); }
  saveDraft();
}

function setError(qid, msg) {
  const fs = $(`#q-${qid}`);
  if (!fs) return;
  fs.classList.toggle('is-error', !!msg);
  const p = $(`#q-${qid}-error`);
  if (p) p.textContent = msg || '';
}

// ---------- 시식 평가 탭 ----------
function renderTasting(step) {
  const tablist = h('div', { class: 'sv-tabs', role: 'tablist', 'aria-label': '평가할 초콜릿 선택' });
  const panels = [];
  FLAVORS.forEach((f, i) => {
    const selected = state.tab === f.id;
    const tab = h('button', { type: 'button', role: 'tab', class: 'sv-tab', id: `tab-${f.id}`, 'aria-controls': `panel-${f.id}`,
      'aria-selected': selected ? 'true' : 'false', tabindex: selected ? '0' : '-1', 'data-flavor': f.id },
    h('span', { class: 'sv-tab__name', text: f.name }), h('span', { class: 'sv-tab__state' }));
    tab.addEventListener('click', () => selectTab(f.id, { scroll: true }));
    tab.addEventListener('keydown', (e) => {
      let j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % FLAVORS.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + FLAVORS.length) % FLAVORS.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = FLAVORS.length - 1;
      if (j === null) return;
      e.preventDefault();
      selectTab(FLAVORS[j].id, { focusTab: true });
    });
    tablist.append(tab);

    const qs = step.questions.filter((q) => q.flavor === f.id);
    const nextFlavor = FLAVORS[i + 1];
    const panel = h('section', { class: 'sv-tabpanel', role: 'tabpanel', id: `panel-${f.id}`, 'aria-labelledby': `tab-${f.id}`, tabindex: '-1', hidden: !selected },
      h('div', { class: 'sv-tabpanel__head' }, h('h2', { class: 'sv-h2', text: `${f.name} 평가` })),
      qs.map(renderQuestion),
      h('div', { class: 'sv-panel-next' }, nextFlavor
        ? h('button', { type: 'button', class: 'sv-btn sv-btn--ghost sv-btn--small', onclick: () => selectTab(nextOpenFlavor(f.id), { scroll: true, focusPanel: true }) }, `다음 맛 평가하기 →`)
        : null));
    panels.push(panel);
  });
  const wrap = h('div', {}, h('div', { class: 'sv-tabs-wrap' }, tablist), panels);
  queueMicrotask(updateTabs);
  return wrap;
}

function nextOpenFlavor(fromId) {
  const start = FLAVORS.findIndex((f) => f.id === fromId);
  for (let k = 1; k <= FLAVORS.length; k++) {
    const f = FLAVORS[(start + k) % FLAVORS.length];
    if (!flavorCompletion(f.id, state.answers).complete) return f.id;
  }
  return FLAVORS[Math.min(start + 1, FLAVORS.length - 1)].id;
}

function selectTab(id, { scroll = false, focusTab = false, focusPanel = false } = {}) {
  state.tab = id;
  FLAVORS.forEach((f) => {
    const tab = $(`#tab-${f.id}`);
    const panel = $(`#panel-${f.id}`);
    if (!tab || !panel) return;
    const on = f.id === id;
    tab.setAttribute('aria-selected', on ? 'true' : 'false');
    tab.tabIndex = on ? 0 : -1;
    panel.hidden = !on;
  });
  const activeTab = $(`#tab-${id}`);
  const wrapEl = $('.sv-tabs-wrap');
  if (activeTab && wrapEl && wrapEl.scrollWidth > wrapEl.clientWidth) {
    const t = activeTab.getBoundingClientRect();
    const w = wrapEl.getBoundingClientRect();
    if (t.left < w.left) wrapEl.scrollLeft -= w.left - t.left + 16;
    else if (t.right > w.right) wrapEl.scrollLeft += t.right - w.right + 16;
  }
  if (focusTab) activeTab.focus();
  if (scroll) {
    const wrap = $('.sv-tabs-wrap');
    const headH = top.hidden ? 0 : top.getBoundingClientRect().height;
    const y = wrap.parentElement.getBoundingClientRect().top + window.scrollY - headH;
    if (window.scrollY > y) window.scrollTo({ top: y });
  }
  if (focusPanel) $(`#panel-${id}`).focus({ preventScroll: true });
  announce(`${FLAVORS.find((f) => f.id === id).name} 평가 화면입니다.`);
  saveDraft();
}

function updateTabs() {
  FLAVORS.forEach((f) => {
    const tab = $(`#tab-${f.id}`);
    if (!tab) return;
    const c = flavorCompletion(f.id, state.answers);
    tab.classList.toggle('is-complete', c.complete);
    if (c.complete) tab.classList.remove('is-error');
    const st = tab.querySelector('.sv-tab__state');
    st.replaceChildren(...(c.complete
      ? [h('span', { class: 'sv-tab__check', 'aria-hidden': 'true', text: '✓' }), '평가 완료']
      : [c.done ? `${c.done} / ${c.total} 작성` : '미평가']));
    tab.setAttribute('aria-label', `${f.name}, ${c.complete ? '평가 완료' : `${c.total}문항 중 ${c.done}문항 작성`}`);
  });
}

// ---------- 화면 ----------
function stepHead(step) {
  const sectionName = SECTIONS[step.section];
  const eyebrow = step.title === sectionName ? `PART ${step.section}` : `PART ${step.section} · ${sectionName}`;
  return h('div', { class: 'sv-step-head' },
    h('p', { class: 'sv-eyebrow', text: eyebrow }),
    h('h1', { class: 'sv-h1', id: 'sv-step-title', tabindex: '-1', text: step.title }));
}

function renderProductIntro() {
  const info = PRODUCT_INFO.filter((i) => typeof i.value === 'string' && i.value.trim());
  const media = PRODUCT_IMAGE.src
    ? h('figure', { class: 'sv-product__media' }, h('img', { src: PRODUCT_IMAGE.src, alt: PRODUCT_IMAGE.alt, loading: 'eager', decoding: 'async' }))
    : h('div', { class: 'sv-product__media' }, h('div', { class: 'sv-product__placeholder', role: 'img', 'aria-label': '기와 초콜릿 9구 상품 이미지 영역(등록 예정)' }, '기와 초콜릿 9구 상품 이미지 등록 예정'));
  return h('div', { class: 'sv-card sv-product' },
    h('div', { class: 'sv-lead', style: 'margin:0 0 1rem' },
      h('p', { text: '다음은 전주BURI에서 개발 중인 기와 초콜릿 9구 선물세트의 상품 기획안입니다.' }),
      h('p', { text: '전주 한옥의 기와를 형상화한 초콜릿으로, 모주·연잎·커피 세 가지 맛을 각각 3구씩 구성한 제품입니다.' })),
    media,
    h('p', { class: 'sv-info__title', text: '제품 구성' }),
    h('ul', { class: 'sv-compo', 'aria-label': '제품 구성' }, FLAVORS.map((f) => h('li', {}, h('strong', { text: f.name }), h('span', { text: '3구' })))),
    h('p', { class: 'sv-compo-total', text: '총 9구' }),
    info.length ? h('div', { class: 'sv-info' }, h('h2', { class: 'sv-info__title', text: '제품 정보' }),
      h('dl', { class: 'sv-info__list' }, info.flatMap((i) => [h('dt', { text: i.label }), h('dd', { text: i.value })]))) : null,
    PACKAGE_IMAGE.src ? h('figure', { class: 'sv-product__media' }, h('img', { src: PACKAGE_IMAGE.src, alt: PACKAGE_IMAGE.alt, loading: 'lazy', decoding: 'async' })) : null,
    h('p', { class: 'sv-q__note', style: 'margin:1rem 0 0', text: '※ 본 제품은 개발 중인 시제품으로, 최종 판매 제품의 사양과 디자인은 변경될 수 있습니다.' }),
    h('p', { class: 'sv-lead', text: '실제 전주 여행 중 이 제품을 선물 또는 기념품으로 구매하는 상황을 가정하고 응답해 주세요.' }));
}

function renderStep(index) {
  const step = STEPS[index];
  const body = [stepHead(step)];
  if (step.intro) body.push(h('div', { class: 'sv-intro-box' }, step.intro.map((t) => h('p', { text: t }))));
  if (step.type === 'product') body.push(renderProductIntro());
  body.push(h('div', { id: 'sv-error-summary' }));
  if (step.type === 'tasting') body.push(renderTasting(step));
  else body.push(...step.questions.map(renderQuestion));
  if (index === STEPS.length - 1 && submitError) body.push(submitErrorBox());
  view.replaceChildren(...body);

  top.hidden = false;
  nav.hidden = false;
  $('#sv-section').textContent = `${step.section}. ${SECTIONS[step.section]}`;
  $('#sv-count').textContent = `${index + 1} / ${STEPS.length} 단계`;
  const pct = Math.round(((index + 1) / STEPS.length) * 100);
  $('#sv-progress').setAttribute('aria-valuenow', String(pct));
  $('#sv-progress').setAttribute('aria-valuetext', `${STEPS.length}단계 중 ${index + 1}단계`);
  $('#sv-progress-bar').style.width = `${pct}%`;
  prevBtn.textContent = '이전';
  prevBtn.disabled = false;
  setNextLabel();
  syncTopHeight();
}

function setNextLabel() {
  const last = state.step === STEPS.length - 1;
  nextBtn.classList.toggle('is-busy', submitting);
  nextBtn.disabled = submitting;
  prevBtn.disabled = submitting;
  nextBtn.setAttribute('aria-busy', submitting ? 'true' : 'false');
  nextBtn.textContent = submitting ? '제출 중…' : last ? (submitError ? '다시 제출하기' : '제출하기') : '다음';
}

function renderIntro() {
  top.hidden = true;
  nav.hidden = true;
  syncTopHeight();
  const draft = loadDraft();
  const done = store.get(DONE_KEY);
  const fmt = (iso) => new Date(iso).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const notices = [];
  if (done && done.count > 0) {
    notices.push(h('div', { class: 'sv-alert sv-alert--info' },
      h('p', { text: `이 기기에서 ${done.lastAt ? `${fmt(done.lastAt)}에 ` : ''}설문 응답이 제출된 기록이 있습니다.` }),
      h('p', { text: '이미 참여하셨다면 중복 응답은 삼가 주세요. 다른 분이 이어서 참여하시는 경우에는 그대로 시작하시면 됩니다.' })));
  }
  const actions = [];
  if (draft && draft.step >= 0) {
    notices.push(h('div', { class: 'sv-alert' },
      h('p', { text: `작성 중이던 응답이 이 기기에 저장되어 있습니다.${draft.savedAt ? ` (마지막 저장 ${fmt(draft.savedAt)}, ${Math.min(draft.step, STEPS.length - 1) + 1}단계)` : ''}` })));
    actions.push(h('button', { type: 'button', class: 'sv-btn sv-btn--primary sv-btn--block', onclick: () => resume(draft) }, '이어서 작성하기'));
    actions.push(h('button', { type: 'button', class: 'sv-btn sv-btn--ghost sv-btn--block', onclick: () => {
      if (window.confirm('저장된 응답을 지우고 처음부터 새로 시작할까요?')) { store.del(DRAFT_KEY); start(); }
    } }, '처음부터 새로 시작하기'));
  } else {
    actions.push(h('button', { type: 'button', class: 'sv-btn sv-btn--primary sv-btn--block', id: 'sv-start', onclick: start }, '설문 시작하기'));
  }
  view.replaceChildren(h('section', { class: 'sv-start', 'aria-labelledby': 'sv-intro-title' },
    h('p', { class: 'sv-eyebrow', text: '전주BURI 소비자 조사' }),
    h('h1', { class: 'sv-h1', id: 'sv-intro-title', tabindex: '-1', text: '전주BURI 기와 초콜릿 소비자 시식 및 시장반응 조사' }),
    h('div', { class: 'sv-start__body' },
      h('p', { text: '안녕하세요.' }),
      h('p', { text: '본 설문은 전주의 문화적 특징을 담은 초콜릿 신제품의 맛과 상품성을 검토하기 위한 조사입니다.' }),
      h('p', { text: '시식하는 초콜릿은 개발 중인 시제품이며, 응답 결과는 제품의 맛과 구성, 판매가격 및 상품성 개선을 위한 자료로 활용됩니다.' }),
      h('p', { text: '본 설문은 특정 연령대에 한정하지 않으며, 다양한 소비자의 의견을 수집합니다. 제품을 구매할 의향이 없거나 맛이 만족스럽지 않더라도 솔직하게 응답해 주세요.' }),
      h('p', { text: '설문은 익명으로 진행되며, 성명·소속 부서 등 개인 식별정보는 수집하지 않습니다. 응답 결과는 통계 및 제품 개선 목적으로 활용됩니다.' })),
    h('ul', { class: 'sv-facts' },
      h('li', {}, h('b', { text: '시식 제품' }), '모주·연잎·커피 초콜릿 3종'),
      h('li', {}, h('b', { text: '구성' }), `${STEPS.length}단계, 이전 단계로 돌아가 수정할 수 있습니다.`)),
    notices,
    h('div', { class: 'sv-actions' }, actions)));
}

function renderDone() {
  top.hidden = true;
  nav.hidden = true;
  syncTopHeight();
  const when = doneInfo && doneInfo.submittedAt ? new Date(doneInfo.submittedAt).toLocaleString('ko-KR') : '';
  view.replaceChildren(h('section', { class: 'sv-done', 'aria-labelledby': 'sv-done-title' },
    h('p', { class: 'sv-done__badge', role: 'status' }, h('span', { 'aria-hidden': 'true', text: '✓' }), '응답이 정상적으로 제출되었습니다'),
    h('h1', { class: 'sv-h1', id: 'sv-done-title', tabindex: '-1', text: '설문에 참여해 주셔서 감사합니다.' }),
    h('p', { class: 'sv-lead', text: '응답해 주신 의견은 전주BURI 기와 초콜릿의 맛과 상품 구성 개선을 위한 자료로 활용됩니다.' }),
    h('p', { class: 'sv-done__meta', text: `제출 시각 ${when}${doneInfo && doneInfo.id ? ` · 응답 번호 ${doneInfo.id.slice(0, 8)}` : ''}` }),
    h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-btn sv-btn--ghost sv-btn--block', onclick: () => {
      doneInfo = null; state = freshState(); renderIntro(); history.replaceState({ sv: -1 }, '', location.pathname); focusTitle('#sv-intro-title');
    } }, '다음 분 응답 시작하기'))));
}

const focusTitle = (sel) => { const t = $(sel); if (t) t.focus({ preventScroll: true }); };

// ---------- 이동 ----------
function go(index, mode = 'push') {
  const from = state.step;
  state.step = index;
  state.maxStep = Math.max(state.maxStep, index);
  if (STEPS[index] && STEPS[index].id === 'price' && !state.priceShown) {
    state.priceShown = true;
    state.wtpAtPrice = JSON.stringify([state.answers.wtp_amount ?? null, state.answers.wtp_none === true]);
  }
  if (mode === 'push') history.pushState({ sv: index, from }, '', `#${STEPS[index].id}`);
  else if (mode === 'replace') history.replaceState({ sv: index, from: history.state && history.state.from }, '', `#${STEPS[index].id}`);
  renderStep(index);
  window.scrollTo({ top: 0 });
  focusTitle('#sv-step-title');
  announce(`${index + 1}단계: ${STEPS[index].title}`);
  saveDraft();
}

function start() {
  state = freshState();
  state.startedAt = new Date().toISOString();
  submitError = null;
  go(0);
}

function resume(draft) {
  state = draft;
  submitError = null;
  go(Math.min(Math.max(draft.step, 0), STEPS.length - 1), 'push');
}

prevBtn.addEventListener('click', () => {
  if (submitting) return;
  const target = state.step - 1;
  if (target < 0) { saveDraft(true); history.pushState({ sv: -1 }, '', location.pathname); renderIntro(); focusTitle('#sv-intro-title'); return; }
  if (history.state && history.state.sv === state.step && history.state.from === target) history.back();
  else go(target, 'push');
});

nextBtn.addEventListener('click', () => {
  if (submitting) return;
  const step = STEPS[state.step];
  const errors = validateStep(step.id, state.answers);
  if (Object.keys(errors).length) { showErrors(step, errors); return; }
  if (state.step === STEPS.length - 1) submit();
  else go(state.step + 1);
});

window.addEventListener('popstate', (e) => {
  if (submitting) { history.pushState({ sv: state.step }, '', `#${STEPS[state.step].id}`); return; }
  if (doneInfo) { history.pushState({ sv: 'done' }, '', location.pathname); return; }
  const s = e.state && typeof e.state.sv === 'number' ? e.state.sv : -1;
  if (s < 0) { saveDraft(true); renderIntro(); focusTitle('#sv-intro-title'); return; }
  if (s <= state.maxStep && s < STEPS.length) {
    state.step = s;
    if (STEPS[s].id === 'price' && !state.priceShown) { state.priceShown = true; state.wtpAtPrice = JSON.stringify([state.answers.wtp_amount ?? null, state.answers.wtp_none === true]); }
    renderStep(s); window.scrollTo({ top: 0 }); focusTitle('#sv-step-title'); saveDraft();
  } else {
    history.replaceState({ sv: state.step }, '', state.step >= 0 ? `#${STEPS[state.step].id}` : location.pathname);
  }
});

// ---------- 오류 표시 ----------
function showErrors(step, errors) {
  for (const q of step.questions) setError(q.id, errors[q.id] || null);
  const summary = $('#sv-error-summary');
  const ids = Object.keys(errors);
  if (step.type === 'tasting') {
    const byFlavor = FLAVORS.map((f) => ({ f, qs: step.questions.filter((q) => q.flavor === f.id && errors[q.id]) })).filter((x) => x.qs.length);
    FLAVORS.forEach((f) => { const t = $(`#tab-${f.id}`); if (t) t.classList.toggle('is-error', byFlavor.some((x) => x.f.id === f.id)); });
    summary.replaceChildren(h('div', { class: 'sv-alert sv-alert--error', role: 'alert', tabindex: '-1' },
      h('p', {}, h('strong', { text: '아직 평가하지 않은 문항이 있습니다.' }), ' 세 가지 맛의 문항을 모두 응답해야 다음 단계로 이동할 수 있습니다.'),
      h('ul', {}, byFlavor.map(({ f, qs }) => h('li', {}, h('strong', { text: `${f.name}: ` }),
        qs.map((q, i) => [i ? ', ' : '', h('button', { type: 'button', class: 'sv-linkbtn', onclick: () => jumpTo(q) }, `Q${q.num} ${q.short}`)]))))));
    const first = byFlavor[0];
    selectTab(first.f.id);
    announce(`${first.f.name}에 응답하지 않은 문항이 있습니다.`);
    const box = summary.firstChild;
    scrollToEl(box);
    box.focus({ preventScroll: true });
    return;
  }
  summary.replaceChildren(h('div', { class: 'sv-alert sv-alert--error', role: 'alert' },
    h('p', {}, h('strong', { text: '응답하지 않았거나 확인이 필요한 문항이 있습니다.' })),
    h('ul', {}, ids.map((id) => { const q = QUESTION_BY_ID[id]; return h('li', {}, h('button', { type: 'button', class: 'sv-linkbtn', onclick: () => jumpTo(q) }, `Q${q.num} ${q.short}`), ` — ${errors[id]}`); }))));
  jumpTo(QUESTION_BY_ID[ids[0]]);
}

function jumpTo(q) {
  if (q.flavor) selectTab(q.flavor);
  const fs = $(`#q-${q.id}`);
  if (!fs) return;
  scrollToEl(fs);
  const target = fs.querySelector('input:not([disabled]):checked, input:not([disabled]), textarea');
  if (target) target.focus({ preventScroll: true });
}

// ---------- 제출 ----------
function submitErrorBox() {
  return h('div', { class: 'sv-alert sv-alert--error', id: 'sv-submit-error', role: 'alert', tabindex: '-1' },
    h('p', {}, h('strong', { text: '응답을 제출하지 못했습니다.' })),
    h('p', { text: submitError }),
    h('p', { text: '작성하신 응답은 이 기기에 그대로 보관되어 있습니다. 아래 ‘다시 제출하기’ 버튼을 눌러 주세요.' }));
}

async function submit() {
  const all = validateAll(state.answers);
  const ids = Object.keys(all);
  if (ids.length) {
    const stepIndex = STEPS.findIndex((s) => s.questions.some((q) => all[q.id]));
    go(stepIndex);
    showErrors(STEPS[stepIndex], validateStep(STEPS[stepIndex].id, state.answers));
    return;
  }
  submitting = true;
  submitError = null;
  const old = $('#sv-submit-error');
  if (old) old.remove();
  setNextLabel();
  announce('응답을 제출하고 있습니다.');
  const done = store.get(DONE_KEY) || { count: 0 };
  const payload = {
    responseId: state.responseId, version: SURVEY_VERSION, startedAt: state.startedAt, answers: state.answers,
    meta: { priorSubmissions: done.count || 0, wtpRevisedAfterPrice: state.wtpRevised === true },
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SUBMIT_TIMEOUT);
  let result = null;
  let message = null;
  try {
    const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) result = data;
    else if (res.status === 422 && data.errors) {
      submitting = false;
      setNextLabel();
      const stepIndex = STEPS.findIndex((s) => s.questions.some((q) => data.errors[q.id]));
      if (stepIndex >= 0) { go(stepIndex); showErrors(STEPS[stepIndex], data.errors); return; }
      message = data.message || '응답 내용을 확인해 주세요.';
    } else message = data.message || `서버 오류가 발생했습니다. (코드 ${res.status})`;
  } catch (err) {
    message = err && err.name === 'AbortError'
      ? '서버 응답이 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
      : '네트워크에 연결할 수 없습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
  } finally {
    clearTimeout(timer);
  }
  submitting = false;
  if (result) {
    clearTimeout(saveTimer);
    store.del(DRAFT_KEY);
    store.set(DONE_KEY, { count: (done.count || 0) + 1, lastAt: result.submittedAt || new Date().toISOString() });
    doneInfo = { id: result.id, submittedAt: result.submittedAt };
    history.replaceState({ sv: 'done' }, '', location.pathname);
    renderDone();
    window.scrollTo({ top: 0 });
    focusTitle('#sv-done-title');
    announce('응답이 정상적으로 제출되었습니다.');
    return;
  }
  submitError = message;
  setNextLabel();
  view.append(submitErrorBox());
  const box = $('#sv-submit-error');
  scrollToEl(box);
  box.focus({ preventScroll: true });
  announce('응답을 제출하지 못했습니다. 다시 제출하기 버튼을 눌러 주세요.');
}

// ---------- 시작 ----------
history.replaceState({ sv: -1 }, '', location.pathname);
renderIntro();
