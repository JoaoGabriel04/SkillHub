import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import apiRouter from "./api/routes/index.js";

const app = express();
const PORT = process.env.PORT ?? 7000;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api", apiRouter);

const server = app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
// Keep-alive maior que a ociosidade de qualquer cliente: com o padrão do Node (5s, fechando aos 6s), um cliente que
// fica travado mais que isso (o e2e, em chamadas síncronas) reaproveita um socket que o servidor já fechou e recebe
// "other side closed". O headersTimeout precisa ser maior que o keepAliveTimeout.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
