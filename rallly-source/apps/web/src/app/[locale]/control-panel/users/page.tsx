import { subject } from "@casl/ability";
import type { Prisma } from "@rallly/database";
import { prisma } from "@rallly/database";
import type { Metadata } from "next";
import * as z from "zod";
import {
  SettingsPage,
  SettingsPageAction,
  SettingsPageContent,
  SettingsPageDescription,
  SettingsPageHeader,
  SettingsPageTitle,
} from "@/components/settings-layout";
import { defineAbilityFor } from "@/features/user/ability";
import { requireAdmin } from "@/features/user/loaders";
import { Trans } from "@/i18n/client";
import { getTranslation } from "@/i18n/server";
import { AddUserDialog } from "./add-user-dialog";
import { UsersList } from "./users-list";

async function loadData({
  page,
  pageSize,
  q,
  role,
}: {
  page: number;
  pageSize: number;
  q?: string;
  role?: "admin" | "user";
}) {
  const user = await requireAdmin();

  const where: Prisma.UserWhereInput = {
    isAnonymous: false,
  };

  if (q) {
    where.OR = [
      {
        name: {
          contains: q,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: q,
          mode: "insensitive",
        },
      },
    ];
  }

  if (role) {
    where.role = role;
  }

  const [allUsers, totalUsers, spaces] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        banned: true,
        createdAt: true,
        qrCodeToken: true,
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
      where,
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.user.count({
      where,
    }),
    prisma.space.findMany({
      select: {
        id: true,
        name: true,
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const ability = defineAbilityFor({ role: user.role, id: user.id });

  return {
    adminUser: user,
    allUsers: allUsers.map((u) => ({
      ...u,
      image: u.image ?? undefined,
      canChangeRole: ability.can("update", subject("User", u), "role"),
      canBan: ability.can("update", subject("User", u), "banned"),
      canDelete: ability.can("delete", subject("User", u)),
    })),
    totalUsers,
    spaces,
  };
}

const searchParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).default(10),
});

const roleSchema = z.enum(["admin", "user"]).optional().catch(undefined);

export default async function AdminPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const { page, pageSize } = searchParamsSchema.parse(searchParams);

  const { allUsers, totalUsers, spaces } = await loadData({
    page,
    pageSize,
    q: searchParams.q ? String(searchParams.q) : undefined,
    role: roleSchema.parse(searchParams.role),
  });

  const totalItems = totalUsers;

  return (
    <SettingsPage>
      <SettingsPageHeader>
        <SettingsPageTitle>
          <Trans i18nKey="users" defaults="Users" />
        </SettingsPageTitle>
        <SettingsPageDescription>
          <Trans
            i18nKey="usersDescription"
            defaults="Manage users on this instance"
          />
        </SettingsPageDescription>
        <SettingsPageAction>
          <AddUserDialog spaces={spaces} />
        </SettingsPageAction>
      </SettingsPageHeader>
      <SettingsPageContent>
        <UsersList
          key={allUsers.map((user) => user.id).join(":")}
          users={allUsers}
          currentPage={page}
          totalItems={totalItems}
          pageSize={pageSize}
        />
      </SettingsPageContent>
    </SettingsPage>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getTranslation(locale);
  return {
    title: t("users", {
      defaultValue: "Users",
    }),
  };
}
