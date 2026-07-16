export type LearningTrack = "singing" | "fingerstyle";

export type SongQuest = {
  id: string;
  title: string;
  artist: string;
  track: LearningTrack;
  level: number;
  stage: string;
  trainingBpm: string;
  focus: string;
  chords?: string[];
  pattern: string;
  unlock: string;
};

export type CourseStage = {
  id: string;
  order: number;
  months: string;
  title: string;
  subtitle: string;
  goals: string[];
  checkpoint: string;
  songs: string[];
};

export const singingStages: CourseStage[] = [
  {
    id: "singing-1",
    order: 1,
    months: "第 1-4 周",
    title: "开放和弦与稳拍",
    subtitle: "把拍子、放松和干净发声放在速度之前",
    goals: ["掌握 Em、Am、E、C、G、D", "60-70 BPM 四分音符与八分音符", "完成 4 组常用和弦转换"],
    checkpoint: "连续 3 次完整弹完一首慢速歌曲，中途不断拍",
    songs: ["月亮代表我的心", "后来", "童年"],
  },
  {
    id: "singing-2",
    order: 2,
    months: "第 2-3 月",
    title: "弹唱协调",
    subtitle: "右手节奏自动化后，再把歌词放进拍内",
    goals: ["C-G-Am-Em 等循环转换", "每分钟干净转换 25-35 次", "主歌、预副歌、副歌分段合并"],
    checkpoint: "8 首中文歌可看和弦谱稳定弹唱",
    songs: ["稻香", "成都", "暖暖", "小幸运"],
  },
  {
    id: "singing-3",
    order: 3,
    months: "第 4-6 月",
    title: "F 和弦与节奏语汇",
    subtitle: "从 Fmaj7、小横按逐级进入完整大横按",
    goals: ["Fmaj7-小 F-完整 F 无痛进阶", "掌握扫弦重音、附点和基础切分", "建立 15 首歌的可演奏曲库"],
    checkpoint: "F-C、F-Am、F-G 转换清晰且无持续酸痛",
    songs: ["平凡之路", "晴天", "蓝莲花", "情非得已"],
  },
  {
    id: "singing-4",
    order: 4,
    months: "第 7-9 月",
    title: "拍号、调性与表现",
    subtitle: "能识别歌曲结构，并选择适合嗓音的调",
    goals: ["掌握 3/4、6/8 与切分节奏", "使用变调夹完成常见移调", "累积 22-24 首歌"],
    checkpoint: "能独立拆解一首新歌的拍号、和弦与段落",
    songs: ["天黑黑", "贝加尔湖畔", "这世界那么多人", "旅行的意义"],
  },
  {
    id: "singing-5",
    order: 5,
    months: "第 10-12 月",
    title: "独立学习与完整演出",
    subtitle: "从跟谱练习进入自主编配与稳定录制",
    goals: ["30 首可弹唱曲目", "10 首随时可完整演出", "完成录音复盘与舞台模拟"],
    checkpoint: "一次连续完成 3 首歌，节拍稳定、换和弦顺畅",
    songs: ["夜空中最亮的星", "追光者", "起风了", "如愿"],
  },
];

export const fingerstyleStages: CourseStage[] = [
  {
    id: "fingerstyle-1",
    order: 1,
    months: "第 13-15 月",
    title: "PIMA 与旋律独立",
    subtitle: "拇指负责低音，i、m、a 负责高音声部",
    goals: ["PIMA 固定指法", "交替低音不抢拍", "旋律音突出且伴奏更轻"],
    checkpoint: "完成 1-3 首入门独奏曲，速度达到训练目标的 80%",
    songs: ["童话", "后来", "小幸运", "成都"],
  },
  {
    id: "fingerstyle-2",
    order: 2,
    months: "第 16-18 月",
    title: "旋律与低音双声部",
    subtitle: "处理把位移动、延音与段落连接",
    goals: ["旋律和低音音量分层", "换把时保持旋律连贯", "积累 6-8 首完整曲"],
    checkpoint: "低音连续、旋律清晰，错误后可在下一小节恢复",
    songs: ["稻香", "晴天", "七里香", "夜空中最亮的星"],
  },
  {
    id: "fingerstyle-3",
    order: 3,
    months: "第 19-21 月",
    title: "装饰音与音色",
    subtitle: "技巧服务旋律，不为炫技牺牲节拍",
    goals: ["击勾弦、滑音、自然泛音", "基础拍弦与动态控制", "复杂段落分层练习"],
    checkpoint: "装饰音进入原拍位，录音中无明显音量突变",
    songs: ["花海", "青花瓷", "贝加尔湖畔", "大鱼"],
  },
  {
    id: "fingerstyle-4",
    order: 4,
    months: "第 22-24 月",
    title: "改编、录音与作品集",
    subtitle: "从理解和声开始做自己的指弹编配",
    goals: ["选择调性与把位", "编写前奏、间奏与结尾", "完成 5 首高完成度录音"],
    checkpoint: "10-20 首独奏曲目，5 首可公开演出的作品",
    songs: ["起风了", "如愿", "这世界那么多人", "追光者"],
  },
];

