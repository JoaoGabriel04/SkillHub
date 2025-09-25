import type { Request, Response } from "express";
import { User } from "./user.model.js";

const userController = {

  userData: async (req: Request, res: Response) => {
    try {
      if(!req.user) {
        return res.status(401).json({message: "Usuário não autenticado."})
      }
      const userId = req.user.id;
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      const plainUser = user.toObject();

      res.status(200).json(plainUser)
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
      res.status(500).json({ message: 'Erro ao buscar usuário' });
    }
  }

}

export default userController