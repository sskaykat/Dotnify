import { handle } from "hono/vercel";
import app from "../server/index.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

export default handle(app);
