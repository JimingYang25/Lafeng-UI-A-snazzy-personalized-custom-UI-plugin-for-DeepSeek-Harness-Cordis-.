# 拉风 · La Feng

**DSH（DeepSeek Harness）多功能 UI 插件** —— 皮肤定制 + 动态壁纸 + 背景音乐播放器 + 声浪可视化 + 人设提示词，开箱即用，完全独立于 web-ui 全家桶。

> **作者**：@铭拉风
> **抖音号**：58851640943

---

## 功能特性 / Features

- 🎨 **自定义皮肤**：主题色、深浅模式、背景图、动态壁纸（视频循环播放）、背景遮罩、面板透明度
- 🎵 **背景音乐播放器**：播放列表、上一首/下一首、顺序/随机播放、音量、进度条（点击跳转）、独立浮动播放器（可拖拽 / 可收起）
- 🌊 **声浪可视化**：柱状 / 波形 / 圆形 三种样式，颜色 / 高度 / 透明度可调（基于 Web Audio 真实频谱）
- 🧑‍🎤 **人设提示词**：预设多个人设 + 自定义提示词，动态注入 agent 的 systemPrompt
- ⚙️ **设置中心**：统一管理所有设置，持久化到 `~/.dsh/la-feng.json`

---

## 安装 / Install

本插件是一个标准的 DSH web 插件包（`dsh.client` 声明 + `cordis.patch.yml` 挂载）。

### 方式一：pnpm 安装 + 手动挂载

```bash
# 1. 安装依赖（本地路径或 GitHub 仓库均可）
dsh plugin --profile web add /path/to/dsh-client-ui-la-feng
# 或
dsh plugin --profile web add https://github.com/JimingYang25/Lafeng-UI-A-snazzy-personalized-custom-UI-plugin-for-DeepSeek-Harness-Cordis-.git

# 2. 挂载：编辑 ~/.dsh/profiles/web/cordis.patch.yml，加入：
#   - insert:
#       - id: ui-la-feng
#         name: '@linxin666/dsh-client-ui-la-feng'
```

### 方式二：手动放入 + 挂载

```bash
# 1. 将本目录放到 ~/.dsh/profiles/web/node_modules/@linxin666/dsh-client-ui-la-feng/
# 2. 在 ~/.dsh/profiles/web/cordis.patch.yml 中加入同样的 insert 行
```

> 注意：`dsh plugin add` 底层是 `pnpm add`，只安装依赖，**不会自动挂载**。
> 安装后必须再写上面第 2 步的 `insert` 行，插件才会被 boot 图加载。

安装并挂载后重启 DSH 即可生效。

---

## 目录结构 / Structure

```
dsh-client-ui-la-feng/
├── package.json          包定义 + dsh.client 声明
├── cordis.patch.yml      挂载行
├── lib/
│   ├── index.js          Host 端：配置持久化 + 资源路由 + 人设注入
│   └── client.js         Client 端：皮肤 / 音乐 / 声浪 / 设置面板
├── background/           内置背景图（用户可在 ~/.dsh/la-feng/background/ 追加）
├── music/                内置音乐（用户可在 ~/.dsh/la-feng/music/ 追加）
└── video/                内置动态壁纸（用户可在 ~/.dsh/la-feng/video/ 追加）
```

资源查找顺序：**用户目录（`~/.dsh/la-feng/<type>/`）优先，插件内置目录兜底**。

---

## 使用 / Usage

- 右下角 **⚙ 齿轮** → 打开设置中心（主题色 / 深浅 / 背景图 / 动态壁纸 / 遮罩 / 透明度 / 音乐 / 声浪 / 人设）
- 左下角 **浮动播放器** → 上一首 / 播放暂停 / 下一首 / 音量 / 进度条（可拖拽、可收起）

往 `~/.dsh/la-feng/` 下的 `background` / `music` / `video` 目录丢文件，即可在设置面板的下拉列表中检索到。

---

## 技术要点 / Tech

- 纯原生 JavaScript（`window.__ModuleLoader__` 模块格式），无构建步骤
- Host 端：`node:fs` 配置持久化 + `webServer` 资源流式路由 + `systemPrompt` 人设注入
- Client 端：`Web Audio API`（`AudioBufferSourceNode` + `AnalyserNode`）声浪可视化

---

## License

[MIT](./LICENSE) © 2026 铭拉风（@铭拉风 · 抖音号 58851640943）
