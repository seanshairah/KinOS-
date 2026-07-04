/**
 * Next.js instrumentation. The onRequestError hook catches server-side
 * errors (RSC renders, route handlers, server actions) and hands them to the
 * error tracker — which is itself a no-op unless SENTRY_DSN is set.
 */
import type { Instrumentation } from "next";

export function register(): void {
  // Nothing to warm up; the tracker lazily reads its DSN.
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  const { captureException } = await import("./lib/observability");
  await captureException(err, {
    tag: context.routerKind === "App Router" ? "server" : "pages",
    path: request.path,
    extra: { routeType: context.routeType, renderSource: context.renderSource ?? "" },
  });
};
