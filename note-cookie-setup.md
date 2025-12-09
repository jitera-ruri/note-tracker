# note Cookie情報の取得手順書

note APIと連携するために必要なCookie情報の取得方法を説明します。

## 📋 必要なCookie情報

以下の2つのCookie値が必要です：

1. `note_gql_auth_token`
2. `_note_session_v5`

---

## 🌐 Chrome / Microsoft Edge での取得方法

### 手順

1. **noteにログイン**
   - ブラウザで [https://note.com](https://note.com) を開く
   - 自分のアカウントでログインする

2. **開発者ツールを開く**
   - キーボードの `F12` キーを押す
   - または、右クリック→「検証」を選択

3. **Applicationタブを開く**
   - 開発者ツール上部の「Application」タブをクリック
   - （日本語版の場合は「アプリケーション」）

4. **Cookieを表示**
   - 左側メニューの「Storage」セクションを展開
   - 「Cookies」→「https://note.com」を選択

5. **Cookie値をコピー**
   - 一覧から `note_gql_auth_token` を探す
   - 「Value」列の値を全選択してコピー（Ctrl+C）
   - 同様に `_note_session_v5` の値もコピー

### スクリーンショット例

