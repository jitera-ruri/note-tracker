/**
 * note APIから全ページのデータを取得
 */
async function fetchAllNoteStats(authToken, sessionToken, maxPages = 10) {
  const allContents = [];
  
  for (let page = 1; page <= maxPages; page++) {
    const url = `https://note.com/api/v1/stats/pv?filter=all&page=${page}&sort=pv`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cookie': `note_gql_auth_token=${authToken}; _note_session_v5=${sessionToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`note API Error: ${response.status}`);
    }

    const data = await response.json();
    const contents = data?.data?.contents || [];
    
    if (contents.length === 0) {
      break; // データがなくなったら終了
    }
    
    allContents.push(...contents);
    
    // レート制限対策: 1秒待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return allContents;
}

/**
 * メインハンドラー（修正版）
 */
export default async function handler(req, res) {
  // CORSヘッダー設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエスト対応
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POSTのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // リクエストボディからCookie情報を取得
    const { authToken, sessionToken } = req.body;

    if (!authToken || !sessionToken) {
      return res.status(400).json({ 
        error: 'Cookie情報が必要です' 
      });
    }

    // noteから全ページのデータ取得
    const articles = await fetchAllNoteStats(authToken, sessionToken, 10);

    if (articles.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'データが取得できませんでした',
        count: 0
      });
    }

    // Supabaseに保存
    const count = await saveAnalytics(articles);

    return res.status(200).json({
      success: true,
      message: '同期が完了しました',
      count: count
    });

  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
