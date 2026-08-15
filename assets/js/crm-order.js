/**
 * Order Detail controller (crm/order.html?id=NN).
 *
 * eyewearDetail is rendered as raw stored HTML (not re-parsed into a fixed
 * template) — historical records may use a different table structure than
 * new ones, and the instruction is to preserve/render whatever is actually
 * stored, not reshape it. It is admin-authored data (entered by shop staff
 * via New Order's prescription form or an earlier import), not public
 * user input, which is the trust boundary that makes direct innerHTML safe
 * here.
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

  function set(id, text) {
    document.getElementById(id).textContent = text;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var session = window.SHCG_SHELL.init('search');
    if (!session) return;

    var content = document.getElementById('pageContent');
    document.getElementById('crmPageContent').appendChild(content);
    content.hidden = false;

    var orderId = new URLSearchParams(window.location.search).get('id');
    var errorBanner = document.getElementById('crmError');

    if (!orderId) {
      errorBanner.textContent = 'No order selected.';
      errorBanner.classList.add('show');
      return;
    }

    function renderOrder(order) {
      document.querySelectorAll('[data-skeleton]').forEach(function (el) {
        el.classList.remove('skeleton');
      });

      document.title = 'Order #' + order.orderId + ' | Shree Hari Chasma Ghar';
      set('orderTitle', 'Order #' + order.orderId);
      set('orderSub', fmtDate(order.orderDate) + (order.billNo ? ' · Bill ' + order.billNo : ' · No Bill'));
      document.getElementById('backToCustomer').href = '/crm/customer.html?id=' + encodeURIComponent(order.customer.userId);

      set('infoCustomerName', order.customer.name);
      set('infoCustomerMobile', order.customer.mobile || 'Not on file');
      set('infoCustomerAddress', order.customer.address || 'Not on file');

      set('infoOrderDate', fmtDate(order.orderDate));
      set('infoBillNo', order.billNo || 'Direct Order / No Bill Generated');
      set('infoProduct', order.product || '—');
      set('infoFrameType', order.frameType || '—');
      set('infoFrameSize', order.frameSize || '—');
      set('infoDescFrame', order.descriptionFrame || '—');
      set('infoDescGlass', order.descriptionGlass || '—');
      set('infoAmount', fmtMoney(order.amount));

      var rx = document.getElementById('prescriptionContainer');
      if (order.eyewearDetail && String(order.eyewearDetail).trim()) {
        rx.innerHTML = order.eyewearDetail;
        var note = document.createElement('p');
        note.className = 'stored-html-note';
        note.textContent = 'Prescription as recorded for this order.';
        rx.appendChild(note);
      } else {
        rx.innerHTML = '<div class="crm-empty">No prescription recorded for this order.</div>';
      }

      var priceFields = [
        ['Frame', order.framePrice],
        ['Glass', order.glassPrice],
        ['Lens', order.lensPrice],
        ['Sunglass', order.sunglassPrice],
        ['Repair', order.repairPrice]
      ].filter(function (pair) {
        return pair[1] !== null && pair[1] !== undefined;
      });

      var breakdown = document.getElementById('priceBreakdown');
      if (!priceFields.length) {
        breakdown.innerHTML = '<div class="crm-empty">No category price breakdown recorded for this order.</div>';
      } else {
        breakdown.innerHTML = priceFields
          .map(function (pair) {
            return (
              '<div class="price-item"><div class="price-label">' +
              pair[0] +
              '</div><div class="price-value">' +
              fmtMoney(pair[1]) +
              '</div></div>'
            );
          })
          .join('');
      }
    }

    AUTH.authFetch(CONFIG.orderPath(orderId))
      .then(function (data) {
        renderOrder(data.order);
      })
      .catch(function (err) {
        errorBanner.textContent = err.message;
        errorBanner.classList.add('show');
      });
  });
})();
