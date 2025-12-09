/**
 * note同期処理（Vercel API Route版）
 */

class NoteSyncManager {
  constructor() {
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.loadLastSyncTime();
  }

  loadLastSyncTime() {
    const saved = localStorage.getItem('note_last_sync_time');
    if (saved) {
      this.lastSyncTime = new Date(saved);
    }
  }

  saveLastSyncTime() {
    this.lastSyncTime = new Date();
    localStorage.setItem('note_last_sync_time', this.lastSyncTime.toISOString());
    this.updateSyncStatusUI();
  }

  updateSyncStatusUI() {
    const statusElement = document.getElementById('last-sync-time');
    if (statusElement && this.lastSyncTime) {
      statusElement.textContent = this.lastSyncTime.toLocaleString('ja-JP');
    }
  }

  /**
   * noteからデータを同期（Vercel API経由）
   */
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
        throw new Error('note API認証情報が設定されていません');
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

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '同期に失敗しました');
      }

      showToast(`${result.count}件のデータを保存しました`);
      this.saveLastSyncTime();
      showToast('同期が完了しました');

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
}

// グローバルインスタンス
window.noteSyncManager = new NoteSyncManager();

// グローバル関数
async function syncFromNote() {
  await window.noteSyncManager.syncFromNote();
}
