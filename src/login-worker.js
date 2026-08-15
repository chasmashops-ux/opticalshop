/**
 * Shree Hari Chasma Ghar — Cloudflare Worker API
 *
 *   Worker name : opticalshop
 *   D1 binding  : env.DB          (never a raw database id)
 *   D1 database : shcg
 *   Auth table  : login_mst       (existing table — not created or renamed here)
 *   CRM tables  : user_details, order_details (existing tables — not created or renamed here)
 *
 * Routes
 *   GET  /                          service info
 *   GET  /api/health                D1 connectivity check
 *   POST /api/login                 authenticate against login_mst
 *   GET  /api/users                 search login_mst accounts        (Bearer)
 *   POST /api/users                 add a login_mst account           (Bearer)
 *   GET  /api/stats                 login_mst totals                  (Bearer)
 *   GET  /api/stats/yearly          login_mst year-wise stats         (Bearer)
 *   GET  /api/dashboard             CRM dashboard, period-scoped      (Bearer)
 *   GET  /api/years                 distinct years with order data    (Bearer)
 *   GET  /api/search                quick global search               (Bearer)
 *   GET  /api/customers             list/search customers              (Bearer)
 *   POST /api/customers             add a customer                    (Bearer)
 *   GET  /api/customers/:id         customer profile + full order history (Bearer)
 *   POST /api/orders                add an order                      (Bearer)
 *   GET  /api/orders/:id            single order, full detail         (Bearer)
 *   POST /api/orders/:id/bill       generate a bill number for an order (Bearer)
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
 * CRM schema discovery — user_details / order_details.
 *
 * The columns are known (given by the shop's existing schema), but the
 * on-disk date format of orderdate/enterdate is not — historical imports
 * commonly use DD-MM-YYYY rather than SQLite's native YYYY-MM-DD. Every
 * date comparison below runs through a normalized expression detected
 * once per Worker isolate instead of assuming a format.
 * ------------------------------------------------------------------ */

const CUSTOMER_TABLE = 'user_details';
const ORDER_TABLE = 'order_details';

let crmSchemaCache = null;

async function tableColumns(env, table) {
  try {
    const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
    return (info.results || []).map((r) => r.name).filter(Boolean);
  } catch (error) {
    return [];
  }
}

/** Classifies a sample date string so date arithmetic can be built correctly. */
async function detectDateFormat(env, table, column) {
  try {
    const row = await env.DB.prepare(
      `SELECT ${column} AS v FROM ${table} WHERE ${column} IS NOT NULL AND TRIM(${column}) <> '' LIMIT 1`
    ).first();
    const v = row && row.v !== null && row.v !== undefined ? String(row.v).trim() : '';
    if (!v) return 'no-data';
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return 'iso-dash';
    if (/^\d{4}\/\d{2}\/\d{2}/.test(v)) return 'iso-slash';
    if (/^\d{2}-\d{2}-\d{4}/.test(v)) return 'dmy-dash';
    if (/^\d{2}\/\d{2}\/\d{4}/.test(v)) return 'dmy-slash';
    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

/** SQL expression that normalizes a date column/alias to 'YYYY-MM-DD' text for comparison. */
function dateExpr(colRef, format) {
  switch (format) {
    case 'iso-slash':
      return `(substr(${colRef},1,4) || '-' || substr(${colRef},6,2) || '-' || substr(${colRef},9,2))`;
    case 'dmy-dash':
    case 'dmy-slash':
      return `(substr(${colRef},7,4) || '-' || substr(${colRef},4,2) || '-' || substr(${colRef},1,2))`;
    case 'iso-dash':
    default:
      return `substr(${colRef},1,10)`;
  }
}

/** Formats an ISO 'YYYY-MM-DD' string to match the table's on-disk date format, for INSERTs. */
function formatDateForStorage(isoDate, format) {
  const [y, m, d] = isoDate.split('-');
  switch (format) {
    case 'dmy-dash':
      return `${d}-${m}-${y}`;
    case 'dmy-slash':
      return `${d}/${m}/${y}`;
    case 'iso-slash':
      return `${y}/${m}/${d}`;
    case 'iso-dash':
    default:
      return `${y}-${m}-${d}`;
  }
}

async function getCrmSchema(env) {
  if (crmSchemaCache) return crmSchemaCache;

  const customerCols = await tableColumns(env, CUSTOMER_TABLE);
  const orderCols = await tableColumns(env, ORDER_TABLE);
  const hasCustomerTable = customerCols.length > 0;
  const hasOrderTable = orderCols.length > 0;
  const hasEnterDate = hasCustomerTable && customerCols.includes('enterdate');
  const hasOrderDate = hasOrderTable && orderCols.includes('orderdate');
  const hasBillNo = hasOrderTable && orderCols.includes('billno');

  crmSchemaCache = {
    hasCustomerTable,
    hasOrderTable,
    customerCols,
    orderCols,
    hasEnterDate,
    hasOrderDate,
    hasBillNo,
    enterDateFormat: hasEnterDate ? await detectDateFormat(env, CUSTOMER_TABLE, 'enterdate') : 'no-column',
    orderDateFormat: hasOrderDate ? await detectDateFormat(env, ORDER_TABLE, 'orderdate') : 'no-column'
  };
  return crmSchemaCache;
}

/* ------------------------------------------------------------------ *
 * IST (UTC+5:30) date helpers — the shop operates in India, but the
 * Worker's Date/SQLite `now` are UTC, so "today" is computed explicitly.
 * ------------------------------------------------------------------ */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istNow() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  const copy = new Date(d.getTime());
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

function firstOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 1));
}

function lastOfMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0));
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolves the top-level dashboard period selector into a bounded window,
 * or `null` bounds for 'all' (no date filter at all).
 *
 *   week        this ISO week (Monday) through today
 *   month       1st of this month through today
 *   prev-month  the full previous calendar month
 *   6m          rolling 6 months up to today
 *   year        1st of this year through today
 *   all         unbounded — every record
 *   custom      explicit from/to (also used by callers that still want a
 *               plain start/end window, e.g. a future custom-range picker)
 */
