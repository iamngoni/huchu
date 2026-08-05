"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Badge,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  Select,
  Skeleton,
} from "@corelithzw/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Check, Clock } from "@/lib/icons";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { useStudentPortal } from "./student-portal-context";

type SubmissionStatus = "SUBMITTED" | "LATE" | "RETURNED" | "RESUBMIT";

/**
 * The service's own states, said to a child.
 *
 * `SUBMISSION_LABELS` in `lib/schools/assignments.ts` writes these for a
 * teacher's mark book — "In", "In late" — which is the right register there
 * and the wrong one here. The states are the same four; only the wording
 * changes, and it changes in one place.
 */
const STATUS_LABELS: Record<SubmissionStatus, string> = {
  SUBMITTED: "Handed in",
  LATE: "Handed in late",
  RETURNED: "Marked",
  RESUBMIT: "Do it again",
};

const STATUS_TONES: Record<SubmissionStatus, "success" | "warn" | "info"> = {
  SUBMITTED: "success",
  LATE: "warn",
  RETURNED: "info",
  RESUBMIT: "warn",
};

type Homework = {
  id: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  /** Whole days left, negative once the deadline has passed. Null: no deadline. */
  dueInDays: number | null;
  /** The school's clock, not the phone's. */
  isOverdue: boolean;
  maxScore: number | null;
  setOn: string | null;
  subjectCode: string;
  subjectName: string;
  teacherName: string | null;
  submission: {
    id: string;
    status: SubmissionStatus;
    submittedAt: string;
    content: string | null;
    attachmentUrl: string | null;
    score: number | null;
    feedback: string | null;
    markedAt: string | null;
  } | null;
};

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function dayOf(value: string | null) {
  return value ? DAY.format(new Date(value)) : null;
}

/** "Due tomorrow", "2 days late" — the sentence a child reads first. */
function deadline(row: Homework) {
  if (row.dueAt === null) return "No date to hand it in by";
  const days = row.dueInDays;
  if (days === null) return `Hand in by ${dayOf(row.dueAt)}`;
  if (days < 0) {
    const late = Math.abs(days);
    return `${late} ${late === 1 ? "day" : "days"} late`;
  }
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

type Filter = "all" | "todo" | "in" | "marked";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Everything" },
  { value: "todo", label: "Still to do" },
  { value: "in", label: "Handed in" },
  { value: "marked", label: "Marked" },
];

function matches(row: Homework, filter: Filter) {
  if (filter === "todo") return row.submission === null;
  if (filter === "in") return row.submission !== null;
  if (filter === "marked") return row.submission?.status === "RETURNED";
  return true;
}

/**
 * What is set, what is due, and what has been handed in.
 *
 * Handing in is the reason this screen exists, so it is a real action with a
 * state you can see afterwards, not a toast that disappears: once work is in,
 * the card says so, with the day it arrived, and it keeps saying so. A child
 * who is not sure whether their homework went through opens the app to check
 * exactly that, and a screen that looked identical before and after would send
 * them to their teacher anyway.
 *
 * Late work is offered, never refused. `submitAssignment` records lateness as
 * a fact about the work rather than a reason to lose it, and a school still
 * wants the essay. The button says "Hand in late" so nobody is surprised by
 * what the teacher sees.
 *
 * The demo filtered with a row of chips. This is a dropdown — the standing
 * instruction, and on a phone it is also the only one of the two that says
 * what it is set to without being scrolled sideways.
 */
