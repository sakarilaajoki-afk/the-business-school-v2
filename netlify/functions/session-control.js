const { getDb, cors, handleOptions } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return cors({ error: 'Method not allowed' }, 405);

  try {
    const sql = getDb();
    const { pin, action, data } = JSON.parse(event.body || '{}');
    if (!pin || !action) return cors({ error: 'pin and action required' }, 400);

    const rows = await sql`SELECT state, version FROM sessions WHERE pin = ${pin}`;
    if (rows.length === 0) return cors({ error: 'Session not found' }, 404);

    const state = rows[0].state;
    const version = rows[0].version;

    switch (action) {
      case 'start':
        state.status = 'playing';
        state.round = 1;
        state.startedAt = Date.now();
        state.roundStartedAt = Date.now();
        break;

      case 'pause':
        state.status = 'paused';
        state.pausedAt = Date.now();
        break;

      case 'resume':
        state.status = 'playing';
        state.resumedAt = Date.now();
        break;

      case 'next-round':
        state.round = (state.round || 1) + 1;
        state.roundStartedAt = Date.now();
        if (state.crisis?.duration) {
          state.crisis.duration--;
          if (state.crisis.duration <= 0) state.crisis = null;
        }
        break;

      case 'crisis':
        state.crisis = data || null;
        state.crisisHistory = state.crisisHistory || [];
        if (data) state.crisisHistory.push({ ...data, round: state.round, at: Date.now() });
        break;

      case 'end':
        state.status = 'ended';
        state.endedAt = Date.now();
        break;

      case 'kick':
        if (data?.playerId && state.players?.[data.playerId]) {
          delete state.players[data.playerId];
        }
        break;

      default:
        return cors({ error: 'Unknown action: ' + action }, 400);
    }

    const updated = await sql`
      UPDATE sessions SET state = ${JSON.stringify(state)}, version = version + 1, updated_at = NOW()
      WHERE pin = ${pin} AND version = ${version}
      RETURNING version
    `;

    if (updated.length === 0) {
      return cors({ ok: false, conflict: true });
    }

    return cors({ ok: true, version: updated[0].version, state });
  } catch (e) {
    console.error('session-control error:', e);
    return cors({ error: 'Server error' }, 500);
  }
};
