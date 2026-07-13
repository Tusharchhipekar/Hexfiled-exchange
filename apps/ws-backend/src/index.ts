import "./handler/wsServer"; // starts WS server
import "./handler/publishListener"; // starts Redis SUBSCRIBE
import { readEngineEmits } from "./handler/engineConsumer";
import express from "express";
import morgan from "morgan";
import { Config } from "./config/config";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/api/status/healthz", (req, res) => {
  res.status(200).json({ status: "ok", service: "ws-backend" });
});

app.get("/api/status/readyz", (req, res) => {
  res.status(200).json({ status: "ready", service: "ws-backend" });
});

app.listen(Config.WSS_PORT, () => {
  console.log(`WS-backend running on port ${Config.WSS_PORT}`);
});
readEngineEmits().catch(() => process.exit(1));