function computeRange(range, fromParam, toParam) {
  const now = istNow();
  const today = isoDate(now);
  const KNOWN = ['week', 'month', 'prev-month', '6m', 'year', 'all', 'custom'];
  const normalized = KNOWN.includes(range) ? range : 'all';

  if (normalized === 'all') return { range: normalized, start: null, end: null, groupBy: 'month' };

  if (normalized === 'week') {
    const dow = now.getUTCDay(); // 0 = Sunday
    const sinceMonday = (dow + 6) % 7;
    return { range: normalized, start: isoDate(addDays(now, -sinceMonday)), end: today, groupBy: 'day' };
  }

  if (normalized === 'month') {
    return { range: normalized, start: isoDate(firstOfMonth(now.getUTCFullYear(), now.getUTCMonth())), end: today, groupBy: 'day' };
  }

  if (normalized === 'prev-month') {
    const y = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
    const m = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;
    return { range: normalized, start: isoDate(firstOfMonth(y, m)), end: isoDate(lastOfMonth(y, m)), groupBy: 'day' };
  }

  if (normalized === '6m') {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const startMonth = new Date(Date.UTC(y, m - 5, 1));
    return { range: normalized, start: isoDate(startMonth), end: today, groupBy: 'week' };
  }

  if (normalized === 'year') {
    return { range: normalized, start: isoDate(firstOfMonth(now.getUTCFullYear(), 0)), end: today, groupBy: 'month' };
  }

  // custom
  const fallbackStart = isoDate(addDays(now, -29));
  let start = ISO_DATE_RE.test(fromParam || '') ? fromParam : fallbackStart;
  let end = ISO_DATE_RE.test(toParam || '') ? toParam : today;
  if (start > end) [start, end] = [end, start];
  const spanDays = Math.round((new Date(end) - new Date(start)) / 86400000);
  return { range: normalized, start, end, groupBy: spanDays > 62 ? 'month' : 'day' };
}

/** True when the on-disk format already sorts correctly as plain text. */
function isSargableFormat(format) {
  return format === 'iso-dash' || format === 'iso-slash';
}

/** Converts an ISO 'YYYY-MM-DD' bind value to match the column's on-disk separator. */
function toStoredDate(iso, format) {
  return format === 'iso-slash' ? iso.split('-').join('/') : iso;
}

/**
 * WHERE-clause fragment (inclusive startIso..endIso, both 'YYYY-MM-DD'),
 * or '' for all-time.
 *
 * For iso-dash/iso-slash data (already sorts as plain text) this compares
 * the RAW column directly with a half-open range — no substr()/function
 * wrapping — so SQLite can actually use an index on the column. Wrapping
 * an indexed column in a function makes a predicate non-sargable: SQLite
 * has to evaluate the function on every single row to know which match,
 * i.e. a full table scan regardless of any index. This was the majority
 * of this Worker's D1 "rows read" — a table scan on order_details for
 * every date-filtered query, every dashboard/statistics load.
 *
 * dmy-* formats genuinely need day/month reordering, so they fall back to
 * the wrapped expression — correct, but still a scan; that's a data-format
 * limitation, not something a query rewrite alone can fix.
 */
function sargableDateWhere(colRef, format, startIso, endIso) {
  if (!startIso || !endIso) return { clause: '', params: [] };
  if (isSargableFormat(format)) {
    const endExclusive = isoDate(addDays(new Date(`${endIso}T00:00:00Z`), 1));
    return {
      clause: `${colRef} >= ? AND ${colRef} < ?`,
      params: [toStoredDate(startIso, format), toStoredDate(endExclusive, format)]
    };
  }
  const expr = dateExpr(colRef, format);
  return { clause: `${expr} BETWEEN ? AND ?`, params: [startIso, endIso] };
}

/** Same idea as sargableDateWhere, for a single exact day. */
function sargableDayWhere(colRef, format, dayIso) {
  return sargableDateWhere(colRef, format, dayIso, dayIso);
}

/** Same idea, for a 'YYYY-MM' month prefix. */
function sargableMonthWhere(colRef, format, yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  const start = isoDate(firstOfMonth(y, m - 1));
  const end = isoDate(lastOfMonth(y, m - 1));
  return sargableDateWhere(colRef, format, start, end);
}

/** Same idea, for a 'YYYY' year prefix. */
function sargableYearWhere(colRef, format, year) {
  const y = Number(year);
  const start = isoDate(firstOfMonth(y, 0));
  const end = isoDate(lastOfMonth(y, 11));
  return sargableDateWhere(colRef, format, start, end);
}

function combineWhere(parts) {
  const clauses = parts.map((p) => p.clause).filter(Boolean);
  const params = parts.flatMap((p) => p.params);
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function firstRow(result) {
  return (result && result.results && result.results[0]) || {};
}

function rowsOf(result) {
  return (result && result.results) || [];
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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

  return json({
    success: true,
    users,
    page,
    limit,
    total: Number(total?.total || 0),
    hasRoleColumn: Boolean(f.role),
    hasDateColumn: Boolean(f.date)
  });
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
      user: { id: result.meta?.last_row_id ?? null, username, role: f.role ? role : 'admin' },
      // login_mst has no role column in this database, so the role was not stored.
      roleStored: Boolean(f.role)
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
    table: AUTH_TABLE,
    totalUsers: Number(total?.total || 0),
    thisYear,
    thisMonth,
    hasRoleColumn: Boolean(f.role),
    hasDateColumn: Boolean(f.date),
    recent: (latest.results || []).map((r) => ({
      id: r[f.id],
      username: r[f.username],
      createdAt: (f.date && r[f.date]) || null
    }))
  });
}

function crmUnavailable(schema) {
  if (!schema.hasCustomerTable || !schema.hasOrderTable) {
    return json(
      {
        success: false,
        message: `CRM tables were not found in the database (${CUSTOMER_TABLE}: ${
          schema.hasCustomerTable ? 'ok' : 'missing'
        }, ${ORDER_TABLE}: ${schema.hasOrderTable ? 'ok' : 'missing'}).`
      },
      500
    );
  }
  return null;
}

