// CSVインポート機能

let csvData = null;
let csvDraftArticles = [];
let isImporting = false;

function openCsvModal() {
  console.log('=== openCsvModal 呼び出し ===');
  console.log('現在の状態 - isImporting:', isImporting);
  
  // 強制的にリセット
  isImporting = false;
  csvData = null;
  csvDraftArticles = [];
  
  const modal = document.getElementById('csv-modal');
  const preview = document.getElementById('csv-preview');
  const updateStatusGroup = document.getElementById('update-status-group');
  const importBtn = document.getElementById('import-csv-btn');
  const fileInput = document.getElementById('csv-file');
  const csvDate = document.getElementById('csv-date');
  
  if (!modal) {
    console.error('モーダル要素が見つかりません');
    return;
  }
  
  modal.classList.add('active');
  
  if (preview) preview.style.display = 'none';
  if (updateStatusGroup) updateStatusGroup.style.display = 'none';
  if (importBtn) {
    importBtn.disabled = true;
    importBtn.textContent = 'インポート';
    console.log('ボタンを初期化しました');
  }
  if (fileInput) fileInput.value = '';
  if (csvDate) csvDate.value = new Date().toISOString().split('T')[0];
  
  console.log('モーダルを開きました - isImporting:', isImporting);
}

function closeCsvModal() {
  console.log('=== closeCsvModal 呼び出し ===');
  
  const modal = document.getElementById('csv-modal');
  if (modal) {
    modal.classList.remove('active');
  }
  
  // 状態を完全にクリア
  csvData = null;
  csvDraftArticles = [];
  isImporting = false;
  
  console.log('モーダルを閉じました');
}

function handleCsvFile(event) {
  console.log('=== handleCsvFile 呼び出し ===');
  const file = event.target.files[0];
  if (file) {
    console.log('ファイル:', file.name, file.size, 'bytes');
    processCsvFile(file);
  } else {
    console.log('ファイルが選択されていません');
  }
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

async function processCsvFile(file) {
  console.log('=== processCsvFile 開始 ===');
  
  const reader = new FileReader();
  
  reader.onload = async (e) => {
    try {
      let text = e.target.result;
      console.log('ファイル読み込み完了:', text.length, '文字');
      
      // BOMを削除
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.substring(1);
        console.log('BOMを削除');
      }
      
      const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalizedText.split('\n').filter(line => line.trim());
      
      console.log('総行数:', lines.length);
      
      if (lines.length < 2) {
        console.error('CSVファイルが空です');
        showToast('CSVファイルが空です');
        return;
      }
      
      const headers = parseCSVLine(lines[0]);
      console.log('ヘッダー:', headers);
      
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0 || values.every(v => !v.trim())) continue;
        
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });
        data.push(row);
      }
      
      console.log('データ解析完了:', data.length, '件');
      
      if (data.length === 0) {
        console.error('有効なデータがありません');
        showToast('有効なデータがありません');
        return;
      }
      
      csvData = data;
      console.log('csvDataに保存');
      
      // プレビュー表示
      const preview = document.getElementById('csv-preview');
      const content = document.getElementById('csv-preview-content');
      
      if (preview && content) {
        preview.style.display = 'block';
        content.innerHTML = `
          <p><strong>${data.length}件のデータ</strong></p>
          <p>カラム: ${headers.join(', ')}</p>
          <hr style="margin: 8px 0;">
          ${data.slice(0, 3).map(row => `<pre style="font-size: 0.75rem; white-space: pre-wrap;">${JSON.stringify(row, null, 2)}</pre>`).join('')}
          ${data.length > 3 ? '<p>...</p>' : ''}
        `;
        console.log('プレビュー表示完了');
      }
      
      // 記事タイトルを抽出
      const csvTitles = [...new Set(data.map(row => {
        const title = row['タイトル'] || row['記事名'] || row['title'] || '';
        return title.trim();
      }).filter(t => t))];
      
      console.log('記事タイトル数:', csvTitles.length);
      
      if (csvTitles.length === 0) {
        console.error('記事名が見つかりません');
        showToast('記事名が見つかりません');
        return;
      }
      
      // 下書き記事を確認
      console.log('Supabaseクエリ開始...');
      const { data: draftArticles, error: draftError } = await supabase
        .from('articles')
        .select('id, title')
        .eq('status', 'draft')
        .in('title', csvTitles);
      
      if (draftError) {
        console.error('Supabaseエラー:', draftError);
      } else {
        console.log('Supabaseクエリ完了');
      }
      
      csvDraftArticles = draftArticles || [];
      console.log('下書き記事数:', csvDraftArticles.length);
      
      const updateStatusGroup = document.getElementById('update-status-group');
      if (updateStatusGroup) {
        if (csvDraftArticles.length > 0) {
          updateStatusGroup.style.display = 'flex';
          const label = updateStatusGroup.querySelector('label');
          if (label) {
            label.textContent = `下書き記事（${csvDraftArticles.length}件）を「投稿済み」に更新する`;
          }
        } else {
          updateStatusGroup.style.display = 'none';
        }
      }
      
      // インポートボタンを有効化
      const importBtn = document.getElementById('import-csv-btn');
      if (importBtn) {
        console.log('=== ボタン有効化 ===');
        console.log('有効化前:', importBtn.disabled);
        importBtn.disabled = false;
        console.log('有効化後:', importBtn.disabled);
      } else {
        console.error('インポートボタンが見つかりません');
      }
      
      console.log('=== processCsvFile 完了 ===');
      
    } catch (error) {
      console.error('=== CSV解析エラー ===');
      console.error(error);
      console.error('スタックトレース:', error.stack);
      showToast('CSVファイルの解析に失敗しました');
    }
  };
  
  reader.onerror = (error) => {
    console.error('=== ファイル読み込みエラー ===');
    console.error(error);
  };
  
  console.log('ファイル読み込み開始...');
  reader.readAsText(file, 'UTF-8');
}

