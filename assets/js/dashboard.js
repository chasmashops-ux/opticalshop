/**
 * CRM dashboard controller for dashboard.html.
 *
 * All numbers come from GET /api/dashboard (env.DB — real D1 data, one
 * batched round trip). Nothing here is hardcoded or fabricated; sections
 * with no backing data show an empty state instead of a fake number.
 */
(function () {
  var AUTH = window.SHCG_AUTH;
  var CONFIG = window.SHCG_CONFIG;

  var charts = {};
  var state = { range: '30d', from: null, to: null, lastPayload: null };

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
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
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

  /* ---------------------------- greeting / sidebar / topbar ---------------------------- */

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

    var initial = (session.username || 'A').trim().charAt(0).toUpperCase();
    document.getElementById('profileAvatar').textContent = initial || 'A';
    document.getElementById('profileName').textContent = session.username || 'Admin';
    document.getElementById('profileRole').textContent = session.role || 'admin';
  }

  function initSidebar() {
    var sidebar = document.getElementById('crmSidebar');
    var backdrop = document.getElementById('crmBackdrop');
    var toggle = document.getElementById('sidebarToggle');
    var close = document.getElementById('sidebarClose');

    function open() {
      sidebar.classList.add('open');
      backdrop.classList.add('open');
    }
    function shut() {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
    }

    toggle.addEventListener('click', open);
    close.addEventListener('click', shut);
    backdrop.addEventListener('click', shut);

    document.querySelectorAll('.crm-nav-item[data-scroll]').forEach(function (item) {
      item.addEventListener('click', function () {
        var target = document.getElementById(item.dataset.scroll);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        shut();
        document.querySelectorAll('.crm-nav-item').forEach(function (n) {
          n.classList.remove('is-active');
        });
        item.classList.add('is-active');
      });
    });
  }

  /* ---------------------------- global search ---------------------------- */

  function initSearch() {
    var input = document.getElementById('globalSearch');
    var results = document.getElementById('searchResults');
    var timer = null;

    function render(data) {
      var parts = [];
      if (data.customers.length) {
        parts.push('<div class="crm-search-group-label">Customers</div>');
        data.customers.forEach(function (c) {
          parts.push(
            '<div class="crm-search-row"><span>' +
              escapeHtml(c.name || 'Unnamed') +
              '</span><span>' +
              escapeHtml(c.mobile || '—') +
              '</span></div>'
          );
        });
      }
      if (data.orders.length) {
        parts.push('<div class="crm-search-group-label">Orders</div>');
        data.orders.forEach(function (o) {
          parts.push(
            '<div class="crm-search-row"><span>Order #' +
              escapeHtml(o.orderId) +
              (o.billNo ? ' · Bill ' + escapeHtml(o.billNo) : '') +
              '</span><span>' +
              fmtMoney(o.amount) +
              '</span></div>'
          );
        });
      }
      if (data.frameTypes.length) {
        parts.push('<div class="crm-search-group-label">Frame Types</div>');
        data.frameTypes.forEach(function (f) {
          parts.push('<div class="crm-search-row"><span>' + escapeHtml(f) + '</span></div>');
        });
      }
      if (!parts.length) {
        parts.push('<div class="crm-search-empty">No matches for “' + escapeHtml(data.query) + '”.</div>');
      }
      results.innerHTML = parts.join('');
      results.classList.add('open');
    }

    input.addEventListener('input', function () {
      var q = input.value.trim();
      clearTimeout(timer);
      if (!q) {
        results.classList.remove('open');
        return;
      }
      timer = setTimeout(function () {
        AUTH.authFetch(CONFIG.endpoints.search + '?q=' + encodeURIComponent(q))
          .then(render)
          .catch(function () {
            results.innerHTML = '<div class="crm-search-empty">Search failed. Try again.</div>';
            results.classList.add('open');
          });
      }, 300);
    });

    document.addEventListener('click', function (e) {
      if (!results.contains(e.target) && e.target !== input) results.classList.remove('open');
    });
  }

  /* ---------------------------- notifications (real recent activity) ---------------------------- */

  function initNotifications() {
    var btn = document.getElementById('notifButton');
    var panel = document.getElementById('notifPanel');
    btn.addEventListener('click', function () {
      panel.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) panel.classList.remove('open');
    });
  }

  function renderNotifications(activity) {
    var panel = document.getElementById('notifPanel');
    var dot = document.getElementById('notifDot');
    if (!activity.length) {
      panel.innerHTML = '<div class="crm-notif-row">No recent activity yet.</div>';
      dot.style.display = 'none';
      return;
    }
    dot.style.display = 'block';
    panel.innerHTML = activity
      .map(function (a) {
        return (
          '<div class="crm-notif-row">' +
          escapeHtml(a.text) +
          '<span class="crm-notif-time">' +
          fmtDate(a.at) +
          '</span></div>'
        );
      })
      .join('');
  }

  /* ---------------------------- KPIs ---------------------------- */

  function renderKpis(kpis) {
    var map = {
      kpiTotalCustomers: fmtNumber(kpis.totalCustomers),
      kpiTotalOrders: fmtNumber(kpis.totalOrders),
      kpiTotalSales: fmtMoney(kpis.totalSales),
      kpiAvgOrder: fmtMoney(kpis.averageOrderValue),
      kpiTodayOrders: fmtNumber(kpis.todayOrders),
      kpiTodaySales: fmtMoney(kpis.todaySales),
      kpiMonthOrders: fmtNumber(kpis.monthOrders),
      kpiMonthSales: fmtMoney(kpis.monthSales),
      kpiYearSales: fmtMoney(kpis.yearSales)
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = map[id];
    });
  }

  /* ---------------------------- daily performance ---------------------------- */

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

  function renderSalesOverview(overview) {
    var labels = overview.points.map(function (p) {
      return overview.groupBy === 'month' ? p.date : fmtDate(p.date);
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

    var empty = document.getElementById('salesOverviewEmpty');
    empty.style.display = overview.points.length ? 'none' : 'block';
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
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });

    var grid = document.getElementById('categoryCards');
    grid.innerHTML = categorySales
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
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: false } }
      }
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
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } }
      }
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
          '<tr><td><strong>' +
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
          '<tr><td>#' +
          escapeHtml(o.orderId) +
          '</td><td>' +
          escapeHtml(o.billNo || '—') +
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

  function renderCustomerAnalytics(a) {
    document.getElementById('custNewToday').textContent = fmtNumber(a.newToday);
    document.getElementById('custNewMonth').textContent = fmtNumber(a.newThisMonth);
    document.getElementById('custNewYear').textContent = fmtNumber(a.newThisYear);
    document.getElementById('custWithOrders').textContent = fmtNumber(a.customersWithOrders);
    document.getElementById('custWithoutOrders').textContent = fmtNumber(a.customersWithoutOrders);
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

  /* ---------------------------- range filter ---------------------------- */

  function initRangeFilter(onChange) {
    var buttons = document.querySelectorAll('.range-filter button[data-range]');
    var custom = document.getElementById('rangeCustom');
    var applyBtn = document.getElementById('rangeCustomApply');
    var fromInput = document.getElementById('rangeFrom');
    var toInput = document.getElementById('rangeTo');

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        var range = btn.dataset.range;
        custom.classList.toggle('show', range === 'custom');
        if (range !== 'custom') onChange(range);
      });
    });

    applyBtn.addEventListener('click', function () {
      if (!fromInput.value || !toInput.value) return;
      onChange('custom', fromInput.value, toInput.value);
    });
  }

  /* ---------------------------- quick action modals ---------------------------- */

  function initModal(overlayId, openTriggerSelector, closeSelector) {
    var overlay = document.getElementById(overlayId);
    document.querySelectorAll(openTriggerSelector).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        overlay.classList.add('open');
      });
    });
    overlay.querySelectorAll(closeSelector).forEach(function (btn) {
      btn.addEventListener('click', function () {
        overlay.classList.remove('open');
      });
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('open');
    });
    return overlay;
  }

  function initAddCustomerModal(onSaved) {
    var overlay = initModal('addCustomerModal', '[data-open="add-customer"]', '[data-close]');
    var form = document.getElementById('addCustomerForm');
    var message = document.getElementById('addCustomerMessage');
    var button = document.getElementById('addCustomerSubmit');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('custName').value.trim();
      var mobile = document.getElementById('custMobile').value.trim();
      var address = document.getElementById('custAddress').value.trim();

      message.textContent = '';
      message.className = 'form-message';
      button.disabled = true;
      button.textContent = 'Saving...';

      AUTH.authFetch(CONFIG.endpoints.customers, {
        method: 'POST',
        body: JSON.stringify({ name: name, mobile: mobile, address: address })
      })
        .then(function (result) {
          message.textContent = result.message;
          message.className = 'form-message success';
          form.reset();
          onSaved();
          setTimeout(function () {
            overlay.classList.remove('open');
            message.textContent = '';
          }, 900);
        })
        .catch(function (err) {
          message.textContent = err.message;
          message.className = 'form-message error';
        })
        .finally(function () {
          button.disabled = false;
          button.textContent = 'Add Customer';
        });
    });
  }

  function initAddOrderModal(onSaved) {
    var overlay = initModal('addOrderModal', '[data-open="add-order"]', '[data-close]');
    var form = document.getElementById('addOrderForm');
    var message = document.getElementById('addOrderMessage');
    var button = document.getElementById('addOrderSubmit');
    var customerInput = document.getElementById('orderCustomerSearch');
    var customerIdInput = document.getElementById('orderCustomerId');
    var customerResults = document.getElementById('orderCustomerResults');
    var timer = null;

    customerInput.addEventListener('input', function () {
      customerIdInput.value = '';
      var q = customerInput.value.trim();
      clearTimeout(timer);
      if (!q) {
        customerResults.innerHTML = '';
        return;
      }
      timer = setTimeout(function () {
        AUTH.authFetch(CONFIG.endpoints.search + '?q=' + encodeURIComponent(q)).then(function (data) {
          if (!data.customers.length) {
            customerResults.innerHTML = '<div class="crm-search-empty">No customer found. Add them first.</div>';
            return;
          }
          customerResults.innerHTML = data.customers
            .map(function (c) {
              return (
                '<div class="crm-search-row" style="cursor:pointer" data-userid="' +
                escapeHtml(c.userId) +
                '" data-name="' +
                escapeHtml(c.name) +
                '"><span>' +
                escapeHtml(c.name) +
                '</span><span>' +
                escapeHtml(c.mobile || '') +
                '</span></div>'
              );
            })
            .join('');
        });
      }, 300);
    });

    customerResults.addEventListener('click', function (e) {
      var row = e.target.closest('[data-userid]');
      if (!row) return;
      customerIdInput.value = row.dataset.userid;
      customerInput.value = row.dataset.name;
      customerResults.innerHTML = '';
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!customerIdInput.value) {
        message.textContent = 'Search and select a customer first.';
        message.className = 'form-message error';
        return;
      }

      var payload = {
        userid: customerIdInput.value,
        amount: document.getElementById('orderAmount').value,
        product: document.getElementById('orderProduct').value.trim(),
        frametype: document.getElementById('orderFrameType').value.trim(),
        billno: document.getElementById('orderBillNo').value.trim(),
        frameprice: document.getElementById('orderFramePrice').value,
        glassprice: document.getElementById('orderGlassPrice').value,
        lensprice: document.getElementById('orderLensPrice').value,
        sunglassprice: document.getElementById('orderSunglassPrice').value,
        repairprice: document.getElementById('orderRepairPrice').value
      };

      message.textContent = '';
      message.className = 'form-message';
      button.disabled = true;
      button.textContent = 'Saving...';

      AUTH.authFetch(CONFIG.endpoints.orders, { method: 'POST', body: JSON.stringify(payload) })
        .then(function (result) {
          message.textContent = result.message;
          message.className = 'form-message success';
          form.reset();
          customerIdInput.value = '';
          onSaved();
          setTimeout(function () {
            overlay.classList.remove('open');
            message.textContent = '';
          }, 900);
        })
        .catch(function (err) {
          message.textContent = err.message;
          message.className = 'form-message error';
        })
        .finally(function () {
          button.disabled = false;
          button.textContent = 'Add Order';
        });
    });
  }

  /* ---------------------------- load + render ---------------------------- */

  function load() {
    setSkeleton(true);
    showError(null);

    var params = new URLSearchParams({ range: state.range });
    if (state.range === 'custom' && state.from && state.to) {
      params.set('from', state.from);
      params.set('to', state.to);
    }

    return AUTH.authFetch(CONFIG.endpoints.dashboard + '?' + params.toString())
      .then(function (data) {
        state.lastPayload = data;
        renderKpis(data.kpis);
        renderPerformance(data.dailyPerformance);
        renderSalesOverview(data.salesOverview);
        renderCategoryChart(data.categorySales);
        renderMonthlyChart(data.monthlySales);
        renderProductChart(data.productAnalytics);
        renderTopCustomers(data.topCustomers);
        renderRecentOrders(data.recentOrders);
        renderFrameAnalytics(data.frameAnalytics);
        renderCustomerAnalytics(data.customerAnalytics);
        renderActivity(data.recentActivity);
        renderNotifications(data.recentActivity);
      })
      .catch(function (err) {
        showError(err.message || 'Could not load the dashboard.');
      })
      .finally(function () {
        setSkeleton(false);
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var session = AUTH.requireAuth();
    if (!session) return;

    document.documentElement.classList.remove('auth-pending');
    AUTH.bindLogoutControls();
    renderGreeting(session);
    initSidebar();
    initSearch();
    initNotifications();
    initRangeFilter(function (range, from, to) {
      state.range = range;
      state.from = from || null;
      state.to = to || null;
      load();
    });
    initAddCustomerModal(load);
    initAddOrderModal(load);

    load();
  });
})();
