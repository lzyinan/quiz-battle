import { getDb } from './db/index.js';

export function seedData(): void {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as count FROM quizzes').get() as any).count;
  if (count > 0) return;

  console.log('[Seed] 插入示例题库数据...');

  const insertQuestion = db.prepare(
    'INSERT INTO questions (quiz_id, type, content, options, answer) VALUES (?, ?, ?, ?, ?)'
  );

  // 题库1: 历史知识
  const historyId = db.prepare('INSERT INTO quizzes (name, description) VALUES (?, ?)').run('历史知识', '测试你的历史知识储备').lastInsertRowid;
  const historyQuestions = [
    { type: 'single', content: '秦始皇统一六国是哪一年？', options: ['A.公元前230年', 'B.公元前221年', 'C.公元前210年', 'D.公元前206年'], answer: 1 },
    { type: 'single', content: '唐朝的开国皇帝是谁？', options: ['A.李世民', 'B.李渊', 'C.李治', 'D.李隆基'], answer: 1 },
    { type: 'judge', content: '赤壁之战中，曹操是获胜方。', options: ['正确', '错误'], answer: 1 },
    { type: 'single', content: '丝绸之路的开辟与哪位历史人物有关？', options: ['A.班超', 'B.张骞', 'C.郑和', 'D.玄奘'], answer: 1 },
    { type: 'judge', content: '《史记》的作者是司马光。', options: ['正确', '错误'], answer: 1 },
    { type: 'single', content: '工业革命最早发生在哪个国家？', options: ['A.法国', 'B.德国', 'C.英国', 'D.美国'], answer: 2 },
    { type: 'single', content: '以下哪个朝代定都北京？', options: ['A.唐朝', 'B.宋朝', 'C.元朝', 'D.汉朝'], answer: 2 },
    { type: 'judge', content: '明朝的建立者是朱元璋。', options: ['正确', '错误'], answer: 0 },
    { type: 'single', content: '第一次世界大战爆发于哪一年？', options: ['A.1912年', 'B.1914年', 'C.1916年', 'D.1918年'], answer: 1 },
    { type: 'single', content: '"焚书坑儒"发生在哪个朝代？', options: ['A.商朝', 'B.周朝', 'C.秦朝', 'D.汉朝'], answer: 2 },
  ];
  for (const q of historyQuestions) insertQuestion.run(historyId, q.type, q.content, JSON.stringify(q.options), q.answer);

  // 题库2: 科学常识
  const scienceId = db.prepare('INSERT INTO quizzes (name, description) VALUES (?, ?)').run('科学常识', '考验你的科学知识').lastInsertRowid;
  const scienceQuestions = [
    { type: 'single', content: '光在真空中的传播速度约为？', options: ['A.3×10⁶ m/s', 'B.3×10⁷ m/s', 'C.3×10⁸ m/s', 'D.3×10⁹ m/s'], answer: 2 },
    { type: 'judge', content: '水在4°C时密度最大。', options: ['正确', '错误'], answer: 0 },
    { type: 'single', content: '人体最大的器官是什么？', options: ['A.肝脏', 'B.皮肤', 'C.大脑', 'D.肺'], answer: 1 },
    { type: 'single', content: '化学元素周期表中，第一个元素是？', options: ['A.氧', 'B.氮', 'C.碳', 'D.氢'], answer: 3 },
    { type: 'judge', content: '地球是太阳系中最大的行星。', options: ['正确', '错误'], answer: 1 },
    { type: 'single', content: 'DNA的中文全称是什么？', options: ['A.脱氧核糖核酸', 'B.核糖核酸', 'C.氨基酸', 'D.脂肪酸'], answer: 0 },
    { type: 'single', content: '以下哪种气体在空气中含量最多？', options: ['A.氧气', 'B.氮气', 'C.二氧化碳', 'D.氩气'], answer: 1 },
    { type: 'judge', content: '声音在真空中无法传播。', options: ['正确', '错误'], answer: 0 },
    { type: 'single', content: '地球的自然卫星是什么？', options: ['A.太阳', 'B.月球', 'C.火星', 'D.金星'], answer: 1 },
    { type: 'single', content: '以下哪种物质的硬度最高？', options: ['A.铁', 'B.铜', 'C.金刚石', 'D.铝'], answer: 2 },
  ];
  for (const q of scienceQuestions) insertQuestion.run(scienceId, q.type, q.content, JSON.stringify(q.options), q.answer);

  // 题库3: 体育竞技
  const sportsId = db.prepare('INSERT INTO quizzes (name, description) VALUES (?, ?)').run('体育竞技', '看看你是不是体育达人').lastInsertRowid;
  const sportsQuestions = [
    { type: 'single', content: '篮球比赛每队上场几人？', options: ['A.4人', 'B.5人', 'C.6人', 'D.7人'], answer: 1 },
    { type: 'judge', content: '足球比赛全场共90分钟。', options: ['正确', '错误'], answer: 0 },
    { type: 'single', content: '奥运会每几年举办一次？', options: ['A.2年', 'B.3年', 'C.4年', 'D.5年'], answer: 2 },
    { type: 'single', content: '乒乓球起源于哪个国家？', options: ['A.中国', 'B.英国', 'C.日本', 'D.美国'], answer: 1 },
    { type: 'judge', content: '马拉松全程约为42.195公里。', options: ['正确', '错误'], answer: 0 },
    { type: 'single', content: 'NBA总冠军奖杯叫什么？', options: ['A.大力神杯', 'B.拉里·奥布莱恩杯', 'C.温布尔登杯', 'D.戴维斯杯'], answer: 1 },
    { type: 'single', content: '标准游泳池长度是多少米？', options: ['A.25米', 'B.50米', 'C.100米', 'D.200米'], answer: 1 },
    { type: 'judge', content: '排球比赛中可以用脚踢球。', options: ['正确', '错误'], answer: 0 },
    { type: 'single', content: '以下哪项不属于三大球？', options: ['A.足球', 'B.篮球', 'C.排球', 'D.网球'], answer: 3 },
    { type: 'single', content: '百米世界纪录保持者是？', options: ['A.博尔特', 'B.盖伊', 'C.布雷克', 'D.鲍威尔'], answer: 0 },
  ];
  for (const q of sportsQuestions) insertQuestion.run(sportsId, q.type, q.content, JSON.stringify(q.options), q.answer);

  console.log('[Seed] 示例数据插入完成');
}
