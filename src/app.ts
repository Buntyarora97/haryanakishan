import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";
import path from "path";

const app: Express = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ✅ FRONTEND SERVE (ADD THIS)
app.use(express.static(path.join(__dirname, "../../admin/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../admin/dist/index.html"));
});

export default app;