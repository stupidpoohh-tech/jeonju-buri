// 설문 API 공용 도구 — 라우트 파일이 아니며 onRequest 핸들러를 내보내지 않습니다.
import {
  FLAVORS, ALL_QUESTIONS, QUESTION_BY_ID, FLAVOR_OPTIONS, COUNTRY_NAMES, labelOf,
} from '../../../survey/schema.js';

const BASE_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...BASE_HEADERS, ...extra },
  });
}

export function getDb(env) {
  return env && env.SURVEY_DB ? env.SURVEY_DB : null;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return new Uint8Array(buf);
}

// 관리자 인증: Authorization: Bearer <비밀번호>를 환경변수 SURVEY_ADMIN_PASSWORD와 상수 시간 비교합니다.
// 실패 시 Response를, 성공 시 null을 돌려줍니다.
export async function requireAdmin(request, env) {
  const secret = env && env.SURVEY_ADMIN_PASSWORD;
  if (!secret || secret.length < 12) {
    return json({ error: 'admin_not_configured', message: '관리자 비밀번호(SURVEY_ADMIN_PASSWORD)가 설정되지 않았거나 12자 미만입니다.' }, 503);
  }
  const header = request.headers.get('Authorization') || '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  const [a, b] = await Promise.all([sha256(given), sha256(secret)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (!given || diff !== 0) {
    return json({ error: 'unauthorized', message: '관리자 인증에 실패했습니다.' }, 401, { 'WWW-Authenticate': 'Bearer' });
  }
  return null;
}

const parseList = (v) => {
  try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
};
// v3 이전에는 단일 선택으로 저장된 문항(Q21, Q32)을 배열로 맞춥니다.
const parseListOrSingle = (v) => (typeof v === 'string' && v && !v.startsWith('[') ? [v] : parseList(v));

// 저장된 응답 전체를 응답자 단위 객체로 불러옵니다(제출 시각 오름차순).
export async function loadResponses(db) {
  const [r, f, p] = await db.batch([
    db.prepare('SELECT * FROM survey_responses ORDER BY submitted_at ASC'),
    db.prepare('SELECT * FROM survey_flavor_ratings'),
    db.prepare('SELECT * FROM survey_purchase_intent'),
  ]);
  const flavorsBy = new Map();
  for (const row of f.results) {
    row.improvements = parseList(row.improvements);
    if (!flavorsBy.has(row.response_id)) flavorsBy.set(row.response_id, {});
    flavorsBy.get(row.response_id)[row.flavor] = row;
  }
  const purchaseBy = new Map();
  for (const row of p.results) {
    for (const k of ['souv_target', 'souv_criteria', 'reason_not', 'reason_buy']) row[k] = parseList(row[k]);
    row.use_occasion = parseListOrSingle(row.use_occasion);
    row.souv_spend_unknown = row.souv_spend_unknown === null ? null : row.souv_spend_unknown === 1;
    row.wtp_no_intent = row.wtp_no_intent === 1;
    row.wtp_revised_after_price = row.wtp_revised_after_price === 1;
    purchaseBy.set(row.response_id, row);
  }
  return r.results.map((row) => ({
    ...row,
    // v5 이전 응답에는 언어·조사 경로가 없습니다. 당시 설문은 한국어만 있었으므로 ko, 경로는 general로 읽습니다.
    survey_language: row.survey_language || 'ko',
    survey_source: row.survey_source || 'general',
    meta_recorded: !!row.survey_language,
    // v5 이전 응답의 국내 거주자는 거주지역으로부터 KR을 채웁니다(해외 거주 응답은 국가 미기록).
    residence_country: row.residence_country || (row.residence && row.residence !== 'overseas' ? 'KR' : null),
    souvenir_fit: parseListOrSingle(row.souvenir_fit),
    flavors: flavorsBy.get(row.id) || {},
    purchase: purchaseBy.get(row.id) || {},
  }));
}

// ---------- CSV ----------
const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  let s = String(v);
  // 엑셀 수식 주입 방지: 사용자 입력 텍스트가 수식 기호로 시작하면 작은따옴표를 붙입니다.
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(header, rows) {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(','));
  return '﻿' + lines.join('\r\n') + '\r\n'; // UTF-8 BOM: 엑셀 한글 인코딩
}

const kstString = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const k = new Date(d.getTime() + 9 * 3600 * 1000);
  return k.toISOString().replace('T', ' ').slice(0, 19);
};

const flavorName = (id) => (FLAVORS.find((f) => f.id === id) || {}).name || id;
const optLabel = (options, v) => (options.find((o) => o.value === v) || {}).label ?? (v ?? '');

