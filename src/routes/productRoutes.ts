import { Hono } from "hono";
import authMiddleware from "../authMiddleware";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

export const productRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
    userType: string;
  };
}>();

productRouter.get("", authMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const category = c.req.query("category");
    const products = await prisma.product.findMany({
      where: {
        category: {
          name: {
            contains: category,
            mode: "insensitive",
          },
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        quantity: true,
        weight: true,
        category: {
          select: {
            name: true,
          },
        },
        images: {
          select: {
            imageUrl: true,
          },
        },
      },
      cacheStrategy: { swr: 60, ttl: 180 },
    });
    return c.json(products);
  } catch (e) {
    c.status(403);
    return c.json({ error: "Error while fetching products!" });
  }
});

productRouter.get("/search/:name", authMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const name = c.req.param("name");
    const products = await prisma.product.findMany({
      where: {
        name: {
          contains: name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        quantity: true,
        weight: true,
        category: {
          select: {
            name: true,
          },
        },
        images: {
          select: {
            imageUrl: true,
          },
        },
      },
      cacheStrategy: { swr: 60, ttl: 180 },
    });
    return c.json(products);
  } catch (e) {
    c.status(403);
    return c.json({ error: "Error while searching products!" });
  }
});


productRouter.get("/all", authMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(
    withAccelerate()
  );

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        description: true,
        stock: true,
        quantity: true,
        weight: true,
        category: {
          select: {
            name: true,
          },
        },
        images: {
          select: {
            imageUrl: true,
          },
        },
      },
      cacheStrategy: { swr: 30, ttl: 60 },
    });
    return c.json(products);
  } catch (e) {
    c.status(403);
    return c.json({ error: "Error while searching products!" });
  }
});
