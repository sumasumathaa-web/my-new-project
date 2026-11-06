import { getEventDate } from "@/lib/customization-schema";
import { mediaUrl } from "@/lib/media";
import { CountdownTimer } from "@/components/countdown";
import { RsvpForm } from "@/components/rsvp-form";

/**
 * Renders a customer's personalized invitation. Pure function of `config` —
 * this exact component powers both the live editor preview and the public
 * /w/[slug] page.
 */
export function InvitationPreview(props: {
  config: Record<string, unknown>;
  slug?: string;
  compact?: boolean;
}) {
  const c = props.config;
  const str = (k: string) => (typeof c[k] === "string" ? (c[k] as string) : "");
  const bool = (k: string) => c[k] === true || c[k] === "true";
  const bg = str("bg_color") || "#FAF7F1";
  const accent = str("accent_color") || "#B08D57";
  const font = str("font_style") || "serif";
  const fontClass = font === "sans" ? "font-sans" : "font-serif";
  const eventDate = getEventDate(c);
  const photo = str("couple_photo");
  const photoUrl = mediaUrl(photo);

  const bride = str("bride_name") || "Partner A";
  const groom = str("groom_name") || "Partner B";

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#E8DFCE] ${fontClass}`}
      style={{ backgroundColor: bg }}
    >
      {/* Hero arch */}
      <div className="relative flex flex-col items-center px-6 py-12 text-center">
        <div
          className="clip-arch flex h-64 w-52 items-center justify-center border-2 sm:h-80 sm:w-64"
          style={{ borderColor: accent }}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={`${bride} and ${groom}`} className="clip-arch h-full w-full object-cover" />
          ) : (
            <svg viewBox="0 0 100 140" className="h-full w-full" aria-hidden="true">
              <rect width="100" height="140" fill="#F3EAD9" />
              <circle cx="50" cy="60" r="26" fill="none" stroke="#B08D57" strokeOpacity="0.6" />
              <text x="50" y="66" textAnchor="middle" fontSize="16" fill="#6E1E2C" fontFamily="Georgia, serif">
                {bride[0] ?? "A"} &amp; {groom[0] ?? "B"}
              </text>
            </svg>
          )}
        </div>
        <p className="mt-8 text-xs uppercase tracking-widest2" style={{ color: accent }}>
          Together with their families
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl" style={{ color: "#2B2622" }}>
          {bride} <span style={{ color: accent }}>&amp;</span> {groom}
        </h1>
        {str("welcome_message") ? (
          <p className="mt-4 max-w-md text-sm leading-relaxed" style={{ color: "#4A423B" }}>
            {str("welcome_message")}
          </p>
        ) : null}
        {eventDate ? (
          <p className="mt-5 font-serif text-lg" style={{ color: accent }}>
            {eventDate.toLocaleString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: str("wedding_time") ? "numeric" : undefined,
              minute: str("wedding_time") ? "2-digit" : undefined,
            })}
          </p>
        ) : null}
      </div>

      {/* Details */}
      <div className="mx-auto max-w-xl space-y-8 px-6 pb-12 text-center">
        {bool("show_countdown") && eventDate ? (
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest" style={{ color: accent }}>Counting down to forever</p>
            <CountdownTimer targetIso={eventDate.toISOString()} accent={accent} />
          </div>
        ) : null}

        {str("invitation_wording") ? (
          <blockquote className="whitespace-pre-line font-serif text-lg leading-relaxed" style={{ color: "#2B2622" }}>
            {str("invitation_wording")}
          </blockquote>
        ) : null}

        {str("family_names") ? (
          <p className="whitespace-pre-line text-sm" style={{ color: "#4A423B" }}>{str("family_names")}</p>
        ) : null}

        {str("venue_name") ? (
          <div>
            <p className="text-xs uppercase tracking-widest" style={{ color: accent }}>Venue</p>
            <p className="mt-1 font-serif text-xl">{str("venue_name")}</p>
            {str("venue_address") ? (
              <p className="mt-1 whitespace-pre-line text-sm" style={{ color: "#4A423B" }}>{str("venue_address")}</p>
            ) : null}
            {str("map_link") ? (
              <a
                href={str("map_link")}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                Open in Maps ↗
              </a>
            ) : null}
          </div>
        ) : null}

        {str("music") && str("music") !== "none" ? (
          <p className="text-xs italic" style={{ color: "#7A7066" }}>
            ♪ This invitation is prepared with the “{str("music")}” music style for its video/website package.
          </p>
        ) : null}

        {bool("show_rsvp") && props.slug ? (
          <div className="pt-2">
            <RsvpForm slug={props.slug} accent={accent} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
