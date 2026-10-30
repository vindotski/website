import Link from "next/link";
import { Fragment } from "react";
import { getServices } from "@/lib/api";
import Section from "./Section";

export default async function Services() {
  const services = await getServices();

  return (
    <Section id="services" title="Services">
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-8">
        {services.map((service) => (
          <li key={service.name} className="flex flex-col gap-2">
            <p className="font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">{service.name}</p>
            <h3 className="text-xl font-semibold tracking-tight">
              {service.headline}
            </h3>
            {/* Grows, so the proof links line up across columns */}
            <p className="flex-1">{service.line}</p>
            {service.proof.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                See:{" "}
                {service.proof.map((item, index) => (
                  <Fragment key={item.href}>
                    {index > 0 && " · "}
                    <Link
                      href={item.href}
                      className="text-foreground underline underline-offset-4"
                    >
                      {item.name}
                    </Link>
                  </Fragment>
                ))}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}
