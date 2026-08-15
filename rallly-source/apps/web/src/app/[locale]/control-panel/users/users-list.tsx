"use client";

import { Button } from "@rallly/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rallly/ui/dropdown-menu";
import { toast } from "@rallly/ui/sonner";
import {
  ChevronDownIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  UsersIcon,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { StackedList } from "@/components/stacked-list";
import { createUserQrCodeValue } from "@/features/user/schema";
import { Trans, useTranslation } from "@/i18n/client";
import { createLabeledQrCodePng } from "@/lib/labeled-qr-code";
import { useSafeAction } from "@/lib/safe-action/client";
import { createStoredZip } from "@/lib/stored-zip";
import { exportUserResponsesAction } from "./actions";
import { UserRow } from "./user-row";
import { UserSearchInput } from "./user-search-input";
import { UsersTabbedView } from "./users-tabbed-view";

export type UsersListUser = {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: "admin" | "user";
  banned: boolean;
  createdAt: Date;
  qrCodeToken: string;
  canChangeRole: boolean;
  canBan: boolean;
  canDelete: boolean;
};

function safeFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "user"
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function UsersList({
  users,
  currentPage,
  totalItems,
  pageSize,
}: {
  users: UsersListUser[];
  currentPage: number;
  totalItems: number;
  pageSize: number;
}) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloadingQrCodes, setDownloadingQrCodes] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const qrCanvasRefs = useRef(new Map<string, HTMLCanvasElement>());
  const exportResponses = useSafeAction(exportUserResponsesAction);
  const visibleIds = useMemo(() => users.map((user) => user.id), [users]);
  const selectedUsers = users.filter((user) => selectedIds.has(user.id));
  const allSelected = users.length > 0 && selectedUsers.length === users.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedUsers.length > 0 && !allSelected;
    }
  }, [allSelected, selectedUsers.length]);

  const downloadQrCodes = async () => {
    setDownloadingQrCodes(true);
    try {
      const files = await Promise.all(
        selectedUsers.map(async (user) => {
          const canvas = qrCanvasRefs.current.get(user.id);
          if (!canvas) {
            throw new Error(`QR code for ${user.name} is not ready`);
          }
          return {
            name: `${safeFileName(user.name)}-${user.id.slice(0, 8)}-qr.png`,
            data: new Uint8Array(
              await (
                await createLabeledQrCodePng(canvas, user.name)
              ).arrayBuffer(),
            ),
          };
        }),
      );
      const zip = createStoredZip(files);
      const buffer = zip.buffer.slice(
        zip.byteOffset,
        zip.byteOffset + zip.byteLength,
      ) as ArrayBuffer;
      downloadBlob(
        new Blob([buffer], { type: "application/zip" }),
        "user-qr-codes.zip",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("unexpectedError", { defaultValue: "Unexpected error" }),
      );
    } finally {
      setDownloadingQrCodes(false);
    }
  };

  const downloadResponses = async () => {
    const result = await exportResponses.executeAsync({
      userIds: selectedUsers.map((user) => user.id),
    });
    if (!result?.data) {
      return;
    }

    downloadBlob(
      new Blob([result.data.csv], { type: "text/csv;charset=utf-8" }),
      result.data.fileName,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {users.length > 0 ? (
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              aria-label={t("selectAllUsers", {
                defaultValue: "Select all users on this page",
              })}
              className="size-4 shrink-0 accent-primary"
              onChange={(event) => {
                setSelectedIds(
                  event.target.checked ? new Set(visibleIds) : new Set(),
                );
              }}
            />
          ) : null}
          <UserSearchInput />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="border"
                disabled={selectedUsers.length === 0}
              />
            }
          >
            <Trans
              i18nKey="bulkActions"
              defaults="Bulk actions ({count})"
              values={{ count: selectedUsers.length }}
            />
            <ChevronDownIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={downloadingQrCodes}
              onClick={downloadQrCodes}
            >
              <DownloadIcon />
              <Trans i18nKey="downloadQrCodes" defaults="Download QR codes" />
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={exportResponses.isPending}
              onClick={downloadResponses}
            >
              <FileSpreadsheetIcon />
              <Trans i18nKey="exportResponses" defaults="Export responses" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <UsersTabbedView>
        {users.length > 0 ? (
          <div className="space-y-4">
            <StackedList className="text-sm">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  name={user.name}
                  email={user.email}
                  userId={user.id}
                  image={user.image}
                  role={user.role}
                  banned={user.banned}
                  createdAt={user.createdAt}
                  qrCodeToken={user.qrCodeToken}
                  canChangeRole={user.canChangeRole}
                  canBan={user.canBan}
                  canDelete={user.canDelete}
                  selected={selectedIds.has(user.id)}
                  onSelectedChange={(selected) => {
                    setSelectedIds((current) => {
                      const next = new Set(current);
                      if (selected) {
                        next.add(user.id);
                      } else {
                        next.delete(user.id);
                      }
                      return next;
                    });
                  }}
                />
              ))}
            </StackedList>
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
            />
          </div>
        ) : (
          <EmptyState className="py-16">
            <EmptyStateIcon>
              <UsersIcon />
            </EmptyStateIcon>
            <EmptyStateTitle>
              <Trans i18nKey="noUsers" defaults="No users found" />
            </EmptyStateTitle>
            <EmptyStateDescription>
              <Trans
                i18nKey="noUsersDescription"
                defaults="Try adjusting your search"
              />
            </EmptyStateDescription>
          </EmptyState>
        )}
      </UsersTabbedView>

      <div aria-hidden="true" className="hidden">
        {selectedUsers.map((user) => (
          <QRCodeCanvas
            key={user.id}
            level="M"
            marginSize={4}
            size={1024}
            value={createUserQrCodeValue(user.qrCodeToken)}
            ref={(canvas) => {
              if (canvas) {
                qrCanvasRefs.current.set(user.id, canvas);
              } else {
                qrCanvasRefs.current.delete(user.id);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
