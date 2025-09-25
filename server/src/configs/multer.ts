import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para garantir que a pasta existe
function ensureDirExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "uploads/geral"; // fallback

    // Verifica o campo do formulário
    if (file.fieldname === "foto") {
      folder = "uploads/fotos";
    } else if (file.fieldname === "curriculo") {
      folder = "uploads/curriculos";
    }

    const fullPath = path.join(__dirname, folder);
    ensureDirExists(fullPath);
    cb(null, fullPath);
  },

  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/\s+/g, "_");
    cb(null, `${timestamp}-${sanitized}`);
  },
});

export const upload = multer({ storage });