/**
 * CRM Overall Dashboard controller for dashboard.html.
 *
 * All numbers come from GET /api/dashboard (env.DB — real D1 data, one
 * batched round trip). Nothing here is hardcoded or fabricated; sections
 * with no backing data show an empty state instead of a fake number.
 */
(function () {
  var AUTH = window.SHCG_AUTH;
  var CONFIG = window.SHCG_CONFIG;

  var charts = {};
  var state = { range: 'month' };
  var salesRevealed = false;
  var lastTotalSales = 0;

  function fmtMoney(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  function fmtNumber(n) {
    return Number(n || 0).toLocaleString('en-IN');
  }

  function fmtDate(isoLike) {
    if (!isoLike) return '—';
    var m = String(isoLike).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(isoLike);
    var d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }

  function escapeHtml(value) {
    return window.SHCG_SHELL.escapeHtml(value);
  }

  function setSkeleton(on) {
    document.querySelectorAll('[data-skeleton]').forEach(function (el) {
      el.classList.toggle('skeleton', on);
    });
  }

  function showError(message) {
    var banner = document.getElementById('crmError');
    if (!banner) return;
    if (!message) {
      banner.classList.remove('show');
      banner.textContent = '';
      return;
    }
    banner.textContent = message;
    banner.classList.add('show');
  }

  function renderGreeting(session) {
    var hour = new Date().getHours();
    var greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    document.getElementById('greetingText').textContent = greeting + ', ' + (session.username || 'Admin');
    document.getElementById('greetingDate').textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  /* ---------------------------- privacy toggle ---------------------------- */

  function renderSalesPrivacy() {
    var text = document.getElementById('kpiTotalSalesText');
    var btn = document.getElementById('salesPrivacyToggle');
    if (salesRevealed) {
      text.textContent = fmtMoney(lastTotalSales);
      btn.setAttribute('aria-pressed', 'true');
      btn.setAttribute('aria-label', 'Hide total sales');
    } else {
      text.textContent = '₹ ******';
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', 'Show total sales');
    }
  }

  function initSalesPrivacy() {
    document.getElementById('salesPrivacyToggle').addEventListener('click', function () {
      salesRevealed = !salesRevealed;
      var wrap = document.getElementById('kpiTotalSales');
      wrap.classList.add('is-revealing');
      renderSalesPrivacy();
      setTimeout(function () {
        wrap.classList.remove('is-revealing');
      }, 260);
    });
  }

  /* ---------------------------- KPIs ---------------------------- */

  function renderKpis(kpis) {
    lastTotalSales = kpis.totalSales;
    renderSalesPrivacy();

    document.getElementById('kpiTotalCustomers').textContent = fmtNumber(kpis.totalCustomers);
    document.getElementById('kpiTotalCustomersSub').textContent =
      kpis.range === 'all' ? 'All registered customers' : 'Active in this period';
    document.getElementById('kpiTotalOrders').textContent = fmtNumber(kpis.totalOrders);
    document.getElementById('kpiAvgOrder').textContent = fmtMoney(kpis.averageOrderValue);
    document.getElementById('kpiMonthSales').textContent = fmtMoney(kpis.monthSales);

    var billedCard = document.getElementById('kpiBilledOrders').closest('.kpi-card');
    var noBillCard = document.getElementById('kpiNoBillOrders').closest('.kpi-card');
    if (kpis.billedOrders === null) {
      billedCard.style.display = 'none';
      noBillCard.style.display = 'none';
    } else {
      billedCard.style.display = '';
      noBillCard.style.display = '';
      document.getElementById('kpiBilledOrders').textContent = fmtNumber(kpis.billedOrders);
      document.getElementById('kpiNoBillOrders').textContent = fmtNumber(kpis.noBillOrders);
    }
    document.getElementById('kpiRepeatCustomers').textContent = fmtNumber(kpis.repeatCustomers);
    document.getElementById('kpiMaxOrder').textContent = kpis.maxOrderAmount === null ? '—' : fmtMoney(kpis.maxOrderAmount);
    document.getElementById('kpiMinOrder').textContent = kpis.minOrderAmount === null ? '—' : fmtMoney(kpis.minOrderAmount);
  }

  function growthBadge(pct) {
    if (pct > 0) return '<span class="growth-badge growth-up">▲ ' + pct + '%</span>';
    if (pct < 0) return '<span class="growth-badge growth-down">▼ ' + Math.abs(pct) + '%</span>';
    return '<span class="growth-badge growth-flat">— 0%</span>';
  }

  function renderPerformance(perf) {
    document.getElementById('perfTodaySales').textContent = fmtMoney(perf.todaySales);
    document.getElementById('perfYesterdaySales').textContent = fmtMoney(perf.yesterdaySales);
    document.getElementById('perfTodayOrders').textContent = fmtNumber(perf.todayOrders);
    document.getElementById('perfYesterdayOrders').textContent = fmtNumber(perf.yesterdayOrders);
    document.getElementById('perfSalesGrowth').innerHTML = growthBadge(perf.salesGrowthPct);
    document.getElementById('perfOrderGrowth').innerHTML = growthBadge(perf.orderGrowthPct);
  }

  /* ---------------------------- charts ---------------------------- */

  var PALETTE = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];

  function ensureChart(key, canvasId, config) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    if (charts[key]) charts[key].destroy();
    charts[key] = new Chart(canvas.getContext('2d'), config);
  }

  function overviewLabel(dateStr, groupBy) {
    if (groupBy === 'month') return dateStr;
    if (groupBy === 'week') return 'Wk of ' + fmtDate(dateStr);
    return fmtDate(dateStr);
  }

  function renderSalesOverview(overview) {
    var labels = overview.points.map(function (p) {
      return overviewLabel(p.date, overview.groupBy);
    });
    ensureChart('overview', 'salesOverviewChart', {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Sales (₹)',
            data: overview.points.map(function (p) {
              return p.sales;
            }),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37,99,235,0.1)',
            fill: true,
            tension: 0.35,
            yAxisID: 'y'
          },
          {
            label: 'Orders',
            data: overview.points.map(function (p) {
              return p.orders;
            }),
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22,163,74,0.08)',
            fill: false,
            tension: 0.35,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { position: 'left', beginAtZero: true, title: { display: true, text: 'Sales (₹)' } },
          y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Orders' } }
        }
      }
    });

    document.getElementById('salesOverviewEmpty').style.display = overview.points.length ? 'none' : 'block';
  }

  function renderCategoryChart(categorySales) {
    var hasData = categorySales.some(function (c) {
      return c.sales > 0;
    });
    document.getElementById('categoryEmpty').style.display = hasData ? 'none' : 'block';

    ensureChart('category', 'categoryChart', {
      type: 'doughnut',
      data: {
        labels: categorySales.map(function (c) {
          return c.category;
        }),
        datasets: [
          {
            data: categorySales.map(function (c) {
              return c.sales;
            }),
            backgroundColor: PALETTE,
            borderWidth: 0
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    document.getElementById('categoryCards').innerHTML = categorySales
      .map(function (c, i) {
        return (
          '<div class="category-pill"><span class="cat-name"><span class="dot" style="background:' +
          PALETTE[i % PALETTE.length] +
          '"></span>' +
          escapeHtml(c.category) +
          '</span><div class="cat-value">' +
          fmtMoney(c.sales) +
          '</div></div>'
        );
      })
      .join('');
  }

  function renderMonthlyChart(monthlySales) {
    ensureChart('monthly', 'monthlyChart', {
      type: 'bar',
      data: {
        labels: monthlySales.map(function (m) {
          return m.month;
        }),
        datasets: [
          {
            label: 'Sales (₹)',
            data: monthlySales.map(function (m) {
              return m.sales;
            }),
            backgroundColor: '#2563eb',
            borderRadius: 6
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
    });
  }

  function renderProductChart(productAnalytics) {
    var top = productAnalytics.slice(0, 8);
    document.getElementById('productEmpty').style.display = top.length ? 'none' : 'block';
    ensureChart('product', 'productChart', {
      type: 'bar',
      data: {
        labels: top.map(function (p) {
          return p.product;
        }),
        datasets: [
          {
            label: 'Orders',
            data: top.map(function (p) {
              return p.orders;
            }),
            backgroundColor: '#7c3aed',
            borderRadius: 6
          }
        ]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
    });
  }

  /* ---------------------------- tables ---------------------------- */

  function renderTopCustomers(customers) {
    var body = document.getElementById('topCustomersBody');
    if (!customers.length) {
      body.innerHTML = '<tr><td colspan="5" class="crm-empty">No data available</td></tr>';
      return;
    }
    body.innerHTML = customers
      .map(function (c) {
        return (
          '<tr class="row-link" data-href="/crm/customer.html?id=' +
          encodeURIComponent(c.userId) +
          '"><td><strong>' +
          escapeHtml(c.name) +
          '</strong></td><td>' +
          escapeHtml(c.mobile || '—') +
          '</td><td>' +
          fmtNumber(c.totalOrders) +
          '</td><td>' +
          fmtMoney(c.totalSpending) +
          '</td><td>' +
          fmtDate(c.lastOrderDate) +
          '</td></tr>'
        );
      })
      .join('');
    bindRowLinks(body);
  }

  function renderRecentOrders(orders) {
    var body = document.getElementById('recentOrdersBody');
    if (!orders.length) {
      body.innerHTML = '<tr><td colspan="7" class="crm-empty">No data available</td></tr>';
      return;
    }
    body.innerHTML = orders
      .map(function (o) {
        return (
          '<tr class="row-link" data-href="/crm/order.html?id=' +
          encodeURIComponent(o.orderId) +
          '"><td>#' +
          escapeHtml(o.orderId) +
          '</td><td>' +
          (o.billNo ? escapeHtml(o.billNo) : '<span class="badge-nobill">No Bill</span>') +
          '</td><td><strong>' +
          escapeHtml(o.customerName) +
          '</strong></td><td>' +
          fmtDate(o.orderDate) +
          '</td><td>' +
          escapeHtml(o.product || '—') +
          '</td><td>' +
          escapeHtml(o.frameType || '—') +
          '</td><td>' +
          fmtMoney(o.amount) +
          '</td></tr>'
        );
      })
      .join('');
    bindRowLinks(body);
  }

  function bindRowLinks(container) {
    container.querySelectorAll('.row-link').forEach(function (row) {
      row.addEventListener('click', function () {
        window.location.href = row.dataset.href;
      });
    });
  }

  function renderFrameAnalytics(frames) {
    var body = document.getElementById('frameAnalyticsBody');
    if (!frames.length) {
      body.innerHTML = '<tr><td colspan="3" class="crm-empty">No data available</td></tr>';
      return;
    }
    body.innerHTML = frames
      .map(function (f) {
        return (
          '<tr><td><strong>' +
          escapeHtml(f.frameType) +
          '</strong></td><td>' +
          fmtNumber(f.orders) +
          '</td><td>' +
          fmtMoney(f.sales) +
          '</td></tr>'
        );
      })
      .join('');
  }

  function renderActivity(activity) {
    var el = document.getElementById('activityTimeline');
    if (!activity.length) {
      el.innerHTML = '<div class="crm-empty">No data available</div>';
      return;
    }
    el.innerHTML = activity
      .map(function (a) {
        return (
          '<div class="timeline-item"><span class="timeline-dot"></span><div><div class="timeline-text">' +
          escapeHtml(a.text) +
          '</div><div class="timeline-time">' +
          fmtDate(a.at) +
          '</div></div></div>'
        );
      })
      .join('');
  }

  /* ---------------------------- period filter ---------------------------- */

  function initPeriodFilter(onChange) {
    var buttons = document.querySelectorAll('#periodFilter button[data-range]');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        onChange(btn.dataset.range);
      });
    });
  }

  /* ---------------------------- load + render ---------------------------- */

  function load() {
    setSkeleton(true);
    showError(null);

    return AUTH.authFetch(CONFIG.endpoints.dashboard + '?range=' + encodeURIComponent(state.range))
      .then(function (data) {
        renderKpis(data.kpis);
        renderPerformance(data.dailyPerformance);
        renderSalesOverview(data.salesOverview);
        renderCategoryChart(data.categorySales);
        renderMonthlyChart(data.monthlySales);
        renderProductChart(data.productAnalytics);
        renderTopCustomers(data.topCustomers);
        renderRecentOrders(data.recentOrders);
        renderFrameAnalytics(data.frameAnalytics);
        renderActivity(data.recentActivity);
        window.SHCG_SHELL.renderNotifications(data.recentActivity);
      })
      .catch(function (err) {
        showError(err.message || 'Could not load the dashboard.');
      })
      .finally(function () {
        setSkeleton(false);
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var session = window.SHCG_SHELL.init('dashboard');
    if (!session) return;

    var content = document.getElementById('pageContent');
    document.getElementById('crmPageContent').appendChild(content);
    content.hidden = false;

    // The target of a #hash link (e.g. from another page's "Orders" nav
    // item) starts out hidden inside #pageContent, so the browser's
    // automatic on-load scroll can't find it in time — do it ourselves.
    if (window.location.hash) {
      var target = document.querySelector(window.location.hash);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    renderGreeting(session);
    initSalesPrivacy();
    initPeriodFilter(function (range) {
      state.range = range;
      load();
    });

    load();
  });
})();
