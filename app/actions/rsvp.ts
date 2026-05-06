"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getEventData() {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .single();

  if (!event) return null;

  const { count } = await supabase
    .from("rsvps")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id);

  return { event, rsvpCount: count ?? 0 };
}

export async function createRSVP(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  if (!name?.trim() || !email?.trim()) {
    return { error: "Name and email are required." };
  }

  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, seat_capacity")
    .single();

  if (eventError || !event) {
    return { error: "Event not found." };
  }

  const { count, error: countError } = await supabase
    .from("rsvps")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id);

  if (countError) {
    return { error: "Unable to check availability." };
  }

  if ((count ?? 0) >= event.seat_capacity) {
    return { error: "Sorry, this event is sold out." };
  }

  const { data: existing } = await supabase
    .from("rsvps")
    .select("id")
    .eq("event_id", event.id)
    .eq("email", email.trim().toLowerCase())
    .single();

  if (existing) {
    return { error: "This email has already RSVP'd." };
  }

  const { error: insertError } = await supabase.from("rsvps").insert({
    event_id: event.id,
    name: name.trim(),
    email: email.trim().toLowerCase(),
  });

  if (insertError) {
    return { error: "Failed to submit RSVP. Please try again." };
  }

  const { count: newCount } = await supabase
    .from("rsvps")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id);

  revalidatePath("/");
  return {
    success: "You're in! RSVP confirmed.",
    rsvpCount: newCount ?? (count ?? 0) + 1,
    seatCapacity: event.seat_capacity,
  };
}

export async function deleteRSVP(id: string) {
  if (!id) {
    return { error: "RSVP ID is required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("rsvps").delete().eq("id", id);

  if (error) {
    return { error: "Failed to delete RSVP." };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}
