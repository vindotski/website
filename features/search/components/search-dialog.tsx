"use client";

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
import type { SearchResult } from "../types";

type Status = "idle" | "loading" | "done" | "error" | "signed-out";

// Each search embeds the query on the server, so wait for a pause in typing
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
    : "Search work, play and posts";
}

// The search button in the header, and ⌘K / Ctrl+K anywhere, open a command
// palette that searches as you type. Arrow keys pick a result and Enter opens
// it. The server ranks the results, so the palette doesn't filter them
export default function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const router = useRouter();
  const timer = useRef<number | undefined>(undefined);
  const request = useRef<AbortController | null>(null);
  // Results by query, so going back to an earlier query doesn't search again
  const cache = useRef(new Map<string, SearchResult[]>());
  // The last query sent to Analytics, so Enter on the same one isn't counted
  // twice
  const lastTracked = useRef<string | null>(null);

  // How many results a search found; never the query itself, which is
  // whatever the visitor typed
  function trackSearch(key: string, found: SearchResult[]) {
    if (lastTracked.current === key) return;
    lastTracked.current = key;
    track("search", {
      results: found.length,
      page: pageFromPath(window.location.pathname),
    });
  }

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
      request.current?.abort();
    };
  }, []);

  async function search(value: string) {
    window.clearTimeout(timer.current);
    // A newer query wins, so results never arrive out of order
    request.current?.abort();

    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (trimmed.length < minLength) {
      setResults([]);
      setStatus("idle");
      return;
    }
    const cached = cache.current.get(key);
    if (cached) {
      setResults(cached);
      setStatus("done");
      trackSearch(key, cached);
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    setStatus("loading");
    try {
      const params = new URLSearchParams({ q: trimmed, limit: String(limit) });
      const response = await fetch(`/api/search?${params}`, {
        signal: controller.signal,
      });
      if (response.status === 401) {
        setResults([]);
        setStatus("signed-out");
        return;
      }
      if (!response.ok) throw new Error(`search answered ${response.status}`);
      const data: { results: SearchResult[] } = await response.json();
      cache.current.set(key, data.results);
      setResults(data.results);
      setStatus("done");
      trackSearch(key, data.results);
    } catch {
      if (controller.signal.aborted) return;
      setResults([]);
      setStatus("error");
    }
  }

  function onValueChange(value: string) {
    setQuery(value);
    // The results on screen are for an older query from here on
    if (value.trim().length >= minLength) setStatus("loading");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => search(value), debounceMs);
  }

  // cmdk always highlights the first result, so Enter while a newer search
  // is pending would open a stale one; search straight away instead
  function onSelect(url: string) {
    if (status === "loading") {
      search(query);
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
          Search work, play and posts. Use the arrow keys to pick a result.
        </DialogDescription>
        <Command shouldFilter={false} className="rounded-none!">
          <CommandInput
            value={query}
            onValueChange={onValueChange}
            placeholder="Search work, play and posts"
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
