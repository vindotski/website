type Fact = {
  label: string;
  value: React.ReactNode;
};

export default function Facts({ facts }: { facts: Fact[] }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6 border-y py-6">
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-2">
          <dt className="font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {fact.label}
          </dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
