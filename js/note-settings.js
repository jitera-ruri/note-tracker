/**
 * note設定管理
 * Cookie認証情報の保存・読み込み
 */

class NoteSettingsManager {
  constructor() {
    this.storageKey = 'note_api_settings';
    this.loadSettings();
  }

  /**
   * 設定を読み込み
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const settings = JSON.parse(saved);
        
        // APIクライアントに認証情報を設定
        if (settings.authToken && settings.sessionToken) {
          window.noteAPIClient.setAuth(settings.authToken, settings.sessionToken);
        }
        
        return settings;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return {};
  }

  /**
   * 設定を保存
   */
  saveSettings(authToken, sessionToken) {
    try {
      const settings = {
        authToken: authToken,
        sessionToken: sessionToken,
        savedAt: new Date().toISOString()
      };

      localStorage.setItem(this.storageKey, JSON.stringify(settings));
      
      // APIクライアントに認証情報を設定
      window.noteAPIClient.setAuth(authToken, sessionToken);
      
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  /**
   * 設定をクリア
   */
  clearSettings() {
    localStorage.removeItem(this.storageKey);
    window.noteAPIClient.setAuth(null, null);
  }

  /**
   * 設定が存在するかチェック
   */
  hasSettings() {
    const settings = this.loadSettings();
    return !!(settings.authToken && settings.sessionToken);
  }
}

// グローバルインスタンス
window.noteSettingsManager = new NoteSettingsManager();

/**
 * note設定モーダルを開く
 */
function openNoteSettingsModal() {
  const settings = window.noteSettingsManager.loadSettings();
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h2>note連携設定</h2>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="note-auth-token">note_gql_auth_token</label>
          <input 
            type="text" 
            id="note-auth-token" 
            class="form-control" 
            placeholder="ブラウザのCookieから取得"
            value="${settings.authToken || ''}"
          >
          <small class="form-text">
            ブラウザの開発者ツールから取得してください
            <a href="#" onclick="showCookieGuide(); return false;">取得方法を見る</a>
          </small>
        </div>
        
        <div class="form-group">
          <label for="note-session-token">_note_session_v5</label>
          <input 
            type="text" 
            id="note-session-token" 
            class="form-control" 
            placeholder="ブラウザのCookieから取得"
            value="${settings.sessionToken || ''}"
          >
        </div>

        <div class="alert alert-info">
          <strong>注意:</strong> Cookie情報は定期的に更新が必要です（通常30日程度）
        </div>

        ${settings.savedAt ? `
          <div class="form-group">
            <small>最終保存: ${new Date(settings.savedAt).toLocaleString('ja-JP')}</small>
          </div>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
        <button class="btn btn-danger" onclick="clearNoteSettings()">設定をクリア</button>
        <button class="btn btn-primary" onclick="testNoteConnection()">接続テスト</button>
        <button class="btn btn-success" onclick="saveNoteSettings()">保存</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'flex';
}

/**
 * note設定を保存
 */
async function saveNoteSettings() {
  const authToken = document.getElementById('note-auth-token').value.trim();
  const sessionToken = document.getElementById('note-session-token').value.trim();

  if (!authToken || !sessionToken) {
    showNotification('両方のCookie情報を入力してください', 'error');
    return;
  }

  const success = window.noteSettingsManager.saveSettings(authToken, sessionToken);
  
  if (success) {
    showNotification('設定を保存しました', 'success');
    closeModal();
  } else {
    showNotification('設定の保存に失敗しました', 'error');
  }
}

/**
 * note設定をクリア
 */
function clearNoteSettings() {
  if (confirm('note連携設定をクリアしますか？')) {
    window.noteSettingsManager.clearSettings();
    showNotification('設定をクリアしました', 'success');
    closeModal();
  }
}

/**
 * note接続テスト
 */
async function testNoteConnection() {
  const authToken = document.getElementById('note-auth-token').value.trim();
  const sessionToken = document.getElementById('note-session-token').value.trim();

  if (!authToken || !sessionToken) {
    showNotification('両方のCookie情報を入力してください', 'error');
    return;
  }

  // 一時的に認証情報を設定
  window.noteAPIClient.setAuth(authToken, sessionToken);

  showNotification('接続テスト中...', 'info');

  const result = await window.noteAPIClient.testConnection();
  
  if (result.success) {
    showNotification('✅ 接続成功！note APIと通信できます', 'success');
  } else {
    showNotification(`❌ 接続失敗: ${result.message}`, 'error');
  }
}

/**
 * Cookie取得ガイドを表示
 */
function showCookieGuide() {
  const guideModal = document.createElement('div');
  guideModal.className = 'modal';
  guideModal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h2>Cookie情報の取得方法</h2>
        <button class="close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
        <h3>Chrome / Edge の場合</h3>
        <ol>
          <li>note.com にログインした状態でページを開く</li>
          <li>F12キーを押して開発者ツールを開く</li>
          <li>「Application」タブをクリック</li>
          <li>左側メニューの「Cookies」→「https://note.com」を選択</li>
          <li>以下の2つのCookieを探してコピー:
            <ul>
              <li><code>note_gql_auth_token</code></li>
              <li><code>_note_session_v5</code></li>
            </ul>
          </li>
        </ol>

        <h3>Firefox の場合</h3>
        <ol>
          <li>note.com にログインした状態でページを開く</li>
          <li>F12キーを押して開発者ツールを開く</li>
          <li>「ストレージ」タブをクリック</li>
          <li>左側メニューの「Cookie」→「https://note.com」を選択</li>
          <li>上記と同じCookieをコピー</li>
        </ol>

        <h3>Safari の場合</h3>
        <ol>
          <li>「開発」メニューを有効化（環境設定→詳細）</li>
          <li>note.com にログインした状態でページを開く</li>
          <li>「開発」→「Webインスペクタを表示」</li>
          <li>「ストレージ」タブ→「Cookie」を選択</li>
          <li>上記と同じCookieをコピー</li>
        </ol>

        <div class="alert alert-warning" style="margin-top: 20px;">
          <strong>⚠️ セキュリティ注意:</strong>
          <ul>
            <li>Cookie情報は他人に教えないでください</li>
            <li>公共のPCでは使用しないでください</li>
            <li>Cookie情報は定期的に更新されます（約30日）</li>
          </ul>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="closeModal()">閉じる</button>
      </div>
    </div>
  `;
  
  // 既存のモーダルを閉じる
  closeModal();
  
  document.body.appendChild(guideModal);
  guideModal.style.display = 'flex';
}
