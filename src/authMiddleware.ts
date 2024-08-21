import { verify } from "hono/jwt";

export default async function authMiddleware(c: any, next: () => void) {
  const jwt = c.req.header("authorization");
  if (!jwt) {
    c.status(401);
    return c.json({ error: "unauthorized" });
  }
  const token = jwt.split(" ")[1];
  try {
    const user = await verify(token, c.env.JWT_SECRET);
    if (user) {
      c.set("userId", user.id);
      await next();
    }
  } catch (error: any) {
    if (error.name === "JwtTokenInvalid") {
      c.status(403);
      return c.json({
        message: "You are not Authorized",
      });
    }
    console.log("Error", error);
    c.status(400);
    return c.json({
      message: "Internal Server Error " + error,
    });
  }
}
