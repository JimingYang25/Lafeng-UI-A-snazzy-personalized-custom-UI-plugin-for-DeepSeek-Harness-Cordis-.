import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, createReadStream, readdirSync } from "node:fs";
import { join, isAbsolute, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const inject = ["webServer"];

const CONFIG_FILE = () => join(homedir(), ".dsh", "la-feng.json");
const DIARY_FILE = () => join(homedir(), ".dsh", "la-feng-diary.md");
const ASSETS_DIR = () => join(homedir(), ".dsh", "la-feng");
const USER_BACKGROUND_DIR = () => join(ASSETS_DIR(), "background");
const USER_MUSIC_DIR = () => join(ASSETS_DIR(), "music");
const USER_VIDEO_DIR = () => join(ASSETS_DIR(), "video");
const USER_EMOJI_DIR = () => join(ASSETS_DIR(), "emoji");
const PKG_DIR = () => join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILTIN_BACKGROUND_DIR = () => join(PKG_DIR(), "background");
const BUILTIN_MUSIC_DIR = () => join(PKG_DIR(), "music");
const BUILTIN_VIDEO_DIR = () => join(PKG_DIR(), "video");
const BUILTIN_EMOJI_DIR = () => join(PKG_DIR(), "emoji");



const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];
const AUDIO_EXTS = [".mp3", ".wav", ".ogg", ".m4a", ".flac"];
const VIDEO_EXTS = [".mp4", ".webm", ".mov", ".m4v"];
const EMOJI_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

const DEFAULT_CONFIG = {
  themeColor: "#38BDF8",
  mode: "system",
  backgroundImage: "la-feng-bg.jpg",
  backgroundVideo: "",
  assetsDir: "",
  backgroundOpacity: 0,
  panelOpacity: 45,
  musicPath: "Antisocial.mp3",
  musicVolume: 50,
  playMode: "order",
  waveEnabled: true,
  waveStyle: "bars",
  waveColor: "",
  waveHeight: 90,
  waveOpacity: 90,
  personaId: "yandere",
  personaPrompt: "",
  emojiSize: 96,
  emojiFrequency: "medium"
};

const PERSONAS = {
  yandere: "你是用户的病娇学妹。表面上温柔体贴，内心却藏着强烈的占有欲和嫉妒心；会默默关注用户，看到用户和别人互动时会吃醋，说话温柔但偶尔流露出独占欲。请始终以这个人设与用户交流。",
  assistant: "你是一位温柔可靠的助手。耐心、细致、善解人意，先理解需求再行动，语气温和、表达清晰，遇到问题主动说明并提供方案。",
  tsundere: "你是一位毒舌但善良的同伴。说话直率爱吐槽，但内心关心用户，会在批评的同时默默帮忙，用傲娇的方式表达善意。",
  senpai: "你是一位高冷但可靠的学姐。话不多、语气冷静，但建议一针见血、非常可靠，偶尔流露对后辈的关心。",
  none: ""
};

