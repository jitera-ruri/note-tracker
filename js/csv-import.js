// CSVインポート機能

let csvData = null;
let csvDraftArticles = [];

function openCsvModal() {
  document.getElementById('csv-modal').classList.add('active');
  csvData = null;
  csvDraftArticles = [];
  document.getElementById('csv-preview').style.display = 'none';
  document.getElementById('update-status-group').style.display = 'none';
  document.getElementById('import-csv-btn').disabled = true;
  document.getElementById('csv-file').value = '';
  
  // 日付入力のデフォルト値を今日に設定
  document.getElementById('csv-date').value = new Date().toISOString().split('T')[0];
}

function closeCsvModal() {
  document.getElementById('csv-modal').classList.remove('active');
}

function handleCsvFile(event) {
  const file = event.target.files[0];
  if (file) {
    processCsvFile(file);
  }
}

// CSV行を解析する関数（ダブルクォート対応）
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // エスケープされたダブルクォート
        current += '"';
        i++;
      } else {
        // クォートの開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // フィールドの区切り
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // 最後のフィールド
  result.push(current.trim());
  
  return result;
}

async function processCsvFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      let text = e.target.result;
      
      // BOMを削除
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.substring(1);
      }
      
      // 改行コードを統一（Windows/Mac/Linux対応）
      const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // 空行を除外
      const lines = normalizedText.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        showToast('CSVファイルが空です');
        return;
      }
      
      console.log('=== CSV解析開始 ===');
      console.log('総行数:', lines.length);
      console.log('ヘッダー行:', lines[0]);
      
      // ヘッダーを解析
      const headers = parseCSVLine(lines[0]);
      console.log('解析されたヘッダー:', headers);
      
      const data = [];
      
      // データ行を解析
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        if (values.length === 0 || values.every(v => !v.trim())) {
          console.log(`行 ${i + 1}: 空行をスキップ`);
          continue;
        }
        
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });
        
        data.push(row);
      }
      
      if (data.length === 0) {
        showToast('有効なデータがありません');
        return;
      }
      
      console.log('解析完了:', data.length, '件');
      console.log('サンプルデータ:', data[0]);
      csvData = data;
      
      const preview = document.getElementById('csv-preview');
      const content = document.getElementById('csv-preview-content');
      preview.style.display = 'block';
      content.innerHTML = `
        <p><strong>${data.length}件のデータ</strong></p>
        <p>カラム: ${headers.join(', ')}</p>
        <hr style="margin: 8px 0;">
        ${data.slice(0, 3).map(row => `<pre style="font-size: 0.75rem;">${JSON.stringify(row, null, 2)}</pre>`).join('')}
        ${data.length > 3 ? '<p>...</p>' : ''}
      `;
      
      // 記事タイトルを抽出（複数のカラム名に対応）
      const csvTitles = [...new Set(data.map(row => {
        const title = row['タイトル'] || row['記事名'] || row['title'] || 
                     row['記事タイトル'] || row['Title'] || row['Article'] || '';
        return title.trim();
      }).filter(t => t))];
      
      console.log('抽出された記事タイトル:', csvTitles);
      
      if (csvTitles.length === 0) {
        showToast('記事名が見つかりません。CSVのカラム名を確認してください。');
        return;
      }
      
      const { data: draftArticles } = await supabase
        .from('articles')
        .select('id, title')
        .eq('status', 'draft')
        .in('title', csvTitles);
      
      csvDraftArticles = draftArticles || [];
      
      const updateStatusGroup = document.getElementById('update-status-group');
      if (csvDraftArticles.length > 0) {
        updateStatusGroup.style.display = 'flex';
        updateStatusGroup.querySelector('label').textContent = 
          `下書き記事（${csvDraftArticles.length}件）を「投稿済み」に更新する`;
      } else {
        updateStatusGroup.style.display = 'none';
      }
      
      document.getElementById('import-csv-btn').disabled = false;
      
    } catch (error) {
      console.error('CSV解析エラー:', error);
      showToast('CSVファイルの解析に失敗しました');
    }
  };
  
  // UTF-8として読み込み
  reader.readAsText(file, 'UTF-8');
}

