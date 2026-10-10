(/* Desk ops console — hashed asset for Helix static collapse */)
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

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
      if (res.ok && body.ok) setStatus(el, 'API ok · ' + (body.kind || body.service || 'desk'), true);
      else setStatus(el, 'API unhealthy', false);
    } catch {
      setStatus(el, 'API unreachable', false);
    }
  }

  async function bootSites() {
    const grid = $('sitesGrid');
    const status = $('sitesStatus');
    const site = $('site');
    if (!grid || !status) return;
    try {
      const { res, body } = await getJson('/api/sites');
      if (!res.ok) {
        setStatus(status, 'Sites failed', false);
        return;
      }
      const sites = body.sites || [];
      setStatus(status, sites.length + ' site(s)', true);
      grid.innerHTML = sites
        .map(
          (it) =>
            '<article class="card"><h2>' +
            escapeHtml(it.host) +
            '</h2><p>' +
            escapeHtml(it.role) +
            '</p><p class="price">' +
            escapeHtml(it.mode) +
            ' · ' +
            Number(it.routes) +
            ' routes</p></article>',
        )
        .join('');
      if (site) {
        site.innerHTML = sites
          .map(
            (it) =>
              '<option value="' +
              escapeHtml(it.host) +
              '">' +
              escapeHtml(it.host) +
              ' — ' +
              escapeHtml(it.mode) +
              '</option>',
          )
          .join('');
      }
    } catch {
      setStatus(status, 'Sites unreachable', false);
    }
  }

  async function bootTickets() {
    const form = $('ticketForm');
    const note = $('ticketNote');
    if (!form) return;
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const site = $('site')?.value;
      const severity = $('severity')?.value;
      const text = $('note')?.value;
      try {
        const { res, body } = await postJson('/api/tickets', { site, severity, note: text });
        if (res.ok && body.ok) {
          setStatus(
            note,
            'Ticket #' + body.ticket.id + ' · ' + body.ticket.site + ' · ' + body.ticket.severity,
            true,
          );
        } else setStatus(note, body.error || 'Ticket refused', false);
      } catch {
        setStatus(note, 'Ticket failed', false);
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
        if (res.ok && body.ok) setStatus($('meStatus'), 'Signed in as ' + body.email, true);
        else setStatus($('meStatus'), body.error || 'Sign-in refused', false);
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
  bootSites();
  bootTickets();
  bootAccount();
})();
