import Link from "next/link";

type NextLinkProps = {
  href: string;
  name: string;
};

export default function NextLink({ href, name }: NextLinkProps) {
  return (
    <nav className="border-t pt-8" aria-label="Next">
      <Link href={href} className="group inline-flex flex-col gap-1">
        <span className="font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Next
        </span>
        <span className="text-2xl font-semibold tracking-tight underline-offset-4 group-hover:underline">
          {name} →
        </span>
      </Link>
    </nav>
  );
}
