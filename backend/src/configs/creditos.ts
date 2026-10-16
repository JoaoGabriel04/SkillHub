// Taxa da plataforma sobre os pagamentos (Fase 17C; proposta PIBITI, p. 10: decisão futura).
// PLATFORM_FEE_PERCENT de 0 a 100, padrão 0 (fase piloto gratuita). Lida a cada uso, então um teste
// local pode mudá-la sem rebuild. Valor inválido vira 0, com aviso no log (uma vez).
let avisou = false;

export function taxaPercentual(): number {
  const bruto = process.env.PLATFORM_FEE_PERCENT;
  if (bruto === undefined || bruto.trim() === "") return 0;
  const n = Number(bruto);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    if (!avisou) console.warn(`[creditos] PLATFORM_FEE_PERCENT inválido (${bruto}); usando 0.`);
    avisou = true;
    return 0;
  }
  return n;
}

// Arredondada para baixo, a favor de quem recebe: pagamento líquido + taxa = valor reservado
export const calcularTaxa = (valor: number) => Math.floor((valor * taxaPercentual()) / 100);
