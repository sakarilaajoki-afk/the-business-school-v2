const { getDb, cors, handleOptions } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return cors({ error: 'Method not allowed' }, 405);

  try {
    const sql = getDb();
    const { pin, state, baseVersion } = JSON.parse(event.body || '{}');
    if (!pin || !state) return cors({ error: 'pin and state required' }, 400);

    // Optimistic concurrency: only update if version matches
    const rows = await sql`
      UPDATE sessions
      SET state = ${JSON.stringify(state)},
          version = version + 1,
          updated_at = NOW()
      WHERE pin = ${pin} AND version = ${baseVersion || 0}
      RETURNING version, state
    `;

    if (rows.length === 0) {
      // Version conflict — return current state for merge
      const current = await sql`SELECT state, version FROM sessions WHERE pin = ${pin}`;
      if (current.length === 0) return cors({ error: 'Session not found' }, 404);
      return cors({ ok: false, conflict: true, state: current[0].state, version: current[0].version });
    }

    return cors({ ok: true, version: rows[0].version });
  } catch (e) {
    console.error('session-save error:', e);
    return cors({ error: 'Failed to save session' }, 500);
  }
};
