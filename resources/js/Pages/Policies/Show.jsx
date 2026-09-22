import { Head, Link } from "@inertiajs/react";

export default function PolicyShow({ title, content }) {
  const sections = String(content ?? "")
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);

  return (
    <main className="bg-slate-50/60 px-4 py-12 sm:px-6 lg:px-8">
      <Head title={title} />

      <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
          Health Care policies
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>

        <div className="mt-8 space-y-5 text-sm leading-7 text-slate-600 sm:text-base">
          {sections.length > 0 ? (
            sections.map((section, index) => (
              <p key={`${index}-${section.slice(0, 24)}`}>{formatPolicyText(section)}</p>
            ))
          ) : (
            <p>This policy is currently being updated.</p>
          )}
        </div>

        <Link
          href="/contact"
          className="mt-10 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-hover"
        >
          Contact us with questions
        </Link>
      </article>
    </main>
  );
}

function formatPolicyText(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold text-slate-900">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}
