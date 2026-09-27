import bcrypt from "bcryptjs";
import { AppError } from "../../utils/AppError.js";
import { toSafeUser } from "../../utils/safeUser.js";
import userRepository from "./user.repository.js";
import type { UpdateProfileInput } from "./user.schema.js";
import { completeProfileSchema, type CompleteProfileInput } from "../auth/auth.schema.js";
import { destroyAsset, uploadBuffer } from "../../configs/cloudinary.js";

// Token válido de uma conta que não existe mais (ex.: excluída em outra aba): 401, como em
// /auth/me e /auth/refresh — o front tenta o refresh, ele falha e a sessão é encerrada.
export const userNotFound = () => new AppError("Usuário não encontrado", 401);

async function requireUser(userId: string) {
  const user = await userRepository.findById(userId);
  if (!user) throw userNotFound();
  return user;
}

// Salva a URL do arquivo recém-enviado; se a conta sumiu durante o upload, apaga o arquivo
// para não deixar órfão no Cloudinary (o erro do Prisma vira 401 no controller).
async function saveUploadedFile(
  userId: string,
  data: { urlPhoto: string } | { curriculo: string },
  publicId: string,
  resourceType: "image" | "raw"
) {
  try {
    return await userRepository.update(userId, data);
  } catch (err) {
    await destroyAsset(publicId, resourceType);
    throw err;
  }
}

const userService = {
  getMe: async (userId: string) => {
    const userSafe = toSafeUser(await requireUser(userId));
    return userSafe;
  },

  updateProfile: async (userId: string, data: UpdateProfileInput) => {
    const updated = await userRepository.update(userId, data);
    const userSafe = toSafeUser(updated);
    return userSafe;
  },

  completeProfile: async (userId: string, data: CompleteProfileInput) => {
    completeProfileSchema.parse(data);

    if (data.perfil === "Empresa") {
      const existingCnpj = await userRepository.findByCnpj(data.cnpj);
      if (existingCnpj && existingCnpj.id !== userId) throw new AppError("CNPJ já cadastrado", 409);
    } else {
      const existingCpf = await userRepository.findByCpf(data.cpf);
      if (existingCpf && existingCpf.id !== userId) throw new AppError("CPF já cadastrado", 409);
    }

    const updated = await userRepository.update(userId, { ...data, profileComplete: true });
    const userSafe = toSafeUser(updated);
    return userSafe;
  },

  uploadAvatar: async (userId: string, file: Express.Multer.File) => {
    await requireUser(userId); // antes do upload: conta inexistente não gera arquivo órfão
    const result = await uploadBuffer(file.buffer, {
      folder: "Skillhub/avatars",
      publicId: userId,
      resourceType: "image",
    });
    const updated = await saveUploadedFile(userId, { urlPhoto: result.secure_url }, result.public_id, "image");
    const userSafe = toSafeUser(updated);
    return userSafe;
  },

  uploadCurriculo: async (userId: string, file: Express.Multer.File) => {
    // Sem extensão de propósito: contas Cloudinary bloqueiam a entrega de ".pdf" por padrão
    // (401 "deny or ACL failure"). O front baixa o arquivo e o trata como application/pdf.
    await requireUser(userId);
    const result = await uploadBuffer(file.buffer, {
      folder: "Skillhub/curriculos",
      publicId: userId,
      resourceType: "raw",
    });
    const updated = await saveUploadedFile(userId, { curriculo: result.secure_url }, result.public_id, "raw");
    const userSafe = toSafeUser(updated);
    return userSafe;
  },

  deleteAccount: async (userId: string, password?: string) => {
    const user = await requireUser(userId);
    // 403 (e não 401) para o front não tratar como sessão expirada e tentar o refresh
    if (user.password) {
      if (!password) throw new AppError("Informe sua senha para excluir a conta", 400);
      if (!(await bcrypt.compare(password, user.password))) throw new AppError("Senha incorreta", 403);
    }

    // banco primeiro: se falhar, nada foi apagado. Os arquivos usam public_id fixo por usuário
    // (ver uploadAvatar/uploadCurriculo), então dá para removê-los mesmo sem a URL salva.
    await userRepository.delete(userId);
    await Promise.all([
      destroyAsset(`Skillhub/avatars/${userId}`, "image"),
      destroyAsset(`Skillhub/curriculos/${userId}`, "raw"),
    ]);
  },
};

export default userService;
