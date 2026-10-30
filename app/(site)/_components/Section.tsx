type SectionProps = {
  id: string;
  title: string;
  children: React.ReactNode;
};

// scroll-mt keeps the heading clear of the sticky header when jumped to
export default function Section({ id, title, children }: SectionProps) {
  return (
    <section
      id={id}
      className="mx-auto w-full max-w-content scroll-mt-header px-gutter py-20"
      aria-labelledby={`${id}-title`}
    >
      <h2
        id={`${id}-title`}
        className="mb-8 text-4xl font-semibold tracking-tight"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
