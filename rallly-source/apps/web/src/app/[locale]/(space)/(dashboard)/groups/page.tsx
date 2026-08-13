"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/trpc/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, CheckIcon, XIcon, ClockIcon, DownloadIcon, MoreHorizontal, ExternalLink, MailIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@rallly/ui/dropdown-menu";
import { Button } from "@rallly/ui/button";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rallly/ui/dialog";

interface PollGroupDTO {
  requireEmailVerification: boolean;
  id: string;
  title: string;
  description: string | null;
  polls: { id: string; title: string; status: string }[];
}

function SortablePollItem({ poll }: { poll: { id: string; title: string; voteCounts?: { yes: number; no: number; ifNeedBe: number } } }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: poll.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center justify-between text-sm bg-muted/10 hover:bg-muted/20 p-1.5 rounded border border-transparent hover:border-border mb-1 group transition-colors cursor-grab touch-none"
    >
      <div className="flex items-center space-x-2 overflow-hidden flex-1">
        <div className="text-muted-foreground hover:text-foreground opacity-50 group-hover:opacity-100 flex-shrink-0">
          <GripVertical size={14} className="pointer-events-none" />
        </div>
        <span className="font-medium truncate pointer-events-none">{poll.title}</span>
      </div>
      
      {poll.voteCounts && (
        <div className="flex items-center gap-3 text-xs font-medium px-2 flex-shrink-0">
          <span className="flex items-center gap-1 text-green-600">
            <CheckIcon className="h-3.5 w-3.5" />
            {poll.voteCounts.yes}
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <XIcon className="h-3.5 w-3.5" />
            {poll.voteCounts.no}
          </span>
          <span className="flex items-center gap-1 text-yellow-500">
            <ClockIcon className="h-3.5 w-3.5" />
            {poll.voteCounts.ifNeedBe}
          </span>
        </div>
      )}
      <a 
        href={`/poll/${poll.id}`} 
        target="_blank" 
        rel="noreferrer"
        className="ml-2 mr-1 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        title="View Poll"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ExternalLink size={14} />
      </a>
    </li>
  );
}