/**
 * GET /api/dashboard?range=week|month|prev-month|6m|year|all&from=&to=
 *
 * One D1 batch round trip for every KPI/chart/table the dashboard needs.
 * Headline KPIs (customers/orders/sales/billed/repeat) are scoped to the
 * selected period — 'all' (the default) means unbounded, all-time.
 */
async function handleDashboard(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  const schema = await getCrmSchema(env);
  const unavailable = crmUnavailable(schema);
  if (unavailable) return unavailable;

  const url = new URL(request.url);
  const { range, start, end, groupBy } = computeRange(
    url.searchParams.get('range'),
    url.searchParams.get('from'),
    url.searchParams.get('to')
  );

  // OD/O_OD (normalized to 'YYYY-MM-DD') are for SELECT/GROUP BY/ORDER BY
  // only — grouping/sorting on a computed expression is fine. Every WHERE
  // filter below uses sargableDateWhere() et al instead, which compare the
  // RAW column directly so an index on it can actually be used.
  const OD = schema.hasOrderDate ? dateExpr('orderdate', schema.orderDateFormat) : null;
  const O_OD = schema.hasOrderDate ? dateExpr('o.orderdate', schema.orderDateFormat) : null;
  const ED = schema.hasEnterDate ? dateExpr('enterdate', schema.enterDateFormat) : null;

  const now = istNow();
  const today = isoDate(now);
  const yesterday = isoDate(addDays(now, -1));
  const monthPrefix = today.slice(0, 7);
  const yearPrefix = today.slice(0, 4);

  // Period WHERE fragment shared by every order_details-scoped query below.
  const periodWhere = schema.hasOrderDate
    ? sargableDateWhere('orderdate', schema.orderDateFormat, start, end)
    : { clause: '', params: [] };
  const periodWhereO = schema.hasOrderDate
    ? sargableDateWhere('o.orderdate', schema.orderDateFormat, start, end)
    : { clause: '', params: [] };
  const billedExpr = schema.hasBillNo ? "billno IS NOT NULL AND TRIM(billno) <> ''" : null;
  const noBillExpr = schema.hasBillNo ? "(billno IS NULL OR TRIM(billno) = '')" : null;

  const stmts = [];
  const at = {};
  const add = (key, sql, params = []) => {
    at[key] = stmts.length;
    stmts.push(env.DB.prepare(sql).bind(...params));
  };

  // ---- headline KPIs, period-scoped ----
  if (schema.hasOrderDate) {
    const w = combineWhere([periodWhere]);
    add(
      'periodOrders',
      `SELECT COUNT(*) AS c, COALESCE(SUM(amount),0) AS s, COALESCE(MAX(amount),0) AS mx, COALESCE(MIN(amount),0) AS mn
       FROM ${ORDER_TABLE} ${w.sql}`,
      w.params
    );
    add(
      'periodActiveCustomers',
      `SELECT COUNT(DISTINCT userid) AS c FROM ${ORDER_TABLE} ${w.sql}`,
      w.params
    );
    if (schema.hasBillNo) {
      const billedWhere = combineWhere([periodWhere, { clause: billedExpr, params: [] }]);
      add('billedOrders', `SELECT COUNT(*) AS c FROM ${ORDER_TABLE} ${billedWhere.sql}`, billedWhere.params);
      const noBillWhere = combineWhere([periodWhere, { clause: noBillExpr, params: [] }]);
      add('noBillOrders', `SELECT COUNT(*) AS c FROM ${ORDER_TABLE} ${noBillWhere.sql}`, noBillWhere.params);
    }
    add(
      'repeatCustomers',
      `SELECT COUNT(*) AS c FROM (SELECT userid FROM ${ORDER_TABLE} ${w.sql} GROUP BY userid HAVING COUNT(*) > 1)`,
      w.params
    );
  }
  add('totalCustomersAllTime', `SELECT COUNT(*) AS c FROM ${CUSTOMER_TABLE}`);

  // ---- supplementary always-on KPIs (independent of the period selector) ----
  const categoryWhere = combineWhere([periodWhere]);
  add(
    'category',
    `SELECT COALESCE(SUM(frameprice),0) AS frame, COALESCE(SUM(glassprice),0) AS glass,
            COALESCE(SUM(lensprice),0) AS lens, COALESCE(SUM(sunglassprice),0) AS sunglass,
            COALESCE(SUM(repairprice),0) AS repair
     FROM ${ORDER_TABLE} ${categoryWhere.sql}`,
    categoryWhere.params
  );

  const productWhere = combineWhere([periodWhere]);
  add(
    'productAnalytics',
    `SELECT COALESCE(NULLIF(TRIM(product),''),'Unspecified') AS product, COUNT(*) AS c, COALESCE(SUM(amount),0) AS s
     FROM ${ORDER_TABLE} ${productWhere.sql} GROUP BY product ORDER BY c DESC LIMIT 12`,
    productWhere.params
  );
  const frameWhere = combineWhere([periodWhere]);
  add(
    'frameAnalytics',
    `SELECT COALESCE(NULLIF(TRIM(frametype),''),'Unspecified') AS frametype, COUNT(*) AS c, COALESCE(SUM(frameprice),0) AS s
     FROM ${ORDER_TABLE} ${frameWhere.sql} GROUP BY frametype ORDER BY c DESC LIMIT 10`,
    frameWhere.params
  );

  const topCustWhere = combineWhere([periodWhereO]);
  add(
    'topCustomers',
    `SELECT u.userid, u.name, u.mobile, COUNT(o.orderid) AS total_orders, COALESCE(SUM(o.amount),0) AS total_spending,
            MAX(${schema.hasOrderDate ? O_OD : 'NULL'}) AS last_order_date
     FROM ${CUSTOMER_TABLE} u
     JOIN ${ORDER_TABLE} o ON u.userid = o.userid
     ${topCustWhere.sql}
     GROUP BY u.userid, u.name, u.mobile
     ORDER BY total_spending DESC
     LIMIT 10`,
    topCustWhere.params
  );

  const recentWhere = combineWhere([periodWhereO]);
  add(
    'recentOrders',
    `SELECT o.orderid, o.billno, u.name AS customer_name, u.mobile AS customer_mobile, o.orderdate, o.product,
            o.frametype, o.descriptionframe, o.descriptionglass, o.amount
     FROM ${ORDER_TABLE} o
     LEFT JOIN ${CUSTOMER_TABLE} u ON o.userid = u.userid
     ${recentWhere.sql}
     ORDER BY ${schema.hasOrderDate ? O_OD : 'o.orderid'} DESC, o.orderid DESC
     LIMIT 15`,
    recentWhere.params
  );

  // The "Monthly Sales" 12-month chart follows whichever year the caller is
  // actually looking at — the selected year for 'year'/'custom' (the
  // Statistics page passes a full-year custom range), otherwise the
  // current year, matching the always-on "This Year Sales" KPI below.
  const monthlyYear = start && (range === 'year' || range === 'custom') ? start.slice(0, 4) : yearPrefix;

  if (schema.hasOrderDate) {
    const todayWhere = sargableDayWhere('orderdate', schema.orderDateFormat, today);
    add('today', `SELECT COUNT(*) AS c, COALESCE(SUM(amount),0) AS s FROM ${ORDER_TABLE} WHERE ${todayWhere.clause}`, todayWhere.params);

    const yesterdayWhere = sargableDayWhere('orderdate', schema.orderDateFormat, yesterday);
    add(
      'yesterday',
      `SELECT COUNT(*) AS c, COALESCE(SUM(amount),0) AS s FROM ${ORDER_TABLE} WHERE ${yesterdayWhere.clause}`,
      yesterdayWhere.params
    );

    const yearToDateWhere = sargableYearWhere('orderdate', schema.orderDateFormat, yearPrefix);
    add(
      'yearToDate',
      `SELECT COALESCE(SUM(amount),0) AS s FROM ${ORDER_TABLE} WHERE ${yearToDateWhere.clause}`,
      yearToDateWhere.params
    );

    const monthlyYearWhere = sargableYearWhere('orderdate', schema.orderDateFormat, monthlyYear);
    add(
      'monthly',
      `SELECT substr(${OD},6,2) AS m, COUNT(*) AS c, COALESCE(SUM(amount),0) AS s
       FROM ${ORDER_TABLE} WHERE ${monthlyYearWhere.clause} GROUP BY m`,
      monthlyYearWhere.params
    );

    // Sales Overview chart — grouped by the granularity computeRange chose.
    let groupExpr = OD;
    if (groupBy === 'month') groupExpr = `substr(${OD},1,7)`;
    else if (groupBy === 'week') groupExpr = `date(${OD},'weekday 0','-6 days')`;
    const overviewWhere = combineWhere([periodWhere]);
    add(
      'overview',
      `SELECT ${groupExpr} AS d, COUNT(*) AS c, COALESCE(SUM(amount),0) AS s
       FROM ${ORDER_TABLE} ${overviewWhere.sql} GROUP BY d ORDER BY d ASC`,
      overviewWhere.params
    );

    const biggestOrderWhere = sargableMonthWhere('o.orderdate', schema.orderDateFormat, monthPrefix);
    add(
      'biggestOrderMonth',
      `SELECT o.orderid, o.billno, o.amount, o.orderdate, u.name AS customer_name
       FROM ${ORDER_TABLE} o LEFT JOIN ${CUSTOMER_TABLE} u ON o.userid = u.userid
       WHERE ${biggestOrderWhere.clause}
       ORDER BY o.amount DESC LIMIT 1`,
      biggestOrderWhere.params
    );
  }

  if (schema.hasEnterDate) {
    const custNewTodayWhere = sargableDayWhere('enterdate', schema.enterDateFormat, today);
    add('custNewToday', `SELECT COUNT(*) AS c FROM ${CUSTOMER_TABLE} WHERE ${custNewTodayWhere.clause}`, custNewTodayWhere.params);

    const custNewMonthWhere = sargableMonthWhere('enterdate', schema.enterDateFormat, monthPrefix);
    add('custNewMonth', `SELECT COUNT(*) AS c FROM ${CUSTOMER_TABLE} WHERE ${custNewMonthWhere.clause}`, custNewMonthWhere.params);

    const custNewYearWhere = sargableYearWhere('enterdate', schema.enterDateFormat, yearPrefix);
    add('custNewYear', `SELECT COUNT(*) AS c FROM ${CUSTOMER_TABLE} WHERE ${custNewYearWhere.clause}`, custNewYearWhere.params);
    add(
      'recentCustomers',
      `SELECT userid, name, enterdate FROM ${CUSTOMER_TABLE} ORDER BY ${ED} DESC, userid DESC LIMIT 5`
    );
  } else {
    add('recentCustomers', `SELECT userid, name, NULL AS enterdate FROM ${CUSTOMER_TABLE} ORDER BY userid DESC LIMIT 5`);
  }

  add('custWithOrders', `SELECT COUNT(DISTINCT userid) AS c FROM ${ORDER_TABLE} WHERE userid IS NOT NULL`);

  let results;
  try {
    results = await env.DB.batch(stmts);
  } catch (error) {
    return json({ success: false, message: 'Could not read dashboard data from the database.' }, 500);
  }

  const row = (key) => firstRow(results[at[key]]);
  const rows = (key) => rowsOf(results[at[key]]);

  const isAllTime = range === 'all' || !schema.hasOrderDate;
  const periodOrdersRow = schema.hasOrderDate ? row('periodOrders') : {};
  const periodOrders = toNumber(periodOrdersRow.c);
  const periodSales = toNumber(periodOrdersRow.s);
  const periodCustomers = isAllTime ? toNumber(row('totalCustomersAllTime').c) : toNumber(row('periodActiveCustomers').c);

  const todayRow = schema.hasOrderDate ? row('today') : {};
  const yesterdayRow = schema.hasOrderDate ? row('yesterday') : {};

  const todaySales = toNumber(todayRow.s);
  const yesterdaySales = toNumber(yesterdayRow.s);
  const todayOrders = toNumber(todayRow.c);
  const yesterdayOrders = toNumber(yesterdayRow.c);

  const growthPct = (current, previous) => {
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyByNum = new Map(rows('monthly').map((r) => [String(r.m).padStart(2, '0'), r]));
  const monthlySales = monthNames.map((label, i) => {
    const key = String(i + 1).padStart(2, '0');
    const r = monthlyByNum.get(key);
    return { month: label, sales: toNumber(r && r.s), orders: toNumber(r && r.c) };
  });

  const totalCustomersAllTime = toNumber(row('totalCustomersAllTime').c);
  const customersWithOrders = toNumber(row('custWithOrders').c);
  const category = row('category');

  const recentOrders = rows('recentOrders').map((r) => ({
    orderId: r.orderid,
    billNo: r.billno || null,
    customerName: r.customer_name || 'Walk-in customer',
    customerMobile: r.customer_mobile || null,
    orderDate: r.orderdate || null,
    product: r.product || null,
    frameType: r.frametype || null,
    descriptionFrame: r.descriptionframe || null,
    descriptionGlass: r.descriptionglass || null,
    amount: toNumber(r.amount)
  }));

  const recentCustomers = rows('recentCustomers').map((r) => ({
    userId: r.userid,
    name: r.name,
    enterDate: r.enterdate || null
  }));

  const biggestOrder = schema.hasOrderDate ? row('biggestOrderMonth') : {};

  const activity = [];
  recentCustomers.slice(0, 3).forEach((c) => {
    activity.push({ type: 'customer', text: `New customer added: ${c.name || 'Unnamed'}`, at: c.enterDate });
  });
  recentOrders.slice(0, 3).forEach((o) => {
    activity.push({
      type: 'order',
      text: `New order${o.billNo ? ` · Bill #${o.billNo}` : ' · No Bill'} for ${o.customerName} — ₹${o.amount.toLocaleString(
        'en-IN'
      )}`,
      at: o.orderDate
    });
  });
  if (biggestOrder && biggestOrder.orderid) {
    activity.push({
      type: 'highlight',
      text: `Largest order this month: ₹${toNumber(biggestOrder.amount).toLocaleString('en-IN')} by ${
        biggestOrder.customer_name || 'a customer'
      }`,
      at: biggestOrder.orderdate
    });
  }
  activity.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));

  return json({
    success: true,
    generatedAt: new Date().toISOString(),
    schema: {
      hasOrderDate: schema.hasOrderDate,
      hasEnterDate: schema.hasEnterDate,
      hasBillNo: schema.hasBillNo,
      orderDateFormat: schema.orderDateFormat,
      enterDateFormat: schema.enterDateFormat
    },
    kpis: {
      range,
      periodStart: start,
      periodEnd: end,
      totalCustomers: periodCustomers,
      totalOrders: periodOrders,
      totalSales: periodSales,
      averageOrderValue: periodOrders > 0 ? Math.round((periodSales / periodOrders) * 100) / 100 : 0,
      maxOrderAmount: periodOrders > 0 ? toNumber(periodOrdersRow.mx) : null,
      minOrderAmount: periodOrders > 0 ? toNumber(periodOrdersRow.mn) : null,
      billedOrders: schema.hasBillNo ? toNumber(row('billedOrders').c) : null,
      noBillOrders: schema.hasBillNo ? toNumber(row('noBillOrders').c) : null,
      repeatCustomers: schema.hasOrderDate ? toNumber(row('repeatCustomers').c) : 0,
      todayOrders,
      todaySales,
      yearSales: schema.hasOrderDate ? toNumber(row('yearToDate').s) : 0,
      totalCustomersAllTime
    },
    dailyPerformance: {
      todaySales,
      yesterdaySales,
      todayOrders,
      yesterdayOrders,
      salesGrowthPct: growthPct(todaySales, yesterdaySales),
      orderGrowthPct: growthPct(todayOrders, yesterdayOrders)
    },
    salesOverview: {
      range,
      start,
      end,
      groupBy,
      points: schema.hasOrderDate
        ? rows('overview').map((r) => ({ date: r.d, sales: toNumber(r.s), orders: toNumber(r.c) }))
        : []
    },
    monthlyYear,
    monthlySales,
    categorySales: [
      { category: 'Frame', sales: toNumber(category.frame) },
      { category: 'Glass', sales: toNumber(category.glass) },
      { category: 'Lens', sales: toNumber(category.lens) },
      { category: 'Sunglasses', sales: toNumber(category.sunglass) },
      { category: 'Repair', sales: toNumber(category.repair) }
    ],
    topCustomers: rows('topCustomers').map((r) => ({
      userId: r.userid,
      name: r.name || 'Unnamed',
      mobile: r.mobile || null,
      totalOrders: toNumber(r.total_orders),
      totalSpending: toNumber(r.total_spending),
      lastOrderDate: r.last_order_date || null
    })),
    recentOrders,
    productAnalytics: rows('productAnalytics').map((r) => ({
      product: r.product,
      orders: toNumber(r.c),
      sales: toNumber(r.s)
    })),
    frameAnalytics: rows('frameAnalytics').map((r) => ({
      frameType: r.frametype,
      orders: toNumber(r.c),
      sales: toNumber(r.s)
    })),
    customerAnalytics: {
      newToday: schema.hasEnterDate ? toNumber(row('custNewToday').c) : 0,
      newThisMonth: schema.hasEnterDate ? toNumber(row('custNewMonth').c) : 0,
      newThisYear: schema.hasEnterDate ? toNumber(row('custNewYear').c) : 0,
      totalCustomers: totalCustomersAllTime,
      customersWithOrders,
      customersWithoutOrders: Math.max(0, totalCustomersAllTime - customersWithOrders)
    },
    recentActivity: activity.slice(0, 5)
  });
}

/**
 * GET /api/years — distinct years actually present in order_details,
 * newest first. Powers the Statistics page's year selector so it only
 * ever offers years that really have data.
 */
async function handleCrmYears(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  const schema = await getCrmSchema(env);
  const unavailable = crmUnavailable(schema);
  if (unavailable) return unavailable;

  if (!schema.hasOrderDate) return json({ success: true, years: [] });

  const OD = dateExpr('orderdate', schema.orderDateFormat);
  let rows;
  try {
    rows = await env.DB.prepare(
      `SELECT DISTINCT substr(${OD},1,4) AS year FROM ${ORDER_TABLE}
       WHERE ${OD} IS NOT NULL AND ${OD} <> '' ORDER BY year DESC`
    ).all();
  } catch (error) {
    return json({ success: false, message: 'Could not read available years.' }, 500);
  }

  const years = rowsOf(rows)
    .map((r) => r.year)
    .filter((y) => /^\d{4}$/.test(String(y)))
    .map(Number);

  return json({ success: true, years });
}

/**
 * GET /api/search?q=... — customers (name/mobile), orders (bill no/order id),
 * and frame types. Every branch is LIMITed; nothing loads the full tables.
 * Used by the dashboard's quick global search box.
 */
async function handleSearch(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  const schema = await getCrmSchema(env);
  const unavailable = crmUnavailable(schema);
  if (unavailable) return unavailable;

  const q = String(new URL(request.url).searchParams.get('q') || '').trim();
  if (!q) return json({ success: true, query: '', customers: [], orders: [], frameTypes: [] });

  const like = `%${q}%`;
  let results;
  try {
    results = await env.DB.batch([
      env.DB.prepare(
        `SELECT userid, name, mobile FROM ${CUSTOMER_TABLE} WHERE name LIKE ? OR mobile LIKE ? LIMIT 8`
      ).bind(like, like),
      env.DB.prepare(
        `SELECT orderid, billno, amount, orderdate, userid FROM ${ORDER_TABLE}
         WHERE CAST(orderid AS TEXT) LIKE ? OR billno LIKE ? LIMIT 8`
      ).bind(like, like),
      env.DB.prepare(
        `SELECT DISTINCT frametype FROM ${ORDER_TABLE} WHERE frametype LIKE ? AND TRIM(frametype) <> '' LIMIT 8`
      ).bind(like)
    ]);
  } catch (error) {
    return json({ success: false, message: 'Search failed.' }, 500);
  }

  return json({
    success: true,
    query: q,
    customers: rowsOf(results[0]).map((r) => ({ userId: r.userid, name: r.name, mobile: r.mobile })),
    orders: rowsOf(results[1]).map((r) => ({
      orderId: r.orderid,
      billNo: r.billno,
      amount: toNumber(r.amount),
      orderDate: r.orderdate,
      userId: r.userid
    })),
    frameTypes: rowsOf(results[2]).map((r) => r.frametype)
  });
}

/**
 * GET /api/customers?q=&page=&limit= — the dedicated Search/Customers page.
 * A single query box matches name, mobile, bill number OR order id: typing
 * a bill number surfaces the customer that order belongs to.
 */
async function handleListCustomers(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  const schema = await getCrmSchema(env);
  const unavailable = crmUnavailable(schema);
  if (unavailable) return unavailable;

  const url = new URL(request.url);
  const query = String(url.searchParams.get('q') || '').trim();
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '15', 10) || 15));
  const offset = (page - 1) * limit;

  const OD = schema.hasOrderDate ? dateExpr('o.orderdate', schema.orderDateFormat) : null;

  let where = '';
  let params = [];
  if (query) {
    const like = `%${query}%`;
    where = `WHERE u.name LIKE ? OR u.mobile LIKE ?
      OR EXISTS (SELECT 1 FROM ${ORDER_TABLE} o2 WHERE o2.userid = u.userid
                 AND (o2.billno LIKE ? OR CAST(o2.orderid AS TEXT) LIKE ?))`;
    params = [like, like, like, like];
  }

  let results;
  try {
    results = await env.DB.batch([
      env.DB.prepare(`SELECT COUNT(*) AS total FROM ${CUSTOMER_TABLE} u ${where}`).bind(...params),
      env.DB.prepare(
        `SELECT u.userid, u.name, u.mobile, u.enterdate,
                COUNT(o.orderid) AS total_orders, COALESCE(SUM(o.amount),0) AS total_spending,
                MAX(${schema.hasOrderDate ? OD : 'NULL'}) AS last_order_date
         FROM ${CUSTOMER_TABLE} u
         LEFT JOIN ${ORDER_TABLE} o ON o.userid = u.userid
         ${where}
         GROUP BY u.userid, u.name, u.mobile, u.enterdate
         ORDER BY u.userid DESC
         LIMIT ? OFFSET ?`
      ).bind(...params, limit, offset)
    ]);
  } catch (error) {
    return json({ success: false, message: 'Could not search customers.' }, 500);
  }

  return json({
    success: true,
    query,
    page,
    limit,
    total: toNumber(firstRow(results[0]).total),
    customers: rowsOf(results[1]).map((r) => ({
      userId: r.userid,
      name: r.name || 'Unnamed',
      mobile: r.mobile || null,
      totalOrders: toNumber(r.total_orders),
      totalSpending: toNumber(r.total_spending),
      lastOrderDate: r.last_order_date || null,
      customerSince: r.enterdate || null
    }))
  });
}

/** POST /api/customers — add a row to user_details. */
async function handleAddCustomer(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  const schema = await getCrmSchema(env);
  const unavailable = crmUnavailable(schema);
  if (unavailable) return unavailable;

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json({ success: false, message: 'Invalid JSON body.' }, 400);
  }

  const name = String(payload.name || '').trim();
  const mobile = String(payload.mobile || '').trim();
  const address = String(payload.address || '').trim();

  if (name.length < 2) return json({ success: false, message: 'Customer name is required.' }, 400);
  if (mobile && !/^\d{7,15}$/.test(mobile)) {
    return json({ success: false, message: 'Enter a valid mobile number, or leave it blank.' }, 400);
  }

  const columns = ['name'];
  const values = [name];
  if (mobile && schema.customerCols.includes('mobile')) {
    columns.push('mobile');
    values.push(mobile);
  }
  if (schema.customerCols.includes('address')) {
    columns.push('address');
    values.push(address);
  }
  if (schema.hasEnterDate) {
    columns.push('enterdate');
    values.push(formatDateForStorage(isoDate(istNow()), schema.enterDateFormat));
  }

  let result;
  try {
    result = await env.DB.prepare(
      `INSERT INTO ${CUSTOMER_TABLE} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
    )
      .bind(...values)
      .run();
  } catch (error) {
    return json({ success: false, message: 'Could not save the customer.' }, 500);
  }

  return json(
    { success: true, message: 'Customer added successfully', customer: { userId: result.meta?.last_row_id ?? null, name, mobile } },
    201
  );
}

/** GET /api/customers/:id — profile summary + the customer's FULL order history. */
async function handleCustomerProfile(request, env, userId) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  const schema = await getCrmSchema(env);
  const unavailable = crmUnavailable(schema);
  if (unavailable) return unavailable;

  const customer = await env.DB.prepare(`SELECT * FROM ${CUSTOMER_TABLE} WHERE userid = ? LIMIT 1`)
    .bind(userId)
    .first();
  if (!customer) return json({ success: false, message: 'Customer not found.' }, 404);

  const OD = schema.hasOrderDate ? dateExpr('orderdate', schema.orderDateFormat) : null;
  const orderCols = [
    'orderid',
    'orderdate',
    'billno',
    'product',
    'descriptionframe',
    'descriptionglass',
    'eyeweardetail',
    'amount',
    'frametype',
    'framesize',
    'frameprice',
    'glassprice',
    'lensprice',
    'sunglassprice',
    'repairprice'
  ].filter((c) => schema.orderCols.includes(c));

  const orders = await env.DB.prepare(
    `SELECT ${orderCols.join(', ')} FROM ${ORDER_TABLE} WHERE userid = ?
     ORDER BY ${schema.hasOrderDate ? OD : 'orderid'} DESC, orderid DESC`
  )
    .bind(userId)
    .all();

  const orderRows = rowsOf(orders).map((r) => ({
    orderId: r.orderid,
    orderDate: r.orderdate || null,
    billNo: r.billno && String(r.billno).trim() ? r.billno : null,
    product: r.product || null,
    descriptionFrame: r.descriptionframe || null,
    descriptionGlass: r.descriptionglass || null,
    eyewearDetail: r.eyeweardetail || null,
    amount: toNumber(r.amount),
    frameType: r.frametype || null,
    frameSize: r.framesize || null,
    framePrice: r.frameprice === undefined ? null : toNumber(r.frameprice),
    glassPrice: r.glassprice === undefined ? null : toNumber(r.glassprice),
    lensPrice: r.lensprice === undefined ? null : toNumber(r.lensprice),
    sunglassPrice: r.sunglassprice === undefined ? null : toNumber(r.sunglassprice),
    repairPrice: r.repairprice === undefined ? null : toNumber(r.repairprice)
  }));

  const totalSpending = orderRows.reduce((sum, o) => sum + o.amount, 0);

  return json({
    success: true,
    customer: {
      userId: customer.userid,
      name: customer.name || 'Unnamed',
      mobile: customer.mobile || null,
      address: customer.address || null,
      customerSince: customer.enterdate || null
    },
    stats: {
      totalOrders: orderRows.length,
      totalPurchase: totalSpending,
      lastOrderDate: orderRows[0] ? orderRows[0].orderDate : null,
      averageOrderValue: orderRows.length ? Math.round((totalSpending / orderRows.length) * 100) / 100 : 0
    },
    orders: orderRows
  });
}

