import {
  addressUpdateInput,
  createAdressInput,
  signinInput,
  signupInput,
  updateUserDetailsInput,
} from "@iamvik20/common-lalaji";
import { OrderStatus, PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import authMiddleware from "../authMiddleware";
import { genSaltSync, hashSync, compareSync } from "bcrypt-edge";

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
    SALT: number;
  };
  Variables: {
    userId: string;
    email: string;
  };
}>();


userRouter.post("/signup", async (c) => {
  console.log("helll")
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const { success } = signupInput.safeParse(body);
  if (!success) {
    c.status(400);
    return c.json({ error: "invalid input" });
  }

  try {
    const salt = genSaltSync(c.env.SALT);
    const hashedPassword = hashSync(body.password, salt);
    const findUser = await prisma.user.findUnique({
      where: {
        email: body.email,
        phone: body.phone,
      },
    });

    if (findUser) {
      c.status(411);
      return c.json({
        message: "Email or phone number already exists",
      });
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        firstname: body.firstname,
        lastname: body.lastname,
        password: hashedPassword,
        phone: body.phone,
      },
    });

    const jwt = await sign(
      {
        id: user.id,
        type: user.type
      },
      c.env.JWT_SECRET
    );

    return c.json({
      jwt: `Bearer ${jwt}`,
    });
  } catch (e) {
    c.status(403);
    console.log(e, "error");
    return c.json({ error: "Error while signing up" });
  }
});


userRouter.post("/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const { success } = signinInput.safeParse(body);

  if (!success) {
    c.status(411);
    return c.json({
      message: "Invalid inputs",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });

    if (!user || !compareSync(body.password, user.password)) {
      c.status(403);
      return c.json({ error: "Incorrect credentials" });
    }

    console.log(user);
    const jwt = await sign(
      {
        id: user.id,
        type: user.type,
        name: `${user.firstname} ${user.lastname}`,
      },
      c.env.JWT_SECRET
    );
    return c.json({ jwt: `Bearer ${jwt}` });
  } catch (e) {
    c.status(411);
    console.log("error", e);
    return c.json({ message: "Error signing in!" });
  }
});

userRouter.put("/update", authMiddleware, async (c) => {
  const body = await c.req.json();

  const { success } = updateUserDetailsInput.safeParse(body);

  if (!success) {
    c.status(411);
    return c.json({
      message: "Invalid Inputs",
    });
  }

  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const res = await prisma.user.update({
      where: {
        id: c.get("userId"),
      },
      data: body,
    });

    return c.json({
      message: "Details Updated",
    });
  } catch (error) {
    c.status(403);
    return c.json({
      message: "Internal Server Error",
    });
  }
});

userRouter.get("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");

  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        addresses: {
          select: {
            id: true,
            recipentName: true,
            recipentPhone: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        orders: {
          select: {
            id: true,
            status: true,
            items: true,
          },
        },
      },
    });

    return c.json({
      user,
    });
  } catch (error) {
    console.log("Error: " + error);

    c.status(403);
    return c.json({
      message: "Internal Server Error",
    });
  }
});

userRouter.post("/address/add", authMiddleware, async (c) => {
  const body = await c.req.json();
  console.log(body);
  const { success } = createAdressInput.safeParse(body);

  if (!success) {
    c.status(411);
    return c.json({
      message: "Invalid Inputs",
    });
  }

  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    console.log(c.get("userId"));
    const res = await prisma.address.create({
      data: {
        recipentName: body.recipentName,
        recipentPhone: body.recipentPhone,
        street: body.street,
        zipCode: body.zipCode,
        userId: c.get("userId"),
      },
    });

    return c.json({
      message: "Address added to the user",
    });
  } catch (error) {
    c.status(403);
    return c.json({
      message: "Internal Server Error",
      err: error,
    });
  }
});

userRouter.put("/address/update/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { success } = addressUpdateInput.safeParse(body);

  if (!success) {
    c.status(411);
    return c.json({
      message: "Invalid Inputs",
    });
  }

  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const res = await prisma.address.update({
      where: {
        id: id,
        userId: c.get("userId"),
      },
      data: body,
    });

    return c.json({
      message: "Address updated!",
    });
  } catch (error) {
    c.status(403);
    return c.json({
      message: "Internal Server Error",
      err: error,
    });
  }
});

userRouter.delete("/address/delete/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");

  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const res = await prisma.address.delete({
      where: {
        id: id,
        userId: c.get("userId"),
      },
    });

    return c.json({
      message: "Address deleted!",
    });
  } catch (error) {
    c.status(403);
    return c.json({
      message: "Internal Server Error",
      err: error,
    });
  }
});

userRouter.get('/address/all', authMiddleware, async (c) => {
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    try {
        const addresses = await prisma.address.findMany({
            where: {
                userId: c.get('userId')
            },
        });
        return c.json(addresses);
    } catch (error: any) {
        c.status(403);
        return c.json({error: `Error fetching all addresses: ${error.message}`});
    }
})

