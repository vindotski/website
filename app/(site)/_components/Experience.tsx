import { getAbout, getExperience } from "@/lib/api";
import { formatYears } from "@/lib/format";
import { cn } from "@/lib/utils";
import Section from "@/components/layouts/section";

export default async function Experience() {
  const [about, roles] = await Promise.all([getAbout(), getExperience()]);

  return (
    <Section id="experience" title="Experience">
      {/* Tablets and up: intro left, staying in view while the timeline
          scrolls past; timeline right */}
      <div className="grid gap-8 md:grid-cols-[2fr_3fr] md:items-start md:gap-12">
        <p className="max-w-[640px] text-xl leading-normal md:sticky md:top-[calc(var(--header-height)+24px)]">
          {about.intro}
        </p>
        <ol className="max-w-[640px]">
          {roles.map((role) => {
            // No end year means it's the current role
            const current = role.years.end === undefined;
            return (
              <li
                key={`${role.company}-${role.years.start}`}
                // A dot per role, hollow for past ones, on a line down to the
                // next role
                className={cn(
                  "relative flex flex-col pb-6 pl-7 last:pb-0",
                  "before:absolute before:top-2 before:left-0 before:size-[11px] before:border-2 before:border-muted-foreground before:bg-background",
                  "data-[current=true]:before:border-foreground data-[current=true]:before:bg-foreground",
                  "not-last:after:absolute not-last:after:top-[23px] not-last:after:bottom-1 not-last:after:left-[5px] not-last:after:w-px not-last:after:bg-border",
                )}
                data-current={current}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-semibold">{role.title}</span>
                  <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                    {formatYears(role.years)}
                  </span>
                </div>
                <span className="text-muted-foreground">{role.company}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </Section>
  );
}
