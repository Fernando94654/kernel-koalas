"""
Carga y limpieza de los 3 CSV de Order Rescue.

Decisiones clave (ver README, sección "Calidad de datos"):
- Los CSV vienen exportados con `id_pedido` en notación científica de 6 cifras
  (ej. 9.22188E+18). 68,683 órdenes colapsan en ~32,485 valores únicos y el 63% de
  esos buckets mapean a CEDIS en conflicto. Por eso NO se hace el merge directo
  OrderDetails<->Orders por id_pedido (sería un many-to-many que infla filas).
  En su lugar se construye un mapa id_pedido -> CEDIS *modal* (el más frecuente del
  bucket) y se asigna por `.map()`, que nunca duplica filas.
- `id_linea` SÍ es único y confiable -> es la llave real OrderDetails<->Resultados.
- `nombre_sku_solicitado` se limpia con .strip() (trae padding de espacios) y es la
  llave de join entre SKUs (NUNCA usar `sku_solicitado`, son ID systems distintos).
"""
from __future__ import annotations

import os
from dataclasses import dataclass

import pandas as pd

SKU_DESCONOCIDO = "SKU_DESCONOCIDO"


@dataclass
class Dataset:
    """Contenedor de los 3 dataframes ya limpios y enriquecidos."""
    od: pd.DataFrame   # OrderDetails + cedis/pais/business_unit
    o: pd.DataFrame    # Orders limpio
    r: pd.DataFrame    # Resultados + cedis
    ped_to_cedis: dict
    ped_to_pais: dict
    ped_to_bu: dict


def _read_csv(path: str, dtype: dict | None = None) -> pd.DataFrame:
    return pd.read_csv(
        path,
        encoding="utf-8-sig",      # los headers traen BOM (﻿ id_linea)
        sep=",",
        on_bad_lines="skip",
        dtype=dtype,
        low_memory=False,
    )


def _clean_sku(series: pd.Series) -> pd.Series:
    """Quita padding de espacios y normaliza nulos a SKU_DESCONOCIDO."""
    s = series.astype("string").str.strip()
    s = s.replace({"": pd.NA})
    return s.fillna(SKU_DESCONOCIDO)


def _modal_map(df: pd.DataFrame, key: str, value: str) -> dict:
    """
    Construye {key -> valor modal} de forma vectorizada. Para buckets de id_pedido
    colisionados toma el valor más frecuente; en empate, el primero (orden estable).
    """
    counts = (
        df.groupby([key, value], observed=True)
        .size()
        .reset_index(name="_n")
        .sort_values([key, "_n"], ascending=[True, False], kind="mergesort")
        .drop_duplicates(subset=[key], keep="first")
    )
    return dict(zip(counts[key], counts[value]))


def _load_uncached(data_dir: str) -> Dataset:
    od_path = os.path.join(data_dir, "OrderDetails.csv")
    o_path = os.path.join(data_dir, "Orders.csv")
    r_path = os.path.join(data_dir, "Resultados.csv")

    # --- Orders ---
    o = _read_csv(o_path, dtype={"cedis": "string", "pais": "string", "business_unit": "string"})
    o["cedis"] = o["cedis"].astype("string").str.strip()
    o["pais"] = o["pais"].astype("string").str.strip()
    o["business_unit"] = o["business_unit"].astype("string").str.strip()
    o["id_pedido"] = pd.to_numeric(o["id_pedido"], errors="coerce")
    o = o.dropna(subset=["id_pedido"])

    # Mapas modales id_pedido -> atributo (evita el many-to-many del merge)
    ped_to_cedis = _modal_map(o, "id_pedido", "cedis")
    ped_to_pais = _modal_map(o, "id_pedido", "pais")
    ped_to_bu = _modal_map(o, "id_pedido", "business_unit")

    # --- OrderDetails ---
    od = _read_csv(od_path)
    od["id_pedido"] = pd.to_numeric(od["id_pedido"], errors="coerce")
    od["id_linea"] = pd.to_numeric(od["id_linea"], errors="coerce").astype("Int64")
    od["Quantity"] = pd.to_numeric(od["Quantity"], errors="coerce").fillna(0).astype(int)
    od["nombre_sku_solicitado"] = _clean_sku(od["nombre_sku_solicitado"])
    od["Status"] = od["Status"].astype("string").str.strip()
    # Enriquecer por mapa (sin inflar filas)
    od["cedis"] = od["id_pedido"].map(ped_to_cedis).astype("string")
    od["pais"] = od["id_pedido"].map(ped_to_pais).astype("string")
    od["business_unit"] = od["id_pedido"].map(ped_to_bu).astype("string")

    # --- Resultados ---
    r = _read_csv(r_path)
    r["id_pedido"] = pd.to_numeric(r["id_pedido"], errors="coerce")
    r["id_linea"] = pd.to_numeric(r["id_linea"], errors="coerce").astype("Int64")
    r["nombre_sku_solicitado"] = _clean_sku(r["nombre_sku_solicitado"])
    r["nombre_sku_solicitado_cambio"] = _clean_sku(r["nombre_sku_solicitado_cambio"])
    r["cedis"] = r["id_pedido"].map(ped_to_cedis).astype("string")

    return Dataset(
        od=od, o=o, r=r,
        ped_to_cedis=ped_to_cedis,
        ped_to_pais=ped_to_pais,
        ped_to_bu=ped_to_bu,
    )


def load_all(data_dir: str, use_cache: bool = True) -> Dataset:
    """
    Carga el Dataset. Usa un cache pickle (data/.cache/dataset.pkl) para arranques
    rápidos: si el cache es más nuevo que los 3 CSV, lo reusa; si no, recarga y reescribe.
    """
    import pickle

    cache_dir = os.path.join(data_dir, ".cache")
    cache_path = os.path.join(cache_dir, "dataset.pkl")
    csv_paths = [os.path.join(data_dir, f) for f in
                 ("OrderDetails.csv", "Orders.csv", "Resultados.csv")]

    if use_cache and os.path.exists(cache_path):
        cache_mtime = os.path.getmtime(cache_path)
        if all(os.path.exists(p) and os.path.getmtime(p) <= cache_mtime for p in csv_paths):
            try:
                with open(cache_path, "rb") as fh:
                    return pickle.load(fh)
            except Exception:
                pass  # cache corrupto -> recargar

    ds = _load_uncached(data_dir)

    if use_cache:
        try:
            os.makedirs(cache_dir, exist_ok=True)
            with open(cache_path, "wb") as fh:
                pickle.dump(ds, fh, protocol=pickle.HIGHEST_PROTOCOL)
        except Exception:
            pass  # si no se puede cachear, no es fatal

    return ds
