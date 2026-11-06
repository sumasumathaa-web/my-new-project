/** Default template field schema for customizable invitations. */
import type { CustomField } from "@/lib/types";

export const DEFAULT_INVITE_SCHEMA: CustomField[] = [
  { key: "bride_name", label: "Partner A name", type: "text", required: true, maxLength: 60 },
  { key: "groom_name", label: "Partner B name", type: "text", required: true, maxLength: 60 },
  { key: "couple_photo", label: "Couple photo", type: "image", help: "JPG/PNG/WebP up to 5 MB." },
  { key: "wedding_date", label: "Wedding date", type: "date", required: true },
  { key: "wedding_time", label: "Ceremony time", type: "time" },
  { key: "venue_name", label: "Venue name", type: "text", required: true, maxLength: 120 },
  { key: "venue_address", label: "Venue address", type: "textarea", maxLength: 400 },
  { key: "map_link", label: "Google Maps link", type: "url" },
  { key: "family_names", label: "Family / host names", type: "textarea", maxLength: 300 },
  { key: "welcome_message", label: "Welcome message", type: "textarea", maxLength: 600 },
  { key: "invitation_wording", label: "Invitation wording", type: "textarea", maxLength: 800 },
  { key: "bg_color", label: "Background colour", type: "color" },
  { key: "accent_color", label: "Accent colour", type: "color" },
  { key: "font_style", label: "Font style", type: "select", options: ["serif", "sans", "modern"] },
  { key: "music", label: "Music preference", type: "select", options: ["none", "soft-instrumental", "traditional"] },
  { key: "show_countdown", label: "Show countdown", type: "checkbox" },
  { key: "show_rsvp", label: "Enable RSVP form", type: "checkbox" },
];

export function getEventDate(config: Record<string, unknown>): Date | null {
  const d = config.wedding_date;
  if (typeof d !== "string") return null;
  const time = typeof config.wedding_time === "string" ? config.wedding_time : "09:00";
  const date = new Date(`${d}T${time.slice(0, 5)}:00+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}
