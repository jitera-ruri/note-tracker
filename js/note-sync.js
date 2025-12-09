async syncFromNote() {
  if (this.isSyncing) {
    showToast('同期処理が既に実行中です');
    return;
  }

  try {
    this.isSyncing = true;
    showToast('noteからデータを取得中...');

    // Cookie情報を取得
    const settings = window.noteSettingsManager.loadSettings();
    
    if (!settings.authToken || !settings.sessionToken) {
      throw new Error('note API認証情報が設定されていません。⚙️ note連携設定から設定してください。');
    }

    // Vercel API Routeを呼び出し
    const response = await fetch('/api/sync-note', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        authToken: settings.authToken,
        sessionToken: settings.sessionToken
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '同期に失敗しました');
    }

    const now = new Date().toLocaleString('ja-JP');
    showToast(`${result.count}件のデータを保存しました（取得時刻: ${now}）`);
    this.saveLastSyncTime();
    showToast('✅ 同期が完了しました。※noteのデータは数時間の遅延があります');

    // グラフを更新
    if (typeof loadAnalytics === 'function') {
      await loadAnalytics();
    }

  } catch (error) {
    console.error('Sync error:', error);
    showToast(`同期エラー: ${error.message}`);
  } finally {
    this.isSyncing = false;
  }
}
