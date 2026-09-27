import type { NextFunction, Request, Response } from "express";
import multer from "multer";

const MAX_FILE_SIZE_MB = 5;

type FileKind = {
  label: string;
  mimeTypes: string[];
  // assinatura dos primeiros bytes — o mimetype vem do cliente e pode ser falsificado
  matchesSignature: (buf: Buffer) => boolean;
};

const startsWith = (buf: Buffer, bytes: number[], offset = 0) =>
  bytes.every((byte, i) => buf[offset + i] === byte);

const imageKind: FileKind = {
  label: "JPEG, PNG ou WEBP",
  mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  matchesSignature: (buf) =>
    startsWith(buf, [0xff, 0xd8, 0xff]) || // JPEG
    startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) || // PNG
    (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)), // RIFF....WEBP
};

const pdfKind: FileKind = {
  label: "PDF",
  mimeTypes: ["application/pdf"],
  matchesSignature: (buf) => startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d]), // %PDF-
};

function singleFile(field: string, kind: FileKind) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (kind.mimeTypes.includes(file.mimetype)) return cb(null, true);
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "INVALID_TYPE"));
    },
  }).single(field);

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.field === "INVALID_TYPE")
          return res.status(400).json({ error: `Tipo de arquivo inválido. Envie ${kind.label}` });
        if (err.code === "LIMIT_FILE_SIZE")
          return res.status(400).json({ error: `Arquivo excede o limite de ${MAX_FILE_SIZE_MB}MB` });
        if (err.code === "LIMIT_UNEXPECTED_FILE")
          return res.status(400).json({ error: `Envie o arquivo no campo "${field}"` });
        return res.status(400).json({ error: "Erro no upload do arquivo" });
      }
      if (err) return next(err);

      if (req.file && !kind.matchesSignature(req.file.buffer))
        return res.status(400).json({ error: `Conteúdo do arquivo não corresponde a ${kind.label}` });
      next();
    });
  };
}

export const avatarUpload = singleFile("avatar", imageKind);
export const curriculoUpload = singleFile("curriculo", pdfKind);
