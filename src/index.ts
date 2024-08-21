import { Hono } from "hono";
import { userRouter } from "./routes/userRoutes";
import { cors } from "hono/cors";
import { productRouter } from "./routes/productRoutes";
import { adminRouter } from "./routes/adminRouter";

const app = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
    SALT: number
  };
}>();

app.use(cors());
app.route("/api/v1/user", userRouter);
app.route("/api/v1/products", productRouter);
app.route("/api/v1/admin", adminRouter);


export default app;
