import type { User } from "@/types/user";

// ⚠️ DADOS DE EXEMPLO — pessoas que aparecem nos mockups (designs/New *.png).
// Quando os models existirem, o backend devolve o autor já resumido neste formato.
export type AutorResumo = Pick<User, "id" | "fullName" | "urlPhoto">;

// Fotos do Unsplash (licença livre); o domínio está liberado em next.config.ts.
export const unsplash = (id: string, w = 400) => `https://images.unsplash.com/photo-${id}?w=${w}&q=70&fit=crop`;

const pessoa = (id: string, fullName: string, foto: string): AutorResumo => ({ id, fullName, urlPhoto: unsplash(foto, 120) });

export const PESSOAS = {
  carlos: pessoa("u-carlos", "Carlos Magno", "1507003211169-0a1dd7228f2d"),
  lindalva: pessoa("u-lindalva", "Lindalva Filho", "1438761681033-6461ffad8d80"),
  humberto: pessoa("u-humberto", "Humberto da Silva", "1472099645785-5658abf4ff4e"),
  bruna: pessoa("u-bruna", "Bruna de Alencar", "1494790108377-be9c29b29330"),
  francisco: pessoa("u-francisco", "Francisco Gomes", "1500648767791-00dcc994a43e"),
  olivia: pessoa("u-olivia", "Olívia Monteiro", "1534528741775-53994a69daeb"),
  caetano: pessoa("u-caetano", "Caetano Santos", "1539571696357-5a69c17a67c6"),
  jose: pessoa("u-jose", "José Pereira", "1506794778202-cad84cf45f1d"),
  rodrigo: pessoa("u-rodrigo", "Rodrigo Gaspar", "1560250097-0b93528c311a"),
  lucas: pessoa("u-lucas", "Lucas Andrade", "1519085360753-af0119f7cbe7"),
  beatriz: pessoa("u-beatriz", "Beatriz Lima", "1544005313-94ddf0286df2"),
  alana: pessoa("u-alana", "Alana", "1517841905240-472988babdf9"),
  gustavo: pessoa("u-gustavo", "Gustavo", "1531746020798-e6953c6e8e04"),
  marina: pessoa("u-marina", "Marina Costa", "1573496359142-b8d87734a5a2"),
} satisfies Record<string, AutorResumo>;
