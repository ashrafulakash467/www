// import HeroCard from "@/Components/layout/home-care/Hero-card";

export default function Home({ doctors = [] }) {
  return (
    <main className="flex-1">
      <HeroCard doctors={doctors} />
    </main>
  );
}
