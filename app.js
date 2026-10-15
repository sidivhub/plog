\
(() => {
  'use strict';
  const STORAGE_KEY = 'my-records-pwa-v1';
  const THEME_KEY = 'my-records-theme-v1';
  const $ = id => document.getElementById(id);
  const els = {
    list: $('recordList'), empty: $('emptyState'), search: $('searchInput'),
    filter: $('filterSelect'), sort: $('sortSelect'), modal: $('recordModal'),
    dataModal: $('dataModal'), form: $('recordForm'), toast: $('toast')
  };
  let records = loadRecords();
  let toastTimer;
  let installPrompt = null;

  function loadRecords() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value.filter(x => x && typeof x.id === 'string' && typeof x.name === 'string') : [];
    } catch { return []; }
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (err) {
      showToast('Could not save. Your browser storage may be full.');
      return false;
    }
  }
  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function shortDate(value) {
    if (!value) return 'No date';
    const d = new Date(value + 'T12:00:00');
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, {day:'numeric',month:'short',year:'numeric'});
  }
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
  }
  function render() {
    const query = els.search.value.trim().toLowerCase();
    const filter = els.filter.value;
    const sort = els.sort.value;
    let visible = records.filter(r => {
      const matches = [r.name, r.category, r.description, r.status].some(v => String(v || '').toLowerCase().includes(query));
      return matches && (filter === 'all' || r.status === filter);
    });
    visible.sort((a,b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
      if (sort === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    $('totalCount').textContent = records.length;
    $('completedCount').textContent = records.filter(r => r.status === 'completed').length;
    $('activeCount').textContent = records.filter(r => r.status !== 'completed').length;
    $('visibleCount').textContent = visible.length;
    els.list.innerHTML = visible.map(r => {
      const initial = [...r.name.trim()][0]?.toUpperCase() || '•';
      const status = r.status === 'completed' ? 'completed' : 'active';
      const statusText = status === 'completed' ? 'Completed' : 'In progress';
      return `<article class="record-card" data-id="${escapeHTML(r.id)}">
        <div class="record-top"><div class="record-symbol">${escapeHTML(initial)}</div><div class="record-main">
          <h3 class="record-title">${escapeHTML(r.name)}</h3>
          <div class="record-meta">${r.category ? `<span class="record-category">${escapeHTML(r.category)}</span>` : ''}<span class="status ${status}">${statusText}</span></div>
        </div></div>
        ${r.description ? `<p class="record-description">${escapeHTML(r.description)}</p>` : ''}
        <div class="record-bottom"><span class="record-date">${escapeHTML(shortDate(r.date))}</span><div class="record-actions">
          <button class="mini-button" data-action="toggle" data-id="${escapeHTML(r.id)}" aria-label="${status === 'completed' ? 'Mark in progress' : 'Mark completed'}">${status === 'completed' ? '↶ Reopen' : '✓ Complete'}</button>
          <button class="mini-button" data-action="edit" data-id="${escapeHTML(r.id)}">Edit</button>
          <button class="mini-button delete" data-action="delete" data-id="${escapeHTML(r.id)}">Delete</button>
        </div></div></article>`;
    }).join('');
    els.empty.hidden = visible.length !== 0;
    els.list.hidden = visible.length === 0;
    if (records.length === 0) {
      $('emptyTitle').textContent = 'Your space is ready';
      $('emptyMessage').textContent = 'Add your first record to get started. Everything is saved on this device.';
      $('emptyAddButton').hidden = false;
    } else {
      $('emptyTitle').textContent = 'No matching records';
      $('emptyMessage').textContent = 'Try another search or filter, or create a new record.';
      $('emptyAddButton').hidden = false;
    }
  }
  function openModal(record = null) {
    els.form.reset();
    $('recordId').value = record?.id || '';
    $('recordName').value = record?.name || '';
    $('recordCategory').value = record?.category || '';
    $('recordStatus').value = record?.status || 'active';
    $('recordDate').value = record?.date || new Date().toISOString().slice(0,10);
    $('recordDescription').value = record?.description || '';
    $('modalTitle').textContent = record ? 'Edit record' : 'Add a record';
    $('modalEyebrow').textContent = record ? 'UPDATE ENTRY' : 'NEW ENTRY';
    $('saveButton').textContent = record ? 'Save changes' : 'Save record';
    els.modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('recordName').focus(), 60);
  }
  function closeModal(modal = els.modal) {
    modal.hidden = true;
    if (els.modal.hidden && els.dataModal.hidden) document.body.style.overflow = '';
  }
  function createId() {
    return globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  els.form.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('recordName').value.trim();
    if (!name) { $('recordName').focus(); return; }
    const id = $('recordId').value;
    const previous = records.find(r => r.id === id);
    const now = Date.now();
    const record = {
      id: id || createId(), name,
      category: $('recordCategory').value.trim(),
      status: $('recordStatus').value,
      date: $('recordDate').value,
      description: $('recordDescription').value.trim(),
      createdAt: previous?.createdAt || now,
      updatedAt: now
    };
    if (previous) records = records.map(r => r.id === id ? record : r);
    else records.unshift(record);
    if (persist()) {
      closeModal();
      render();
      showToast(previous ? 'Record updated' : 'Record saved');
    }
  });
  function handleRecordAction(action, id) {
    const record = records.find(r => r.id === id);
    if (!record) return;
    if (action === 'edit') openModal(record);
    if (action === 'delete') {
      if (!confirm(`Delete "${record.name}"? This cannot be undone unless you have a backup.`)) return;
      records = records.filter(r => r.id !== id);
      if (persist()) { render(); showToast('Record deleted'); }
    }
    if (action === 'toggle') {
      records = records.map(r => r.id === id ? {...r, status: r.status === 'completed' ? 'active' : 'completed', updatedAt: Date.now()} : r);
      if (persist()) { render(); showToast('Status updated'); }
    }
  }
  els.list.addEventListener('click', e => {
    const button = e.target.closest('button[data-action]');
    if (button) handleRecordAction(button.dataset.action, button.dataset.id);
  });
  ['input','change'].forEach(event => {
    els.search.addEventListener(event, render);
    els.filter.addEventListener(event, render);
    els.sort.addEventListener(event, render);
  });
  $('addButton').addEventListener('click', () => openModal());
  $('emptyAddButton').addEventListener('click', () => openModal());
  $('closeModal').addEventListener('click', () => closeModal());
  $('cancelModal').addEventListener('click', () => closeModal());
  els.modal.addEventListener('click', e => { if (e.target === els.modal) closeModal(); });
  $('dataMenuButton').addEventListener('click', () => { els.dataModal.hidden = false; document.body.style.overflow = 'hidden'; });
  $('closeDataModal').addEventListener('click', () => closeModal(els.dataModal));
  els.dataModal.addEventListener('click', e => { if (e.target === els.dataModal) closeModal(els.dataModal); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!els.modal.hidden) closeModal(); if (!els.dataModal.hidden) closeModal(els.dataModal); } });

  $('exportButton').addEventListener('click', () => {
    const payload = {app: 'My Records PWA', version: 1, exportedAt: new Date().toISOString(), records};
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `my-records-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast('Backup exported');
  });
  $('importInput').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const incoming = Array.isArray(parsed) ? parsed : parsed.records;
      if (!Array.isArray(incoming) || incoming.some(r => !r || typeof r.name !== 'string')) throw new Error('Invalid backup');
      if (!confirm(`Import ${incoming.length} records? Imported records will be added to your existing records.`)) { e.target.value = ''; return; }
      const existingIds = new Set(records.map(r => r.id));
      const imported = incoming.map(r => ({
        id: typeof r.id === 'string' && !existingIds.has(r.id) ? r.id : createId(),
        name: String(r.name).slice(0,100),
        category: String(r.category || '').slice(0,40),
        status: r.status === 'completed' ? 'completed' : 'active',
        date: /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') ? r.date : '',
        description: String(r.description || '').slice(0,5000),
        createdAt: Number(r.createdAt) || Date.now(),
        updatedAt: Number(r.updatedAt) || Date.now()
      }));
      records = [...imported, ...records];
      if (persist()) { render(); closeModal(els.dataModal); showToast(`${imported.length} records imported`); }
    } catch { alert('This file does not look like a valid My Records backup.'); }
    e.target.value = '';
  });
  $('clearButton').addEventListener('click', () => {
    if (!records.length) { showToast('There are no records to delete'); return; }
    if (!confirm(`Delete all ${records.length} records from this device? Export a backup first if you may need them.`)) return;
    records = [];
    if (persist()) { render(); closeModal(els.dataModal); showToast('All records deleted'); }
  });

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $('themeToggle').innerHTML = theme === 'dark'
      ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"/></svg>';
    $('themeToggle').setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }
  let savedTheme = 'light';
  try { savedTheme = localStorage.getItem(THEME_KEY) || 'light'; } catch {}
  applyTheme(savedTheme);
  $('themeToggle').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); installPrompt = e; $('installButton').hidden = false;
  });
  $('installButton').addEventListener('click', async () => {
    if (!installPrompt) { showToast('Use your browser menu and choose Install app or Add to Home screen.'); return; }
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    $('installButton').hidden = true;
  });
  window.addEventListener('appinstalled', () => { $('installButton').hidden = true; showToast('App installed'); });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
  render();
})();