export const songQuests: SongQuest[] = [
  { id: "moon", title: "月亮代表我的心", artist: "邓丽君", track: "singing", level: 1, stage: "稳拍入门", trainingBpm: "56-64", focus: "四分音符下扫与慢速开口", chords: ["C", "Am", "Fmaj7", "G"], pattern: "每拍下扫一次", unlock: "开放和弦能逐个发声" },
  { id: "later-sing", title: "后来", artist: "刘若英", track: "singing", level: 1, stage: "开放和弦", trainingBpm: "58-68", focus: "主歌分句与换和弦预备", chords: ["C", "G", "Am", "Em", "Fmaj7"], pattern: "下 下上 上下上", unlock: "C-G-Am-Em 可循环 4 轮" },
  { id: "childhood", title: "童年", artist: "罗大佑", track: "singing", level: 2, stage: "八分节奏", trainingBpm: "66-78", focus: "右手连续运动与重音", chords: ["G", "Em", "C", "D"], pattern: "八分音符连续摆动", unlock: "四分音符 70 BPM 不抢拍" },
  { id: "rice", title: "稻香", artist: "周杰伦", track: "singing", level: 2, stage: "弹唱协调", trainingBpm: "68-80", focus: "弱起、歌词与循环和弦", chords: ["G", "D", "Em", "C"], pattern: "先拍腿念词，再加入扫弦", unlock: "和弦循环 2 分钟不断拍" },
  { id: "chengdu-sing", title: "成都", artist: "赵雷", track: "singing", level: 2, stage: "分解和弦", trainingBpm: "58-72", focus: "低音与高音分层", chords: ["C", "Em", "Fmaj7", "G", "Am"], pattern: "P-i-m-a 分解", unlock: "右手 PIMA 可盲弹 1 分钟" },
  { id: "warm", title: "暖暖", artist: "梁静茹", track: "singing", level: 3, stage: "和弦转换", trainingBpm: "68-82", focus: "副歌换和弦与呼吸", chords: ["C", "G", "Am", "Fmaj7"], pattern: "下 下上 上下上", unlock: "每分钟干净转换 30 次" },
  { id: "luck-sing", title: "小幸运", artist: "田馥甄", track: "singing", level: 3, stage: "完整弹唱", trainingBpm: "64-78", focus: "段落动态与进入点", chords: ["C", "G", "Am", "Em", "F"], pattern: "主歌轻扫，副歌增强重音", unlock: "Fmaj7 无痛且歌词可按拍朗读" },
  { id: "ordinary", title: "平凡之路", artist: "朴树", track: "singing", level: 4, stage: "F 和弦", trainingBpm: "68-82", focus: "F 转换与稳定循环", chords: ["C", "G", "Am", "F"], pattern: "持续八分音符，2/4 拍重音", unlock: "小 F 保持 20 秒无明显酸胀" },
  { id: "sunny-sing", title: "晴天", artist: "周杰伦", track: "singing", level: 4, stage: "节奏进阶", trainingBpm: "70-84", focus: "附点、切分与语句", chords: ["G", "D", "Em", "C"], pattern: "先空弦练重音，再套和弦", unlock: "八分节奏右手可持续 3 分钟" },
  { id: "blue-lotus", title: "蓝莲花", artist: "许巍", track: "singing", level: 4, stage: "力度控制", trainingBpm: "72-88", focus: "扫弦层次与副歌推进", chords: ["C", "G", "Am", "F"], pattern: "弱-弱-强-弱的四拍分组", unlock: "F-C 与 F-G 各 20 次干净转换" },
  { id: "love-must", title: "情非得已", artist: "庾澄庆", track: "singing", level: 5, stage: "切分节奏", trainingBpm: "72-88", focus: "休止、切分与闷音", chords: ["C", "G", "Am", "F"], pattern: "先口念节奏，再分层加入闷音", unlock: "休止时右手仍保持摆动" },
  { id: "stars", title: "夜空中最亮的星", artist: "逃跑计划", track: "singing", level: 6, stage: "舞台弹唱", trainingBpm: "70-86", focus: "长句呼吸与动态", chords: ["C", "G", "Am", "F"], pattern: "主歌克制、副歌打开", unlock: "可连续完成两首歌" },
  { id: "wind", title: "起风了", artist: "买辣椒也用券", track: "singing", level: 7, stage: "综合挑战", trainingBpm: "68-84", focus: "密集歌词与段落速度", chords: ["C", "G", "Am", "Em", "F"], pattern: "半速朗读到原训练速度", unlock: "可独立拆分歌曲结构" },
  { id: "wish", title: "如愿", artist: "王菲", track: "singing", level: 8, stage: "演出曲目", trainingBpm: "60-76", focus: "音色、呼吸与情绪弧线", chords: ["C", "G", "Am", "F", "Dm", "Em"], pattern: "分解与扫弦按段落切换", unlock: "录音复盘能指出三项改进" },
  { id: "fairytale-fs", title: "童话", artist: "光良", track: "fingerstyle", level: 1, stage: "单旋律", trainingBpm: "48-60", focus: "旋律连贯与固定指法", pattern: "旋律单练，再加每小节根音", unlock: "PIMA 空弦 60 BPM 稳定" },
  { id: "later-fs", title: "后来", artist: "刘若英", track: "fingerstyle", level: 1, stage: "PIMA 入门", trainingBpm: "50-62", focus: "旋律突出、伴奏轻弹", pattern: "低音 40%，旋律 70% 音量", unlock: "单旋律可完整弹奏" },
  { id: "luck-fs", title: "小幸运", artist: "田馥甄", track: "fingerstyle", level: 2, stage: "旋律加低音", trainingBpm: "52-66", focus: "拇指独立与延音", pattern: "每拍低音，旋律保持连贯", unlock: "交替低音 2 分钟不断拍" },
  { id: "chengdu-fs", title: "成都", artist: "赵雷", track: "fingerstyle", level: 2, stage: "双声部", trainingBpm: "54-68", focus: "低音线与高音旋律", pattern: "先拆两声部，再两小节合并", unlock: "低音、旋律可分别背奏" },
  { id: "sunny-fs", title: "晴天", artist: "周杰伦", track: "fingerstyle", level: 3, stage: "换把连接", trainingBpm: "56-70", focus: "把位移动与开放弦衔接", pattern: "换把前保留公共音", unlock: "两小节连接可重复 5 次无停顿" },
  { id: "rice-fs", title: "稻香", artist: "周杰伦", track: "fingerstyle", level: 3, stage: "律动双声部", trainingBpm: "58-72", focus: "低音律动与旋律错位", pattern: "节拍器只点 2、4 拍", unlock: "普通四拍下可稳定演奏" },
  { id: "china-blue", title: "青花瓷", artist: "周杰伦", track: "fingerstyle", level: 5, stage: "装饰音", trainingBpm: "54-68", focus: "击勾弦与滑音音色", pattern: "装饰音前后主拍位置不变", unlock: "击勾弦音量接近拨弦音" },
  { id: "big-fish", title: "大鱼", artist: "周深", track: "fingerstyle", level: 6, stage: "泛音与动态", trainingBpm: "50-64", focus: "自然泛音、延音与呼吸", pattern: "旋律句尾留足时值", unlock: "12 品泛音可稳定发声" },
  { id: "wind-fs", title: "起风了", artist: "买辣椒也用券", track: "fingerstyle", level: 7, stage: "完整编配", trainingBpm: "54-70", focus: "多段落与密集旋律", pattern: "按 A/B/C 段分别录音验收", unlock: "可稳定完成 3 首中级独奏曲" },
  { id: "wish-fs", title: "如愿", artist: "王菲", track: "fingerstyle", level: 8, stage: "作品集", trainingBpm: "50-66", focus: "个人编配与录音", pattern: "先写低音骨架，再补旋律内声部", unlock: "能独立标注调性、和声与结构" },
];

