(() => {
  'use strict';
  const STORAGE_KEY = 'my-tasks-pwa-v1';
  const THEME_KEY = 'my-tasks-theme-v1';
  const $ = id => document.getElementById(id);
  const els = { list: $('taskList'), empty: $('emptyState'), search: $('searchInput'), filter: $('filterSelect'), sort: $('sortSelect'), modal: $('taskModal'), dataModal: $('dataModal'), form: $('taskForm'), toast: $('toast') };
  let tasks = loadTasks();
  let toastTimer, installPrompt = null;

  function loadTasks() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data.filter(t => t && typeof t.id === 'string' && typeof t.title === 'string').map(normalizeTask) : [];
    } catch { return []; }
  }
  function normalizeTask(t) {
    return { id:String(t.id), title:String(t.title || '').slice(0,140), notes:String(t.notes || '').slice(0,3000), dueDate:/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate || '') ? t.dueDate : '', priority:['high','normal','low'].includes(t.priority) ? t.priority : 'normal', category:String(t.category || '').slice(0,40), status:t.status === 'completed' ? 'completed' : 'active', createdAt:Number(t.createdAt) || Date.now(), updatedAt:Number(t.updatedAt) || Date.now(), completedAt:Number(t.completedAt) || null };
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); return true; }
    catch { showToast('Could not save. Your browser storage may be full.'); return false; }
  }
  function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function localToday() {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function dateLabel(value) {
    if (!value) return '';
    const [y,m,d] = value.split('-').map(Number);
    const date = new Date(y,m-1,d,12);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined,{day:'numeric',month:'short'});
  }
  function dueInfo(t) {
    if (!t.dueDate) return {label:'', cls:''};
    const today = localToday();
    if (t.status !== 'completed' && t.dueDate < today) return {label:`Overdue · ${dateLabel(t.dueDate)}`,cls:'overdue'};
    if (t.dueDate === today) return {label:'Due today',cls:'today'};
    return {label:`Due ${dateLabel(t.dueDate)}`,cls:''};
  }
  function showToast(message) {
    els.toast.textContent = message; els.toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2500);
  }
  function render() {
    const query = els.search.value.trim().toLowerCase(), filter = els.filter.value, sort = els.sort.value, today = localToday();
    let visible = tasks.filter(t => {
      const match = [t.title,t.notes,t.category,t.priority].some(v => String(v || '').toLowerCase().includes(query));
      let filterMatch = filter === 'all' || (filter === 'active' && t.status !== 'completed') || (filter === 'completed' && t.status === 'completed') || (filter === 'today' && t.dueDate === today) || (filter === 'overdue' && t.status !== 'completed' && !!t.dueDate && t.dueDate < today);
      return match && filterMatch;
    });
    const priorityRank = {high:0,normal:1,low:2};
    visible.sort((a,b) => {
      if (sort === 'name') return a.title.localeCompare(b.title);
      if (sort === 'newest') return b.createdAt-a.createdAt;
      if (sort === 'oldest') return a.createdAt-b.createdAt;
      if (sort === 'due') return (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99');
      if (a.status !== b.status) return a.status === 'completed' ? 1 : -1;
      return (priorityRank[a.priority]-priorityRank[b.priority]) || (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99') || b.createdAt-a.createdAt;
    });
    const completed = tasks.filter(t => t.status === 'completed').length, active = tasks.length-completed;
    $('totalCount').textContent = tasks.length; $('activeCount').textContent = active; $('completedCount').textContent = completed;
    $('visibleCount').textContent = visible.length;
    const percent = tasks.length ? Math.round(completed/tasks.length*100) : 0;
    $('progressText').textContent = `${percent}% complete`; $('progressBar').style.width = `${percent}%`;
    $('progressHint').textContent = !tasks.length ? 'Add your first task to start building momentum.' : percent === 100 ? 'Everything is done. Enjoy the breathing room!' : `${completed} of ${tasks.length} tasks complete. Every small step counts.`;
    $('todayLabel').textContent = new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
    const hour = new Date().getHours();
    $('greeting').textContent = hour < 12 ? 'Good morning. Let’s begin.' : hour < 17 ? 'Your day, your pace.' : 'Let’s wrap up the day.';
    els.list.innerHTML = visible.map(t => {
      const due = dueInfo(t), completedClass = t.status === 'completed' ? ' is-completed' : '';
      const priority = t.priority || 'normal';
      return `<article class="task-card${completedClass}" data-id="${esc(t.id)}">
        <input class="task-check" type="checkbox" data-action="toggle" data-id="${esc(t.id)}" aria-label="${t.status === 'completed' ? 'Mark task as to do' : 'Complete task'}" ${t.status === 'completed' ? 'checked' : ''}>
        <div class="task-content">
          <div class="task-title-row"><h3 class="task-title">${esc(t.title)}</h3><span class="priority-dot ${priority}">${priority === 'high' ? '↑ HIGH' : priority === 'low' ? '↓ LOW' : 'NORMAL'}</span></div>
          ${t.notes ? `<p class="task-notes">${esc(t.notes)}</p>` : ''}
          <div class="task-meta">${t.category ? `<span class="task-category">${esc(t.category)}</span>` : ''}${due.label ? `<span class="due-date ${due.cls}">◷ ${esc(due.label)}</span>` : ''}</div>
          <div class="task-bottom"><span class="task-status">${t.status === 'completed' ? '✓ Completed' : '○ To do'}</span><div class="task-actions"><button class="mini-button" data-action="edit" data-id="${esc(t.id)}">Edit</button><button class="mini-button delete" data-action="delete" data-id="${esc(t.id)}">Delete</button></div></div>
        </div>
      </article>`;
    }).join('');
    els.empty.hidden = visible.length > 0; els.list.hidden = visible.length === 0;
    if (!tasks.length) { $('emptyTitle').textContent = 'A fresh start'; $('emptyMessage').textContent = 'Add a task and make today count. Your list stays private on this device.'; }
    else { $('emptyTitle').textContent = 'Nothing to show'; $('emptyMessage').textContent = 'Try another filter or search, or add a new task to your list.'; }
  }
  function openModal(task = null) {
    els.form.reset();
    $('taskId').value = task?.id || ''; $('taskTitle').value = task?.title || ''; $('taskNotes').value = task?.notes || '';
    $('taskDue').value = task?.dueDate || ''; $('taskPriority').value = task?.priority || 'normal'; $('taskCategory').value = task?.category || '';
    $('taskStatus').value = task?.status || 'active'; $('modalTitle').textContent = task ? 'Edit task' : 'Add a task';
    $('modalEyebrow').textContent = task ? 'MAKE AN UPDATE' : 'MAKE IT HAPPEN'; $('saveButton').textContent = task ? 'Save changes' : 'Save task';
    els.modal.hidden = false; document.body.style.overflow = 'hidden'; setTimeout(() => $('taskTitle').focus(),50);
  }
  function closeModal(modal = els.modal) {
    modal.hidden = true;
    if (els.modal.hidden && els.dataModal.hidden) document.body.style.overflow = '';
  }
  function createId() { return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

  els.form.addEventListener('submit', e => {
    e.preventDefault();
    const title = $('taskTitle').value.trim(); if (!title) { $('taskTitle').focus(); return; }
    const id = $('taskId').value, old = tasks.find(t => t.id === id), now = Date.now(), status = $('taskStatus').value;
    const task = normalizeTask({ id:id || createId(), title, notes:$('taskNotes').value.trim(), dueDate:$('taskDue').value, priority:$('taskPriority').value, category:$('taskCategory').value.trim(), status, createdAt:old?.createdAt || now, updatedAt:now, completedAt:status === 'completed' ? (old?.completedAt || now) : null });
    if (old) tasks = tasks.map(t => t.id === id ? task : t); else tasks.unshift(task);
    if (persist()) { closeModal(); render(); showToast(old ? 'Task updated' : 'Task added'); }
  });
  function action(action,id) {
    const task = tasks.find(t => t.id === id); if (!task) return;
    if (action === 'edit') openModal(task);
    if (action === 'delete') {
      if (!confirm(`Delete "${task.title}"? This cannot be undone unless you have a backup.`)) return;
      tasks = tasks.filter(t => t.id !== id);
      if (persist()) { render(); showToast('Task deleted'); }
    }
    if (action === 'toggle') {
      const status = task.status === 'completed' ? 'active' : 'completed';
      tasks = tasks.map(t => t.id === id ? {...t,status,updatedAt:Date.now(),completedAt:status === 'completed' ? Date.now() : null} : t);
      if (persist()) { render(); showToast(status === 'completed' ? 'Nice work — task completed!' : 'Task reopened'); }
    }
  }
  els.list.addEventListener('click', e => { const b=e.target.closest('button[data-action]'); if (b) action(b.dataset.action,b.dataset.id); });
  els.list.addEventListener('change', e => { const c=e.target.closest('input[data-action="toggle"]'); if (c) action('toggle',c.dataset.id); });
  els.search.addEventListener('input',render); els.filter.addEventListener('change',render); els.sort.addEventListener('change',render);
  ['addButton','heroAddButton','emptyAddButton'].forEach(id => $(id).addEventListener('click', () => openModal()));
  $('closeModal').addEventListener('click', () => closeModal()); $('cancelModal').addEventListener('click', () => closeModal());
  els.modal.addEventListener('click',e => { if (e.target === els.modal) closeModal(); });
  $('dataMenuButton').addEventListener('click',() => { els.dataModal.hidden=false; document.body.style.overflow='hidden'; });
  $('closeDataModal').addEventListener('click',() => closeModal(els.dataModal));
  els.dataModal.addEventListener('click',e => { if (e.target === els.dataModal) closeModal(els.dataModal); });
  document.addEventListener('keydown',e => { if(e.key==='Escape'){if(!els.modal.hidden)closeModal();if(!els.dataModal.hidden)closeModal(els.dataModal);} });

  $('exportButton').addEventListener('click',() => {
    const blob = new Blob([JSON.stringify({app:'My Tasks PWA',version:1,exportedAt:new Date().toISOString(),tasks},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=`my-tasks-backup-${localToday()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); showToast('Backup exported');
  });
  $('importInput').addEventListener('change',async e => {
    const file=e.target.files?.[0]; if(!file)return;
    try {
      const parsed=JSON.parse(await file.text()), incoming=Array.isArray(parsed)?parsed:parsed.tasks;
      if(!Array.isArray(incoming)||incoming.some(t=>!t||typeof t.title!=='string'))throw new Error('Invalid backup');
      if(!confirm(`Import ${incoming.length} tasks? They will be added to your current list.`)){e.target.value='';return;}
      const ids=new Set(tasks.map(t=>t.id));
      const added=incoming.map(t=>{let n=normalizeTask(t);if(ids.has(n.id))n.id=createId();ids.add(n.id);return n;});
      tasks=[...added,...tasks];
      if(persist()){render();closeModal(els.dataModal);showToast(`${added.length} tasks imported`);}
    } catch { alert('This file does not look like a valid My Tasks backup.'); }
    e.target.value='';
  });
  $('clearButton').addEventListener('click',() => {
    if(!tasks.length){showToast('There are no tasks to delete');return;}
    if(!confirm(`Delete all ${tasks.length} tasks from this device? Export a backup first if you may need them.`))return;
    tasks=[]; if(persist()){render();closeModal(els.dataModal);showToast('All tasks deleted');}
  });

  function applyTheme(theme) {
    document.documentElement.dataset.theme=theme;
    $('themeToggle').innerHTML=theme==='dark'
      ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"/></svg>';
    $('themeToggle').setAttribute('aria-label',theme==='dark'?'Switch to light theme':'Switch to dark theme');
    try{localStorage.setItem(THEME_KEY,theme);}catch{}
  }
  let saved='light'; try{saved=localStorage.getItem(THEME_KEY)||'light';}catch{} applyTheme(saved);
  $('themeToggle').addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installButton').hidden=false;});
  $('installButton').addEventListener('click',async()=>{if(!installPrompt){showToast('Open your browser menu and choose Install app or Add to Home screen.');return;}installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installButton').hidden=true;});
  window.addEventListener('appinstalled',()=>{$('installButton').hidden=true;showToast('App installed');});
  if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  render();
})();