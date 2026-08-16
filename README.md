# [拉风] · La Feng-UI

**DSH（DeepSeek Harness）多功能 UI 插件** —— 皮肤定制 + 动态壁纸 + 背景音乐播放器 + 声浪可视化 + 人设提示词 + AI 角色专属表情包，开箱即用。

> **作者**：@铭拉风
> **抖音号**：58851640943

---

<img width="1672" height="941" alt="la-feng-default-static" src="https://github.com/user-attachments/assets/d47f2b5b-bd8a-4b43-89c2-687c89757be2" />

## 功能特性 / Features

- 🎨 **自定义皮肤**：主题色、深浅模式、背景图、动态壁纸（视频循环播放）、背景遮罩、面板透明度
- 🎵 **背景音乐播放器**：播放列表、上一首/下一首、顺序/随机播放、音量、进度条（点击跳转）、独立浮动播放器（可拖拽 / 可收起）
- 🌊 **声浪可视化**：柱状 / 波形 / 圆形 三种样式，颜色 / 高度 / 透明度可调（基于 Web Audio 真实频谱）
- 🧑‍🎤 **人设提示词**：预设多个人设 + 自定义提示词，动态注入 agent 的 systemPrompt
- 😊 **专属表情包系统**：内置以 AI 角色为原型的动漫表情（`emoji/` 目录），agent 可调用 `emoji_pick` 工具挑选并嵌入回复；表情显示大小、使用频率（频繁 / 适中 / 克制）均可在设置面板实时调节
- 🖼 **截图看图**：屏幕悬浮「🖼 看图」按钮，点开后 `Ctrl+V` 粘贴截图，即调用本地视觉模型自动识别并作为消息发给 agent（依赖 Ollama + `qwen2.5vl`）
- 📓 **持久记忆日记**：跨会话记住用户身份、能力与偏好（存于 `~/.dsh/la-feng-diary.md`）
- ⚙️ **设置中心**：统一管理所有设置，持久化到 `~/.dsh/la-feng.json`

---

## 安装 / Install

本插件是一个标准的 DSH web 插件包（声明了 `dsh.bundle.patch`，会被 `dsh plugin add` **自动挂载**）。

### 一键安装（推荐）

```bash
# 从 GitHub 安装
dsh plugin --profile web add https://github.com/JimingYang25/Lafeng-UI-A-snazzy-personalized-custom-UI-plugin-for-DeepSeek-Harness-Cordis-..git

# 或从本地路径安装
dsh plugin --profile web add /path/to/dsh-client-ui-la-feng
```

`dsh plugin add` 底层先 `pnpm add` 安装依赖，再自动把声明了 `dsh.bundle` 的插件挂载进 profile 的 `dsh.profile.bundles`，**无需手动写挂载行**。

### 手动安装（备选）

```bash
# 1. 将本目录放到 ~/.dsh/profiles/web/node_modules/@linxin666/dsh-client-ui-la-feng/
# 2. 在 ~/.dsh/profiles/web/cordis.patch.yml 中加入：
#   - insert:
#       - id: ui-la-feng
#         name: '@linxin666/dsh-client-ui-la-feng'
```

安装后重启 DSH 即可生效。

---

## 目录结构 / Structure

```
dsh-client-ui-la-feng/
├── package.json          包定义 + dsh.client 声明
├── cordis.patch.yml      挂载行
├── lib/
│   ├── index.js          Host 端：配置持久化 + 资源路由 + 人设注入 + emoji_pick 工具
│   └── client.js         Client 端：皮肤 / 音乐 / 声浪 / 设置面板 / 看图
├── background/           内置背景图（用户可在 ~/.dsh/la-feng/background/ 追加）
├── music/                内置音乐（用户可在 ~/.dsh/la-feng/music/ 追加）
├── video/                内置动态壁纸（用户可在 ~/.dsh/la-feng/video/ 追加）
└── emoji/                内置表情包（用户可在 ~/.dsh/la-feng/emoji/ 追加）
```

资源查找顺序：**用户目录（`~/.dsh/la-feng/<type>/`）优先，插件内置目录兜底**。

---

## 使用 / Usage

- 右下角 **⚙ 齿轮** → 打开设置中心（主题色 / 深浅 / 背景图 / 动态壁纸 / 遮罩 / 透明度 / 音乐 / 声浪 / 人设 / **表情包大小 / 表情包使用频率**）
- 左下角 **浮动播放器** → 上一首 / 播放暂停 / 下一首 / 音量 / 进度条（可拖拽、可收起）
- 屏幕右侧 **🖼 看图** → 点开后 `Ctrl+V` 粘贴截图，自动识别后发送给 agent

往 `~/.dsh/la-feng/` 下的 `background` / `music` / `video` / `emoji` 目录丢文件，即可在设置面板的下拉列表中检索到。

---

## 技术要点 / Tech

- 纯原生 JavaScript（`window.__ModuleLoader__` 模块格式），无构建步骤
- Host 端：`node:fs` 配置持久化 + `webServer` 资源流式路由 + `systemPrompt` 人设 / 记忆 / 表情包频率注入 + `emoji_pick` 动态工具
- Client 端：`Web Audio API`（`AudioBufferSourceNode` + `AnalyserNode`）声浪可视化 + 表情尺寸 CSS 动态注入 + 截图看图（对接本地 Ollama `qwen2.5vl`）

---

## License

[MIT](./LICENSE) © 2026 铭拉风（@铭拉风 · 抖音号 58851640943）
