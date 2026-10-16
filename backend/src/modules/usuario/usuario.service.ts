import { AppError } from "../../utils/AppError.js";
import avaliacaoService from "../avaliacao/avaliacao.service.js";
import usuarioRepository from "./usuario.repository.js";

const usuarioService = {
  // o resumo público do Perfil: colaborações (pedidos concluídos) e a média e o total das avaliações recebidas
  resumo: async (id: string) => {
    if (!(await usuarioRepository.existe(id))) throw new AppError("Usuário não encontrado", 404);
    const [colaboracoes, avaliacoes] = await Promise.all([usuarioRepository.colaboracoes(id), avaliacaoService.mediaETotal(id)]);
    return { colaboracoes, ...avaliacoes };
  },
};

export default usuarioService;
