// CSVエクスポート機能

/**
 * 記事別の推移データをCSVエクスポート
 * 各記事の日付順にビュー数、スキ数、コメント数を出力
 */
async function exportArticleAnalyticsCsv() {
  try {
    // データ取得
    const articleAnalytics = await fetchArticleAnalytics();
    
    if (!articleAnalytics || articleAnalytics.length === 0) {
      showToast('エクスポートするデータがありません');
      return;
    }
    
    // 記事ごとにグループ化して日付順にソート
    const groupedByArticle = {};
    
    articleAnalytics.forEach(item => {
      const articleTitle = item.articles?.title || '不明';
      const articleId = item.article_id;
      
      if (!groupedByArticle[articleId]) {
        groupedByArticle[articleId] = {
          title: articleTitle,
          data: []
        };
      }
      
      groupedByArticle[articleId].data.push({
        date: item.date,
        pv: item.pv || 0,
        likes: item.likes || 0,
        comments: item.comments || 0
      });
    });
    
    // CSV生成
    let csvContent = '\uFEFF'; // BOM for Excel UTF-8 support
    csvContent += '記事タイトル,日付,ビュー数,スキ数,コメント数\n';
    
    // 記事ごとにデータを追加
    Object.values(groupedByArticle).forEach(article => {
      // 日付順にソート（昇順）
      article.data.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      article.data.forEach(row => {
        const line = [
          `"${article.title.replace(/"/g, '""')}"`, // タイトル（ダブルクォートをエスケープ）
          row.date,
          row.pv,
          row.likes,
          row.comments
        ].join(',');
        
        csvContent += line + '\n';
      });
    });
    
    // ダウンロード
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `note_analytics_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSVファイルをエクスポートしました');
    
  } catch (error) {
    console.error('Error exporting CSV:', error);
    showToast('エクスポートに失敗しました');
  }
}

/**
 * 全記事の統計サマリーをCSVエクスポート
 */
async function exportArticleSummaryCsv() {
  try {
    const articleAnalytics = await fetchArticleAnalytics();
    
    if (!articleAnalytics || articleAnalytics.length === 0) {
      showToast('エクスポートするデータがありません');
      return;
    }
    
    // 記事ごとに集計
    const summary = {};
    
    articleAnalytics.forEach(item => {
      const articleTitle = item.articles?.title || '不明';
      const articleId = item.article_id;
      
      if (!summary[articleId]) {
        summary[articleId] = {
          title: articleTitle,
          totalPv: 0,
          totalLikes: 0,
          totalComments: 0,
          firstDate: item.date,
          lastDate: item.date
        };
      }
      
      summary[articleId].totalPv += item.pv || 0;
      summary[articleId].totalLikes += item.likes || 0;
      summary[articleId].totalComments += item.comments || 0;
      
      if (item.date < summary[articleId].firstDate) {
        summary[articleId].firstDate = item.date;
      }
      if (item.date > summary[articleId].lastDate) {
        summary[articleId].lastDate = item.date;
      }
    });
    
    // CSV生成
    let csvContent = '\uFEFF';
    csvContent += '記事タイトル,初回記録日,最終記録日,総ビュー数,総スキ数,総コメント数\n';
    
    Object.values(summary)
      .sort((a, b) => b.totalPv - a.totalPv) // PV数で降順ソート
      .forEach(article => {
        const line = [
          `"${article.title.replace(/"/g, '""')}"`,
          article.firstDate,
          article.lastDate,
          article.totalPv,
          article.totalLikes,
          article.totalComments
        ].join(',');
        
        csvContent += line + '\n';
      });
    
    // ダウンロード
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `note_summary_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('サマリーCSVをエクスポートしました');
    
  } catch (error) {
    console.error('Error exporting summary CSV:', error);
    showToast('エクスポートに失敗しました');
  }
}
