import { CadastroFlow } from "./cadastro-flow";

// designs/Cadastro.png
// ?completar=1 → conta criada via Google/Discord que ainda precisa escolher perfil e completar os dados
export default async function CadastroPage({ searchParams }: PageProps<"/cadastro">) {
  const { completar } = await searchParams;
  return <CadastroFlow completar={completar === "1"} />;
}
