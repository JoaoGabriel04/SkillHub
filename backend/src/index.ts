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

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
