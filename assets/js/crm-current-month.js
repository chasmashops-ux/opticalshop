/**
 * Current Month controller (crm/current-month.html).
 *
 * A thin, separate report from the Overall Dashboard: reuses
 * GET /api/dashboard?range=month, which is ALREADY scoped strictly to
 * "1st of this month through today" for every KPI/chart/table it returns
 * (see computeRange('month') in the Worker) — nothing from previous
 * months is mixed in here.
 */
(function () {
  var AUTH = window.SHCG_AUTH;
  var CONFIG = window.SHCG_CONFIG;
  var chart = null;

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
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  }

  function escapeHtml(v) {
    return window.SHCG_SHELL.escapeHtml(v);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var session = window.SHCG_SHELL.init('current-month');
    if (!session) return;

    var content = document.getElementById('pageContent');
    document.getElementById('crmPageContent').appendChild(content);
    content.hidden = false;

    document.getElementById('monthTitle').textContent =
      'Current Month — ' + new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    var errorBanner = document.getElementById('crmError');

    AUTH.authFetch(CONFIG.endpoints.dashboard + '?range=month')
      .then(function (data) {
        document.querySelectorAll('[data-skeleton]').forEach(function (el) {
          el.classList.remove('skeleton');
        });

        document.getElementById('mNewCustomers').textContent = fmtNumber(data.customerAnalytics.newThisMonth);
        document.getElementById('mTotalOrders').textContent = fmtNumber(data.kpis.totalOrders);
        document.getElementById('mTotalSales').textContent = fmtMoney(data.kpis.totalSales);
        document.getElementById('mAvgOrder').textContent = fmtMoney(data.kpis.averageOrderValue);
        document.getElementById('mBilled').textContent = data.kpis.billedOrders === null ? '—' : fmtNumber(data.kpis.billedOrders);
        document.getElementById('mNoBill').textContent = data.kpis.noBillOrders === null ? '—' : fmtNumber(data.kpis.noBillOrders);
        document.getElementById('mRepeat').textContent = fmtNumber(data.kpis.repeatCustomers);
        document.getElementById('mActiveCustomers').textContent = fmtNumber(data.kpis.totalCustomers);

        var points = data.salesOverview.points;
        document.getElementById('dailyEmpty').style.display = points.length ? 'none' : 'block';
        var canvas = document.getElementById('dailyChart');
        if (canvas && typeof Chart !== 'undefined') {
          if (chart) chart.destroy();
          chart = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
              labels: points.map(function (p) {
                return fmtDate(p.date);
              }),
              datasets: [
                {
                  type: 'line',
                  label: 'Sales (₹)',
                  data: points.map(function (p) {
                    return p.sales;
                  }),
                  borderColor: '#2563eb',
                  backgroundColor: 'rgba(37,99,235,0.1)',
                  fill: true,
                  tension: 0.3,
                  yAxisID: 'y'
                },
                {
                  type: 'bar',
                  label: 'Orders',
                  data: points.map(function (p) {
                    return p.orders;
                  }),
                  backgroundColor: '#a7f3d0',
                  yAxisID: 'y1'
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { position: 'left', beginAtZero: true, title: { display: true, text: 'Sales (₹)' } },
                y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Orders' } }
              }
            }
          });
        }

        var body = document.getElementById('recentOrdersBody');
        if (!data.recentOrders.length) {
          body.innerHTML = '<tr><td colspan="6" class="crm-empty">No orders yet this month.</td></tr>';
        } else {
          body.innerHTML = data.recentOrders
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
                fmtMoney(o.amount) +
                '</td></tr>'
              );
            })
            .join('');
          body.querySelectorAll('.row-link').forEach(function (row) {
            row.addEventListener('click', function () {
              window.location.href = row.dataset.href;
            });
          });
        }

        var productBody = document.getElementById('productBody');
        if (!data.productAnalytics.length) {
          productBody.innerHTML = '<tr><td colspan="3" class="crm-empty">No data available</td></tr>';
        } else {
          productBody.innerHTML = data.productAnalytics
            .map(function (p) {
              return (
                '<tr><td><strong>' +
                escapeHtml(p.product) +
                '</strong></td><td>' +
                fmtNumber(p.orders) +
                '</td><td>' +
                fmtMoney(p.sales) +
                '</td></tr>'
              );
            })
            .join('');
        }
      })
      .catch(function (err) {
        errorBanner.textContent = err.message;
        errorBanner.classList.add('show');
        document.querySelectorAll('[data-skeleton]').forEach(function (el) {
          el.classList.remove('skeleton');
        });
      });
  });
})();
