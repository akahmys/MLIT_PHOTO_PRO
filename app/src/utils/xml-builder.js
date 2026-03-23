import { STANDARDS_MAP } from '../constants/standards.js';
import { PHOTO05_DTD } from '../constants/dtd.js';
import { toSerial, sanitizeForJS, esc, dateToXml, getPhotoDir } from './helpers.js';

/* ======================================================
   XML生成関数
   出典: 国交省「デジタル写真管理情報基準R5.3月版」付属資料2 XML記入例
         PHOTO05.DTD 構造定義に完全準拠
   ====================================================== */
export const buildPhotoXml = (photos, stdId) => {
    const std = STANDARDS_MAP[stdId];
    if (!std) throw new Error("不明な基準IDです: " + stdId);

    // テクニカルメタデータの補完（SSOTにない場合のデフォルト値）
    const dtdName = std.dtdName || "PHOTO05.DTD";
    const versionTag = std.versionTag || std.standard_name ? std.standard_name.replace(/（|）/g, " ") : "デジタル写真管理情報基準";
    const photoFolder = std.photoFolder || "PHOTO";
    const picFolder = std.picFolder || "PIC";
    const drawfFolder = std.drawfFolder || "DRAWF";

    let xml = `<?xml version="1.0" encoding="Shift_JIS"?>\n`;
    xml += `<!DOCTYPE photodata SYSTEM "${dtdName}">\n`;
    xml += `<photodata DTD_version="05">\n`;

            // ─── 基礎情報 ───
            // DTD: <!ELEMENT 基礎情報 (写真フォルダ名,参考図フォルダ名?,適用要領基準)>
            //
            // 参考図フォルダ名:
            //   出典: ZH005-00-24-A 表5-1「条件付必須」
            //   「参考図ファイルを作成した場合、参考図ファイルを格納するフォルダ名を記入する」
            //   → 参考図が1枚以上ある場合のみ出力する
    // 指摘修正: [Compliance 2.1] Relative path
    const hasAnyReference = photos.some(p => p.referenceFileName);
    xml += `  <基礎情報>\n`;
    xml += `    <写真フォルダ名>${picFolder}</写真フォルダ名>\n`;
    if (hasAnyReference) {
        xml += `    <参考図フォルダ名>${drawfFolder}</参考図フォルダ名>\n`;
    }
    // 指摘修正: [Compliance 2.3] Official versionTag
    xml += `    <適用要領基準>${std.versionTag || versionTag}</適用要領基準>\n`;
    xml += `  </基礎情報>\n`;

            // ─── 写真情報（繰り返し） ───
            photos.forEach(p => {
                xml += `  <写真情報>\n`;

                // 写真ファイル情報
                xml += `    <写真ファイル情報>\n`;
                xml += `      <シリアル番号>${esc(toSerial(p.serialNo))}</シリアル番号>\n`;
                xml += `      <写真ファイル名>${esc(p.name)}</写真ファイル名>\n`;
                xml += `      <メディア番号>1</メディア番号>\n`;
                xml += `    </写真ファイル情報>\n`;

                // 撮影工種区分
                // 指摘修正: [Compliance 2.2] 大分類（工事/業務）の動的判定
                const majorCategory = std.majorCategory || (std.type === 'design' ? '業務' : '工事');
                xml += `    <撮影工種区分>\n`;
                xml += `      <写真-大分類>${majorCategory}</写真-大分類>\n`;
                xml += `      <写真区分>${esc(p.category)}</写真区分>\n`;
                if (p.workType) xml += `      <工種>${esc(sanitizeForJS(p.workType))}</工種>\n`;
                if (p.type) xml += `      <種別>${esc(sanitizeForJS(p.type))}</種別>\n`;
                if (p.subdivision) xml += `      <細別>${esc(sanitizeForJS(p.subdivision))}</細別>\n`;
                xml += `      <写真タイトル>${esc(sanitizeForJS(p.title))}</写真タイトル>\n`;
                xml += `    </撮影工種区分>\n`;

                // 付加情報（参考図）
                // DTD: <!ELEMENT 付加情報 (参考図ファイル名,参考図ファイル日本語名?,参考図タイトル,付加情報予備*)>
                // 出典: ZH005-00-24-A 表5-1「条件付必須」
                // 「黒板に記した図の判読が困難となる場合、又は当該写真に関し、撮影位置、
                //   撮影状況等を説明するために位置図面又は凡例図等の参考図を受注者が
                //   作成している場合に記入する」
                if (p.referenceFileName) {
                    xml += `    <付加情報>\n`;
                    xml += `      <参考図ファイル名>${esc(sanitizeForJS(p.referenceFileName))}</参考図ファイル名>\n`;
                    xml += `      <参考図タイトル>${esc(sanitizeForJS(p.referenceTitle))}</参考図タイトル>\n`;
                    xml += `    </付加情報>\n`;
                }

                // 撮影情報
                // 撮影年月日: CCYY-MM-DD（ハイフン含む10桁固定）
                xml += `    <撮影情報>\n`;
                xml += `      <撮影年月日>${dateToXml(p.shootingDate)}</撮影年月日>\n`;
                xml += `    </撮影情報>\n`;

                // 代表写真・提出頻度写真: 必ず"0"または"1"（空文字不可）
                xml += `    <代表写真>${p.isRepresentative ? '1' : '0'}</代表写真>\n`;
                xml += `    <提出頻度写真>${p.isFrequency ? '1' : '0'}</提出頻度写真>\n`;

                xml += `  </写真情報>\n`;
            });

            xml += `</photodata>`;
            return xml;
        };

        /* ======================================================
           XMLファイル保存（Shift_JIS変換）
           ====================================================== */
export const saveXmlToDir = async (photos, rootHandle, stdId) => {
    const std = STANDARDS_MAP[stdId];
    if (!std) throw new Error("不明な基準IDです: " + stdId);
    const photoDir = await getPhotoDir(rootHandle, std, true);
    const xmlStr = buildPhotoXml(photos, stdId);
    if (!window.Encoding) throw new Error("encoding-japanese が利用できません");
    const sjis = new Uint8Array(
        window.Encoding.convert(window.Encoding.stringToCode(xmlStr), 'SJIS', 'UNICODE')
    );
    const fh = await photoDir.getFileHandle('PHOTO.XML', { create: true });
    const w = await fh.createWritable();
    await w.write(sjis);
    await w.close();

    // 追加: DTDファイルの自動保存
    await saveDtdToFolder(photoDir, stdId);
};

/**
 * PHOTO05.DTDをPHOTOフォルダに書き込む
 */
export const saveDtdToFolder = async (photoDir, stdId) => {
    const std = STANDARDS_MAP[stdId];
    if (!std) throw new Error("不明な基準IDです: " + stdId);
    const dtdName = std.dtdName || "PHOTO05.DTD";

    if (!window.Encoding) {
        const fh = await photoDir.getFileHandle(dtdName, { create: true });
        const w = await fh.createWritable();
        await w.write(PHOTO05_DTD); await w.close();
        return;
    }
    const sjis = new Uint8Array(
        window.Encoding.convert(window.Encoding.stringToCode(PHOTO05_DTD), 'SJIS', 'UNICODE')
    );
    const fh = await photoDir.getFileHandle(dtdName, { create: true });
    const w = await fh.createWritable();
    await w.write(sjis); await w.close();
};

