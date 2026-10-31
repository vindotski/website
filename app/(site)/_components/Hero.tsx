import Image from "next/image";
import { getHero, getSocials } from "@/lib/api";
import { cn } from "@/lib/utils";
// TODO: replace with a larger cut-out (1500–2048px); this one is 500px
import portrait from "@/public/images/portrait-cutout.png";
import ButtonLink from "./ButtonLink";
import ScrollLink from "./ScrollLink";
import { ChatIcon } from "./ContactIcons";
import SocialIcon from "./SocialIcon";

// The cue and GitHub links at the bottom, in the card labels' small mono voice
const bottomLink =
  "flex items-center p-2 font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase hover:text-foreground";

// Layout by width: phones stack the photo over the text; `split` (tablets,
// and phones held sideways) puts text left and photo right;
// `short-landscape` squeezes that onto a short sideways phone; `wide` gives
// the photo more room. Custom variants sort after breakpoints, so the column
// widths use variants that never overlap (short-landscape, md, wide)
export default async function Hero() {
  const [hero, socials] = await Promise.all([getHero(), getSocials()]);
  const linkedIn = socials.find((social) => social.name === "LinkedIn");
  const gitHub = socials.find((social) => social.name === "GitHub");

  return (
    // The dark theme, edge to edge
    <div className="dark bg-background text-foreground">
      <section
        // At least the screen below the header. svh is the height with the
        // phone toolbars showing, so the hero never hides under them or jumps
        // on scroll. Bottom padding leaves room for the scroll cue
        className="relative mx-auto flex min-h-[calc(100svh-var(--header-height))] max-w-content flex-col items-center justify-center gap-6 px-gutter pt-12 pb-20 split:grid split:items-center short-landscape:grid-cols-[1fr_200px] short-landscape:gap-8 short-landscape:pt-4 short-landscape:pb-14 md:grid-cols-[1fr_280px] md:gap-8 wide:grid-cols-[1fr_380px] wide:gap-12"
        aria-label="Introduction"
      >
        {/* Phones: one left edge for everything under the photo */}
        <div className="flex flex-col items-start gap-4 self-stretch text-left split:gap-6 split:self-auto short-landscape:gap-3">
          {/* The title as an eyebrow: a short lead-in line, then a label */}
          <p className="inline-flex items-center gap-3 font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase before:h-px before:w-6 before:bg-foreground">
            {hero.title}
          </p>
          {/* One step smaller on phones, so the photo keeps its room; on a
              short sideways phone it scales with the height, so three lines
              always fit. Balanced, so no single word is left on a line */}
          <h1 className="max-w-[16ch] text-4xl leading-[1.1] font-semibold tracking-tight text-balance split:text-6xl short-landscape:text-[min(2.25rem,9svh)]">
            {hero.headline}
          </h1>
          <p className="text-muted-foreground">{hero.availability}</p>
          {/* Phones: two equal buttons, gutter to gutter; from tablet width
              they keep their natural width. GitHub joins them from 768px,
              once the cue is centred; below that it sits by the cue */}
          <div className="grid grid-cols-2 gap-3 self-stretch *:nth-3:hidden sm:flex sm:flex-wrap split:self-auto md:*:nth-3:inline-flex">
            {/* Leads to the contact prompt in the footer */}
            <ButtonLink href="#contact" icon={<ChatIcon />} event="contact_open">
              Get in touch
            </ButtonLink>
            {linkedIn && (
              <ButtonLink
                href={linkedIn.href}
                variant="secondary"
                icon={<SocialIcon name="LinkedIn" />}
                newTab
              >
                LinkedIn
              </ButtonLink>
            )}
            {gitHub && (
              <ButtonLink
                href={gitHub.href}
                variant="secondary"
                icon={<SocialIcon name="GitHub" />}
                label="GitHub"
                newTab
              />
            )}
          </div>
        </div>
        {/* Phones: on top of the text (it comes after it in the HTML), taking
            only the height the text leaves, out to the screen edges and into
            the gap above the text, as a size container for the photo. From
            `split` the wrapper steps aside and the photo is the grid item */}
        <div className="order-first -mx-gutter -mt-12 -mb-6 flex min-h-40 flex-[1_1_0] items-end justify-center self-stretch [container-type:size] split:contents">
          <Image
            src={portrait}
            alt="Ivan Vinski"
            placeholder="blur"
            // The largest thing on screen, so it loads first
            preload
            sizes="(min-width: 900px) 380px, (min-width: 768px) 280px, 100vw"
            // Phones: a square as big as the area allows (max 480px), so the
            // photo never zooms in. Beside the text: 4:5, which trims the
            // sides of the square photo; as tall as a sideways phone allows
            className="portrait-mask size-[min(100cqw,100cqh,480px)] object-cover grayscale split:aspect-[4/5] split:h-auto split:w-full split:grayscale-0 short-landscape:max-h-[calc(100svh-var(--header-height)-72px)]"
          />
        </div>
        {/* The scroll cue and GitHub. Phones: the cue at the left edge and
            GitHub at the right, offset by the links' padding so they line up
            with the gutters. From `split`: centred, label above the arrow,
            GitHub right beside it */}
        <div className="absolute inset-x-[calc(var(--gutter)-8px)] bottom-4 flex items-center justify-between split:right-auto split:left-1/2 split:-translate-x-1/2 short-landscape:left-[calc(var(--gutter)-8px)] short-landscape:translate-x-0">
          <ScrollLink
            href="#work"
            className={cn(
              bottomLink,
              "gap-2 split:flex-col split:gap-1 short-landscape:flex-row short-landscape:gap-2",
            )}
          >
            See work
            {/* After the label in the HTML, before it on phones; nudges down */}
            <span
              className="order-first font-sans text-xl leading-none motion-safe:animate-nudge split:order-none short-landscape:order-first"
              aria-hidden="true"
            >
              ↓
            </span>
          </ScrollLink>
          {/* Phones: GitHub sits by the cue instead of with the buttons. The
              links' padding minus 4px leaves the buttons' 12px gap */}
          {gitHub && (
            <a
              href={gitHub.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(bottomLink, "gap-2 split:-ml-1 md:hidden [&_svg]:size-4")}
            >
              <SocialIcon name="GitHub" />
              GitHub
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
