/**
 * Customer Profile controller (crm/customer.html?id=NN).
 * GET /api/customers/:id — profile summary + the customer's COMPLETE
 * order history (userid is 1-to-many, never limited to one order).
 */
(function () {
  var AUTH = window.SHCG_AUTH;
  var CONFIG = window.SHCG_CONFIG;

  function fmtMoney(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
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

  document.addEventListener('DOMContentLoaded', function () {
    var session = window.SHCG_SHELL.init('search');
    if (!session) return;

    var content = document.getElementById('pageContent');
    document.getElementById('crmPageContent').appendChild(content);
    content.hidden = false;

    var userId = new URLSearchParams(window.location.search).get('id');
    var errorBanner = document.getElementById('crmError');

    if (!userId) {
      errorBanner.textContent = 'No customer selected.';
      errorBanner.classList.add('show');
      return;
    }

    AUTH.authFetch(CONFIG.customerPath(userId))
      .then(function (data) {
        document.querySelectorAll('[data-skeleton]').forEach(function (el) {
          el.classList.remove('skeleton');
        });

        var c = data.customer;
        document.getElementById('custAvatar').textContent = (c.name || '?').trim().charAt(0).toUpperCase();
        document.title = c.name + ' | Shree Hari Chasma Ghar';
        document.getElementById('custName').textContent = c.name;
        document.getElementById('custMeta').textContent =
          (c.mobile ? c.mobile : 'No mobile on file') +
          (c.address ? ' · ' + c.address : '') +
          (c.customerSince ? ' · Customer since ' + fmtDate(c.customerSince) : '');

        document.getElementById('statTotalOrders').textContent = data.stats.totalOrders;
        document.getElementById('statTotalPurchase').textContent = fmtMoney(data.stats.totalPurchase);
        document.getElementById('statLastOrder').textContent = fmtDate(data.stats.lastOrderDate);
        document.getElementById('statAvgOrder').textContent = fmtMoney(data.stats.averageOrderValue);

        var body = document.getElementById('ordersBody');
        if (!data.orders.length) {
          body.innerHTML = '<tr><td colspan="6" class="crm-empty">No orders yet for this customer.</td></tr>';
          return;
        }
        body.innerHTML = data.orders
          .map(function (o) {
            return (
              '<tr class="row-link" data-href="/crm/order.html?id=' +
              encodeURIComponent(o.orderId) +
              '"><td class="cell-title" data-label="Order">#' +
              escapeHtml(o.orderId) +
              '</td><td data-label="Bill No">' +
              (o.billNo ? escapeHtml(o.billNo) : '<span class="badge-nobill">No Bill</span>') +
              '</td><td data-label="Date">' +
              fmtDate(o.orderDate) +
              '</td><td data-label="Product">' +
              escapeHtml(o.product || '—') +
              '</td><td data-label="Frame">' +
              escapeHtml(o.frameType || '—') +
              '</td><td data-label="Amount">' +
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
      })
      .catch(function (err) {
        errorBanner.textContent = err.message;
        errorBanner.classList.add('show');
      });
  });
})();
