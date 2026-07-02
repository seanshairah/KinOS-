import { NextResponse, type NextRequest } from "next/server";
import { withService } from "@kinos/db";
import {
  exchangeCode,
  subscribeNotifications,
  verifyState,
  withingsConfigured,
} from "@/lib/integrations/withings";

export const dynamic = "force-dynamic";

/**
 * OAuth2 return leg. The signed state names the subject; the code becomes
 * tokens stored on health_source_link, and we subscribe to notifications
 * so the cuff talks to the orbit from now on.
 */
export async function GET(request: NextRequest) {
  const home = new URL("/app", request.url);
  if (!withingsConfigured()) {
    home.searchParams.set("withings", "unconfigured");
    return NextResponse.redirect(home);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = verifyState(request.nextUrl.searchParams.get("state") ?? "");
  if (!code || !state) {
    home.searchParams.set("withings", "declined");
    return NextResponse.redirect(home);
  }

  try {
    const tokens = await exchangeCode(code);

    await withService(async (db) => {
      await db.query(
        `insert into health_source_link (subject_id, provider, external_user_id, access, status)
         values ($1, 'withings', $2, $3, 'active')
         on conflict (provider, external_user_id)
         do update set subject_id = excluded.subject_id, access = excluded.access, status = 'active'`,
        [state.subjectId, tokens.userid, JSON.stringify(tokens)],
      );
      await db.query(
        `insert into access_log (workspace_id, actor_member_id, action, target)
         select s.workspace_id, m.id, 'health_device_linked', 'withings'
         from care_subject s
         left join family_member m on m.workspace_id = s.workspace_id and m.user_id = $2
         where s.id = $1`,
        [state.subjectId, state.userId],
      );
    });

    await subscribeNotifications(tokens.access_token);
    home.searchParams.set("withings", "connected");
  } catch {
    home.searchParams.set("withings", "error");
  }
  return NextResponse.redirect(home);
}
