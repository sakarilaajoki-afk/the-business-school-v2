const { getDb, cors, handleOptions } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();

  try {
    const sql = getDb();
    const pin = event.queryStringParameters?.pin;
    if (!pin) return cors({ error: 'pin required' }, 400);

    const rows = await sql`SELECT state, version FROM sessions WHERE pin = ${pin}`;
    if (rows.length === 0) return cors({ error: 'Session not found' }, 404);

    return cors({ ok: true, state: rows[0].state, version: rows[0].version });
  } catch (e) {
    console.error('session-get error:', e);
    return cors({ error: 'Failed to get session' }, 500);
  }
};
