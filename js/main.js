// Supabase初期化
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  const currentTab = getCurrentTab();
  
  if (currentTab === 'progress') {
    await loadArticles();
  } else if (currentTab === 'analytics') {
    // loadAnalyticsが定義されているか確認
    if (typeof loadAnalytics === 'function') {
      await loadAnalytics();
    } else {
      console.warn('loadAnalytics is not defined yet');
    }
  }
  
  initTabs();
});

// タブ切り替え
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', async function() {
      const targetTab = this.getAttribute('data-tab');
      
      // アクティブ状態を切り替え
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // コンテンツを切り替え
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      const targetContent = document.getElementById(`${targetTab}-tab`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
      
      // タブに応じてデータを読み込み
      if (targetTab === 'progress') {
        await loadArticles();
      } else if (targetTab === 'analytics') {
        // loadAnalyticsが定義されているか確認
        if (typeof loadAnalytics === 'function') {
          await loadAnalytics();
        }
      }
      
      // URLを更新
      history.pushState(null, '', `?tab=${targetTab}`);
    });
  });
}

// 現在のタブを取得
function getCurrentTab() {
  const params = new URLSearchParams(window.location.search);
  return params.get('tab') || 'progress';
}
