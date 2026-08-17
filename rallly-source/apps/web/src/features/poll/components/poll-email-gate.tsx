"use client";

import { Button } from "@rallly/ui/button";
import { Input } from "@rallly/ui/input";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { usePoll, usePollEmailAccess } from "@/features/poll/client";
import {
  normalizePollAccessEmail,
  shouldRequirePollEmailGate,
} from "@/features/poll/email-access/utils";
import { useUser } from "@/features/user/client";
import { trpc } from "@/trpc/client";

export function PollEmailGate({ children }: React.PropsWithChildren) {
  const poll = usePoll();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const { impersonatedUserId, emailAccess, setEmailAccess } =
    usePollEmailAccess();
  const utils = trpc.useUtils();
  const automaticEmail =
    (user && !user.isGuest ? user.email : null) ?? searchParams.get("email");
  const requiresGate = shouldRequirePollEmailGate({
    requireEmailVerification: poll.requireEmailVerification,
    impersonatedUserId,
  });
  const [hasPassed, setHasPassed] = useState(!requiresGate || !!emailAccess);
  const [email, setEmail] = useState(emailAccess ?? automaticEmail ?? "");
  const [error, setError] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  const authorizeEmail = useCallback(
    async (value: string) => {
      const normalizedEmail = normalizePollAccessEmail(value);
      setError("");
      setIsLookingUp(true);

      try {
        await utils.polls.getParticipantByEmail.fetch({
          pollId: poll.id,
          email: normalizedEmail,
        });
        setEmailAccess(normalizedEmail);
        setEmail(normalizedEmail);
        setHasPassed(true);
      } catch (lookupError) {
        setError(
          lookupError instanceof Error
            ? lookupError.message
            : "Unable to look up that email address",
        );
      } finally {
        setIsLookingUp(false);
      }
    },
    [poll.id, setEmailAccess, utils.polls.getParticipantByEmail],
  );

  useEffect(() => {
    if (!requiresGate) {
      setHasPassed(true);
      return;
    }

    if (emailAccess) {
      setHasPassed(true);
      return;
    }

    if (automaticEmail) {
      void authorizeEmail(automaticEmail);
    }
  }, [automaticEmail, authorizeEmail, emailAccess, requiresGate]);

  if (hasPassed) {
    return children;
  }

  return (
    <div className="mx-auto mt-8 max-w-md rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="mb-2 font-semibold text-xl">
        Welcome! Please enter your email
      </h2>
      <p className="mb-4 text-muted-foreground text-sm">
        Enter your email to view this poll. If you have already voted, your
        previous response will be loaded.
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void authorizeEmail(email);
        }}
      >
        <Input
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoFocus
          disabled={isLookingUp}
        />
        {error ? <p className="text-red-500 text-sm">{error}</p> : null}
        <Button type="submit" variant="primary" loading={isLookingUp}>
          Continue
        </Button>
      </form>
    </div>
  );
}
