// Pantalla de detalle de pedido + simulador.
let lineasSim = [];

async function initPedido() {
  const c = await getJSON("/api/catalogos");
  document.getElementById("sim-cedis").innerHTML = c.cedis.map((x) => `<option>${x}</option>`).join("");
  document.getElementById("sku-list").innerHTML = c.skus.map((x) => `<option value="${x.replace(/"/g, "&quot;")}"></option>`).join("");

  document.getElementById("btn-buscar").onclick = buscarPedido;
  document.getElementById("ped-id").addEventListener("keydown", (e) => { if (e.key === "Enter") buscarPedido(); });
  document.getElementById("btn-add").onclick = addLinea;
  document.getElementById("btn-calcular").onclick = calcular;
  document.getElementById("btn-reset").onclick = () => { lineasSim = []; renderLineas(); document.getElementById("sim-result").classList.add("hidden"); };
}

// ---------- helpers de render ----------
function scoreBlock(score, nivel) {
  return `<div class="card" style="text-align:center">
      <div class="label muted">Score del pedido</div>
      <div class="big-score dot ${nivel}">${score.toFixed(4)}</div>
      ${nivelBadge(nivel)}
    </div>`;
}
function lineasTable(lineas) {
  return `<table style="margin-top:14px"><thead><tr>
      <th>SKU</th><th class="num">Cant.</th><th class="num">Score</th><th>Nivel</th><th>Sustituto más probable</th>
    </tr></thead><tbody>${lineas.map((l) => {
      const sust = (l.sustitutos_probables || []);
      const top = sust.length ? `${sust[0].nombre} <span class="muted">(${sust[0].frecuencia}×)</span>` : "<span class='muted'>—</span>";
      return `<tr>
        <td>${l.nombre_sku}${l.historico === false ? " <span class='muted'>(sin histórico)</span>" : ""}</td>
        <td class="num">${l.quantity}</td>
        <td class="num">${l.score_linea.toFixed(4)}</td>
        <td>${nivelDot(l.nivel)} ${l.nivel}</td>
        <td>${top}</td></tr>`;
    }).join("")}</tbody></table>`;
}

// ---------- buscar pedido existente ----------
async function buscarPedido() {
  const id = document.getElementById("ped-id").value.trim();
  const box = document.getElementById("ped-result");
  if (!id) return;
  box.classList.remove("hidden");
  box.innerHTML = "<span class='spinner'></span> Buscando…";
  try {
    const d = await getJSON("/api/pedido/" + encodeURIComponent(id));
    const h = d.cabecera;
    box.innerHTML = `
      <div class="cards">
        ${scoreBlock(d.score_pedido, d.nivel_pedido)}
        <div class="card metric"><div class="label">CEDIS</div><div class="value">${h.cedis}</div></div>
        <div class="card metric"><div class="label">País</div><div class="value" style="font-size:18px">${h.pais ?? "—"}</div></div>
        <div class="card metric"><div class="label">Unidad</div><div class="value" style="font-size:18px">${h.business_unit ?? "—"}</div></div>
        <div class="card metric"><div class="label">Status</div><div class="value" style="font-size:18px">${h.status_final ?? "—"}</div></div>
        <div class="card metric"><div class="label">Líneas</div><div class="value">${h.n_lineas}</div></div>
      </div>
      ${h.nota_ambiguedad ? `<div class="note">⚠️ ${h.nota_ambiguedad}</div>` : ""}
      ${lineasTable(d.lineas)}`;
  } catch (e) {
    box.innerHTML = `<div class="note">No se encontró el pedido (${e.message}).</div>`;
  }
}

// ---------- simulador ----------
function addLinea() {
  const sku = document.getElementById("sim-sku").value.trim();
  const qty = parseInt(document.getElementById("sim-qty").value, 10) || 1;
  if (!sku) return;
  lineasSim.push({ nombre_sku: sku, quantity: qty });
  document.getElementById("sim-sku").value = "";
  renderLineas();
}
function renderLineas() {
  const tbl = document.getElementById("sim-lineas-tbl");
  const body = document.getElementById("sim-lineas");
  tbl.classList.toggle("hidden", lineasSim.length === 0);
  body.innerHTML = lineasSim.map((l, i) => `
    <tr><td>${l.nombre_sku}</td><td class="num">${l.quantity}</td>
    <td class="num"><button class="ghost" onclick="quitarLinea(${i})">✕</button></td></tr>`).join("");
}
function quitarLinea(i) { lineasSim.splice(i, 1); renderLineas(); }

async function calcular() {
  if (!lineasSim.length) return;
  const cedis = document.getElementById("sim-cedis").value;
  const box = document.getElementById("sim-result");
  box.classList.remove("hidden");
  box.innerHTML = "<span class='spinner'></span> Calculando…";
  try {
    const d = await postJSON("/api/simular", { cedis, lineas: lineasSim });
    box.innerHTML = `
      <div class="cards">
        ${scoreBlock(d.score_pedido, d.nivel_pedido)}
        <div class="card metric"><div class="label">CEDIS</div><div class="value">${d.cedis}</div></div>
        <div class="card metric"><div class="label">Tasa del CEDIS</div><div class="value">${(d.tasa_cedis*100).toFixed(1)}%</div></div>
      </div>
      ${lineasTable(d.lineas)}`;
  } catch (e) {
    box.innerHTML = `<div class="note">Error: ${e.message}</div>`;
  }
}
