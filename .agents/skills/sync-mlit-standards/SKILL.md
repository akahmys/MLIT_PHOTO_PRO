---
name: sync-mlit-standards
description: MLIT（国土交通省）の電子納品関連基準を公式サイトから自動取得・同期するためのスキルです。
---

# sync-mlit-standards

このスキルは、公式サイト `https://www.cals-ed.go.jp/cri_point/` を解析し、最新の基準情報（PDFリンク、改定日、名称）をプロジェクトの `src/constants/standards.js` および `standards/` ディレクトリに同期します。

## 🛠 構成
- `src/constants/standards.js`: **Single Source of Truth (SSOT)**。配信対象となる基準のメタデータ（URL、ID、カテゴリ等）を管理します。
- `scripts/fetch_latest.cjs`: 公式サイトから最新の基準メタデータを JSON として抽出します。
- `scripts/compare_and_sync.cjs`: `standards.js` を基点に、不足しているPDFのダウンロード、URLの更新、不要なファイルのクリーンアップを行います。

## 🚀 実行手順

1. **最新情報の取得とメタデータ監査**
   - ターミナルで `node .agents/skills/sync-mlit-standards/scripts/fetch_latest.cjs | node .agents/skills/sync-mlit-standards/scripts/audit_metadata.cjs` を実行します。
   - このコマンドは、公式サイトの最新情報と現在の `standards.js` を比較し、新規に追加可能な基準や補足資料（解説等）をレポートします。
   - レポート内容を元に、必要に応じて `standards.js` を手動で更新（＝見直し）します。

2. **比較と同期の実行**
   - `standards.js` の見直しが完了したら、パイプラインを使用して同期を実行します：
     `node fetch_latest.cjs | node compare_and_sync.cjs`
   - このコマンドにより以下の処理が実行されます：
     - **メタデータ同期**: `standards.js` 内の各基準について、`file_url` だけでなく `commentary_url`（解説）、`comparison_url`（対照表）等の複数ファイルも対象に同期します。
     - **アーカイブ機能**: すでに存在するファイルでURLが更新された場合、旧ファイルを `archive/` ディレクトリに退避します。
     - **クリーンアップ**: `standards.js` で管理されていないファイルが `standards/` ディレクトリに存在する場合、自動的に削除します。
     - **履歴の保存**: 更新内容を `history.md` (閲覧用) および `history.json` (データ用) に記録します。

3. **レポートの確認**
   - 実行後に出力される「基準同期レポート」を確認し、意図したファイルがダウンロード・更新されたか検証します。

## 🛡 実行の安全基準
- **SSOTの遵守**: ダウンロード対象は常に `standards.js` に定義されたものに限定されます。新しく基準を追加する場合は、まず `standards.js` にエントリを追加してください。
- **リトライ制限**: 通信エラー時は最大3回までリトライします。
- **User-Agentの設定**: サーバー負荷とアクセス制限を考慮し、適切な User-Agent ヘッダーを使用します。

## ⚠️ 注意事項
- 営繕（Eizen）など、メインサイト以外に存在する基準は手動で `standards.js` にURLを定義する必要があります。
- PDFのファイル名は、URLのベース名に役割（`_commentary` 等）を付与した形式で保存されます。