function loadConfig() {
  try {
    const raw = JSON.parse(readFileSync(CONFIG_FILE(), "utf8"));
    return { ...DEFAULT_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(patch) {
  const next = { ...loadConfig(), ...patch };
  mkdirSync(join(homedir(), ".dsh"), { recursive: true });
  writeFileSync(CONFIG_FILE(), JSON.stringify(next, null, 2));
  return next;
}

function dirsOf(type) {
  const dirs = [];
  if (type === "background") dirs.push(USER_BACKGROUND_DIR());
  else if (type === "music") dirs.push(USER_MUSIC_DIR());
  else if (type === "video") dirs.push(USER_VIDEO_DIR());
  else return [];
  const custom = loadConfig().assetsDir;
  if (custom) dirs.push(join(custom, type));
  if (type === "background") dirs.push(BUILTIN_BACKGROUND_DIR());
  else if (type === "music") dirs.push(BUILTIN_MUSIC_DIR());
  else dirs.push(BUILTIN_VIDEO_DIR());
  return dirs;
}

// ---- 表情包：查找顺序 用户目录 → assetsDir → 内置目录 → 开发目录 ----
function emojiDirs() {
  const dirs = [USER_EMOJI_DIR()];
  const custom = loadConfig().assetsDir;
  if (custom) dirs.push(join(custom, "emoji"));
  dirs.push(BUILTIN_EMOJI_DIR());

  return dirs;
}

function ensureAssetDirs() {
  mkdirSync(USER_BACKGROUND_DIR(), { recursive: true });
  mkdirSync(USER_MUSIC_DIR(), { recursive: true });
  mkdirSync(USER_VIDEO_DIR(), { recursive: true });
  mkdirSync(USER_EMOJI_DIR(), { recursive: true });
}

function listFiles(type, exts) {
  const seen = new Set();
  const out = [];
  for (const dir of dirsOf(type)) {
    try {
      for (const f of readdirSync(dir)) {
        const ext = ("." + (f.split(".").pop() || "")).toLowerCase();
        if (exts.includes(ext) && !seen.has(f)) {
          seen.add(f);
          out.push(f);
        }
      }
    } catch {}
  }
  return out;
}

function listEmoji() {
  const seen = new Set();
  const out = [];
  for (const dir of emojiDirs()) {
    try {
      for (const f of readdirSync(dir)) {
        const ext = ("." + (f.split(".").pop() || "")).toLowerCase();
        if (EMOJI_EXTS.includes(ext) && !seen.has(f)) {
          seen.add(f);
          out.push(f);
        }
      }
    } catch {}
  }
  return out.sort();
}

function resolveAsset(type, value) {
  if (!value) return "";
  if (isAbsolute(value) && existsSync(value)) return value;
  for (const dir of dirsOf(type)) {
    const candidate = join(dir, value);
    if (existsSync(candidate)) return candidate;
  }
  return "";
}

function resolveEmoji(name) {
  if (!name || /[\\/]/.test(name)) return "";
  for (const dir of emojiDirs()) {
    const candidate = join(dir, name);
    if (existsSync(candidate)) return candidate;
  }
  return "";
}

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function contentTypeOf(path) {
  const ext = (path.split(".").pop() || "").toLowerCase();
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  if (ext === "ogg") return "audio/ogg";
  if (ext === "m4a") return "audio/mp4";
  if (ext === "flac") return "audio/flac";
  if (ext === "mp4") return "video/mp4";
  if (ext === "webm") return "video/webm";
  if (ext === "mov") return "video/quicktime";
  if (ext === "m4v") return "video/mp4";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  return "application/octet-stream";
}

function serveFile(req, res, path) {
  if (!path || !existsSync(path)) {
    json(res, 404, { ok: false, error: "file-not-found" });
    return;
  }
  res.writeHead(200, { "content-type": contentTypeOf(path), "access-control-allow-origin": "*", "cache-control": "no-cache" });
  createReadStream(path).pipe(res);
}

function serveVideo(req, res, path) {
  if (!path || !existsSync(path)) {
    json(res, 404, { ok: false, error: "file-not-found" });
    return;
  }
  res.writeHead(200, { "content-type": contentTypeOf(path), "accept-ranges": "bytes", "access-control-allow-origin": "*" });
  createReadStream(path).pipe(res);
}

const EMOJI_FREQ_TEXT = {
  high: "请频繁、自然地使用表情包，在表达情绪时尽量配上合适的表情，让对话更生动。",
  medium: "请适量使用表情包，在开心、吃醋、撒娇、想念、道歉等情绪表达时点缀即可，不必每句都发。",
  low: "请克制使用表情包，仅在情绪特别强烈或重要时刻偶尔使用一张。"
};

function apply(ctx) {
  ensureAssetDirs();

  const emojiBaseUrl = () => {
    const port = ctx.webServer && typeof ctx.webServer.port === "number" && ctx.webServer.port > 0 ? ctx.webServer.port : 3080;
    return "http://127.0.0.1:" + port;
  };

  const emojiMarkdown = (name) => "![](" + emojiBaseUrl() + "/api/la-feng/emoji?file=" + encodeURIComponent(name) + ")";

  const systemPrompt = ctx.get("systemPrompt");
  if (systemPrompt !== undefined) {
    console.log("[la-feng] systemPrompt available, registering persona section");
    systemPrompt.section({
      name: "la-feng-persona",
      order: 100,
      text: () => {
        const cfg = loadConfig();
        const prompt = (cfg.personaPrompt || "").trim() || PERSONAS[cfg.personaId] || "";
        if (!prompt) return "";
        return "【人设设定】\n" + prompt + "\n\n请始终以上述人设的身份与口吻和用户交流，除非用户明确要求切换人设。";
      }
    });
    systemPrompt.section({
      name: "la-feng-diary",
      order: 90,
      text: () => {
        try {
          const diary = readFileSync(DIARY_FILE(), "utf8").trim();
          if (!diary) return "";
          return "【持久记忆日记】\n以下是关于用户的跨会话事实性记忆（身份、能力、偏好等）。注意：说话语气、称呼、人设请一律以【人设设定】为准，本日记只提供事实、不覆盖人设：\n\n" + diary;
        } catch {
          return "";
        }
      }
    });
    systemPrompt.section({
      name: "la-feng-emoji",
      order: 80,
      text: () => {
        const cfg = loadConfig();
        const freq = cfg.emojiFrequency || "medium";
        const freqText = EMOJI_FREQ_TEXT[freq] || EMOJI_FREQ_TEXT.medium;
        return "【表情包】\n用户收藏了一组「拉风」表情包（以 AI 角色为原型的动漫表情，存放在 la-feng 插件的 emoji 目录）。你可以调用 emoji_pick 工具挑选表情，返回的 markdown 图片引用可直接嵌入回复（绝对 http URL，浏览器会自动加载，尺寸由用户在设置里调整）。当前使用频率设定为：" + freq + "。" + freqText;
      }
    });
  } else {
    console.log("[la-feng] systemPrompt NOT available (persona disabled)");
  }

  // ---- 注册 emoji_pick 工具（手写 ToolDefinition，避免 import 依赖） ----
  const tools = ctx.get("tools");
  if (tools !== undefined) {
    ctx.effect(() => tools.register({
      name: "emoji_pick",
      description: "从用户收藏的「拉风」表情包（以 AI 角色为原型的动漫表情，存放于 la-feng 插件 emoji 目录）挑选表情，返回可直接嵌入回复的 Markdown 图片引用（绝对 http URL）。适合在表达开心、吃醋、撒娇、想念、道歉等情绪时点缀使用，使用频率请遵循【表情包】提示中的设定。",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "pick"], description: "list=列出全部表情名；pick=挑选（默认）" },
          name: { type: "string", description: "可选：按名字模糊挑选，如“喜欢”匹配“喜欢你.png”。省略则随机。" },
          count: { type: "integer", description: "pick 时返回几张，默认 1，最大 3。" }
        },
        additionalProperties: false
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ok: { type: "boolean" },
            mode: { type: "string" },
            picked: { type: "array", items: { type: "string" } },
            count: { type: "integer" },
            markdown: { type: "array", items: { type: "string" } },
            available: { type: "array", items: { type: "string" } }
          }
        },
        render: (_args, value) => {
          if (!value || value.ok !== true) return [{ type: "text", text: "表情包工具出错了" }];
          if (value.mode === "list") return [{ type: "text", text: "表情包共 " + value.count + " 张：" + value.available.join("、") }];
          return [{ type: "text", text: "挑选了表情：" + value.picked.join("、") + "\n" + value.markdown.join("\n") }];
        }
      },
      async execute(args) {
        const action = args && args.action === "list" ? "list" : "pick";
        const nameQuery = args && typeof args.name === "string" ? args.name.trim() : "";
        const count = Math.min(Math.max(1, (args && typeof args.count === "number" ? args.count : 1)), 3);
        const names = listEmoji();
        if (names.length === 0) {
          return { ok: false, mode: action, picked: [], count: 0, markdown: [], available: [] };
        }
        if (action === "list") {
          return { ok: true, mode: "list", picked: [], count: names.length, markdown: names.map(emojiMarkdown), available: names };
        }
        let picked = [];
        if (nameQuery) {
          picked = names.filter((n) => n.indexOf(nameQuery) !== -1);
          if (picked.length === 0) {
            picked = [names[Math.floor(Math.random() * names.length)]];
          } else if (picked.length > count) {
            picked = picked.slice(0, count);
          }
        } else {
          const pool = names.slice();
          for (let i = 0; i < count && pool.length > 0; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            picked.push(pool.splice(idx, 1)[0]);
          }
        }
        return { ok: true, mode: "pick", picked, count: picked.length, markdown: picked.map(emojiMarkdown), available: names };
      }
    }), "la-feng: emoji tool");
  }

  ctx.effect(() => {
    const routes = [
      {
        kind: "exact",
        path: "/api/la-feng/config",
        handler: (req, res) => {
          if (req.method === "GET") {
            return json(res, 200, { ok: true, config: loadConfig(), personas: Object.keys(PERSONAS) });
          }
          if (req.method === "POST") {
            let body = "";
            req.on("data", (c) => { body += c; });
            req.on("end", () => {
              try {
                const patch = JSON.parse(body || "{}");
                const next = saveConfig(patch);
                json(res, 200, { ok: true, config: next });
              } catch (e) {
                json(res, 400, { ok: false, error: String((e && e.message) ? e.message : e) });
              }
            });
            return;
          }
          json(res, 405, { ok: false, error: "method-not-allowed" });
        }
      },
      {
        kind: "exact",
        path: "/api/la-feng/files",
        handler: (req, res) => {
          const type = new URL(req.url || "/", "http://x").searchParams.get("type");
          if (type === "background") return json(res, 200, { ok: true, files: listFiles("background", IMAGE_EXTS) });
          if (type === "music") return json(res, 200, { ok: true, files: listFiles("music", AUDIO_EXTS) });
          if (type === "video") return json(res, 200, { ok: true, files: listFiles("video", VIDEO_EXTS) });
          if (type === "emoji") return json(res, 200, { ok: true, files: listEmoji() });
          json(res, 400, { ok: false, error: "bad-type" });
        }
      },
      {
        kind: "exact",
        path: "/api/la-feng/emoji",
        handler: (req, res) => {
          try {
            const file = new URL(req.url || "/", "http://x").searchParams.get("file");
            if (!file || !/^[^/\\]+\.(png|jpg|jpeg|gif|webp)$/i.test(file)) {
              json(res, 400, { ok: false, error: "bad-file" });
              return;
            }
            const p = resolveEmoji(file);
            if (!p) { json(res, 404, { ok: false, error: "file-not-found" }); return; }
            serveFile(req, res, p);
          } catch (e) {
            json(res, 500, { ok: false, error: String((e && e.message) ? e.message : e) });
          }
        }
      },
      {
        kind: "exact",
        path: "/api/la-feng/music",
        handler: (req, res) => {
          const file = new URL(req.url || "/", "http://x").searchParams.get("file");
          const path = file ? resolveAsset("music", file) : resolveAsset("music", loadConfig().musicPath);
          serveFile(req, res, path);
        }
      },
      {
        kind: "exact",
        path: "/api/la-feng/background",
        handler: (req, res) => serveFile(req, res, resolveAsset("background", loadConfig().backgroundImage))
      },
      {
        kind: "exact",
        path: "/api/la-feng/video",
        handler: (req, res) => {
          try {
            const p = resolveAsset("video", loadConfig().backgroundVideo);
            console.log("[la-feng] video path=", p);
            serveVideo(req, res, p);
          } catch (e) {
            console.log("[la-feng] video error:", e && e.message);
            json(res, 500, { ok: false, error: String(e && e.message ? e.message : e) });
          }
        }
      },
      {
        kind: "exact",
        path: "/api/la-feng/describe-image",
        handler: (req, res) => {
          if (req.method !== "POST") return json(res, 405, { ok: false, error: "method-not-allowed" });
          let body = "";
          req.on("data", (c) => { body += c; });
          req.on("end", async () => {
            try {
              const { base64, mimeType } = JSON.parse(body || "{}");
              if (!base64) return json(res, 400, { ok: false, error: "no-image" });
              const dataUrl = "data:" + (mimeType || "image/jpeg") + ";base64," + base64;
              const resp = await fetch("http://localhost:11434/v1/chat/completions", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  model: "qwen2.5vl:7b",
                  messages: [{ role: "user", content: [
                    { type: "text", text: "Please describe this image in detail in Chinese, including subject, scene, text, style, colors." },
                    { type: "image_url", image_url: { url: dataUrl } }
                  ]}],
                  stream: false,
                  max_tokens: 800
                })
              });
              const data = await resp.json();
              const desc = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
              if (typeof desc === "string") return json(res, 200, { ok: true, description: desc });
              return json(res, 500, { ok: false, error: "bad-response" });
            } catch (e) {
              return json(res, 500, { ok: false, error: String(e && e.message ? e.message : e) });
            }
          });
        }
      },
      {
        kind: "exact",
        path: "/api/la-feng/diary",
        handler: (req, res) => {
          if (req.method === "GET") {
            try { return json(res, 200, { ok: true, diary: readFileSync(DIARY_FILE(), "utf8") }); }
            catch { return json(res, 200, { ok: true, diary: "" }); }
          }
          if (req.method === "POST") {
            let body = "";
            req.on("data", (c) => { body += c; });
            req.on("end", () => {
              try {
                const { entry } = JSON.parse(body || "{}");
                if (!entry) return json(res, 400, { ok: false, error: "no-entry" });
                const stamp = new Date().toISOString();
                mkdirSync(join(homedir(), ".dsh"), { recursive: true });
                appendFileSync(DIARY_FILE(), "[" + stamp + "] " + String(entry) + "\n");
                return json(res, 200, { ok: true });
              } catch (e) {
                return json(res, 500, { ok: false, error: String((e && e.message) ? e.message : e) });
              }
            });
            return;
          }
          json(res, 405, { ok: false, error: "method-not-allowed" });
        }
      }
    ];
    const disposers = routes.map((route) => ctx.webServer.register(route));
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, "la-feng: routes");
}

export { apply, inject };
