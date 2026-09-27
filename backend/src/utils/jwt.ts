import jwt from "jsonwebtoken";

export function generateAccessToken(payload: { sub: string }) {
  return jwt.sign(payload, process.env.JWT_ACCESS_TOKEN!, { expiresIn: "15m" });
}
export function generateRefreshToken(payload: { sub: string; remember: boolean }) {
  return jwt.sign(payload, process.env.JWT_REFRESH_TOKEN!, { expiresIn: "7d" });
}
export function verifyAccessToken(token: string) {
  return jwt.verify(token, process.env.JWT_ACCESS_TOKEN!) as { sub: string };
}
export function verifyRefreshToken(token: string) {
  // tokens antigos (sem remember) contam como "lembrar"; iat (em segundos) é comparado com passwordChangedAt
  const { sub, remember = true, iat } = jwt.verify(token, process.env.JWT_REFRESH_TOKEN!) as {
    sub: string;
    remember?: boolean;
    iat: number;
  };
  return { sub, remember, iat };
}
