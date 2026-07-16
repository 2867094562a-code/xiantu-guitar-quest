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
  trialNotes?: string[];
  trialSource?: "公版旋律短句" | "原创技术片段";
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
    songs: ["小星星", "欢乐颂", "绿袖子", "爱的罗曼史"],
  },
  {
    id: "fingerstyle-2",
    order: 2,
    months: "第 16-18 月",
    title: "旋律与低音双声部",
    subtitle: "处理把位移动、延音与段落连接",
    goals: ["旋律和低音音量分层", "换把时保持旋律连贯", "积累 6-8 首完整曲"],
    checkpoint: "低音连续、旋律清晰，错误后可在下一小节恢复",
    songs: ["卡农", "泪", "风之诗", "黄昏"],
  },
  {
    id: "fingerstyle-3",
    order: 3,
    months: "第 19-21 月",
    title: "装饰音与音色",
    subtitle: "技巧服务旋律，不为炫技牺牲节拍",
    goals: ["击勾弦、滑音、自然泛音", "基础拍弦与动态控制", "复杂段落分层练习"],
    checkpoint: "装饰音进入原拍位，录音中无明显音量突变",
    songs: ["Rylynn", "Drifting", "Fight", "Passionflower"],
  },
  {
    id: "fingerstyle-4",
    order: 4,
    months: "第 22-24 月",
    title: "改编、录音与作品集",
    subtitle: "从理解和声开始做自己的指弹编配",
    goals: ["选择调性与把位", "编写前奏、间奏与结尾", "完成 5 首高完成度录音"],
    checkpoint: "10-20 首独奏曲目，5 首可公开演出的作品",
    songs: ["公版曲改编", "现代指弹技术曲", "个人原创", "录音作品集"],
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
  { id: "twinkle-fs", title: "小星星", artist: "法国民歌", track: "fingerstyle", level: 1, stage: "单音入门", trainingBpm: "46-58", focus: "一弦旋律与均匀时值", trialNotes: ["C4", "C4", "G4", "G4", "A4", "A4", "G4", "E4"], trialSource: "公版旋律短句", pattern: "每两拍一个音，先唱音名再弹", unlock: "连续 8 个音均落在节拍内" },
  { id: "ode-fs", title: "欢乐颂", artist: "贝多芬", track: "fingerstyle", level: 1, stage: "旋律连贯", trainingBpm: "48-60", focus: "相邻音移动与延音", trialNotes: ["E4", "E4", "F4", "G4", "G4", "F4", "E4", "D4"], trialSource: "公版旋律短句", pattern: "保留手指，避免每个音都抬高手掌", unlock: "旋律短句可重复 3 次无断拍" },
  { id: "greensleeves-fs", title: "绿袖子", artist: "英格兰民歌", track: "fingerstyle", level: 2, stage: "三拍子旋律", trainingBpm: "50-62", focus: "3/4 拍与弱起", trialNotes: ["A4", "C5", "D5", "E5", "F5", "E5", "D5", "B4"], trialSource: "公版旋律短句", pattern: "强-弱-弱分组，句尾留足时值", unlock: "能口数三拍并保持旋律连贯" },
  { id: "romance-fs", title: "爱的罗曼史", artist: "西班牙传统曲", track: "fingerstyle", level: 2, stage: "轮指分解", trainingBpm: "52-64", focus: "a-m-i 连续与旋律突出", trialNotes: ["E4", "G4", "B4", "E5", "B4", "G4", "E4", "B3"], trialSource: "公版旋律短句", pattern: "高音旋律 70%，内声部 40% 音量", unlock: "a-m-i 可连续 2 分钟不乱指" },
  { id: "canon-fs", title: "D 大调卡农", artist: "帕赫贝尔", track: "fingerstyle", level: 3, stage: "低音进行", trainingBpm: "54-68", focus: "低音骨架与和声方向", trialNotes: ["D3", "A2", "B2", "F#2", "G2", "D2", "G2", "A2"], trialSource: "公版旋律短句", pattern: "先只弹低音，再叠加高音分解", unlock: "八个低音可闭眼定位" },
  { id: "lagrima-fs", title: "泪", artist: "弗朗西斯科·塔雷加", track: "fingerstyle", level: 3, stage: "双声部歌唱", trainingBpm: "48-60", focus: "旋律、低音与内声部分层", trialNotes: ["E4", "F#4", "G4", "B4", "A4", "G4", "F#4", "E4"], trialSource: "公版旋律短句", pattern: "旋律音先单独唱，再加入轻声伴奏", unlock: "旋律音量稳定高于内声部" },
  { id: "wind-song-fs", title: "风之诗", artist: "押尾光太郎", track: "fingerstyle", level: 4, stage: "现代指弹音色", trainingBpm: "54-68", focus: "泛音、击勾弦与动态", trialNotes: ["E4", "B4", "G4", "F#4", "E4", "G4", "B4", "E5"], trialSource: "原创技术片段", pattern: "试弹区使用同难度原创片段，不复刻原曲旋律", unlock: "泛音与普通拨弦音量接近" },
  { id: "twilight-fs", title: "黄昏", artist: "押尾光太郎", track: "fingerstyle", level: 5, stage: "拍弦与旋律", trainingBpm: "56-70", focus: "拍弦不挤占旋律拍位", trialNotes: ["A3", "E4", "A4", "C5", "B4", "G4", "E4", "A3"], trialSource: "原创技术片段", pattern: "先无拍弦完成旋律，再加入每小节一次拍击", unlock: "拍击前后节拍不加速" },
  { id: "rylynn-fs", title: "Rylynn", artist: "Andy McKee", track: "fingerstyle", level: 6, stage: "开放调弦思维", trainingBpm: "58-72", focus: "延音、击弦与宽把位", trialNotes: ["D3", "A3", "D4", "F#4", "A4", "F#4", "E4", "D4"], trialSource: "原创技术片段", pattern: "试弹区训练开放弦延音与宽把位连接", unlock: "换把时开放弦延音不中断" },
  { id: "drifting-fs", title: "Drifting", artist: "Andy McKee", track: "fingerstyle", level: 6, stage: "双手点弦", trainingBpm: "50-64", focus: "点弦、拍击与低音独立", trialNotes: ["E3", "B3", "E4", "G4", "B4", "G4", "F#4", "E4"], trialSource: "原创技术片段", pattern: "先把点弦当普通旋律练准，再加入打板动作", unlock: "点弦音量达到普通拨弦的 70%" },
  { id: "fight-fs", title: "Fight", artist: "押尾光太郎", track: "fingerstyle", level: 7, stage: "高速综合技巧", trainingBpm: "60-76", focus: "连续拍弦、击勾弦与强弱", trialNotes: ["E3", "G3", "A3", "B3", "D4", "E4", "G4", "A4"], trialSource: "原创技术片段", pattern: "每次只提升 2 BPM，清晰度低于 90% 即回退", unlock: "综合片段连续 3 次无节拍断裂" },
  { id: "passionflower-fs", title: "Passionflower", artist: "Jon Gomm", track: "fingerstyle", level: 8, stage: "作品级控制", trainingBpm: "56-72", focus: "复合节奏、调弦与全琴体音色", trialNotes: ["D3", "A3", "C4", "E4", "G4", "A4", "C5", "D5"], trialSource: "原创技术片段", pattern: "按低音、旋律、打击三层分别录音验收", unlock: "三层均能单独稳定后再合成演奏" },
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
