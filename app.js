const STORAGE_KEY = 'weekflow-board-v1';

const palette = {
  coral: { label: 'High priority', color: '#f17a6a', bg: '#fff0ed' },
  yellow: { label: 'In progress', color: '#c69322', bg: '#fff7df' },
  blue: { label: 'Planning', color: '#5d88c5', bg: '#edf4fc' },
  green: { label: 'Done / low', color: '#50a174', bg: '#eaf8ef' }
};

const defaultState = {
  weeks: [
    { id: 'week-1', title: 'This week', date: 'Sep 21 – 27', number: '01', current: true },
    { id: 'week-2', title: 'Next week', date: 'Sep 28 – Oct 04', number: '02' },
    { id: 'week-3', title: 'Week after', date: 'Oct 05 – 11', number: '03' },
    { id: 'week-4', title: 'Later', date: 'Oct 12 – 18', number: '04' }
  ],
  tasks: [
    { id: 't1', weekId: 'week-1', title: 'Finalize onboarding flow', notes: 'Review the latest copy and handoff states with the product crew.', color: 'coral', date: 'Today' },
    { id: 't2', weekId: 'week-1', title: 'Share research readout', notes: 'Pull together the top 3 themes from last week’s customer calls.', color: 'yellow', date: 'Wed, Sep 23' },
    { id: 't3', weekId: 'week-1', title: 'Design critique', notes: 'Bring the empty states and mobile navigation explorations.', color: 'blue', date: 'Thu, Sep 24' },
    { id: 't4', weekId: 'week-2', title: 'Build dashboard prototype', notes: 'Create a clickable version for the stakeholder walkthrough.', color: 'blue', date: 'Mon, Sep 28' },
    { id: 't5', weekId: 'week-2', title: 'Team retro', notes: 'A short reset: keep, stop, start.', color: 'yellow', date: 'Tue, Sep 29' },
    { id: 't6', weekId: 'week-2', title: 'Update component docs', notes: 'Add examples for the new table and filter patterns.', color: 'green', date: 'Fri, Oct 02' },
    { id: 't7', weekId: 'week-3', title: 'Usability testing', notes: 'Schedule five sessions for the new workspace navigation.', color: 'coral', date: 'Tue, Oct 06' },
    { id: 't8', weekId: 'week-3', title: 'Marketing sync', notes: 'Align on launch story and the customer proof points.', color: 'yellow', date: 'Wed, Oct 07' },
    { id: 't9', weekId: 'week-4', title: 'Q4 planning session', notes: 'Bring outcomes, risks, and the first draft of priorities.', color: 'blue', date: 'Mon, Oct 12' },
    { id: 't10', weekId: 'week-4', title: 'Archive old projects', notes: 'Clean up inactive spaces before the quarterly review.', color: 'green', date: 'Thu, Oct 15' },
    { id: 't11', weekId: 'week-1', title: 'Polish settings screen', notes: 'Apply the final spacing and accessibility notes.', color: 'blue', date: 'Fri, Sep 25' },
    { id: 't12', weekId: 'week-3', title: 'Partner check-in', notes: 'Share progress and confirm the integration timeline.', color: 'yellow', date: 'Fri, Oct 09' }
  ]
};

let state = loadState();
let draggedTaskId = null;
let editingTaskId = null;

const board = document.getElementById('board');
const modal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
const taskName = document.getElementById('taskName');
const taskWeek = document.getElementById('taskWeek');
const taskColor = document.getElementById('taskColor');
const taskNotes = document.getElementById('taskNotes');

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) { console.warn('Could not load saved board', error); }
  return structuredClone(defaultState);
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { console.warn('Could not save board', error); }
}

function render() {
  board.innerHTML = '';
  state.weeks.forEach((week) => {
    const column = document.createElement('article');
    column.className = `week-column${week.current ? ' current' : ''}`;
    column.dataset.weekId = week.id;
    const weekTasks = state.tasks.filter((task) => task.weekId === week.id);
    column.innerHTML = `<header class="week-head"><div><h2>${escapeHtml(week.title)}</h2><p>${escapeHtml(week.date)}</p></div><span class="week-number">${escapeHtml(week.number)}</span></header><div class="task-list" data-week-id="${week.id}"></div><button class="column-add" data-add-week="${week.id}"><span>+</span> Add task</button>`;
    const list = column.querySelector('.task-list');
    weekTasks.forEach((task) => list.appendChild(createTaskCard(task)));
    const empty = document.createElement('div');
    empty.className = 'empty-drop';
    empty.textContent = 'Drop here to move task';
    list.appendChild(empty);
    bindDropEvents(column);
    board.appendChild(column);
  });
  document.getElementById('summaryText').textContent = `${state.tasks.length} tasks across ${state.weeks.length} weeks`;
  updateWeekOptions();
  bindCardEvents();
}

