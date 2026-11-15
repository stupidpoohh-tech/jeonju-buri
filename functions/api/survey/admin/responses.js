// GET /api/survey/admin/responses — 관리자 전용 전체 응답 조회
import { json, getDb, requireAdmin, loadResponses } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  const db = getDb(env);
  if (!db) return json({ error: 'storage_not_configured', message: '저장소가 아직 연결되지 않았습니다.' }, 503);
  try {
    const responses = await loadResponses(db);
    return json({ responses, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('survey load failed', err && err.message);
    return json({ error: 'storage_error', message: '응답을 불러오지 못했습니다.' }, 500);
  }
}

export function onRequest() {
  return json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
}
