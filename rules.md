# 🛠️ MLIT Photo Pro: プロジェクト固有ルール

本ファイルは「MLIT Photo Pro」プロジェクト特有の技術スタックと個別の規約を定義します。
※全般的な品質基準、日本語の使用、エラーハンドリング等はグローバル設定の `GEMINI.md` に従います。

## 1. テックスタック & UI/UX (Project Specific)

1. **基本構成: Vite + React + TailwindCSS**
   - 高度な状態管理とコンポーネント指向のため Vite + React を使用。
   - スタイリングは TailwindCSS を優先し、必要最小限のグローバルCSS (`index.css`) で補完。
2. **モダンで洗練されたUI/UXデザイン (Vibe Coding)**
   - 調和の取れた配色、ダークモード、グラスモーフィズム、マイクロアニメーションを初期段階から積極的に導入し、ユーザー体験 (UX) を最大化。

## 2. 実装上の細則 (Implementation Details)

1. **命名規則の統一: キャメルケース**
   - グローバルの命名基準に加え、本プロジェクトでは原則として **キャメルケース (`camelCase`)** で統一。
2. **肯定的なアプローチ**
   - 原則として「〜すること」という肯定的な表現で実装方針やプロンプトを記述し、AIの動作を明確に誘導。

## 3. 参照基準データ (Reference Standards Data)

国土交通省の各基準・要領の情報（名称、URL、概要等）は、以下のインデックスファイルで一元管理しています。
- **インデックスファイル**: [src/constants/standards.js](file:///Users/jun/.gemini/antigravity/scratch/mlit-photo-pro/src/constants/standards.js)

## 4. 外部データ取得の原則 (Data Acquisition Principles)

1. **非ブラウザ操作の優先**
   - 外部Webページからのデータ取得（スクレイピングやファイルダウンロード等）を行う際は、可能な限りブラウザ操作（`browser_subagent`等）を避け、`curl`、`fetch`、または `read_url_content` 等の直接的な通信手段を優先すること。これにより、実行速度の向上とリソース消費の抑制を図る。
