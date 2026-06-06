"""
Order Rescue — API FastAPI.

Al arrancar carga los 3 CSV en memoria y precalcula scoring, grafo y métricas EDA.
Todo queda en `app.state.data` para consultas O(1). Sirve también el frontend estático.

Ejecutar:  uvicorn backend.main:app --reload   (desde la raíz del repo)
"""
from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager

# Permite ejecutar tanto `uvicorn backend.main:app` (desde la raíz) como `uvicorn main:app`
# (desde backend/): aseguramos que el directorio backend/ esté en sys.path.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from data_loader import load_all
from scoring import build_scoring, clasificar
from graph import build_graph, get_sustitutos_frecuentes, graph_payload
from eda import build_eda
from chatbot import chat

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("⏳ Cargando datos y precalculando modelo...")
    ds = load_all(DATA_DIR)
    sc = build_scoring(ds)
    G = build_graph(ds)
    eda = build_eda(ds, sc)
    app.state.data = {"ds": ds, "scoring": sc, "graph": G, "eda": eda}
    m = eda["metricas_globales"]
    print(f"✅ Listo: {m['total_pedidos']:,} pedidos · {m['total_lineas']:,} líneas · "
          f"{m['total_sustituciones']:,} sustituciones · {m['cedis_unicos']} CEDIS")
    yield
    app.state.data = None


