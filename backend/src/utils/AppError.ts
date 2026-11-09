export class AppError extends Error {
  statusCode: number;
  // Fase 18B: campos a mais na resposta (code, produtoId...), para a tela saber o que aconteceu. Opcional.
  extra?: Record<string, unknown>;

  constructor(message: string, statusCode = 400, extra?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.extra = extra;
  }
}