userRouter.post("/cart/add-to-cart", authMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const { id } = await c.req.json();
    const userId = c.get("userId");

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
    });
    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }

    const user = await prisma.user.findUnique({
      where: {
        id: c.get("userId"),
      },
      include: {
        orders: {
          include: {
            items: true,
          },
        },
        addresses: true,
      },
    });

    let pendingOrder: any = {};
    if (user) {
      pendingOrder =
        user?.orders?.find((order) => order.status === "PENDING") ?? null;
    }

    if (!pendingOrder) {
      pendingOrder = await prisma.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          addressId: user.addresses[0].id,
          totalPrice: 0,
        },
      });
    }

    const existingItem = pendingOrder.items.find(
      (item: any) => item.productId === id
    );

    if (existingItem) {
      const updatedProduct = await prisma.orderItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + 1,
          totalPrice: parseFloat(
            (existingItem.totalPrice + product.price).toFixed(2)
          ),
        },
      });

      await prisma.order.update({
        where: {
          id: pendingOrder.id,
        },
        data: {
          totalPrice: parseFloat(
            (pendingOrder.totalPrice + product.price).toFixed(2)
          ),
        },
      });
    } else {
      const updatedCart = await prisma.orderItem.create({
        data: {
          orderId: pendingOrder.id,
          productId: id,
          quantity: 1,
          totalPrice: product.price,
        },
      });

      await prisma.order.update({
        where: {
          id: pendingOrder.id,
        },
        data: {
          totalPrice: parseFloat(
            (pendingOrder.totalPrice + updatedCart.totalPrice).toFixed(2)
          ),
        },
      });
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id: pendingOrder.id },
      include: { items: { include: { product: true } } },
    });

    return c.json(updatedOrder);
  } catch (error: any) {
    return c.json(
      { error: "error while adding to cart!: " + error.message },
      403
    );
  }
});

userRouter.delete("/cart/delete-from-cart/:id", authMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const { id } = c.req.param();
    const userId = c.get("userId");

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        orders: {
          include: {
            items: true,
          },
        },
      },
    });

    const pendingOrder = user.orders.find(
      (order) => order.status === "PENDING"
    );

    if (!pendingOrder) {
      return c.json({ error: "No pending order found" }, 404);
    }

    const finalPrice = pendingOrder.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    const orderItem = pendingOrder.items.find((item) => item.productId === id);
    if (!orderItem) {
      return c.json({ error: "Product not found in cart" }, 404);
    }
    if (orderItem.quantity > 1) {
      const updatedOrderItem = await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: {
          quantity: orderItem.quantity - 1,
          totalPrice: parseFloat(
            (
              orderItem.totalPrice -
              orderItem.totalPrice / orderItem.quantity
            ).toFixed(2)
          ),
        },
      });
      await prisma.order.update({
        where: {
          id: pendingOrder.id,
        },
        data: {
          totalPrice: parseFloat(
            (
              finalPrice -
              updatedOrderItem.totalPrice / updatedOrderItem.quantity
            ).toFixed(2)
          ),
        },
      });
    } else {
      console.log(finalPrice);
      const updatedOrderItem = await prisma.orderItem.delete({
        where: { id: orderItem.id },
      });
      console.log(updatedOrderItem);
      await prisma.order.update({
        where: {
          id: pendingOrder.id,
        },
        data: {
          totalPrice: parseFloat(
            (finalPrice - updatedOrderItem.totalPrice).toFixed(2)
          ),
        },
      });
    }

    const updatedOrder = await prisma.order.findUnique({
      where: {
        id: pendingOrder.id,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return c.json(updatedOrder);
  } catch (error: any) {
    return c.json(
      { error: "error while deleting to cart!" + error.message },
      403
    );
  }
});

userRouter.post("/order", authMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const { addressId } = await c.req.json();
    const userId = c.get("userId");

    const pendingOrder = await prisma.order.findFirst({
      where: {
        userId,
        status: OrderStatus.PENDING,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    console.log(pendingOrder);
    if (!pendingOrder) {
      return c.json({ error: "No product in cart!" }, 404);
    }

    for (const item of pendingOrder.items) {
      const product = item.product;
      if (Number(product.stock) < item.quantity) {
        return c.json({ error: `${product.name} is out of stock!` }, 400);
      }
      await prisma.product.update({
        where: {
          id: product.id,
        },
        data: {
          stock: String(Number(product.stock) - item.quantity),
        },
      });
    }

    const totalPrice = pendingOrder.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    const completedOrder = await prisma.order.update({
      where: {
        id: pendingOrder.id,
      },
      data: {
        status: OrderStatus.PROCESSING,
        addressId,
      },
    });

    return c.json(completedOrder);
  } catch (e: any) {
    return c.json({ msg: "Error placing order: " + e.message }, 403);
  }
});

userRouter.get("/cart/me", authMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const userId = c.get("userId");

    const cartItems = await prisma.order.findMany({
      where: {
        userId,
        status: OrderStatus.PENDING,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return c.json(cartItems);
  } catch (e: any) {
    return c.json({ msg: "Error while fetching orders: " + e.message }, 403);
  }
});

userRouter.get("/orders/me", authMiddleware, async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const userId = c.get("userId");

    const orders = await prisma.order.findMany({
      where: {
        userId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return c.json(orders);
  } catch (e: any) {
    return c.json({ msg: "Error while fetching orders: " + e.message }, 403);
  }
});