/** POST /api/orders — add a row to order_details for an existing customer. */
async function handleAddOrder(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  const schema = await getCrmSchema(env);
  const unavailable = crmUnavailable(schema);
  if (unavailable) return unavailable;

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json({ success: false, message: 'Invalid JSON body.' }, 400);
  }

  const userId = payload.userid ?? payload.userId;
  if (userId === undefined || userId === null || userId === '') {
    return json({ success: false, message: 'Select a customer for this order.' }, 400);
  }

  const customer = await env.DB.prepare(`SELECT userid FROM ${CUSTOMER_TABLE} WHERE userid = ? LIMIT 1`)
    .bind(userId)
    .first();
  if (!customer) return json({ success: false, message: 'Customer not found.' }, 400);

  const priceField = (key) => (payload[key] === undefined || payload[key] === '' ? null : toNumber(payload[key]));
  const textField = (key) => {
    const v = payload[key];
    return v === undefined || v === null || v === '' ? null : String(v).trim();
  };

  // Bill number is always optional — a blank/omitted value stays NULL.
  const billNo = textField('billno');

  // Prefer an explicit total; otherwise derive it from the category prices,
  // matching how the existing quick-add flow already computed it.
  const priceSum =
    (priceField('frameprice') || 0) +
    (priceField('glassprice') || 0) +
    (priceField('lensprice') || 0) +
    (priceField('sunglassprice') || 0) +
    (priceField('repairprice') || 0);
  const amount = payload.amount !== undefined && payload.amount !== '' ? toNumber(payload.amount) : priceSum;

  if (amount <= 0) return json({ success: false, message: 'Enter a valid order amount.' }, 400);

  const record = {
    userid: userId,
    billno: billNo,
    product: textField('product'),
    descriptionframe: textField('descriptionframe'),
    descriptionglass: textField('descriptionglass'),
    eyeweardetail: textField('eyeweardetail'),
    amount,
    frametype: textField('frametype'),
    framesize: textField('framesize'),
    frameprice: priceField('frameprice'),
    glassprice: priceField('glassprice'),
    lensprice: priceField('lensprice'),
    sunglassprice: priceField('sunglassprice'),
    repairprice: priceField('repairprice')
  };

  const columns = Object.keys(record).filter((key) => schema.orderCols.includes(key));
  const values = columns.map((key) => record[key]);

  if (schema.hasOrderDate) {
    columns.push('orderdate');
    values.push(formatDateForStorage(isoDate(istNow()), schema.orderDateFormat));
  }

  let result;
  try {
    result = await env.DB.prepare(
      `INSERT INTO ${ORDER_TABLE} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
    )
      .bind(...values)
      .run();
  } catch (error) {
    return json({ success: false, message: 'Could not save the order.' }, 500);
  }

  return json(
    {
      success: true,
      message: 'Order added successfully',
      order: { orderId: result.meta?.last_row_id ?? null, amount, billNo }
    },
    201
  );
}

/** GET /api/orders/:id — full order detail, joined with the customer. */
async function handleOrderDetail(request, env, orderId) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  const schema = await getCrmSchema(env);
  const unavailable = crmUnavailable(schema);
  if (unavailable) return unavailable;

  const row = await env.DB.prepare(
    `SELECT o.*, u.name AS customer_name, u.mobile AS customer_mobile, u.address AS customer_address
     FROM ${ORDER_TABLE} o LEFT JOIN ${CUSTOMER_TABLE} u ON o.userid = u.userid
     WHERE o.orderid = ? LIMIT 1`
  )
    .bind(orderId)
    .first();

  if (!row) return json({ success: false, message: 'Order not found.' }, 404);

  return json({
    success: true,
    order: {
      orderId: row.orderid,
      userId: row.userid,
      orderDate: row.orderdate || null,
      billNo: row.billno && String(row.billno).trim() ? row.billno : null,
      product: row.product || null,
      descriptionFrame: row.descriptionframe || null,
      descriptionGlass: row.descriptionglass || null,
      eyewearDetail: row.eyeweardetail || null,
      amount: toNumber(row.amount),
      frameType: row.frametype || null,
      frameSize: row.framesize || null,
      framePrice: row.frameprice === undefined ? null : toNumber(row.frameprice),
      glassPrice: row.glassprice === undefined ? null : toNumber(row.glassprice),
      lensPrice: row.lensprice === undefined ? null : toNumber(row.lensprice),
      sunglassPrice: row.sunglassprice === undefined ? null : toNumber(row.sunglassprice),
      repairPrice: row.repairprice === undefined ? null : toNumber(row.repairprice),
      customer: {
        userId: row.userid,
        name: row.customer_name || 'Unnamed',
        mobile: row.customer_mobile || null,
        address: row.customer_address || null
      }
    }
  });
}

/** POST /api/orders/:id/bill — assigns a bill number to an order that doesn't have one yet. */
async function handleGenerateBill(request, env, orderId) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  const schema = await getCrmSchema(env);
  const unavailable = crmUnavailable(schema);
  if (unavailable) return unavailable;
  if (!schema.hasBillNo) return json({ success: false, message: 'This database has no billno column.' }, 500);

  const existing = await env.DB.prepare(`SELECT orderid, billno FROM ${ORDER_TABLE} WHERE orderid = ? LIMIT 1`)
    .bind(orderId)
    .first();
  if (!existing) return json({ success: false, message: 'Order not found.' }, 404);

  if (existing.billno && String(existing.billno).trim()) {
    return json({ success: true, message: 'This order already has a bill number.', billNo: existing.billno });
  }

  const billNo = `SHCG-${String(orderId).padStart(5, '0')}`;

  try {
    await env.DB.prepare(`UPDATE ${ORDER_TABLE} SET billno = ? WHERE orderid = ?`).bind(billNo, orderId).run();
  } catch (error) {
    return json({ success: false, message: 'Could not generate the bill.' }, 500);
  }

  return json({ success: true, message: 'Bill generated successfully.', billNo });
}

/**
 * Public connectivity probe. Deliberately reports no row counts, customer
 * data or other sensitive schema detail — that lives on authenticated routes.
 */
async function handleHealth(env) {
  try {
    await env.DB.prepare(`SELECT 1 FROM ${AUTH_TABLE} LIMIT 1`).first();
    const crm = await getCrmSchema(env);
    return json({
      success: true,
      database: 'connected',
      authSecretConfigured: Boolean(env.AUTH_SECRET),
      crm: {
        customerTable: crm.hasCustomerTable,
        orderTable: crm.hasOrderTable,
        hasOrderDate: crm.hasOrderDate,
        hasEnterDate: crm.hasEnterDate,
        hasBillNo: crm.hasBillNo,
        orderDateFormat: crm.orderDateFormat,
        enterDateFormat: crm.enterDateFormat
      }
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
            'GET  /api/stats/yearly',
            'GET  /api/dashboard',
            'GET  /api/years',
            'GET  /api/search',
            'GET  /api/customers',
            'POST /api/customers',
            'GET  /api/customers/:id',
            'POST /api/orders',
            'GET  /api/orders/:id',
            'POST /api/orders/:id/bill'
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
      if (path === '/api/dashboard') {
        if (request.method !== 'GET') return json({ success: false, message: 'Only GET is allowed.' }, 405);
        return handleDashboard(request, env);
      }
      if (path === '/api/years') {
        if (request.method !== 'GET') return json({ success: false, message: 'Only GET is allowed.' }, 405);
        return handleCrmYears(request, env);
      }
      if (path === '/api/search') {
        if (request.method !== 'GET') return json({ success: false, message: 'Only GET is allowed.' }, 405);
        return handleSearch(request, env);
      }
      if (path === '/api/customers') {
        if (request.method === 'GET') return handleListCustomers(request, env);
        if (request.method === 'POST') return handleAddCustomer(request, env);
        return json({ success: false, message: 'Only GET and POST are allowed.' }, 405);
      }

      const customerMatch = path.match(/^\/api\/customers\/([^/]+)$/);
      if (customerMatch) {
        if (request.method !== 'GET') return json({ success: false, message: 'Only GET is allowed.' }, 405);
        return handleCustomerProfile(request, env, decodeURIComponent(customerMatch[1]));
      }

      if (path === '/api/orders') {
        if (request.method !== 'POST') return json({ success: false, message: 'Only POST is allowed.' }, 405);
        return handleAddOrder(request, env);
      }

      const billMatch = path.match(/^\/api\/orders\/([^/]+)\/bill$/);
      if (billMatch) {
        if (request.method !== 'POST') return json({ success: false, message: 'Only POST is allowed.' }, 405);
        return handleGenerateBill(request, env, decodeURIComponent(billMatch[1]));
      }

      const orderMatch = path.match(/^\/api\/orders\/([^/]+)$/);
      if (orderMatch) {
        if (request.method !== 'GET') return json({ success: false, message: 'Only GET is allowed.' }, 405);
        return handleOrderDetail(request, env, decodeURIComponent(orderMatch[1]));
      }

      return json({ success: false, message: 'Not found.' }, 404);
    } catch (error) {
      // Never leak SQL or stack details to the browser.
      return json({ success: false, message: 'Server error. Please try again.' }, 500);
    }
  }
};
