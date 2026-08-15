/**
 * Shree Hari Chasma Ghar — Cloudflare Worker API
 *
 *   Worker name : opticalshop
 *   D1 binding  : env.DB          (never a raw database id)
 *   D1 database : shcg
 *   Auth table  : login_mst       (existing table — not created or renamed here)
 *
 * Routes
 *   GET  /                  service info
 *   GET  /api/health        D1 connectivity check
 *   POST /api/login         authenticate against login_mst
 *   GET  /api/users         search users            (requires Bearer token)
 *   POST /api/users         add user                (requires Bearer token)
 *   GET  /api/stats         dashboard totals        (requires Bearer token)
 *   GET  /api/stats/yearly  year-wise statistics    (requires Bearer token)
 */

const AUTH_TABLE = 'login_mst';
const TOKEN_TTL_SECONDS = 8 * 60 * 60;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...CORS_HEADERS
    }
  });

/* ------------------------------------------------------------------ *
 * Schema discovery — adapt to the columns login_mst actually has.
 * ------------------------------------------------------------------ */

let columnCache = null;

async function getColumns(env) {
  if (columnCache) return columnCache;
  let columns = [];
  try {
    const info = await env.DB.prepare(`PRAGMA table_info(${AUTH_TABLE})`).all();
    columns = (info.results || []).map((r) => r.name).filter(Boolean);
  } catch (error) {
    columns = [];
  }
  if (!columns.length) {
    const row = await env.DB.prepare(`SELECT * FROM ${AUTH_TABLE} LIMIT 1`).first();
    columns = row ? Object.keys(row) : ['id', 'username', 'password'];
  }
  columnCache = columns;
  return columns;
}

function pick(columns, candidates) {
  for (const candidate of candidates) {
    const match = columns.find((col) => col.toLowerCase() === candidate);
    if (match) return match;
  }
  return null;
}

async function getFields(env) {
  const columns = await getColumns(env);
  return {
    columns,
    id: pick(columns, ['id', 'user_id', 'sr_no', 'srno']) || 'id',
    username: pick(columns, ['username', 'user_name', 'user', 'login_id']) || 'username',
    password: pick(columns, ['password', 'pass', 'passwd', 'password_hash']) || 'password',
    email: pick(columns, ['email', 'email_id', 'emailid']) || null,
    role: pick(columns, ['role', 'user_role', 'usertype', 'user_type', 'type']) || null,
    date: pick(columns, ['enterdate', 'entry_date', 'created_at', 'createdon', 'created_on']) || null
  };
}

/* ------------------------------------------------------------------ *
 * Passwords — existing rows are plain text, new rows are hashed.
 * Both are accepted on login so no existing user is locked out.
 * ------------------------------------------------------------------ */

const encoder = new TextEncoder();

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
  const x = String(a);
  const y = String(b);
  let diff = x.length ^ y.length;
  const max = Math.max(x.length, y.length);
  for (let i = 0; i < max; i += 1) {
    diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  }
  return diff === 0;
}

async function verifyPassword(input, stored) {
  if (stored === null || stored === undefined) return false;
  const value = String(stored);
  if (value.startsWith('sha256$')) {
    const [, salt, hash] = value.split('$');
    if (!salt || !hash) return false;
    return constantTimeEqual(await sha256Hex(`${salt}:${input}`), hash);
  }
  return constantTimeEqual(input, value);
}

async function hashPassword(input) {
  const salt = [...crypto.getRandomValues(new Uint8Array(8))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `sha256$${salt}$${await sha256Hex(`${salt}:${input}`)}`;
}

/* ------------------------------------------------------------------ *
 * Session token — HMAC signed, verified only inside the Worker.
 * ------------------------------------------------------------------ */

const base64url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64url = (text) => {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded + '==='.slice((padded.length + 3) % 4)), (c) => c.charCodeAt(0));
};

function secretOf(env) {
  return env.AUTH_SECRET || 'shcg-fallback-secret-set-AUTH_SECRET-in-wrangler';
}

async function signingKey(env) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secretOf(env)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function signBody(env, body) {
  const signature = await crypto.subtle.sign('HMAC', await signingKey(env), encoder.encode(body));
  return base64url(new Uint8Array(signature));
}

async function createToken(env, user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  };
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  return `${body}.${await signBody(env, body)}`;
}

