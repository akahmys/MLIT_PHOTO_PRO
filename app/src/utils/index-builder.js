import { INDEX_C07_DTD } from '../constants/dtd.js';
import { esc, dateToXml } from './helpers.js';

/* ======================================================
   INDEX_C.XML 生成関数
   出典: 国交省「工事完成図書の電子納品等要領 R5.3月版」
         INDEX_C07.DTD 構造定義に準拠
   ====================================================== */
export const buildIndexXml = (settings, versionTag) => {
    let xml = `<?xml version="1.0" encoding="Shift_JIS"?>\n`;
    xml += `<!DOCTYPE index_jp SYSTEM "INDEX_C07.DTD">\n`;
    xml += `<index_jp DTD_version="07">\n`;

    // ─── 工事基本情報 ───
    xml += `  <工事基本情報>\n`;
    xml += `    <発注機関名>${esc(settings.client)}</発注機関名>\n`;
    xml += `    <工事名称>${esc(settings.projectName)}</工事名称>\n`;
    xml += `    <工事個所>${esc(settings.location)}</工事個所>\n`;
    xml += `    <工期>\n`;
    xml += `      <着工年月日>${dateToXml(settings.startDate)}</着工年月日>\n`;
    xml += `      <竣工年月日>${dateToXml(settings.endDate)}</竣工年月日>\n`;
    xml += `    </工期>\n`;
    xml += `    <発注者名>${esc(settings.client)}</発注者名>\n`;
    xml += `    <受注者名>${esc(settings.contractor)}</受注者名>\n`;
    xml += `    <管理技術者名>${esc(settings.manager)}</管理技術者名>\n`;
    xml += `    <主任技術者名>${esc(settings.engineer)}</主任技術者名>\n`;
    xml += `    <適用要領基準>${esc(versionTag)}</適用要領基準>\n`;
    xml += `  </工事基本情報>\n`;

    // ─── 成果物情報（写真は必須、その他は拡張用） ───
    xml += `  <成果物情報>\n`;
    xml += `    <フォルダ名>PHOTO</フォルダ名>\n`;
    xml += `  </成果物情報>\n`;

    xml += `</index_jp>`;
    return xml;
};

/**
 * INDEX_C.XML ファイル保存
 */
export const saveIndexXmlToDir = async (settings, rootHandle, versionTag) => {
    const xmlStr = buildIndexXml(settings, versionTag);
    if (!window.Encoding) throw new Error("encoding-japanese が利用できません");
    
    const sjis = new Uint8Array(
        window.Encoding.convert(window.Encoding.stringToCode(xmlStr), 'SJIS', 'UNICODE')
    );
    
    const fh = await rootHandle.getFileHandle('INDEX_C.XML', { create: true });
    const w = await fh.createWritable();
    await w.write(sjis);
    await w.close();

    // DTDファイルの保存
    await saveIndexDtdToFolder(rootHandle);
};

export const saveIndexDtdToFolder = async (rootHandle) => {
    if (!window.Encoding) {
        const fh = await rootHandle.getFileHandle('INDEX_C07.DTD', { create: true });
        const w = await fh.createWritable();
        await w.write(INDEX_C07_DTD); await w.close();
        return;
    }
    const sjis = new Uint8Array(
        window.Encoding.convert(window.Encoding.stringToCode(INDEX_C07_DTD), 'SJIS', 'UNICODE')
    );
    const fh = await rootHandle.getFileHandle('INDEX_C07.DTD', { create: true });
    const w = await fh.createWritable();
    await w.write(sjis); await w.close();
};
