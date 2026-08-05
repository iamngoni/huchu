"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Card, EmptyState, Skeleton } from "@corelithzw/react";
import { Input } from "@/components/ui/input";
import { BookCover } from "@/components/schools/library/book-cover";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { useStudentPortal } from "./student-portal-context";

type Book = {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  shelfMark: string | null;
  copies: number;
  available: number;
  waiting: number;
  haveItOut: boolean;
  reservedByMe: boolean;
};

type Loan = {
  id: string;
  dueAt: string | null;
  renewals: number;
  isOverdue: boolean;
  fineIfReturnedToday: string | number;
  copyCode: string;
  book: { id: string; title: string; author: string | null };
};

type Library = {
  canBorrow: boolean;
  loans: Loan[];
  fines: { total: string | number };
  reservations: Array<{
    id: string;
    readyAt: string | null;
    book: { id: string; title: string; author: string | null };
  }>;
  books: Book[];
};

function money(value: string | number) {
  return `$ ${Number(value).toFixed(2)}`;
}

function shortDate(value: string | null) {
  if (!value) return "no date";
  const date = new Date(value);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * The library, as a shelf.
 *
 * A grid of covers rather than rows of text, because a book is recognised by
 * its cover and a reader browses rather than reads a table. What the pupil has
 * out comes first — that is the thing with a deadline on it — and the shelf is
 * underneath.
 *
 * Whether a book can be taken home is counted from copies, not titles: "three
 * copies, two out" is the only honest answer to "can I have it today".
 */
export function StudentLibraryScreen() {
  const queryClient = useQueryClient();
  const { student } = useStudentPortal();
  const [search, setSearch] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["schools", "portal", "student", "library", search],
    queryFn: () =>
      fetchJson<Library>(
        `/api/v2/schools/portal/student/me/library${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      ),
    enabled: Boolean(student),
  });

  const act = useMutation({
    mutationFn: (body: Record<string, string>) =>
      fetchJson("/api/v2/schools/portal/student/me/library", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, body) => {
      setNote(
        body.action === "borrow"
          ? "Borrowed — check the due date below"
          : body.action === "return"
            ? "Returned"
            : body.action === "renew"
              ? "Renewed"
              : "Reserved — we will tell you when it is ready",
      );
      void queryClient.invalidateQueries({
        queryKey: ["schools", "portal", "student", "library"],
      });
    },
  });

  if (!student) {
    return (
      <EmptyState
        title="This account is not linked to a pupil"
        body="Ask the school office to link your sign-in to your student record."
      />
    );
  }

  const data = query.data;
  const fines = Number(data?.fines.total ?? 0);

  return (
    <div className="flex flex-col gap-4">
      {query.error ? (
        <Alert tone="danger" title="The library would not load">
          {getApiErrorMessage(query.error)}
        </Alert>
      ) : null}
      {act.error ? (
        <Alert tone="danger" title="That did not work">
          {getApiErrorMessage(act.error)}
        </Alert>
      ) : null}
      {note ? <Alert tone="success" title={note} onDismiss={() => setNote(null)} /> : null}
      {fines > 0 ? (
        <Alert tone="warn" title={`You owe ${money(fines)} in fines`}>
          Pay at the library desk. You cannot borrow again until it is settled.
        </Alert>
      ) : null}

      <Card
        title="What you have out"
        subtitle={
          data ? `${data.loans.length} book${data.loans.length === 1 ? "" : "s"}` : undefined
        }
      >
        {query.isPending ? (
          <Skeleton variant="text" height={120} />
        ) : (data?.loans.length ?? 0) === 0 ? (
          <EmptyState
            title="Nothing out at the moment"
            body="Pick something from the shelf below and it will show up here."
          />
        ) : (
          <ul className="flex flex-col">
            {data?.loans.map((loan) => (
              <li
                key={loan.id}
                className="flex items-center gap-3 border-b border-[color:var(--border-subtle)] py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[length:var(--type-body-sm)] font-medium text-[color:var(--text-strong)]">
                    {loan.book.title}
                  </p>
                  <p className="truncate text-[length:var(--type-caption)] text-[color:var(--text-muted)]">
                    Back by {shortDate(loan.dueAt)}
                    {loan.renewals > 0 ? ` · renewed ${loan.renewals}×` : ""}
                  </p>
                </div>
                {loan.isOverdue ? (
                  <Badge tone="danger" dot>
                    Late · {money(loan.fineIfReturnedToday)}
                  </Badge>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => act.mutate({ action: "renew", loanId: loan.id })}
                >
                  Renew
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => act.mutate({ action: "return", loanId: loan.id })}
                >
                  Return
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="The shelf"
        actions={
          <div className="w-[12rem]">
            <Input
              aria-label="Search the library"
              placeholder="Title or author"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        }
      >
        {query.isPending ? (
          <Skeleton variant="text" height={220} />
        ) : (data?.books.length ?? 0) === 0 ? (
          <EmptyState
            title={search ? "Nothing matches that" : "The catalogue is empty"}
            body={
              search
                ? "Try part of the title, or the author's surname."
                : "No books have been catalogued yet. The librarian adds them from the office."
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data?.books.map((book) => (
              <li key={book.id} className="flex flex-col gap-2">
                <BookCover title={book.title} author={book.author} />
                <div className="min-w-0">
                  <p className="truncate text-[length:var(--type-caption)] text-[color:var(--text-muted)]">
                    {book.available > 0
                      ? `${book.available} of ${book.copies} on the shelf`
                      : book.waiting > 0
                        ? `All out · ${book.waiting} waiting`
                        : "All out"}
                  </p>
                </div>
                {book.haveItOut ? (
                  <Badge tone="info">You have this</Badge>
                ) : book.reservedByMe ? (
                  <Badge tone="neutral">Reserved for you</Badge>
                ) : book.available > 0 ? (
                  <Button
                    size="sm"
                    disabled={!data?.canBorrow}
                    onClick={() => act.mutate({ action: "borrow", bookId: book.id })}
                  >
                    Borrow
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => act.mutate({ action: "reserve", bookId: book.id })}
                  >
                    Reserve
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