async function verifyToken(env, token) {
  if (!token || token.split('.').length !== 2) return null;
  const [body, signature] = token.split('.');
  if (!constantTimeEqual(await signBody(env, body), signature)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64url(body)));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

async function requireAuth(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const user = await verifyToken(env, token);
  if (!user) {
    return { error: json({ success: false, message: 'Session expired. Please login again.' }, 401) };
  }
  return { user };
}

/* ------------------------------------------------------------------ *
 * Route handlers
 * ------------------------------------------------------------------ */

async function handleLogin(request, env) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Only POST is allowed.' }, 405);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json({ success: false, message: 'Invalid JSON body.' }, 400);
  }

  // Legacy guard: this endpoint used to create users when no action was sent.
  // Account creation now lives behind an authenticated POST /api/users.
  if (payload.action && String(payload.action).toLowerCase() === 'insert') {
    return json({ success: false, message: 'User creation is not allowed on this endpoint.' }, 403);
  }

  const username = String(payload.username || '').trim();
  const password = String(payload.password || '');

  if (!username || !password) {
    return json({ success: false, message: 'Username and password are required.' }, 400);
  }

  const f = await getFields(env);
  const matchEmail = f.email && f.email !== f.username;
  const row = await env.DB.prepare(
    `SELECT * FROM ${AUTH_TABLE} WHERE ${f.username} = ?${matchEmail ? ` OR ${f.email} = ?` : ''} LIMIT 1`
  )
    .bind(...(matchEmail ? [username, username] : [username]))
    .first();

  const invalid = json({ success: false, message: 'Invalid username or password' }, 401);
  if (!row) return invalid;
  if (!(await verifyPassword(password, row[f.password]))) return invalid;

  const user = {
    id: String(row[f.id] ?? ''),
    username: String(row[f.username] ?? username),
    role: String((f.role && row[f.role]) || 'admin')
  };

  return json({
    success: true,
    message: 'Login successful',
    user,
    token: await createToken(env, user),
    expiresIn: TOKEN_TTL_SECONDS
  });
}

async function handleListUsers(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const query = String(url.searchParams.get('q') || '').trim();
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
  const offset = (page - 1) * limit;

  const f = await getFields(env);
  const searchable = [f.username, f.email, f.role].filter(Boolean);
  const where = query ? `WHERE ${searchable.map((c) => `${c} LIKE ?`).join(' OR ')}` : '';
  const params = query ? searchable.map(() => `%${query}%`) : [];

  const selected = [f.id, f.username, f.role, f.date, f.email].filter(Boolean).join(', ');

  const total = await env.DB.prepare(`SELECT COUNT(*) AS total FROM ${AUTH_TABLE} ${where}`)
    .bind(...params)
    .first();

  const rows = await env.DB.prepare(
    `SELECT ${selected} FROM ${AUTH_TABLE} ${where} ORDER BY ${f.id} DESC LIMIT ? OFFSET ?`
  )
    .bind(...params, limit, offset)
    .all();

  const users = (rows.results || []).map((r) => ({
    id: r[f.id],
    username: r[f.username],
    role: (f.role && r[f.role]) || 'admin',
    createdAt: (f.date && r[f.date]) || null
  }));

  return json({ success: true, users, page, limit, total: Number(total?.total || 0) });
}

