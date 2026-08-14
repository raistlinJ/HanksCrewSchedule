"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@rallly/ui/badge";
import { Button } from "@rallly/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useDialog,
} from "@rallly/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rallly/ui/dropdown-menu";
import { Icon } from "@rallly/ui/icon";
import { toast } from "@rallly/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@rallly/ui/tooltip";
import { absoluteUrl, shortUrl } from "@rallly/utils/absolute-url";
import {
  CheckIcon,
  CircleStopIcon,
  GripVertical,
  MoreHorizontalIcon,
  PencilIcon,
  PlayIcon,
  StickerIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { HoverPrefetchLink } from "@/components/hover-prefetch-link";
import { OptimizedAvatarImage } from "@/components/optimized-avatar-image";
import { Spinner } from "@/components/spinner";
import { StackedList, StackedListItem } from "@/components/stacked-list";
import VoteIcon from "@/features/poll/components/vote-icon";
import type { PollClosedReason, PollStatus } from "@/features/poll/schema";
import { Trans, useTranslation } from "@/i18n/client";
import { trpc } from "@/trpc/client";

interface PollsInfiniteListProps {
  status?: PollStatus;
  search?: string;
  member?: string;
  emptyState: React.ReactNode;
}

function PollListItem({
  id,
  title,
  status,
  closedReason,
  participants,
  user,
  voteCounts,
  disableDrag,
  selected,
  onSelectedChange,
}: {
  id: string;
  title: string;
  status: PollStatus;
  closedReason: PollClosedReason | null;
  participants: { id: string; name: string }[];
  user: { name: string; image: string | null } | null;
  voteCounts?: { yes: number; no: number; ifNeedBe: number };
  disableDrag?: boolean;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { zIndex: 50, position: "relative" as const } : {}),
  };
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const deletePollDialog = useDialog();
  // Refresh server components so server-fetched data that depends on poll
  // status (e.g. the status tab counts) stays in sync with the list.
  const refresh = { onSuccess: () => router.refresh() };
  const deletePoll = trpc.polls.markAsDeleted.useMutation(refresh);
  const closePoll = trpc.polls.close.useMutation(refresh);
  const reopenPoll = trpc.polls.reopen.useMutation(refresh);
  return (
    <div ref={setNodeRef} style={style} className="w-full">
      <div className="grid w-full grid-cols-[1fr_auto] gap-2 bg-background">
        <div className="relative -m-4 flex min-w-0 flex-1 items-center gap-2 p-4">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectedChange(event.target.checked)}
            aria-label={`Select ${title}`}
            className="relative z-10 size-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <div
            className="relative z-10 flex cursor-grab touch-none items-center justify-center p-1 text-muted-foreground"
            {...(disableDrag ? {} : attributes)}
            {...(disableDrag ? {} : listeners)}
          >
            <GripVertical className="h-5 w-5" />
          </div>
          <HoverPrefetchLink
            className="min-w-0 text-sm hover:underline focus:ring-ring focus-visible:ring-2"
            href={absoluteUrl(`/poll/${id}`)}
          >
            <span className="absolute inset-0" />
            <span className="block truncate">{title}</span>
          </HoverPrefetchLink>
          {status === "closed" && closedReason === "auto" && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge size="sm" className="relative cursor-help">
                    <Trans
                      i18nKey="pollAutoClosedBadge"
                      defaults="Automatically closed"
                    />
                  </Badge>
                }
              />
              <TooltipContent>
                <Trans
                  i18nKey="pollAutoClosedTooltip"
                  defaults="This poll was closed automatically because all of its dates have passed. You can reopen it at any time."
                />
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 sm:gap-4">
          {voteCounts ? (
            <div className="flex items-center gap-3 font-medium text-xs">
              <span className="flex items-center gap-1 text-green-600">
                <CheckIcon className="h-3.5 w-3.5" />
                {voteCounts.yes}
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <XIcon className="h-3.5 w-3.5" />
                {voteCounts.no}
              </span>
              <span className="flex items-center gap-1 text-yellow-500">
                <VoteIcon type="ifNeedBe" className="size-3.5" />
                {voteCounts.ifNeedBe}
              </span>
            </div>
          ) : participants.length > 0 ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="cursor-help text-muted-foreground text-sm">
                    <Trans
                      i18nKey="participantCount"
                      defaults="{count, plural, =0 {No participants} one {1 participant} other {# participants}}"
                      values={{ count: participants.length }}
                    />
                  </span>
                }
              />
              <TooltipContent>
                <ul>
                  {participants.slice(0, 10).map((participant) => (
                    <li key={participant.id}>{participant.name}</li>
                  ))}
                  {participants.length > 10 && (
                    <li>
                      <Trans
                        i18nKey="moreParticipants"
                        values={{ count: participants.length - 10 }}
                        defaults="{count, plural, other {# more…}}"
                      />
                    </li>
                  )}
                </ul>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-muted-foreground text-sm">
              <Trans
                i18nKey="participantCount"
                defaults="{count, plural, =0 {No participants} one {1 participant} other {# participants}}"
                values={{ count: participants.length }}
              />
            </span>
          )}
          {user && (
            <Tooltip>
              <TooltipTrigger>
                <OptimizedAvatarImage
                  size="sm"
                  name={user.name}
                  src={user.image ?? undefined}
                />
              </TooltipTrigger>
              <TooltipContent>{user.name}</TooltipContent>
            </Tooltip>
          )}
          <div className="flex items-center gap-x-1">
            <CopyLinkButton href={shortUrl(`/invite/${id}`)} />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label={t("moreOptions", {
                      defaultValue: "More options",
                    })}
                    variant="ghost"
                    size="icon"
                  />
                }
              >
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  render={
                    <Link href={`/poll/${id}/edit?returnTo=${pathname}`} />
                  }
                >
                  <Icon>
                    <PencilIcon />
                  </Icon>
                  <Trans i18nKey="edit" defaults="Edit" />
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href={`/poll/${id}`} />}>
                  <Icon>
                    <UsersIcon />
                  </Icon>
                  <Trans i18nKey="responses" defaults="Responses" />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {status === "open" && (
                  <DropdownMenuItem
                    onClick={() => {
                      toast.promise(closePoll.mutateAsync({ pollId: id }), {
                        loading: (
                          <Trans i18nKey="loading" defaults="Loading..." />
                        ),
                        success: (
                          <Trans i18nKey="pollClosed" defaults="Poll closed" />
                        ),
                      });
                    }}
                  >
                    <Icon>
                      <CircleStopIcon />
                    </Icon>
                    <Trans i18nKey="closePoll" defaults="Close" />
                  </DropdownMenuItem>
                )}
                {status === "closed" && (
                  <DropdownMenuItem
                    onClick={() => {
                      toast.promise(reopenPoll.mutateAsync({ pollId: id }), {
                        loading: (
                          <Trans i18nKey="loading" defaults="Loading..." />
                        ),
                        success: (
                          <Trans
                            i18nKey="pollReopened"
                            defaults="Poll reopened"
                          />
                        ),
                      });
                    }}
                  >
                    <Icon>
                      <PlayIcon />
                    </Icon>
                    <Trans i18nKey="reopenPoll" defaults="Reopen poll" />
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => deletePollDialog.trigger()}>
                  <Icon>
                    <TrashIcon />
                  </Icon>
                  <span>
                    <Trans i18nKey="deleteMenuItem" defaults="Delete" />
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <Dialog {...deletePollDialog.dialogProps}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans i18nKey="deletePoll" />
            </DialogTitle>
            <DialogDescription>
              <Trans
                i18nKey="deletePollPrompt"
                defaults="Are you sure you want to delete <b>{title}</b>?"
                values={{ title }}
                components={{
                  b: <b className="font-bold" />,
                }}
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button />}>
              <Trans i18nKey="cancel" />
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                deletePollDialog.dismiss();
                toast.promise(deletePoll.mutateAsync({ pollId: id }), {
                  loading: <Trans i18nKey="loading" defaults="Loading..." />,
                  success: (
                    <Trans i18nKey="pollDeleted" defaults="Poll deleted" />
                  ),
                  error: (
                    <Trans
                      i18nKey="pollDeleteError"
                      defaults="Failed to delete poll"
                    />
                  ),
                });
              }}
              loading={deletePoll.isPending}
            >
              <Trans i18nKey="delete" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PollsInfiniteList({
  status,
  search,
  member,
  emptyState,
}: PollsInfiniteListProps) {
  const [data, { fetchNextPage, hasNextPage, isFetchingNextPage }] =
    trpc.polls.infiniteChronological.useSuspenseInfiniteQuery(
      {
        status,
        search,
        member,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  const polls = React.useMemo(
    () => data.pages.flatMap((page) => page.polls),
    [data.pages],
  );

  // Optimistic state for dragging
  const [items, setItems] = React.useState<typeof polls>([]);
  const [selectedPollIds, setSelectedPollIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const bulkDeleteDialog = useDialog();
  const router = useRouter();
  const utils = trpc.useUtils();
  const reorderMutation = trpc.polls.reorder.useMutation({
    onSuccess: () => {
      utils.polls.infiniteChronological.invalidate();
    },
  });
  const bulkActionMutation = trpc.polls.bulkAction.useMutation({
    onSuccess: async () => {
      setSelectedPollIds(new Set());
      await utils.polls.infiniteChronological.invalidate();
      router.refresh();
    },
  });

  const isFiltered = Boolean(status || search || member);

  React.useEffect(() => {
    setItems(polls);
    const pollIds = new Set(polls.map((poll) => poll.id));
    setSelectedPollIds(
      (selected) => new Set([...selected].filter((id) => pollIds.has(id))),
    );
  }, [polls]);

  const selectedPolls = items.filter((poll) => selectedPollIds.has(poll.id));
  const allLoadedSelected =
    items.length > 0 && items.every((poll) => selectedPollIds.has(poll.id));
  const canClose =
    selectedPolls.length > 0 &&
    selectedPolls.every((poll) => poll.status === "open");
  const canReopen =
    selectedPolls.length > 0 &&
    selectedPolls.every((poll) => poll.status === "closed");

  const runBulkAction = (action: "delete" | "close" | "reopen") => {
    const mutation = bulkActionMutation.mutateAsync({
      pollIds: [...selectedPollIds],
      action,
    });
    const actionLabel =
      action === "delete"
        ? "deleted"
        : action === "close"
          ? "closed"
          : "reopened";

    toast.promise(mutation, {
      loading: `Updating ${selectedPollIds.size} polls...`,
      success: `${selectedPollIds.size} polls ${actionLabel}`,
      error: (error) =>
        error instanceof Error ? error.message : "Failed to update polls",
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        reorderMutation.mutate({ pollIds: newItems.map((i) => i.id) });
        return newItems;
      });
    }
  };

  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  const handleLoadMore = React.useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  React.useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    if (!loadMoreElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          handleLoadMore();
        }
      },
      {
        threshold: 0.1,
      },
    );

    observer.observe(loadMoreElement);

    return () => {
      observer.unobserve(loadMoreElement);
    };
  }, [handleLoadMore]);

  if (polls.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-card-border bg-card/25 px-3 py-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allLoadedSelected}
            onChange={(event) =>
              setSelectedPollIds(
                event.target.checked
                  ? new Set(items.map((poll) => poll.id))
                  : new Set(),
              )
            }
            className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span>Select all loaded</span>
        </label>

        {selectedPollIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-muted-foreground text-sm">
              {selectedPollIds.size}{" "}
              {selectedPollIds.size === 1 ? "poll" : "polls"} selected
            </span>
            {canClose && (
              <Button
                size="sm"
                onClick={() => runBulkAction("close")}
                disabled={bulkActionMutation.isPending}
              >
                <CircleStopIcon />
                <Trans i18nKey="closePoll" defaults="Close" />
              </Button>
            )}
            {canReopen && (
              <Button
                size="sm"
                onClick={() => runBulkAction("reopen")}
                disabled={bulkActionMutation.isPending}
              >
                <PlayIcon />
                <Trans i18nKey="reopenPoll" defaults="Re-open" />
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => bulkDeleteDialog.trigger()}
              disabled={bulkActionMutation.isPending}
            >
              <TrashIcon />
              <Trans i18nKey="deleteMenuItem" defaults="Delete" />
            </Button>
          </div>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <StackedList>
            {items.map(
              ({
                id,
                title,
                status,
                closedReason,
                participants,
                user,
                voteCounts,
              }) => (
                <StackedListItem key={id} className="bg-background">
                  <PollListItem
                    id={id}
                    title={title}
                    status={status}
                    closedReason={closedReason}
                    participants={participants}
                    user={user}
                    voteCounts={voteCounts}
                    disableDrag={isFiltered || selectedPollIds.size > 0}
                    selected={selectedPollIds.has(id)}
                    onSelectedChange={(selected) =>
                      setSelectedPollIds((current) => {
                        const next = new Set(current);
                        if (selected) {
                          next.add(id);
                        } else {
                          next.delete(id);
                        }
                        return next;
                      })
                    }
                  />
                </StackedListItem>
              ),
            )}

            {hasNextPage && (
              <div ref={loadMoreRef} className="flex justify-center py-4">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2">
                    <Spinner />
                    <span className="text-muted-foreground text-sm">
                      <Trans i18nKey="loading" defaults="Loading..." />
                    </span>
                  </div>
                )}
              </div>
            )}

            {!hasNextPage && data.pages.length > 1 && (
              <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
                <Icon>
                  <StickerIcon />
                </Icon>
                <Trans
                  i18nKey="endOfList"
                  defaults="You've reached the end of the list"
                />
              </div>
            )}
          </StackedList>
        </SortableContext>
      </DndContext>

      <Dialog {...bulkDeleteDialog.dialogProps}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected polls</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedPollIds.size}{" "}
              {selectedPollIds.size === 1 ? "poll" : "polls"}? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button />}>
              <Trans i18nKey="cancel" />
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                bulkDeleteDialog.dismiss();
                runBulkAction("delete");
              }}
              loading={bulkActionMutation.isPending}
            >
              <Trans i18nKey="delete" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
