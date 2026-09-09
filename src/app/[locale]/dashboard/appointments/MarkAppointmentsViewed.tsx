"use client";

import { useEffect } from "react";
import { markAppointmentsViewedAction } from "./actions";

/**
 * Renders nothing — fires once per page visit to clear the dashboard nav's
 * unread-appointments badge (see appointments-badge.ts). A page view isn't
 * a user action a <form>/server action would normally hook into, so this
 * is a plain mount effect rather than the useActionState pattern used
 * elsewhere in this app.
 */
export function MarkAppointmentsViewed() {
  useEffect(() => {
    void markAppointmentsViewedAction();
  }, []);

  return null;
}
