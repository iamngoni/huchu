"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileList, MobileListEmpty, MobileListSectionHeader } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerticalDataViews } from "@/components/ui/vertical-data-views";
import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { fetchSchoolsStudents } from "@/lib/schools/admin-v2";

type Copy = {
  id: string;
  copyCode: string;
  loans: {
    id: string;
    dueAt: string;
    student: { id: string; firstName: string; lastName: string };
  }[];
};

type Book = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  category: string | null;
  shelfMark: string | null;
  copies: Copy[];
  _count: { reservations: number };
};

type Loan = {
  id: string;
  borrowedAt: string;
  dueAt: string;
  renewals: number;
  isOverdue: boolean;
  fineIfReturnedToday: number;
  copy: { id: string; copyCode: string; book: { id: string; title: string } };
  student: {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    currentClass: { id: string; name: string } | null;
  };
};

type View = "shelves" | "out";

/**
 * The library, from the issue desk.
 *
 * Two views because a librarian has two jobs. "Shelves" is the catalogue with
 * every copy and who has it — built from the copies outward, so a copy on the
 * shelf is a row you can lend rather than an absence. "Out" is the loan
 * register, which opens on what is overdue, because that is the list somebody
 * works through on a Monday.
 */
export function LibraryContent() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("shelves");
  const [search, setSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(true);
  const [lendingCopy, setLendingCopy] = useState<string | null>(null);
  const [reader, setReader] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const libraryQuery = useQuery({
    queryKey: ["schools", "library", search, overdueOnly],
    queryFn: () =>
      fetchJson<{ books: Book[]; loans: Loan[] }>(
        `/api/v2/schools/library?${new URLSearchParams({
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(overdueOnly ? { overdueOnly: "true" } : {}),
        }).toString()}`,
      ),
  });

  const readersQuery = useQuery({
    queryKey: ["schools", "library", "readers"],
    queryFn: () => fetchSchoolsStudents({ page: 1, limit: 300, status: "ACTIVE" }),
    enabled: lendingCopy !== null,
  });

  const books = useMemo(() => libraryQuery.data?.books ?? [], [libraryQuery.data]);
  const loans = useMemo(() => libraryQuery.data?.loans ?? [], [libraryQuery.data]);

  const deskMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetchJson<{ fine?: number }>("/api/v2/schools/library/loans", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (result, body) => {
      setActionError(null);
      setLendingCopy(null);
      setReader("");
      if (body.action === "return") {
        setNote(
          result.fine && result.fine > 0
            ? `Back, with ${result.fine.toFixed(2)} to pay`
            : "Back, nothing owed",
        );
      } else {
        setNote(null);
      }
      void queryClient.invalidateQueries({ queryKey: ["schools", "library"] });
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  const overdue = loans.filter((loan) => loan.isOverdue);
  const onShelf = books.reduce(
    (sum, book) => sum + book.copies.filter((copy) => copy.loans.length === 0).length,
    0,
  );

  return (
    <div className="space-y-4">
      {libraryQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load the library</AlertTitle>
          <AlertDescription>{getApiErrorMessage(libraryQuery.error)}</AlertDescription>
        </Alert>
      ) : null}
      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>The desk refused that</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
      {note ? (
        <Alert>
          <AlertTitle>Done</AlertTitle>
          <AlertDescription>{note}</AlertDescription>
        </Alert>
      ) : null}

      <VerticalDataViews
        items={[
          { id: "shelves", label: "Shelves", count: books.length },
          { id: "out", label: "Out", count: loans.length },
        ]}
        value={view}
        onValueChange={(value) => setView(value as View)}
        railLabel="Library views"
      >
        {view === "shelves" ? (
          <div className="space-y-4">
            <FilterBar>
              <div className="min-w-0 flex-1 basis-[220px] sm:max-w-[320px]">
                <Label htmlFor="library-search" className="text-sm text-muted-foreground">
                  Find a book
                </Label>
                <Input
                  id="library-search"
                  value={search}
                  placeholder="Title, author or ISBN"
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </FilterBar>

            <p className="text-sm text-muted-foreground">
              {books.length} title{books.length === 1 ? "" : "s"} · {onShelf} cop
              {onShelf === 1 ? "y" : "ies"} on the shelf
            </p>

            <MobileList>
              {books.length === 0 ? (
                <MobileListEmpty>
                  {libraryQuery.isLoading
                    ? "Loading the catalogue…"
                    : "Nothing catalogued yet."}
                </MobileListEmpty>
              ) : (
                books.map((book) => (
                  <div key={book.id}>
                    <MobileListSectionHeader>
                      {book.title}
                      {book.author ? ` · ${book.author}` : ""}
                    </MobileListSectionHeader>
                    {book.copies.map((copy) => {
                      const loan = copy.loans[0] ?? null;
                      return (
                        <MobileList.Row
                          key={copy.id}
                          static
                          title={copy.copyCode}
                          subtitle={
                            <span className="mt-1 flex flex-wrap items-center gap-2">
                              {loan ? (
                                <>
                                  <span>
                                    {loan.student.lastName}, {loan.student.firstName} ·
                                    back by {loan.dueAt.slice(0, 10)}
                                  </span>
                                  <Badge variant="secondary">Out</Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={deskMutation.isPending}
                                    onClick={() =>
                                      deskMutation.mutate({
                                        action: "return",
                                        loanId: loan.id,
                                      })
                                    }
                                  >
                                    Take it back
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span>{book.shelfMark ?? "On the shelf"}</span>
                                  <Badge variant="outline">In</Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setLendingCopy(copy.id);
                                      setReader("");
                                    }}
                                  >
                                    Lend it
                                  </Button>
                                </>
                              )}
                              {lendingCopy === copy.id ? (
                                <span className="flex w-full flex-wrap items-end gap-2">
                                  <FilterSelect
                                    label="Reader"
                                    allLabel="Choose a reader"
                                    value={reader}
                                    options={(readersQuery.data?.data ?? []).map(
                                      (student) => ({
                                        value: student.id,
                                        label: `${student.lastName}, ${student.firstName}`,
                                      }),
                                    )}
                                    onChange={setReader}
                                  />
                                  <Button
                                    size="sm"
                                    disabled={!reader || deskMutation.isPending}
                                    onClick={() =>
                                      deskMutation.mutate({
                                        action: "issue",
                                        copyId: copy.id,
                                        studentId: reader,
                                      })
                                    }
                                  >
                                    Issue
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setLendingCopy(null)}
                                  >
                                    Cancel
                                  </Button>
                                </span>
                              ) : null}
                            </span>
                          }
                        />
                      );
                    })}
                  </div>
                ))
              )}
            </MobileList>
          </div>
        ) : null}

        {view === "out" ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {loans.length} book{loans.length === 1 ? "" : "s"} out
                {overdue.length > 0 ? `, ${overdue.length} late` : ""}
              </p>
              <Button variant="outline" onClick={() => setOverdueOnly((on) => !on)}>
                {overdueOnly ? "Show everything out" : "Only what is late"}
              </Button>
            </div>

            <MobileList>
              {loans.length === 0 ? (
                <MobileListEmpty>
                  {libraryQuery.isLoading
                    ? "Loading the loan register…"
                    : overdueOnly
                      ? "Nothing is late."
                      : "Nothing is out."}
                </MobileListEmpty>
              ) : (
                loans.map((loan) => (
                  <MobileList.Row
                    key={loan.id}
                    static
                    title={`${loan.student.lastName}, ${loan.student.firstName}`}
                    subtitle={
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <span>
                          {loan.copy.book.title} ({loan.copy.copyCode}) · due{" "}
                          {loan.dueAt.slice(0, 10)}
                          {loan.student.currentClass
                            ? ` · ${loan.student.currentClass.name}`
                            : ""}
                        </span>
                        {loan.isOverdue ? (
                          <Badge variant="destructive">
                            Late · {loan.fineIfReturnedToday.toFixed(2)} if back today
                          </Badge>
                        ) : (
                          <Badge variant="outline">Out</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={deskMutation.isPending}
                          onClick={() =>
                            deskMutation.mutate({ action: "return", loanId: loan.id })
                          }
                        >
                          Take it back
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deskMutation.isPending}
                          onClick={() =>
                            deskMutation.mutate({ action: "renew", loanId: loan.id })
                          }
                        >
                          Renew
                        </Button>
                      </span>
                    }
                  />
                ))
              )}
            </MobileList>
          </div>
        ) : null}
      </VerticalDataViews>
    </div>
  );
}
