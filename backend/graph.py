"""
Grafo de sustituciones entre SKUs (networkx).

Cada nodo es un SKU; cada arista origen->destino pesa = nº de veces que se sustituyó
uno por otro. Se construye SOLO desde Resultados (no usa id_pedido -> es exacto).
La llave es `nombre_sku_solicitado` ya limpio (.strip()).
"""
from __future__ import annotations

import networkx as nx
import pandas as pd

from data_loader import Dataset


def build_graph(ds: Dataset) -> nx.DiGraph:
    """Grafo dirigido origen->destino con peso = frecuencia de sustitución."""
    G = nx.DiGraph()
    pares = ds.r.groupby(
        ["nombre_sku_solicitado", "nombre_sku_solicitado_cambio"], observed=True
    ).size().reset_index(name="weight")
    for row in pares.itertuples(index=False):
        origen = str(row.nombre_sku_solicitado)
        destino = str(row.nombre_sku_solicitado_cambio)
        G.add_edge(origen, destino, weight=int(row.weight))
    return G


def get_sustitutos_frecuentes(G: nx.DiGraph, sku: str, top_n: int = 3) -> list[dict]:
    """Top-N sustitutos históricos de un SKU, ordenados por frecuencia."""
    if sku not in G:
        return []
    vecinos = sorted(
        G.out_edges(sku, data=True), key=lambda e: e[2]["weight"], reverse=True
    )
    return [{"nombre": dst, "frecuencia": int(d["weight"])} for _, dst, d in vecinos[:top_n]]


def graph_payload(G: nx.DiGraph, top_nodes: int = 40) -> dict:
    """
    Subgrafo para visualización D3: nodos con más actividad (grado ponderado) y sus aristas.
    """
    deg = {n: 0 for n in G.nodes()}
    for u, v, d in G.edges(data=True):
        deg[u] += d["weight"]
        deg[v] += d["weight"]
    keep = set(sorted(deg, key=lambda n: deg[n], reverse=True)[:top_nodes])

    nodes = [{"id": n, "peso": int(deg[n])} for n in keep]
    links = [
        {"source": u, "target": v, "weight": int(d["weight"])}
        for u, v, d in G.edges(data=True)
        if u in keep and v in keep
    ]
    return {"nodes": nodes, "links": links}
