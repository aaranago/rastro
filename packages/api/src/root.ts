import { authRouter } from "./router/auth";
import { postRouter } from "./router/post";
import { reportRouter } from "./router/report";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
  report: reportRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
