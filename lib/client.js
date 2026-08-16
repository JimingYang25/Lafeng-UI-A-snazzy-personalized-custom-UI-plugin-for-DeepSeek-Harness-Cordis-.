window.__ModuleLoader__.load({
	id: "@linxin666/dsh-client-ui-la-feng",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const react = require("react");
		const e = react.createElement;

		const STYLE_TAG_ID = "@linxin666/dsh-client-ui-la-feng/la-feng.css";
		const EMOJI_STYLE_TAG_ID = "@linxin666/dsh-client-ui-la-feng/la-feng-emoji.css";

		function injectStyle(css) {
			let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(STYLE_TAG_ID) + "]");
			if (!tag) {
				tag = document.createElement("style");
				tag.dataset.plugin = "@linxin666/dsh-client-ui-la-feng";
				tag.dataset.pluginCss = STYLE_TAG_ID;
				document.head.appendChild(tag);
			}
			tag.textContent = css;
		}

		function injectEmojiCss(size) {
			const px = Math.max(32, Math.min(256, Number(size) || 96));
			let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(EMOJI_STYLE_TAG_ID) + "]");
			if (!tag) {
				tag = document.createElement("style");
				tag.dataset.plugin = "@linxin666/dsh-client-ui-la-feng";
				tag.dataset.pluginCss = EMOJI_STYLE_TAG_ID;
				document.head.appendChild(tag);
			}
			tag.textContent = 'img[src*="/api/la-feng/emoji"]{max-width:' + px + 'px!important;max-height:' + px + 'px!important;width:auto;height:auto;border-radius:10px;display:inline-block;vertical-align:middle;}';
		}

		function buildCss(accent, panelOpacity) {
			const op = Math.max(0, Math.min(100, Number(panelOpacity) || 45));
			const a = Math.max(0.05, Math.min(1, 1 - op / 100));
			const a2 = Math.max(0.05, Math.min(1, a + 0.08));
			const ab = Math.max(0.05, Math.min(1, a + 0.02));
			return [
				"body[data-dsh-la-feng-pro]{--dsw-alias-brand-primary:" + accent + ";--dsw-alias-state-warn-primary:#f59e0b;--dsw-alias-bg-base:rgba(240,247,252," + ab.toFixed(2) + ");--dsw-alias-bg-layer-1:rgba(255,255,255," + a.toFixed(2) + ");--dsw-alias-bg-layer-2:rgba(245,250,254," + a2.toFixed(2) + ");--dsw-specific-sidebar-fill:rgba(228,240,250," + a.toFixed(2) + ");}",
				"body[data-dsh-la-feng-pro][data-ds-dark-theme]{--dsw-alias-brand-primary:" + accent + ";--dsw-alias-bg-base:rgba(11,22,38," + ab.toFixed(2) + ");--dsw-alias-bg-layer-1:rgba(16,36,58," + a.toFixed(2) + ");--dsw-alias-bg-layer-2:rgba(22,48,74," + a2.toFixed(2) + ");--dsw-specific-sidebar-fill:rgba(10,30,48," + a.toFixed(2) + ");}",
				"body[data-dsh-la-feng-pro] [id=root]{box-sizing:border-box;-webkit-backdrop-filter:blur(4px);background:rgba(255,255,255," + a.toFixed(2) + ");}",
				"body[data-dsh-la-feng-pro][data-ds-dark-theme] [id=root]{background:rgba(16,36,58," + a.toFixed(2) + ");}",
			].join("");
		}

		const inject = ["slots"];

		function apply(ctx) {
			const slots = ctx.slots;
			const sessions = ctx.get("sessions");
			const body = document.body;

			// ---- 共享运行时状态 ----
			const rt = {
				config: null,
				audioEl: null,
				audioCtx: null,
				analyser: null,
				gain: null,
				bufferSource: null,
				rafId: 0,
				waveCanvas: null,
				modeMq: null,
				playlist: [],
				playToken: 0,
				currentIndex: 0,
				currentTrack: "",
				playMode: "order"
			};

			const videoEl = document.createElement("video");
			videoEl.loop = true;
			videoEl.muted = true;
			videoEl.playsInline = true;
			videoEl.autoplay = true;
			videoEl.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;display:none;";
			document.body.insertBefore(videoEl, document.body.firstChild);
			rt.videoEl = videoEl;

			document.addEventListener("visibilitychange", () => {
				if (!document.hidden && rt.videoEl && rt.config && rt.config.backgroundVideo) {
					rt.videoEl.play().catch(() => {});
				}
			});

			async function fetchConfig() {
				const res = await fetch("/api/la-feng/config");
				const data = await res.json();
				if (data && data.ok) rt.config = data.config;
				return rt.config;
			}

			async function savePatch(patch) {
				const res = await fetch("/api/la-feng/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
				const data = await res.json();
				if (data && data.ok) { rt.config = data.config; return data.config; }
				return null;
			}

			function applyMode(mode) {
				if (!rt.modeMq) rt.modeMq = window.matchMedia("(prefers-color-scheme: dark)");
				const dark = mode === "dark" || (mode === "system" && rt.modeMq.matches);
				if (dark) body.dataset.dsDarkTheme = "";
				else delete body.dataset.dsDarkTheme;
			}

			function applyTheme(cfg) {
				body.dataset.dshLaFengPro = "";
				applyMode(cfg.mode || "system");
				injectStyle(buildCss(cfg.themeColor || "#38BDF8", cfg.panelOpacity));
				injectEmojiCss(cfg.emojiSize);
				const root = document.getElementById("root");
				const props = ["background-image", "background-position", "background-size", "background-attachment", "background-repeat"];
				if (cfg.backgroundVideo) {
					for (const p of props) { body.style.removeProperty(p); if (root) root.style.removeProperty(p); }
					applyVideo(cfg);
				} else if (cfg.backgroundImage) {
					const op = Math.max(0, Math.min(100, Number(cfg.backgroundOpacity) || 0));
					const scrim = op > 0 ? "linear-gradient(rgba(8,15,28," + (op / 100).toFixed(2) + ") 0%, rgba(8,15,28," + (op / 100).toFixed(2) + ") 100%)" : "";
					const bgUrl = "/api/la-feng/background?t=" + Date.now();
					const url = scrim ? scrim + ", url(\"" + bgUrl + "\")" : 'url("' + bgUrl + '")';
					for (const el of [body, root]) {
						if (!el) continue;
						el.style.setProperty("background-image", url, "important");
						el.style.setProperty("background-position", "center", "important");
						el.style.setProperty("background-size", "cover", "important");
						el.style.setProperty("background-attachment", "fixed", "important");
						el.style.setProperty("background-repeat", "no-repeat", "important");
					}
				} else {
					for (const p of props) {
						body.style.removeProperty(p);
						if (root) root.style.removeProperty(p);
					}
				}
			}

			// ---- 音乐 + 声浪 ----
			function ensureAudio() {
				if (rt.audioEl) return rt.audioEl;
				const audio = document.createElement("audio");
				audio.loop = true;
				audio.crossOrigin = "anonymous";
				audio.preload = "auto";
				document.body.appendChild(audio);
				rt.audioEl = audio;
				return audio;
			}

			function setMusic(cfg) {
				const audio = ensureAudio();
				if (cfg.musicPath) audio.src = "/api/la-feng/music";
				else audio.removeAttribute("src");
				audio.volume = Math.max(0, Math.min(1, (cfg.musicVolume ?? 50) / 100));
			}

			function initAudioContext() {
				if (rt.audioCtx) return rt.audioCtx;
				const AC = window.AudioContext || window.webkitAudioContext;
				if (!AC) return null;
				rt.audioCtx = new AC();
				rt.gain = rt.audioCtx.createGain();
				rt.gain.connect(rt.audioCtx.destination);
				return rt.audioCtx;
			}

			async function playTrack(index, offset) {
				try {
					const cfg = rt.config || {};
					const list = rt.playlist.length ? rt.playlist : (cfg.musicPath ? [cfg.musicPath] : []);
					if (!list.length) return;
					const i = ((index % list.length) + list.length) % list.length;
					rt.currentIndex = i;
					rt.currentTrack = list[i];
					const track = list[i];
					const token = ++rt.playToken;
					stopWave();
					const ctx = initAudioContext();
					if (!ctx) return;
					if (ctx.state === "suspended") await ctx.resume();
					if (!rt.analyser) {
						rt.analyser = ctx.createAnalyser();
						rt.analyser.fftSize = 256;
						rt.analyser.smoothingTimeConstant = 0.8;
						rt.analyser.connect(rt.gain);
					}
					if (rt.gain && cfg) rt.gain.gain.value = Math.max(0, Math.min(1, (cfg.musicVolume ?? 50) / 100));
					const res = await fetch("/api/la-feng/music?file=" + encodeURIComponent(track));
					const arrayBuf = await res.arrayBuffer();
					const audioBuf = await ctx.decodeAudioData(arrayBuf);
					if (token !== rt.playToken) return;
					if (rt.bufferSource) { rt.bufferSource.onended = null; try { rt.bufferSource.stop(); } catch (e) {} rt.bufferSource = null; }
					const src = ctx.createBufferSource();
					src.buffer = audioBuf;
					src.loop = false;
					src.connect(rt.analyser);
					src.onended = () => { playNext(); };
					src.start(0, offset || 0);
					rt.bufferSource = src;
					rt.startTime = ctx.currentTime;
					rt.duration = audioBuf.duration;
					startWave();
				} catch (e) {
					console.log("[la-feng] play error:", e && e.message);
				}
			}

			function playNext() {
				const list = rt.playlist.length ? rt.playlist : (rt.config && rt.config.musicPath ? [rt.config.musicPath] : []);
				if (!list.length) return;
				if (rt.playMode === "shuffle") playTrack(Math.floor(Math.random() * list.length));
				else playTrack(rt.currentIndex + 1);
			}

			function playPrev() {
				playTrack(rt.currentIndex - 1);
			}

			function playMusic() {
				if (rt.bufferSource) {
					if (rt.audioCtx && rt.audioCtx.state === "suspended") rt.audioCtx.resume();
					startWave();
				} else {
					playTrack(rt.currentIndex);
				}
			}

			function pauseMusic() {
				if (rt.audioCtx && rt.audioCtx.state === "running") rt.audioCtx.suspend().catch(() => {});
				stopWave();
			}

			function startWave() {
				if (!rt.waveCanvas || rt.rafId) return;
				const draw = () => {
					rt.rafId = requestAnimationFrame(draw);
					const canvas = rt.waveCanvas;
					const c2 = canvas.getContext("2d");
					const w = canvas.width, h = canvas.height;
					c2.clearRect(0, 0, w, h);
					if (!rt.analyser) return;
					const bins = rt.analyser.frequencyBinCount;
					const data = new Uint8Array(bins);
					rt.analyser.getByteFrequencyData(data);
					const cfg = rt.config || {};
					const style = cfg.waveStyle || "bars";
					const color = cfg.waveColor || getComputedStyle(body).getPropertyValue("--dsw-alias-brand-primary").trim() || "#38BDF8";
					if (style === "wave") {
						const td = new Uint8Array(rt.analyser.fftSize);
						rt.analyser.getByteTimeDomainData(td);
						c2.beginPath();
						c2.moveTo(0, h);
						for (let i = 0; i < td.length; i++) {
							const x = (i / td.length) * w;
							const y = (td[i] / 255) * h;
							c2.lineTo(x, y);
						}
						c2.lineTo(w, h);
						c2.closePath();
						c2.fillStyle = color;
						c2.globalAlpha = 0.45;
						c2.fill();
						c2.globalAlpha = 1;
						c2.strokeStyle = color;
						c2.lineWidth = 4;
						c2.stroke();
					} else if (style === "ring") {
						const cx = w / 2, cy = h * 0.9;
						const n = 96;
						const maxR = Math.min(w, h * 2) * 0.9;
						for (let i = 0; i < n; i++) {
							const v = data[Math.floor(i * bins / n)] / 255;
							const ang = Math.PI + (i / n) * Math.PI;
							const r = maxR * (0.3 + v * 0.7);
							c2.fillStyle = color;
							c2.globalAlpha = 0.3 + v * 0.7;
							c2.beginPath();
							c2.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.6, 2, 0, Math.PI * 2);
							c2.fill();
						}
						c2.globalAlpha = 1;
					} else {
						const n = 64;
						const bw = w / n;
						for (let i = 0; i < n; i++) {
							const v = data[Math.floor(i * bins / n)] / 255;
							const bh = Math.max(2, v * h * 0.9);
							c2.fillStyle = color;
							c2.globalAlpha = 0.25 + v * 0.75;
							c2.fillRect(i * bw, (h - bh) / 2, Math.max(1, bw - 2), bh);
						}
						c2.globalAlpha = 1;
					}
				};
				draw();
			}

			function stopWave() {
				if (rt.rafId) { cancelAnimationFrame(rt.rafId); rt.rafId = 0; }
				if (rt.waveCanvas) rt.waveCanvas.getContext("2d").clearRect(0, 0, rt.waveCanvas.width, rt.waveCanvas.height);
			}

			// ---- 设置面板 ----
			function SettingsPanel() {
				const [open, setOpen] = react.useState(false);
				const [cfg, setCfg] = react.useState(null);
				const [playing, setPlaying] = react.useState(false);
				const [personas, setPersonas] = react.useState([]);
				const [bgFiles, setBgFiles] = react.useState([]);
				const [musicFiles, setMusicFiles] = react.useState([]);
				const [videoFiles, setVideoFiles] = react.useState([]);
				const [cur, setCur] = react.useState("");

				react.useEffect(() => {
					fetchConfig().then((c) => { if (c) setCfg(c); });
					fetch("/api/la-feng/config").then((r) => r.json()).then((d) => { if (d && d.personas) setPersonas(d.personas); }).catch(() => {});
					fetch("/api/la-feng/files?type=background").then((r) => r.json()).then((d) => { if (d && d.ok) setBgFiles(d.files); }).catch(() => {});
					fetch("/api/la-feng/files?type=music").then((r) => r.json()).then((d) => { if (d && d.ok) { setMusicFiles(d.files); rt.playlist = d.files; } }).catch(() => {});
					fetch("/api/la-feng/files?type=video").then((r) => r.json()).then((d) => { if (d && d.ok) setVideoFiles(d.files); }).catch(() => {});
				}, []);

				async function save(patch) {
					const res = await fetch("/api/la-feng/config", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(patch)
					});
					const data = await res.json();
					if (data && data.ok) {
						rt.config = data.config;
						setCfg(data.config);
						applyTheme(data.config);
						setMusic(data.config);
						applyWaveSettings(data.config);
						applyVideo(data.config);
					}
				}

				function togglePlay() {
					if (playing) { pauseMusic(); setPlaying(false); }
					else { playMusic(); setPlaying(true); }
				}

				const s = {
					display: open ? "block" : "none",
					position: "fixed", right: 16, bottom: 16, zIndex: 99990,
					width: 300, maxHeight: "80vh", overflowY: "auto", pointerEvents: "auto",
					background: "rgba(16,26,40,0.96)", color: "#e6f1f8", borderRadius: 12,
					padding: 14, fontFamily: "system-ui, sans-serif", fontSize: 13,
					boxShadow: "0 12px 40px rgba(0,0,0,0.5)"
				};
				const row = { marginBottom: 12 };
				const label = { display: "block", marginBottom: 4, opacity: 0.8 };
				const input = { width: "100%", boxSizing: "border-box", padding: "6px 8px", borderRadius: 6, border: "1px solid #2a4a68", background: "#0f1f33", color: "#e6f1f8", fontSize: 12 };
				const btn = { padding: "6px 10px", borderRadius: 6, border: "1px solid #2a4a68", background: "#16283f", color: "#e6f1f8", cursor: "pointer", fontSize: 12 };

				return e("div", null,
					e("div", {
						onClick: () => setOpen(!open),
						style: { position: "fixed", right: 16, bottom: 16, zIndex: 99991, width: 42, height: 42, borderRadius: 21, background: cfg ? cfg.themeColor : "#38BDF8", color: "#fff", border: "none", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(0,0,0,0.4)", pointerEvents: "auto" }
					}, open ? "×" : "⚙"),
					e("div", { style: s },
						e("div", { style: { fontSize: 15, fontWeight: 700, marginBottom: 12 } }, "拉风 · 设置"),
						e("div", { style: row },
							e("label", { style: label }, "主题色"),
							e("input", { type: "color", value: cfg ? cfg.themeColor : "#38BDF8", style: { ...input, height: 34, padding: 2 }, onChange: (ev) => save({ themeColor: ev.target.value }) })
						),
						e("div", { style: row },
							e("label", { style: label }, "深浅模式"),
							e("select", { value: cfg ? cfg.mode : "system", style: input, onChange: (ev) => save({ mode: ev.target.value }) },
								e("option", { value: "system" }, "跟随系统"),
								e("option", { value: "light" }, "浅色"),
								e("option", { value: "dark" }, "深色")
							)
						),
						e("div", { style: row },
							e("label", { style: label }, "背景图"),
							e("select", { value: cfg ? cfg.backgroundImage : "", style: input, onChange: (ev) => save({ backgroundImage: ev.target.value }) },
														e("option", { value: "" }, "（无背景）"),
							bgFiles.map((f) => e("option", { value: f, key: f }, f))
							)
						),
						e("div", { style: row },
							e("label", { style: label }, "动态壁纸（视频）"),
							e("select", { value: cfg ? cfg.backgroundVideo : "", style: input, onChange: (ev) => save({ backgroundVideo: ev.target.value }) },
														e("option", { value: "" }, "（无动态壁纸）"),
							videoFiles.map((f) => e("option", { value: f, key: f }, f))
							)
						),
						e("div", { style: row },
							e("div", { style: row },
							e("label", { style: label }, "资源目录（自定义，指向你的素材根目录）"),
							e("input", { type: "text", defaultValue: cfg ? cfg.assetsDir : "", style: input, placeholder: "如 D:\\Desktop\\dsh-client-ui-la-feng", onBlur: (ev) => save({ assetsDir: ev.target.value }) })
						),
						e("label", { style: label }, "背景遮罩 " + (cfg ? cfg.backgroundOpacity : 0)),
							e("input", { type: "range", min: 0, max: 90, value: cfg ? cfg.backgroundOpacity : 0, style: { width: "100%" }, onChange: (ev) => save({ backgroundOpacity: Number(ev.target.value) }) })
						),
						e("div", { style: row },
							e("label", { style: label }, "面板透明度 " + (cfg ? cfg.panelOpacity : 45)),
							e("input", { type: "range", min: 0, max: 90, value: cfg ? cfg.panelOpacity : 45, style: { width: "100%" }, onChange: (ev) => save({ panelOpacity: Number(ev.target.value) }) })
						),
						e("div", { style: row },
							e("label", { style: label }, "背景音乐"),
							e("select", { value: cur || (cfg ? cfg.musicPath : ""), style: input, onChange: (ev) => { const f = ev.target.value; setCur(f); save({ musicPath: f }); const idx = musicFiles.indexOf(f); if (idx >= 0) playTrack(idx); } },
							musicFiles.map((f) => e("option", { value: f, key: f }, f))
							)
						),
						e("div", { style: row },
							e("label", { style: label }, "音量 " + (cfg ? cfg.musicVolume : 50)),
							e("input", { type: "range", min: 0, max: 100, value: cfg ? cfg.musicVolume : 50, style: { width: "100%" }, onChange: (ev) => save({ musicVolume: Number(ev.target.value) }) })
						),
						e("div", { style: row },
							e("button", { style: btn, onClick: () => { playPrev(); setPlaying(true); setCur(rt.currentTrack); } }, "上一首"),
							e("button", { style: btn, onClick: togglePlay }, playing ? "暂停" : "播放"),
							e("button", { style: btn, onClick: () => { playNext(); setPlaying(true); setCur(rt.currentTrack); } }, "下一首")
						),
						e("div", { style: row },
							e("label", { style: label }, "播放模式"),
							e("select", { value: cfg ? cfg.playMode : "order", style: input, onChange: (ev) => { rt.playMode = ev.target.value; save({ playMode: ev.target.value }); } },
														e("option", { value: "order" }, "顺序播放"),
														e("option", { value: "shuffle" }, "随机播放")
							)
						),						e("div", { style: row },
							e("label", { style: label }, "显示声浪"),
							e("select", { value: cfg ? (cfg.waveEnabled === false ? "no" : "yes") : "yes", style: input, onChange: (ev) => save({ waveEnabled: ev.target.value === "yes" }) },
														e("option", { value: "yes" }, "显示"),
														e("option", { value: "no" }, "隐藏")
							)
						),
						e("div", { style: row },
							e("label", { style: label }, "声浪样式"),
							e("select", { value: cfg ? cfg.waveStyle : "bars", style: input, onChange: (ev) => save({ waveStyle: ev.target.value }) },
														e("option", { value: "bars" }, "柱状"),
														e("option", { value: "wave" }, "波形"),
														e("option", { value: "ring" }, "圆形")
							)
						),
						e("div", { style: row },
							e("label", { style: label }, "声浪颜色（空=主题色）"),
							e("input", { type: "text", defaultValue: cfg ? cfg.waveColor : "", style: input, placeholder: "#38BDF8", onBlur: (ev) => save({ waveColor: ev.target.value }) })
						),
						e("div", { style: row },
							e("label", { style: label }, "声浪高度 " + (cfg ? cfg.waveHeight : 90)),
							e("input", { type: "range", min: 20, max: 200, value: cfg ? cfg.waveHeight : 90, style: { width: "100%" }, onChange: (ev) => save({ waveHeight: Number(ev.target.value) }) })
						),
						e("div", { style: row },
							e("label", { style: label }, "声浪透明度 " + (cfg ? cfg.waveOpacity : 90)),
							e("input", { type: "range", min: 0, max: 100, value: cfg ? cfg.waveOpacity : 90, style: { width: "100%" }, onChange: (ev) => save({ waveOpacity: Number(ev.target.value) }) })
						),

						e("div", { style: row },
							e("label", { style: label }, "表情包大小 " + (cfg ? cfg.emojiSize : 96) + "px"),
							e("input", { type: "range", min: 32, max: 200, value: cfg ? cfg.emojiSize : 96, style: { width: "100%" }, onChange: (ev) => save({ emojiSize: Number(ev.target.value) }) })
						),
						e("div", { style: row },
							e("label", { style: label }, "表情包使用频率"),
							e("select", { value: cfg ? cfg.emojiFrequency : "medium", style: input, onChange: (ev) => save({ emojiFrequency: ev.target.value }) },
								e("option", { value: "high" }, "频繁（多多益善）"),
								e("option", { value: "medium" }, "适中（情绪点缀）"),
								e("option", { value: "low" }, "克制（偶尔一张）")
							)
						),

						e("div", { style: row },
							e("label", { style: label }, "人设预设"),
							e("select", { value: cfg ? cfg.personaId : "yandere", style: input, onChange: (ev) => save({ personaId: ev.target.value }) },
								personas.map((p) => e("option", { value: p, key: p }, p))
							)
						),
						e("div", { style: row },
							e("label", { style: label }, "人设提示词（自定义，覆盖预设）"),
							e("textarea", { defaultValue: cfg ? cfg.personaPrompt : "", rows: 5, style: { ...input, resize: "vertical" }, placeholder: "留空则使用上方预设", onBlur: (ev) => save({ personaPrompt: ev.target.value }) })
						)
					)
				);
			}

			function applyWaveSettings(cfg) {
				if (!rt.waveCanvas) return;
				const dpr = window.devicePixelRatio || 1;
				const h = Math.max(20, Number(cfg.waveHeight) || 90);
				rt.waveCanvas.width = window.innerWidth * dpr;
				rt.waveCanvas.height = h * dpr;
				rt.waveCanvas.style.height = h + "px";
				rt.waveCanvas.style.opacity = Math.max(0, Math.min(1, (Number(cfg.waveOpacity) ?? 90) / 100));
				rt.waveCanvas.style.display = cfg.waveEnabled === false ? "none" : "block";
			}

			function WaveLayer() {
				const ref = react.useRef(null);
				react.useEffect(() => {
					if (ref.current) {
						rt.waveCanvas = ref.current;
						applyWaveSettings(rt.config || {});
					}
				}, []);
				return e("canvas", { ref, style: { position: "fixed", left: 0, bottom: 0, width: "100%", height: 90, pointerEvents: "none", zIndex: 99989, opacity: 0.9 } });
			}

			function PlayerBar() {
				const [playing, setPlaying] = react.useState(false);
				const [cur, setCur] = react.useState("");
				const [collapsed, setCollapsed] = react.useState(false);
				const [pos, setPos] = react.useState({ x: 16, y: 200 });
				const [vol, setVol] = react.useState(50);
				const [prog, setProg] = react.useState(0);
				const dragRef = react.useRef(null);

				react.useEffect(() => {
					setPos({ x: 16, y: window.innerHeight - 180 });
					if (rt.config && rt.config.musicVolume !== undefined) setVol(rt.config.musicVolume);
					const t = setInterval(() => {
						if (rt.audioCtx && rt.duration) {
							const el = rt.audioCtx.currentTime - (rt.startTime || 0);
							setProg(Math.max(0, Math.min(1, el / rt.duration)));
						}
					}, 400);
					return () => clearInterval(t);
				}, []);

				function toggle() { if (playing) { pauseMusic(); setPlaying(false); } else { playMusic(); setPlaying(true); setCur(rt.currentTrack); } }
				function prev() { playPrev(); setPlaying(true); setCur(rt.currentTrack); }
				function next() { playNext(); setPlaying(true); setCur(rt.currentTrack); }
				function setVolume(v) { setVol(v); if (rt.gain) rt.gain.gain.value = v / 100; savePatch({ musicVolume: v }); }
				function seek(frac) { const t = (rt.duration || 0) * frac; playTrack(rt.currentIndex, t); setPlaying(true); setCur(rt.currentTrack); }

				function onPointerDown(ev) {
					const tag = ev.target.tagName;
					if (tag === "BUTTON" || tag === "INPUT") return;
					dragRef.current = { mx: ev.clientX, my: ev.clientY, x: pos.x, y: pos.y };
					const move = (e) => { setPos({ x: dragRef.current.x + (e.clientX - dragRef.current.mx), y: dragRef.current.y + (e.clientY - dragRef.current.my) }); };
					const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
					window.addEventListener("pointermove", move);
					window.addEventListener("pointerup", up);
				}

				const b = { width: 30, height: 30, borderRadius: 15, border: "none", cursor: "pointer", background: "rgba(22,40,63,0.9)", color: "#e6f1f8", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" };
				const bar = { position: "fixed", left: pos.x, top: pos.y, zIndex: 99988, display: "flex", alignItems: "center", gap: 6, padding: 6, borderRadius: 22, background: "rgba(16,26,40,0.82)", pointerEvents: "auto", boxShadow: "0 4px 14px rgba(0,0,0,0.4)", cursor: "grab", touchAction: "none" };

				if (collapsed) {
					return e("div", { style: bar, onPointerDown: onPointerDown },
						e("button", { style: { ...b, width: 34, height: 34, borderRadius: 17, fontSize: 16 }, onClick: () => setCollapsed(false), title: "展开" }, "🎵")
					);
				}

				return e("div", { style: bar, onPointerDown: onPointerDown },
					e("button", { style: b, onClick: prev, title: "上一首" }, "⏮"),
					e("button", { style: { ...b, width: 36, height: 36, borderRadius: 18, fontSize: 16 }, onClick: toggle, title: playing ? "暂停" : "播放" }, playing ? "⏸" : "▶"),
					e("button", { style: b, onClick: next, title: "下一首" }, "⏭"),
					e("span", { style: { color: "#e6f1f8", fontSize: 12, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, cur || "未播放"),
					e("div", { style: { display: "flex", alignItems: "center", gap: 3 } },
						e("span", { style: { color: "#e6f1f8", fontSize: 11 } }, "🔊"),
						e("input", { type: "range", min: 0, max: 100, value: vol, style: { width: 56 }, onChange: (ev) => setVolume(Number(ev.target.value)) })
					),
					e("div", { style: { width: 80, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, cursor: "pointer" }, onClick: (ev) => { const r = ev.currentTarget.getBoundingClientRect(); seek((ev.clientX - r.left) / r.width); } },
						e("div", { style: { width: (prog * 100) + "%", height: "100%", background: "#38BDF8", borderRadius: 2 } })
					),
					e("button", { style: { ...b, width: 24, height: 24, borderRadius: 12, fontSize: 12 }, onClick: () => setCollapsed(true), title: "收起" }, "−")
				);
			}
			function applyVideo(cfg) {
				if (!rt.videoEl) return;
				if (cfg.backgroundVideo) {
					rt.videoEl.src = "/api/la-feng/video?t=" + Date.now();
					rt.videoEl.style.display = "block";
					const op = Math.max(0, Math.min(100, Number(cfg.backgroundOpacity) || 0));
					rt.videoEl.style.filter = op > 0 ? "brightness(" + (1 - op / 100 * 0.7).toFixed(2) + ")" : "none";
					rt.videoEl.play().catch(() => {});
				} else {
					rt.videoEl.pause();
					rt.videoEl.removeAttribute("src");
					rt.videoEl.style.display = "none";
					rt.videoEl.style.filter = "none";
				}
			}


			// ---- 初始化 ----
			fetchConfig().then((cfg) => {
				if (!cfg) return;
				applyTheme(cfg);
				setMusic(cfg);
				applyWaveSettings(cfg);
				applyVideo(cfg);
			});

			function ImageFab(props) {
				const sessionId = props.useSessions ? props.useSessions(function (s) { return s && s.current; }) : undefined;
				const [open, setOpen] = react.useState(false);
				const [preview, setPreview] = react.useState("");
				const [desc, setDesc] = react.useState("");
				const [note, setNote] = react.useState("");
				const [busy, setBusy] = react.useState(false);
				const [error, setError] = react.useState("");

				function compressDataUrl(dataUrl) {
					return new Promise(function (resolve) {
						try {
							const img = new Image();
							img.onload = function () {
								const maxDim = 1280;
								let w = img.width, h = img.height;
								if (w > h && w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
								else if (h >= w && h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
								const canvas = document.createElement("canvas");
								canvas.width = w; canvas.height = h;
								const c = canvas.getContext("2d");
								c.drawImage(img, 0, 0, w, h);
								resolve(canvas.toDataURL("image/jpeg", 0.85));
							};
							img.onerror = function () { resolve(dataUrl); };
							img.src = dataUrl;
						} catch (e2) { resolve(dataUrl); }
					});
				}

				async function describe(b64) {
					const resp = await fetch("/api/la-feng/describe-image", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ base64: b64, mimeType: "image/jpeg" })
					});
					const r = await resp.json();
					if (r && r.ok && r.description) return r.description;
					throw new Error(r && r.error ? r.error : "识别失败");
				}

				async function send() {
					if (!sessions) { setError("会话服务不可用"); return; }
					if (sessionId === undefined) { setError("当前没有打开的会话"); return; }
					const binding = sessions.binding(sessionId);
					if (binding === undefined || binding.session === undefined) { setError("当前会话不可用"); return; }
					if (!desc) { setError("还没有识别到图片内容"); return; }
					const text = "【图片】\n" + desc + (note.trim() ? "\n\n" + note.trim() : "");
					try {
						await binding.session.prompt([{ type: "text", text: text }], "queue");
						setPreview(""); setDesc(""); setNote(""); setError("");
					} catch (err) {
						setError("发送失败：" + (err && err.message ? err.message : String(err)));
					}
				}

				function onPaste(event) {
					const items = event.clipboardData && event.clipboardData.items;
					if (!items) return;
					for (let i = 0; i < items.length; i++) {
						const item = items[i];
						if (item.type && item.type.indexOf("image") === 0) {
							event.preventDefault();
							const file = item.getAsFile();
							if (!file) continue;
							const reader = new FileReader();
							reader.onload = async function () {
								const rawDataUrl = String(reader.result);
								const compressed = await compressDataUrl(rawDataUrl);
								const comma = compressed.indexOf(",");
								const b64 = comma >= 0 ? compressed.slice(comma + 1) : "";
								setPreview(compressed);
								setDesc("");
								setNote("");
								setError("");
								setBusy(true);
								try {
									const d = await describe(b64);
									setDesc(d);
								} catch (err) {
									setError("识别失败：" + (err && err.message ? err.message : String(err)));
								} finally {
									setBusy(false);
								}
							};
							reader.readAsDataURL(file);
							break;
						}
					}
				}

				return e("div", { style: { position: "fixed", right: 24, top: 120, zIndex: 9999, pointerEvents: "auto", fontFamily: "inherit" } },
					open ? e("div", { style: { position: "absolute", right: 0, top: 52, width: 300, background: "#1e2230", border: "1px solid rgba(128,128,128,0.3)", borderRadius: 12, padding: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", gap: 10, color: "#e6e6e6" } },
						e("div", { style: { fontSize: 13, fontWeight: 600 } }, "粘贴截图，qwen 帮我看"),
						e("textarea", { style: { width: "100%", minHeight: 56, padding: "8px 10px", border: "1px dashed rgba(128,128,128,0.5)", borderRadius: 8, background: "transparent", color: "inherit", font: "inherit", fontSize: 13, resize: "vertical" }, placeholder: desc ? "（可选）配一句话" : "点这里，然后按 Ctrl+V 粘贴截图", onPaste: onPaste, value: note, onChange: function (ev) { setNote(ev.target.value); }, autoFocus: true }),
						preview ? e("img", { src: preview, style: { width: "100%", borderRadius: 8, border: "1px solid rgba(128,128,128,0.3)" } }) : null,
						busy ? e("span", { style: { opacity: 0.75, fontSize: 12 } }, "识别中…") : null,
						desc ? e("div", { style: { maxHeight: 140, overflowY: "auto", background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "8px 10px", fontSize: 12, lineHeight: 1.5 } }, desc) : null,
						desc ? e("button", { style: { padding: "8px 14px", border: "none", borderRadius: 8, background: "#6b8afd", color: "#fff", cursor: "pointer", fontSize: 13 }, onClick: send }, "发送") : null,
						error ? e("span", { style: { color: "#e05a5a", fontSize: 12 } }, error) : null
					) : null,
					e("button", { style: { display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", border: "none", borderRadius: 22, background: "#6b8afd", color: "#fff", cursor: "pointer", fontSize: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }, onClick: function () { setOpen(!open); } }, "🖼 看图")
				);
			}

			if (slots) {
				slots.inject("shell.overlay", () => slots.register(
					{ name: "shell.overlay", id: "la-feng-settings", order: 500 },
					SettingsPanel
				));
				slots.inject("shell.overlay", () => slots.register(
					{ name: "shell.overlay", id: "la-feng-wave", order: -999 },
					WaveLayer
				));
				slots.inject("shell.overlay", () => slots.register(
					{ name: "shell.overlay", id: "la-feng-player", order: 400 },
					PlayerBar
				));
				slots.inject("shell.overlay", () => slots.register(
					{ name: "shell.overlay", id: "la-feng-clip-image", order: 600 },
					ImageFab
				));

			}

			ctx.effect(() => () => {
				stopWave();
				if (rt.bufferSource) { rt.bufferSource.onended = null; try { rt.bufferSource.stop(); } catch (e) {} }
				if (rt.audioCtx) { rt.audioCtx.close().catch(() => {}); }
				if (rt.audioEl) rt.audioEl.remove();
				delete body.dataset.dshLaFengPro;
			}, "la-feng: cleanup");
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
