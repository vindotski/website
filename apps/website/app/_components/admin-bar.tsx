"use client";

import { ChevronDown, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { repoUrl, supabaseDashboardUrl, vercelProjectUrl } from "@/config/site";
import { isPublished, todayUtc } from "@/lib/content/publish";
import { useContentStatus } from "@/features/admin/api/get-content-status";
import { useUser } from "@/features/auth/api/get-user";
import LogoutButton from "@/features/auth/components/logout-button";

// Both inlined by next.config.ts. Spotcraft's dashboard edits a document at
// <site>/files/<path>
const deployEnv = process.env.DEPLOY_ENV;
const spotcraftUrl = process.env.SPOTCRAFT_URL;

const environment =
  deployEnv === "production"
    ? "Production"
    : deployEnv === "preview"
      ? "Preview"
      : "Local";

const dashboards = [
  { label: "Spotcraft", href: spotcraftUrl },
  { label: "New post", href: `${spotcraftUrl}/files/posts` },
  { label: "Vercel Analytics", href: `${vercelProjectUrl}/analytics` },
  { label: "Supabase", href: supabaseDashboardUrl() },
  { label: "GitHub", href: repoUrl },
];

function statusOf(date: string | null) {
  if (date === null) return "Draft";
  return isPublished(date, todayUtc())
    ? `Published · ${date}`
    : `Scheduled · ${date}`;
}

// WordPress-style: fixed above the site's header, for signed-in visitors
// only. Dashboards, where this is running, the page's status and its source,
// and the account
export default function AdminBar({ pathname }: { pathname: string }) {
  const user = useUser();
  const { data: item } = useContentStatus({ pathname });

  return (
    <div
      role="region"
      aria-label="Admin toolbar"
      className="dark fixed inset-x-0 top-0 z-20 flex h-(--admin-bar-height) items-center gap-2 bg-background px-2 text-xs text-foreground sm:gap-3 sm:px-gutter"
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="xs" />}
        >
          Admin
          <ChevronDown data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {dashboards.map((link) => (
            <DropdownMenuItem
              key={link.label}
              render={<a href={link.href} target="_blank" rel="noreferrer" />}
            >
              {link.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Badge variant={environment === "Production" ? "default" : "outline"}>
        {environment}
      </Badge>

      {/* A project or post page, with its document in Spotcraft */}
      {item && (
        <>
          <span className="hidden text-muted-foreground sm:inline">
            {statusOf(item.date)}
          </span>
          <a
            href={`${spotcraftUrl}/files/${item.path}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "ghost", size: "xs" })}
          >
            <Pencil data-icon="inline-start" />
            Edit
          </a>
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        {user.data?.email && (
          <span className="hidden text-muted-foreground md:inline">
            {user.data.email}
          </span>
        )}
        <LogoutButton variant="ghost" size="xs" />
      </div>
    </div>
  );
}
