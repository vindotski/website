import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toTag } from "@/lib/format";
import type { Image as ContentImage } from "@/types/common";
import { cn } from "@/lib/utils";
import Tags from "@/components/tags";

const wideColumns = { 2: "wide:grid-cols-2", 3: "wide:grid-cols-3" };

const label =
  "font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase";

// Columns on wide screens; a featured card lines up with the same columns.
// A list by role, so each Card can be a direct grid item, which the featured
// card's subgrid needs
export function ProjectGrid({
  columns = 3,
  children,
}: {
  columns?: 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div
      role="list"
      className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2", wideColumns[columns])}
    >
      {children}
    </div>
  );
}

type ProjectCardProps = {
  // Shown above the image: kind of work and years
  label: { start: string; end: string };
  // Optional line above the name, e.g. the company
  eyebrow?: string;
  name: string;
  href: string;
  image: ContentImage;
  // Takes a whole row, image beside the text on wider screens
  featured?: boolean;
  // In a 2-column grid, so the image is shown larger
  wide?: boolean;
  children: React.ReactNode;
};

export function ProjectSummary({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex-1 text-base group-data-[featured=true]/card:flex-none group-data-[featured=true]/card:text-xl">
      {children}
    </p>
  );
}

// A result worth calling out, for the featured card
export function ProjectImpact({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t pt-3">
      <p className={label}>Impact</p>
      <p className="text-base font-semibold">{children}</p>
    </div>
  );
}

// The stack as #tags, matching the blog list
export function ProjectTags({ stack }: { stack: string[] }) {
  return (
    <p>
      <Tags tags={stack.map(toTag)} />
    </p>
  );
}

export function ProjectCard({
  label: { start, end },
  eyebrow,
  name,
  href,
  image,
  featured = false,
  wide = false,
  children,
}: ProjectCardProps) {
  return (
    <Card
      role="listitem"
      data-featured={featured}
      className={cn(
        "relative",
        // No border to light up, so keyboard focus rings the whole card
        "has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring",
        featured && [
          "col-span-full",
          // Tablets and up: the card shares the columns of the cards below.
          // The image spans all but the last column, the text takes the
          // last; the empty first and last rows centre the text
          "md:grid md:grid-cols-subgrid md:grid-rows-[1fr_auto_auto_auto_1fr] md:gap-y-0",
        ],
      )}
    >
      <p
        className={cn(
          "flex justify-between gap-4 px-(--card-spacing)",
          label,
          featured && "md:col-start-[-2] md:row-start-2 md:mb-4",
        )}
      >
        <span>{start}</span>
        <span>{end}</span>
      </p>
      {/* Fixed 16:10 frame, so cards line up whatever size the images are */}
      <div
        className={cn(
          "relative mx-(--card-spacing) aspect-[16/10] overflow-hidden bg-muted",
          featured && "md:col-span-1 md:col-start-1 md:col-end-[-2] md:row-span-full",
        )}
      >
        <Image
          src={image.src}
          alt={image.alt}
          fill
          className="object-cover"
          sizes={
            featured
              ? "(min-width: 1080px) 700px, (min-width: 768px) 60vw, 100vw"
              : wide
                ? "(min-width: 1080px) 528px, (min-width: 640px) 50vw, 100vw"
                : "(min-width: 1080px) 344px, (min-width: 640px) 50vw, 100vw"
          }
        />
      </div>
      {/* CardHeader is a container query container, which would also make it
          the box the stretched link fills; turned off, the link fills the
          card */}
      <CardHeader
        className={cn(
          "[container-type:normal]",
          featured && "md:col-start-[-2] md:row-start-3",
        )}
      >
        {eyebrow && <CardDescription className={label}>{eyebrow}</CardDescription>}
        <CardTitle className="text-xl font-semibold tracking-tight group-data-[featured=true]/card:text-2xl">
          {/* CardTitle is a div; the h3 keeps the heading outline */}
          <h3 className="flex items-baseline gap-2">
            {/* Stretched over the whole card so the card is one click target */}
            <Link
              href={href}
              className="underline-offset-4 outline-none group-hover/card:underline after:absolute after:inset-0"
            >
              {name}
            </Link>
            <span
              className="text-muted-foreground transition-transform group-hover/card:translate-x-1 group-hover/card:text-foreground group-has-[a:focus-visible]/card:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </h3>
        </CardTitle>
      </CardHeader>
      <CardContent
        className={cn(
          "flex flex-1 flex-col gap-2 group-data-[featured=true]/card:gap-4",
          featured && "md:col-start-[-2] md:row-start-4",
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}
