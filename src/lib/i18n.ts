import { useSettings, type Lang } from '../store'

const dict = {
  // app chrome
  appName: { en: 'PackingHelper', zh: 'PackingHelper' },
  tagline: { en: 'Whatnot pick & pack, streamlined', zh: 'Whatnot 拣货打包流水线' },
  tabImport: { en: 'Import', zh: '导入' },
  tabPick: { en: 'Pick', zh: '拣货' },
  tabSummary: { en: 'Totals', zh: '全场汇总' },
  tabCatalog: { en: 'Toys & Boxes', zh: '货品 & 箱型' },
  tabBoxPlan: { en: 'Box Plan', zh: '打箱计划' },

  // import page
  dropTitle: { en: 'Drop your Whatnot packing-slip PDF here', zh: '把 Whatnot packing slip PDF 拖到这里' },
  dropHint: { en: 'or click to browse — parsed entirely in your browser, nothing is uploaded', zh: '或点击选择文件——全部在浏览器本地解析，不会上传任何数据' },
  parsing: { en: 'Parsing page', zh: '正在解析第' },
  parsingOf: { en: 'of', zh: '页，共' },
  parseFailed: { en: 'Could not read this PDF', zh: '无法读取这个 PDF' },
  ordersParsed: { en: 'orders', zh: '个订单' },
  itemsParsed: { en: 'items', zh: '件商品' },
  pagesParsed: { en: 'pages', zh: '页' },
  priorityOrders: { en: 'Priority', zh: 'Priority 单' },
  groundOrders: { en: 'Ground', zh: 'Ground 单' },
  dupTitle: { en: 'Duplicate buyers — merge these in Whatnot first!', zh: '发现重名买家——先回 Whatnot 合并 shipment！' },
  dupBody: {
    en: 'The same buyer has multiple shipments below. Merge them in Whatnot (Priority flat-rate boxes have no weight limit), re-export the PDF, and import again.',
    zh: '以下买家被 Whatnot 拆成了多个 shipment。去 Whatnot 手动合并（Priority 一口价箱不限重量），重新导出 PDF 再导入一次。',
  },
  dupSlip: { en: 'slip', zh: '第' },
  dupSlipN: { en: '', zh: '张' },
  noDupes: { en: 'No duplicate buyers — every shipment is a distinct customer.', zh: '没有重名买家——每张 slip 都是不同顾客。' },
  warningsTitle: { en: 'Parse warnings', zh: '解析警告' },
  noWarnings: { en: 'All slips parsed cleanly. Item counts match every slip.', zh: '所有 slip 解析干净，每单件数都与 slip 一致。' },
  currentFile: { en: 'Current file', zh: '当前文件' },
  clearSession: { en: 'Clear session', zh: '清除本次数据' },
  reimportHint: { en: 'Import a new PDF any time — pick progress is kept per file.', zh: '随时可导入新 PDF——拣货进度按文件分别保存。' },

  // pick page
  pickEmpty: { en: 'Import a packing-slip PDF first.', zh: '请先导入 packing slip PDF。' },
  pickProgress: { en: 'picked', zh: '已拣' },
  ordersDone: { en: 'orders done', zh: '单完成' },
  slipOrder: { en: 'Slip order matches your printed shipping labels', zh: '顺序与打印的 shipping label 一致' },
  itemsWord: { en: 'items', zh: '件' },
  checkAll: { en: 'Check all', zh: '全勾' },
  uncheckAll: { en: 'Reset', zh: '重置' },
  printThis: { en: 'Print slip', zh: '打印本单' },
  printAll: { en: 'Print pick sheets', zh: '打印拣货单' },
  printSlips: { en: 'Print packing slips', zh: '打印随箱清单' },
  resetProgress: { en: 'Reset all progress', zh: '重置全部进度' },
  boxNone: { en: 'NO FIT', zh: '装不下' },
  boxMissingDims: { en: 'need dims', zh: '缺尺寸' },
  hideDone: { en: 'Hide finished', zh: '隐藏已完成' },

  // summary page
  summaryTitle: { en: 'Whole-show totals', zh: '全场 SKU 汇总' },
  summaryHint: { en: 'Pull everything from the shelves in one pass, then pick per order.', zh: '先按这张表一次性把货全拉出来，再逐单分拣。' },
  skuCol: { en: 'Product', zh: '商品' },
  colorCol: { en: 'Variant', zh: '颜色/款' },
  qtyCol: { en: 'Qty', zh: '数量' },
  inOrdersCol: { en: 'In # orders', zh: '出现单数' },

  // catalog page
  toyTableTitle: { en: 'Toy dimensions', zh: '玩具尺寸库' },
  toyTableHint: {
    en: 'Sizes are per product family — color variants share dimensions. New products from an import appear highlighted until you fill them in.',
    zh: '尺寸按产品维护，不同颜色共用。导入 PDF 后新产品会自动加进来并高亮，填好尺寸即可参与装箱计算。',
  },
  boxTableTitle: { en: 'Box library', zh: '箱型库' },
  boxTableHint: {
    en: 'Inner dimensions in inches. “Priority only” marks USPS flat-rate boxes that cannot ship Ground.',
    zh: '内尺寸，单位英寸。勾选“仅 Priority”的是 USPS 一口价箱，Ground 单不能用。',
  },
  productCol: { en: 'Product', zh: '产品' },
  lCol: { en: 'L (in)', zh: '长 (in)' },
  wCol: { en: 'W (in)', zh: '宽 (in)' },
  hCol: { en: 'H (in)', zh: '高 (in)' },
  weightCol: { en: 'Wt (oz)', zh: '重 (oz)' },
  noteCol: { en: 'Note', zh: '备注' },
  nameCol: { en: 'Name', zh: '名称' },
  maxWtCol: { en: 'Max wt (oz)', zh: '限重 (oz)' },
  priorityOnlyCol: { en: 'Priority only', zh: '仅 Priority' },
  enabledCol: { en: 'On', zh: '启用' },
  addRow: { en: 'Add row', zh: '加一行' },
  deleteRow: { en: 'Delete', zh: '删除' },
  exportJson: { en: 'Export JSON', zh: '导出 JSON' },
  importJson: { en: 'Import JSON', zh: '导入 JSON' },
  resetDefaults: { en: 'Reset defaults', zh: '恢复预置' },
  fillFactor: { en: 'Fill factor', zh: '填充率' },
  fillFactorHint: {
    en: 'How much of a box’s volume items may use. Squishy toys compress — raise it if boxes are being oversized.',
    zh: '允许占用箱子体积的比例。软胶玩具可压缩，如果推荐的箱子偏大可以调高。',
  },
  importedN: { en: 'Imported', zh: '已导入' },
  importJsonFailed: { en: 'Invalid JSON file', zh: 'JSON 文件格式不对' },

  // box plan page
  boxPlanTitle: { en: 'Tape these boxes first', zh: '先把这些箱子打好' },
  boxPlanHint: { en: 'One box per order. Tape the whole batch, label them, then pick.', zh: '一单一箱。先把整批箱子打好、写上编号，再开始拣货。' },
  needAttention: { en: 'Needs attention', zh: '需要人工处理' },
  reasonOversize: { en: 'Does not fit any box', zh: '所有箱型都装不下' },
  reasonNoDims: { en: 'Missing toy dimensions', zh: '缺玩具尺寸' },
  reasonNoBox: { en: 'No box allowed for this service', zh: '没有可用于该运输方式的箱型' },
  slipCol: { en: 'Slip', zh: '序号' },
  buyerCol: { en: 'Buyer', zh: '买家' },
  serviceCol: { en: 'Service', zh: '运输' },
  boxCol: { en: 'Box', zh: '箱型' },
  fillCol: { en: 'Fill', zh: '填充' },
  weightColShort: { en: 'Weight', zh: '重量' },
  boxesTotal: { en: 'boxes total', zh: '个箱子' },
  fixInCatalog: { en: 'Fill in dimensions on the Toys & Boxes tab', zh: '去“货品 & 箱型”页补齐尺寸' },

  // print
  printedWith: { en: 'Packed with PackingHelper', zh: 'Packed with PackingHelper' },
  orderTotal: { en: 'Total', zh: '合计' },
  thankYou: { en: 'Thank you for your order!', zh: 'Thank you for your order!' },
} satisfies Record<string, Record<Lang, string>>

export type MsgKey = keyof typeof dict

export function useT() {
  const lang = useSettings((s) => s.lang)
  return (key: MsgKey) => dict[key][lang]
}

export function t(key: MsgKey, lang: Lang) {
  return dict[key][lang]
}
