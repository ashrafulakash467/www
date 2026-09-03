"use client";

import { Link } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
const slides = [
  {
    src: "/images/image001.jpg",
    alt: "Healthcare banner slide 1",
  },
  {
    src: "/images/image002.jpg",
    alt: "Healthcare banner slide 2",
  },
  {
    src: "/images/image003.jpg",
    alt: "Healthcare banner slide 3",
  },
  {
    src: "/images/image004.jpg",
    alt: "Healthcare banner slide 4",
  },
].map((slide) => ({
  ...slide,
  src: encodeURI(slide.src),
}));

export default function HomeHeroBanner() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, []);

  function goToPreviousSlide() {
    setActiveSlide((current) => (current - 1 + slides.length) % slides.length);
  }

  function goToNextSlide() {
    setActiveSlide((current) => (current + 1) % slides.length);
  }

  return (
   <div className="relative h-130 overflow-hidden">
  {/* Background Slider */}
  {slides.map((slide, index) => (
    <div
      key={slide.src}
      className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
        index === activeSlide ? "opacity-100" : "opacity-0"
      }`}
      style={{
        backgroundImage: `url(${slide.src})`,
      }}
    />
  ))}

  {/* Dark Overlay */}
  <div className="absolute inset-0 bg-gradient-to-r from-[#2c4d84]/75 via-[#2c4d84]/45 to-transparent" />

  {/* Content */}
  <div className="relative z-20 mx-auto flex h-full max-w-7xl items-center px-6 sm:px-8 lg:px-12">
    <div className="max-w-xl">
      <span className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-white">
        <span className="h-px w-8 bg-white" />
        Well Care
      </span>

      <h1 className="mt-5 text-5xl font-extrabold uppercase leading-[0.9] text-white/80 lg:text-6xl">
        PROVIDING
        <br />
        TOTAL LAB
        <br />
        SOLUTION
      </h1>

      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-white/90">
        + Caring your reports
      </p>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/find-doctor"
          className="rounded-full bg-green-900 px-7 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
        >
          View all doctors
        </Link>

        <Link
          href="#all-doctor"
          className="rounded-full border border-white px-7 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
        >
          Jump to cards
        </Link>
      </div>
    </div>
  </div>

  {/* Previous */}
  <button
    onClick={goToPreviousSlide}
    className="absolute left-5 top-1/2 z-30 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/50 bg-white/10 text-white backdrop-blur-md transition hover:bg-white hover:text-black"
  >
    <FontAwesomeIcon icon="chevron-left" aria-hidden="true" />
  </button>

  {/* Next */}
  <button
    onClick={goToNextSlide}
    className="absolute right-5 top-1/2 z-30 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/50 bg-white/10 text-white backdrop-blur-md transition hover:bg-white hover:text-black"
  >
    <FontAwesomeIcon icon="chevron-right" aria-hidden="true" />
  </button>

  {/* Dots */}
  <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 gap-2">
    {slides.map((_, index) => (
      <span
        key={index}
        className={`h-2.5 rounded-full transition-all ${
          activeSlide === index
            ? "w-8 bg-white"
            : "w-2.5 bg-white/50"
        }`}
      />
    ))}
  </div>
</div>
  );
}
