"use client";

import { useEffect, useState } from "react";
import { Button } from "@kinos/ui";
import { removePushSubscriptionAction, savePushSubscriptionAction } from "@/lib/actions/notifications";

/**
 * Push notifications opt-in. Attention and briefs reach the family's
 * phones only after this explicit, revocable choice — consent-native,
 * like everything else.
 */

function base64ToUint8(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "unsupported" | "checking" | "off" | "on" | "denied" | "working";

export function EnableNotifications({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!vapidPublicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setState(existing ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [vapidPublicKey]);

  async function enable() {
    if (!vapidPublicKey) return;
    setState("working");
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8(vapidPublicKey) as BufferSource,
      });
      const formData = new FormData();
      formData.set("subscription", JSON.stringify(subscription.toJSON()));
      const result = await savePushSubscriptionAction(formData);
      if (result.ok) {
        setState("on");
        setMessage("You'll hear when something genuinely needs you. Quiet hours stay quiet.");
      } else {
        setState("off");
        setMessage(result.message ?? "That didn't go through — try again.");
      }
    } catch {
      setState("off");
      setMessage("Notifications couldn't be set up on this device.");
    }
  }

  async function disable() {
    setState("working");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const formData = new FormData();
        formData.set("endpoint", subscription.endpoint);
        await removePushSubscriptionAction(formData);
        await subscription.unsubscribe();
      }
      setState("off");
      setMessage("Notifications are off for this device.");
    } catch {
      setState("on");
    }
  }

  if (state === "checking") return null;

  if (state === "unsupported") {
    return (
      <p className="text-[13px] text-ink-soft">
        {vapidPublicKey
          ? "This browser doesn't support notifications — the app and email still keep you posted."
          : "Push notifications aren't configured for this deployment yet (VAPID keys)."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {state === "denied" ? (
        <p className="text-[13px] text-ink-soft">
          Notifications are blocked in your browser settings for this site. Allow them there,
          then come back — KinOS only speaks up when something needs you.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            variant={state === "on" ? "ghost" : "primary"}
            onClick={state === "on" ? disable : enable}
            disabled={state === "working"}
          >
            {state === "working"
              ? "One moment…"
              : state === "on"
                ? "Turn off on this device"
                : "Turn on notifications"}
          </Button>
          {state === "on" && <span className="text-[13px] text-calm">On for this device ✓</span>}
        </div>
      )}
      {message && <p className="text-[12.5px] text-ink-soft">{message}</p>}
    </div>
  );
}
