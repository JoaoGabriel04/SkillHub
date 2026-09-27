// Espelha o model User do backend (backend/prisma/schema.prisma), sem o password
// (no lugar dele, hasPassword — ver backend/src/utils/safeUser.ts).
export type Perfil = "Cliente" | "Colaborador" | "Empresa";

export type User = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  cpf: string | null;
  cnpj: string | null;
  dataNascimento: string | null; // ISO — Date vira string no JSON
  genero: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  perfil: Perfil | null; // null = conta OAuth que ainda não escolheu perfil
  urlPhoto: string | null;
  competencias: string[];
  curriculo: string | null;
  credits: number;
  googleId: string | null;
  discordId: string | null;
  profileComplete: boolean;
  hasPassword: boolean; // false = conta só com Google/Discord
  createdAt: string;
};
