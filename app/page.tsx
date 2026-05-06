"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createRSVP, getEventData } from "./actions/rsvp";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Event {
  id: string;
  name: string;
  event_date: string;
  seat_capacity: number;
}

export default function Page() {
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function fetchData() {
    const data = await getEventData();
    if (data) {
      setEvent(data.event);
      setRsvpCount(data.rsvpCount);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">No event found.</p>
      </div>
    );
  }

  const remaining = event.seat_capacity - rsvpCount;
  const soldOut = remaining <= 0;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createRSVP(formData);
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success(result.success);
        formRef.current?.reset();
        if (result.rsvpCount !== undefined) {
          setRsvpCount(result.rsvpCount);
        }
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">{event.name}</CardTitle>
          <CardDescription>
            {new Date(event.event_date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {soldOut ? 0 : remaining}
            </span>{" "}
            of {event.seat_capacity} seats remaining
          </p>

          <form ref={formRef} action={handleSubmit} className="space-y-3">
            <Input
              name="name"
              placeholder="Full name"
              required
              disabled={soldOut}
            />
            <Input
              name="email"
              type="email"
              placeholder="Email address"
              required
              disabled={soldOut}
            />
            <Button
              type="submit"
              className={`w-full transition-opacity ${
                soldOut ? "cursor-not-allowed opacity-50" : ""
              }`}
              disabled={pending || soldOut}
            >
              {pending ? "Submitting..." : "RSVP Now"}
            </Button>
          </form>

          {soldOut && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-center dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-base font-semibold text-amber-800 dark:text-amber-300">
                This event is fully booked
              </p>
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                All {event.seat_capacity} seats have been reserved. Thank you
                for your interest — we hope to see you at a future event!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
