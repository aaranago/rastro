import { activityRouter } from "./router/activity";
import { adminRouter } from "./router/admin";
import { alertsRouter } from "./router/alerts";
import { authRouter } from "./router/auth";
import { chatRouter } from "./router/chat";
import { memberProfileRouter } from "./router/member-profile";
import { postRouter } from "./router/post";
import { reportRouter } from "./router/report";
import { resourcesRouter } from "./router/resources";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  activity: activityRouter,
  admin: adminRouter,
  alerts: alertsRouter,
  auth: authRouter,
  chat: chatRouter,
  memberProfile: memberProfileRouter,
  post: postRouter,
  report: reportRouter,
  resources: resourcesRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
