// 記事管理機能

let articles = [];
let currentFilter = 'all';
let currentGanttView = 'week';
let isProcessing = false;

async function loadArticles() {
  try {
    articles = await fetchArticles();
    renderArticles();
    renderGanttChart();
  } catch (error) {
    console.error('Error loading articles:', error);
    showToast('記事の読み込みに失敗しました');
  }
}

function renderArticles() {
  const container = document.getElementById('article-list');
  let filtered = articles;
  
  if (currentFilter !== 'all') {
    filtered = articles.filter(a => a.status === currentFilter);
  }
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>記事がありません</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filtered.map(article => {
    const tasks = article.tasks || [];
    return `
      <div class="article-item" onclick="openArticleModal('${article.id}')">
        <div class="article-title">${escapeHtml(article.title)}</div>
        <div class="article-meta">
          <span class="article-status status-${article.status}">
            ${article.status === 'draft' ? '下書き' : article.status === 'published' ? '投稿済み' : 'アーカイブ'}
          </span>
          ${article.published_at ? `<span style="color: var(--gray-600); font-size: 0.875rem;">投稿: ${formatDate(article.published_at)}</span>` : ''}
        </div>
        <div class="article-tags">
          ${(article.tags || []).map(tag => `<span class="article-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
        <div class="task-progress">
          ${TASKS.map(t => {
            const task = tasks.find(at => at.task_type === t.type);
            const status = task ? task.task_status : 'not_started';
            return `<div class="task-dot task-${status}" title="${t.name}: ${getStatusLabel(status)}">${t.name.charAt(0)}</div>`;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderGanttChart() {
  const container = document.getElementById('gantt-chart');
  const activeArticles = articles.filter(a => a.status !== 'archived');
  
  if (activeArticles.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <p>表示する記事がありません</p>
      </div>
    `;
    return;
  }
  
  // 日付範囲を計算
  const today = new Date();
  let startDate, endDate, dateLabels;
  
  if (currentGanttView === 'week') {
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startDate = monday;
    endDate = new Date(monday);
    endDate.setDate(monday.getDate() + 6);
    
    dateLabels = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateLabels.push({
        date: new Date(d),
        label: `${d.getMonth() + 1}/${d.getDate()}`
      });
    }
  } else {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    dateLabels = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateLabels.push({
        date: new Date(d),
        label: d.getDate().toString()
      });
    }
  }
  
  let html = `
    <table class="gantt-table">
      <thead>
        <tr>
          <th class="article-cell">記事</th>
          ${dateLabels.map(d => `<th>${d.label}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;
  
  activeArticles.forEach(article => {
    const tasks = article.tasks || [];
    const completedTasks = tasks.filter(t => t.task_status === 'completed').length;
    const totalTasks = TASKS.filter(t => t.required).length;
    const progress = Math.round((completedTasks / totalTasks) * 100);
    
    html += `
      <tr>
        <td class="article-cell" title="${escapeHtml(article.title)}">${escapeHtml(article.title)}</td>
        ${dateLabels.map(d => {
          const dateStr = d.date.toISOString().split('T')[0];
          const createdDate = article.created_at.split('T')[0];
          const publishedDate = article.published_at ? article.published_at.split('T')[0] : null;
          
          let bgColor = 'transparent';
          if (dateStr >= createdDate && (!publishedDate || dateStr <= publishedDate)) {
            if (progress === 100) {
              bgColor = 'var(--success)';
            } else if (progress > 0) {
              bgColor = 'var(--warning)';
            } else {
              bgColor = 'var(--gray-300)';
            }
          }
          
          return `<td><div class="gantt-bar" style="background: ${bgColor};"></div></td>`;
        }).join('')}
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function openArticleModal(articleId = null) {
  const modal = document.getElementById('article-modal');
  const title = document.getElementById('article-modal-title');
  const deleteBtn = document.getElementById('delete-article-btn');
  
  document.getElementById('article-id').value = '';
  document.getElementById('article-title').value = '';
  document.getElementById('article-status').value = 'draft';
  document.getElementById('draft-saved-at').value = '';
  document.getElementById('published-at').value = '';
  currentTags = [];
  currentTasks = {};
  
  if (articleId) {
    title.textContent = '記事を編集';
    deleteBtn.style.display = 'block';
    
    const article = articles.find(a => a.id === articleId);
    if (article) {
      document.getElementById('article-id').value = article.id;
      document.getElementById('article-title').value = article.title;
      document.getElementById('article-status').value = article.status;
      document.getElementById('draft-saved-at').value = article.draft_saved_at ? article.draft_saved_at.split('T')[0] : '';
      document.getElementById('published-at').value = article.published_at ? article.published_at.split('T')[0] : '';
      currentTags = article.tags || [];
      
      (article.tasks || []).forEach(task => {
        currentTasks[task.task_type] = task.task_status;
      });
    }
  } else {
    title.textContent = '新規記事作成';
    deleteBtn.style.display = 'none';
    document.getElementById('draft-saved-at').value = new Date().toISOString().split('T')[0];
  }
  
  renderTags();
  renderTaskEditor();
  modal.classList.add('active');
}

function closeArticleModal() {
  document.getElementById('article-modal').classList.remove('active');
}

async function saveArticle() {
  if (isProcessing) return;
  
  const id = document.getElementById('article-id').value;
  const title = document.getElementById('article-title').value.trim();
  const status = document.getElementById('article-status').value;
  const draftSavedAt = document.getElementById('draft-saved-at').value || null;
  const publishedAt = document.getElementById('published-at').value || null;
  
  if (!title) {
    showToast('タイトルを入力してください');
    return;
  }
  
  isProcessing = true;
  const saveBtn = document.getElementById('save-article-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = '保存中...';
  
  const taskStatuses = {};
  document.querySelectorAll('.task-select').forEach(select => {
    taskStatuses[select.dataset.task] = select.value;
  });
  
  try {
    let articleId = id;
    
    if (id) {
      await updateArticle(id, {
        title,
        tags: currentTags,
        status,
        draft_saved_at: draftSavedAt,
        published_at: publishedAt,
        updated_at: new Date().toISOString()
      });
      
      await deleteTasksByArticleId(id);
    } else {
      const newArticle = await createArticle({
        title,
        tags: currentTags,
        status,
        draft_saved_at: draftSavedAt,
        published_at: publishedAt
      });
      articleId = newArticle.id;
    }
    
    const tasksToInsert = TASKS.map(task => ({
      article_id: articleId,
      task_type: task.type,
      task_status: taskStatuses[task.type] || 'not_started',
      task_order: task.order
    }));
    
    await upsertTasks(tasksToInsert);
    
    showToast('保存しました');
    closeArticleModal();
    loadArticles();
  } catch (error) {
    console.error('Error saving article:', error);
    showToast('保存に失敗しました');
  } finally {
    isProcessing = false;
    saveBtn.disabled = false;
    saveBtn.textContent = '保存';
  }
}

async function deleteArticle() {
  if (isProcessing) return;
  
  const id = document.getElementById('article-id').value;
  if (!id) return;
  
  if (!confirm('この記事を削除しますか？')) return;
  
  isProcessing = true;
  
  try {
    await deleteArticleById(id);
    showToast('削除しました');
    closeArticleModal();
    loadArticles();
  } catch (error) {
    console.error('Error deleting article:', error);
    showToast('削除に失敗しました');
  } finally {
    isProcessing = false;
  }
}
