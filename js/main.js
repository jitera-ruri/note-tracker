// メイン初期化スクリプト

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initFilterTabs();
  initTagsInput();
  initFileDrop();
  initGanttControls();
  loadArticles();
  loadAnalytics();
  
  // 日付のデフォルト値
  document.getElementById('stats-date').value = new Date().toISOString().split('T')[0];
  
  // 期間比較のデフォルト値
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  document.getElementById('period1').value = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('period2').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
});
