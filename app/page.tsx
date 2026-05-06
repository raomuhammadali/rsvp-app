"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createRSVP } from "./actions/rsvp";
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
    const supabase = createClient();
    const { data: eventData } = await supabase
      .from("events")
      .select("*")
      .single();

    if (eventData) {
      setEvent(eventData);
      const { count } = await supabase
        .from("rsvps")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventData.id);
      setRsvpCount(count ?? 0);
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
        fetchData();
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
          {soldOut ? (
            <div className="rounded-lg bg-destructive/10 p-4 text-center">
              <p className="text-lg font-semibold text-destructive">
                Sold Out
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                All {event.seat_capacity} seats have been claimed.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{remaining}</span>{" "}
                of {event.seat_capacity} seats remaining
              </p>
              <form ref={formRef} action={handleSubmit} className="space-y-3">
                <Input name="name" placeholder="Full name" required />
                <Input
                  name="email"
                  type="email"
                  placeholder="Email address"
                  required
                />
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Submitting..." : "RSVP Now"}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
