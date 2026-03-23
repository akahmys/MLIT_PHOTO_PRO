import { STANDARDS_MAP } from '../constants/standards.js';
import { WORK_MASTER } from '../constants/master.js';

        /* ======================================================
           ユーティリティ関数
           ====================================================== */

        /**
         * 全角→半角変換・制御文字除去
         * 出典: ZH005-00-24-A 6章 使用文字
         * 「全角の数字・ラテン文字は使用不可、数字やラテン文字は半角文字で統一」
         */
export const sanitizeForJS = (text) => {
            if (!text) return "";
            return String(text)
                .replace(/[０-９ａ-ｚＡ-Ｚ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
                // eslint-disable-next-line no-control-regex
                .replace(/[\x00-\x1F\x7F]/g, '')
                .slice(0, 255);
        };

        /** XML特殊文字エスケープ */
export const esc = (s) => {
            if (!s) return "";
            return String(s).replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": `&gt;`, "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));
        };

        /**
         * 撮影年月日フォーマット
         * JS要領正式: CCYY-MM-DD（ハイフン含む10桁固定）
         * 出典: ZH005-00-24-A 表5-1
         *   「CCYY-MM-DD方式で記入する。月又は日が1桁の数の場合0を付加して必ず10桁で記入」
         * ・UIはYYYY-MM-DD（date input）で入力→そのままXMLに出力
         * ・旧システム由来の YYYYMMDD（8桁、ハイフンなし）形式は読込時に変換
         * dateToXml / dateFromXml は同一変換なので共通化
         */
export const dateToXml = (d) => {
            if (!d) return "";
            if (/^\d{8}$/.test(d)) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
            return d;
        };
export const dateFromXml = dateToXml; // 変換ロジックが同一のためエイリアス

        /**
         * シリアル番号生成
         * 出典: ZH005-00-24-A 表5-1 シリアル番号欄
         *   「写真通し番号。123枚目を"000123"のように0を付けて記入してはいけない」
         *   データ表現: 半角数字 文字数: 7
         * ⚠️ ゼロ埋めなし・Pプレフィックスなし・純粋な半角数字のみ
         * 例: toSerial(1) → "1", toSerial(123) → "123"
         */
export const toSerial = (n) => String(Math.max(1, parseInt(n) || 1));

        /**
         * 写真ファイル名を生成
         * 出典: ZH005-00-24-A 表4-1 ファイル命名規則
         * H30系: P + 7桁英数字 + .JPG  （12文字固定）
         * R06系: P + 7桁英数字 + .XXXX （13文字以内、拡張子4文字以内）
         */
export const makeFileName = (n, stdId) => {
    const std = STANDARDS_MAP[stdId];
    const ext = std?.defaultExt || "JPG";
    return `P${String(n).padStart(7, '0')}.${ext}`;
};

        /** ファイル名から番号部分を取り出す（例: P0000001.JPG → 1） */
export const parseFileNum = (name) => {
            const m = String(name || '').match(/^P(\d{7})\./i);
            return m ? parseInt(m[1]) : 0;
        };

        /**
         * 既存XMLのシリアル番号を正規化
         * 旧システムが「P0000001」「00000001」等で書いていた場合に対応
         */
export const parseSerialNum = (s) => {
            if (!s) return 0;
            return parseInt(String(s).replace(/^P0*/i, '').replace(/^0+/, '')) || 0;
        };

        /**
         * Date → "CCYY-MM-DD" 文字列変換
         * loadFolder / processDropFiles / handleMerge で共通使用
         */
export const dateToStr = (d) => {
            const dt = d instanceof Date ? d : new Date(d);
            return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        };

        /**
         * EXIFから撮影日を取得して "CCYY-MM-DD" 文字列を返す
         * EXIFがない・読み取れない場合は "" を返す（lastModifiedフォールバックなし）
         * loadFolder / processDropFiles / handleMerge で共通使用
         */