function createTaskCard(task) {
  const card = document.createElement('article');
  const tone = palette[task.color] || palette.blue;
  card.className = 'task-card';
  card.draggable = true;
  card.dataset.taskId = task.id;
  card.style.setProperty('--task-color', tone.color);
  card.style.setProperty('--task-bg', tone.bg);
  card.innerHTML = `<button class="card-menu" aria-label="Edit task">•••</button><h3>${escapeHtml(task.title)}</h3>${task.notes ? `<p>${escapeHtml(task.notes)}</p>` : ''}<div class="task-meta"><span class="task-label">${tone.label}</span><span class="task-date">${escapeHtml(task.date || 'No date')}</span></div>`;
  return card;
}

function bindCardEvents() {
  document.querySelectorAll('.task-card').forEach((card) => {
    card.addEventListener('dragstart', () => { draggedTaskId = card.dataset.taskId; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => { draggedTaskId = null; card.classList.remove('dragging'); document.querySelectorAll('.is-drop-target').forEach((item) => item.classList.remove('is-drop-target')); });
    card.addEventListener('click', (event) => { if (!event.target.closest('.card-menu')) openTaskModal(card.dataset.taskId); });
    card.querySelector('.card-menu').addEventListener('click', () => openTaskModal(card.dataset.taskId));
  });
  document.querySelectorAll('[data-add-week]').forEach((button) => button.addEventListener('click', () => openTaskModal(null, button.dataset.addWeek)));
}

function bindDropEvents(column) {
  column.addEventListener('dragover', (event) => { event.preventDefault(); if (draggedTaskId) column.classList.add('is-drop-target'); });
  column.addEventListener('dragleave', (event) => { if (!column.contains(event.relatedTarget)) column.classList.remove('is-drop-target'); });
  column.addEventListener('drop', (event) => {
    event.preventDefault();
    if (!draggedTaskId) return;
    const task = state.tasks.find((item) => item.id === draggedTaskId);
    if (task && task.weekId !== column.dataset.weekId) {
      task.weekId = column.dataset.weekId;
      saveState(); render();
      showToast('Task moved to ' + state.weeks.find((week) => week.id === task.weekId).title);
    }
    column.classList.remove('is-drop-target');
  });
}

function updateWeekOptions() {
  const selected = taskWeek.value;
  taskWeek.innerHTML = state.weeks.map((week) => `<option value="${week.id}">${escapeHtml(week.title)} · ${escapeHtml(week.date)}</option>`).join('');
  if (state.weeks.some((week) => week.id === selected)) taskWeek.value = selected;
}

function openTaskModal(taskId = null, preferredWeek = null) {
  editingTaskId = taskId;
  const task = state.tasks.find((item) => item.id === taskId);
  document.getElementById('modalTitle').textContent = task ? 'Edit task' : 'New task';
  taskName.value = task?.title || '';
  taskNotes.value = task?.notes || '';
  taskColor.value = task?.color || 'blue';
  updateWeekOptions();
  taskWeek.value = task?.weekId || preferredWeek || state.weeks[0].id;
  modal.hidden = false;
  setTimeout(() => taskName.focus(), 50);
}

function closeModal() { modal.hidden = true; editingTaskId = null; taskForm.reset(); }

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = taskName.value.trim();
  if (!title) return;
  const existing = state.tasks.find((task) => task.id === editingTaskId);
  if (existing) {
    existing.title = title; existing.notes = taskNotes.value.trim(); existing.color = taskColor.value; existing.weekId = taskWeek.value;
    showToast('Task updated');
  } else {
    state.tasks.push({ id: `task-${Date.now()}`, weekId: taskWeek.value, title, notes: taskNotes.value.trim(), color: taskColor.value, date: 'New task' });
    showToast('Task added to ' + state.weeks.find((week) => week.id === taskWeek.value).title);
  }
  saveState(); render(); closeModal();
});

document.getElementById('newTaskButton').addEventListener('click', () => openTaskModal());
document.querySelectorAll('.close-modal').forEach((button) => button.addEventListener('click', closeModal));
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });

document.getElementById('addWeekButton').addEventListener('click', () => {
  const next = state.weeks.length + 1;
  state.weeks.push({ id: `week-${Date.now()}`, title: `Week ${next}`, date: 'Choose dates', number: String(next).padStart(2, '0') });
  saveState(); render(); showToast('New week added');
});

document.querySelectorAll('.view-tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.view-tab').forEach((item) => item.classList.remove('active'));
  tab.classList.add('active');
  if (tab.textContent !== 'Board') showToast(`${tab.textContent} view is coming soon`);
}));

document.getElementById('filterButton').addEventListener('click', () => {
  const filter = board.dataset.filter || '';
  const next = filter ? '' : 'coral';
  board.dataset.filter = next;
  document.getElementById('filterBadge').classList.toggle('visible', Boolean(next));
  document.getElementById('filterBadge').textContent = next ? '1' : '0';
  document.querySelectorAll('.task-card').forEach((card) => { card.style.display = !next || state.tasks.find((task) => task.id === card.dataset.taskId)?.color === next ? '' : 'none'; });
  showToast(next ? 'Showing high-priority tasks' : 'Showing all tasks');
});

document.getElementById('sortButton').addEventListener('click', () => {
  state.tasks.reverse(); saveState(); render(); showToast('Tasks reordered');
});

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

render();
