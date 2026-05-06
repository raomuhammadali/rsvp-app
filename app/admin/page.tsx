"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { deleteRSVP } from "@/app/actions/rsvp";
import { logout } from "@/app/actions/auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Rsvp {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface Event {
  id: string;
  name: string;
  seat_capacity: number;
}

export default function AdminPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  async function fetchData() {
    const supabase = createClient();
    const { data: eventData } = await supabase
      .from("events")
      .select("id, name, seat_capacity")
      .single();

    if (eventData) {
      setEvent(eventData);
      const { data: rsvpData } = await supabase
        .from("rsvps")
        .select("id, name, email, created_at")
        .eq("event_id", eventData.id)
        .order("created_at", { ascending: false });
      setRsvps(rsvpData ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteRSVP(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("RSVP deleted.");
        fetchData();
      }
    });
  }

  function handleExportCSV() {
    if (rsvps.length === 0) {
      toast.error("No RSVPs to export.");
      return;
    }

    const headers = ["Name", "Email", "RSVP Date"];
    const rows = rsvps.map((r) => [
      r.name,
      r.email,
      new Date(r.created_at).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rsvps-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleLogout() {
    startTransition(async () => {
      await logout();
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const seatsTaken = rsvps.length;
  const maxSeats = event?.seat_capacity ?? 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {event?.name ?? "Event"} — Admin
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage attendees and export data
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} disabled={pending}>
            Sign Out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Seats</CardTitle>
            <CardDescription>
              <span className="font-medium text-foreground">{seatsTaken}</span>{" "}
              / {maxSeats} claimed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min((seatsTaken / maxSeats) * 100, 100)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Attendees</CardTitle>
              <CardDescription>{seatsTaken} RSVPs</CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportCSV}>
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {rsvps.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No RSVPs yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rsvps.map((rsvp) => (
                    <TableRow key={rsvp.id}>
                      <TableCell className="font-medium">
                        {rsvp.name}
                      </TableCell>
                      <TableCell>{rsvp.email}</TableCell>
                      <TableCell>
                        {new Date(rsvp.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(rsvp.id)}
                          disabled={pending}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
