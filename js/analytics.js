// ... 既存のコード（変更なし） ...

async function saveStats() {
  if (isProcessing) return;
  
  const date = document.getElementById('stats-date').value;
  const followers = parseInt(document.getElementById('stats-followers').value) || 0;
  const revenue = parseInt(document.getElementById('stats-revenue').value) || 0;
  
  if (!date) {
    showToast('日付を入力してください');
    return;
  }
  
  isProcessing = true;
  const saveBtn = document.getElementById('save-stats-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = '保存中...';
  
  try {
    await upsertOverallStats({ date, followers, revenue });
    showToast('保存しました');
    closeStatsModal();
    loadAnalytics();
  } catch (error) {
    console.error('Error saving stats:', error);
    showToast('保存に失敗しました');
  } finally {
    isProcessing = false;
    saveBtn.disabled = false;
    saveBtn.textContent = '保存';
  }
}

/**
 * 同期ステータスの初期化
 */
function initSyncStatus() {
  if (window.noteSyncManager) {
    window.noteSyncManager.updateSyncStatusUI();
  }
}

/**
 * グラフ切り替えのイベントリスナーを設定
 */
function initChartViewSwitcher() {
  const filterTabs = document.querySelectorAll('.filter-tab[data-chart]');
  
  filterTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // アクティブ状態を切り替え
      filterTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // ビューを変更
      currentChartView = this.getAttribute('data-chart');
      
      // グラフを再描画
      loadAnalytics();
    });
  });
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  initSyncStatus();
  initChartViewSwitcher();
});
