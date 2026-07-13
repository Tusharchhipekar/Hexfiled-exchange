import express from "express";
import morgan from "morgan";
import http from "http";
import { Config } from "./config/config";
import { attachWsServer } from "./handler/wsServer";
import "./handler/publishListener";
import { readEngineEmits } from "./handler/engineConsumer";

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

const server = http.createServer(app);
attachWsServer(server);

server.listen(Config.WSS_PORT, () => {
  console.log(`WS-backend running on port ${Config.WSS_PORT}`);
});

readEngineEmits().catch(() => process.exit(1));
