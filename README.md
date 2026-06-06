# 🥤 Order Rescue — Arca Continental

Sistema que **calcula el riesgo de sustitución de cada línea de pedido antes de que salga
del CEDIS**, para poder notificar proactivamente al cliente. Incluye un dashboard analítico,
un simulador de pedidos y un asistente conversacional con IA.

> Reto 2 (hackathon Arca Continental / Coca-Cola). Stack: **FastAPI + pandas + networkx**
> en el backend; **HTML + Chart.js + D3** en el frontend. Sin base de datos: los 3 CSV son
> la fuente de verdad y se cargan en memoria al arrancar.

---

## 🚀 Cómo correr

Requiere Python 3.11+ y los 3 CSV en `data/` (`OrderDetails.csv`, `Orders.csv`,
`Resultados.csv`).

```powershell
# 1. Crear entorno e instalar dependencias
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# 2. (opcional) Activar el chatbot: copia .env.example a .env y pega tus API keys
copy .env.example .env
#   GROQ_API_KEY=gsk_...     (https://console.groq.com — gratis, sin tarjeta)
#   GEMINI_API_KEY=AIzaSy... (https://aistudio.google.com — fallback)

# 3. Arrancar el servidor
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --port 8000
```

Abre **http://localhost:8000** en el navegador.

> El primer arranque tarda ~5 s (procesa 1M de líneas y cachea el resultado en
> `data/.cache/`). Los siguientes arrancan en <1 s. El cache se invalida solo si cambian
> los CSV.

---

## 🖥️ Pantallas

| Ruta | Descripción |
|---|---|
| `/` (index.html) | Dashboard EDA: métricas, status, países, top SKUs, tasa por CEDIS, top pares y **grafo de sustituciones D3**. |
| `/semaforo.html` | Vista operador: tabla de CEDIS con semáforo, filtros por país/unidad y detalle de SKUs por CEDIS. |
| `/pedido.html` | Detalle de un pedido existente **+ simulador** de pedido nuevo (score en vivo + sustitutos). |
| `/chat.html` | Asistente IA conversacional sobre los datos (Groq → Gemini con fallback). |

---

## ⚠️ Calidad de datos — lo más importante de leer

Los CSV vienen exportados con las columnas de ID en **notación científica de 6 cifras**
(`id_pedido = 9.22188E+18`). Esto tiene una consecuencia medida y verificada:

- 68,683 órdenes colapsan en solo **32,485 valores únicos de `id_pedido`**.
- **20,412 de 32,485 buckets (63 %) mapean a CEDIS en conflicto** (y 38 % a país distinto).

Por eso **NO** se hace el join directo `OrderDetails`↔`Orders` por `id_pedido` (sería un
many-to-many que infla filas y atribuye CEDIS de forma ambigua). En su lugar:

| Cálculo | Estrategia | Confiabilidad |
|---|---|---|
| S2 (tasa global por SKU) y **grafo de sustituciones** | join por `nombre_sku` / `id_linea` | **Exacto** (no usan `id_pedido`) |
| S1, S3 (CEDIS) y detalle de pedido | mapa `id_pedido → CEDIS modal` (el más frecuente del bucket) + asignación con `.map()` (nunca duplica filas) | **Best-effort, documentado** |

Llaves de join correctas (nunca usar `sku_solicitado`, son sistemas de ID distintos):
- **`id_linea`** → única y confiable (`OrderDetails` ↔ `Resultados`).
- **`nombre_sku_solicitado`** (con `.strip()`, trae padding) → llave entre SKUs.

Consecuencia para la demo: las tasas de afectación por CEDIS son más bajas/conservadoras que
las cifras "answer-key" del brief (que se calcularon con el join inflado). El ranking y la
narrativa se mantienen; los números son los honestos dados los datos disponibles.

Otros artefactos manejados: `fecha_pedido`/`fecha_entrega` corruptas (no se parsean; se usa
`id_pedido` como proxy ordinal de recencia), 28,855 nombres de SKU nulos → `SKU_DESCONOCIDO`.

---

## 🧮 Modelo de scoring

Tres señales combinadas, con **smoothing bayesiano** (α=0.5, β=9.5 → prior 5 %):

- **S1** — tasa histórica por `(cedis, sku)`.
- **S2** — tasa histórica global por `sku`.
- **S3** — tasa de afectación del CEDIS (% de pedidos con ≥1 sustitución).

```
score_linea  = 0.5·S1 + 0.2·S2 + 0.3·S3
score_pedido = máx(score de sus líneas)     # 1 sustitución ya genera fricción
semáforo:  Rojo ≥ 0.14 · Amarillo ≥ 0.08 · Verde < 0.08
```

Toda la tabla `(cedis, sku) → score` se precalcula al arrancar (lookup O(1)); el simulador
puntúa en tiempo real contra ella, con fallback a priors para combos sin historial.

---

## 🔌 Endpoints

```
GET  /api/health
GET  /api/eda/metricas
GET  /api/eda/top-skus
GET  /api/eda/sustituciones-por-cedis?limit=20
GET  /api/eda/pares-sustitucion?limit=10
GET  /api/eda/grafo?top_nodes=40
GET  /api/catalogos
GET  /api/semaforo/cedis?pais=&business_unit=
GET  /api/semaforo/cedis/{cedis_id}
GET  /api/pedido/{id_pedido}
POST /api/simular           body: { "cedis": "...", "lineas": [{"nombre_sku": "...", "quantity": 12}] }
GET  /api/grafo/sustitutos/{nombre_sku}
POST /api/chat              body: { "message": "...", "history": [...] }
```

Documentación interactiva en **http://localhost:8000/docs** (Swagger).

---

## 🤖 Chatbot

RAG liviano: en cada pregunta se inyecta un contexto JSON con las métricas relevantes al
system prompt. **Stateless** en el servidor (el frontend manda el historial). Si no hay API
keys configuradas, `/api/chat` responde 200 con un mensaje amistoso (nunca 500).

---

## 🗂️ Estructura

```
kernel-koalas/
├── data/                 # los 3 CSV (+ .cache/ generado)
├── backend/
│   ├── main.py           # FastAPI: startup + endpoints + estáticos
│   ├── data_loader.py    # carga, limpieza, mapa id_pedido→cedis modal, cache
│   ├── scoring.py        # S1/S2/S3 + score + semáforo
│   ├── graph.py          # grafo networkx de sustituciones
│   ├── eda.py            # métricas y agregados (tipos nativos)
│   └── chatbot.py        # cliente LLM Groq→Gemini + RAG liviano
├── frontend/
│   ├── index.html · charts.js      # dashboard EDA + grafo D3
│   ├── semaforo.html               # vista operador CEDIS
│   ├── pedido.html · pedido.js     # detalle de pedido + simulador
│   ├── chat.html · chat.js         # asistente IA
│   ├── app.js · styles.css         # helpers y estilos compartidos
├── requirements.txt · .env.example · .gitignore
```
