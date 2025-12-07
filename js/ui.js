// UI操作・モーダル制御

let currentTags = [];
let currentTasks = {};

// タブ切り替え
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
    });
  });
}

// フィルタータブ
function initFilterTabs() {
  document.querySelectorAll('.filter-tabs').forEach(container => {
    container.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        if (tab.dataset.filter) {
          window.currentFilter = tab.dataset.filter;
          renderArticles();
        }
        if (tab.dataset.chart) {
          window.currentChartView = tab.dataset.chart;
          updateTrendChart();
        }
      });
    });
  });
}

// タグ入力
function initTagsInput() {
  const input = document.getElementById('tags-input');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      e.preventDefault();
      addTag(input.value.trim());
      input.value = '';
    }
  });
}

function addTag(tag) {
  if (!currentTags.includes(tag)) {
    currentTags.push(tag);
    renderTags();
  }
}

function removeTag(tag) {
  currentTags = currentTags.filter(t => t !== tag);
  renderTags();
}

function renderTags() {
  const container = document.getElementById('tags-container');
  const input = document.getElementById('tags-input');
  container.innerHTML = '';
  currentTags.forEach(tag => {
    const tagEl = document.createElement('span');
    tagEl.className = 'tag';
    tagEl.innerHTML = `${tag}<span class="tag-remove" onclick="removeTag('${tag}')">×</span>`;
    container.appendChild(tagEl);
  });
  container.appendChild(input);
}

// タスクエディター
function renderTaskEditor() {
  const container = document.getElementById('task-editor');
  container.innerHTML = TASKS.map(task => {
    const status = currentTasks[task.type] || 'not_started';
    return `
      <div class="task-row">
        <span class="task-name">${task.name}${task.required ? '' : '（任意）'}</span>
        <select class="task-select" data-task="${task.type}">
          ${TASK_STATUSES.map(s => `
            <option value="${s.value}" ${status === s.value ? 'selected' : ''}>${s.label}</option>
          `).join('')}
        </select>
      </div>
    `;
  }).join('');
}

// ガントチャートコントロール
function initGanttControls() {
  document.querySelectorAll('.gantt-view').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gantt-view').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.currentGanttView = btn.dataset.view;
      renderGanttChart();
    });
  });
}

// ファイルドロップ
function initFileDrop() {
  const dropZone = document.getElementById('file-drop');
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      processCsvFile(file);
    }
  });
}
