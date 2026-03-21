import { STANDARDS, PHOTO05_DTD } from '../constants/master.js';
import { toSerial, sanitizeForJS, esc, dateToXml, getPhotoDir } from './helpers.js';
        /* ======================================================
           XML生成関数
           出典: 国交省「デジタル写真管理情報基準R5.3月版」付属資料2 XML記入例
                 PHOTO05.DTD 構造定義に完全準拠
           ====================================================== */
export const buildPhotoXml = (photos, stdId) => {
            const std = STANDARDS[stdId];
            if (!std) throw new Error("不明な基準IDです: " + stdId);

            let xml = `<?xml version="1.0" encoding="Shift_JIS"?>\n`;
            xml += `<!DOCTYPE photodata SYSTEM "${std.dtdName}">\n`;
            xml += `<photodata DTD_version="05">\n`;

            // ─── 基礎情報 ───
            // DTD: <!ELEMENT 基礎情報 (写真フォルダ名,参考図フォルダ名?,適用要領基準)>
            //
            // 参考図フォルダ名:
            //   出典: ZH005-00-24-A 表5-1「条件付必須」
            //   「参考図ファイルを作成した場合、参考図ファイルを格納するフォルダ名を記入する」
            //   → 参考図が1枚以上ある場合のみ出力する
            const hasAnyReference = photos.some(p => p.referenceFileName);
            xml += `  <基礎情報>\n`;
            xml += `    <写真フォルダ名>${std.photoFolder}/${std.picFolder}</写真フォルダ名>\n`;
            if (hasAnyReference) {
                xml += `    <参考図フォルダ名>${std.photoFolder}/${std.drawfFolder}</参考図フォルダ名>\n`;
            }
            xml += `    <適用要領基準>${std.versionTag}</適用要領基準>\n`;
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
                // 写真-大分類タグ名のハイフンは半角（PHOTO05.DTD定義）
                xml += `    <撮影工種区分>\n`;
                xml += `      <写真-大分類>工事</写真-大分類>\n`;
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
            const std = STANDARDS[stdId];
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
        };

        /**
         * PHOTO05.DTDをPHOTOフォルダに書き込む
         *
         * ・既存ファイルがあっても常に正式内容で上書きする
         *   （旧バージョンや壊れたDTDを修正するため）
         * ・Shift_JISでエンコードして書き込む
         *   （DTD内容はASCII範囲のみのため実質同じだが、
         *    納品フォルダ全体のエンコーディングをShift_JISで統一するため）
         * ・PHOTO.XMLのDOCTYPE宣言で参照するファイル名と一致させる
         *   出典: ZH005-00-24-A 4章「PHOTO05.DTD」
         */
export const saveDtdToFolder = async (photoDir, stdId) => {
            const std = STANDARDS[stdId];
            if (!window.Encoding) {
                // encoding-japanese が使えない場合はUTF-8でフォールバック
                const fh = await photoDir.getFileHandle(std.dtdName, { create: true });
                const w = await fh.createWritable();
                await w.write(PHOTO05_DTD); await w.close();
                return;
            }
            const sjis = new Uint8Array(
                window.Encoding.convert(window.Encoding.stringToCode(PHOTO05_DTD), 'SJIS', 'UNICODE')
            );
            const fh = await photoDir.getFileHandle(std.dtdName, { create: true });
            const w = await fh.createWritable();
            await w.write(sjis); await w.close();
        };

