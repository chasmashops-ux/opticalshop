/**
 * Statistics controller (crm/statistics.html) — year-wise overview.
 *
 * The year buttons come from GET /api/years (distinct years actually
 * present in order_details). Selecting a year calls
 * /api/dashboard?range=custom&from=YYYY-01-01&to=YYYY-12-31 (or today,
 * for the current year) — the same endpoint the Overall Dashboard uses,
 * just bounded to a full calendar year instead of a rolling period.
 */
(function () {
  var AUTH = window.SHCG_AUTH;
  var CONFIG = window.SHCG_CONFIG;
  var charts = {};
  var salesRevealed = false;
  var lastTotalSales = 0;
  var PALETTE = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];

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
  function escapeHtml(v) {
    return window.SHCG_SHELL.escapeHtml(v);
  }
  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function setSkeleton(on) {
    document.querySelectorAll('[data-skeleton]').forEach(function (el) {
      el.classList.toggle('skeleton', on);
    });
  }

  function ensureChart(key, canvasId, config) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    if (charts[key]) charts[key].destroy();
    charts[key] = new Chart(canvas.getContext('2d'), config);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var session = window.SHCG_SHELL.init('statistics');
    if (!session) return;

    var content = document.getElementById('pageContent');
    document.getElementById('crmPageContent').appendChild(content);
    content.hidden = false;

    var errorBanner = document.getElementById('crmError');
    var yearFilter = document.getElementById('yearFilter');
    var currentYear = new Date().getFullYear();
    var selectedYear = currentYear;

    document.getElementById('sSalesPrivacyToggle').addEventListener('click', function () {
      salesRevealed = !salesRevealed;
      renderSalesPrivacy();
    });

    function renderSalesPrivacy() {
      var text = document.getElementById('sTotalSalesText');
      var btn = document.getElementById('sSalesPrivacyToggle');
      if (salesRevealed) {
        text.textContent = fmtMoney(lastTotalSales);
        btn.setAttribute('aria-pressed', 'true');
      } else {
        text.textContent = '₹ ******';
        btn.setAttribute('aria-pressed', 'false');
      }
    }

    function renderYearButtons(years) {
      yearFilter.innerHTML = years
        .map(function (y) {
          return '<button type="button" data-year="' + y + '"' + (y === selectedYear ? ' class="active"' : '') + '>' + y + '</button>';
        })
        .join('');
      yearFilter.querySelectorAll('button').forEach(function (btn) {
        btn.addEventListener('click', function () {
          selectedYear = Number(btn.dataset.year);
          yearFilter.querySelectorAll('button').forEach(function (b) {
            b.classList.remove('active');
          });
          btn.classList.add('active');
          loadYear(selectedYear);
        });
      });
    }

    function loadYear(year) {
      setSkeleton(true);
      errorBanner.classList.remove('show');

      var from = year + '-01-01';
      var to = year === currentYear ? todayIso() : year + '-12-31';
      var params = new URLSearchParams({ range: 'custom', from: from, to: to });

      AUTH.authFetch(CONFIG.endpoints.dashboard + '?' + params.toString())
        .then(function (data) {
          setSkeleton(false);

          lastTotalSales = data.kpis.totalSales;
          renderSalesPrivacy();

          document.getElementById('sTotalCustomers').textContent = fmtNumber(data.kpis.totalCustomers);
          document.getElementById('sTotalOrders').textContent = fmtNumber(data.kpis.totalOrders);
          document.getElementById('sAvgOrder').textContent = fmtMoney(data.kpis.averageOrderValue);
          document.getElementById('sBilled').textContent = data.kpis.billedOrders === null ? '—' : fmtNumber(data.kpis.billedOrders);
          document.getElementById('sNoBill').textContent = data.kpis.noBillOrders === null ? '—' : fmtNumber(data.kpis.noBillOrders);
          document.getElementById('sRepeat').textContent = fmtNumber(data.kpis.repeatCustomers);
          document.getElementById('sMaxOrder').textContent = data.kpis.maxOrderAmount === null ? '—' : fmtMoney(data.kpis.maxOrderAmount);
          document.getElementById('sMinOrder').textContent = data.kpis.minOrderAmount === null ? '—' : fmtMoney(data.kpis.minOrderAmount);

          document.getElementById('monthlyLabel').textContent = 'January through December, ' + year + '.';
          ensureChart('monthly', 'statMonthlyChart', {
            type: 'bar',
            data: {
              labels: data.monthlySales.map(function (m) {
                return m.month;
              }),
              datasets: [
                {
                  label: 'Sales (₹)',
                  data: data.monthlySales.map(function (m) {
                    return m.sales;
                  }),
                  backgroundColor: '#2563eb',
                  borderRadius: 6
                }
              ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
          });

          var hasCategoryData = data.categorySales.some(function (c) {
            return c.sales > 0;
          });
          document.getElementById('statCategoryEmpty').style.display = hasCategoryData ? 'none' : 'block';
          ensureChart('category', 'statCategoryChart', {
            type: 'doughnut',
            data: {
              labels: data.categorySales.map(function (c) {
                return c.category;
              }),
              datasets: [
                {
                  data: data.categorySales.map(function (c) {
                    return c.sales;
                  }),
                  backgroundColor: PALETTE,
                  borderWidth: 0
                }
              ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
          });
          document.getElementById('statCategoryCards').innerHTML = data.categorySales
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

          var topBody = document.getElementById('statTopCustomersBody');
          topBody.innerHTML = data.topCustomers.length
            ? data.topCustomers
                .map(function (c, i) {
                  return (
                    '<tr class="row-link" data-href="/crm/customer.html?id=' +
                    encodeURIComponent(c.userId) +
                    '"><td class="cell-badge" data-label="Sr No">' +
                    (i + 1) +
                    '</td><td class="cell-title" data-label="Customer"><strong class="customer-name">' +
                    escapeHtml(c.name) +
                    '</strong></td><td data-label="Mobile">' +
                    escapeHtml(c.mobile || '—') +
                    '</td><td data-label="Orders">' +
                    fmtNumber(c.totalOrders) +
                    '</td><td data-label="Total Spending">' +
                    fmtMoney(c.totalSpending) +
                    '</td><td data-label="Last Order">' +
                    fmtDate(c.lastOrderDate) +
                    '</td></tr>'
                  );
                })
                .join('')
            : '<tr><td colspan="6" class="crm-empty">No data available</td></tr>';
          bindRowLinks(topBody);

          document.getElementById('statProductEmpty').style.display = data.productAnalytics.length ? 'none' : 'block';
          ensureChart('statProduct', 'statProductChart', {
            type: 'bar',
            data: {
              labels: data.productAnalytics.map(function (p) {
                return p.product;
              }),
              datasets: [
                {
                  label: 'Orders',
                  data: data.productAnalytics.map(function (p) {
                    return p.orders;
                  }),
                  backgroundColor: '#7c3aed',
                  borderRadius: 6
                }
              ]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
          });
          document.getElementById('statProductBreakdown').innerHTML = data.productAnalytics
            .map(function (p, i) {
              return (
                '<div class="category-pill"><span class="cat-name"><span class="dot" style="background:' +
                PALETTE[i % PALETTE.length] +
                '"></span>' +
                escapeHtml(p.product) +
                '</span><div class="cat-value">' +
                fmtNumber(p.orders) +
                ' orders</div></div>'
              );
            })
            .join('');

          document.getElementById('statFrameEmpty').style.display = data.frameAnalytics.length ? 'none' : 'block';
          ensureChart('statFrame', 'statFrameChart', {
            type: 'bar',
            data: {
              labels: data.frameAnalytics.map(function (f) {
                return f.frameType;
              }),
              datasets: [
                {
                  label: 'Orders',
                  data: data.frameAnalytics.map(function (f) {
                    return f.orders;
                  }),
                  backgroundColor: '#0891b2',
                  borderRadius: 6
                }
              ]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
          });
          document.getElementById('statFrameBreakdown').innerHTML = data.frameAnalytics
            .map(function (f, i) {
              return (
                '<div class="category-pill"><span class="cat-name"><span class="dot" style="background:' +
                PALETTE[i % PALETTE.length] +
                '"></span>' +
                escapeHtml(f.frameType) +
                '</span><div class="cat-value">' +
                fmtNumber(f.orders) +
                ' orders</div></div>'
              );
            })
            .join('');
        })
        .catch(function (err) {
          setSkeleton(false);
          errorBanner.textContent = err.message || 'Could not load statistics.';
          errorBanner.classList.add('show');
        });
    }

    function bindRowLinks(container) {
      container.querySelectorAll('.row-link').forEach(function (row) {
        row.addEventListener('click', function () {
          window.location.href = row.dataset.href;
        });
      });
    }

    AUTH.authFetch(CONFIG.endpoints.years)
      .then(function (data) {
        var years = data.years && data.years.length ? data.years : [currentYear];
        selectedYear = years[0];
        renderYearButtons(years);
        loadYear(selectedYear);
      })
      .catch(function () {
        renderYearButtons([currentYear]);
        loadYear(currentYear);
      });
  });
})();
