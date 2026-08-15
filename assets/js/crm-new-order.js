/**
 * New Order controller (crm/new-order.html).
 *
 * Step 1: pick an existing customer (search) or add a new one — POST
 * /api/customers if new. Step 2: enter the order, POST /api/orders.
 * Bill number is always optional; the amount auto-sums from the category
 * prices but stays directly editable, matching the existing add-order
 * business logic already in the Worker (POST /api/orders derives the
 * total from prices only when no explicit amount is sent).
 */
(function () {
  var AUTH = window.SHCG_AUTH;
  var CONFIG = window.SHCG_CONFIG;
  var selectedCustomer = null;

  function escapeHtml(v) {
    return window.SHCG_SHELL.escapeHtml(v);
  }

  /** Builds the same simple prescription table markup the Order Detail page understands. */
  function buildEyewearHtml() {
    var v = function (id) {
      return document.getElementById(id).value.trim();
    };
    var od = [v('odSph'), v('odCyl'), v('odAxis'), v('odDv'), v('odNv')];
    var os = [v('osSph'), v('osCyl'), v('osAxis'), v('osDv'), v('osNv')];
    if (od.every(function (x) { return !x; }) && os.every(function (x) { return !x; })) return null;

    function row(label, cells) {
      return '<tr><td>' + label + '</td><td>' + cells.map(escapeHtml).join('</td><td>') + '</td></tr>';
    }
    return (
      '<table class="prescription"><thead><tr><th>Eye</th><th>SPH</th><th>CYL</th><th>AXIS</th><th>DV</th><th>NV</th></tr></thead>' +
      '<tbody>' +
      row('RIGHT (OD)', od) +
      row('LEFT (OS)', os) +
      '</tbody></table>'
    );
  }

  function recalcAmount() {
    var sum = ['priceFrame', 'priceGlass', 'priceLens', 'priceSunglass', 'priceRepair'].reduce(function (total, id) {
      var v = parseFloat(document.getElementById(id).value);
      return total + (isNaN(v) ? 0 : v);
    }, 0);
    if (sum > 0) document.getElementById('orderAmount').value = sum;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var session = window.SHCG_SHELL.init('new-order');
    if (!session) return;

    var content = document.getElementById('pageContent');
    document.getElementById('crmPageContent').appendChild(content);
    content.hidden = false;

    var errorBanner = document.getElementById('crmError');
    var customerPicker = document.getElementById('customerPicker');
    var selectedCard = document.getElementById('selectedCustomerCard');
    var orderStep = document.getElementById('orderStep');
    var customerSearchInput = document.getElementById('customerSearchInput');
    var customerPickList = document.getElementById('customerPickList');
    var showAddCustomerBtn = document.getElementById('showAddCustomerBtn');
    var quickAddForm = document.getElementById('quickAddCustomerForm');
    var searchTimer = null;

    function selectCustomer(customer) {
      selectedCustomer = customer;
      document.getElementById('selectedCustomerName').textContent = customer.name;
      document.getElementById('selectedCustomerMeta').textContent = customer.mobile || 'No mobile on file';
      selectedCard.classList.add('show');
      customerPicker.style.display = 'none';
      quickAddForm.style.display = 'none';
      orderStep.style.opacity = '1';
      orderStep.style.pointerEvents = 'auto';
    }

    document.getElementById('changeCustomerBtn').addEventListener('click', function () {
      selectedCustomer = null;
      selectedCard.classList.remove('show');
      customerPicker.style.display = '';
      orderStep.style.opacity = '0.5';
      orderStep.style.pointerEvents = 'none';
    });

    customerSearchInput.addEventListener('input', function () {
      var q = customerSearchInput.value.trim();
      clearTimeout(searchTimer);
      if (!q) {
        customerPickList.innerHTML = '';
        return;
      }
      searchTimer = setTimeout(function () {
        AUTH.authFetch(CONFIG.endpoints.customers + '?q=' + encodeURIComponent(q) + '&limit=8').then(function (data) {
          if (!data.customers.length) {
            customerPickList.innerHTML = '<div class="crm-empty">No customer found. Use "+ New Customer" above.</div>';
            return;
          }
          customerPickList.innerHTML = data.customers
            .map(function (c) {
              return (
                '<div class="customer-pick-card" data-id="' +
                escapeHtml(c.userId) +
                '" data-name="' +
                escapeHtml(c.name) +
                '" data-mobile="' +
                escapeHtml(c.mobile || '') +
                '"><span>' +
                escapeHtml(c.name) +
                '</span><span>' +
                escapeHtml(c.mobile || '—') +
                '</span></div>'
              );
            })
            .join('');
        });
      }, 300);
    });

    customerPickList.addEventListener('click', function (e) {
      var card = e.target.closest('.customer-pick-card');
      if (!card) return;
      selectCustomer({ userId: card.dataset.id, name: card.dataset.name, mobile: card.dataset.mobile });
    });

    showAddCustomerBtn.addEventListener('click', function () {
      quickAddForm.style.display = quickAddForm.style.display === 'none' ? 'grid' : 'none';
    });

    quickAddForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('newCustName').value.trim();
      var mobile = document.getElementById('newCustMobile').value.trim();
      var address = document.getElementById('newCustAddress').value.trim();

      AUTH.authFetch(CONFIG.endpoints.customers, {
        method: 'POST',
        body: JSON.stringify({ name: name, mobile: mobile, address: address })
      })
        .then(function (result) {
          selectCustomer({ userId: result.customer.userId, name: result.customer.name, mobile: result.customer.mobile });
        })
        .catch(function (err) {
          errorBanner.textContent = err.message;
          errorBanner.classList.add('show');
        });
    });

    document.querySelectorAll('.price-input').forEach(function (input) {
      input.addEventListener('input', recalcAmount);
    });

    var orderForm = document.getElementById('orderForm');
    var orderMessage = document.getElementById('orderMessage');
    var orderSubmit = document.getElementById('orderSubmit');

    orderForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!selectedCustomer) return;

      var val = function (id) {
        return document.getElementById(id).value.trim();
      };
      var numOrNull = function (id) {
        var v = document.getElementById(id).value;
        return v === '' ? '' : v;
      };

      var payload = {
        userid: selectedCustomer.userId,
        billno: val('orderBillNo'),
        product: val('orderProduct'),
        frametype: val('orderFrameType'),
        framesize: val('orderFrameSize'),
        descriptionframe: val('orderDescFrame'),
        descriptionglass: val('orderDescGlass'),
        eyeweardetail: buildEyewearHtml() || '',
        frameprice: numOrNull('priceFrame'),
        glassprice: numOrNull('priceGlass'),
        lensprice: numOrNull('priceLens'),
        sunglassprice: numOrNull('priceSunglass'),
        repairprice: numOrNull('priceRepair'),
        amount: val('orderAmount')
      };

      orderSubmit.disabled = true;
      orderSubmit.textContent = 'Saving...';
      orderMessage.textContent = '';
      orderMessage.className = 'form-message';

      AUTH.authFetch(CONFIG.endpoints.orders, { method: 'POST', body: JSON.stringify(payload) })
        .then(function (result) {
          orderMessage.textContent = result.message + ' — redirecting...';
          orderMessage.className = 'form-message success';
          setTimeout(function () {
            window.location.href = '/crm/order.html?id=' + encodeURIComponent(result.order.orderId);
          }, 700);
        })
        .catch(function (err) {
          orderMessage.textContent = err.message;
          orderMessage.className = 'form-message error';
          orderSubmit.disabled = false;
          orderSubmit.textContent = 'Save Order';
        });
    });

    // If we arrived from a customer's profile, pre-select them and skip step 1.
    var presetId = new URLSearchParams(window.location.search).get('customerId');
    if (presetId) {
      AUTH.authFetch(CONFIG.customerPath(presetId))
        .then(function (data) {
          selectCustomer({ userId: data.customer.userId, name: data.customer.name, mobile: data.customer.mobile });
        })
        .catch(function () {
          /* fall back to normal search if the id is invalid */
        });
    }
  });
})();
