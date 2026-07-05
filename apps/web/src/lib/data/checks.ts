import { withUser } from "@kinos/db";
import type {
  CareSubjectRow,
  DeviceConnectionRow,
  WellnessCheckRequestRow,
  WellnessCheckResultRow,
} from "@kinos/db";
import {
  availableCheckTypes,
  type CheckType,
  type ConnectionSnapshot,
  type ConnectorProvider,
} from "@kinos/engine";

/**
 * Request Check data layer. Every query runs under RLS: what a viewer may
 * see of requests, results and device connections is decided by the
 * database, never re-decided here.
 */

export interface CheckWithNames extends WellnessCheckRequestRow {
  subject_name: string;
  requester_name: string | null;
  result_summary: string | null;
  result_worth_a_check: boolean | null;
}

export async function listChecksForSubject(
  userId: string,
  subjectId: string,
  limit = 8,
): Promise<CheckWithNames[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select r.*, s.display_name as subject_name, m.display_name as requester_name,
              res.summary as result_summary, res.worth_a_check as result_worth_a_check
       from wellness_check_request r
       join care_subject s on s.id = r.subject_id
       left join family_member m on m.id = r.requested_by
       left join wellness_check_result res on res.request_id = r.id
       where r.subject_id = $1
       order by r.created_at desc
       limit $2`,
      [subjectId, limit],
    );
    return res.rows;
  });
}

/** Requests waiting on the signed-in person (they are the care recipient). */
export async function listChecksAwaitingMe(userId: string): Promise<CheckWithNames[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select r.*, s.display_name as subject_name, m.display_name as requester_name,
              null as result_summary, null as result_worth_a_check
       from wellness_check_request r
       join care_subject s on s.id = r.subject_id
       join family_member me on me.workspace_id = s.workspace_id
       where me.user_id = app_user_id() and me.role = 'care_recipient'
         and r.status in ('pending','later') and r.respond_by > now()
       order by r.created_at desc`,
    );
    return res.rows;
  });
}

export async function listDeviceConnections(
  userId: string,
  subjectId: string,
): Promise<DeviceConnectionRow[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select * from device_connection where subject_id = $1 order by created_at`,
      [subjectId],
    );
    return res.rows;
  });
}

export function toConnectionSnapshots(rows: DeviceConnectionRow[]): ConnectionSnapshot[] {
  return rows.map((r) => ({
    provider: r.provider as ConnectorProvider,
    status: r.status,
    permissionStatus: r.permission_status,
    lastSyncedAt: r.last_synced_at,
  }));
}

/** The check types the family can offer for this person right now. */
export async function availableChecks(
  userId: string,
  subjectId: string,
): Promise<{ types: CheckType[]; connections: DeviceConnectionRow[] }> {
  const connections = await listDeviceConnections(userId, subjectId);
  return { types: availableCheckTypes(toConnectionSnapshots(connections)), connections };
}

export interface CheckResultView extends WellnessCheckResultRow {
  requester_name: string | null;
}

export async function getCheckResult(
  userId: string,
  requestId: string,
): Promise<CheckResultView | null> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select res.*, m.display_name as requester_name
       from wellness_check_result res
       join wellness_check_request r on r.id = res.request_id
       left join family_member m on m.id = r.requested_by
       where res.request_id = $1`,
      [requestId],
    );
    return res.rows[0] ?? null;
  });
}

/** Subjects in my workspace I stand as care recipient for (respond scope). */
export async function subjectsICanAnswerFor(userId: string): Promise<CareSubjectRow[]> {
  return withUser(userId, async (db) => {
    const res = await db.query(
      `select s.* from care_subject s
       join family_member me on me.workspace_id = s.workspace_id
       where me.user_id = app_user_id() and me.role = 'care_recipient'
       order by s.created_at`,
    );
    return res.rows;
  });
}
