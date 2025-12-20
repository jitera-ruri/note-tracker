/**
 * note アクセス解析ツール - note連携設定
 */

// 設定読み込み
function loadNoteSettings() {
  const authToken = localStorage.getItem('note_auth_token');
  const session = localStorage.getItem('note_session');
  
  const authTokenInput = document.getElementById('note-auth-token');
  const sessionInput = document.getElementById('note-session');
  
  if (authTokenInput && authToken) {
    authTokenInput.value = authToken;
  }
  if (sessionInput && session) {
    sessionInput.value = session;
  }
}

// 設定モーダルを開く
function openNoteSettingsModal() {
  loadNoteSettings();
  const modal = document.getElementById('note-settings-modal');
  if (modal) {
    modal.classList.add('active');
  }
}

// 設定モーダルを閉じる
function closeNoteSettingsModal() {
  const modal = document.getElementById('note-settings-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// 設定保存
async function saveNoteSettings() {
  const authTokenInput = document.getElementById('note-auth-token');
  const sessionInput = document.getElementById('note-session');
  
  const authToken = authTokenInput ? authTokenInput.value.trim() : '';
  const session = sessionInput ? sessionInput.value.trim() : '';
  
  if (!authToken || !session) {
    showToast('認証トークンとセッションの両方を入力してください');
    return;
  }
  
  // ローカルストレージに保存
  localStorage.setItem('note_auth_token', authToken);
  localStorage.setItem('note_session', session);
  
  closeNoteSettingsModal();
  showToast('設定を保存しました');
}
