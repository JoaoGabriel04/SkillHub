// Consulta de CEP na BrasilAPI (https://brasilapi.com.br/docs#tag/CEP) — chamada direto
// do navegador (a API libera CORS). Não passa pelo `api` porque é outro domínio e sem cookies.

// rua/bairro podem vir vazios: cidades pequenas têm um CEP único, sem logradouro
export type CepInfo = { rua: string; bairro: string; cidade: string; estado: string };

export class CepNotFoundError extends Error {}

export async function fetchCep(cep: string, signal?: AbortSignal): Promise<CepInfo> {
  const digits = cep.replace(/\D/g, "");
  const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`, { signal });
  if (res.status === 404 || res.status === 400) throw new CepNotFoundError("CEP não encontrado");
  if (!res.ok) throw new Error(`BrasilAPI respondeu ${res.status}`);
  const data: { street?: string; neighborhood?: string; city: string; state: string } = await res.json();
  return { rua: data.street ?? "", bairro: data.neighborhood ?? "", cidade: data.city, estado: data.state };
}