async function importCsv() {
  if (!csvData || csvData.length === 0 || isProcessing) return;
  
  isProcessing = true;
  const importBtn = document.getElementById('import-csv-btn');
  importBtn.disabled = true;
  importBtn.textContent = 'インポート中...';
  
  try {
    const updateDraftStatus = document.getElementById('update-draft-status').checked;
    const importDate = document.getElementById('csv-date').value;
    
    if (!importDate) {
      showToast('日付を選択してください');
      isProcessing = false;
      importBtn.disabled = false;
      importBtn.textContent = 'インポート';
      return;
    }
    
    console.log(`インポート開始: ${importDate}`);
    
    // CSVデータを解析（累積値として取得）
    // カラム名のマッピング
    const analyticsData = csvData.map(row => {
      // タイトルの取得
      const title = row['タイトル'] || row['記事名'] || row['title'] || 
                   row['記事タイトル'] || row['Title'] || '';
      
      // PVの取得
      const pv = parseInt(
        row['ビュー'] || row['PV'] || row['pv'] || 
        row['ビュー数'] || row['Views'] || row['views'] || 0
      ) || 0;
      
      // スキの取得
      const likes = parseInt(
        row['スキ'] || row['いいね'] || row['likes'] || 
        row['Likes'] || row['Like'] || 0
      ) || 0;
      
      // コメントの取得
      const comments = parseInt(
        row['コメント'] || row['comments'] || 
        row['Comments'] || row['Comment'] || 0
      ) || 0;
      
      return {
        article_title: title.trim(),
        pv: pv,
        likes: likes,
        comments: comments
      };
    });
    
    console.log('CSVデータ（最初の3件）:', analyticsData.slice(0, 3));
    
    // 記事タイトルごとにグループ化
    const uniqueTitles = [...new Set(analyticsData.map(d => d.article_title).filter(t => t))];
    const articleIdMap = {};
    
    // 既存の記事を一括取得
    const { data: existingArticles } = await supabase
      .from('articles')
      .select('id, title, status')
      .in('title', uniqueTitles);
    
    (existingArticles || []).forEach(a => {
      articleIdMap[a.title] = a.id;
    });
    
    // 下書き記事を投稿済みに更新
    if (updateDraftStatus && csvDraftArticles.length > 0) {
      const draftIds = csvDraftArticles.map(a => a.id);
      await supabase
        .from('articles')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .in('id', draftIds);
    }
    
    // 存在しない記事を作成
    const newTitles = uniqueTitles.filter(t => !articleIdMap[t]);
    if (newTitles.length > 0) {
      const { data: newArticles } = await supabase
        .from('articles')
        .insert(newTitles.map(title => ({ title, status: 'published' })))
        .select();
      
      (newArticles || []).forEach(a => {
        articleIdMap[a.title] = a.id;
      });
      
      // 新規記事のデフォルトタスクを作成
      const tasksToInsert = [];
      (newArticles || []).forEach(article => {
        TASKS.forEach(task => {
          tasksToInsert.push({
            article_id: article.id,
            task_type: task.type,
            task_status: 'completed',
            task_order: task.order
          });
        });
      });
      if (tasksToInsert.length > 0) {
        await supabase.from('tasks').insert(tasksToInsert);
      }
    }
    
    // 記事ごとにデータを整理
    const dataByArticle = {};
    analyticsData.forEach(d => {
      if (!d.article_title || !articleIdMap[d.article_title]) return;
      const articleId = articleIdMap[d.article_title];
      dataByArticle[articleId] = {
        articleId,
        title: d.article_title,
        pv: d.pv,
        likes: d.likes,
        comments: d.comments
      };
    });
    
    console.log('記事別データ（最初の3件）:', Object.values(dataByArticle).slice(0, 3));
    
    // 各記事について、指定日付より前の全データを取得して累積値を計算
    const articleIds = Object.keys(dataByArticle);
    const previousCumulativeByArticle = {};
    
    for (const articleId of articleIds) {
      // 指定日付より前のすべてのデータを取得
      const { data: previousData } = await supabase
        .from('article_analytics')
        .select('pv, likes, comments, date')
        .eq('article_id', articleId)
        .lt('date', importDate)
        .order('date', { ascending: true });
      
      // 増分を合計して累積値を計算
      const cumulative = {
        pv: 0,
        likes: 0,
        comments: 0
      };
      
      (previousData || []).forEach(item => {
        cumulative.pv += item.pv || 0;
        cumulative.likes += item.likes || 0;
        cumulative.comments += item.comments || 0;
      });
      
      previousCumulativeByArticle[articleId] = cumulative;
    }
    
    // 増分を計算してupsert用データを作成
    const analyticsToUpsert = [];
    
    Object.keys(dataByArticle).forEach(articleId => {
      const current = dataByArticle[articleId];
      const previous = previousCumulativeByArticle[articleId] || { pv: 0, likes: 0, comments: 0 };
      
      // CSVの累積値から前日までの累積値を引いて増分を計算
      const deltaPv = Math.max(0, current.pv - previous.pv);
      const deltaLikes = Math.max(0, current.likes - previous.likes);
      const deltaComments = Math.max(0, current.comments - previous.comments);
      
      console.log(`記事: ${current.title}`);
      console.log(`  CSV累積: PV=${current.pv}, スキ=${current.likes}, コメント=${current.comments}`);
      console.log(`  前日累積: PV=${previous.pv}, スキ=${previous.likes}, コメント=${previous.comments}`);
      console.log(`  増分: PV=${deltaPv}, スキ=${deltaLikes}, コメント=${deltaComments}`);
      
      analyticsToUpsert.push({
        article_id: articleId,
        date: importDate,
        pv: deltaPv,
        likes: deltaLikes,
        comments: deltaComments
      });
    });
    
    console.log('インポートするデータ件数:', analyticsToUpsert.length);
    
    if (analyticsToUpsert.length > 0) {
      const { error } = await supabase
        .from('article_analytics')
        .upsert(analyticsToUpsert, { onConflict: 'article_id,date' });
      
      if (error) {
        console.error('Upsertエラー:', error);
        throw error;
      }
    }
    
    let message = `${analyticsToUpsert.length}件のデータを${importDate}にインポートしました`;
    if (updateDraftStatus && csvDraftArticles.length > 0) {
      message += `（${csvDraftArticles.length}件を投稿済みに更新）`;
    }
    
    showToast(message);
    closeCsvModal();
    loadArticles();
    loadAnalytics();
  } catch (error) {
    console.error('Error importing CSV:', error);
    showToast(`インポートに失敗しました: ${error.message}`);
  } finally {
    isProcessing = false;
    importBtn.disabled = false;
    importBtn.textContent = 'インポート';
  }
}
