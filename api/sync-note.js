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
 * note APIから全ページのデータを取得
 */
async function fetchAllNoteStats(authToken, sessionToken, maxPages = 20) {
  const allContents = [];
  
  for (let page = 1; page <= maxPages; page++) {
    const url = `https://note.com/api/v1/stats/pv?filter=all&page=${page}&sort=pv`;
    
    console.log(`Fetching page ${page}...`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cookie': `note_gql_auth_token=${authToken}; _note_session_v5=${sessionToken}`
      }
    });

    if (!response.ok) {
      console.error(`API Error on page ${page}: ${response.status}`);
      throw new Error(`note API Error: ${response.status}`);
    }

    const data = await response.json();
    const contents = data?.data?.note_stats || [];
    
    console.log(`Page ${page}: ${contents.length} articles found`);
    
    if (contents.length === 0) {
      break;
    }
    
    allContents.push(...contents);
    
    // last_pageフラグをチェック
    if (data?.data?.last_page === true) {
      console.log(`Last page reached at page ${page}`);
      break;
    }
    
    // レート制限対策: 500ms待機（1秒から短縮）
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`Total articles fetched: ${allContents.length}`);
  return allContents;
}

/**
 * 分析データを保存（バッチ処理で高速化）
 */
async function saveAnalytics(articles) {
  const today = new Date().toISOString().split('T')[0];
  const articleRecords = [];
  const analyticsRecords = [];

  console.log(`Processing ${articles.length} articles...`);

  // データを整形（Supabaseへの保存は後でまとめて行う）
  for (const article of articles) {
    const articleId = String(article.id || article.key);
    const title = article.name || article.title || '無題';
    const urlname = article.user?.urlname || 'unknown';
    const url = `https://note.com/${urlname}/n/${article.key}`;
    
    const pv = article.read_count || 0;
    const likes = article.like_count || 0;
    const comments = article.comment_count || 0;

    // 記事マスタ用データ
    articleRecords.push({
      id: articleId,
      title: title,
      url: url,
      status: 'published',
      updated_at: new Date().toISOString()
    });

    // 分析データ
    analyticsRecords.push({
      article_id: articleId,
      date: today,
      pv: pv,
      likes: likes,
      comments: comments
    });
  }

  // 記事マスタを一括登録
  console.log(`Upserting ${articleRecords.length} articles...`);
  const { error: articleError } = await supabase
    .from('articles')
    .upsert(articleRecords, {
      onConflict: 'id',
      ignoreDuplicates: false
    });

  if (articleError) {
    console.error('Article upsert error:', articleError);
    // 記事マスタのエラーは致命的ではないので続行
  }

  // 既存の分析データを削除
  console.log(`Deleting existing analytics for ${today}...`);
  const { error: deleteError } = await supabase
    .from('article_analytics')
    .delete()
    .eq('date', today);

  if (deleteError) {
    console.error('Delete error:', deleteError);
  }

  // 新しい分析データを一括挿入
  console.log(`Inserting ${analyticsRecords.length} analytics records...`);
  const { error: insertError } = await supabase
    .from('article_analytics')
    .insert(analyticsRecords);

  if (insertError) {
    console.error('Insert error:', insertError);
    throw insertError;
  }

  // 合計を計算
  const totalPV = analyticsRecords.reduce((sum, r) => sum + r.pv, 0);
  const totalLikes = analyticsRecords.reduce((sum, r) => sum + r.likes, 0);
  const totalComments = analyticsRecords.reduce((sum, r) => sum + r.comments, 0);
  
  console.log('=== SAVED TOTALS ===');
  console.log(`Total PV: ${totalPV}`);
  console.log(`Total Likes: ${totalLikes}`);
  console.log(`Total Comments: ${totalComments}`);

  return analyticsRecords.length;
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
    console.log('=== SYNC START ===');
    const startTime = Date.now();
    
    // リクエストボディからCookie情報を取得
    const { authToken, sessionToken } = req.body;

    if (!authToken || !sessionToken) {
      return res.status(400).json({ 
        error: 'Cookie情報が必要です' 
      });
    }

    // noteから全ページのデータ取得
    const articles = await fetchAllNoteStats(authToken, sessionToken, 20);

    if (articles.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'データが取得できませんでした',
        count: 0
      });
    }

    // Supabaseに保存
    const count = await saveAnalytics(articles);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`=== SYNC COMPLETE (${duration}s) ===`);

    return res.status(200).json({
      success: true,
      message: '同期が完了しました',
      count: count,
      duration: duration
    });

  } catch (error) {
    console.error('=== SYNC ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
