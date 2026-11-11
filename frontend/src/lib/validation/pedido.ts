import { z } from "zod";

// As mesmas regras do backend (Fase 18B): quantidade de 1 a 99 e observação de até 300 caracteres.
export const OBSERVACAO_MAX = 300;

export const observacaoSchema = z.string().trim().max(OBSERVACAO_MAX, `A observação pode ter no máximo ${OBSERVACAO_MAX} caracteres`);
export const quantidadeSchema = z.number().int().min(1).max(99);
