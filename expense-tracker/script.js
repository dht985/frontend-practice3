// ============================================================
// 消费记账小工具
// 解决的问题：把零散的收支流水录入后，自动清洗非法记录，
// 统计总收入/总支出/结余、支出分类排行与大额支出。
// ============================================================

// 原始账目数据（数组 + 对象组织；末尾4条为故意混入的非法记录，用于验证清洗）
const ledger = [
  { type: '支出', amount: 23.5, category: '餐饮', note: '工作日午餐' },
  { type: '收入', amount: 8000, category: '工资', note: '9月工资' },
  { type: '支出', amount: 1299, category: '数码', note: '蓝牙耳机' },
  { type: '支出', amount: 45, category: '交通', note: '地铁充值' },
  // —— 以下为非法记录 ——
  { type: '支出', amount: -50, category: '餐饮', note: '非法：金额为负数' },
  { type: '支出', amount: '九十九', category: '餐饮', note: '非法：金额不是数字' },
  { type: '转账', amount: 100, category: '其他', note: '非法：类型只能是收入/支出' },
  { type: '支出', category: '餐饮', note: '非法：缺少金额字段' }
];

console.table(ledger);

// ============================================================
// 第二步：录入解析 + 非法输入清洗
// ============================================================

// 校验单条账目是否合法：类型仅允许“收入/支出”，金额必须是大于0的有限数字，分类不能为空
const isValidRecord = (r) =>
  !!r &&
  (r.type === '收入' || r.type === '支出') &&
  typeof r.amount === 'number' &&
  Number.isFinite(r.amount) &&
  r.amount > 0 &&
  typeof r.category === 'string' &&
  r.category.trim() !== '';

// 清洗账目：用 reduce 一次性把流水拆分为“合法/非法”两组，非法记录不参与后续统计
const partitionLedger = (list) =>
  list.reduce(
    (acc, r) => {
      (isValidRecord(r) ? acc.valid : acc.invalid).push(r);
      return acc;
    },
    { valid: [], invalid: [] }
  );

// 解析 prompt 录入文本：格式「类型 金额 分类 备注…」
// 成功返回 { ok:true, record }；失败返回 { ok:false, reason }，由调用方负责提示，不抛异常
const parseRecord = (input) => {
  if (typeof input !== 'string' || input.trim() === '') {
    return { ok: false, reason: '输入为空' };
  }
  const parts = input.trim().split(/\s+/);
  if (parts.length < 3) {
    return { ok: false, reason: '字段不足，至少需要「类型 金额 分类」三段' };
  }
  const [type, amountText, category, ...noteParts] = parts;
  if (type !== '收入' && type !== '支出') {
    return { ok: false, reason: `类型「${type}」非法，只能填收入或支出` };
  }
  const amount = Number(amountText);
  if (!Number.isFinite(amount)) {
    return { ok: false, reason: `金额「${amountText}」不是有效数字` };
  }
  if (amount <= 0) {
    return { ok: false, reason: `金额 ${amount} 必须大于0` };
  }
  return {
    ok: true,
    record: { type, amount, category, note: noteParts.join(' ') || category }
  };
};

// 在页面提示区追加一条提示（isError 为真时显示红色）
const showMessage = (text, isError = false) => {
  if (typeof document === 'undefined') return;
  const p = document.createElement('p');
  p.textContent = text;
  if (isError) p.style.color = '#c0392b';
  document.getElementById('messages').appendChild(p);
};

// 统一的警告输出：浏览器走 console.warn（在 Console 中高亮），Node 环境做兼容降级
const nativeWarn = (text) => {
  if (typeof console !== 'undefined' && console.warn) console.warn(text);
};

// 弹窗录入一笔账（仅浏览器环境）；取消或留空则跳过，非法输入只提示、程序不崩溃
if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
  const rawInput = window.prompt(
    '请录入一笔账，格式：类型 金额 分类 备注\n类型只能填「收入」或「支出」，例如：支出 28.5 餐饮 午餐\n留空或取消则跳过：',
    '支出 28.5 餐饮 午餐'
  );
  if (rawInput !== null && inputNotBlank(rawInput)) {
    const result = parseRecord(rawInput);
    if (result.ok) {
      ledger.push(result.record);
      console.log('录入成功：', result.record);
      showMessage(`录入成功：${result.record.type} ${result.record.amount}元 ${result.record.category}（${result.record.note}）`);
    } else {
      nativeWarn('录入失败，已忽略：' + result.reason + '；原始输入：' + rawInput);
      showMessage('录入失败，已忽略：' + result.reason + '；原始输入：' + rawInput, true);
    }
  }
}

// 录入文本非空判断（取消/全空格视为跳过）
const inputNotBlank = (text) => text.trim() !== '';

// 执行清洗并打印两组结果
const { valid: cleanData, invalid: invalidData } = partitionLedger(ledger);
console.log(`清洗完成：合法 ${cleanData.length} 条，非法 ${invalidData.length} 条`);
console.log('合法账目：');
console.table(cleanData);
console.warn(`以下 ${invalidData.length} 条非法记录已被忽略，不参与统计：`);
console.table(invalidData);
showMessage(`数据清洗完成：合法 ${cleanData.length} 条，已忽略非法记录 ${invalidData.length} 条`);
