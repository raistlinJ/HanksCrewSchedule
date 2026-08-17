"use client";

import React from "react";

const PollEmailAccessContext = React.createContext<{
  impersonatedUserId: string | null;
  emailAccess: string | null;
  setEmailAccess: (email: string | null) => void;
}>({
  impersonatedUserId: null,
  emailAccess: null,
  setEmailAccess: () => undefined,
});

export const PermissionProvider = ({
  children,
  impersonatedUserId,
}: {
  children: React.ReactNode;
  impersonatedUserId: string | null;
}) => {
  const [emailAccess, setEmailAccess] = React.useState<string | null>(null);

  return (
    <PollEmailAccessContext.Provider
      value={{ impersonatedUserId, emailAccess, setEmailAccess }}
    >
      {children}
    </PollEmailAccessContext.Provider>
  );
};

export const usePollEmailAccess = () =>
  React.useContext(PollEmailAccessContext);
