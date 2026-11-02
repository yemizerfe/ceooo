import HeroCanvas from "./components/HeroCanvas";
import FeaturesSection from "./components/FeaturesSection2";
import HowItWorks from "./components/howitworks";
import Testimonials from "./components/Testimonials";

export default function Home() {
  return (
    <>
      <HeroCanvas />
      <FeaturesSection />
      <HowItWorks />
      <Testimonials />
    </>
  );
}
