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
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Button } from "@rallly/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rallly/ui/dialog";

interface PollGroupDTO {
  id: string;
  title: string;
  description: string | null;
  polls: { id: string; title: string; status: string }[];
}

function SortablePollItem({ poll }: { poll: { id: string; title: string } }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: poll.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center space-x-2 text-sm bg-muted/10 hover:bg-muted/20 p-1.5 rounded border border-transparent hover:border-border mb-1 group transition-colors cursor-grab touch-none"
    >
      <div className="text-muted-foreground hover:text-foreground opacity-50 group-hover:opacity-100">
        <GripVertical size={14} className="pointer-events-none" />
      </div>
      <span className="font-medium truncate pointer-events-none">{poll.title}</span>
    </li>
  );
}

function SortableGroupPolls({
  groupId,
  initialPolls,
  onReorder,
}: {
  groupId: string;
  initialPolls: { id: string; title: string }[];
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
          <li key={poll.id} className="flex items-center space-x-2 text-sm bg-muted/10 p-1.5 rounded border border-transparent mb-1">
            <span className="font-medium truncate pl-6">{poll.title}</span>
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

export default function PollGroupsDashboardPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPollIds, setSelectedPollIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  
  const utils = trpc.useUtils();

  // Edit Group state
  const [editingGroup, setEditingGroup] = useState<PollGroupDTO | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSelectedPollIds, setEditSelectedPollIds] = useState<string[]>([]);

  const groupsQuery = trpc.pollGroups.list.useQuery();
  const pollsQuery = trpc.polls.infiniteChronological.useInfiniteQuery(
    {},
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: 1,
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
      groupsQuery.refetch();
    },
  });

  const deleteGroupMutation = trpc.pollGroups.delete.useMutation({
    onSuccess: () => {
      groupsQuery.refetch();
    },
  });

  const duplicateGroupMutation = trpc.pollGroups.duplicate.useMutation({
    onSuccess: () => {
      groupsQuery.refetch();
      utils.polls.invalidate();
      setDuplicatingId(null);
    },
    onError: () => {
      setDuplicatingId(null);
    }
  });

  const closeGroupMutation = trpc.pollGroups.close.useMutation({
    onSuccess: () => {
      groupsQuery.refetch();
      utils.polls.invalidate();
      setClosingId(null);
    },
    onError: () => {
      setClosingId(null);
    }
  });

  const reopenGroupMutation = trpc.pollGroups.reopen.useMutation({
    onSuccess: () => {
      groupsQuery.refetch();
      utils.polls.invalidate();
      setReopeningId(null);
    },
    onError: () => {
      setReopeningId(null);
    }
  });

  const reorderGroupMutation = trpc.pollGroups.reorder.useMutation({
    onSuccess: () => {
      groupsQuery.refetch();
    },
  });

  const availablePolls =
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

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createGroupMutation.mutate({
      title,
      description,
      pollIds: selectedPollIds,
    });
  };

  const handleOpenEdit = (group: PollGroupDTO) => {
    setEditingGroup(group);
    setEditTitle(group.title);
    setEditDescription(group.description || "");
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Poll Groups</h1>
          <p className="text-muted-foreground mt-1">
            Group multiple polls under a single link for non-member voters.
          </p>
        </div>

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
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {groupsQuery.data?.map((group) => {
            const isGroupClosed = group.polls.length > 0 && group.polls.every((p) => p.status === "closed");
            return (
            <div key={group.id} className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{group.title}</h2>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {group.polls.length} Polls
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(group)}
                      className="h-8 px-2.5 text-xs"
                    >
                      ✏️ Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={duplicatingId === group.id}
                      onClick={() => {
                        setDuplicatingId(group.id);
                        duplicateGroupMutation.mutate({ groupId: group.id });
                      }}
                      className="h-8 px-2.5 text-xs"
                    >
                      {duplicatingId === group.id ? "⏳..." : "📄 Duplicate"}
                    </Button>
                    {isGroupClosed ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reopeningId === group.id}
                        onClick={() => {
                          if (confirm("Are you sure you want to reopen all polls in this group?")) {
                            setReopeningId(group.id);
                            reopenGroupMutation.mutate({ groupId: group.id });
                          }
                        }}
                        className="h-8 px-2.5 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        {reopeningId === group.id ? "⏳..." : "🟢 Re-open"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={closingId === group.id}
                        onClick={() => {
                          if (confirm("Are you sure you want to close all open polls in this group?")) {
                            setClosingId(group.id);
                            closeGroupMutation.mutate({ groupId: group.id });
                          }
                        }}
                        className="h-8 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {closingId === group.id ? "⏳..." : "🛑 Close"}
                      </Button>
                    )}
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
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopyLink(group.id)}
                >
                  {copiedId === group.id ? "✓ Copied!" : "Copy Group Link"}
                </Button>

                <a
                  href={`/g/${group.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View Public Page ↗
                </a>
              </div>
            </div>
            );
          })}
        </div>
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
                <label className="block text-sm font-medium mb-2">Add / Remove Polls</label>
                {(() => {
                  const displayPolls = [...availablePolls];
                  editingGroup.polls.forEach(p => {
                    if (!displayPolls.some(dp => dp.id === p.id)) {
                      displayPolls.push(p);
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
                  <Button type="button" variant="outline" onClick={() => setEditingGroup(null)}>
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
    </div>
  );
}
