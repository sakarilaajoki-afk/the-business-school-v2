const { cors, handleOptions } = require('./_db');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return cors({ error: 'Method not allowed' }, 405);

  try {
    const { password } = JSON.parse(event.body || '{}');
    const teacherPw = process.env.TEACHER_PASSWORD || 'tbs2026';

    if (!password) return cors({ error: 'Password required' }, 400);
    if (password !== teacherPw) return cors({ error: 'Invalid password' }, 401);

    return cors({ ok: true, token: Buffer.from('teacher:' + Date.now()).toString('base64') });
  } catch (e) {
    return cors({ error: 'Server error' }, 500);
  }
};
