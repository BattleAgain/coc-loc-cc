const fs = require('fs');
const NAV_API = 'https://nav.tmlgbd.cc.cd/api/links';
const GROUP_ICONS = {
  'Cloudflare': '☁️', '中转站 / API': '🔋', 'AI / 创作': '🤖', '邮箱': '📮',
  '社区 / 论坛': '🔥', '代码 / 开发': '💻', '面板 / 服务': '🧩', '其他': '🔗'
};
const GROUP_ORDER = Object.keys(GROUP_ICONS);
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function normItems(payload) {
  const arr = Array.isArray(payload) ? payload : (payload.items || payload.links || []);
  return arr.filter(x => x && x.title && x.url).map((x, i) => ({
    title: x.title, url: x.url, desc: x.desc || '', icon: x.icon || '🔗', group: x.group || '其他',
    order: Number.isFinite(+x.order) ? +x.order : i
  }));
}
function render(items) {
  if (!items.length) return '';
  const groups = new Map();
  for (const item of items) {
    const g = GROUP_ICONS[item.group] ? item.group : '其他';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(item);
  }
  return GROUP_ORDER.filter(g => groups.has(g)).map(g => {
    const cards = groups.get(g).sort((a,b)=>a.order-b.order || a.title.localeCompare(b.title, 'zh-CN')).map(item =>
      `<a class="card" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><span class="ico">${esc(item.icon)}</span><span><div class="title">${esc(item.title)}</div><div class="desc">${esc(item.desc)}</div></span></a>`
    ).join('');
    return `<section class="cat"><h2><span>${esc(GROUP_ICONS[g] || '🔗')}</span>${esc(g)} · 动态同步</h2><div class="grid">${cards}</div></section>`;
  }).join('');
}
(async () => {
  const res = await fetch(NAV_API, {headers:{'accept':'application/json'}});
  if (!res.ok) throw new Error(`fetch ${NAV_API} failed: ${res.status}`);
  const payload = await res.json();
  const items = normItems(payload);
  fs.writeFileSync('links.json', JSON.stringify({ok:true, synced_at:new Date().toISOString(), source:NAV_API, items}, null, 2));
  let html = fs.readFileSync('index.html', 'utf8');
  const block = `<!-- MENAV_DYNAMIC_START -->\n${render(items)}\n<!-- MENAV_DYNAMIC_END -->`;
  if (!/<!-- MENAV_DYNAMIC_START -->[\s\S]*?<!-- MENAV_DYNAMIC_END -->/.test(html)) throw new Error('dynamic markers not found');
  html = html.replace(/<!-- MENAV_DYNAMIC_START -->[\s\S]*?<!-- MENAV_DYNAMIC_END -->/, block);
  fs.writeFileSync('index.html', html);
})();
