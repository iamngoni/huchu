"use client";

import Link from "next/link";
import { Alert, Button, Card } from "@corelithzw/react";
import { useStudentPortal } from "./student-portal-context";

/**
 * Settings, honestly.
 *
 * The prototype offers a theme switch, a notification cadence and a PIN
 * change. Two of the three have nowhere to be stored yet — there is no
 * per-pupil preference table and portal sign-in is a password rather than a
 * PIN — so they are named as not built rather than rendered as controls that
 * forget what you told them. A switch that silently does nothing is worse than
 * no switch, because it costs the reader their trust in the ones that work.
 */
export function StudentSettingsScreen() {
  const { student } = useStudentPortal();

  return (
    <div className="flex flex-col gap-4">
      <Card title="Your sign-in">
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-body)]">
          You sign in with {student?.user?.email ?? "your school email"} and a
          password.
        </p>
        <div className="mt-3">
          <Button variant="secondary" asChild>
            <Link href="/settings/profile">Change your password</Link>
          </Button>
        </div>
      </Card>

      <Card title="Notifications">
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-body)]">
          You are told when your school publishes something for you. Choosing how
          often is not built yet — see Notifications for what has come in.
        </p>
        <div className="mt-3">
          <Button variant="ghost" asChild>
            <Link href="/portal/student/notifications">Open notifications</Link>
          </Button>
        </div>
      </Card>

      <Alert tone="info" title="Two things from the design are not here yet">
        A PIN instead of a password, and choosing a theme. Both need somewhere to
        keep the setting, which the school portal does not have yet. They are on
        the plan rather than hidden.
      </Alert>
    </div>
  );
}
