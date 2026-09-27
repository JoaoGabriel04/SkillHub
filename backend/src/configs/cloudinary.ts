import { v2 as cloudinary, type UploadApiErrorResponse, type UploadApiResponse } from "cloudinary";
import { AppError } from "../utils/AppError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// o SDK devolve só "unexpected status code" em alguns erros — traduz os mais comuns
const cloudinaryHints: Record<number, string> = {
  401: "credenciais inválidas (confira CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)",
  403: "a API key não tem permissão para esta ação (confira o papel da key em Settings → API Keys)",
  404: "cloud name não encontrado (confira CLOUDINARY_CLOUD_NAME)",
  420: "limite de requisições da conta atingido",
};

function logCloudinaryError(err: UploadApiErrorResponse, folder: string) {
  const hint = cloudinaryHints[err.http_code];
  console.error(
    `[cloudinary] upload em "${folder}" falhou — HTTP ${err.http_code}: ${err.message}` +
      (hint ? `\n[cloudinary] provável causa: ${hint}` : "")
  );
}

export function uploadBuffer(
  buffer: Buffer,
  options: { folder: string; publicId: string; resourceType: "image" | "raw" }
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        // asset_folder: pasta exibida na Media Library (contas com "dynamic folders");
        // o prefixo no public_id mantém o mesmo caminho na URL
        asset_folder: options.folder,
        public_id: `${options.folder}/${options.publicId}`,
        resource_type: options.resourceType,
        // public_id fixo por usuário: o upload novo substitui o antigo (não acumula arquivos),
        // e invalidate limpa as cópias antigas do cache da CDN
        overwrite: true,
        invalidate: true,
      },
      (err, result) => {
        if (err || !result) {
          if (err) logCloudinaryError(err, options.folder);
          return reject(new AppError("Falha ao enviar arquivo para o armazenamento", 502));
        }
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// Remove um arquivo e suas cópias no cache da CDN. "not found" conta como sucesso.
// Não lança: quem chama já concluiu a operação principal; a falha fica no log para limpeza manual.
export async function destroyAsset(publicId: string, resourceType: "image" | "raw") {
  try {
    const { result } = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
    if (result !== "ok" && result !== "not found") console.error(`[cloudinary] destroy "${publicId}" retornou "${result}"`);
  } catch (err) {
    const e = err as UploadApiErrorResponse;
    console.error(`[cloudinary] destroy "${publicId}" falhou — HTTP ${e.http_code}: ${e.message}`);
  }
}

export default cloudinary;
