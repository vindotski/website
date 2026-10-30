type ExternalLink = { href: string; label: string };

type DetailIntroProps = {
  title: string;
  summary?: string;
  links?: ExternalLink[];
  children?: React.ReactNode;
};

export default function DetailIntro({
  title,
  summary,
  links = [],
  children,
}: DetailIntroProps) {
  return (
    <header className="flex max-w-[720px] flex-col gap-4">
      <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-6xl">
        {title}
      </h1>
      {summary && <p className="text-xl text-muted-foreground">{summary}</p>}
      {children}
      {links.length > 0 && (
        <p className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4"
            >
              {link.label} ↗
            </a>
          ))}
        </p>
      )}
    </header>
  );
}
