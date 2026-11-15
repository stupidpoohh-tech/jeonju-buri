// GET /api/survey/admin/export?type=respondents|flavors — 관리자 전용 CSV(UTF-8 BOM)
import { json, getDb, requireAdmin, loadResponses, respondentsCsv, flavorsCsv } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  const db = getDb(env);
  if (!db) return json({ error: 'storage_not_configured', message: '저장소가 아직 연결되지 않았습니다.' }, 503);
  const type = new URL(request.url).searchParams.get('type') === 'flavors' ? 'flavors' : 'respondents';
  const responses = await loadResponses(db);
  const body = type === 'flavors' ? flavorsCsv(responses) : respondentsCsv(responses);
  const stamp = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const name = `buri-survey-${type}-${stamp}.csv`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export function onRequest() {
  return json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
}
