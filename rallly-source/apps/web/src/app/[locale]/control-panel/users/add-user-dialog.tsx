"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@rallly/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rallly/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@rallly/ui/form";
import { Input } from "@rallly/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rallly/ui/select";
import { toast } from "@rallly/ui/sonner";
import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Trans, useTranslation } from "@/i18n/client";
import { useSafeAction } from "@/lib/safe-action/client";
import { addUserAction } from "./actions";

function useAddUserSchema() {
  const { t } = useTranslation();

  return useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(1, {
            error: t("nameRequired", { defaultValue: "Name is required" }),
          }),
        email: z.email({
          error: t("invalidEmailAddress", {
            defaultValue: "Please enter a valid email address",
          }),
        }),
        role: z.enum(["user", "admin"]),
        spaceIds: z.array(z.string()),
      }),
    [t],
  );
}

export function AddUserDialog({
  spaces,
}: {
  spaces: Array<{
    id: string;
    name: string;
    owner: { name: string; email: string };
  }>;
}) {
  const { t } = useTranslation();
  const schema = useAddUserSchema();
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      role: "user",
      spaceIds: [],
    },
  });

  const addUser = useSafeAction(addUserAction, {
    onSuccess: ({ data }) => {
      if (!data) {
        return;
      }

      if (data.success) {
        toast.success(t("userAdded", { defaultValue: "User added" }));
        form.reset();
        setOpen(false);
        return;
      }

      if (data.reason === "email_exists") {
        form.setError("email", {
          type: "manual",
          message: t("userEmailExists", {
            defaultValue: "A user with this email already exists",
          }),
        });
        return;
      }

      form.setError("root", {
        type: "manual",
        message: t("selectedSpacesFull", {
          defaultValue: "No seats are available in: {spaces}",
          spaces: data.spaceNames.join(", "),
        }),
      });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          form.reset();
        }
      }}
    >
      <DialogTrigger render={<Button variant="primary" />}>
        <PlusIcon />
        <Trans i18nKey="addUser" defaults="Add user" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="addUser" defaults="Add user" />
          </DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="addUserDescription"
              defaults="Create an account and optionally add it to spaces. The user can sign in using email verification."
            />
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              form.clearErrors("root");
              await addUser.executeAsync(values);
            })}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="name" defaults="Name" />
                  </FormLabel>
                  <FormControl>
                    <Input autoComplete="name" maxLength={100} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="email" defaults="Email" />
                  </FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="type" defaults="Type" />
                  </FormLabel>
                  <Select
                    items={{
                      user: t("member", { defaultValue: "Member" }),
                      admin: t("admin", { defaultValue: "Admin" }),
                    }}
                    value={field.value}
                    onValueChange={(value) => {
                      if (value) {
                        field.onChange(value);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">
                        <Trans i18nKey="member" defaults="Member" />
                      </SelectItem>
                      <SelectItem value="admin">
                        <Trans i18nKey="admin" defaults="Admin" />
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="spaceIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans
                      i18nKey="spacesToAddTo"
                      defaults="Spaces to add to"
                    />
                  </FormLabel>
                  {spaces.length > 0 ? (
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                      {spaces.map((space) => {
                        const checked = field.value.includes(space.id);
                        return (
                          <label
                            key={space.id}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                field.onChange(
                                  event.target.checked
                                    ? [...field.value, space.id]
                                    : field.value.filter(
                                        (spaceId) => spaceId !== space.id,
                                      ),
                                );
                              }}
                              className="size-4 accent-primary"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm">
                                {space.name}
                              </span>
                              <span className="block truncate text-muted-foreground text-xs">
                                {space.owner.name} · {space.owner.email}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      <Trans
                        i18nKey="noSpacesAvailable"
                        defaults="No spaces available"
                      />
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root?.message ? (
              <p className="text-destructive text-sm">
                {form.formState.errors.root.message}
              </p>
            ) : null}
            <DialogFooter>
              <DialogClose render={<Button />}>
                <Trans i18nKey="cancel" defaults="Cancel" />
              </DialogClose>
              <Button
                type="submit"
                variant="primary"
                loading={addUser.isExecuting}
              >
                <Trans i18nKey="addUser" defaults="Add user" />
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
