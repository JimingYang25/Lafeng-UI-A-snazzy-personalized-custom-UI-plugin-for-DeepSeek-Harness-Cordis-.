import { readFileSync, writeFileSync, existsSync, mkdirSync, createReadStream, readdirSync } from "node:fs";
import { join, isAbsolute, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const inject = ["webServer"];

const CONFIG_FILE = () => join(homedir(), ".dsh", "la-feng.json");
const ASSETS_DIR = () => join(homedir(), ".dsh", "la-feng");
const USER_BACKGROUND_DIR = () => join(ASSETS_DIR(), "background");
const USER_MUSIC_DIR = () => join(ASSETS_DIR(), "music");
const USER_VIDEO_DIR = () => join(ASSETS_DIR(), "video");
const PKG_DIR = () => join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILTIN_BACKGROUND_DIR = () => join(PKG_DIR(), "background");
const BUILTIN_MUSIC_DIR = () => join(PKG_DIR(), "music");
const BUILTIN_VIDEO_DIR = () => join(PKG_DIR(), "video");

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];
const AUDIO_EXTS = [".mp3", ".wav", ".ogg", ".m4a", ".flac"];
const VIDEO_EXTS = [".mp4", ".webm", ".mov", ".m4v"];

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
  personaPrompt: ""
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

function ensureAssetDirs() {
  mkdirSync(USER_BACKGROUND_DIR(), { recursive: true });
  mkdirSync(USER_MUSIC_DIR(), { recursive: true });
  mkdirSync(USER_VIDEO_DIR(), { recursive: true });
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

function resolveAsset(type, value) {
  if (!value) return "";
  if (isAbsolute(value) && existsSync(value)) return value;
  for (const dir of dirsOf(type)) {
    const candidate = join(dir, value);
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
  return "application/octet-stream";
}

function serveFile(req, res, path) {
  if (!path || !existsSync(path)) {
    json(res, 404, { ok: false, error: "file-not-found" });
    return;
  }
  res.writeHead(200, { "content-type": contentTypeOf(path), "access-control-allow-origin": "*" });
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

function apply(ctx) {
  ensureAssetDirs();

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
  } else {
    console.log("[la-feng] systemPrompt NOT available (persona disabled)");
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
          json(res, 400, { ok: false, error: "bad-type" });
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
      }
    ];
    const disposers = routes.map((route) => ctx.webServer.register(route));
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, "la-feng: routes");
}

export { apply, inject };
