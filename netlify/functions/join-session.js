const { getDb, cors, handleOptions } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return cors({ error: 'Method not allowed' }, 405);

  try {
    const sql = getDb();
    const { pin, playerId, playerName } = JSON.parse(event.body || '{}');
    if (!pin || !playerId || !playerName) return cors({ error: 'pin, playerId and playerName required' }, 400);

    // Get current session
    const rows = await sql`SELECT state, version FROM sessions WHERE pin = ${pin}`;
    if (rows.length === 0) return cors({ error: 'Session not found. Check your PIN.' }, 404);

    const state = rows[0].state;
    const version = rows[0].version;

    // Check if game already in progress and player not in it
    if (state.status === 'playing' && !state.players?.[playerId]) {
      return cors({ error: 'Game already in progress. Ask your teacher to start a new session.' }, 403);
    }

    // Add player if not exists
    if (!state.players) state.players = {};
    if (!state.players[playerId]) {
      state.players[playerId] = {
        name: playerName,
        balance: 10000,
        inventory: {},
        prices: {},
        salesLog: [],
        vatOwed: 0,
        vatPaid: 0,
        totalRevenue: 0,
        totalCosts: 0,
        totalProfit: 0,
        quizScore: null,
        joinedAt: Date.now(),
      };
    }

    // Save
    const updated = await sql`
      UPDATE sessions SET state = ${JSON.stringify(state)}, version = version + 1, updated_at = NOW()
      WHERE pin = ${pin} AND version = ${version}
      RETURNING version
    `;

    if (updated.length === 0) {
      // Retry conflict — just return ok, poll will catch up
      return cors({ ok: true, version: version, state });
    }

    return cors({ ok: true, version: updated[0].version, state });
  } catch (e) {
    console.error('join-session error:', e);
    return cors({ error: 'Failed to join session' }, 500);
  }
};
