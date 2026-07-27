"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { fetchJson } from "@/lib/api-client";
import {
  AddressBook,
  Building2,
  Funnel,
  MapPin,
  Package,
  Plus,
  Receipt,
  Search,
  Users,
  Wallet,
} from "@/lib/icons";
import type { SearchResult, SearchResultType } from "@/lib/crm/search";
import { cn } from "@/lib/utils";

type SearchGroup = { type: SearchResultType; label: string; results: SearchResult[] };

const TYPE_ICONS: Record<SearchResultType, typeof Users> = {
  PERSON: Users,
  COMPANY: Building2,
  DEAL: Funnel,
  LEAD: AddressBook,
  SITE: MapPin,
  QUOTATION: Receipt,
  INVOICE: Receipt,
  RECEIPT: Receipt,
  PRODUCT: Package,
  CUSTOMER: Wallet,
};

const RECENT_KEY = "crm.search.recent";
const MAX_RECENT = 6;

type RecentEntry = { href: string; title: string; subtitle: string | null; type: SearchResultType };

function loadRecents(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentEntry[]).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function rememberRecent(entry: RecentEntry) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadRecents().filter((item) => item.href !== entry.href);
    window.localStorage.setItem(
      RECENT_KEY,
      JSON.stringify([entry, ...existing].slice(0, MAX_RECENT)),
    );
  } catch {
    // A full or blocked localStorage shouldn't break search.
  }
}

const QUICK_CREATE: Array<{ label: string; href: string }> = [
  { label: "New deal", href: "/crm/deals?new=1" },
  { label: "New person", href: "/crm/people?new=1" },
  { label: "New company", href: "/crm/companies?new=1" },
  { label: "New lead", href: "/crm/leads?new=1" },
];

/**
 * One search for the whole workspace, opened with ⌘K from any page.
 *
 * It lives in the navbar rather than on a module layout because "find the
 * thing" is not a CRM-shaped need: the same box reaches people, companies,
 * deals, leads, sites, quotations, invoices, receipts, the shared catalogue
 * and accounting customers.
 *
 * Shows recently viewed records before anything is typed, so the common case
 * — going back to the thing you were just looking at — takes no typing at all.
 */
export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Reload recents and clear the box as the palette opens, during render so
  // the previous query never flashes.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setRecents(loadRecents());
      setQuery("");
      setDebounced("");
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const searchQuery = useQuery({
    queryKey: ["global-search", debounced],
    queryFn: () =>
      fetchJson<{ groups: SearchGroup[]; total: number }>(
        `/api/v2/crm/search?q=${encodeURIComponent(debounced)}`,
      ),
    enabled: open && debounced.length >= 2,
    placeholderData: (previous) => previous,
  });

  const groups = useMemo(() => searchQuery.data?.groups ?? [], [searchQuery.data]);

  const go = useCallback(
    (href: string, entry?: RecentEntry) => {
      if (entry) {
        rememberRecent(entry);
        setRecents(loadRecents());
      }
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const showRecents = debounced.length < 2 && recents.length > 0;
  const isSearching = debounced.length >= 2;
  const noResults = isSearching && !searchQuery.isFetching && groups.length === 0;

  return (
    <>
      {/* `compact` is the phone navbar, where the row is already tight and an
          icon reads better than a labelled button. */}
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "gap-2 text-[var(--text-muted)]",
          compact ? "px-2" : "min-w-56 justify-start",
        )}
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <Search className="h-4 w-4 shrink-0" />
        {compact ? null : (
          <>
            <span className="flex-1 text-left">Search everything</span>
            <kbd className="rounded border border-[var(--border)] px-1 text-[10px]">⌘K</kbd>
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search records, documents, catalogue…"
            />
            <CommandList className="max-h-96">
              {noResults ? (
                <CommandEmpty>
                  Nothing matches “{debounced}”.
                </CommandEmpty>
              ) : null}

              {showRecents ? (
                <CommandGroup heading="Recently viewed">
                  {recents.map((entry) => {
                    const Icon = TYPE_ICONS[entry.type] ?? Users;
                    return (
                      <CommandItem
                        key={entry.href}
                        value={entry.href}
                        onSelect={() => go(entry.href)}
                        className="gap-2"
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="truncate">{entry.title}</span>
                        {entry.subtitle ? (
                          <span className="truncate text-xs text-[var(--text-muted)]">
                            {entry.subtitle}
                          </span>
                        ) : null}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null}

              {groups.map((group) => {
                const Icon = TYPE_ICONS[group.type] ?? Users;
                return (
                  <CommandGroup key={group.type} heading={group.label}>
                    {group.results.map((result) => (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        value={`${result.type}-${result.id}`}
                        onSelect={() =>
                          go(result.href, {
                            href: result.href,
                            title: result.title,
                            subtitle: result.subtitle,
                            type: result.type,
                          })
                        }
                        className="gap-2"
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{result.title}</span>
                          {result.subtitle ? (
                            <span className="block truncate text-xs text-[var(--text-muted)]">
                              {result.subtitle}
                            </span>
                          ) : null}
                        </span>
                        {result.reference ? (
                          <span className="shrink-0 font-mono text-xs text-[var(--text-muted)]">
                            {result.reference}
                          </span>
                        ) : null}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}

              {!isSearching ? (
                <>
                  {showRecents ? <CommandSeparator /> : null}
                  <CommandGroup heading="Create">
                    {QUICK_CREATE.map((action) => (
                      <CommandItem
                        key={action.href}
                        value={action.href}
                        onSelect={() => go(action.href)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4 shrink-0 opacity-60" />
                        {action.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              ) : null}
            </CommandList>
          </Command>
          <div
            className={cn(
              "flex items-center justify-between border-t border-[var(--border)] px-3 py-1.5",
              "text-[11px] text-[var(--text-muted)]",
            )}
          >
            <span>↑↓ to move · ↵ to open · esc to close</span>
            {searchQuery.isFetching ? <span>Searching…</span> : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
