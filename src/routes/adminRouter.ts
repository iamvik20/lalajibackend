import { Hono } from "hono";
import adminMiddleware from "../adminMiddleware";
import { OrderStatus, PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import {
  createProductInput,
  updateProductInput,
} from "@iamvik20/common-lalaji";
import authMiddleware from "../authMiddleware";

export const adminRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
    userType: string;
  };
}>();

adminRouter.post("/products/add-product", adminMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const { success } = createProductInput.safeParse(body);
  if (!success) {
    c.status(400);
    return c.json({ error: "invalid input" });
  }
  try {
    console.log(body);
    const product = await prisma.product.create({
      data: {
        name: body.name,
        description: body.description,
        price: body.price,
        categoryId: body.categoryId,
        stock: body.stock,
        quantity: body.quantity,
        weight: body.weight,
        images: {
          create: body.images,
        },
      },
    });

    return c.json({ msg: "created product!" });
  } catch (e) {
    c.status(403);
    return c.json({ error: "Error while adding products!" });
  }
});

adminRouter.put("/products/update-product/:id", adminMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const { id } = c.req.param();
  const body = await c.req.json();

  const { success } = updateProductInput.safeParse(body);
  if (!success) {
    c.status(400);
    return c.json({ error: "invalid input" });
  }
  try {
    const product = await prisma.product.update({
      where: { id },
      data: body,
    });

    return c.json({ msg: "updated product!" });
  } catch (e: any) {
    c.status(403);
    return c.json({ error: "Error while updating products!" + e.message });
  }
});

adminRouter.get("/products/all", adminMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        quantity: true,
        weight: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          select: {
            imageUrl: true,
          },
        },
      },
    });
    return c.json(products);
  } catch (e) {
    c.status(403);
    return c.json({ error: "Error while searching products!" });
  }
});

adminRouter.delete("/products/delete-product", adminMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  try {
    const res = await prisma.product.delete({
      where: {
        id: body.id,
      },
    });
    return c.json({ msg: "product deleted!" });
  } catch (e: any) {
    c.status(403);
    return c.json({ e: "Error while deleting product", error:  e.message });
  }
});

adminRouter.post("/categories/add-category", adminMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  try {
    const addCategory = await prisma.category.create({
      data: {
        name: body.name,
      },
    });
    return c.json({
      msg: `added category: ${addCategory.name} with id: ${addCategory.id}`,
    });
  } catch (e: any) {
    c.status(403);
    return c.json({ error: "Error creating categories: " + e.message });
  }
});

adminRouter.put("/categories/update-category/:id", adminMiddleware, async (c) => {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const { id } = c.req.param();
    const body = await c.req.json();
    try {
      const updatedCategory = await prisma.category.update({
        where: { id },
        data: body,
      });
      return c.json({
        msg: `Updated category: ${updatedCategory.name} with id: ${updatedCategory.id}`,
      });
    } catch (e: any) {
      c.status(403);
      return c.json({ error: "Error updating categories: " + e.message });
    }
  }
);

adminRouter.get("/categories/all", adminMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const category = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return c.json({
      category,
    });
  } catch (e: any) {
    c.status(403);
    return c.json({ error: "Error fetching categories: " + e.message });
  }
});

adminRouter.get("/products/all", authMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          select: {
            imageUrl: true,
          },
        },
      },
    });
    return c.json(products);
  } catch (e) {
    c.status(403);
    return c.json({ error: "Error while searching products!" });
  }
});


adminRouter.get('/orders', adminMiddleware, async (c) => {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    try {
        const orders = await prisma.order.findMany({
          where: {
            status: {
              not: OrderStatus.PENDING,
            },
          },
          select: {
            id: true,
            status: true,
            totalPrice: true,
            addressId: true,
            user: {
              select: {
                id: true,
                email: true,
                firstname: true,
                lastname: true,
              },
            },
            items: {
              select: {
                quantity: true,
                totalPrice: true,
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });

        return c.json(orders);
    } catch(e: any) {
        c.status(403);    
        return c.json({msg: `Error while fetching orders: ${e.message}`});
    }
});


adminRouter.get("/orders/:id", adminMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const { id } = await c.req.param();
    const order = await prisma.order.findMany({
      where: {
        id
      },
      select: {
        id: true,
        status: true,
        totalPrice: true,
        addressId: true,
        user: {
          select: {
            id: true,
            email: true,
            firstname: true,
            lastname: true,
          },
        },
        items: {
          select: {
            quantity: true,
            totalPrice: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return c.json(order[0]);
  } catch (e: any) {
    c.status(403);
    return c.json({ msg: `Error while fetching orders: ${e.message}` });
  }
});

adminRouter.put("/orders/update/:id", adminMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const { id } = c.req.param();
    const body =await c.req.json();
    const order = await prisma.order.update({
      where: {
        id,
      },
      data: {
        status: body.status,
        }
    });

    return c.json({msg: 'Updated order!: ' + order.id});
  } catch (e: any) {
    c.status(403);
    return c.json({ msg: `Error while fetching orders: ${e.message}` });
  }
});

adminRouter.get("/analytics", adminMiddleware, async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    
    const totalPrice = await prisma.order.aggregate({
      where: {
        status: OrderStatus.DELIVERED,
      },
      _sum: {
        totalPrice: true
      }
    });

    const categoryWiseTotalOrderPrice = await prisma.orderItem.groupBy({
      by: "categoryId",
      _sum: {
        totalPrice: true,
      },
      orderBy: {
        "categoryId": "asc",
      },
    });

    return c.json([totalPrice._sum, categoryWiseTotalOrderPrice]);
  } catch (error: any) {
    c.status(403);
    return c.json({message: 'Error fetching analytics', err: error.message});
  }
})