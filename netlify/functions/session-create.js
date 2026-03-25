const { getDb, cors, handleOptions } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return cors({ error: 'Method not allowed' }, 405);

  try {
    const sql = getDb();
    const { pin, state } = JSON.parse(event.body || '{}');
    if (!pin || !state) return cors({ error: 'pin and state required' }, 400);

    // Delete any existing session with same PIN
    await sql`DELETE FROM sessions WHERE pin = ${pin}`;

    // Create new session
    await sql`INSERT INTO sessions (pin, state, version) VALUES (${pin}, ${JSON.stringify(state)}, 1)`;

    return cors({ ok: true, pin, version: 1 });
  } catch (e) {
    console.error('session-create error:', e);
    return cors({ error: 'Failed to create session' }, 500);
  }
};