app = FastAPI(title="Order Rescue API", version="1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


# ----------------------------- modelos -----------------------------
class LineaSim(BaseModel):
    nombre_sku: str
    quantity: int = 1


class SimularRequest(BaseModel):
    cedis: str
    lineas: list[LineaSim]


class ChatRequest(BaseModel):
    message: str
    history: list = []


class ChatResponse(BaseModel):
    response: str
    history: list
    provider: str | None = None


# ----------------------------- helpers -----------------------------
def _state():
    data = getattr(app.state, "data", None)
    if not data:
        raise HTTPException(503, "El servidor aún está cargando datos.")
    return data


def _score_lineas(cedis: str, lineas: list[tuple[str, int]], data: dict) -> dict:
    """Puntúa una lista de (sku, quantity) en un CEDIS. Reutilizado por /simular y /pedido."""
    sc, G = data["scoring"], data["graph"]
    out_lineas, scores = [], []
    for sku, qty in lineas:
        d = sc.score_linea(cedis, sku)
        scores.append(d["score_riesgo"])
        sust = []
        if d["nivel_riesgo"] in ("Rojo", "Amarillo"):
            sust = get_sustitutos_frecuentes(G, sku, 3)
        out_lineas.append({
            "nombre_sku": sku,
            "quantity": qty,
            "score_linea": d["score_riesgo"],
            "nivel": d["nivel_riesgo"],
            "historico": d["historico"],
            "sustitutos_probables": sust,
        })
    score_pedido = round(max(scores), 4) if scores else 0.0
    return {
        "cedis": cedis,
        "tasa_cedis": round(sc.s3_map.get(cedis, 0.0), 4),
        "score_pedido": score_pedido,
        "nivel_pedido": clasificar(score_pedido),
        "lineas": out_lineas,
    }


# ----------------------------- endpoints -----------------------------
@app.get("/api/health")
def health():
    ok = getattr(app.state, "data", None) is not None
    return {"status": "ok" if ok else "loading"}


@app.get("/api/eda/metricas")
def eda_metricas():
    eda = _state()["eda"]
    return {"metricas": eda["metricas_globales"], "status_pedidos": eda["status_pedidos"],
            "por_pais": eda["por_pais"], "recencia": eda["recencia"]}


@app.get("/api/eda/top-skus")
def eda_top_skus():
    eda = _state()["eda"]
    return {"top_pedidos": eda["top_skus"], "top_por_tasa": eda["top_skus_por_tasa"]}


@app.get("/api/eda/sustituciones-por-cedis")
def eda_cedis(limit: int = 20):
    return {"cedis": _state()["eda"]["top_cedis"][:limit]}


@app.get("/api/eda/pares-sustitucion")
def eda_pares(limit: int = 10):
    return {"pares": _state()["eda"]["top_pares"][:limit]}


@app.get("/api/eda/grafo")
def eda_grafo(top_nodes: int = 40):
    return graph_payload(_state()["graph"], top_nodes)


@app.get("/api/catalogos")
def catalogos():
    return _state()["eda"]["catalogos"]


@app.get("/api/semaforo/cedis")
def semaforo_cedis(pais: str | None = None, business_unit: str | None = None):
    data = _state()
    sc, ds, eda = data["scoring"], data["ds"], data["eda"]
    o = ds.o
    # Conteo de pedidos por cedis con filtros opcionales
    mask = o["cedis"].notna()
    if pais:
        mask &= (o["pais"] == pais)
    if business_unit:
        mask &= (o["business_unit"] == business_unit)
    n_ped = o[mask].groupby("cedis", observed=True)["id_pedido"].count().to_dict()

    sem = sc.cedis_semaforo.set_index("cedis")
    filas = []
    for cedis, info in [(c["cedis"], c) for c in eda["top_cedis"]]:
        n = int(n_ped.get(cedis, 0))
        if (pais or business_unit) and n == 0:
            continue
        rojo = int(sem.loc[cedis, "Rojo"]) if cedis in sem.index else 0
        amar = int(sem.loc[cedis, "Amarillo"]) if cedis in sem.index else 0
        filas.append({
            "cedis": cedis,
            "n_pedidos": n,
            "lineas_rojo": rojo,
            "lineas_amarillo": amar,
            "tasa_afectacion": info["tasa_afectacion"],
            "nivel": info["nivel"],
        })
    return {"cedis": filas}


@app.get("/api/semaforo/cedis/{cedis_id}")
def semaforo_cedis_detalle(cedis_id: str):
    data = _state()
    sc = data["scoring"]
    df = sc.scoring_df[sc.scoring_df["cedis"] == cedis_id]
    if df.empty:
        raise HTTPException(404, f"CEDIS {cedis_id} no encontrado.")
    skus = (df.sort_values("score_riesgo", ascending=False)
              .head(30)[["nombre_sku_solicitado", "n_total", "n_sust",
                         "score_riesgo", "nivel_riesgo"]])
    return {
        "cedis": cedis_id,
        "tasa_afectacion": round(sc.s3_map.get(cedis_id, 0.0), 4),
        "skus": [
            {"sku": str(r.nombre_sku_solicitado), "n_total": int(r.n_total),
             "n_sust": int(r.n_sust), "score": float(r.score_riesgo), "nivel": r.nivel_riesgo}
            for r in skus.itertuples(index=False)
        ],
    }


@app.get("/api/pedido/{id_pedido}")
def pedido(id_pedido: float):
    data = _state()
    ds, sc, G = data["ds"], data["scoring"], data["graph"]
    od, o = ds.od, ds.o
    lineas_df = od[od["id_pedido"] == id_pedido]
    if lineas_df.empty:
        raise HTTPException(404, f"Pedido {id_pedido} no encontrado.")
    ordenes = o[o["id_pedido"] == id_pedido]
    n_ordenes = int(len(ordenes))
    head = ordenes.iloc[0] if n_ordenes else None
    cedis = str(lineas_df["cedis"].iloc[0]) if len(lineas_df) else ""

    lineas_in = [(str(r.nombre_sku_solicitado), int(r.Quantity))
                 for r in lineas_df.itertuples(index=False)]
    scored = _score_lineas(cedis, lineas_in, data)

    cabecera = {
        "id_pedido": id_pedido,
        "customer_id": (str(head["customer_id"]) if head is not None else None),
        "cedis": cedis,
        "pais": (str(head["pais"]) if head is not None else None),
        "business_unit": (str(head["business_unit"]) if head is not None else None),
        "status_final": (str(head["status_final"]) if head is not None else None),
        "total": (float(head["Total"]) if head is not None else None),
        "n_lineas": int(len(lineas_df)),
        "ordenes_en_bucket": n_ordenes,
        "nota_ambiguedad": (
            "id_pedido está colisionado por export en notación científica; este bucket "
            f"agrupa {n_ordenes} órdenes. CEDIS asignado por valor modal." if n_ordenes > 1 else None
        ),
    }
    return {"cabecera": cabecera, **scored}


@app.post("/api/simular")
def simular(req: SimularRequest):
    data = _state()
    lineas_in = [(l.nombre_sku.strip(), l.quantity) for l in req.lineas]
    return _score_lineas(req.cedis, lineas_in, data)


@app.get("/api/grafo/sustitutos/{nombre_sku:path}")
def grafo_sustitutos(nombre_sku: str):
    data = _state()
    sust = get_sustitutos_frecuentes(data["graph"], nombre_sku.strip(), 3)
    return {"nombre_sku": nombre_sku.strip(), "sustitutos_probables": sust}


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    data = _state()
    respuesta, historial, proveedor = await chat(req.message, req.history, data)
    return ChatResponse(response=respuesta, history=historial, provider=proveedor)


# Frontend estático (debe ir al final para no tapar las rutas /api)
if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