async function handleCreateUser(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json({ success: false, message: 'Invalid JSON body.' }, 400);
  }

  const username = String(payload.username || '').trim();
  const password = String(payload.password || '');
  const role = String(payload.role || 'staff').trim();

  if (username.length < 3) {
    return json({ success: false, message: 'Username must be at least 3 characters.' }, 400);
  }
  if (password.length < 4) {
    return json({ success: false, message: 'Password must be at least 4 characters.' }, 400);
  }

  const f = await getFields(env);

  const existing = await env.DB.prepare(`SELECT ${f.id} FROM ${AUTH_TABLE} WHERE ${f.username} = ? LIMIT 1`)
    .bind(username)
    .first();
  if (existing) {
    return json({ success: false, message: 'Username already exists.' }, 409);
  }

  const columns = [f.username, f.password];
  const values = [username, await hashPassword(password)];
  if (f.role) {
    columns.push(f.role);
    values.push(role);
  }
  if (f.date) {
    columns.push(f.date);
    values.push(new Date().toISOString().slice(0, 10));
  }

  const result = await env.DB.prepare(
    `INSERT INTO ${AUTH_TABLE} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
  )
    .bind(...values)
    .run();

  return json(
    {
      success: true,
      message: 'User added successfully',
      user: { id: result.meta?.last_row_id ?? null, username, role: f.role ? role : 'admin' }
    },
    201
  );
}

async function handleYearlyStats(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  const f = await getFields(env);
  if (!f.date) {
    return json({
      success: true,
      years: [],
      message: `No date column found on ${AUTH_TABLE}, so year-wise statistics are unavailable.`
    });
  }

  const rows = await env.DB.prepare(
    `SELECT substr(${f.date}, 1, 4) AS year, COUNT(*) AS total
     FROM ${AUTH_TABLE}
     WHERE ${f.date} IS NOT NULL AND ${f.date} <> ''
     GROUP BY year
     ORDER BY year DESC`
  ).all();

  const years = (rows.results || [])
    .filter((r) => /^\d{4}$/.test(String(r.year)))
    .map((r) => ({ year: String(r.year), total: Number(r.total) }));

  return json({ success: true, years });
}

async function handleStats(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  const f = await getFields(env);
  const currentYear = String(new Date().getFullYear());

  const total = await env.DB.prepare(`SELECT COUNT(*) AS total FROM ${AUTH_TABLE}`).first();

  let thisYear = 0;
  let thisMonth = 0;
  if (f.date) {
    const yearRow = await env.DB.prepare(
      `SELECT COUNT(*) AS total FROM ${AUTH_TABLE} WHERE substr(${f.date}, 1, 4) = ?`
    )
      .bind(currentYear)
      .first();
    thisYear = Number(yearRow?.total || 0);

    const monthRow = await env.DB.prepare(
      `SELECT COUNT(*) AS total FROM ${AUTH_TABLE} WHERE substr(${f.date}, 1, 7) = ?`
    )
      .bind(new Date().toISOString().slice(0, 7))
      .first();
    thisMonth = Number(monthRow?.total || 0);
  }

  const latest = await env.DB.prepare(
    `SELECT ${[f.id, f.username, f.date].filter(Boolean).join(', ')}
     FROM ${AUTH_TABLE} ORDER BY ${f.id} DESC LIMIT 5`
  ).all();

  return json({
    success: true,
    currentYear,
    totalUsers: Number(total?.total || 0),
    thisYear,
    thisMonth,
    hasDateColumn: Boolean(f.date),
    recent: (latest.results || []).map((r) => ({
      id: r[f.id],
      username: r[f.username],
      createdAt: (f.date && r[f.date]) || null
    }))
  });
}

async function handleHealth(env) {
  try {
    const f = await getFields(env);
    const row = await env.DB.prepare(`SELECT COUNT(*) AS total FROM ${AUTH_TABLE}`).first();
    return json({
      success: true,
      database: 'connected',
      table: AUTH_TABLE,
      userCount: Number(row?.total || 0),
      hasRoleColumn: Boolean(f.role),
      hasDateColumn: Boolean(f.date),
      authSecretConfigured: Boolean(env.AUTH_SECRET)
    });
  } catch (error) {
    return json({ success: false, database: 'error', message: 'Could not reach the D1 database.' }, 500);
  }
}

/* ------------------------------------------------------------------ */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      if (path === '/') {
        return json({
          success: true,
          service: 'opticalshop-api',
          endpoints: [
            'GET  /api/health',
            'POST /api/login',
            'GET  /api/users',
            'POST /api/users',
            'GET  /api/stats',
            'GET  /api/stats/yearly'
          ]
        });
      }

      if (path === '/api/health') return handleHealth(env);
      if (path === '/api/login') return handleLogin(request, env);
      if (path === '/api/stats/yearly') return handleYearlyStats(request, env);
      if (path === '/api/stats') return handleStats(request, env);
      if (path === '/api/users') {
        if (request.method === 'GET') return handleListUsers(request, env);
        if (request.method === 'POST') return handleCreateUser(request, env);
        return json({ success: false, message: 'Only GET and POST are allowed.' }, 405);
      }

      return json({ success: false, message: 'Not found.' }, 404);
    } catch (error) {
      // Never leak SQL or stack details to the browser.
      return json({ success: false, message: 'Server error. Please try again.' }, 500);
    }
  }
};