// 응답자별 1행(와이드) CSV
export function respondentsCsv(responses) {
  const cols = [];
  const add = (header, get) => cols.push({ header, get });
  add('응답ID [id]', (r) => r.id);
  add('제출일시 KST [submitted_at]', (r) => kstString(r.submitted_at));
  add('제출일시 UTC [submitted_at_utc]', (r) => r.submitted_at);
  add('소요시간(초) [duration_sec]', (r) => r.duration_sec);
  add('설문버전 [survey_version]', (r) => r.survey_version);
  add('동일기기 이전제출수 [device_prior_submissions]', (r) => r.device_prior_submissions);
  add('응답 언어 [survey_language]', (r) => r.survey_language);
  add('조사 경로 [survey_source]', (r) => r.survey_source);
  add('언어·경로 기록 여부(v5 이후 1) [meta_recorded]', (r) => (r.meta_recorded ? 1 : 0));
  add('시제품 버전 [prototype_version]', (r) => r.prototype_version);

  const q = (id) => QUESTION_BY_ID[id];
  const singleCol = (id, getter) => add(`Q${q(id).num} ${q(id).short} [${id}]`, (r) => labelOf(id, getter(r)));
  const multiCols = (id, getter, otherGetter) => {
    for (const o of q(id).options) {
      add(`Q${q(id).num} ${q(id).short}: ${o.label} [${id}__${o.value}]`, (r) => {
        const list = getter(r);
        if (!list || (Array.isArray(list) && list.length === 0 && q(id).showIf)) return '';
        return list.includes(o.value) ? 1 : 0;
      });
    }
    if (otherGetter) add(`Q${q(id).num} ${q(id).short}: 기타 내용 [${id}_other]`, otherGetter);
  };

  singleCol('age', (r) => r.age_group);
  singleCol('gender', (r) => r.gender);
  singleCol('occupation', (r) => r.occupation);
  add(`Q${q('occupation').num} ${q('occupation').short}: 기타 내용 [occupation_other]`, (r) => r.occupation_other);
  singleCol('residence', (r) => r.residence);
  add(`Q${q('residence_country').num} 거주국가 코드 [residence_country]`, (r) => r.residence_country);
  add(`Q${q('residence_country').num} 거주국가 [residence_country_name]`, (r) => (r.residence_country ? COUNTRY_NAMES[r.residence_country]?.ko ?? (r.residence_country === 'other' ? '기타' : r.residence_country) : ''));
  add(`Q${q('residence_country').num} 거주국가 기타 내용 [residence_country_other]`, (r) => r.residence_country_other);
  add('국적(영어 설문) 코드 [nationality]', (r) => r.nationality);
  add('국적(영어 설문) [nationality_name]', (r) => (r.nationality ? COUNTRY_NAMES[r.nationality]?.ko ?? (r.nationality === 'other' ? '기타' : r.nationality) : ''));
  add('국적(영어 설문) 기타 내용 [nationality_other]', (r) => r.nationality_other);
  singleCol('visit', (r) => r.jeonju_visit);
  singleCol('moju_exp', (r) => r.moju_experience);

  FLAVORS.forEach((f) => {
    const fq = (key) => q(`${f.id}_${key}`);
    const fr = (r) => r.flavors[f.id] || {};
    add(`Q${fq('satisfaction').num} ${f.short} 만족도(1-5) [${f.id}_satisfaction]`, (r) => fr(r).satisfaction);
    add(`Q${fq('sweetness').num} ${f.short} 단맛(1-5) [${f.id}_sweetness]`, (r) => fr(r).sweetness);
    add(`Q${fq('sweetness').num} ${f.short} 단맛 응답 [${f.id}_sweetness_label]`, (r) => optLabel(FLAVOR_OPTIONS.sweetness, fr(r).sweetness));
    add(`Q${fq('aroma').num} ${f.short} 향·풍미(1-5) [${f.id}_aroma]`, (r) => fr(r).aroma);
    add(`Q${fq('aroma').num} ${f.short} 향·풍미 응답 [${f.id}_aroma_label]`, (r) => optLabel(FLAVOR_OPTIONS.aroma, fr(r).aroma));
    for (const o of FLAVOR_OPTIONS.improvements) {
      add(`Q${fq('improve').num} ${f.short} 개선: ${o.label} [${f.id}_improve__${o.value}]`, (r) => ((fr(r).improvements || []).includes(o.value) ? 1 : 0));
    }
    add(`Q${fq('improve').num} ${f.short} 개선: 기타 내용 [${f.id}_improve_other]`, (r) => fr(r).improvements_other);
  });

  singleCol('best_taste', (r) => r.best_taste);
  singleCol('most_unique', (r) => r.most_unique);
  FLAVORS.forEach((f) => add(`Q${q('concept_fit').num} ${f.short} 제품명 기대 적합도(1-5) [${f.id}_concept_fit]`, (r) => (r.flavors[f.id] || {}).concept_fit));
  multiCols('souvenir_fit', (r) => r.souvenir_fit);

  const p = (key) => (r) => r.purchase[key];
  singleCol('souv_freq', p('souv_freq'));
  add(`Q${q('souv_spend').num} 최근 기념품 결제금액(원) [souv_spend_amount]`, p('souv_spend_amount'));
  add(`Q${q('souv_spend').num} 금액 기억나지 않음 [souv_spend_unknown]`, (r) => (r.purchase.souv_spend_unknown == null ? '' : r.purchase.souv_spend_unknown ? 1 : 0));
  multiCols('souv_target', p('souv_target'));
  multiCols('souv_criteria', p('souv_criteria'), p('souv_criteria_other'));
  add(`Q${q('wtp').num} 최대 지불의향 금액(원) [wtp_amount]`, p('wtp_amount'));
  add(`Q${q('wtp').num} 가격과 관계없이 구매 의향 없음 [wtp_no_intent]`, (r) => (r.purchase.wtp_no_intent ? 1 : 0));
  add(`Q${q('wtp').num} 가격 공개 후 수정 여부 [wtp_revised_after_price]`, (r) => (r.purchase.wtp_revised_after_price ? 1 : 0));
  singleCol('intent_27900', p('intent_27900'));
  singleCol('choice_30000', p('choice_30000'));
  multiCols('reason_buy', p('reason_buy'), p('reason_buy_other'));
  multiCols('reason_not', p('reason_not'), p('reason_not_other'));
  singleCol('lower_price_intent', p('lower_price_intent'));
  singleCol('info_needed', p('info_needed'));
  add(`Q${q('info_needed').num} ${q('info_needed').short}: 기타 내용 [info_needed_other]`, p('info_needed_other'));
  singleCol('improve_priority', p('improve_priority'));
  add(`Q${q('improve_priority').num} ${q('improve_priority').short}: 기타 내용 [improve_priority_other]`, p('improve_priority_other'));
  multiCols('use_occasion', p('use_occasion'));
  singleCol('channel', p('channel'));
  singleCol('online_intent', p('online_intent'));
  add(`Q${q('final_comment').num} 최종 자유의견 [final_comment]`, p('final_comment'));

  return toCsv(cols.map((c) => c.header), responses.map((r) => cols.map((c) => c.get(r))));
}