function SortableGroupPolls({
  groupId,
  initialPolls,
  onReorder,
}: {
  groupId: string;
  initialPolls: { id: string; title: string; voteCounts?: { yes: number; no: number; ifNeedBe: number } }[];
  onReorder: (groupId: string, pollIds: string[]) => void;
}) {
  const [polls, setPolls] = useState(initialPolls);

  useEffect(() => {
    setPolls(initialPolls);
  }, [initialPolls]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPolls((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        onReorder(groupId, newItems.map((i) => i.id));
        return newItems;
      });
    }
  };

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  if (!isMounted) {
    return (
      <ul className="text-sm">
        {polls.map((poll) => (
          <li key={poll.id} className="flex items-center justify-between text-sm bg-muted/10 p-1.5 rounded border border-transparent mb-1">
            <span className="font-medium truncate pl-6">{poll.title}</span>
            {poll.voteCounts && (
              <div className="flex items-center gap-3 text-xs font-medium px-2 flex-shrink-0">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckIcon className="h-3.5 w-3.5" />
                  {poll.voteCounts.yes}
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <XIcon className="h-3.5 w-3.5" />
                  {poll.voteCounts.no}
                </span>
                <span className="flex items-center gap-1 text-yellow-500">
                  <ClockIcon className="h-3.5 w-3.5" />
                  {poll.voteCounts.ifNeedBe}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={polls.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <ul className="text-sm">
          {polls.map((poll) => (
            <SortablePollItem key={poll.id} poll={poll} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableGroupWrapper({ id, children }: { id: string; children: (listeners: any, attributes: any) => React.ReactNode }) {
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
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      {children(listeners, attributes)}

    </div>
  );
}

export default function PollGroupsDashboardPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPollIds, setSelectedPollIds] = useState<string[]>([]);
  const [newRequireEmailVerification, setNewRequireEmailVerification] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  
  const utils = trpc.useUtils();

  // Edit Group state
  const [editingGroup, setEditingGroup] = useState<PollGroupDTO | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRequireEmailVerification, setEditRequireEmailVerification] = useState(true);
  const [editSelectedPollIds, setEditSelectedPollIds] = useState<string[]>([]);

  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderGroup, setReminderGroup] = useState<PollGroupDTO | null>(null);
  const [remindableParticipants, setRemindableParticipants] = useState<{name: string, email: string}[]>([]);
  const [isLoadingReminder, setIsLoadingReminder] = useState(false);

  const groupsQuery = trpc.pollGroups.list.useQuery();
  const allPollsQuery = trpc.polls.listAll.useQuery();
  const pollsQuery = trpc.polls.infiniteChronological.useInfiniteQuery(
    {},
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const createGroupMutation = trpc.pollGroups.create.useMutation({
    onSuccess: () => {
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setSelectedPollIds([]);
      groupsQuery.refetch();
    },
  });

  const updateGroupMutation = trpc.pollGroups.update.useMutation({
    onSuccess: () => {
      setEditingGroup(null);
      utils.pollGroups.invalidate();
    },
  });

  const sendReminderEmailsMutation = trpc.pollGroups.sendReminderEmails.useMutation();
  const deleteGroupMutation = trpc.pollGroups.delete.useMutation({
    onSuccess: () => {
      utils.pollGroups.invalidate();
    },
  });

  const duplicateGroupMutation = trpc.pollGroups.duplicate.useMutation({
    onSuccess: () => {
      utils.pollGroups.invalidate();
      utils.polls.invalidate();
      setDuplicatingId(null);
    },
    onError: () => {
      setDuplicatingId(null);
    }
  });

  const closeGroupMutation = trpc.pollGroups.close.useMutation({
    onSuccess: () => {
      utils.pollGroups.invalidate();
      utils.polls.invalidate();
      setClosingId(null);
    },
    onError: () => {
      setClosingId(null);
    }
  });

  const reopenGroupMutation = trpc.pollGroups.reopen.useMutation({
    onSuccess: () => {
      utils.pollGroups.invalidate();
      utils.polls.invalidate();
      setReopeningId(null);
    },
    onError: () => {
      setReopeningId(null);
    }
  });

  const reorderGroupMutation = trpc.pollGroups.reorder.useMutation({
    onSuccess: () => {
      utils.pollGroups.invalidate();
    },
  });

  const reorderGroupsMutation = trpc.pollGroups.reorderGroups.useMutation({
    onSuccess: () => {
      utils.pollGroups.invalidate();
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredGroups = groupsQuery.data?.filter((group) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      group.title.toLowerCase().includes(term) ||
      group.polls.some((poll) => poll.title.toLowerCase().includes(term))
    );
  });

  const handleGroupsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && groupsQuery.data) {
      const oldIndex = groupsQuery.data.findIndex((g) => g.id === active.id);
      const newIndex = groupsQuery.data.findIndex((g) => g.id === over.id);
      const newOrder = arrayMove(groupsQuery.data.map((g) => g.id), oldIndex, newIndex);
      
      utils.pollGroups.list.setData(undefined, (old) => {
        if (!old) return old;
        const sorted = [...old].sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
        return sorted;
      });

      reorderGroupsMutation.mutate({ groupIds: newOrder });
    }
  };

  const availablePolls = allPollsQuery.data || [];
  //const oldAvailablePolls =
    pollsQuery.data?.pages.flatMap((page) => page.polls) || [];

  const handleTogglePoll = (id: string, isEdit: boolean) => {
    if (isEdit) {
      setEditSelectedPollIds((prev) =>
        prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
      );
    } else {
      setSelectedPollIds((prev) =>
        prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
      );
    }
  };

  const handleEmailReminder = async (group: PollGroupDTO) => {
    try {
      setIsLoadingReminder(true);
      setRemindableParticipants([]);
      setReminderGroup(group);
      setReminderSubject(`Reminder: ${group.title}`);
      setReminderBody(`Hi everyone,\n\nPlease remember to fill out your availability for the polls in the ${group.title} group:\n\n${window.location.origin}/g/${group.id}\n\nThanks!`);
      setReminderModalOpen(true);
      
      const participants = await utils.client.pollGroups.getRemindableParticipants.query({ groupId: group.id });
      setRemindableParticipants(participants);
    } catch (err) {
      console.error(err);
      alert("Failed to retrieve emails.");
      setReminderModalOpen(false);
    } finally {
      setIsLoadingReminder(false);
    }
  };

  const executeEmailReminder = () => {
    if (!reminderGroup || remindableParticipants.length === 0) return;
    
    sendReminderEmailsMutation.mutate(
      { groupId: reminderGroup.id, subject: reminderSubject, body: reminderBody },
      {
        onSuccess: (data) => {
          alert(`Successfully sent ${data.count} reminder email(s)!`);
          setReminderModalOpen(false);
        },
        onError: (err) => {
          console.error(err);
          alert("Failed to send reminder emails.");
        }
      }
    );
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createGroupMutation.mutate({
      title,
      description,
      requireEmailVerification: newRequireEmailVerification,
      pollIds: selectedPollIds,
    });
  };

  const handleOpenEdit = (group: PollGroupDTO) => {
    setEditingGroup(group);
    setEditTitle(group.title);
    setEditDescription(group.description || "");
    setEditRequireEmailVerification(group.requireEmailVerification ?? true);
    setEditSelectedPollIds(group.polls.map((p) => p.id));
  };

  const handleUpdateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !editTitle.trim()) return;

    updateGroupMutation.mutate({
      groupId: editingGroup.id,
      title: editTitle,
      description: editDescription,
      pollIds: editSelectedPollIds,
    });
  };

  const handleCopyLink = (groupId: string) => {
    const url = `${window.location.origin}/g/${groupId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(groupId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Poll Groups</h1>
          <p className="text-muted-foreground mt-1">
            Group multiple polls under a single link for non-member voters.
          </p>
        </div>

        <div className="w-full md:flex-1 md:max-w-sm md:mx-4">
          <input
            type="text"
            placeholder="Filter groups and polls..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/groups/export/all"
            download
            className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border"
          >
            <DownloadIcon className="mr-2 h-4 w-4" />
            Export All
          </a>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>+ Create Poll Group</Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Poll Group</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4 py-2">
              <div>
                <label className="block text-sm font-medium">Group Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q3 Team Planning Sessions"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instructions for voters..."
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                
              <div>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newRequireEmailVerification}
                    onChange={(e) => setNewRequireEmailVerification(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>Require Email Verification</span>
                </label>
                <p className="text-xs text-muted-foreground mt-1">If unchecked, anyone can edit votes by typing the email address.</p>
              </div>

              <label className="block text-sm font-medium mb-2">Select Polls to Include</label>
                {pollsQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground">Loading polls...</p>
                ) : availablePolls.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No polls available in this space.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
                    {availablePolls.map((poll) => (
                      <label
                        key={poll.id}
                        className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPollIds.includes(poll.id)}
                          onChange={() => handleTogglePoll(poll.id, false)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="font-medium">{poll.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="default" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createGroupMutation.isPending || !title.trim()}
                >
                  {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {groupsQuery.isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading poll groups...
        </div>
      ) : groupsQuery.data?.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No Poll Groups Created Yet</h3>
          <p className="text-muted-foreground mt-1">
            Create a poll group to share multiple polls using a single link.
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            + Create First Poll Group
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupsDragEnd}>
          <SortableContext items={(filteredGroups || []).map((g) => g.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {filteredGroups?.map((group) => {
                const isGroupClosed = group.polls.length > 0 && group.polls.every((p) => p.status === "closed");
                const isDragDisabled = !!searchFilter.trim();
                return (
                  <SortableGroupWrapper key={group.id} id={group.id}>
                    {(listeners, attributes) => (
                      <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between h-full group/card relative">
                        {!isDragDisabled && (
                          <div
                            {...listeners}
                            {...attributes}
                            className="absolute -top-3 -left-3 bg-card border rounded-full p-1.5 shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity cursor-grab hover:bg-muted text-muted-foreground hover:text-foreground touch-none"
                            title="Drag to reorder group"
                          >
                            <GripVertical size={16} />
                          </div>
                        )}
                        <div>
                          <div className="flex flex-col 2xl:flex-row 2xl:items-start justify-between gap-4">
                            <div>
                              <h2 className="text-xl font-bold">{group.title}</h2>
                              {group.description && (
                                <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                {group.polls.length} Polls
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenEdit(group)} className="cursor-pointer flex items-center gap-2">
                                    ✏️ Edit
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem asChild className="cursor-pointer">
                                    <a href={`/g/${group.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 w-full">
                                      <ExternalLink className="w-4 h-4" />
                                      View public page
                                    </a>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem onClick={() => handleEmailReminder(group)} className="cursor-pointer flex items-center gap-2">
                                    <MailIcon className="w-4 h-4" />
                                    Email reminder
                                  </DropdownMenuItem>

                                  {isGroupClosed ? (
                                    <DropdownMenuItem 
                                      className="text-green-600 focus:text-green-600 focus:bg-green-50 cursor-pointer"
                                      disabled={reopeningId === group.id}
                                      onClick={() => {
                                        if (confirm("Are you sure you want to reopen all polls in this group?")) {
                                          setReopeningId(group.id);
                                          reopenGroupMutation.mutate({ groupId: group.id });
                                        }
                                      }}
                                    >
                                      🟢 {reopeningId === group.id ? "Re-opening..." : "Re-open"}
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem 
                                      className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                      disabled={closingId === group.id}
                                      onClick={() => {
                                        if (confirm("Are you sure you want to close all open polls in this group?")) {
                                          setClosingId(group.id);
                                          closeGroupMutation.mutate({ groupId: group.id });
                                        }
                                      }}
                                    >
                                      🛑 {closingId === group.id ? "Closing..." : "Close"}
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem 
                                    className="cursor-pointer"
                                    disabled={duplicatingId === group.id}
                                    onClick={() => {
                                      setDuplicatingId(group.id);
                                      duplicateGroupMutation.mutate({ groupId: group.id });
                                    }}
                                  >
                                    📄 {duplicatingId === group.id ? "Duplicating..." : "Duplicate"}
                                  </DropdownMenuItem>

                                  <DropdownMenuItem asChild>
                                    <a
                                      href={`/groups/${group.id}/export/csv`}
                                      download
                                      className="cursor-pointer flex items-center gap-2"
                                    >
                                      <DownloadIcon className="w-4 h-4" />
                                      Export CSV
                                    </a>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          <div className="mt-4 border-t pt-3 space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Included Polls:</span>
                            {group.polls.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">No polls assigned yet. Click Edit to add polls.</p>
                            ) : (
                              <SortableGroupPolls
                                groupId={group.id}
                                initialPolls={group.polls}
                                onReorder={(groupId, pollIds) => {
                                  reorderGroupMutation.mutate({ groupId, pollIds });
                                }}
                              />
                            )}
                          </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between border-t pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(group.id)}
                          >
                            {copiedId === group.id ? "✓ Copied!" : "Get Share Link"}
                          </Button>

                          <div className="flex items-center gap-4">
                            <Link href={`/groups/${group.id}/responses`}>
                              <Button variant="default" size="sm">
                                View Responses
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </SortableGroupWrapper>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Edit Poll Group Modal */}
      {editingGroup && (
        <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Poll Group</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateGroup} className="space-y-4 py-2">
              <div>
                <label className="block text-sm font-medium">Group Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Description (optional)</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editRequireEmailVerification}
                    onChange={(e) => setEditRequireEmailVerification(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>Require Email Verification</span>
                </label>
                <p className="text-xs text-muted-foreground mt-1">If unchecked, anyone can edit votes by typing the email address.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Add / Remove Polls</label>
                {(() => {
                  const displayPolls = [...availablePolls];
                  editingGroup.polls.forEach(p => {
                    if (!displayPolls.some(dp => dp.id === p.id)) {
                      displayPolls.push(p as any);
                    }
                  });
                  return displayPolls.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No polls available in this space.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
                      {displayPolls.map((poll) => (
                        <label
                          key={poll.id}
                          className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={editSelectedPollIds.includes(poll.id)}
                            onChange={() => handleTogglePoll(poll.id, true)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="font-medium">{poll.title}</span>
                        </label>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this poll group?")) {
                      deleteGroupMutation.mutate({ groupId: editingGroup.id });
                      setEditingGroup(null);
                    }
                  }}
                >
                  Delete Group
                </Button>

                <div className="flex space-x-2">
                  <Button type="button" variant="default" onClick={() => setEditingGroup(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateGroupMutation.isPending || !editTitle.trim()}
                  >
                    {updateGroupMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Email Reminder Modal */}
      <Dialog open={reminderModalOpen} onOpenChange={setReminderModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Email Reminder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {isLoadingReminder ? (
              <p className="text-sm text-muted-foreground">Loading participants...</p>
            ) : remindableParticipants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No participants found who voted 'Yes'.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm">
                  You are about to email <strong>{remindableParticipants.length}</strong> participants who voted "Yes".
                </p>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Subject</label>
                  <input
                    type="text"
                    value={reminderSubject}
                    onChange={(e) => setReminderSubject(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Message Body</label>
                  <textarea
                    value={reminderBody}
                    onChange={(e) => setReminderBody(e.target.value)}
                    rows={6}
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>

                <details className="text-sm border rounded-md p-3 group">
                  <summary className="font-medium cursor-pointer flex items-center justify-between">
                    Show Participants
                    <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <ul className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                    {remindableParticipants.map((p, i) => (
                      <li key={i} className="flex justify-between items-center text-xs">
                        <span>{p.name}</span>
                        <span className="text-muted-foreground">{p.email}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setReminderModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={executeEmailReminder} 
              disabled={isLoadingReminder || remindableParticipants.length === 0 || sendReminderEmailsMutation.isPending}
            >
              {sendReminderEmailsMutation.isPending ? "Sending..." : "Send Emails"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