export function StudentHomeworkScreen() {
  const queryClient = useQueryClient();
  const { student } = useStudentPortal();

  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ content: "", link: "" });
  const [handedIn, setHandedIn] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["schools", "portal", "student", "homework"],
    queryFn: () =>
      fetchJson<{ assignments: Homework[] }>(
        "/api/v2/schools/portal/student/me/homework",
      ),
    enabled: student !== null,
  });

  const assignments = query.data?.assignments ?? [];
  const shown = assignments.filter((row) => matches(row, filter));
  const open = assignments.find((row) => row.id === openId) ?? null;
  const stillToDo = assignments.filter((row) => row.submission === null).length;

  const hand = useMutation({
    mutationFn: (row: Homework) =>
      fetchJson(`/api/v2/schools/assignments/${row.id}`, {
        method: "POST",
        // No `studentId`. The route resolves the pupil from the signed-in
        // account, which is the S-0.2 rule and the reason this call is safe
        // from a phone in a child's hand.
        body: JSON.stringify({
          action: "submit",
          content: draft.content.trim() || null,
          attachmentUrl: draft.link.trim() || null,
        }),
      }),
    onSuccess: (_result, row) => {
      setHandedIn(`"${row.title}" is with ${row.teacherName ?? "your teacher"}`);
      setOpenId(null);
      setDraft({ content: "", link: "" });
      void queryClient.invalidateQueries({
        queryKey: ["schools", "portal", "student", "homework"],
      });
    },
  });

  const show = (row: Homework) => {
    hand.reset();
    setHandedIn(null);
    setDraft({
      content: row.submission?.content ?? "",
      link: row.submission?.attachmentUrl ?? "",
    });
    setOpenId(row.id);
  };

  if (student === null) {
    return (
      <EmptyState
        title="We cannot find your school record"
        body="Your account is signed in but it is not linked to a pupil yet. Ask the school office to link it and your homework appears here."
      />
    );
  }

  if (query.error) {
    return (
      <Alert tone="danger" title="Your homework would not load">
        {getApiErrorMessage(query.error)}
      </Alert>
    );
  }

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-live="polite">
        <span className="sr-only">Fetching your homework…</span>
        <Skeleton variant="rect" height={64} />
        <Skeleton variant="rect" height={132} />
        <Skeleton variant="rect" height={132} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {handedIn ? (
        <Alert
          tone="success"
          title="Handed in"
          onDismiss={() => setHandedIn(null)}
        >
          {handedIn}
        </Alert>
      ) : null}

      {assignments.length === 0 ? (
        <EmptyState
          title="No homework set"
          body="Work your teachers set this term shows up here, with the day it has to be in by."
        />
      ) : (
        <>
          <Select
            label="Show"
            value={filter}
            onChange={(event) => setFilter(event.target.value as Filter)}
          >
            {FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-body)]">
            <span className="tabular-nums">{stillToDo}</span>{" "}
            {stillToDo === 1 ? "piece" : "pieces"} of work still to hand in.
          </p>

          {shown.length === 0 ? (
            <EmptyState
              title="Nothing here"
              body="Change what the dropdown is showing to see the rest of your homework."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {shown.map((row) => {
                const submission = row.submission;
                return (
                  <li key={row.id}>
                    <Card>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="outline">{row.subjectName}</Badge>
                        {submission ? (
                          <Badge tone={STATUS_TONES[submission.status]}>
                            <Check className="size-3" aria-hidden />
                            {STATUS_LABELS[submission.status]}
                          </Badge>
                        ) : row.isOverdue ? (
                          <Badge tone="danger">
                            <AlertTriangle className="size-3" aria-hidden />
                            Late
                          </Badge>
                        ) : (
                          <Badge tone="warn">
                            <Clock className="size-3" aria-hidden />
                            Still to do
                          </Badge>
                        )}
                      </div>

                      <p className="mt-2 text-[length:var(--type-body)] font-semibold text-[color:var(--text-strong)]">
                        {row.title}
                      </p>
                      <p className="text-[length:var(--type-caption)] text-[color:var(--text-muted)]">
                        {row.teacherName ?? "Your teacher"} · {deadline(row)}
                        {row.dueAt ? ` · ${dayOf(row.dueAt)}` : ""}
                      </p>

                      {submission ? (
                        <p className="mt-2 text-[length:var(--type-body-sm)] text-[color:var(--text-body)]">
                          You handed this in on{" "}
                          <span className="tabular-nums">
                            {dayOf(submission.submittedAt)}
                          </span>
                          {submission.score !== null
                            ? ` · you scored ${submission.score}${row.maxScore ? ` out of ${row.maxScore}` : ""}`
                            : " · your teacher has not marked it yet"}
                        </p>
                      ) : null}

                      {submission?.feedback ? (
                        <p className="mt-2 rounded-[var(--radius-md)] bg-[color:var(--surface-muted)] px-3 py-2 text-[length:var(--type-body-sm)] text-[color:var(--text-body)]">
                          {submission.feedback}
                        </p>
                      ) : null}

                      <div className="mt-3">
                        <Button
                          variant={submission ? "secondary" : "primary"}
                          size="lg"
                          block
                          onClick={() => show(row)}
                        >
                          {submission
                            ? "See what you handed in"
                            : row.isOverdue
                              ? "Hand in late"
                              : "Hand it in"}
                        </Button>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <BottomSheet
        open={open !== null}
        onClose={() => setOpenId(null)}
        title={open?.title ?? "Homework"}
        description={
          open
            ? `${open.subjectName} · ${open.teacherName ?? "your teacher"} · ${deadline(open)}`
            : undefined
        }
        footer={
          open ? (
            <div className="flex w-full flex-col gap-2">
              <Button
                variant="primary"
                size="lg"
                block
                loading={hand.isPending}
                onClick={() => hand.mutate(open)}
              >
                {open.submission
                  ? "Change what you handed in"
                  : open.isOverdue
                    ? "Hand in late"
                    : "Hand it in"}
              </Button>
              <Button variant="ghost" size="lg" block onClick={() => setOpenId(null)}>
                Close
              </Button>
            </div>
          ) : undefined
        }
      >
        {open ? (
          <div className="flex flex-col gap-3">
            {hand.error ? (
              <Alert tone="danger" title="That did not go through">
                {getApiErrorMessage(hand.error)}
              </Alert>
            ) : null}

            {open.submission ? (
              <Alert tone="success" title={STATUS_LABELS[open.submission.status]}>
                Your teacher has had this since{" "}
                {dayOf(open.submission.submittedAt)}. You can change it until they
                mark it.
              </Alert>
            ) : open.isOverdue ? (
              <Alert tone="warn" title="This is past its date">
                Hand it in anyway. Your teacher would rather have it late than not
                at all, and they will see that it came in late.
              </Alert>
            ) : null}

            <div>
              <p className="text-[length:var(--type-label)] font-semibold text-[color:var(--text-strong)]">
                What to do
              </p>
              <p className="mt-1 text-[length:var(--type-body-sm)] text-[color:var(--text-body)]">
                {open.instructions ?? "Your teacher did not add any notes."}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="homework-answer">Your answer</Label>
              <Textarea
                id="homework-answer"
                rows={5}
                maxLength={8000}
                value={draft.content}
                placeholder="Type your work here, or say what you are handing to your teacher on paper."
                onChange={(event) =>
                  setDraft((current) => ({ ...current, content: event.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="homework-link">Link to your work</Label>
              <Input
                id="homework-link"
                type="url"
                inputMode="url"
                value={draft.link}
                placeholder="https://"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, link: event.target.value }))
                }
              />
              <p className="text-[length:var(--type-caption)] text-[color:var(--text-muted)]">
                Leave this empty unless your work is somewhere your teacher can open.
              </p>
            </div>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
