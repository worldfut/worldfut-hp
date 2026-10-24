import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export function safeLink(value) {
  if (!value) return '';
  let url;
  try { url = new URL(value); } catch { throw new Error('リンク先は https:// から始まるURLにしてください。'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('リンク先は認証情報を含まないHTTPS URLにしてください。');
  return url.href;
}
export function validateEntry(entry, id, publicDir) {
  if (!id || id === '.' || id === '..' || /[/\\\u0000-\u001f\u007f]/.test(id)) throw new Error(`記事ファイル名が不正です: ${id}`);
  if (typeof entry.title !== 'string' || !entry.title.trim()) throw new Error(`${id}: タイトルが必要です。`);
  if (!['new','press'].includes(entry.section)) throw new Error(`${id}: 掲載場所が不正です。`);
  for (const k of ['source','summary','body','date','date_label','image','image_alt','link','link_label']) {
    if (entry[k] !== undefined && typeof entry[k] !== 'string') throw new Error(`${id}: ${k}は文字列にしてください。`);
  }
  if (entry.date) {
    const d = new Date(entry.date + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || !Number.isFinite(+d) || d.toISOString().slice(0,10) !== entry.date) throw new Error(`${id}: 日付が不正です。`);
  }
  for (const k of ['published','featured']) if (entry[k] !== undefined && typeof entry[k] !== 'boolean') throw new Error(`${id}: ${k}は真偽値にしてください。`);
  if (entry.order !== undefined && (!Number.isFinite(entry.order) || !Number.isInteger(entry.order))) throw new Error(`${id}: 表示優先度は整数にしてください。`);
  const link = safeLink(entry.link);
  if (entry.image) {
    const file = resolve(publicDir, '.' + entry.image);
    if (!/^\/uploads\/[^?#]+\.(png|jpe?g|webp|gif)$/i.test(entry.image) || !file.startsWith(resolve(publicDir,'uploads') + sep) || !existsSync(file)) throw new Error(`${id}: 画像はアップロード済みのPNG/JPEG/WebP/GIFを選んでください。`);
  }
  return { ...entry, id, link };
}
const detailPath = entry => `/news/${encodeURIComponent(entry.id)}/`;
const dateText = e => e.date_label || (e.date || '').replaceAll('-','.');
const textLines = value => escapeHtml(value).replaceAll('\n','<br>');
export function renderCard(e) {
  const href = e.body?.trim() ? detailPath(e) : e.link;
  const tag = href ? 'a' : 'article';
  return `<${tag} class="media-card${e.featured?' news-card-featured':''}"${href?` href="${escapeHtml(href)}"${e.body?.trim()?'':' target="_blank" rel="noopener noreferrer"'}`:''}>
    ${e.featured?'<div class="news-badge-new">NEW</div>':''}
    ${e.image?`<img class="cms-news-image" src="${escapeHtml(e.image)}" alt="${escapeHtml(e.image_alt || e.title)}" loading="lazy">`:''}
    ${e.source?`<div class="media-src">${escapeHtml(e.source)}</div>`:''}
    <h3>${textLines(e.title)}</h3>
    ${e.summary?`<p class="cms-summary">${textLines(e.summary)}</p>`:''}
    ${dateText(e)?`<p class="media-date">${escapeHtml(dateText(e))}</p>`:''}
    ${href?`<span class="news-cta">${escapeHtml(e.link_label || (e.body?.trim()?'詳しく見る':'記事を見る'))} ↗</span>`:''}
  </${tag}>`;
}
export function renderNews(entries) {
  const published = entries.filter(e=>e.published !== false).sort((a,b)=>(b.order||0)-(a.order||0) || (b.date||'').localeCompare(a.date||'') || a.id.localeCompare(b.id));
  return ['new','press'].map(section=>`<div class="news-tab-content${section==='new'?' active':''}" id="news-tab-${section}"><div class="media-grid">${published.filter(e=>e.section===section).map(renderCard).join('\n') || '<p>現在、公開中の記事はありません。</p>'}</div></div>`).join('\n');
}
export function renderDetail(e) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(e.title.replaceAll('\n',' '))} | WorldFut</title><meta name="description" content="${escapeHtml(e.summary || e.title)}"><style>body{margin:0;background:#f7f9fc;color:#1a2332;font-family:system-ui,sans-serif;line-height:1.9}header,main{max-width:800px;margin:auto;padding:24px}header{border-bottom:1px solid #e2e8f0}a{color:#2a7fc1}h1{font-size:clamp(24px,5vw,36px);line-height:1.5;overflow-wrap:anywhere}img{width:100%;max-height:520px;object-fit:contain;background:#fff;border-radius:12px}article{background:#fff;padding:clamp(20px,5vw,48px);border-radius:16px;margin:24px 0}p{overflow-wrap:anywhere}.body{white-space:pre-wrap;overflow-wrap:anywhere}.meta{color:#6b7280}.button{display:inline-block;border:1px solid #2a7fc1;padding:8px 20px;border-radius:8px;margin-top:24px}</style></head><body><header><a href="/">学生団体 WorldFut</a></header><main><a href="/#media">← News &amp; Topics に戻る</a><article><p class="meta">${escapeHtml(e.source)} ${escapeHtml(dateText(e))}</p><h1>${textLines(e.title)}</h1>${e.image?`<img src="${escapeHtml(e.image)}" alt="${escapeHtml(e.image_alt || e.title)}">`:''}<p>${textLines(e.summary)}</p><div class="body">${escapeHtml(e.body)}</div>${e.link?`<a class="button" href="${escapeHtml(e.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(e.link_label || '関連リンクを開く')} ↗</a>`:''}</article></main></body></html>`;
}