async function importCsv() {
  console.log('=== importCsv 呼び出し ===');
  console.log('isImporting:', isImporting);
  console.log('csvData:', csvData ? `${csvData.length}件` : 'null');
  
  if (isImporting) {
    console.warn('既にインポート中です。処理をスキップします。');
    return;
  }
  
  if (!csvData || csvData.length === 0) {
    console.error('csvDataがありません');
    showToast('CSVファイルを選択してください');
    return;
  }
  
  isImporting = true;
  console.log('isImportingをtrueに設定');
  
  const importBtn = document.getElementById('import-csv-btn');
  if (importBtn) {
    importBtn.disabled = true;
    importBtn.textContent = 'インポート中...';
  }
  
  try {
    const updateDraftStatus = document.getElementById('update-draft-status')?.checked || false;
    const importDate = document.getElementById('csv-date')?.value;
    
    if (!importDate) {
      showToast('日付を選択してください');
      return;
    }
    
    console.log('インポート日付:', importDate);
    console.log('下書き更新:', updateDraftStatus);
    
    // CSVデータを解析
    console.log('ステップ1: CSVデータ解析');
    const analyticsData = csvData.map(row => {
      const title = row['タイトル'] || row['記事名'] || row['title'] || '';
      const pv = parseInt(row['ビュー'] || row['PV'] || row['pv'] || 0) || 0;
      const likes = parseInt(row['スキ'] || row['いいね'] || row['likes'] || 0) || 0;
      const comments = parseInt(row['コメント'] || row['comments'] || 0) || 0;
      
      return {
        article_title: title.trim(),
        pv: pv,
        likes: likes,
        comments: comments
      };
    });
    
    console.log('解析データ件数:', analyticsData.length);
    
    // 記事タイトルを抽出
    console.log('ステップ2: 記事タイトル抽出');
    const uniqueTitles = [...new Set(analyticsData.map(d => d.article_title).filter(t => t))];
    console.log('ユニーク記事数:', uniqueTitles.length);
    
    const articleIdMap = {};
    
    // 既存の記事を取得
    console.log('ステップ3: 既存記事取得');
    const { data: existingArticles, error: existingError } = await supabase
      .from('articles')
      .select('id, title, status')
      .in('title', uniqueTitles);
    
    if (existingError) {
      console.error('既存記事取得エラー:', existingError);
      throw existingError;
    }
    
    (existingArticles || []).forEach(a => {
      articleIdMap[a.title] = a.id;
    });
    
    console.log('既存記事:', Object.keys(articleIdMap).length, '件');
    
    // 下書き記事を更新
    if (updateDraftStatus && csvDraftArticles.length > 0) {
      console.log('ステップ4: 下書き記事更新');
      const draftIds = csvDraftArticles.map(a => a.id);
      const { error: updateError } = await supabase
        .from('articles')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .in('id', draftIds);
      
      if (updateError) {
        console.error('下書き更新エラー:', updateError);
        throw updateError;
      }
      
      console.log('下書き記事を更新:', draftIds.length, '件');
    }
    
    // 新規記事を作成
    const newTitles = uniqueTitles.filter(t => !articleIdMap[t]);
    if (newTitles.length > 0) {
      console.log('ステップ5: 新規記事作成 -', newTitles.length, '件');
      
      const { data: newArticles, error: insertError } = await supabase
        .from('articles')
        .insert(newTitles.map(title => ({ title, status: 'published' })))
        .select();
      
      if (insertError) {
        console.error('新規記事作成エラー:', insertError);
        throw insertError;
      }
      
      (newArticles || []).forEach(a => {
        articleIdMap[a.title] = a.id;
      });
      
      console.log('新規記事作成完了');
      
      // タスクを作成
      console.log('ステップ6: タスク作成');
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
        const { error: taskError } = await supabase
          .from('tasks')
          .insert(tasksToInsert);
        
        if (taskError) {
          console.error('タスク作成エラー:', taskError);
          throw taskError;
        }
        
        console.log('タスク作成完了:', tasksToInsert.length, '件');
      }
    }
    
    // 記事ごとにデータを整理
    console.log('ステップ7: データ整理');
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
    
    console.log('整理後の記事数:', Object.keys(dataByArticle).length);
    
    // 前日までの累積値を計算
    console.log('ステップ8: 前日累積値計算');
    const articleIds = Object.keys(dataByArticle);
    const previousCumulativeByArticle = {};
    
    for (const articleId of articleIds) {
      const { data: previousData, error: prevError } = await supabase
        .from('article_analytics')
        .select('pv, likes, comments')
        .eq('article_id', articleId)
        .lt('date', importDate);
      
      if (prevError) {
        console.error('前日データ取得エラー:', prevError);
        throw prevError;
      }
      
      const cumulative = { pv: 0, likes: 0, comments: 0 };
      
      (previousData || []).forEach(item => {
        cumulative.pv += item.pv || 0;
        cumulative.likes += item.likes || 0;
        cumulative.comments += item.comments || 0;
      });
      
      previousCumulativeByArticle[articleId] = cumulative;
    }
    
    console.log('累積値計算完了');
    
    // 増分を計算
    console.log('ステップ9: 増分計算');
    const analyticsToUpsert = [];
    
    Object.keys(dataByArticle).forEach(articleId => {
      const current = dataByArticle[articleId];
      const previous = previousCumulativeByArticle[articleId] || { pv: 0, likes: 0, comments: 0 };
      
      const deltaPv = Math.max(0, current.pv - previous.pv);
      const deltaLikes = Math.max(0, current.likes - previous.likes);
      const deltaComments = Math.max(0, current.comments - previous.comments);
      
      analyticsToUpsert.push({
        article_id: articleId,
        date: importDate,
        pv: deltaPv,
        likes: deltaLikes,
        comments: deltaComments
      });
    });
    
    console.log('インポートデータ:', analyticsToUpsert.length, '件');
    
    // データベースに保存
    if (analyticsToUpsert.length > 0) {
      console.log('ステップ10: データベース保存');
      const { error: upsertError } = await supabase
        .from('article_analytics')
        .upsert(analyticsToUpsert, { onConflict: 'article_id,date' });
      
      if (upsertError) {
        console.error('Upsertエラー:', upsertError);
        throw upsertError;
      }
      
      console.log('データベース保存完了');
    }
    
    const message = `${analyticsToUpsert.length}件のデータを${importDate}にインポートしました`;
    console.log('=== インポート成功 ===');
    showToast(message);
    
    // モーダルを閉じる
    closeCsvModal();
    
    // データを再読み込み
    console.log('データ再読み込み開始');
    if (typeof loadArticles === 'function') {
      await loadArticles();
      console.log('記事データ再読み込み完了');
    }
    if (typeof loadAnalytics === 'function') {
      await loadAnalytics();
      console.log('分析データ再読み込み完了');
    }
    
    console.log('=== すべての処理完了 ===');
    
  } catch (error) {
    console.error('=== インポートエラー ===');
    console.error('エラー:', error);
    console.error('スタックトレース:', error.stack);
    showToast(`インポートに失敗しました: ${error.message}`);
  } finally {
    isImporting = false;
    console.log('=== finally: isImportingをリセット ===', isImporting);
    
    if (importBtn) {
      importBtn.disabled = false;
      importBtn.textContent = 'インポート';
      console.log('ボタンを再有効化');
    }
  }
}
