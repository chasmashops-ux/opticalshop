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
 *   GET  /                  service info
 *   GET  /api/health        D1 connectivity check
 *   POST /api/login         authenticate against login_mst
 *   GET  /api/users         search users              (requires Bearer token)
 *   POST /api/users         add user                  (requires Bearer token)
 *   GET  /api/stats         login_mst totals          (requires Bearer token)
 *   GET  /api/stats/yearly  login_mst year-wise stats (requires Bearer token)
 *   GET  /api/dashboard     CRM dashboard (KPIs, charts, tables) (requires Bearer token)
 *   GET  /api/search        global search: customers/orders/frame types (requires Bearer token)
 *   POST /api/customers     add a customer to user_details        (requires Bearer token)
 *   POST /api/orders        add an order to order_details         (requires Bearer token)
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

  crmSchemaCache = {
    hasCustomerTable,
    hasOrderTable,
    customerCols,
    orderCols,
    hasEnterDate,
    hasOrderDate,
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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Resolves a range token (today/7d/30d/month/year/custom) into a bounded, groupable window. */
function computeRange(range, fromParam, toParam) {
  const now = istNow();
  const today = isoDate(now);
  const KNOWN = ['today', '7d', '30d', 'month', 'year', 'custom'];
  const normalized = KNOWN.includes(range) ? range : '30d';

  if (normalized === 'today') return { range: normalized, start: today, end: today, groupBy: 'day' };
  if (normalized === '7d') return { range: normalized, start: isoDate(addDays(now, -6)), end: today, groupBy: 'day' };
  if (normalized === '30d') return { range: normalized, start: isoDate(addDays(now, -29)), end: today, groupBy: 'day' };
  if (normalized === 'month') {
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { range: normalized, start: isoDate(first), end: today, groupBy: 'day' };
  }
  if (normalized === 'year') {
    const first = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return { range: normalized, start: isoDate(first), end: today, groupBy: 'month' };
  }

  // custom
  const fallbackStart = isoDate(addDays(now, -29));
  let start = ISO_DATE_RE.test(fromParam || '') ? fromParam : fallbackStart;
  let end = ISO_DATE_RE.test(toParam || '') ? toParam : today;
  if (start > end) [start, end] = [end, start];
  const spanDays = Math.round((new Date(end) - new Date(start)) / 86400000);
  return { range: normalized, start, end, groupBy: spanDays > 62 ? 'month' : 'day' };
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
 * GET /api/dashboard?range=today|7d|30d|month|year|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * One D1 batch round trip for every KPI/chart/table the dashboard needs.
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

  const OD = schema.hasOrderDate ? dateExpr('orderdate', schema.orderDateFormat) : null;
  const O_OD = schema.hasOrderDate ? dateExpr('o.orderdate', schema.orderDateFormat) : null;
  const ED = schema.hasEnterDate ? dateExpr('enterdate', schema.enterDateFormat) : null;

  const now = istNow();
  const today = isoDate(now);
  const yesterday = isoDate(addDays(now, -1));
  const monthPrefix = today.slice(0, 7);
  const yearPrefix = today.slice(0, 4);

  const stmts = [];
  const at = {};
  const add = (key, sql, params = []) => {
    at[key] = stmts.length;
    stmts.push(env.DB.prepare(sql).bind(...params));
  };

  add('totalCustomers', `SELECT COUNT(*) AS c FROM ${CUSTOMER_TABLE}`);
  add('totalOrders', `SELECT COUNT(*) AS c FROM ${ORDER_TABLE}`);
  add('totalSales', `SELECT COALESCE(SUM(amount),0) AS s FROM ${ORDER_TABLE}`);
  add(
    'category',
    `SELECT COALESCE(SUM(frameprice),0) AS frame, COALESCE(SUM(glassprice),0) AS glass,
            COALESCE(SUM(lensprice),0) AS lens, COALESCE(SUM(sunglassprice),0) AS sunglass,
            COALESCE(SUM(repairprice),0) AS repair
     FROM ${ORDER_TABLE}`
  );
  add(
    'productAnalytics',
    `SELECT COALESCE(NULLIF(TRIM(product),''),'Unspecified') AS product, COUNT(*) AS c, COALESCE(SUM(amount),0) AS s
     FROM ${ORDER_TABLE} GROUP BY product ORDER BY c DESC LIMIT 12`
  );
  add(
    'frameAnalytics',
    `SELECT COALESCE(NULLIF(TRIM(frametype),''),'Unspecified') AS frametype, COUNT(*) AS c, COALESCE(SUM(frameprice),0) AS s
     FROM ${ORDER_TABLE} GROUP BY frametype ORDER BY c DESC LIMIT 10`
  );
  add(
    'topCustomers',
    `SELECT u.userid, u.name, u.mobile, COUNT(o.orderid) AS total_orders, COALESCE(SUM(o.amount),0) AS total_spending,
            MAX(${schema.hasOrderDate ? O_OD : 'NULL'}) AS last_order_date
     FROM ${CUSTOMER_TABLE} u
     LEFT JOIN ${ORDER_TABLE} o ON u.userid = o.userid
     GROUP BY u.userid, u.name, u.mobile
     ORDER BY total_spending DESC
     LIMIT 10`
  );
  add(
    'recentOrders',
    `SELECT o.orderid, o.billno, u.name AS customer_name, u.mobile AS customer_mobile, o.orderdate, o.product,
            o.frametype, o.descriptionframe, o.descriptionglass, o.amount
     FROM ${ORDER_TABLE} o
     LEFT JOIN ${CUSTOMER_TABLE} u ON o.userid = u.userid
     ORDER BY ${schema.hasOrderDate ? O_OD : 'o.orderid'} DESC, o.orderid DESC
     LIMIT 10`
  );
  add('custWithOrders', `SELECT COUNT(DISTINCT userid) AS c FROM ${ORDER_TABLE} WHERE userid IS NOT NULL`);

  if (schema.hasOrderDate) {
    add('today', `SELECT COUNT(*) AS c, COALESCE(SUM(amount),0) AS s FROM ${ORDER_TABLE} WHERE ${OD} = ?`, [today]);
    add('yesterday', `SELECT COUNT(*) AS c, COALESCE(SUM(amount),0) AS s FROM ${ORDER_TABLE} WHERE ${OD} = ?`, [
      yesterday
    ]);
    add(
      'month',
      `SELECT COUNT(*) AS c, COALESCE(SUM(amount),0) AS s FROM ${ORDER_TABLE} WHERE substr(${OD},1,7) = ?`,
      [monthPrefix]
    );
    add('year', `SELECT COALESCE(SUM(amount),0) AS s FROM ${ORDER_TABLE} WHERE substr(${OD},1,4) = ?`, [yearPrefix]);
    add(
      'monthly',
      `SELECT substr(${OD},6,2) AS m, COUNT(*) AS c, COALESCE(SUM(amount),0) AS s
       FROM ${ORDER_TABLE} WHERE substr(${OD},1,4) = ? GROUP BY m`,
      [yearPrefix]
    );
    const groupExpr = groupBy === 'month' ? `substr(${OD},1,7)` : OD;
    add(
      'overview',
      `SELECT ${groupExpr} AS d, COUNT(*) AS c, COALESCE(SUM(amount),0) AS s
       FROM ${ORDER_TABLE} WHERE ${OD} BETWEEN ? AND ? GROUP BY d ORDER BY d ASC`,
      [start, end]
    );
    add(
      'biggestOrderMonth',
      `SELECT o.orderid, o.billno, o.amount, o.orderdate, u.name AS customer_name
       FROM ${ORDER_TABLE} o LEFT JOIN ${CUSTOMER_TABLE} u ON o.userid = u.userid
       WHERE substr(${O_OD},1,7) = ?
       ORDER BY o.amount DESC LIMIT 1`,
      [monthPrefix]
    );
  }

  if (schema.hasEnterDate) {
    add('custNewToday', `SELECT COUNT(*) AS c FROM ${CUSTOMER_TABLE} WHERE ${ED} = ?`, [today]);
    add('custNewMonth', `SELECT COUNT(*) AS c FROM ${CUSTOMER_TABLE} WHERE substr(${ED},1,7) = ?`, [monthPrefix]);
    add('custNewYear', `SELECT COUNT(*) AS c FROM ${CUSTOMER_TABLE} WHERE substr(${ED},1,4) = ?`, [yearPrefix]);
    add(
      'recentCustomers',
      `SELECT userid, name, enterdate FROM ${CUSTOMER_TABLE} ORDER BY ${ED} DESC, userid DESC LIMIT 5`
    );
  } else {
    add('recentCustomers', `SELECT userid, name, NULL AS enterdate FROM ${CUSTOMER_TABLE} ORDER BY userid DESC LIMIT 5`);
  }

  let results;
  try {
    results = await env.DB.batch(stmts);
  } catch (error) {
    return json({ success: false, message: 'Could not read dashboard data from the database.' }, 500);
  }

  const row = (key) => firstRow(results[at[key]]);
  const rows = (key) => rowsOf(results[at[key]]);

  const totalOrders = toNumber(row('totalOrders').c);
  const totalSales = toNumber(row('totalSales').s);
  const monthRow = schema.hasOrderDate ? row('month') : {};
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

  const totalCustomers = toNumber(row('totalCustomers').c);
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
      text: `New order${o.billNo ? ` · Bill #${o.billNo}` : ''} for ${o.customerName} — ₹${o.amount.toLocaleString(
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
      orderDateFormat: schema.orderDateFormat,
      enterDateFormat: schema.enterDateFormat
    },
    kpis: {
      totalCustomers,
      totalOrders,
      totalSales,
      averageOrderValue: totalOrders > 0 ? Math.round((totalSales / totalOrders) * 100) / 100 : 0,
      todayOrders,
      todaySales,
      monthOrders: toNumber(monthRow.c),
      monthSales: toNumber(monthRow.s),
      yearSales: schema.hasOrderDate ? toNumber(row('year').s) : 0
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
      totalCustomers,
      customersWithOrders,
      customersWithoutOrders: Math.max(0, totalCustomers - customersWithOrders)
    },
    recentActivity: activity.slice(0, 8)
  });
}

