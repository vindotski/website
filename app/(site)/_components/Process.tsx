import Section from "./Section";

const steps = [
  { title: "Understand", line: "What hurts, and why it matters." },
  { title: "Shape", line: "The smallest thing worth building." },
  { title: "Ship", line: "End to end. Small steps. Real users." },
  { title: "Measure", line: "Did it solve the problem?" },
  { title: "Iterate", line: "Improve, expand or cut. Then back to 01." },
];

export default function Process() {
  return (
    <Section id="process" title="Process">
      <ol className="divide-y border-y">
        {steps.map((step, index) => (
          <li
            key={step.title}
            // Phones: the line sits under the title; tablets and up: one row
            className="grid grid-cols-[48px_1fr] gap-x-4 gap-y-1 py-5 md:grid-cols-[64px_200px_1fr] md:items-baseline"
          >
            <span className="font-mono text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
            <p className="col-start-2 text-muted-foreground md:col-start-auto">
              {step.line}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