export const chordPairs = [
  { id: "em-am", from: "Em", to: "Am", level: 1, tip: "先找 2 指锚点，拇指保持放松" },
  { id: "c-g", from: "C", to: "G", level: 1, tip: "抬指要低，先让无名指看向 6 弦" },
  { id: "g-d", from: "G", to: "D", level: 2, tip: "手腕不甩动，三指一起落下" },
  { id: "am-c", from: "Am", to: "C", level: 2, tip: "食指、中指不离弦，只移动无名指" },
  { id: "fmaj7-c", from: "Fmaj7", to: "C", level: 3, tip: "保留 2、3 指关系，不挤压虎口" },
  { id: "smallf-am", from: "小 F", to: "Am", level: 4, tip: "横按只压需要的两根弦" },
  { id: "f-c", from: "F", to: "C", level: 5, tip: "食指用侧面，靠手臂重量而非拇指夹力" },
  { id: "f-g", from: "F", to: "G", level: 5, tip: "先慢速整体抬落，再增加速度" },
];

export const spiderPatterns = [
  { id: "1234", label: "1-2-3-4 顺序", value: "1 2 3 4", level: 1 },
  { id: "4321", label: "4-3-2-1 逆序", value: "4 3 2 1", level: 1 },
  { id: "1324", label: "1-3-2-4 独立", value: "1 3 2 4", level: 2 },
  { id: "1423", label: "1-4-2-3 跨指", value: "1 4 2 3", level: 3 },
];