export const readExifDate = async (file) => {
            try {
                if (!window.exifr) return "";
                const exifData = await window.exifr.parse(file);
                if (!exifData?.DateTimeOriginal) return "";
                let pd = exifData.DateTimeOriginal;
                if (typeof pd === 'string') pd = new Date(pd.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3"));
                return (pd instanceof Date && !isNaN(pd.getTime())) ? dateToStr(pd) : "";
            } catch { return ""; }
        };

        /**
         * workType文字列からdiscipline（工事種別）を逆引き
         * loadFolder / handleMerge で共通使用
         */
export const findDiscipline = (workType) => {
            if (!workType) return "";
            const m = WORK_MASTER.find(m => m.workTypes.some(w => w.name === workType));
            return m ? m.discipline : "";
        };

        /**
         * PHOTOフォルダハンドルを取得
         * rootHandle が PHOTO フォルダ自身の場合と親フォルダの場合の両方に対応
         * create=true の場合はフォルダが存在しなければ作成する
         * handleDelete / handleRename / handleMerge / processDropFiles 等で共通使用
         */
export const getPhotoDir = async (rootHandle, std, create = false) => {
    const photoFolder = std.photoFolder || "PHOTO";
    if (rootHandle.name === photoFolder) return rootHandle;
    return rootHandle.getDirectoryHandle(photoFolder, { create });
};

        /**
         * PHOTO.XML の写真情報ノード群からxmlMapを構築
         * loadFolder / handleMerge で完全に同一のロジックが重複していたため共通化
         */
export const buildXmlMapFromNodes = (nodes) => {
            const map = {};
            for (let i = 0; i < nodes.length; i++) {
                const g = (tag) => nodes[i].getElementsByTagName(tag)[0]?.textContent?.trim() || "";
                const fn = g("写真ファイル名").toUpperCase();
                if (!fn) continue;
                const rawSerial = g("シリアル番号");
                const addInfoNode = nodes[i].getElementsByTagName("付加情報")[0];
                map[fn] = {
                    serialNo: rawSerial ? toSerial(parseSerialNum(rawSerial) || (i + 1)) : toSerial(i + 1),
                    category: g("写真区分"),
                    workType: g("工種"),
                    type: g("種別"),
                    subdivision: g("細別"),
                    title: g("写真タイトル"),
                    shootingDate: dateFromXml(g("撮影年月日")),
                    isRepresentative: g("代表写真") === "1",
                    isFrequency: g("提出頻度写真") === "1",
                    referenceFileName: addInfoNode?.getElementsByTagName("参考図ファイル名")[0]?.textContent?.trim() || "",
                    referenceTitle: addInfoNode?.getElementsByTagName("参考図タイトル")[0]?.textContent?.trim() || "",
                };
            }
            return map;
        };

        /**
         * Shift_JIS エンコード済み PHOTO.XML をバイト列として読み込み
         * DOMParser でパースして写真情報ノードを返す
         * loadFolder / handleMerge で共通使用
         */
export const readPhotoXmlNodes = async (photoDir) => {
            const xmlFile = await photoDir.getFileHandle('PHOTO.XML');
            const buf = await (await xmlFile.getFile()).arrayBuffer();
            const decoded = window.Encoding
                ? window.Encoding.codeToString(window.Encoding.convert(new Uint8Array(buf), 'UNICODE', 'AUTO'))
                : new TextDecoder('utf-8').decode(buf);
            return { decoded, nodes: new DOMParser().parseFromString(decoded, "text/xml").getElementsByTagName("写真情報") };
        };

        /**
         * 並列実行（CONCURRENCY_LIMIT件ずつ）
         * handleRename / handleMerge で共通使用
         */
export const CONCURRENCY_LIMIT = 15;
export const executeChunked = async (tasks, action) => {
            for (let i = 0; i < tasks.length; i += CONCURRENCY_LIMIT) {
                await Promise.all(tasks.slice(i, i + CONCURRENCY_LIMIT).map(action));
            }
        };

        /** ページあたり表示件数 */
export const ITEMS_PER_PAGE = 100;

        /**
         * バリデーション
         * 出典: ZH005-00-24-A 表5-1 必要度欄、表5-2/5-3 撮影工種区分の記入範囲
         *
         * 工種: 全写真区分・全工事種別で必須
         * 種別・細別:
         *   土木/建築系（表5-2）: 施工状況・品質管理・出来形管理は必須
         *   機械/電気系（表5-3）: 施工状況・機器製作・使用材料・品質管理・出来形管理は必須
         *                         着手前及び完成も△（条件付き）
         */
export const validatePhoto = (p) => {
    const errs = [];
    
    // 必須項目チェック
    if (!p.title) errs.push({ field: "写真タイトル", message: "必須入力です" });
    if (!p.shootingDate) errs.push({ field: "撮影年月日", message: "必須入力です" });
    if (!p.category) errs.push({ field: "写真区分", message: "必須入力です" });
    if (!p.workType) errs.push({ field: "工種", message: "必須入力です" });

    // 文字数・文字種チェック（国交省基準案: 基本255文字以内）
    const checkLen = (val, label) => {
        if (val && val.length > 255) errs.push({ field: label, message: "255文字以内で入力してください" });
        // eslint-disable-next-line no-control-regex
        if (val && /[\x00-\x1F\x7F]/.test(val)) errs.push({ field: label, message: "使用禁止文字（制御文字）が含まれています" });
    };
    checkLen(p.title, "写真タイトル");
    checkLen(p.workType, "工種");
    checkLen(p.type, "種別");
    checkLen(p.subdivision, "細別");

    const isMechElec = ["機械", "電気"].includes(p.discipline);
    // 種別・細別は同一条件で必須（出典: ZH005-00-24-A 表5-2/5-3）
    const needTypeSubdiv = isMechElec
        ? ["施工状況写真", "機器製作写真", "使用材料写真", "品質管理写真", "出来形管理写真", "着手前及び完成写真"].includes(p.category)
        : ["施工状況写真", "品質管理写真", "出来形管理写真"].includes(p.category);

    if (needTypeSubdiv && !p.type) errs.push({ field: "種別", message: "この区分では必須です" });
    if (needTypeSubdiv && !p.subdivision) errs.push({ field: "細別", message: "この区分では必須です" });

    // 参考図: 片方だけ入力はエラー
    if (p.referenceFileName && !p.referenceTitle) errs.push({ field: "参考図タイトル", message: "参考図がある場合は必須です" });
    if (!p.referenceFileName && p.referenceTitle) errs.push({ field: "参考図ファイル名", message: "参考図タイトルがある場合は必須です" });
    
    // 技術仕様チェック (Advisory)
    if (p.fileSize && p.fileSize > 500 * 1024) {
        errs.push({ field: "ファイルサイズ", message: "500KBを超えています（推奨値オーバー）", type: "warn" });
    }
    if (p.width && (p.width < 1024 || p.height < 768)) {
        errs.push({ field: "解像度", message: "推奨解像度（1024x768以上）に達していません", type: "warn" });
    }

    return errs;
};

