"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";

type ClaimInvite = {
  subject: "STUDENT" | "GUARDIAN";
  sentTo: string;
  displayName: string;
  reference: string;
  expiresAt: string;
  minPasswordLength: number;
};

type ClaimResult = {
  email: string;
  subject: "STUDENT" | "GUARDIAN";
  signInPath: string;
};

/**
 * Setting up a portal account from an invitation.
 *
 * One column at every width — this arrives as a WhatsApp link and is opened on
 * a phone, and a form with one decision in it has no second column to fill.
 */
export function ClaimPortalAccountContent({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const inviteQuery = useQuery({
    queryKey: ["portal-claim", token],
    queryFn: () =>
      fetchJson<{ data: ClaimInvite }>(`/api/public/schools/claim/${token}`).then(
        (response) => response.data,
      ),
    retry: false,
  });

  const claim = useMutation({
    mutationFn: () =>
      fetchJson<{ data: ClaimResult }>(`/api/public/schools/claim/${token}`, {
        method: "POST",
        body: JSON.stringify({ password }),
      }).then((response) => response.data),
  });

  const invite = inviteQuery.data;
  const minLength = invite?.minPasswordLength ?? 10;
  const tooShort = password.length > 0 && password.length < minLength;
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const canSubmit =
    password.length >= minLength && confirmPassword === password && !claim.isPending;

  if (inviteQuery.isLoading) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 p-4">
        <p className="text-muted-foreground">Opening your invitation…</p>
      </main>
    );
  }

  if (inviteQuery.error || !invite) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 p-4">
        <Alert variant="destructive">
          <AlertTitle>This link cannot be opened</AlertTitle>
          <AlertDescription>
            It may have expired, already been used, or been withdrawn. Ask the school
            office to send you a new invitation.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  if (claim.isSuccess) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 p-4">
        <div className="space-y-2">
          <h1 className="text-section-title">Your account is ready</h1>
          <p className="text-muted-foreground">
            Sign in with {claim.data.email} and the password you just chose.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href={claim.data.signInPath}>Go to sign in</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-4">
      <div className="space-y-2">
        <h1 className="text-section-title">
          {invite.subject === "STUDENT" ? "Set up your account" : "Set up your parent account"}
        </h1>
        <p className="text-muted-foreground">
          For {invite.displayName}
          {invite.reference ? ` · ${invite.reference}` : ""}. You will sign in with{" "}
          {invite.sentTo}.
        </p>
      </div>

      {claim.error ? (
        <Alert variant="destructive">
          <AlertTitle>That did not work</AlertTitle>
          <AlertDescription>{getApiErrorMessage(claim.error)}</AlertDescription>
        </Alert>
      ) : null}

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) claim.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="claim-password">Choose a password</Label>
          <Input
            id="claim-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className={tooShort ? "text-destructive" : "text-muted-foreground"}>
            At least {minLength} characters.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="claim-confirm">Type it again</Label>
          <Input
            id="claim-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {mismatch ? (
            <p className="text-destructive">Those two do not match.</p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={!canSubmit}>
          {claim.isPending ? "Setting up…" : "Create my account"}
        </Button>
      </form>
    </main>
  );
}
