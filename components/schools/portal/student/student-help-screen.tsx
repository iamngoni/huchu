"use client";

import { Card } from "@corelithzw/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * Help, written for the reader.
 *
 * Questions a pupil actually has about *this* app, answered in the words they
 * would use. Nothing generic: if an answer would be true of any school app, it
 * is not worth the space.
 */
const QUESTIONS = [
  {
    q: "How do I hand work in?",
    a: "Open Homework, tap the piece of work, then Hand it in. Once it has gone the card says so and shows the time it arrived — that is your proof. If it went in after the due time it is marked late rather than refused.",
  },
  {
    q: "When do my marks appear?",
    a: "When your school publishes them, not when your teacher enters them. Marks are checked by the head of department first, so there is usually a gap between a test being marked and the mark showing up here.",
  },
  {
    q: "Why can I see a mark for one subject and not another?",
    a: "Publishing happens subject by subject. A missing subject means that teacher's marks have not been through checking yet.",
  },
  {
    q: "How do I keep a library book longer?",
    a: "Open Library and tap Renew on the book. You can renew a limited number of times, and not at all once a book is late or if you owe a fine.",
  },
  {
    q: "What happens if a book is late?",
    a: "A fine builds up per day. The Library screen shows what it stands at, and you cannot borrow anything else until it is paid at the desk.",
  },
  {
    q: "My timetable looks wrong",
    a: "Your timetable is your class's timetable. If you have changed class recently and it has not caught up, tell the school office — nobody can fix it from this app.",
  },
  {
    q: "What is a goal for?",
    a: "It is a target you set yourself for a subject, with the mark you started from written down next to it. It is yours: your teacher can add a note, but they cannot change the target.",
  },
] as const;

export function StudentHelpScreen() {
  return (
    <div className="flex flex-col gap-4">
      <Card title="Questions people ask">
        <Accordion type="single" collapsible className="w-full">
          {QUESTIONS.map((row) => (
            <AccordionItem key={row.q} value={row.q}>
              <AccordionTrigger>{row.q}</AccordionTrigger>
              <AccordionContent>{row.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>

      <Card title="Still stuck">
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-body)]">
          Ask at the school office. Anything about your class, your marks or your
          fees is theirs to change — this app only shows you what they have
          recorded.
        </p>
      </Card>
    </div>
  );
}
