export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ message: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const { username, password } = await request.json();

      if (!username || !password) {
        return new Response(JSON.stringify({ message: 'Username and password are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const user = await env.DB.prepare(`
        SELECT id, username, password
        FROM login_mst
        WHERE username = ?
      `)
        .bind(username)
        .first();

      if (!user || user.password !== password) {
        return new Response(JSON.stringify({ message: 'Invalid username or password' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ message: 'Server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
