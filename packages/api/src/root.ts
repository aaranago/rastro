import { adminRouter } from "./router/admin";
import { authRouter } from "./router/auth";
import { chatRouter } from "./router/chat";
import { postRouter } from "./router/post";
import { reportRouter } from "./router/report";
import { resourcesRouter } from "./router/resources";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  auth: authRouter,
  chat: chatRouter,
  post: postRouter,
  report: reportRouter,
  resources: resourcesRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