/**
 * GET /api/search?q=... — customers (name/mobile), orders (bill no/order id),
 * and frame types. Every branch is LIMITed; nothing loads the full tables.
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
  if (!/^\d{7,15}$/.test(mobile)) return json({ success: false, message: 'Enter a valid mobile number.' }, 400);

  const columns = ['name', 'mobile'];
  const values = [name, mobile];
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

  const amount = toNumber(payload.amount);
  if (amount <= 0) return json({ success: false, message: 'Enter a valid order amount.' }, 400);

  const priceField = (key) => (payload[key] === undefined || payload[key] === '' ? null : toNumber(payload[key]));
  const textField = (key) => {
    const v = payload[key];
    return v === undefined || v === null || v === '' ? null : String(v).trim();
  };

  const record = {
    userid: userId,
    billno: textField('billno'),
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
    { success: true, message: 'Order added successfully', order: { orderId: result.meta?.last_row_id ?? null, amount } },
    201
  );
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
            'GET  /api/search',
            'POST /api/customers',
            'POST /api/orders'
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
      if (path === '/api/search') {
        if (request.method !== 'GET') return json({ success: false, message: 'Only GET is allowed.' }, 405);
        return handleSearch(request, env);
      }
      if (path === '/api/customers') {
        if (request.method !== 'POST') return json({ success: false, message: 'Only POST is allowed.' }, 405);
        return handleAddCustomer(request, env);
      }
      if (path === '/api/orders') {
        if (request.method !== 'POST') return json({ success: false, message: 'Only POST is allowed.' }, 405);
        return handleAddOrder(request, env);
      }

      return json({ success: false, message: 'Not found.' }, 404);
    } catch (error) {
      // Never leak SQL or stack details to the browser.
      return json({ success: false, message: 'Server error. Please try again.' }, 500);
    }
  }
};
