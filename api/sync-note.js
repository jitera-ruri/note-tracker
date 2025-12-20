import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== SYNC START ===');
  
  // bodyが文字列の場合はパース
  let body = req.body;
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body);
    } catch (e) {
      console.error('Body parse error:', e);
    }
  }

  const cookies = body?.cookies;

  if (!cookies || !cookies.note_gql_auth_token || !cookies._note_session_v5) {
    console.log('Missing cookies - returning 400');
    return res.status(400).json({ error: 'Cookie情報が必要です' });
  }

  try {
    // noteのダッシュボードAPIを呼び出し（新しいエンドポイント）
    const noteResponse = await fetch('https://note.com/api/v1/stats/pv?filter=all&page=1&sort=pv', {
      headers: {
        'Cookie': `note_gql_auth_token=${cookies.note_gql_auth_token}; _note_session_v5=${cookies._note_session_v5}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://note.com/dashboard/stats'
      }
    });

    console.log('note API status:', noteResponse.status);

    if (!noteResponse.ok) {
      const errorText = await noteResponse.text();
      console.error('note API error:', errorText);
      return res.status(noteResponse.status).json({ 
        error: 'note APIエラー',
        details: errorText 
      });
    }

    const noteData = await noteResponse.json();
    console.log('note API response:', JSON.stringify(noteData).substring(0, 500));

    // データ構造を確認してパース
    const articles = noteData?.data?.contents || noteData?.data?.note_stats || noteData?.contents || [];
    console.log('Articles count:', articles.length);

    const today = new Date().toISOString().split('T')[0];

    for (const article of articles) {
      // 記事IDとURLを取得（データ構造に応じて調整）
      const articleId = article.key || article.id || article.note_id;
      const articleTitle = article.name || article.title;
      const articleUrl = article.note_url 
        ? `https://note.com${article.note_url}` 
        : (article.url || '');

      if (!articleId) {
        console.log('Skipping article without ID:', article);
        continue;
      }

      // articlesテーブルにupsert
      const { error: articleError } = await supabase
        .from('articles')
        .upsert({
          id: articleId,
          title: articleTitle,
          url: articleUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (articleError) {
        console.error('Article upsert error:', articleError);
      }

      // article_analyticsテーブルにupsert
      const { error: analyticsError } = await supabase
        .from('article_analytics')
        .upsert({
          article_id: articleId,
          date: today,
          pv: article.read_count || article.pv || 0,
          likes: article.like_count || article.likes || 0,
          comments: article.comment_count || article.comments || 0
        }, { onConflict: 'article_id,date' });

      if (analyticsError) {
        console.error('Analytics upsert error:', analyticsError);
      }
    }

    console.log('=== SYNC COMPLETE ===');
    
    return res.status(200).json({ 
      success: true, 
      message: `${articles.length}件の記事を同期しました`,
      count: articles.length
    });

  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ 
      error: 'サーバーエラー',
      details: error.message 
    });
  }
}
