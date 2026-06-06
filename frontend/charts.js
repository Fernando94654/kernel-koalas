// Render del dashboard EDA con Chart.js + grafo D3.
const COLORS = { rojo: "#e3001b", amarillo: "#f5a623", verde: "#2eae5b", gris: "#9ca3af", azul: "#2563eb" };
const truncate = (s, n = 34) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

Chart.defaults.font.family = "-apple-system, Segoe UI, Roboto, sans-serif";
Chart.defaults.plugins.legend.display = false;

async function initDashboard() {
  try {
    const [met, skus, cedis, pares, grafo] = await Promise.all([
      getJSON("/api/eda/metricas"),
      getJSON("/api/eda/top-skus"),
      getJSON("/api/eda/sustituciones-por-cedis?limit=20"),
      getJSON("/api/eda/pares-sustitucion?limit=10"),
      getJSON("/api/eda/grafo?top_nodes=40"),
    ]);
    renderCards(met.metricas);
    renderStatus(met.status_pedidos);
    renderPais(met.por_pais);
    renderTopSkus(skus.top_pedidos);
    renderSkuTasa(skus.top_por_tasa);
    renderCedis(cedis.cedis);
    renderPares(pares.pares);
    renderGraph(grafo);
  } catch (e) {
    document.querySelector(".wrap").insertAdjacentHTML("beforeend",
      `<div class="note">Error cargando datos: ${e.message}</div>`);
  }
}

function renderCards(m) {
  const cards = [
    ["Pedidos", fmt(m.total_pedidos)],
    ["Líneas de detalle", fmt(m.total_lineas)],
    ["Sustituciones", fmt(m.total_sustituciones)],
    ["Tasa de sustitución", m.tasa_sustitucion_lineas + "%"],
    ["Pedidos afectados", m.pct_pedidos_con_sustitucion + "%"],
    ["CEDIS", fmt(m.cedis_unicos)],
    ["SKUs únicos", fmt(m.skus_unicos)],
  ];
  document.getElementById("metric-cards").innerHTML = cards
    .map(([l, v]) => `<div class="card metric"><div class="label">${l}</div><div class="value">${v}</div></div>`)
    .join("");
}

function renderStatus(data) {
  new Chart("chart-status", {
    type: "doughnut",
    data: {
      labels: data.map((d) => `${d.status} (${d.pct}%)`),
      datasets: [{ data: data.map((d) => d.n),
        backgroundColor: [COLORS.verde, COLORS.azul, COLORS.amarillo, COLORS.rojo] }],
    },
    options: { plugins: { legend: { display: true, position: "right" } }, maintainAspectRatio: false },
  });
}

function renderPais(porPais) {
  const labels = Object.keys(porPais);
  new Chart("chart-pais", {
    type: "bar",
    data: { labels, datasets: [{ data: labels.map((p) => porPais[p].n_pedidos), backgroundColor: COLORS.rojo }] },
    options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true } } },
  });
}

function renderTopSkus(data) {
  new Chart("chart-topskus", {
    type: "bar",
    data: { labels: data.map((d) => truncate(d.sku)), datasets: [{ data: data.map((d) => d.n_lineas), backgroundColor: COLORS.azul }] },
    options: { indexAxis: "y", maintainAspectRatio: false },
  });
}

function renderSkuTasa(data) {
  const top = data.slice(0, 10);
  new Chart("chart-skutasa", {
    type: "bar",
    data: { labels: top.map((d) => truncate(d.sku)), datasets: [{ data: top.map((d) => +(d.tasa * 100).toFixed(2)), backgroundColor: COLORS.amarillo }] },
    options: { indexAxis: "y", maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: (c) => c.raw + "% de sustitución" } } },
      scales: { x: { ticks: { callback: (v) => v + "%" } } } },
  });
}

function renderCedis(data) {
  const colorOf = (n) => ({ Rojo: COLORS.rojo, Amarillo: COLORS.amarillo, Verde: COLORS.verde }[n]);
  new Chart("chart-cedis", {
    type: "bar",
    data: { labels: data.map((d) => d.cedis),
      datasets: [{ data: data.map((d) => +(d.tasa_afectacion * 100).toFixed(1)), backgroundColor: data.map((d) => colorOf(d.nivel)) }] },
    options: { maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: (c) => `${c.raw}% afectación (${data[c.dataIndex].n_pedidos} pedidos)` } } },
      scales: { y: { ticks: { callback: (v) => v + "%" } } } },
  });
}

function renderPares(data) {
  new Chart("chart-pares", {
    type: "bar",
    data: { labels: data.map((d) => truncate(d.origen, 16) + " → " + truncate(d.destino, 30)),
      datasets: [{ data: data.map((d) => d.frecuencia), backgroundColor: COLORS.rojo }] },
    options: { indexAxis: "y", maintainAspectRatio: false },
  });
}

function renderGraph(g) {
  const svg = d3.select("#graph");
  const W = svg.node().clientWidth || 900, H = 460;
  svg.attr("viewBox", `0 0 ${W} ${H}`);
  svg.selectAll("*").remove();
  if (!g.nodes.length) { svg.append("text").attr("x", 20).attr("y", 30).text("Sin datos de grafo."); return; }

  const maxW = d3.max(g.links, (l) => l.weight) || 1;
  const sim = d3.forceSimulation(g.nodes)
    .force("link", d3.forceLink(g.links).id((d) => d.id).distance(90))
    .force("charge", d3.forceManyBody().strength(-220))
    .force("center", d3.forceCenter(W / 2, H / 2))
    .force("collide", d3.forceCollide(22));

  const link = svg.append("g").attr("stroke", "#cbd5e1").selectAll("line").data(g.links).join("line")
    .attr("stroke-width", (d) => 1 + (d.weight / maxW) * 6).attr("stroke-opacity", 0.6);

  const node = svg.append("g").selectAll("g").data(g.nodes).join("g").call(drag(sim));
  node.append("circle")
    .attr("r", (d) => 5 + Math.sqrt(d.peso) * 1.4)
    .attr("fill", "#e3001b").attr("fill-opacity", 0.85).attr("stroke", "#fff").attr("stroke-width", 1.5);
  node.append("title").text((d) => `${d.id} (peso ${d.peso})`);
  node.append("text").text((d) => truncate(d.id, 18)).attr("x", 10).attr("y", 4).attr("font-size", 10).attr("fill", "#374151");

  sim.on("tick", () => {
    link.attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
    node.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });

  function drag(sim) {
    return d3.drag()
      .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; });
  }
}
