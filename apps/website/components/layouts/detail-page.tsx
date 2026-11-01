import ScrollLink from "../scroll-link";

type DetailPageProps = {
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
};

export default function DetailPage({
  backHref,
  backLabel,
  children,
}: DetailPageProps) {
  return (
    <article className="mx-auto flex w-full max-w-content flex-col gap-10 px-gutter pt-12 pb-20">
      <ScrollLink
        href={backHref}
        className="self-start text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← {backLabel}
      </ScrollLink>
      {children}
    </article>
  );
}
