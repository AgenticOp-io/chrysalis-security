(async function () {
  const healthEl = document.getElementById('health');
  if (healthEl) {
    try {
      const r = await fetch('/api/health', { cache: 'no-store' });
      const j = await r.json();
      if (r.ok && j.ok) {
        healthEl.textContent = 'API healthy · ' + (j.service || 'ok');
        healthEl.classList.add('ok');
      } else {
        healthEl.textContent = 'API status ' + r.status;
      }
    } catch (e) {
      healthEl.textContent = 'API unreachable';
    }
  }

  const itemsEl = document.getElementById('items');
  if (itemsEl) {
    try {
      const r = await fetch('/api/items', { cache: 'no-store' });
      const j = await r.json();
      const items = Array.isArray(j.items) ? j.items : [];
      if (!items.length) {
        itemsEl.innerHTML = '<li class="muted">No items</li>';
        return;
      }
      itemsEl.innerHTML = items
        .map(
          (it) =>
            '<li><strong>#' +
            String(it.id) +
            '</strong> · ' +
            String(it.name || 'item') +
            '</li>',
        )
        .join('');
    } catch (e) {
      itemsEl.innerHTML = '<li class="muted">Failed to load /api/items</li>';
    }
  }
})();
