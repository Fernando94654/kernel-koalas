"""
Métricas y agregados para el dashboard (EDA) y el contexto del chatbot.

Todo se devuelve en tipos nativos de Python (int/float/str/list/dict) para que sea
JSON-serializable sin tropezar con numpy/pandas.
"""
from __future__ import annotations

import pandas as pd

from data_loader import Dataset
from scoring import Scoring, clasificar

# Mínimo de líneas pedidas para considerar la tasa global de un SKU "estable"
MIN_LINEAS_SKU = 50


def _native(v):
    """Convierte numpy/pandas escalares a nativo."""
    if hasattr(v, "item"):
        return v.item()
    return v


def build_eda(ds: Dataset, sc: Scoring) -> dict:
    od, o, r = ds.od, ds.o, ds.r

    total_pedidos = int(o["id_pedido"].count())
    total_lineas = int(len(od))
    total_sust = int(len(r))
    # % de pedidos con al menos 1 sustitución (id_pedido es bucket; best-effort)
    peds_con_sust = int(r["id_pedido"].nunique())
    pct_peds_con_sust = round(100 * peds_con_sust / total_pedidos, 2)

    metricas_globales = {
        "total_pedidos": total_pedidos,
        "total_lineas": total_lineas,
        "total_sustituciones": total_sust,
        "tasa_sustitucion_lineas": round(100 * total_sust / total_lineas, 3),
        "pct_pedidos_con_sustitucion": pct_peds_con_sust,
        "skus_unicos": int(od["nombre_sku_solicitado"].nunique()),
        "cedis_unicos": int(o["cedis"].nunique()),
    }

    # --- Distribución de status de pedidos (donut) ---
    status_counts = o["status_final"].value_counts()
    status_dist = [
        {"status": str(k), "n": int(v), "pct": round(100 * v / total_pedidos, 2)}
        for k, v in status_counts.items()
    ]

    # --- Top 10 SKUs más pedidos ---
    top_pedidos = od.groupby("nombre_sku_solicitado", observed=True)["id_linea"].count()
    top_skus = [
        {"sku": str(k), "n_lineas": int(v)}
        for k, v in top_pedidos.sort_values(ascending=False).head(10).items()
    ]

    # --- Top SKUs por tasa de sustitución (S2), filtrando ruido ---
    n_total_g = od.groupby("nombre_sku_solicitado", observed=True)["id_linea"].count()
    n_sust_g = r.groupby("nombre_sku_solicitado", observed=True)["id_linea"].count()
    skus_tasa = []
    for sku, tasa in sc.s2_map.items():
        n = int(n_total_g.get(sku, 0))
        if n >= MIN_LINEAS_SKU:
            skus_tasa.append({
                "sku": str(sku),
                "tasa": round(float(tasa), 4),
                "n_lineas": n,
                "n_sust": int(n_sust_g.get(sku, 0)),
            })
    top_skus_por_tasa = sorted(skus_tasa, key=lambda x: x["tasa"], reverse=True)[:20]

    # --- Ranking de CEDIS por tasa de afectación (S3) ---
    n_ped_cedis = o.groupby("cedis", observed=True)["id_pedido"].count()
    top_cedis = []
    for cedis, tasa in sc.s3_map.items():
        n_ped = int(n_ped_cedis.get(cedis, 0))
        top_cedis.append({
            "cedis": str(cedis),
            "n_pedidos": n_ped,
            "tasa_afectacion": round(float(tasa), 4),
            "nivel": clasificar(float(tasa)),
        })
    top_cedis = sorted(top_cedis, key=lambda x: x["tasa_afectacion"], reverse=True)

    # --- Top 10 pares de sustitución origen -> destino ---
    pares = r.groupby(
        ["nombre_sku_solicitado", "nombre_sku_solicitado_cambio"], observed=True
    ).size().reset_index(name="frecuencia")
    pares = pares.sort_values("frecuencia", ascending=False).head(20)
    top_pares = [
        {"origen": str(row.nombre_sku_solicitado),
         "destino": str(row.nombre_sku_solicitado_cambio),
         "frecuencia": int(row.frecuencia)}
        for row in pares.itertuples(index=False)
    ]

    # --- Por país ---
    r_pais = r["id_pedido"].map(ds.ped_to_pais)
    n_ped_pais = o.groupby("pais", observed=True)["id_pedido"].count()
    n_lin_sust_pais = r_pais.value_counts()
    peds_sust_pais = r.assign(_pais=r_pais).groupby("_pais", observed=True)["id_pedido"].nunique()
    por_pais = {}
    for pais, n_ped in n_ped_pais.items():
        n_ped = int(n_ped)
        n_peds_sust = int(peds_sust_pais.get(pais, 0))
        por_pais[str(pais)] = {
            "n_pedidos": n_ped,
            "n_lineas_sustituidas": int(n_lin_sust_pais.get(pais, 0)),
            "n_pedidos_con_sustitucion": n_peds_sust,
            "tasa": round(n_peds_sust / n_ped, 4) if n_ped else 0.0,
        }

    # --- Proxy de recencia (Mejora 2): cuartiles de id_pedido en sustituciones ---
    recencia = {}
    try:
        quint = pd.qcut(r["id_pedido"], q=4, labels=["Q1", "Q2", "Q3", "Q4"])
        dist = quint.value_counts().sort_index()
        recencia["distribucion"] = {str(k): int(v) for k, v in dist.items()}
        tmp = r.assign(_q=quint)
        por_cedis_q = tmp.groupby(["cedis", "_q"], observed=True).size().unstack(fill_value=0)
        if "Q4" in por_cedis_q.columns:
            pct_rec = (por_cedis_q["Q4"] / por_cedis_q.sum(axis=1)).sort_values(ascending=False)
            recencia["cedis_mas_recientes"] = [
                {"cedis": str(c), "pct_reciente": round(float(p), 3)}
                for c, p in pct_rec.head(10).items()
            ]
    except Exception:
        recencia = {"distribucion": {}, "cedis_mas_recientes": []}

    # --- Catálogos para los dropdowns del simulador ---
    cedis_list = sorted(o["cedis"].dropna().unique().tolist())
    sku_list = sorted(od["nombre_sku_solicitado"].dropna().unique().tolist())
    business_units = sorted(o["business_unit"].dropna().unique().tolist())
    paises = sorted(o["pais"].dropna().unique().tolist())

    return {
        "metricas_globales": metricas_globales,
        "status_pedidos": status_dist,
        "top_skus": top_skus,
        "top_skus_por_tasa": top_skus_por_tasa,
        "top_cedis": top_cedis,
        "top_pares": top_pares,
        "por_pais": por_pais,
        "recencia": recencia,
        "catalogos": {
            "cedis": cedis_list,
            "skus": sku_list,
            "business_units": business_units,
            "paises": paises,
        },
    }
