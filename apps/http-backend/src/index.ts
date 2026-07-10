import express from "express";
import morgan from "morgan";
import { config } from "./configs/config";
import { authRoutes } from "./routes/auth.route";
import { exchangeRouter } from "./routes/exchange.route";
const app = express();
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send({
    message: "http-backend live",
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/exchange", exchangeRouter);

app.listen(config.PORT, () => {
  console.log(`Server running on port http://localhost:${config.PORT}`);
});
