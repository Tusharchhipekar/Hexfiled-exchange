import express from "express";
import morgan from "morgan";
import cors from "cors";
import { config } from "./configs/config";
import { authRoutes } from "./routes/auth.route";
import { exchangeRouter } from "./routes/exchange.route";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

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
