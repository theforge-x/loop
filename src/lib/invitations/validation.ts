import { z } from "zod";
export const attendeeSchema = z.object({ name: z.string().trim().min(1).max(200).regex(/^[^\u0000-\u001f\u007f]+$/), guest_id: z.uuid().optional(), type: z.enum(["guest", "plus_one", "child"]).default("guest") });
export const rsvpSchema = z.object({ status: z.enum(["attending", "declined"]), attendees: z.array(attendeeSchema).max(1000), event_ids: z.array(z.uuid()).max(50).default([]), dietary: z.string().trim().max(4000).default(""), accessibility: z.string().trim().max(4000).default(""), message: z.string().trim().max(4000).default("") }).strict();
export const invitationSchema = z.object({ id: z.uuid(), wedding_id: z.uuid(), name: z.string(), allowance: z.number().int(), guests: z.array(z.object({ id: z.uuid(), name: z.string() })), events: z.array(z.object({ id: z.uuid(), title: z.string(), starts_at: z.string(), venue_name: z.string().nullable() })) });
export type Invitation = z.infer<typeof invitationSchema>;
