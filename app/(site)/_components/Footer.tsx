import { cacheLife } from "next/cache";
import Image from "next/image";
import { getContact, getSocials } from "@/features/profile/api/profile";
import portrait from "@/public/images/portrait.jpg";
import ContactActions from "@/features/profile/components/contact-actions";
import ScrollLink from "@/components/scroll-link";
import { PersonIcon } from "@/components/contact-icons";
import SocialIcon from "@/components/social-icon";
import { Separator } from "@/components/ui/separator";
import { trackAttributes } from "@/lib/analytics/track";

// Cached so the page can still be prerendered; refreshed daily for the new year
async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

// Ends every page: the contact prompt, then the small print.
// Every "Get in touch" link lands here
export default async function Footer() {
  const [contact, socials] = await Promise.all([getContact(), getSocials()]);

  return (
    <footer
      id="contact"
      // Dark, edge to edge; the content keeps the page column. Jumped-to
      // links stop below the sticky header
      className="dark scroll-mt-header bg-background text-foreground"
    >
      <section
        className="mx-auto flex max-w-content flex-col gap-10 px-gutter py-14 [--avatar:48px] sm:gap-6 sm:py-20 sm:[--avatar:64px]"
        aria-label="Contact"
      >
        {/* A two-sided chat: Ivan asks on the left, the visitor answers on
            the right with the buttons. Phones: each bubble also takes the
            other side's column, for room; wider screens: each keeps to its
            side */}
        <div className="grid grid-cols-[var(--avatar)_minmax(0,1fr)_var(--avatar)] items-start gap-x-4 gap-y-3 [grid-template-areas:'who_._.'_'avatar_bubble_bubble'_'reply_reply_visitor'] sm:max-w-full sm:grid-cols-[var(--avatar)_auto_var(--avatar)] sm:self-center sm:[grid-template-areas:'who_._.'_'avatar_bubble_.'_'._reply_visitor']">
          <span className="[grid-area:who] font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">Ivan</span>
          <Image
            src={portrait}
            alt="Ivan Vinski"
            sizes="64px"
            className="[grid-area:avatar] size-(--avatar) object-cover object-[center_25%] grayscale"
          />
          {/* The tails: a square turned 45°, filled with the background, two
              edges drawn, pointing at the avatar's middle */}
          <p className="relative [grid-area:bubble] max-w-[18ch] border border-foreground px-6 py-4 text-3xl leading-tight font-semibold tracking-tight text-balance before:absolute before:top-[calc(var(--avatar)/2-6px)] before:-left-[7px] before:size-3 before:rotate-45 before:border-b before:border-l before:border-foreground before:bg-background sm:text-4xl">
            {contact.prompt}
          </p>
          <div className="relative [grid-area:reply] justify-self-end border border-foreground p-3 after:absolute after:top-[calc(var(--avatar)/2-6px)] after:-right-[7px] after:size-3 after:rotate-45 after:border-t after:border-r after:border-foreground after:bg-background">
            {/* Phones: stacked, full width; wider screens: side by side */}
            <div className="grid gap-3 sm:flex sm:flex-wrap">
              <ContactActions tone="dark" />
            </div>
          </div>
          {/* The visitor, with "You" right under the avatar */}
          <span className="flex [grid-area:visitor] flex-col items-center gap-2">
            <span
              className="flex size-(--avatar) items-center justify-center border border-foreground text-muted-foreground [&_svg]:size-1/2"
              aria-hidden="true"
            >
              <PersonIcon />
            </span>
            <span className="font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">You</span>
          </span>
        </div>
      </section>
      {/* The small print, under a line that spans the content. Phones: the
          icons, © and Back to top, each centred on its own row; wider
          screens: © left, icons centred, Back to top right */}
      <div className="mx-auto max-w-content px-gutter">
        <Separator />
        <div className="grid items-center justify-items-center gap-4 py-6 text-sm text-muted-foreground [grid-template-areas:'icons'_'copy'_'top'] sm:grid-cols-[1fr_auto_1fr] sm:justify-items-stretch sm:gap-x-6 sm:py-8 sm:[grid-template-areas:'copy_icons_top']">
          <p className="[grid-area:copy]">
            © <CurrentYear /> Ivan Vinski
          </p>
          {/* 44px tap targets, pulled in so they don't add height */}
          <ul className="-my-[11px] flex [grid-area:icons] gap-1">
            {socials.map((social) => (
              <li key={social.name}>
                <a
                  href={social.href}
                  {...trackAttributes({
                    event: "outbound_click",
                    kind: social.name.toLowerCase(),
                    location: "footer",
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="flex size-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground [&_svg]:size-[22px]"
                >
                  <SocialIcon name={social.name} />
                </a>
              </li>
            ))}
          </ul>
          <ScrollLink
            href="#top"
            className="[grid-area:top] underline-offset-4 hover:text-foreground hover:underline sm:justify-self-end"
          >
            Back to top
          </ScrollLink>
        </div>
      </div>
    </footer>
  );
}
