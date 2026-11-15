// POST /api/survey/responses — 설문 응답 제출(로그인 없음)
// 서버에서 schema.js 규칙으로 다시 검증한 뒤 D1에 한 번의 batch(트랜잭션)로 저장합니다.
import {
  SURVEY_VERSION, ALL_QUESTIONS, validateAll, normalizeAnswers, OTHER_MAX, TEXT_MAX,
} from '../../../survey/schema.js';
import { json, getDb } from './_lib.js';

const MAX_BODY = 64 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 허용된 키만 남깁니다(알 수 없는 키 차단).
function allowedKeys() {
  const keys = new Set(['wtp_amount', 'wtp_none']);
  for (const q of ALL_QUESTIONS) {
    if (q.rows) q.rows.forEach((r) => keys.add(r.id));
    else if (q.type !== 'wtp') keys.add(q.id);
    if (q.options && q.options.some((o) => o.other)) keys.add(`${q.id}_other`);
  }
  return keys;
}
const ALLOWED = allowedKeys();

export async function onRequestPost({ request, env }) {
  const db = getDb(env);
  if (!db) return json({ error: 'storage_not_configured', message: '저장소가 아직 연결되지 않았습니다.' }, 503);

  const type = request.headers.get('Content-Type') || '';
  if (!type.includes('application/json')) return json({ error: 'bad_request', message: '잘못된 요청 형식입니다.' }, 415);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'too_large', message: '요청이 너무 큽니다.' }, 413);

  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'bad_request', message: '잘못된 요청 형식입니다.' }, 400); }
  if (!body || typeof body !== 'object') return json({ error: 'bad_request', message: '잘못된 요청 형식입니다.' }, 400);

  const { responseId, version, startedAt, answers, meta = {} } = body;
  if (typeof responseId !== 'string' || !UUID_RE.test(responseId)) return json({ error: 'bad_request', message: '응답 ID가 올바르지 않습니다.' }, 400);
  if (version !== SURVEY_VERSION) return json({ error: 'version_mismatch', message: '설문이 갱신되었습니다. 페이지를 새로고침한 뒤 다시 제출해 주세요.' }, 409);
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return json({ error: 'bad_request', message: '응답 내용이 없습니다.' }, 400);

  const clean = {};
  for (const [k, v] of Object.entries(answers)) {
    if (!ALLOWED.has(k)) continue;
    if (typeof v === 'string') clean[k] = v.slice(0, k.endsWith('_other') ? OTHER_MAX : TEXT_MAX);
    else clean[k] = v;
  }

  const errors = validateAll(clean);
  if (Object.keys(errors).length) return json({ error: 'validation', message: '응답하지 않았거나 올바르지 않은 문항이 있습니다.', errors }, 422);

  const { respondent, flavors, purchase } = normalizeAnswers(clean);

  const now = new Date();
  let started = null;
  let duration = null;
  const s = typeof startedAt === 'string' ? new Date(startedAt) : null;
  if (s && !Number.isNaN(s.getTime())) {
    const sec = Math.round((now.getTime() - s.getTime()) / 1000);
    if (sec >= 0 && sec <= 24 * 3600) { started = s.toISOString(); duration = sec; }
  }
  const prior = Number.isInteger(meta.priorSubmissions) && meta.priorSubmissions >= 0 ? Math.min(meta.priorSubmissions, 999) : 0;
  const revised = meta.wtpRevisedAfterPrice === true ? 1 : 0;

  // 같은 응답 ID의 재전송(네트워크 재시도)은 중복 저장하지 않고 성공으로 처리합니다.
  const existing = await db.prepare('SELECT submitted_at FROM survey_responses WHERE id = ?').bind(responseId).first();
  if (existing) return json({ ok: true, id: responseId, submittedAt: existing.submitted_at, duplicate: true });

  const submittedAt = now.toISOString();
  const stmts = [
    db.prepare(`INSERT INTO survey_responses (id, survey_version, submitted_at, started_at, duration_sec, age_group, jeonju_visit,
      moju_experience, best_taste, most_unique, souvenir_fit, device_prior_submissions) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(responseId, SURVEY_VERSION, submittedAt, started, duration, respondent.age_group, respondent.jeonju_visit,
        respondent.moju_experience, respondent.best_taste, respondent.most_unique, respondent.souvenir_fit, prior),
    ...flavors.map((f) => db.prepare(`INSERT INTO survey_flavor_ratings (response_id, flavor, satisfaction, sweetness, aroma,
      improvements, improvements_other, concept_fit, improvement_comment) VALUES (?,?,?,?,?,?,?,?,?)`)
      .bind(responseId, f.flavor, f.satisfaction, f.sweetness, f.aroma, JSON.stringify(f.improvements), f.improvements_other,
        f.concept_fit, f.improvement_comment)),
    db.prepare(`INSERT INTO survey_purchase_intent (response_id, souv_freq, souv_spend, souv_target, souv_criteria, souv_criteria_other,
      wtp_amount, wtp_no_intent, wtp_revised_after_price, intent_27900, choice_30000, reason_not, reason_not_other, reason_buy,
      reason_buy_other, info_needed, info_needed_other, improve_priority, improve_priority_other, hesitation, use_occasion, channel,
      online_intent, final_comment) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(responseId, purchase.souv_freq, purchase.souv_spend, JSON.stringify(purchase.souv_target), JSON.stringify(purchase.souv_criteria),
        purchase.souv_criteria_other, purchase.wtp_amount, purchase.wtp_no_intent ? 1 : 0, revised, purchase.intent_27900,
        purchase.choice_30000, JSON.stringify(purchase.reason_not), purchase.reason_not_other, JSON.stringify(purchase.reason_buy),
        purchase.reason_buy_other, JSON.stringify(purchase.info_needed), purchase.info_needed_other, purchase.improve_priority,
        purchase.improve_priority_other, purchase.hesitation, purchase.use_occasion, purchase.channel, purchase.online_intent,
        purchase.final_comment),
  ];

  try {
    await db.batch(stmts);
  } catch (err) {
    // 동시에 같은 ID가 들어온 경우(재시도 경합)
    const again = await db.prepare('SELECT submitted_at FROM survey_responses WHERE id = ?').bind(responseId).first().catch(() => null);
    if (again) return json({ ok: true, id: responseId, submittedAt: again.submitted_at, duplicate: true });
    console.error('survey insert failed', err && err.message);
    return json({ error: 'storage_error', message: '응답을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 500);
  }
  return json({ ok: true, id: responseId, submittedAt }, 201);
}

export function onRequest() {
  return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
}
