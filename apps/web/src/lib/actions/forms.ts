"use server";

/**
 * Void-returning wrappers for plain <form action={…}> usage (React 19 form
 * actions must return void). Client components that need the ActionResult
 * call the underlying actions directly.
 */

import {
  addAppointmentAction,
  addMedicationAction,
  completeDutyAction,
  confirmTransportAction,
  createDutyAction,
  nudgeMemberAction,
  resolveAttentionAction,
} from "./care";
import { logDoseAction } from "./signals";
import { addExpenseAction, contributeAction, createPotAction } from "./money";
import { addRecordItemAction } from "./memory";
import { setHealthSharingAction } from "./health";
import { setReachPreferencesAction, setQuietHoursAction } from "./notifications";
import { upgradePlanAction } from "./billing";
import {
  createOrbitAction,
  deleteWorkspaceAction,
  leaveWorkspaceAction,
  switchWorkspaceAction,
  grantConsentAction,
  inviteMemberAction,
  raiseEmergencyAction,
  revokeConsentAction,
} from "./workspace";

export async function resolveAttentionForm(fd: FormData): Promise<void> {
  await resolveAttentionAction(fd);
}
export async function createDutyForm(fd: FormData): Promise<void> {
  await createDutyAction(fd);
}
export async function completeDutyForm(fd: FormData): Promise<void> {
  await completeDutyAction(fd);
}
export async function addMedicationForm(fd: FormData): Promise<void> {
  await addMedicationAction(fd);
}
export async function addAppointmentForm(fd: FormData): Promise<void> {
  await addAppointmentAction(fd);
}
export async function confirmTransportForm(fd: FormData): Promise<void> {
  await confirmTransportAction(fd);
}
export async function nudgeMemberForm(fd: FormData): Promise<void> {
  await nudgeMemberAction(fd);
}
export async function logDoseForm(fd: FormData): Promise<void> {
  await logDoseAction(fd);
}
export async function createPotForm(fd: FormData): Promise<void> {
  await createPotAction(fd);
}
export async function contributeForm(fd: FormData): Promise<void> {
  await contributeAction(fd);
}
export async function addExpenseForm(fd: FormData): Promise<void> {
  await addExpenseAction(fd);
}
export async function addRecordItemForm(fd: FormData): Promise<void> {
  await addRecordItemAction(fd);
}
export async function createOrbitForm(fd: FormData): Promise<void> {
  await createOrbitAction(fd);
}
export async function inviteMemberForm(fd: FormData): Promise<void> {
  await inviteMemberAction(fd);
}
export async function grantConsentForm(fd: FormData): Promise<void> {
  await grantConsentAction(fd);
}
export async function revokeConsentForm(fd: FormData): Promise<void> {
  await revokeConsentAction(fd);
}
export async function raiseEmergencyForm(fd: FormData): Promise<void> {
  await raiseEmergencyAction(fd);
}
export async function setHealthSharingForm(fd: FormData): Promise<void> {
  await setHealthSharingAction(fd);
}
export async function upgradePlanForm(fd: FormData): Promise<void> {
  await upgradePlanAction(fd);
}
export async function deleteWorkspaceForm(fd: FormData): Promise<void> {
  await deleteWorkspaceAction(fd);
}
export async function leaveWorkspaceForm(fd: FormData): Promise<void> {
  await leaveWorkspaceAction(fd);
}
export async function switchWorkspaceForm(fd: FormData): Promise<void> {
  await switchWorkspaceAction(fd);
}
export async function setReachPreferencesForm(fd: FormData): Promise<void> {
  await setReachPreferencesAction(fd);
}
export async function setQuietHoursForm(fd: FormData): Promise<void> {
  await setQuietHoursAction(fd);
}
