(/* Desk front door — hashed asset name for Helix static collapse */)
(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(el, text, ok) {
    if (!el) return;
    el.textContent = text;
    el.classList.remove('ok', 'bad');
    if (ok === true) el.classList.add('ok');
    if (ok === false) el.classList.add('bad');
  }

  async function getJson(path) {
    const res = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    return { res, body };
  }

  async function postJson(path, payload) {
    const res = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    const body = await res.json().catch(() => ({}));
    return { res, body };
  }

  async function bootHealth() {
    const el = $('health');
    if (!el) return;
    try {
      const { res, body } = await getJson('/api/health');
      if (res.ok && body.ok) setStatus(el, 'API ok · ' + (body.service || 'desk'), true);
      else setStatus(el, 'API unhealthy', false);
    } catch (err) {
      setStatus(el, 'API unreachable', false);
    }
  }

  async function bootCatalog() {
    const grid = $('catalogGrid');
    const status = $('catalogStatus');
    const sku = $('sku');
    if (!grid || !status) return;
    try {
      const { res, body } = await getJson('/api/catalog');
      if (!res.ok) {
        setStatus(status, 'Catalog failed', false);
        return;
      }
      const items = body.items || [];
      setStatus(status, items.length + ' SKU(s)', true);
      grid.innerHTML = items
        .map(
          (it) =>
            '<article class="card"><h2>' +
            escapeHtml(it.name) +
            '</h2><p>' +
            escapeHtml(it.sku) +
            '</p><p class="price">$' +
            Number(it.price) +
            '</p></article>',
        )
        .join('');
      if (sku) {
        sku.innerHTML = items
          .map((it) => '<option value="' + escapeHtml(it.sku) + '">' + escapeHtml(it.sku) + ' — ' + escapeHtml(it.name) + '</option>')
          .join('');
      }
    } catch {
      setStatus(status, 'Catalog unreachable', false);
    }
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function bootOrders() {
    const form = $('orderForm');
    const note = $('orderNote');
    if (!form) return;
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const sku = $('sku')?.value;
      const qty = Number($('qty')?.value || 0);
      try {
        const { res, body } = await postJson('/api/orders', { sku, qty });
        if (res.ok && body.ok) setStatus(note, 'Order #' + body.order.id + ' · ' + body.order.sku + ' × ' + body.order.qty, true);
        else setStatus(note, body.error || 'Order refused', false);
      } catch {
        setStatus(note, 'Order failed', false);
      }
    });
  }

  async function refreshMe() {
    const el = $('meStatus');
    if (!el) return;
    try {
      const { res, body } = await getJson('/api/me');
      if (res.ok && body.ok) setStatus(el, 'Signed in as ' + body.email + ' (' + body.role + ')', true);
      else setStatus(el, 'Not signed in', false);
    } catch {
      setStatus(el, 'Session check failed', false);
    }
  }

  async function bootAccount() {
    const form = $('loginForm');
    const logout = $('logoutBtn');
    if (!form) return;
    await refreshMe();
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const email = $('email')?.value;
      try {
        const { res, body } = await postJson('/api/session', { email });
        if (res.ok && body.ok) {
          setStatus($('meStatus'), 'Signed in as ' + body.email, true);
        } else {
          setStatus($('meStatus'), body.error || 'Sign-in refused', false);
        }
      } catch {
        setStatus($('meStatus'), 'Sign-in failed', false);
      }
    });
    if (logout) {
      logout.addEventListener('click', async () => {
        await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' });
        await refreshMe();
      });
    }
  }

  bootHealth();
  bootCatalog();
  bootOrders();
  bootAccount();
})();
