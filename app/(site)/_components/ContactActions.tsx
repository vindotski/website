import { getContact } from "@/lib/api";
import ButtonLink from "@/components/button-link";
import { CalendarIcon, MailIcon } from "@/components/contact-icons";

// The ways to reach me, in the footer's contact prompt: email first, then a
// call. The parent lays them out; tone picks colours for a light or dark
// background
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
        href={`mailto:${contact.email}`}
        variant={tone === "light" ? "primary" : "inverse"}
        icon={<MailIcon />}
        track={{ event: "contact_click", method: "contact_email", location: "footer" }}
      >
        Email me
      </ButtonLink>
      <ButtonLink
        href={contact.callUrl}
        variant={secondary}
        icon={<CalendarIcon />}
        track={{ event: "contact_click", method: "contact_call", location: "footer" }}
        newTab
      >
        Book a call
      </ButtonLink>
    </>
  );
}