// 맛별 평가 1행(롱) CSV: 응답자 × 맛
export function flavorsCsv(responses) {
  const header = ['응답ID [response_id]', '제출일시 KST [submitted_at]', '응답 언어 [survey_language]', '조사 경로 [survey_source]', '거주국가 [residence_country]', '국적(영어 설문) [nationality]', '연령대 [age_group]', '성별 [gender]', '직업 [occupation]', '거주지역 [residence]', '모주 음용 경험 [moju_experience]',
    '맛 [flavor]', '맛 이름 [flavor_name]', '만족도(1-5) [satisfaction]', '단맛(1-5) [sweetness]', '단맛 응답 [sweetness_label]',
    '향·풍미(1-5) [aroma]', '향·풍미 응답 [aroma_label]',
    ...FLAVOR_OPTIONS.improvements.map((o) => `개선: ${o.label} [improve__${o.value}]`),
    '개선: 기타 내용 [improvements_other]', '제품명 기대 적합도(1-5) [concept_fit]'];
  const rows = [];
  for (const r of responses) {
    for (const f of FLAVORS) {
      const x = r.flavors[f.id];
      if (!x) continue;
      rows.push([r.id, kstString(r.submitted_at), r.survey_language, r.survey_source, r.residence_country, r.nationality, labelOf('age', r.age_group), labelOf('gender', r.gender), labelOf('occupation', r.occupation), labelOf('residence', r.residence), labelOf('moju_exp', r.moju_experience),
        f.id, flavorName(f.id), x.satisfaction, x.sweetness, optLabel(FLAVOR_OPTIONS.sweetness, x.sweetness),
        x.aroma, optLabel(FLAVOR_OPTIONS.aroma, x.aroma),
        ...FLAVOR_OPTIONS.improvements.map((o) => (x.improvements.includes(o.value) ? 1 : 0)),
        x.improvements_other, x.concept_fit]);
    }
  }
  return toCsv(header, rows);
}

export { ALL_QUESTIONS };
