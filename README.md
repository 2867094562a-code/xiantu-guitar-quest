# 弦途 · 吉他闯关训练

面向吉他弹唱与指弹的两年循序训练应用。正式版部署在
[xiantu-guitar-quest.vercel.app](https://xiantu-guitar-quest.vercel.app)。

## 功能

- 每日闯关与跨场景进度记忆
- 可调 BPM、组时长、组数和休息时间的爬格子训练
- 和弦转换、曲谱试弹及麦克风识别
- 独立节拍器与低敏感度调音器
- 中文流行歌弹唱曲库与难度递增指弹路线
- 图片/PDF 曲谱导入、OCR 和节拍结构识别
- 匿名云端档案与跨设备同步码

## 技术结构

- Next.js 16 App Router
- Neon Postgres + Drizzle ORM
- Vercel Blob 私密曲谱存储
- Vercel Functions 与 Vercel 部署

## 本地运行

需要 Node.js 22。

```bash
npm install
npm run dev
```

从 Vercel 拉取开发环境变量后执行数据库迁移：

```bash
vercel env pull .env.local --environment=development
npm run db:migrate
```

## 校验命令

```bash
npm test
npm run db:generate
```

用户上传的曲谱存放在私密 Blob 仓库中，不通过曲库接口暴露文件地址。
