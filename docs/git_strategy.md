# Git 管理対象ファイルの検討結果

プロジェクトの再構成後、Git で管理すべきファイル（Tracked）と、管理から外すべきファイル（Ignored）を以下のように整理しました。

## 1. 管理対象とするファイル (Tracked)
これらはアプリの動作、ビルド、および開発継続に必須のコードとリソースです。

- **`app/` フォルダ内のソースコード一式**
  - `app/src/`, `app/public/`, `app/index.html`
  - `app/package.json`, `app/vite.config.js`, `app/eslint.config.js`
- **開発ツール (`dev_tools/`)**
  - `dev_tools/scripts/` (パース用スクリプト)
  - `dev_tools/raw_data/` (Excelデータ、PDF基準原本)
- **ドキュメント (`docs/`, ルート)**
  - `docs/user_guide.md`
  - `README.md`, `LICENSE`, `rules.md`
- **構成・設定ファイル**
  - `package.json` (ルートプロキシ)
  - `.gitignore`

## 2. 管理から除外するファイル (Ignored)
これらはビルド済みの成果物や、個々の開発環境に依存するファイルです。

- **`node_modules/`** (ルートおよび `app/node_modules`)
- **`dist/`** (ビルド成果物)
- **`.vite/`** (キャッシュ)
- **`tests/`** (サンプル写真などのテスト資材)
- **`.agents/`, `.gemini/`** (AIアシスタントの内部メタデータ/ログ)
- **`.DS_Store`** などのOS依存ファイル

## 3. 特記事項: 巨大ファイルの扱い
- `dev_tools/raw_data/codedata.xlsx` (約6.9MB) は現在 Git 管理対象として含める方針です。
- リポジトリのさらなる軽量化が必要になった場合は、Git LFS への移行を検討してください。

## 推奨される操作手順

まず、現在の `.gitignore` が最新であることを確認した上で、以下のコマンドを実行することを推奨します。

```bash
# 1. 念のため未追跡ファイルをすべて追加（.gitignore により不要なものは除外されます）
git add .

# 2. ステージング状態の確認
git status
```

> [!TIP]
> もし過去に誤って `node_modules` や `dist` を追加してしまっていた場合は、`git rm -r --cached <dir>` でインデックスから削除してからコミットしてください。
