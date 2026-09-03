import { Link } from "@inertiajs/react";

const companyLinks = [
  "About Us",
  "Contact",
  "Services",
  "Blog",
  "Diseases and Conditions",
  "Privacy Policy",
  "Terms & Conditions",
];

const patientLinks = [
  "FAQ's",
  "Find Doctors",
  "Find Ambulances",
  "Privacy Policy",
  "Terms & Conditions",
  "Patient No-Show Policy",
  "Cancellation & Refund Policy",
];

const doctorLinks = [
  "Login as Doctor",
  "Work with Us",
  "Privacy Policy",
  "Terms & Conditions",
  "Patient No-Show Policy",
  "Account Deletion",
];

const socialLinks = [
  { label: "Facebook", icon: <FacebookIcon /> },
  { label: "LinkedIn", icon: <LinkedInIcon /> },
  { label: "YouTube", icon: <YoutubeIcon /> },
  { label: "Twitter", icon: <TwitterIcon /> },
  { label: "Instagram", icon: <InstagramIcon /> },
  { label: "Messenger", icon: <MessengerIcon /> },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#3b423a] text-white">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#a7f0dd]" />

      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr_0.9fr_1fr]">
          <section className="space-y-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-lg font-semibold text-brand-foreground shadow-lg shadow-brand/25">
                HC
              </span>
              <span className="leading-tight">
                <span className="block text-base font-semibold tracking-wide text-white">
                  Health Care
                </span>
                <span className="block text-xs uppercase tracking-[0.24em] text-white/60">
                  Wellness made simple
                </span>
              </span>
            </Link>

            <p className="max-w-sm text-base leading-7 text-white/90">
              We are on a mission to make quality healthcare affordable and
              accessible for the people of Bangladesh.
            </p>

            <div className="flex flex-wrap gap-3">
              {socialLinks.map((item) => (
                <Link
                  key={item.label}
                  href="#"
                  aria-label={item.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white text-[#345c32] transition hover:-translate-y-0.5 hover:bg-[#a7f0dd]"
                >
                  {item.icon}
                </Link>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <a
                href="tel:09611530530"
                className="flex items-center gap-3 text-lg font-bold text-white transition hover:text-[#a7f0dd]"
              >
                <PhoneIcon className="h-5 w-5 text-[#a7f0dd]" />
                09611 530 530
              </a>
              <a
                href="tel:01405600700"
                className="flex items-center gap-3 text-lg font-bold text-white transition hover:text-[#a7f0dd]"
              >
                <AmbulanceIcon className="h-5 w-5 text-[#a7f0dd]" />
                01405 600 700
              </a>
            </div>
          </section>

          <FooterColumn title="Health Care ltd." links={companyLinks} />
          <FooterColumn title="For Patients" links={patientLinks} />
          <FooterColumn title="For Doctors/Organisations" links={doctorLinks} />
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
          </div>

          <p className="mt-10 text-center text-sm text-white/70">
            Copyright 2026 Health Care Limited. All rights reserved.
          </p>
        </div>
      </div>

      <a
        href="#top"
        aria-label="Back to top"
        className="fixed bottom-6 right-6 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#a7f0dd] text-[#345c32] shadow-[0_14px_36px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:bg-[#97cd97]"
      >
        <UpArrowIcon className="h-5 w-5" />
      </a>
    </footer>
  );
}

function FooterColumn({ title, links }) {
  return (
    <section>
      <h2 className="text-xl font-extrabold text-white">{title}</h2>
      <ul className="mt-6 space-y-4 text-base text-white/90">
        {links.map((link) => (
          <li key={link}>
            <Link href="#" className="transition hover:text-[#a7f0dd]">
              {link}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function UpArrowIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

function PhoneIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.98.37 1.94.72 2.86a2 2 0 0 1-.45 2.11L8.27 9.73a16 16 0 0 0 6 6l1.04-1.1a2 2 0 0 1 2.11-.45c.92.35 1.88.59 2.86.72A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function AmbulanceIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h3l3 3v4h-6z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
      <path d="M6 7V4h4" />
      <path d="M7 5v4" />
      <path d="M5 7h4" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.7-1.6H16V5c-.5-.1-1.5-.2-2.6-.2-2.5 0-4.2 1.5-4.2 4.2V11H6.5v3H9v8h4.5z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M6.5 8.5H3.7V21h2.8V8.5ZM5.1 3A1.6 1.6 0 1 0 5.1 6.2 1.6 1.6 0 0 0 5.1 3ZM20.3 21h-2.8v-6.5c0-1.5-.6-2.4-1.9-2.4-1 0-1.6.7-1.9 1.3-.1.2-.1.6-.1.9V21h-2.8s0-10.6 0-11.5h2.8v1.6c.4-.7 1.2-1.8 3-1.8 2.2 0 3.7 1.4 3.7 4.5V21Z" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M21.5 7.2s-.2-1.4-.9-2c-.8-.8-1.7-.8-2.1-.9C15.6 4 12 4 12 4s-3.6 0-6.5.3c-.4.1-1.3.1-2.1.9-.7.6-.9 2-.9 2S2.2 8.8 2.2 10.4v1.3c0 1.6.3 3.2.3 3.2s.2 1.4.9 2c.8.8 1.9.8 2.4.9 1.7.2 6.2.3 6.2.3s3.6 0 6.5-.3c.4-.1 1.3-.1 2.1-.9.7-.6.9-2 .9-2s.3-1.6.3-3.2v-1.3c0-1.6-.3-3.2-.3-3.2ZM10 14.7V8.9l5.6 2.9L10 14.7Z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M21.6 7.1c-.7.3-1.4.4-2.1.5.8-.5 1.3-1.1 1.6-2-.7.4-1.5.8-2.4.9a3.7 3.7 0 0 0-6.4 3.4A10.5 10.5 0 0 1 3.1 6.2a3.7 3.7 0 0 0 1.1 5 3.7 3.7 0 0 1-1.7-.5v.1a3.7 3.7 0 0 0 3 3.6c-.3.1-.8.1-1.2.1-.3 0-.6 0-.9-.1a3.7 3.7 0 0 0 3.4 2.6A7.5 7.5 0 0 1 2.4 19c1.1.7 2.3 1 3.7 1 4.4 0 7.3-3.7 7.3-7.3v-.3c.5-.4 1.1-1 1.6-1.6.7-.8 1.2-1.7 1.6-2.7Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9ZM12 7.2A4.8 4.8 0 1 1 12 16.8 4.8 4.8 0 0 1 12 7.2Zm0 2A2.8 2.8 0 1 0 12 15a2.8 2.8 0 0 0 0-5.8Zm5.1-2.6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.5 2 2 6.2 2 11.4c0 2.9 1.5 5.5 3.9 7.2V22l3.2-1.8c.9.2 1.8.3 2.9.3 5.5 0 10-4.2 10-9.4S17.5 2 12 2Zm1 12.7-2.6-2.8-5 2.8 5.5-5.8 2.5 2.8 5.1-2.8-5.5 5.8Z" />
    </svg>
  );
}
