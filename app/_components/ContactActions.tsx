import { getContact } from "@/lib/api";
import ButtonLink from "./ButtonLink";

// The ways to reach me, shared by the hero and the contact prompt.
// The parent lays them out; tone picks colours for a light or dark background
export default async function ContactActions({
  tone,
}: {
  tone: "light" | "dark";
}) {
  const contact = await getContact();
  const secondary = tone === "light" ? "secondary" : "inverseSecondary";

  return (
    <>
      <ButtonLink
        href={contact.callUrl}
        variant={tone === "light" ? "primary" : "inverse"}
        icon={<CalendarIcon />}
        newTab
      >
        Book a call
      </ButtonLink>
      <ButtonLink
        href={`mailto:${contact.email}`}
        variant={secondary}
        icon={<MailIcon />}
      >
        Email me
      </ButtonLink>
    </>
  );
}

// Icons are square-cornered, to match the rest of the site
function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" />
      <path d="m3 6 9 7 9-7" />
    </svg>
  );
}
