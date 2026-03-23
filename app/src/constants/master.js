/**
 * MLIT_PHOTO_MASTER
 * 
 * 国土交通省「デジタル写真管理情報基準（令和5年3月/令和6年3月）」に準拠したマスターデータ。
 * 出典: https://www.cals-ed.go.jp/
 */

/**
 * 1. 写真区分 (Classification)
 * PHOTO.XML の <写真区分> に対応
 */
export const PHOTO_CATEGORIES = [
  "着手前及び完成写真",
  "施工状況写真",
  "安全管理写真",
  "使用材料写真",
  "品質管理写真",
  "出来形管理写真",
  "災害写真",
  "事故写真",
  "その他",
];

/**
 * 2. 工種・種別・細別マスター (Work Master)
 * 「新土木工事積算体系」の階層構造に準拠。
 * アプリケーション側で動的に階層選択を可能にするためのデータ。
 */
export const WORK_MASTER = [
  {
    discipline: "土木工事",
    workTypes: [
      {
        name: "一般土工",
        types: [
          { name: "掘削工", subdivisions: ["オープンカット掘削", "土砂掘削", "岩掘削", "小規模掘削"] },
          { name: "盛土工", subdivisions: ["路体盛土", "路床盛土", "構造物背面板盛土"] },
          { name: "運搬工", subdivisions: ["土砂運搬", "残土処理"] },
          { name: "法面整地工", subdivisions: ["切土法面整地", "盛土法面整地"] }
        ]
      },
      {
        name: "舗装工",
        types: [
          { name: "アスファルト舗装工", subdivisions: ["上層路盤(アス安定)", "基層", "表層"] },
          { name: "コンクリート舗装工", subdivisions: ["転圧コンクリート舗装", "普通コンクリート舗装"] },
          { name: "路盤工", subdivisions: ["下層路盤", "上層路盤"] }
        ]
      },
      {
        name: "橋梁工",
        types: [
          { name: "下部工", subdivisions: ["橋脚工", "橋台工", "基礎工(杭)", "基礎工(ケーソン)"] },
          { name: "上部工", subdivisions: ["鋼桁製作", "鋼桁架設", "PC桁製作", "PC桁架設"] }
        ]
      },
      {
        name: "排水構造物工",
        types: [
          { name: "側溝工", subdivisions: ["自由勾配側溝", "U型側溝", "L型街渠"] },
          { name: "集水桝工", subdivisions: ["現場打ち集水桝", "プレキャスト集水桝"] }
        ]
      },
      {
        name: "共通仮設工",
        types: [
          { name: "工事用道路", subdivisions: ["仮設道路造成", "仮設橋梁"] },
          { name: "現場事務所", subdivisions: ["事務所設営", "宿舎設営"] },
          { name: "安全施設", subdivisions: ["仮囲い", "安全看板", "交通誘導"] }
        ]
      }
    ]
  },
  {
    discipline: "建築工事",
    workTypes: [
      {
        name: "躯体工事",
        types: [
          { name: "仮設工", subdivisions: ["外部足場", "内部足場", "養生"] },
          { name: "鉄筋コンクリート工", subdivisions: ["型枠込", "配筋", "コンクリート打設"] },
          { name: "鉄骨工", subdivisions: ["鉄骨建方", "現場溶接", "高力ボルト締付"] }
        ]
      },
      {
        name: "仕上げ工事",
        types: [
          { name: "防水工", subdivisions: ["アスファルト防水", "シート防水", "塗膜防水"] },
          { name: "外壁塗装工", subdivisions: ["下地調整", "中塗り", "上塗り"] },
          { name: "内装工", subdivisions: ["床仕上", "壁パネル取付", "天井下地"] }
        ]
      }
    ]
  },
  {
    discipline: "機械設備工事",
    workTypes: [
      {
        name: "水門設備",
        types: [
          { name: "水門本体工", subdivisions: ["扉体製作", "扉体据付", "戸当り取付"] },
          { name: "開閉装置工", subdivisions: ["スピンドル式開閉器", "ワイヤロープ式開閉器"] }
        ]
      },
      {
        name: "揚排水ポンプ設備",
        types: [
          { name: "ポンプ本体工", subdivisions: ["主機据付", "駆動機据付", "減速機設置"] },
          { name: "配管・弁類", subdivisions: ["吸込管", "吐出管", "逆止弁"] }
        ]
      }
    ]
  },
  {
    discipline: "電気通信設備工事",
    workTypes: [
      {
        name: "強電設備",
        types: [
          { name: "受変電設備", subdivisions: ["受電盤", "変圧器", "進相コンデンサ"] },
          { name: "自家発電設備", subdivisions: ["発電機", "燃料タンク"] }
        ]
      },
      {
        name: "情報通信設備",
        types: [
          { name: "監視カメラ設備", subdivisions: ["カメラ本体", "伝送装置", "録画装置"] },
          { name: "道路情報表示装置", subdivisions: ["表示機パネル", "制御局部入力機"] }
        ]
      }
    ]
  },
  {
    discipline: "港湾工事",
    workTypes: [
      {
        name: "外郭施設工",
        types: [
          { name: "防波堤工", subdivisions: ["基礎捨石工", "ケーソン据付", "消波ブロック据付"] },
          { name: "護岸工", subdivisions: ["捨石工", "被覆石工", "根固石工"] }
        ]
      },
      {
        name: "浚渫・埋立工",
        types: [
          { name: "浚渫工", subdivisions: ["グラブ浚渫", "ポンプ浚渫"] },
          { name: "土砂投入", subdivisions: ["揚土工", "排砂工"] }
        ]
      }
    ]
  },
  {
    discipline: "造園工事",
    workTypes: [
      {
        name: "植栽工",
        types: [
          { name: "高中木植栽工", subdivisions: ["掘削", "客土", "植込", "支柱設置"] },
          { name: "芝生・地被類植栽", subdivisions: ["地拵え", "張芝", "目土"] }
        ]
      },
      {
        name: "公園施設整備",
        types: [
          { name: "舗装工", subdivisions: ["園路舗装", "広場舗装"] },
          { name: "遊具設置", subdivisions: ["ブランコ設置", "滑り台設置", "砂場設営"] }
        ]
      }
    ]
  },
  {
    discipline: "業務（調査・設計・測量）",
    workTypes: [
      {
        name: "測量業務",
        types: [
          { name: "基準点測量", subdivisions: ["1級基準点", "2級基準点", "3級基準点"] },
          { name: "地形測量", subdivisions: ["現地測量", "定期縦横断測量"] }
        ]
      },
      {
        name: "設計業務",
        types: [
          { name: "予備設計", subdivisions: ["比較案検討", "概略設計"] },
          { name: "詳細設計", subdivisions: ["構造計算", "図面作成", "数量計算"] }
        ]
      },
      {
        name: "地質調査業務",
        types: [
          { name: "ボーリング調査", subdivisions: ["標準貫入試験", "コア採取", "地下水位観測"] },
          { name: "現場試験", subdivisions: ["コーン貫入試験", "平板載荷試験"] }
        ]
      }
    ]
  }
];

/**
 * 3. 代表写真・提出頻度写真の初期値
 */
export const PHOTO_FLAGS = {
  REPRESENTATIVE: "代表写真",
  SUBMISSION_FREQUENCY: "提出頻度写真"
};

/**
 * 4. DTD設定 (PHOTO05.DTD 版)
 */
export const PHOTO_XML_CONFIG = {
  DTD_VERSION: "05",
  ENCODING: "Shift_JIS",
  ROOT_ELEMENT: "photodata",
  SUB_ELEMENTS: {
    BASIC: "基礎情報",
    PHOTO: "写真情報",
    SOFTWARE: "ソフトメーカ用TAG"
  }
};
