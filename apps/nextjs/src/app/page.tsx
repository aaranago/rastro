import { Suspense } from "react";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { AuthShowcase } from "./_components/auth-showcase";
import {
  CreatePostForm,
  PostCardSkeleton,
  PostList,
} from "./_components/posts";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const getSingleSearchParam = (params: Awaited<SearchParams>, key: string) => {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
};

export default async function HomePage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const authStatus = getSingleSearchParam(searchParams, "auth");

  prefetch(trpc.post.all.queryOptions());

  return (
    <HydrateClient>
      <main className="container min-h-screen py-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-full max-w-4xl text-center">
            <h1 className="text-5xl font-extrabold tracking-normal sm:text-6xl">
              Rastro
            </h1>
            <p className="text-muted-foreground mt-3 text-base">
              Red de recuperacion para reportar, encontrar y reunir mascotas en
              Bolivia.
            </p>
          </div>

          <AuthShowcase status={authStatus} />

          <CreatePostForm />
          <div className="w-full max-w-2xl overflow-y-scroll">
            <Suspense
              fallback={
                <div className="flex w-full flex-col gap-4">
                  <PostCardSkeleton />
                  <PostCardSkeleton />
                  <PostCardSkeleton />
                </div>
              }
            >
              <PostList />
            </Suspense>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
