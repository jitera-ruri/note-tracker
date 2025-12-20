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
function openNoteSettings() {
  loadNoteSettings();
  document.getElementById('note-settings-modal').classList.add('active');
}

// 設定モーダルを閉じる
function closeNoteSettings() {
  document.getElementById('note-settings-modal').classList.remove('active');
}

// 設定保存
async function saveNoteSettings() {
  const authToken = document.getElementById('note-auth-token').value.trim();
  const session = document.getElementById('note-session').value.trim();
  
  if (!authToken || !session) {
    showToast('認証トークンとセッションの両方を入力してください');
    return;
  }
  
  // ローカルストレージに保存
  localStorage.setItem('note_auth_token', authToken);
  localStorage.setItem('note_session', session);
  
  // Supabaseにも保存（APIがあれば）
  try {
    await fetchAPI('/api/settings/note-credentials', {
      method: 'POST',
      body: JSON.stringify({
        auth_token: authToken,
        session: session
      })
    });
  } catch (error) {
    console.warn('サーバーへの設定保存をスキップ:', error);
  }
  
  closeNoteSettings();
  showToast('設定を保存しました');
}
