/**
 * PHOTO05.DTD
 * 
 * デジタル写真管理情報基準（平成20年5月版以降、令和5年3月版等でも使用される共通DTD）
 * 出典: 国土交通省「デジタル写真管理情報基準 付属資料」
 */
export const PHOTO05_DTD = `<!-- PHOTO05.DTD / 2008/05 -->
<!ELEMENT photodata (基礎情報,写真情報+,ソフトメーカ用TAG*)>
<!ATTLIST photodata DTD_version CDATA #FIXED "05">
<!ELEMENT 基礎情報 (写真フォルダ名,参考図フォルダ名?,適用要領基準)>
<!ELEMENT 写真フォルダ名 (#PCDATA)>
<!ELEMENT 参考図フォルダ名 (#PCDATA)>
<!ELEMENT 適用要領基準 (#PCDATA)>
<!ELEMENT 写真情報 (写真ファイル情報,撮影工種区分,付加情報*,撮影情報,代表写真,提出頻度写真,施工管理値?,請負者説明文?)>
<!ELEMENT 代表写真 (#PCDATA)>
<!ELEMENT 提出頻度写真 (#PCDATA)>
<!ELEMENT 施工管理値 (#PCDATA)>
<!ELEMENT 請負者説明文 (#PCDATA)>
<!ELEMENT 写真ファイル情報 (シリアル番号,写真ファイル名,写真ファイル日本語名?,メディア番号)>
<!ELEMENT シリアル番号 (#PCDATA)>
<!ELEMENT 写真ファイル名 (#PCDATA)>
<!ELEMENT 写真ファイル日本語名 (#PCDATA)>
<!ELEMENT メディア番号 (#PCDATA)>
<!ELEMENT 撮影工種区分 (写真-大分類,写真区分?,工種?,種別?,細別?,写真タイトル,工種区分予備*)>
<!ELEMENT 写真-大分類 (#PCDATA)>
<!ELEMENT 写真区分 (#PCDATA)>
<!ELEMENT 工種 (#PCDATA)>
<!ELEMENT 種別 (#PCDATA)>
<!ELEMENT 細別 (#PCDATA)>
<!ELEMENT 写真タイトル (#PCDATA)>
<!ELEMENT 工種区分予備 (#PCDATA)>
<!ELEMENT 付加情報 (参考図ファイル名,参考図ファイル日本語名?,参考図タイトル,付加情報予備*)>
<!ELEMENT 参考図ファイル名 (#PCDATA)>
<!ELEMENT 参考図ファイル日本語名 (#PCDATA)>
<!ELEMENT 参考図タイトル (#PCDATA)>
<!ELEMENT 付加情報予備 (#PCDATA)>
<!ELEMENT 撮影情報 (撮影箇所?,撮影年月日)>
<!ELEMENT 撮影箇所 (#PCDATA)>
<!ELEMENT 撮影年月日 (#PCDATA)>
<!ELEMENT ソフトメーカ用TAG (#PCDATA)>`;

/**
 * INDEX_C07.DTD
 * 工事完成図書の電子納品等要領（平成20年5月版以降共通）
 */
export const INDEX_C07_DTD = `<!-- INDEX_C07.DTD / 2008/05 -->
<!ELEMENT index_jp (工事基本情報,成果物情報+)>
<!ATTLIST index_jp DTD_version CDATA #FIXED "07">
<!ELEMENT 工事基本情報 (発注機関名,工事名称,工事個所,工期,発注者名,受注者名,管理技術者名,主任技術者名,適用要領基準)>
<!ELEMENT 発注機関名 (#PCDATA)>
<!ELEMENT 工事名称 (#PCDATA)>
<!ELEMENT 工事個所 (#PCDATA)>
<!ELEMENT 工期 (着工年月日,竣工年月日)>
<!ELEMENT 着工年月日 (#PCDATA)>
<!ELEMENT 竣工年月日 (#PCDATA)>
<!ELEMENT 発注者名 (#PCDATA)>
<!ELEMENT 受注者名 (#PCDATA)>
<!ELEMENT 管理技術者名 (#PCDATA)>
<!ELEMENT 主任技術者名 (#PCDATA)>
<!ELEMENT 適用要領基準 (#PCDATA)>
<!ELEMENT 成果物情報 (フォルダ名,ファイル情報*,成果物予備*)>
<!ELEMENT フォルダ名 (#PCDATA)>
<!ELEMENT 成果物予備 (#PCDATA)>
<!ELEMENT ファイル情報 (ファイル名,ファイル日本語名?,原本・写しの別?,作成者名?,作成年月日?,ファイル予備*)>
<!ELEMENT ファイル名 (#PCDATA)>
<!ELEMENT ファイル日本語名 (#PCDATA)>
<!ELEMENT 原本・写しの別 (#PCDATA)>
<!ELEMENT 作成者名 (#PCDATA)>
<!ELEMENT 作成年月日 (#PCDATA)>
<!ELEMENT ファイル予備 (#PCDATA)>`;
