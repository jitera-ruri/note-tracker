/**
 * Vercel Serverless Function
 * note APIからデータを取得してSupabaseに保存
 */

import { createClient } from '@supabase/supabase-js';

// Supabaseクライアント初期化
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * note APIからデータを取得
 */
async function fetchNoteStats(authToken, sessionToken) {
  const url = 'https://note.com/api/v1/stats/pv?filter=all&page=1&sort=pv';
  
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
  return data?.data?.contents || [];
}

/**
 * 記事マスタに登録
 */
async function upsertArticle(articleId, title, url) {
  try {
    await supabase
      .from('articles')
      .upsert({
        id: articleId,
        title: title,
        url: url,
        status: 'published',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
  } catch (error) {
    console.error('Article upsert error:', error);
  }
}

/**
 * 分析データを保存
 */
async function saveAnalytics(articles) {
  const today = new Date().toISOString().split('T')[0];
  const records = [];

  for (const article of articles) {
    const articleId = article.id || article.key;
    const title = article.name || article.title || '無題';
    const url = article.noteUrl || `https://note.com/${article.userUrlname}/n/${article.key}`;
    const pv = article.readCount || article.pv || 0;
    const likes = article.likeCount || article.likes || 0;
    const comments = article.commentCount || article.comments || 0;

    // 記事マスタに登録
    await upsertArticle(articleId, title, url);

    // 分析データを追加
    records.push({
      article_id: articleId,
      date: today,
      pv: pv,
      likes: likes,
      comments: comments
    });
  }

  // 既存データを削除
  await supabase
    .from('article_analytics')
    .delete()
    .eq('date', today);

  // 新しいデータを挿入
  const { error } = await supabase
    .from('article_analytics')
    .insert(records);

  if (error) throw error;

  return records.length;
}

/**
 * メインハンドラー
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

    // noteからデータ取得
    const articles = await fetchNoteStats(authToken, sessionToken);

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
