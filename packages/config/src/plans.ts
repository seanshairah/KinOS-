/**
 * Plan catalogue + gating keys. Mirrors the `plan` and `usage_limit` tables.
 * Gate checks live in the data layer; this file is the single source of truth
 * for caps and feature membership.
 */

export type PlanId =
  | "free"
  | "family_core"
  | "family_plus"
  | "family_premium"
  | "diaspora_care"
  | "caregiver_pro"
  | "care_home";

export type FeatureKey =
  | "daily_brief"
  | "medication"
  | "appointments"
  | "duties"
  | "family_record"
  | "money_pot"
  | "receipts"
  | "patterns"
  | "caregiver_access"
  | "document_vault"
  | "caregiver_proof"
  | "cross_border_briefs"
  | "visit_logs"
  | "invoices"
  | "resident_dashboards"
  | "family_portals"
  | "incident_logs";

export interface PlanDef {
  id: PlanId;
  name: string;
  priceCentsMonthly: number;
  audience: string;
  maxOrbits: number;
  maxMembers: number;
  features: FeatureKey[];
  /** P3 plans exist in the catalogue but are not purchasable yet. */
  available: boolean;
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    priceCentsMonthly: 0,
    audience: "Trying KinOS with one loved one",
    maxOrbits: 1,
    maxMembers: 3,
    features: ["duties", "appointments"],
    available: true,
  },
  family_core: {
    id: "family_core",
    name: "Family Core",
    priceCentsMonthly: 800,
    audience: "One loved one, the full rhythm",
    maxOrbits: 1,
    maxMembers: 5,
    features: [
      "daily_brief",
      "medication",
      "appointments",
      "duties",
      "family_record",
    ],
    available: true,
  },
  family_plus: {
    id: "family_plus",
    name: "Family Plus",
    priceCentsMonthly: 1900,
    audience: "Active care with shared money",
    maxOrbits: 2,
    maxMembers: 10,
    features: [
      "daily_brief",
      "medication",
      "appointments",
      "duties",
      "family_record",
      "money_pot",
      "receipts",
      "patterns",
    ],
    available: true,
  },
  family_premium: {
    id: "family_premium",
    name: "Family Premium",
    priceCentsMonthly: 3900,
    audience: "Multiple dependents and caregivers",
    maxOrbits: 6,
    maxMembers: 20,
    features: [
      "daily_brief",
      "medication",
      "appointments",
      "duties",
      "family_record",
      "money_pot",
      "receipts",
      "patterns",
      "caregiver_access",
      "document_vault",
    ],
    available: true,
  },
  diaspora_care: {
    id: "diaspora_care",
    name: "Diaspora Care",
    priceCentsMonthly: 2200,
    audience: "Supporting home from abroad",
    maxOrbits: 3,
    maxMembers: 12,
    features: [
      "daily_brief",
      "medication",
      "appointments",
      "duties",
      "family_record",
      "money_pot",
      "receipts",
      "patterns",
      "caregiver_access",
      "caregiver_proof",
      "cross_border_briefs",
    ],
    available: true,
  },
  caregiver_pro: {
    id: "caregiver_pro",
    name: "Caregiver Pro",
    priceCentsMonthly: 4900,
    audience: "Professional caregivers",
    maxOrbits: 20,
    maxMembers: 40,
    features: ["visit_logs", "invoices", "caregiver_proof", "daily_brief"],
    available: false,
  },
  care_home: {
    id: "care_home",
    name: "Care Home",
    priceCentsMonthly: 19900,
    audience: "Facilities and residences",
    maxOrbits: 200,
    maxMembers: 500,
    features: [
      "resident_dashboards",
      "family_portals",
      "incident_logs",
      "visit_logs",
      "daily_brief",
    ],
    available: false,
  },
};

export function planHasFeature(plan: PlanId, feature: FeatureKey): boolean {
  return PLANS[plan].features.includes(feature);
}

export function orbitCap(plan: PlanId): number {
  return PLANS[plan].maxOrbits;
}
