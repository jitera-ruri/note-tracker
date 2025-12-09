/**
 * note API クライアント
 * note非公式APIとの通信を担当
 */

class NoteAPIClient {
  constructor() {
    this.baseURL = 'https://note.com/api';
    this.authToken = null;
    this.sessionToken = null;
    this.isAuthenticated = false;
  }

  /**
   * Cookie認証情報を設定
   */
  setAuth(authToken, sessionToken) {
    this.authToken = authToken;
    this.sessionToken = sessionToken;
    this.isAuthenticated = !!(authToken && sessionToken);
  }

  /**
   * 認証状態をチェック
   */
  checkAuth() {
    if (!this.isAuthenticated) {
      throw new Error('note API認証情報が設定されていません。設定画面からCookie情報を入力してください。');
    }
  }

  /**
   * APIリクエストを送信
   */
  async request(endpoint, options = {}) {
    this.checkAuth();

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': `note_gql_auth_token=${this.authToken}; _note_session_v5=${this.sessionToken}`,
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('note API request failed:', error);
      throw error;
    }
  }

  /**
   * ダッシュボードのPVデータを取得
   * @param {string} filter - 'all', 'note', 'magazine' など
   * @param {number} page - ページ番号
   * @param {string} sort - 'pv', 'like', 'comment' など
   */
  async getStats(filter = 'all', page = 1, sort = 'pv') {
    const endpoint = `/v1/stats/pv?filter=${filter}&page=${page}&sort=${sort}`;
    return await this.request(endpoint);
  }

  /**
   * 記事一覧を取得
   * @param {string} urlname - ユーザーのURL名
   * @param {number} page - ページ番号
   */
  async getUserNotes(urlname, page = 1) {
    const endpoint = `/v2/creators/${urlname}/contents?kind=note&page=${page}`;
    return await this.request(endpoint);
  }

  /**
   * 記事の詳細情報を取得
   * @param {string} noteKey - 記事のキー (例: n4f0c7b884789)
   */
  async getNoteDetail(noteKey) {
    const endpoint = `/v3/notes/${noteKey}`;
    return await this.request(endpoint);
  }

  /**
   * 接続テスト
   */
  async testConnection() {
    try {
      this.checkAuth();
      // 簡単なエンドポイントで接続確認
      await this.getStats('all', 1, 'pv');
      return { success: true, message: '接続成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 複数ページのデータを取得
   */
  async getAllStats(filter = 'all', maxPages = 10) {
    const allData = [];
    
    for (let page = 1; page <= maxPages; page++) {
      try {
        const data = await this.getStats(filter, page, 'pv');
        
        if (!data || !data.data || !data.data.contents || data.data.contents.length === 0) {
          break; // データがなくなったら終了
        }
        
        allData.push(...data.data.contents);
        
        // レート制限対策: 1秒待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Page ${page} fetch failed:`, error);
        break;
      }
    }
    
    return allData;
  }
}

// グローバルインスタンス
window.noteAPIClient = new NoteAPIClient();
