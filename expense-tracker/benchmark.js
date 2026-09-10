// ============================================================
// 性能对比实验：for 循环 vs reduce
// 对同一组统计数据（支出总额、收入总额、分类支出汇总），
// 分别用 for 循环和 reduce 实现，用 console.time/timeEnd 测量耗时。
// 样本量小则差异不可靠，因此先自动生成 10 万条数据再跑多轮取平均。
// ============================================================

// —— 1. 生成 10 万条模拟账目数据 ——
const SAMPLE_SIZE = 100000;
const CATS = ['餐饮', '交通', '数码', '工资', '娱乐', '日用', '医疗'];

// 生成函数：职责单一，只负责造数据
const generateData = (n) => {
  const arr = new Array(n);
  for (let i = 0; i < n; i++) {
    arr[i] = {
      type: i % 3 === 0 ? '收入' : '支出',
      amount: Math.round(Math.random() * 1000 * 100) / 100,
      category: CATS[i % CATS.length],
      note: 'sample' + i
    };
  }
  return arr;
};

// —— 2. for 循环版本：手动遍历 ——
// 计算支出总额、收入总额、各分类支出汇总
const statsByFor = (list) => {
  let expense = 0, income = 0;
  const byCategory = {};
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (r.type === '支出') {
      expense += r.amount;
      byCategory[r.category] = (byCategory[r.category] || 0) + r.amount;
    } else {
      income += r.amount;
    }
  }
  return { expense, income, byCategory };
};

// —— 3. reduce 版本：函数式遍历 ——
// 计算同样三项统计，只用一次 reduce 遍历
const statsByReduce = (list) =>
  list.reduce(
    (acc, r) => {
      if (r.type === '支出') {
        acc.expense += r.amount;
        acc.byCategory[r.category] = (acc.byCategory[r.category] || 0) + r.amount;
      } else {
        acc.income += r.amount;
      }
      return acc;
    },
    { expense: 0, income: 0, byCategory: {} }
  );

// —— 4. 计时工具：跑 ROUNDS 轮，记录每轮耗时 ——
const ROUNDS = 10;
const runBench = (label, fn, data) => {
  const times = [];
  // 先跑一轮"预热"，避免 JIT 冷启动偏差
  fn(data);
  for (let i = 0; i < ROUNDS; i++) {
    console.time(label + ' #' + (i + 1));
    fn(data);
    console.timeEnd(label + ' #' + (i + 1));
    // 手动取一次高精度耗时（performance.now），和 console.time 互为佐证
    const t0 = (typeof performance !== 'undefined' ? performance : { now: () => Date.now() }).now();
    fn(data);
    const t1 = (typeof performance !== 'undefined' ? performance : { now: () => Date.now() }).now();
    times.push(t1 - t0);
  }
  return times;
};

// 求平均与最小值，单位毫秒
const summarize = (times) => {
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  const min = Math.min(...times);
  return { avg, min, rounds: times.length };
};

// —— 5. 执行实验 ——
const data = generateData(SAMPLE_SIZE);

console.log(`样本量：${SAMPLE_SIZE} 条，跑 ${ROUNDS} 轮（另加 1 轮预热）\n`);

const forTimes = runBench('for循环', statsByFor, data);
const reduceTimes = runBench('reduce', statsByReduce, data);

const forStat = summarize(forTimes);
const reduceStat = summarize(reduceTimes);

// —— 6. 正确性校验：两种实现结果必须一致 ——
const resultFor = statsByFor(data);
const resultReduce = statsByReduce(data);
const matchExpense = resultFor.expense === resultReduce.expense;
const matchIncome = resultFor.income === resultReduce.income;
const matchCategory = JSON.stringify(resultFor.byCategory) === JSON.stringify(resultReduce.byCategory);

// —— 7. 输出结果与结论 ——
const report = [
  '========== 性能对比结果 ==========',
  `样本量：${SAMPLE_SIZE} 条 | 轮数：${ROUNDS}（不含预热轮）`,
  '',
  `【for 循环】  平均 ${forStat.avg.toFixed(3)} ms | 最快 ${forStat.min.toFixed(3)} ms`,
  `【reduce 】  平均 ${reduceStat.avg.toFixed(3)} ms | 最快 ${reduceStat.min.toFixed(3)} ms`,
  '',
  `平均耗时差异：${(forStat.avg - reduceStat.avg).toFixed(3)} ms（正数=for 更慢）`,
  `相对差异：${(Math.abs(forStat.avg - reduceStat.avg) / Math.min(forStat.avg, reduceStat.avg) * 100).toFixed(1)}%`,
  '',
  '—— 正确性校验 ——',
  `支出总额一致：${matchExpense}（${resultFor.expense.toFixed(2)}）`,
  `收入总额一致：${matchIncome}（${resultFor.income.toFixed(2)}）`,
  `分类汇总一致：${matchCategory}`,
  '',
  '—— 结论 ——',
  '1. 两种方式遍历次数相同（都是单次遍历），时间复杂度均为 O(n)；',
  '2. for 循环直接操作局部变量，无回调函数调用开销，通常略快于 reduce；',
  '3. reduce 每轮调用回调函数一次，10 万次回调带来的函数调用开销在小数据量上可忽略，',
  '   大数据量下差异才显现（通常在个位数百分比）；',
  '4. 可读性方面 reduce 更声明式，但本例两者复杂度接近，差异不大；',
  '5. 结论：数据量 < 1 万时两者无实质差异，选 reduce 更易读；',
  '   数据量 > 10 万且为热路径时，for 循环的微小优势才值得考虑。'
].join('\n');

console.log('\n' + report);

// 浏览器环境把报告渲染到页面 <pre id="report">
if (typeof document !== 'undefined') {
  const el = document.getElementById('report');
  if (el) el.textContent = report;
}
