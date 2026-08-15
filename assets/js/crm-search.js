/**
 * Search Customers page controller (crm/search.html).
 * GET /api/customers?q=&page=&limit= — with no query, shows the most
 * recent customers; typing a bill number or order ID also matches.
 */
(function () {
  var AUTH = window.SHCG_AUTH;
  var CONFIG = window.SHCG_CONFIG;
  var LIMIT = 15;
  var state = { query: '', page: 1, total: 0 };
  var isLoading = false;

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

    var form = document.getElementById('searchForm');
    var input = document.getElementById('searchInput');
    var searchButton = document.getElementById('searchButton');
    var resetButton = document.getElementById('resetButton');
    var prevButton = document.getElementById('prevButton');
    var nextButton = document.getElementById('nextButton');
    var pageInfo = document.getElementById('pageInfo');
    var body = document.getElementById('customerBody');
    var message = document.getElementById('pageMessage');

    function setMessage(text, type) {
      message.textContent = text || '';
      message.className = 'form-message' + (type ? ' ' + type : '');
    }

    function load() {
      if (isLoading) return;
      isLoading = true;
      searchButton.disabled = true;
      setMessage('Loading...', 'info');

      var params = new URLSearchParams({ q: state.query, page: state.page, limit: LIMIT });
      AUTH.authFetch(CONFIG.endpoints.customers + '?' + params.toString())
        .then(function (data) {
          state.total = data.total;

          if (!data.customers.length) {
            body.innerHTML =
              '<tr><td colspan="6" class="crm-empty">' +
              (state.query ? 'No match for “' + escapeHtml(state.query) + '”.' : 'No customers yet.') +
              '</td></tr>';
          } else {
            body.innerHTML = data.customers
              .map(function (c) {
                return (
                  '<tr class="row-link" data-href="/crm/customer.html?id=' +
                  encodeURIComponent(c.userId) +
                  '"><td><strong>' +
                  escapeHtml(c.name) +
                  '</strong></td><td>' +
                  escapeHtml(c.mobile || '—') +
                  '</td><td>' +
                  c.totalOrders +
                  '</td><td>' +
                  fmtMoney(c.totalSpending) +
                  '</td><td>' +
                  fmtDate(c.lastOrderDate) +
                  '</td><td>' +
                  fmtDate(c.customerSince) +
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

          var totalPages = Math.max(1, Math.ceil(state.total / LIMIT));
          pageInfo.textContent = 'Page ' + state.page + ' of ' + totalPages + ' · ' + state.total + ' customer(s)';
          prevButton.disabled = state.page <= 1;
          nextButton.disabled = state.page >= totalPages;
          setMessage('');
        })
        .catch(function (err) {
          setMessage(err.message, 'error');
          body.innerHTML = '<tr><td colspan="6" class="crm-empty">Could not load customers.</td></tr>';
        })
        .finally(function () {
          isLoading = false;
          searchButton.disabled = false;
        });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      state.query = input.value.trim();
      state.page = 1;
      load();
    });

    resetButton.addEventListener('click', function () {
      input.value = '';
      state.query = '';
      state.page = 1;
      load();
    });

    prevButton.addEventListener('click', function () {
      if (state.page > 1) {
        state.page -= 1;
        load();
      }
    });

    nextButton.addEventListener('click', function () {
      state.page += 1;
      load();
    });

    initAddCustomerModal(load);

    load();
  });

  /** "+ New Customer" modal — reused wherever a customer needs adding on this page. */
  function initAddCustomerModal(onSaved) {
    var AUTH = window.SHCG_AUTH;
    var CONFIG = window.SHCG_CONFIG;
    var overlay = document.getElementById('addCustomerModal');

    document.getElementById('showAddCustomerBtn').addEventListener('click', function () {
      overlay.classList.add('open');
    });
    overlay.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        overlay.classList.remove('open');
      });
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('open');
    });

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
})();
