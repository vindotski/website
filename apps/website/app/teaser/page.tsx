import Image from "next/image";
import Link from "next/link";
import portrait from "@/public/images/portrait-teaser.png";
import ButtonLink from "@/components/button-link";
import { MailIcon } from "@/components/contact-icons";
import SocialIcon from "@/components/social-icon";

// Shown by the auth guard at / until launch. A copy of the site's hero, made
// to stand alone: no header to carry the name, no footer to scroll to, and
// nothing below it to see. Indexable, so it has real text for search engines.
// The text, links and portrait are hardcoded on purpose, so the public page
// stays fixed while the site's data and images change. The layout follows the
// Hero's: see its comments for the variants
export default function TeaserPage() {
  return (
    // The dark theme, filling the screen
    <main
      className="dark relative flex-1 bg-background text-foreground"
      // Shares "/" with the home page; events say which one
      data-track-page="teaser"
    >
      {/* For me, so it stays quiet: top right, where nothing else sits at
          any width. Nofollow, since the login page is noindex */}
      <Link
        href="/auth/login"
        rel="nofollow"
        className="absolute top-3 right-[calc(var(--gutter)-8px)] z-10 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Log in
      </Link>
      <section
        // svh is the height with the phone toolbars showing, so the hero
        // never hides under them or jumps on scroll
        className="mx-auto flex min-h-svh max-w-content flex-col items-center justify-center gap-6 px-gutter py-12 split:grid split:items-center short-landscape:grid-cols-[1fr_200px] short-landscape:gap-8 short-landscape:pt-4 short-landscape:pb-12 md:grid-cols-[1fr_280px] md:gap-8 wide:grid-cols-[1fr_380px] wide:gap-12"
        aria-label="Introduction"
      >
        {/* Phones: one left edge for everything under the photo */}
        <div className="flex flex-col items-start gap-4 self-stretch text-left split:gap-6 split:self-auto short-landscape:gap-3">
          <p className="inline-flex items-center gap-3 font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase before:h-px before:w-6 before:bg-foreground">
            Ivan Vinski · Product Engineer
          </p>
          <h1 className="max-w-[16ch] text-4xl leading-[1.1] font-semibold tracking-tight text-balance split:text-6xl short-landscape:text-[min(2.25rem,9svh)]">
            Frontend by trade, full-stack by habit, product by focus.
          </h1>
          {/* At every width, since there's no header to carry it */}
          <p className="text-muted-foreground">
            Available for frontend and product work.
          </p>
          {/* Phones: one row, gutter to gutter. The email button takes what's
              left beside LinkedIn and GitHub as square icons. From tablet
              width the buttons keep their natural width */}
          <div className="flex gap-3 self-stretch *:first:flex-1 max-sm:*:first:px-3 max-sm:*:nth-2:w-9 max-sm:*:nth-2:px-0 sm:flex-wrap sm:self-auto sm:*:first:flex-none">
            <ButtonLink
              href="mailto:ivan@vin.ski"
              icon={<MailIcon />}
              track={{ event: "contact_click", method: "contact_email", location: "teaser" }}
            >
              ivan@vin.ski
            </ButtonLink>
            <ButtonLink
              href="https://www.linkedin.com/in/vindotski"
              variant="secondary"
              track={{ event: "outbound_click", kind: "linkedin", location: "teaser" }}
              icon={<SocialIcon name="LinkedIn" />}
              newTab
            >
              {/* Phones show the icon alone; the text stays for screen readers */}
              <span className="max-sm:sr-only">LinkedIn</span>
            </ButtonLink>
            <ButtonLink
              href="https://github.com/vindotski"
              variant="secondary"
              track={{ event: "outbound_click", kind: "github", location: "teaser" }}
              icon={<SocialIcon name="GitHub" />}
              label="GitHub"
              newTab
            />
          </div>
        </div>
        {/* Phones: on top of the text, taking the height the text leaves, up
            to the top of the screen and out to its edges, as a size container
            for the photo. From `split` the wrapper steps aside */}
        <div className="order-first -mx-gutter -mt-12 -mb-6 flex min-h-40 flex-[1_1_0] items-end justify-center self-stretch [container-type:size] split:contents">
          <Image
            src={portrait}
            alt="Ivan Vinski"
            placeholder="blur"
            // The largest thing on screen, so it loads first
            preload
            sizes="(min-width: 900px) 380px, (min-width: 768px) 280px, 100vw"
            className="portrait-mask size-[min(100cqw,100cqh,480px)] object-cover grayscale split:aspect-[4/5] split:h-auto split:w-full split:grayscale-0 short-landscape:max-h-[calc(100svh-64px)]"
          />
        </div>
      </section>
      {/* "Coming soon" along the bottom edge, over the section's bottom
          padding so nothing moves */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden bg-primary py-2.5 text-primary-foreground">
        {/* Read once by screen readers and search engines */}
        <p className="sr-only">Coming soon</p>
        <div
          className="flex w-max font-mono text-sm font-semibold tracking-wider whitespace-nowrap uppercase motion-safe:animate-ticker"
          aria-hidden="true"
        >
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} className="after:mx-4 after:content-['·']">
              Coming soon
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
