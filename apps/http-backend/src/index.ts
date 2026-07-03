import express from "express";
import morgan from "morgan";
import { config } from "./configs/config";
const app = express();
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send({
    message: "http-backend live",
  });
});

app.listen(config.PORT, () => {
  console.log(`Server running on port http://localhost:${config.PORT}`);
});
