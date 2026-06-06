"""
Modelo de scoring de riesgo de sustitución (3 señales + combinación).

Implementa exactamente el modelo del brief:
  - S1: tasa histórica por (cedis, nombre_sku) con smoothing bayesiano.
  - S2: tasa histórica global por nombre_sku.
  - S3: tasa de afectación del CEDIS (% de pedidos con >=1 sustitución).
  - score = W1*S1 + W2*S2 + W3*S3, redondeado a 4 decimales.
  - score de pedido = MÁX de sus líneas.
  - semáforo: Rojo >=0.14, Amarillo >=0.08, Verde <0.08.
"""
from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from data_loader import Dataset

# --- Hiperparámetros del modelo (justificados en el brief) ---
ALPHA, BETA = 0.5, 9.5          # prior bayesiano: tasa base 5%
PRIOR = ALPHA / (ALPHA + BETA)  # 0.05
W1, W2, W3 = 0.5, 0.2, 0.3      # pesos de las 3 señales
UMBRAL_ROJO = 0.14
UMBRAL_AMARILLO = 0.08


def clasificar(score: float) -> str:
    if score >= UMBRAL_ROJO:
        return "Rojo"
    if score >= UMBRAL_AMARILLO:
        return "Amarillo"
    return "Verde"


@dataclass
class Scoring:
    scoring_df: pd.DataFrame          # (cedis, nombre_sku) -> señales + score + nivel
    lookup: dict                      # (cedis, sku) -> dict de detalle
    s2_map: dict                      # sku -> tasa_s2
    s3_map: dict                      # cedis -> tasa_s3
    pedido_score: dict                # id_pedido -> {"score":.., "nivel":..}
    cedis_semaforo: pd.DataFrame      # por cedis: conteo de líneas rojo/amarillo/verde

    def score_linea(self, cedis: str, sku: str) -> dict:
        """Score de una línea. Usa la tabla precalculada o un fallback con priors."""
        hit = self.lookup.get((cedis, sku))
        if hit is not None:
            return hit
        tasa_s1 = PRIOR
        tasa_s2 = self.s2_map.get(sku, PRIOR)
        tasa_s3 = self.s3_map.get(cedis, 0.0)
        score = round(W1 * tasa_s1 + W2 * tasa_s2 + W3 * tasa_s3, 4)
        return {
            "cedis": cedis,
            "nombre_sku_solicitado": sku,
            "tasa_s1": round(tasa_s1, 4),
            "tasa_s2": round(tasa_s2, 4),
            "tasa_s3": round(tasa_s3, 4),
            "score_riesgo": score,
            "nivel_riesgo": clasificar(score),
            "n_total": 0,
            "n_sust": 0,
            "historico": False,
        }


def build_scoring(ds: Dataset) -> Scoring:
    od, o, r = ds.od, ds.o, ds.r
    KEY = ["cedis", "nombre_sku_solicitado"]

    # --- S1: tasa por (cedis, sku) ---
    total_s1 = od.groupby(KEY, observed=True)["id_linea"].count().reset_index(name="n_total")
    sust_s1 = r.groupby(KEY, observed=True)["id_linea"].count().reset_index(name="n_sust")
    s1 = total_s1.merge(sust_s1, on=KEY, how="left")
    s1["n_sust"] = s1["n_sust"].fillna(0)
    s1["tasa_s1"] = (s1["n_sust"] + ALPHA) / (s1["n_total"] + ALPHA + BETA)

    # --- S2: tasa global por sku ---
    total_s2 = od.groupby("nombre_sku_solicitado", observed=True)["id_linea"].count().reset_index(name="n_total_g")
    sust_s2 = r.groupby("nombre_sku_solicitado", observed=True)["id_linea"].count().reset_index(name="n_sust_g")
    s2 = total_s2.merge(sust_s2, on="nombre_sku_solicitado", how="left")
    s2["n_sust_g"] = s2["n_sust_g"].fillna(0)
    s2["tasa_s2"] = (s2["n_sust_g"] + ALPHA) / (s2["n_total_g"] + ALPHA + BETA)
    s2_map = dict(zip(s2["nombre_sku_solicitado"].astype(str), s2["tasa_s2"]))

    # --- S3: tasa de afectación del CEDIS ---
    sust_ced = r.groupby("cedis", observed=True)["id_pedido"].nunique().reset_index(name="n_peds_con_sust")
    total_ced = o.groupby("cedis", observed=True)["id_pedido"].count().reset_index(name="n_pedidos")
    s3 = total_ced.merge(sust_ced, on="cedis", how="left")
    s3["n_peds_con_sust"] = s3["n_peds_con_sust"].fillna(0)
    s3["tasa_s3"] = (s3["n_peds_con_sust"] / s3["n_pedidos"]).round(4)
    s3_map = dict(zip(s3["cedis"].astype(str), s3["tasa_s3"]))

    # --- Combinar en tabla maestra por (cedis, sku) ---
    scoring = s1.merge(s2[["nombre_sku_solicitado", "tasa_s2"]], on="nombre_sku_solicitado", how="left")
    scoring = scoring.merge(s3[["cedis", "tasa_s3"]], on="cedis", how="left")
    scoring["tasa_s2"] = scoring["tasa_s2"].fillna(PRIOR)
    scoring["tasa_s3"] = scoring["tasa_s3"].fillna(0.0)
    scoring["score_riesgo"] = (
        W1 * scoring["tasa_s1"] + W2 * scoring["tasa_s2"] + W3 * scoring["tasa_s3"]
    ).round(4)
    scoring["tasa_s1"] = scoring["tasa_s1"].round(4)
    scoring["nivel_riesgo"] = scoring["score_riesgo"].apply(clasificar)

    # --- Lookup dict (cedis, sku) -> detalle, para O(1) ---
    lookup = {}
    for row in scoring.itertuples(index=False):
        lookup[(str(row.cedis), str(row.nombre_sku_solicitado))] = {
            "cedis": str(row.cedis),
            "nombre_sku_solicitado": str(row.nombre_sku_solicitado),
            "tasa_s1": float(row.tasa_s1),
            "tasa_s2": float(row.tasa_s2),
            "tasa_s3": float(row.tasa_s3),
            "score_riesgo": float(row.score_riesgo),
            "nivel_riesgo": row.nivel_riesgo,
            "n_total": int(row.n_total),
            "n_sust": int(row.n_sust),
            "historico": True,
        }

    # --- Score por pedido = máx de líneas (merge limpio many-to-one) ---
    od_scored = od.merge(
        scoring[["cedis", "nombre_sku_solicitado", "score_riesgo"]],
        on=KEY, how="left",
    )
    od_scored["score_riesgo"] = od_scored["score_riesgo"].fillna(PRIOR)
    ped = od_scored.groupby("id_pedido", observed=True)["score_riesgo"].max()
    pedido_score = {float(k): {"score": round(float(v), 4), "nivel": clasificar(float(v))}
                    for k, v in ped.items()}

    # --- Semáforo por CEDIS: # de líneas por nivel (ponderadas por n_total) ---
    cedis_semaforo = (
        scoring.groupby(["cedis", "nivel_riesgo"], observed=True)["n_total"]
        .sum()
        .unstack(fill_value=0)
        .reset_index()
    )
    for col in ("Rojo", "Amarillo", "Verde"):
        if col not in cedis_semaforo.columns:
            cedis_semaforo[col] = 0

    return Scoring(
        scoring_df=scoring,
        lookup=lookup,
        s2_map=s2_map,
        s3_map=s3_map,
        pedido_score=pedido_score,
        cedis_semaforo=cedis_semaforo,
    )
