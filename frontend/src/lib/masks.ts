// Máscaras de digitação — produzem exatamente o formato que o backend valida.

const digits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

function applyPattern(value: string, pattern: string) {
  let out = "";
  let i = 0;
  for (const char of pattern) {
    if (i >= value.length) break;
    out += char === "#" ? value[i++] : char;
  }
  return out;
}

export const maskCpf = (v: string) => applyPattern(digits(v, 11), "###.###.###-##");
export const maskCnpj = (v: string) => applyPattern(digits(v, 14), "##.###.###/####-##");
export const maskCep = (v: string) => applyPattern(digits(v, 8), "#####-###");

export function maskPhone(v: string) {
  const d = digits(v, 11);
  return applyPattern(d, d.length > 10 ? "(##) #####-####" : "(##) ####-####");
}
