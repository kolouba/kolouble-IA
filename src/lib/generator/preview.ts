import type { AppSpec } from "@/lib/spec";
import { primaryField, sampleRows, subtitleFields } from "@/lib/spec";
import type { GeneratedFile } from "./types";

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeColor(value: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function jsData(spec: AppSpec): string {
  const payload = {
    appName: spec.appName,
    tagline: spec.tagline,
    domain: spec.domain,
    summary: spec.summary,
    theme: spec.theme,
    copy: spec.copy,
    features: spec.features,
    platforms: spec.platforms,
    entities: spec.entities.map((entity) => ({
      key: entity.key,
      label: entity.label,
      plural: entity.plural,
      icon: entity.icon,
      fields: entity.fields.map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        options: field.options ?? [],
        required: field.required,
      })),
      primaryKey: primaryField(entity).key,
      previewKeys: [
        primaryField(entity).key,
        ...subtitleFields(entity)
          .slice(0, 2)
          .map((field) => field.key),
      ].filter((value, index, array) => array.indexOf(value) === index),
      rows: sampleRows(entity),
    })),
  };
  return JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function buildPrototypeFile(spec: AppSpec): GeneratedFile {
  const primary = safeColor(spec.theme.primary, "#3DDC97");
  const secondary = safeColor(spec.theme.secondary, "#5DB9FF");
  const accent = safeColor(spec.theme.accent, "#FFCC66");
  const background = safeColor(spec.theme.background, "#07100D");
  const surface = safeColor(spec.theme.surface, "#0E1A16");
  const appName = htmlEscape(spec.appName);
  const domain = htmlEscape(spec.domain);

  const template = String.raw`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>__APP_NAME__ — Aperçu</title>
<style>
:root{
  --primary:__PRIMARY__;--secondary:__SECONDARY__;--accent:__ACCENT__;--bg:__BACKGROUND__;--surface:__SURFACE__;
  --text:#f4faf7;--muted:#9cb0a8;--line:rgba(255,255,255,.09);--line-strong:rgba(255,255,255,.16);
  --danger:#ff8d8d;--success:__PRIMARY__;--radius:18px;
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;background:var(--bg);color:var(--text);
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
  background-image:radial-gradient(900px 500px at 85% -10%,color-mix(in srgb,var(--primary) 16%,transparent),transparent 65%),radial-gradient(700px 500px at 5% 100%,color-mix(in srgb,var(--secondary) 10%,transparent),transparent 60%);
}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer}
a{color:inherit}
.app{display:flex;min-height:100vh}
.sidebar{
  width:248px;flex:0 0 248px;padding:20px 14px;border-right:1px solid var(--line);
  background:color-mix(in srgb,var(--surface) 78%,transparent);
  position:sticky;top:0;height:100vh;display:flex;flex-direction:column;gap:18px;
}
.brand{display:flex;align-items:center;gap:11px;padding:4px 8px 14px}
.brand-mark{
  width:38px;height:38px;border-radius:12px;display:grid;place-items:center;flex:0 0 38px;
  background:linear-gradient(135deg,var(--primary),var(--secondary));color:#06100c;font-weight:900;font-size:20px;
  box-shadow:0 10px 30px -10px color-mix(in srgb,var(--primary) 60%,transparent);
}
.brand-name{font-size:14px;font-weight:750;line-height:1.25;letter-spacing:-.01em}
.brand-sub{font-size:11px;color:var(--muted);margin-top:2px}
.nav{display:flex;flex-direction:column;gap:4px;overflow:auto}
.nav-label{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);padding:6px 10px}
.nav button{
  display:flex;align-items:center;gap:10px;width:100%;padding:10px;border:0;border-radius:11px;
  background:transparent;color:var(--muted);text-align:left;font-size:13.5px;transition:.15s ease;
}
.nav button:hover{background:rgba(255,255,255,.05);color:var(--text)}
.nav button.active{background:color-mix(in srgb,var(--primary) 14%,transparent);color:var(--text)}
.nav button.active .icon{color:var(--primary)}
.nav .icon{width:18px;height:18px;display:grid;place-items:center;flex:0 0 18px}
.nav .icon svg{width:18px;height:18px}
.nav .count{margin-left:auto;font-size:10px;color:var(--muted);background:rgba(255,255,255,.06);padding:2px 7px;border-radius:999px}
.sidebar-foot{margin-top:auto;display:flex;flex-direction:column;gap:10px}
.sync-card{border:1px solid var(--line);background:rgba(255,255,255,.025);border-radius:14px;padding:12px;font-size:11.5px;color:var(--muted)}
.sync-line{display:flex;align-items:center;gap:7px;color:var(--text);font-size:12px;font-weight:600}
.dot{width:7px;height:7px;border-radius:50%;background:var(--primary);box-shadow:0 0 0 4px color-mix(in srgb,var(--primary) 15%,transparent)}
.sync-card p{margin:7px 0 0;line-height:1.5}
.user{display:flex;align-items:center;gap:9px;padding:9px 8px;border-top:1px solid var(--line)}
.avatar{
  width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;
  background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 35%,black),color-mix(in srgb,var(--secondary) 30%,black));
  color:var(--text);border:1px solid var(--line-strong);flex:0 0 32px;
}
.user small{display:block;color:var(--muted);font-size:10.5px;margin-top:1px}
.main{flex:1;min-width:0;display:flex;flex-direction:column}
.topbar{
  height:64px;display:flex;align-items:center;gap:12px;padding:0 24px;border-bottom:1px solid var(--line);
  background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:blur(14px);position:sticky;top:0;z-index:5;
}
.burger{display:none;background:transparent;border:1px solid var(--line);border-radius:10px;padding:8px;line-height:0}
.search{
  flex:1;max-width:430px;display:flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--line);
  border-radius:11px;background:rgba(255,255,255,.035);color:var(--muted);font-size:12.5px;
}
.search svg{width:15px;height:15px;flex:0 0 15px}
.search input{flex:1;border:0;outline:0;background:transparent;font-size:12.5px;min-width:0}
.top-actions{display:flex;align-items:center;gap:9px;margin-left:auto}
.chip{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border:1px solid var(--line);border-radius:999px;font-size:10.5px;color:var(--muted)}
.chip .dot{width:5px;height:5px;box-shadow:none}
.preview-badge{border-color:color-mix(in srgb,var(--accent) 35%,transparent);color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent)}
.icon-btn{background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:10px;width:34px;height:34px;display:grid;place-items:center;color:var(--muted)}
.view{padding:30px 32px 48px;max-width:1320px;width:100%;margin:0 auto;animation:rise .35s ease both}
@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.eyebrow{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--primary);font-weight:750;margin-bottom:10px}
h1{font-size:clamp(25px,3vw,36px);line-height:1.1;letter-spacing:-.035em;margin:0 0 10px;font-weight:780}
.lede{margin:0;color:var(--muted);font-size:14px;line-height:1.65;max-width:680px}
.head-row{display:flex;align-items:flex-start;gap:18px;flex-wrap:wrap;margin-bottom:26px}
.head-row .lede{max-width:560px}
.head-actions{display:flex;gap:9px;margin-left:auto;flex-wrap:wrap}
.btn{border:1px solid var(--line-strong);background:rgba(255,255,255,.045);border-radius:10px;padding:9px 13px;font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:7px;transition:.15s}
.btn:hover{background:rgba(255,255,255,.08);transform:translateY(-1px)}
.btn.primary{background:linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--primary) 55%,var(--secondary)));color:#05100b;border-color:transparent;font-weight:750}
.btn.ghost{background:transparent;color:var(--muted)}
.btn svg{width:15px;height:15px}
.grid-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:20px}
.metric{
  border:1px solid var(--line);border-radius:var(--radius);padding:18px;background:linear-gradient(150deg,rgba(255,255,255,.05),rgba(255,255,255,.015));
  position:relative;overflow:hidden;transition:.2s ease;cursor:pointer;
}
.metric:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--primary) 30%,var(--line))}
.metric:before{content:"";position:absolute;inset:0;background:radial-gradient(300px 140px at 100% 0,color-mix(in srgb,var(--primary) 13%,transparent),transparent 70%);pointer-events:none}
.metric-top{display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:11.5px}
.metric-icon{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,var(--primary) 12%,transparent);color:var(--primary)}
.metric-icon svg{width:17px;height:17px}
.metric-value{font-size:31px;font-weight:800;letter-spacing:-.04em;margin:13px 0 2px}
.metric-name{font-size:12px;font-weight:650}
.metric-foot{color:var(--muted);font-size:10.5px;margin-top:4px}
.spark{display:flex;align-items:flex-end;gap:3px;height:26px;margin-top:12px}
.spark span{flex:1;border-radius:2px;background:color-mix(in srgb,var(--primary) 35%,transparent)}
.split{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:16px}
.panel{border:1px solid var(--line);border-radius:var(--radius);background:color-mix(in srgb,var(--surface) 72%,transparent);overflow:hidden}
.panel-head{padding:15px 18px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:10px}
.panel-title{font-size:13px;font-weight:700;letter-spacing:-.01em}
.panel-sub{font-size:10.5px;color:var(--muted);margin-top:2px}
.panel-body{padding:16px 18px}
.activity{display:flex;flex-direction:column;gap:2px}
.activity-row{display:flex;align-items:center;gap:11px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:12px}
.activity-row:last-child{border-bottom:0}
.activity-icon{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:rgba(255,255,255,.05);color:var(--primary);flex:0 0 28px}
.activity-icon svg{width:15px;height:15px}
.activity-main{min-width:0;flex:1}
.activity-main strong{display:block;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.activity-main small{color:var(--muted);font-size:10.5px}
.activity-time{color:var(--muted);font-size:10px;white-space:nowrap}
.badge{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);border-radius:999px;padding:3px 8px;font-size:9.5px;font-weight:650;color:var(--muted);background:rgba(255,255,255,.03);white-space:nowrap}
.badge:before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}
.badge.ok{color:var(--primary);border-color:color-mix(in srgb,var(--primary) 25%,transparent);background:color-mix(in srgb,var(--primary) 8%,transparent)}
.badge.warn{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 25%,transparent);background:color-mix(in srgb,var(--accent) 8%,transparent)}
.badge.bad{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 25%,transparent);background:color-mix(in srgb,var(--danger) 7%,transparent)}
.sync-panel .panel-body{display:flex;flex-direction:column;gap:13px}
.sync-row{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:11.5px;color:var(--muted)}
.sync-row strong{color:var(--text);font-weight:650}
.sync-row .dot{margin-right:6px}
.platforms{display:flex;flex-wrap:wrap;gap:6px}
.note{font-size:10.5px;color:var(--muted);line-height:1.55}
.stack{display:flex;flex-direction:column;gap:14px}
.toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.toolbar .search{max-width:340px}
.toolbar .spacer{flex:1}
.data-table{border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;background:color-mix(in srgb,var(--surface) 65%,transparent)}
.data-head,.data-row{display:grid;align-items:center;gap:12px;padding:12px 16px;font-size:12px}
.data-head{background:rgba(255,255,255,.035);color:var(--muted);font-size:10px;letter-spacing:.06em;text-transform:uppercase;border-bottom:1px solid var(--line)}
.data-row{border-bottom:1px solid rgba(255,255,255,.055);cursor:pointer;transition:background .15s}
.data-row:last-child{border-bottom:0}
.data-row:hover{background:rgba(255,255,255,.035)}
.cell{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted)}
.cell.strong{color:var(--text);font-weight:600}
.row-actions{display:flex;justify-content:flex-end;gap:6px}
.mini-btn{background:transparent;border:1px solid var(--line);border-radius:7px;padding:5px 8px;font-size:10px;color:var(--muted)}
.mini-btn:hover{color:var(--text);border-color:var(--line-strong)}
.empty{padding:44px 20px;text-align:center;color:var(--muted);font-size:12.5px}
.empty strong{display:block;color:var(--text);font-size:14px;margin-bottom:5px}
.modal-wrap{position:fixed;inset:0;background:rgba(2,7,5,.72);backdrop-filter:blur(6px);z-index:50;display:flex;align-items:center;justify-content:center;padding:20px;animation:fade .18s ease}
.modal-wrap.hidden{display:none}
@keyframes fade{from{opacity:0}to{opacity:1}}
.modal{width:min(620px,100%);max-height:90vh;overflow:auto;border:1px solid var(--line-strong);border-radius:20px;background:var(--surface);box-shadow:0 40px 100px rgba(0,0,0,.5);animation:rise .22s ease both}
.modal-head{display:flex;align-items:flex-start;gap:12px;padding:20px 22px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--surface);z-index:1}
.modal-head h2{margin:0;font-size:17px;letter-spacing:-.02em}
.modal-head p{margin:4px 0 0;color:var(--muted);font-size:11.5px}
.modal-close{margin-left:auto;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:8px;width:30px;height:30px;color:var(--muted)}
.modal-body{padding:20px 22px}
.modal-foot{padding:16px 22px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px;position:sticky;bottom:0;background:var(--surface)}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.field{display:flex;flex-direction:column;gap:6px;font-size:11.5px;color:var(--muted)}
.field.full{grid-column:1/-1}
.field input,.field select,.field textarea{
  width:100%;padding:10px 11px;border:1px solid var(--line);border-radius:9px;background:rgba(255,255,255,.04);
  color:var(--text);outline:none;font-size:12.5px;
}
.field input:focus,.field select:focus,.field textarea:focus{border-color:color-mix(in srgb,var(--primary) 55%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 10%,transparent)}
.field textarea{min-height:82px;resize:vertical}
.field.check{flex-direction:row;align-items:center;gap:9px;padding-top:18px}
.field.check input{width:auto}
.definition{display:grid;grid-template-columns:minmax(130px,.6fr) 1.4fr;gap:0}
.definition div{padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:12px}
.definition .k{color:var(--muted)}
.definition .v{text-align:right;color:var(--text);overflow-wrap:anywhere}
.toast{
  position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(14px);opacity:0;pointer-events:none;
  background:#0d1714;border:1px solid color-mix(in srgb,var(--primary) 30%,var(--line));border-radius:11px;
  padding:11px 16px;font-size:12px;z-index:70;box-shadow:0 20px 60px rgba(0,0,0,.45);transition:.22s ease;display:flex;gap:8px;align-items:center;
}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.toast .dot{width:6px;height:6px}
.setting-card{display:flex;align-items:center;gap:13px;padding:16px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.03);margin-bottom:10px}
.setting-icon{width:34px;height:34px;border-radius:10px;background:color-mix(in srgb,var(--primary) 12%,transparent);color:var(--primary);display:grid;place-items:center;flex:0 0 34px}
.setting-icon svg{width:17px;height:17px}
.setting-main{flex:1;min-width:0}
.setting-main strong{display:block;font-size:12.5px;font-weight:650}
.setting-main small{display:block;color:var(--muted);font-size:10.5px;margin-top:3px;line-height:1.45}
.overlay{display:none}
@media (max-width:1000px){.split{grid-template-columns:1fr}.sidebar{position:fixed;z-index:30;transform:translateX(-102%);transition:.22s ease}.app.menu-open .sidebar{transform:none}.app.menu-open .overlay{display:block;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:20}.burger{display:grid}.topbar{padding:0 16px}.view{padding:22px 18px 40px}}
@media (max-width:760px){.data-head{display:none}.data-row{grid-template-columns:1fr!important;gap:7px;padding:14px}.cell{white-space:normal}.cell:before{content:attr(data-label) " · ";color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.05em}.row-actions{justify-content:flex-start;padding-top:4px}.form-grid{grid-template-columns:1fr}.head-actions{margin-left:0;width:100%}.chip.platform{display:none}.top-actions .chip:nth-child(2){display:none}.metric-value{font-size:27px}}
</style>
</head>
<body>
<div class="app" id="app">
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark">K</div>
      <div>
        <div class="brand-name">__APP_NAME__</div>
        <div class="brand-sub">__DOMAIN__</div>
      </div>
    </div>
    <div class="nav-label">Espace de travail</div>
    <nav class="nav" id="nav"></nav>
    <div class="sidebar-foot">
      <div class="sync-card">
        <div class="sync-line"><span class="dot"></span> Hors ligne prêt</div>
        <p>Écriture locale instantanée. Synchronisation cloud automatique.</p>
      </div>
      <div class="user">
        <div class="avatar">AK</div>
        <div><div style="font-size:12px;font-weight:600">Compte démo</div><small>admin@exemple.ci</small></div>
      </div>
    </div>
  </aside>
  <div class="overlay" id="overlay"></div>
  <main class="main">
    <header class="topbar">
      <button class="burger" id="burger" aria-label="Ouvrir le menu">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <div class="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="global-search" placeholder="Rechercher dans l'application…" aria-label="Recherche globale">
      </div>
      <div class="top-actions">
        <span class="chip preview-badge">Aperçu interactif</span>
        <span class="chip platform"><span class="dot"></span> <span id="platform-label">Web</span></span>
        <button class="icon-btn" id="sync-btn" title="Synchroniser" aria-label="Synchroniser">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2"/><path d="M21 3v6h-6M3 21v-6h6"/></svg>
        </button>
        <div class="avatar">AK</div>
      </div>
    </header>
    <section class="view" id="view"></section>
  </main>
</div>
<div class="modal-wrap hidden" id="modal-wrap" role="dialog" aria-modal="true">
  <div class="modal" id="modal"></div>
</div>
<div class="toast" id="toast"><span class="dot"></span><span id="toast-text"></span></div>
<script>
var DATA = __DATA__;
var state = { view: 'dashboard', entityKey: null, query: '' };
var ICONS = {
  dashboard: '<path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  task: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  invoice: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  cart: '<circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M3 4h2l2.5 11h11L21 7H6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  badge: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="9" r="2.5"/><path d="M8 17c0-2 1.8-3 4-3s4 1 4 3"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 9h18"/><circle cx="16" cy="14" r="1"/>',
  school: '<path d="M22 9L12 4 2 9l10 5 10-5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
  health: '<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/><path d="M12 8v6M9 11h6"/>',
  event: '<path d="M12 2l2.4 6.2L21 9l-5 4.2 1.6 6.8L12 16.8 6.4 20 8 13.2 3 9l6.6-.8z"/>',
  support: '<path d="M4 12a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-2v-6h4"/><path d="M4 12v5a2 2 0 0 0 2 2h2v-6H4"/><path d="M12 19v2h4"/>',
  sparkles: '<path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  cloud: '<path d="M17.5 19H7a5 5 0 1 1 .8-9.94A6 6 0 0 1 19.5 11a4 4 0 0 1-2 8z"/><path d="M12 13v5M9.5 15.5L12 13l2.5 2.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  devices: '<rect x="2" y="4" width="13" height="10" rx="1"/><path d="M6 18h5"/><rect x="16" y="9" width="6" height="12" rx="1"/>'
};
function svg(name) {
  var body = ICONS[name] || ICONS.sparkles;
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
}
function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
  });
}
function fmt(value, field) {
  if (value == null || value === '') return '—';
  if (field && field.type === 'number') {
    var number = Number(value);
    return Number.isFinite(number) ? new Intl.NumberFormat('fr-FR').format(number) : esc(value);
  }
  if (field && field.type === 'date') {
    var date = new Date(value);
    if (!Number.isNaN(date.valueOf())) {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
  if (field && field.type === 'boolean') return value ? 'Oui' : 'Non';
  return esc(value);
}
function tone(value) {
  var normalized = String(value || '').toLowerCase();
  if (/(termin|pay|actif|livr|résol|resol|valid|complet|en stock)/.test(normalized)) return 'ok';
  if (/(retard|annul|rupture|refus|bloqu|urgent|inactif)/.test(normalized)) return 'bad';
  if (/(attente|cours|prospect|brouillon|planifi|ouvert|nouvelle|envoy)/.test(normalized)) return 'warn';
  return '';
}
function badge(value) { return '<span class="badge ' + tone(value) + '">' + esc(value) + '</span>'; }
function toast(message) {
  var element = document.getElementById('toast');
  document.getElementById('toast-text').textContent = message;
  element.classList.add('show');
  window.clearTimeout(window.__toastTimer);
  window.__toastTimer = window.setTimeout(function () { element.classList.remove('show'); }, 2600);
}
function entities() { return DATA.entities; }
function findEntity(key) {
  for (var index = 0; index < DATA.entities.length; index++) {
    if (DATA.entities[index].key === key) return DATA.entities[index];
  }
  return DATA.entities[0];
}
function initials(text) {
  var parts = String(text || 'K').trim().split(/\s+/);
  return parts.slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join('') || 'K';
}
function rowValue(entity, row) { return row[entity.primaryKey]; }
function fieldByKey(entity, key) {
  for (var index = 0; index < entity.fields.length; index++) {
    if (entity.fields[index].key === key) return entity.fields[index];
  }
  return { key: key, label: key, type: 'text' };
}
function navMarkup() {
  var items = [{ key: 'dashboard', label: 'Tableau de bord', icon: 'dashboard' }]
    .concat(DATA.entities.map(function (entity) { return { key: entity.key, label: entity.plural, icon: entity.icon, count: entity.rows.length }; }))
    .concat([{ key: 'settings', label: 'Paramètres', icon: 'settings' }]);
  return items.map(function (item) {
    var active = state.view === item.key ? ' active' : '';
    var count = item.count != null ? '<span class="count">' + item.count + '</span>' : '';
    return '<button class="' + active.trim() + '" data-view="' + esc(item.key) + '"><span class="icon">' + svg(item.icon) + '</span><span>' + esc(item.label) + '</span>' + count + '</button>';
  }).join('');
}
function renderNav() {
  document.getElementById('nav').innerHTML = navMarkup();
}
function metricsMarkup() {
  return DATA.entities.map(function (entity, entityIndex) {
    var bars = '';
    for (var index = 0; index < 9; index++) {
      var height = 22 + ((index * 13 + entityIndex * 9) % 70);
      bars += '<span style="height:' + height + '%"></span>';
    }
    return '<article class="metric" data-view="' + esc(entity.key) + '">' +
      '<div class="metric-top"><span>' + esc(entity.plural) + '</span><span class="metric-icon">' + svg(entity.icon) + '</span></div>' +
      '<div class="metric-value">' + entity.rows.length + '</div>' +
      '<div class="metric-name">' + esc(entity.plural) + ' au total</div>' +
      '<div class="metric-foot">Synchronisé · à jour</div>' +
      '<div class="spark">' + bars + '</div>' +
      '</article>';
  }).join('');
}
function recentMarkup() {
  var items = [];
  DATA.entities.forEach(function (entity) {
    entity.rows.slice(0, 2).forEach(function (row, index) {
      items.push({ entity: entity, row: row, index: index });
    });
  });
  items = items.slice(0, 5);
  if (!items.length) return '<div class="empty">Aucune activité pour le moment.</div>';
  return items.map(function (item) {
    var statusField = null;
    for (var index = 0; index < item.entity.fields.length; index++) {
      if (item.entity.fields[index].type === 'status') { statusField = item.entity.fields[index]; break; }
    }
    var date = new Date(Date.now() - item.index * 3600 * 1000);
    return '<div class="activity-row" data-entity="' + esc(item.entity.key) + '">' +
      '<span class="activity-icon">' + svg(item.entity.icon) + '</span>' +
      '<div class="activity-main"><strong>' + esc(rowValue(item.entity, item.row)) + '</strong><small>' + esc(item.entity.label) + ' · ' + esc(item.row.id) + '</small></div>' +
      (statusField ? badge(item.row[statusField.key]) : '') +
      '<span class="activity-time">' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + '</span>' +
      '</div>';
  }).join('');
}
function dashboardMarkup() {
  var total = DATA.entities.reduce(function (sum, entity) { return sum + entity.rows.length; }, 0);
  return '<div class="eyebrow">' + esc(DATA.domain) + '</div>' +
    '<h1>' + esc(DATA.copy.welcomeTitle) + '</h1>' +
    '<p class="lede">' + esc(DATA.copy.welcomeMessage) + '</p>' +
    '<div class="head-row" style="margin-top:22px">' +
      '<div class="head-actions">' +
        '<button class="btn primary" data-action="new-first">' + svg('plus') + ' Nouveau ' + esc(DATA.entities[0].label.toLowerCase()) + '</button>' +
        '<button class="btn" data-action="sync">' + svg('cloud') + ' Synchroniser</button>' +
      '</div>' +
    '</div>' +
    '<div class="grid-metrics">' + metricsMarkup() + '</div>' +
    '<div class="split">' +
      '<div class="panel"><div class="panel-head"><div><div class="panel-title">Activité récente</div><div class="panel-sub">' + total + ' enregistrements locaux</div></div><button class="btn ghost" data-view="' + esc(DATA.entities[0].key) + '">Tout voir ' + svg('arrow') + '</button></div><div class="panel-body activity">' + recentMarkup() + '</div></div>' +
      '<div class="stack">' +
        '<div class="panel sync-panel"><div class="panel-head"><div><div class="panel-title">Synchronisation</div><div class="panel-sub">Offline → Cloud</div></div><span class="badge ok">Connecté</span></div><div class="panel-body">' +
          '<div class="sync-row"><span><span class="dot"></span>Dernière synchro</span><strong>à l\'instant</strong></div>' +
          '<div class="sync-row"><span>Stockage local</span><strong>Hive · chiffré</strong></div>' +
          '<div class="sync-row"><span>Conflits</span><strong>0</strong></div>' +
          '<div class="note">' + esc(DATA.copy.syncMessage) + '</div>' +
          '<button class="btn" data-action="sync">' + svg('cloud') + ' Lancer une synchronisation</button>' +
        '</div></div>' +
        '<div class="panel"><div class="panel-head"><div><div class="panel-title">Plateformes</div><div class="panel-sub">Un seul code Flutter</div></div></div><div class="panel-body"><div class="platforms">' +
          DATA.platforms.map(function (platform) { return '<span class="chip"><span class="dot"></span>' + esc(platform) + '</span>'; }).join('') +
        '</div><p class="note" style="margin:12px 0 0">Base générée offline-first, synchronisée avec Supabase.</p></div></div>' +
      '</div>' +
    '</div>';
}
function entityRows(entity) {
  var query = state.query.trim().toLowerCase();
  return entity.rows.filter(function (row) {
    if (!query) return true;
    return Object.keys(row).some(function (key) { return String(row[key]).toLowerCase().indexOf(query) !== -1; });
  });
}
function tableMarkup(entity) {
  var rows = entityRows(entity);
  if (!rows.length) {
    return '<div class="data-table"><div class="empty"><strong>Aucun résultat</strong>' + (state.query ? 'Essayez une autre recherche ou créez un élément.' : esc(DATA.copy.emptyState)) + '</div></div>';
  }
  var keys = entity.previewKeys.slice(0, 3);
  var template = 'minmax(170px,2fr) repeat(' + Math.max(1, keys.length - 1) + ', minmax(100px,1fr)) auto';
  var head = keys.map(function (key) { return '<div>' + esc(fieldByKey(entity, key).label) + '</div>'; }).join('') + '<div style="text-align:right">Actions</div>';
  var body = rows.map(function (row) {
    var cells = keys.map(function (key) {
      var field = fieldByKey(entity, key);
      var content = field.type === 'status' ? badge(row[key]) : fmt(row[key], field);
      return '<div class="cell' + (key === entity.primaryKey ? ' strong' : '') + '" data-label="' + esc(field.label) + '">' + content + '</div>';
    }).join('');
    return '<div class="data-row" style="grid-template-columns:' + template + '" data-row="' + esc(row.id) + '">' + cells +
      '<div class="row-actions"><button class="mini-btn" data-edit="' + esc(row.id) + '">Modifier</button><button class="mini-btn" data-detail="' + esc(row.id) + '">Détails</button></div></div>';
  }).join('');
  return '<div class="data-table"><div class="data-head" style="grid-template-columns:' + template + '">' + head + '</div>' + body + '</div>';
}
function entityMarkup(entity) {
  var search = '<div class="search" style="max-width:340px">' + svg('search') + '<input id="table-search" placeholder="Rechercher un ' + esc(entity.label.toLowerCase()) + '…" value="' + esc(state.query) + '" aria-label="Rechercher"></div>';
  return '<div class="head-row"><div><div class="eyebrow">' + esc(DATA.domain) + '</div><h1>' + esc(entity.plural) + '</h1><p class="lede">Gérez vos ' + esc(entity.plural.toLowerCase()) + ' en local. La synchronisation se fait automatiquement.</p></div>' +
    '<div class="head-actions"><button class="btn primary" data-action="new">' + svg('plus') + ' Nouveau</button></div></div>' +
    '<div class="toolbar">' + search + '<span class="spacer"></span><span class="chip">' + entityRows(entity).length + ' élément' + (entityRows(entity).length === 1 ? '' : 's') + '</span></div>' +
    '<div id="table-wrap">' + tableMarkup(entity) + '</div>';
}
function settingsMarkup() {
  return '<div class="eyebrow">Configuration</div><h1>Paramètres</h1><p class="lede">Gérez la synchronisation, la sécurité et les plateformes de ' + esc(DATA.appName) + '.</p>' +
    '<div style="max-width:760px;margin-top:24px">' +
      '<div class="setting-card"><div class="setting-icon">' + svg('users') + '</div><div class="setting-main"><strong>Compte connecté</strong><small>admin@exemple.ci · session de démonstration Supabase</small></div><span class="badge ok">Actif</span></div>' +
      '<div class="setting-card"><div class="setting-icon">' + svg('cloud') + '</div><div class="setting-main"><strong>Mode hors ligne</strong><small>' + esc(DATA.copy.syncMessage) + '</small></div><button class="btn" data-action="sync">Synchroniser</button></div>' +
      '<div class="setting-card"><div class="setting-icon">' + svg('lock') + '</div><div class="setting-main"><strong>Sécurité</strong><small>Row Level Security active : chaque utilisateur ne peut lire que ses propres lignes.</small></div><span class="badge ok">RLS</span></div>' +
      '<div class="setting-card"><div class="setting-icon">' + svg('devices') + '</div><div class="setting-main"><strong>Plateformes</strong><small>' + DATA.platforms.map(esc).join(' · ') + '</small></div></div>' +
      '<div class="panel" style="margin-top:18px"><div class="panel-head"><div><div class="panel-title">Fonctionnalités générées</div><div class="panel-sub">Issue de votre description</div></div></div><div class="panel-body platforms">' +
        DATA.features.map(function (feature) { return '<span class="chip"><span class="dot"></span>' + esc(feature) + '</span>'; }).join('') +
      '</div></div>' +
      '<p class="note" style="margin-top:18px">Prototype web interactif fourni pour visualiser le produit. L\'application Flutter complète est incluse dans l\'export ZIP.</p>' +
    '</div>';
}
function render() {
  renderNav();
  var view = document.getElementById('view');
  if (state.view === 'dashboard') view.innerHTML = dashboardMarkup();
  else if (state.view === 'settings') view.innerHTML = settingsMarkup();
  else view.innerHTML = entityMarkup(findEntity(state.view));
  document.getElementById('global-search').value = state.query;
  if (state.view !== 'dashboard' && state.view !== 'settings') {
    var input = document.getElementById('table-search');
    if (input) {
      input.addEventListener('input', function (event) {
        state.query = event.target.value;
        document.getElementById('table-wrap').innerHTML = tableMarkup(findEntity(state.view));
      });
    }
  }
}
function navigate(view, query) {
  state.view = view;
  state.entityKey = view === 'dashboard' || view === 'settings' ? null : view;
  state.query = query || '';
  document.getElementById('app').classList.remove('menu-open');
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function closeModal() {
  document.getElementById('modal-wrap').classList.add('hidden');
  document.getElementById('modal').innerHTML = '';
}
function openModal(content) {
  document.getElementById('modal').innerHTML = content;
  document.getElementById('modal-wrap').classList.remove('hidden');
}
function formFields(entity, row) {
  return entity.fields.map(function (field) {
    var value = row ? row[field.key] : '';
    var input;
    if (field.type === 'status') {
      input = '<select name="' + esc(field.key) + '">' + field.options.map(function (option) {
        var selected = String(value || '') === option ? ' selected' : '';
        return '<option' + selected + '>' + esc(option) + '</option>';
      }).join('') + '</select>';
    } else if (field.type === 'longtext') {
      input = '<textarea name="' + esc(field.key) + '">' + esc(value) + '</textarea>';
    } else if (field.type === 'boolean') {
      input = '<input type="checkbox" name="' + esc(field.key) + '"' + (value ? ' checked' : '') + '>';
    } else {
      var type = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';
      input = '<input type="' + type + '" name="' + esc(field.key) + '" value="' + esc(value) + '"' + (field.type === 'number' ? ' step="0.01"' : '') + '>';
    }
    var className = field.type === 'boolean' ? 'field check' : field.type === 'longtext' ? 'field full' : 'field';
    return '<label class="' + className + '"><span>' + esc(field.label) + (field.required ? ' *' : '') + '</span>' + input + '</label>';
  }).join('');
}
function openForm(entity, row) {
  var editing = Boolean(row);
  openModal('<div class="modal-head"><div><h2>' + (editing ? 'Modifier' : 'Nouveau') + ' · ' + esc(entity.label) + '</h2><p>Enregistré dans Hive puis synchronisé avec Supabase.</p></div><button class="modal-close" data-close aria-label="Fermer">×</button></div>' +
    '<form id="entity-form"><div class="modal-body"><div class="form-grid">' + formFields(entity, row) + '</div></div>' +
    '<div class="modal-foot"><button type="button" class="btn ghost" data-close>Annuler</button><button type="submit" class="btn primary">' + svg('plus') + (editing ? ' Mettre à jour' : ' Enregistrer') + '</button></div></form>');
  document.getElementById('entity-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var formData = new FormData(event.target);
    var next = { id: editing ? row.id : entity.key + '-' + Date.now() };
    entity.fields.forEach(function (field) {
      if (field.type === 'boolean') next[field.key] = formData.get(field.key) === 'on';
      else if (field.type === 'number') next[field.key] = formData.get(field.key) === '' ? '' : Number(formData.get(field.key));
      else next[field.key] = formData.get(field.key) || '';
    });
    if (editing) {
      var index = entity.rows.findIndex(function (item) { return item.id === row.id; });
      if (index >= 0) entity.rows[index] = next;
    } else {
      entity.rows.unshift(next);
    }
    closeModal();
    render();
    toast(editing ? 'Modification enregistrée localement.' : 'Élément créé. Synchronisation en file d\'attente.');
  });
}
function openDetails(entity, row) {
  var definition = entity.fields.map(function (field) {
    var value = field.type === 'status' ? badge(row[field.key]) : fmt(row[field.key], field);
    return '<div class="k">' + esc(field.label) + '</div><div class="v">' + value + '</div>';
  }).join('');
  openModal('<div class="modal-head"><div><h2>' + esc(rowValue(entity, row)) + '</h2><p>' + esc(entity.label) + ' · ' + esc(row.id) + '</p></div><button class="modal-close" data-close aria-label="Fermer">×</button></div>' +
    '<div class="modal-body"><div class="definition">' + definition + '</div><p class="note" style="margin-top:16px">Ce prototype simule la synchronisation. Dans l\'application Flutter, cet enregistrement est stocké dans Hive et poussé vers Supabase.</p></div>' +
    '<div class="modal-foot"><button class="btn ghost" data-close>Fermer</button><button class="btn primary" data-edit="' + esc(row.id) + '">Modifier</button></div>');
}
document.addEventListener('click', function (event) {
  var target = event.target.closest('[data-view],[data-action],[data-close],[data-edit],[data-detail],[data-row]');
  if (!target) return;
  if (target.hasAttribute('data-close')) { closeModal(); return; }
  if (target.hasAttribute('data-edit')) {
    event.stopPropagation();
    var entityEdit = findEntity(state.view);
    var rowEdit = entityEdit.rows.find(function (item) { return item.id === target.getAttribute('data-edit'); });
    if (rowEdit) openForm(entityEdit, rowEdit);
    return;
  }
  if (target.hasAttribute('data-detail')) {
    event.stopPropagation();
    var entityDetail = findEntity(state.view);
    var rowDetail = entityDetail.rows.find(function (item) { return item.id === target.getAttribute('data-detail'); });
    if (rowDetail) openDetails(entityDetail, rowDetail);
    return;
  }
  if (target.hasAttribute('data-view')) { navigate(target.getAttribute('data-view')); return; }
  var action = target.getAttribute('data-action');
  if (action === 'new-first') { navigate(DATA.entities[0].key); openForm(DATA.entities[0]); return; }
  if (action === 'new') { openForm(findEntity(state.view)); return; }
  if (action === 'sync') {
    toast('Synchronisation simulée : 3 envois, 2 réceptions. Aucun conflit.');
    var dot = document.querySelector('.sync-line .dot');
    if (dot) dot.style.background = 'var(--accent)';
    window.setTimeout(function () { if (dot) dot.style.background = 'var(--primary)'; }, 900);
    return;
  }
  if (target.hasAttribute('data-row')) {
    var entityRow = findEntity(state.view);
    var rowOpen = entityRow.rows.find(function (item) { return item.id === target.getAttribute('data-row'); });
    if (rowOpen) openDetails(entityRow, rowOpen);
  }
});
document.getElementById('modal-wrap').addEventListener('click', function (event) {
  if (event.target === event.currentTarget) closeModal();
});
document.getElementById('burger').addEventListener('click', function () {
  document.getElementById('app').classList.toggle('menu-open');
});
document.getElementById('overlay').addEventListener('click', function () {
  document.getElementById('app').classList.remove('menu-open');
});
document.getElementById('sync-btn').addEventListener('click', function () {
  toast('Synchronisation simulée : données locales et cloud alignées.');
});
document.getElementById('global-search').addEventListener('input', function (event) {
  if (state.view === 'dashboard' || state.view === 'settings') {
    navigate(DATA.entities[0].key, event.target.value);
    document.getElementById('global-search').focus();
    return;
  }
  state.query = event.target.value;
  var wrap = document.getElementById('table-wrap');
  if (wrap) wrap.innerHTML = tableMarkup(findEntity(state.view));
  var tableSearch = document.getElementById('table-search');
  if (tableSearch) tableSearch.value = state.query;
});
document.getElementById('platform-label').textContent = DATA.platforms[0] || 'Web';
render();
</script>
</body>
</html>`;

  const content = template
    .replaceAll("__DATA__", jsData(spec))
    .replaceAll("__APP_NAME__", appName)
    .replaceAll("__DOMAIN__", domain)
    .replaceAll("__PRIMARY__", primary)
    .replaceAll("__SECONDARY__", secondary)
    .replaceAll("__ACCENT__", accent)
    .replaceAll("__BACKGROUND__", background)
    .replaceAll("__SURFACE__", surface);

  return {
    path: "prototype/index.html",
    content,
    language: "html",
    source: "scaffold",
  };
}
