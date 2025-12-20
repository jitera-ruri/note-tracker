/**
 * note アクセス解析ツール - CSVエクスポート機能
 */

// エクスポートモーダルを開く
function openExportModal() {
  const modal = document.getElementById('export-modal');
  
  // デフォルト期間を設定（過去30日）
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const startInput = document.getElementById('export-start');
  const endInput = document.getElementById('export-end');
  
  if (startInput) startInput.value = thirtyDaysAgo.toISOString().split('T')[0];
  if (endInput) endInput.value = today.toISOString().split('T')[0];
  
  if (modal) {
    modal.classList.add('active');
  }
}

// エクスポートモーダルを閉じる
function closeExportModal() {
  const modal = document.getElementById('export-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// エクスポート実行
function executeExport() {
  const exportTypeSelect = document.getElementById('export-type');
  const startInput = document.getElementById('export-start');
  const endInput = document.getElementById('export-end');
  
  const exportType = exportTypeSelect ? exportTypeSelect.value : 'detail';
  const startDate = startInput ? startInput.value : '';
  const endDate = endInput ? endInput.value : '';
  
  let csvContent = '';
  
  if (exportType === 'detail') {
    csvContent = generateDetailCSV(startDate, endDate);
  } else {
    csvContent = generateSummaryCSV(startDate, endDate);
  }
  
  if (!csvContent) {
    showToast('エクスポートするデータがありません');
    return;
  }
  
  // BOM付きUTF-8でダウンロード
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `note_analytics_${exportType}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  closeExportModal();
  showToast('エクスポートが完了しました');
}

// 詳細データCSV生成
function generateDetailCSV(startDate, endDate) {
  // analyticsDataはグローバル変数（analytics.jsで定義）
  if (typeof analyticsData === 'undefined' || !analyticsData || analyticsData.length === 0) {
    return '';
  }
  
  const rows = [];
  rows.push(['日付', '記事タイトル', 'PV', 'スキ', 'コメント'].join(','));
  
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (end) end.setHours(23, 59, 59, 999);
  
  analyticsData.forEach(article => {
    const history = article.stats_history || article.history || [];
    const title = article.title || article.name || '無題';
    
    if (history.length === 0) {
      // 履歴がない場合は現在の値を出力
      const today = new Date().toISOString().split('T')[0];
      rows.push([
        today,
        `"${title.replace(/"/g, '""')}"`,
        article.read_count || article.pv || 0,
        article.like_count || article.likes || 0,
        article.comment_count || article.comments || 0
      ].join(','));
      return;
    }
    
    history.forEach(stat => {
      const dateStr = stat.date || stat.recorded_at || '';
      const date = new Date(dateStr);
      
      // 期間フィルタ
      if (start && date < start) return;
      if (end && date > end) return;
      
      rows.push([
        dateStr.split('T')[0],
        `"${title.replace(/"/g, '""')}"`,
        stat.pv || stat.read_count || 0,
        stat.likes || stat.like_count || 0,
        stat.comments || stat.comment_count || 0
      ].join(','));
    });
  });
  
  return rows.length > 1 ? rows.join('\n') : '';
}

// サマリーCSV生成
function generateSummaryCSV(startDate, endDate) {
  if (typeof analyticsData === 'undefined' || !analyticsData || analyticsData.length === 0) {
    return '';
  }
  
  const rows = [];
  rows.push(['記事タイトル', '累計PV', '累計スキ', '累計コメント', 'URL'].join(','));
  
  analyticsData.forEach(article => {
    const title = article.title || article.name || '無題';
    const url = article.url || article.note_url || '';
    
    // 現在の累計値を使用
    const totalPV = article.read_count || article.pv || 0;
    const totalLikes = article.like_count || article.likes || 0;
    const totalComments = article.comment_count || article.comments || 0;
    
    rows.push([
      `"${title.replace(/"/g, '""')}"`,
      totalPV,
      totalLikes,
      totalComments,
      `"${url}"`
    ].join(','));
  });
  
  return rows.length > 1 ? rows.join('\n') : '';
}
