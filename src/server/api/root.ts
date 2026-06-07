import { z } from "zod";

import { createCallerFactory, createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  getEda, getGraphPayload, getSemaforo, getCedisDetalle,
  getPedido, simular, getSustitutos,
} from "~/server/data";
import { chat, type ChatMsg } from "~/server/chatbot";

const lineaSchema = z.object({ nombre_sku: z.string(), quantity: z.number().int().min(1).default(1) });
const msgSchema = z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string() });

export const appRouter = createTRPCRouter({
  eda: publicProcedure.query(() => getEda()),

  grafo: publicProcedure.query(() => getGraphPayload()),

  sustitutos: publicProcedure
    .input(z.object({ sku: z.string() }))
    .query(async ({ input }) => ({
      nombre_sku: input.sku.trim(),
      sustitutos_probables: await getSustitutos(input.sku, 3),
    })),

  semaforo: publicProcedure
    .input(z.object({ pais: z.string().optional(), businessUnit: z.string().optional() }).optional())
    .query(async ({ input }) => ({ cedis: await getSemaforo(input?.pais, input?.businessUnit) })),

  cedisDetalle: publicProcedure
    .input(z.object({ cedis: z.string() }))
    .query(({ input }) => getCedisDetalle(input.cedis)),

  pedido: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => getPedido(input.id)),

  simular: publicProcedure
    .input(z.object({ cedis: z.string(), lineas: z.array(lineaSchema) }))
    .mutation(({ input }) => simular(input.cedis, input.lineas)),

  chat: publicProcedure
    .input(z.object({ message: z.string(), history: z.array(msgSchema).default([]) }))
    .mutation(async ({ input }) => chat(input.message, input.history as ChatMsg[])),
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
