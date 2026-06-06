// Helpers compartidos por todas las pantallas.
const API = "";  // mismo origen (FastAPI sirve el frontend)

async function getJSON(path) {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
async function postJSON(path, body) {
  const r = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

const fmt = (n) => (n ?? 0).toLocaleString("es-MX");
const pct = (x) => (x * 100).toFixed(1) + "%";

function nivelBadge(nivel) {
  return `<span class="badge ${nivel}">${nivel}</span>`;
}
function nivelDot(nivel) {
  const e = { Rojo: "🔴", Amarillo: "🟡", Verde: "🟢" }[nivel] || "⚪";
  return `<span class="dot ${nivel}">${e}</span>`;
}

// Barra de navegación compartida
function renderNav(active) {
  const items = [
    ["index.html", "Dashboard"],
    ["semaforo.html", "Semáforo CEDIS"],
    ["pedido.html", "Pedido / Simulador"],
    ["chat.html", "Asistente IA"],
  ];
  const links = items
    .map(([href, label]) => `<a href="${href}" class="${active === href ? "active" : ""}">${label}</a>`)
    .join("");
  document.body.insertAdjacentHTML("afterbegin",
    `<nav class="nav"><div class="brand">🥤 Order Rescue <small>· Arca Continental</small></div>${links}</nav>`);
}
