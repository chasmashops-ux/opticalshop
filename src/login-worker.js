const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    if (url.pathname === '/api/login') {
      if (request.method !== 'POST') {
        return jsonResponse({ success: false, message: 'Only POST is allowed.' }, 405);
      }

      let payload = {};
      try {
        payload = await request.json();
      } catch (error) {
        return jsonResponse({ success: false, message: 'Invalid JSON body.' }, 400);
      }

      const action = (payload.action || 'insert').toLowerCase();
      const username = String(payload.username || '').trim();
      const password = String(payload.password || '').trim();

      if (!username || !password) {
        return jsonResponse({ success: false, message: 'Username and password are required.' }, 400);
      }

      const enterDate = new Date().toISOString().slice(0, 10);

      if (action === 'login') {
        const row = await env.DB.prepare(
          'SELECT id, username FROM login_mst WHERE username = ? AND password = ? LIMIT 1'
        )
          .bind(username, password)
          .first();

        if (!row) {
          return jsonResponse({ success: false, message: 'Invalid username or password.' }, 401);
        }

        return jsonResponse({
          success: true,
          message: 'Login successful.',
          username: row.username
        }, 200);
      }

      const existing = await env.DB.prepare(
        'SELECT id FROM login_mst WHERE username = ? LIMIT 1'
      )
        .bind(username)
        .first();

      if (existing) {
        return jsonResponse({ success: false, message: 'Username already exists.' }, 409);
      }

      const result = await env.DB.prepare(
        'INSERT INTO login_mst (username, password, enterdate) VALUES (?, ?, ?)'
      )
        .bind(username, password, enterDate)
        .run();

      return jsonResponse({
        success: true,
        message: 'Entry inserted into login_mst successfully.',
        id: result.meta.last_row_id
      }, 201);
    }

    return jsonResponse({ success: false, message: 'Not found.' }, 404);
  }
};
