// Supabase API呼び出し

async function fetchArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('*, tasks(*)')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function createArticle(articleData) {
  const { data, error } = await supabase
    .from('articles')
    .insert(articleData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function updateArticle(id, articleData) {
  const { error } = await supabase
    .from('articles')
    .update(articleData)
    .eq('id', id);
  
  if (error) throw error;
}

async function deleteArticleById(id) {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

async function upsertTasks(tasks) {
  const { error } = await supabase
    .from('tasks')
    .insert(tasks);
  
  if (error) throw error;
}

async function deleteTasksByArticleId(articleId) {
  await supabase.from('tasks').delete().eq('article_id', articleId);
}

async function fetchArticleAnalytics() {
  const { data, error } = await supabase
    .from('article_analytics')
    .select('*, articles(title)')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function fetchOverallStats() {
  const { data, error } = await supabase
    .from('overall_stats')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function upsertOverallStats(statsData) {
  const { error } = await supabase
    .from('overall_stats')
    .upsert(statsData, { onConflict: 'date' });
  
  if (error) throw error;
}

async function upsertArticleAnalytics(analyticsData) {
  const { error } = await supabase
    .from('article_analytics')
    .upsert(analyticsData, { onConflict: 'article_id,date' });
  
  if (error) throw error;
}
