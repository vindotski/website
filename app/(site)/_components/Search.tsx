"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import { Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./Search.module.css";

// One result from /api/search
type Result = {
  url: string;
  title: string;
  // Null for an item's summary, which links to the page itself
  heading: string | null;
  type: string;
  snippet: string;
};

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

// The search button in the header, and ⌘K / Ctrl+K anywhere, open a dialog
// that searches as you type. Arrow keys pick a result and Enter opens it;
// Enter with nothing picked searches straight away
export default function Search() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const request = useRef<AbortController | null>(null);
  // Results by query, so going back to an earlier query doesn't search again
  const cache = useRef(new Map<string, Result[]>());

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
      const data: { results: Result[] } = await response.json();
      cache.current.set(key, data.results);
      setResults(data.results);
      setStatus("done");
    } catch {
      if (controller.signal.aborted) return;
      setResults([]);
      setStatus("error");
    }
  }

  function onValueChange(value: string) {
    setQuery(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => search(value), debounceMs);
  }

  // Plain clicks and Enter navigate here and close the dialog. ⌘, Ctrl,
  // Shift and middle clicks are left to the link, which opens a new tab or
  // window
  function choose(event: React.MouseEvent, url: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) {
      return;
    }
    event.preventDefault();
    setOpen(false);
    router.push(url);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className={styles.trigger}
        aria-label="Search"
        title="Search (⌘K)"
      >
        <SearchIcon aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup className={styles.popup} initialFocus={inputRef}>
          <Dialog.Title className={styles.visuallyHidden}>Search</Dialog.Title>
          {/* Inline and always open: the dialog is the popup. The server
              ranks the results, so nothing is filtered or autocompleted here */}
          <Autocomplete.Root
            inline
            open
            mode="none"
            items={results}
            value={query}
            onValueChange={onValueChange}
            itemToStringValue={(result: Result) => result.title}
          >
            <div className={styles.field}>
              <SearchIcon aria-hidden="true" />
              <Autocomplete.Input
                ref={inputRef}
                className={styles.input}
                placeholder="Search work, play and posts"
                aria-label="Search"
                onKeyDown={(event) => {
                  if (event.key === "Enter") search(query);
                }}
              />
              <Dialog.Close className={styles.close}>Esc</Dialog.Close>
            </div>
            <Autocomplete.Status className={styles.status}>
              {message(status, query, results.length)}
            </Autocomplete.Status>
            <Autocomplete.List className={styles.list}>
              {(result: Result) => (
                <Autocomplete.Item
                  key={result.url}
                  value={result}
                  className={styles.item}
                  render={<Link href={result.url} />}
                  onClick={(event) => choose(event, result.url)}
                >
                  <span className={styles.type}>{result.type}</span>
                  <span className={styles.title}>
                    {result.title}
                    {result.heading && ` — ${result.heading}`}
                  </span>
                  <span className={styles.snippet}>{result.snippet}</span>
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Root>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
