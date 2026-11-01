"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { track } from "@vercel/analytics";
import { Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { pageFromPath } from "@/lib/analytics/track";
import { ApiError } from "@/lib/api-client";
import { useSearchResults } from "../api/get-search-results";

type Status = "idle" | "loading" | "done" | "error" | "signed-out";

// Each search is a request to Spotcraft, so wait for a pause in typing
const minLength = 3;
const debounceMs = 400;
const limit = 8;

function message(status: Status, query: string, count: number) {
  if (status === "loading") return "Searching…";
  if (status === "error") return "Search is unavailable. Try again in a moment.";
  if (status === "signed-out") return "Your session ended. Sign in again to search.";
  if (status === "done") {
    if (count === 0) return `No matches for “${query.trim()}”`;
    return count === 1 ? "1 result" : `${count} results`;
  }
  return query.trim().length > 0
    ? `Type at least ${minLength} characters`
    : "Search projects and posts";
}

// The search button in the header, and ⌘K / Ctrl+K anywhere, open a command
// palette that searches as you type. Arrow keys pick a result and Enter opens
// it. The server ranks the results, so the palette doesn't filter them
export default function SearchDialog() {
  const [open, setOpen] = useState(false);
  // What's typed, and what's searched: the typed query after a pause
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const router = useRouter();
  const timer = useRef<number | undefined>(undefined);
  // The last query sent to Analytics, so a query isn't counted twice in a row
  const lastTracked = useRef<string | null>(null);

  const typed = query.trim();
  const searched = submitted.trim();
  // The results on screen stay until the next ones arrive
  const search = useSearchResults({
    query: searched,
    limit,
    queryConfig: {
      enabled: searched.length >= minLength,
      placeholderData: keepPreviousData,
    },
  });

  const status: Status =
    typed.length < minLength
      ? "idle"
      : typed !== searched || search.isPending || search.isPlaceholderData
        ? "loading"
        : search.error instanceof ApiError && search.error.status === 401
          ? "signed-out"
          : search.isError
            ? "error"
            : "done";
  const results = status === "idle" ? [] : (search.data ?? []);

  // How many results a search found; never the query itself, which is
  // whatever the visitor typed. Also when the results come from the cache
  useEffect(() => {
    if (!search.isSuccess || search.isPlaceholderData) return;
    const key = searched.toLowerCase();
    if (lastTracked.current === key) return;
    lastTracked.current = key;
    track("search", {
      results: search.data.length,
      page: pageFromPath(window.location.pathname),
    });
  }, [search.isSuccess, search.isPlaceholderData, search.data, searched]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer.current);
    };
  }, []);

  function onValueChange(value: string) {
    setQuery(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSubmitted(value), debounceMs);
  }

  // cmdk always highlights the first result, so Enter while a newer search
  // is pending would open a stale one; search straight away instead
  function onSelect(url: string) {
    if (status === "loading") {
      window.clearTimeout(timer.current);
      setSubmitted(query);
      return;
    }
    const index = results.findIndex((result) => result.url === url);
    track("search_select", {
      type: results[index]?.type.toLowerCase() ?? "unknown",
      position: index + 1,
      page: pageFromPath(window.location.pathname),
    });
    setOpen(false);
    router.push(url);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          // A 44px target that doesn't push the header
          <Button variant="ghost" size="icon-lg" className="-my-2 -mr-2" />
        }
        aria-label="Search"
        title="Search (⌘K)"
      >
        <SearchIcon />
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        // Phones: the whole screen; wider screens: a panel near the top, so
        // results have room to grow downwards
        className="flex h-dvh max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 max-sm:inset-0 max-sm:translate-x-0 max-sm:translate-y-0 sm:top-[12vh] sm:h-auto sm:max-h-[76vh] sm:max-w-[640px] sm:translate-y-0"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search projects and posts. Use the arrow keys to pick a result.
        </DialogDescription>
        <Command shouldFilter={false} className="rounded-none!">
          <CommandInput
            value={query}
            onValueChange={onValueChange}
            placeholder="Search projects and posts"
            // 16px or more keeps iOS from zooming in on focus
            className="text-base"
          />
          <p
            className="px-3 py-2 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {message(status, query, results.length)}
          </p>
          <CommandList className="max-h-none flex-1">
            {results.length > 0 && (
              <CommandGroup>
                {results.map((result) => (
                  <CommandItem
                    key={result.url}
                    value={result.url}
                    onSelect={onSelect}
                    className="items-start"
                  >
                    {/* A real link, so ⌘, Ctrl, Shift and middle clicks open a
                        new tab or window. Plain clicks go through onSelect */}
                    <Link
                      href={result.url}
                      tabIndex={-1}
                      className="flex flex-1 flex-col gap-1"
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey) {
                          event.stopPropagation();
                          return;
                        }
                        event.preventDefault();
                      }}
                    >
                      <Badge variant="outline">{result.type}</Badge>
                      <span className="font-medium">
                        {result.title}
                        {result.heading && ` — ${result.heading}`}
                      </span>
                      <span className="text-muted-foreground">
                        {result.snippet}
                      </span>
                    </Link>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
