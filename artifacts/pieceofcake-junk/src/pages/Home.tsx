import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Star, Clock, Leaf, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { RemovalItemsSection } from "@/components/home/RemovalItemsSection";
import { GoogleReviewsSection } from "@/components/home/GoogleReviewsSection";
import { useListServices } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

// Assets
import truckImg from "@assets/image_1785195883268.png";
import adImg from "@assets/image_1785195842710.png";
import flyerImg from "@assets/image_1785195864625.png";
import heroBg from "@assets/hero-bg.jpg";
import { useRef } from "react";

export default function Home() {
  const { data: services, isLoading } = useListServices();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const containerRef = useRef(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
  };

  return (
    <div className="flex flex-col w-full overflow-hidden" ref={containerRef}>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-24 pb-12 overflow-hidden bg-background">
        <motion.div 
          className="absolute inset-0 z-0 opacity-20 pointer-events-none"
          style={{ y, backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        
        {/* Animated Particles background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-secondary"
              initial={{
                opacity: Math.random() * 0.5,
                x: Math.random() * 100 + "vw",
                y: Math.random() * 100 + "vh",
                scale: Math.random() * 2,
              }}
              animate={{
                y: [null, Math.random() * -500],
                opacity: [null, 0],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                ease: "linear" as const
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <motion.div 
              className="flex flex-col"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 w-fit mb-6">
                <Star className="w-4 h-4 text-secondary fill-secondary" />
                <span className="text-sm font-bold text-secondary-foreground">5.0 Star Rated Service in GTA</span>
              </motion.div>
              
              <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl lg:text-8xl font-black font-display leading-[0.9] tracking-tight mb-6">
                JUNK REMOVAL <br/>
                <span className="text-primary relative inline-block mt-2">
                  MADE EASY.
                  <svg className="absolute w-full h-4 -bottom-1 left-0 text-secondary" viewBox="0 0 200 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 7C48 3.5 130 -1.5 198 7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </motion.h1>
              
              <motion.p variants={itemVariants} className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg">
                Same-day service, fast and reliable, eco-friendly disposal. We handle the heavy lifting so you don't have to.
              </motion.p>
              
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
                <Link href="/book">
                  <Button size="lg" className="h-14 px-8 text-lg rounded-2xl shadow-xl hover:shadow-primary/30 group">
                    Book Free Estimate
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <a href="tel:437-775-9626">
                  <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-2xl bg-white border-2">
                    Call 437-775-9626
                  </Button>
                </a>
              </motion.div>

              <motion.div variants={itemVariants} className="flex items-center gap-8 mt-10 text-sm font-bold text-muted-foreground">
                <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Same-Day</div>
                <div className="flex items-center gap-2"><Leaf className="w-5 h-5 text-green-500" /> Eco-Friendly</div>
                <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-blue-500" /> Fully Insured</div>
              </motion.div>
            </motion.div>

            <motion.div 
              className="relative hidden lg:block"
              initial={{ opacity: 0, x: 50, rotate: -5 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
            >
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
              <motion.img 
                src={truckImg} 
                alt="Piece of Cake Junk Truck" 
                className="relative z-10 w-[120%] max-w-[120%] -ml-10 object-contain drop-shadow-2xl"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" as const }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-black font-display mb-4"
            >
              Our Services
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground text-lg max-w-2xl mx-auto"
            >
              From a single item to a full property cleanout, we've got you covered with upfront pricing.
            </motion.p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services?.slice(0, 6).map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -10 }}
                  className="bg-card rounded-3xl p-8 shadow-sm border hover:shadow-xl hover:border-primary/20 transition-all group"
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <CheckCircle2 className="w-7 h-7 text-primary group-hover:text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold font-display mb-2">{service.name}</h3>
                  <p className="text-muted-foreground mb-6 line-clamp-2">{service.description}</p>
                  <Link href="/book" className="mt-auto block">
                    <Button className="rounded-xl w-full">Book Free Estimate</Button>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link href="/services">
              <Button variant="outline" size="lg" className="rounded-2xl">
                View All Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* What We Take Section */}
      <RemovalItemsSection />

      {/* Before / After Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.h2 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-black font-display mb-6"
              >
                The Proof is in the <span className="text-primary">Cleanout</span>.
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-lg text-muted-foreground mb-8"
              >
                We don't just haul junk; we reclaim your space. Slide to see the transformation of this property from cluttered mess to pristine ready-to-use area.
              </motion.p>
              
              <ul className="space-y-4 mb-8">
                {[
                  "Complete property cleanouts",
                  "Construction debris removal",
                  "Appliance & furniture hauling",
                  "Eco-friendly recycling sorting"
                ].map((item, i) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + (i * 0.1) }}
                    className="flex items-center gap-3 font-bold"
                  >
                    <div className="bg-secondary text-secondary-foreground rounded-full p-1">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    {item}
                  </motion.li>
                ))}
              </ul>
              <Link href="/book">
                <Button size="lg" className="h-14 px-8 rounded-2xl">Get Your Space Back</Button>
              </Link>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              {/* Note: We use the adImg and flyerImg as placeholders for the slider since actual before/after photos weren't provided. */}
              <BeforeAfterSlider 
                beforeImage={adImg}
                afterImage={flyerImg}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Google Reviews Section */}
      <GoogleReviewsSection />

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-background/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
        
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-6xl font-black font-display mb-6 text-white">
              Ready to clear the clutter?
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-10">
              Book your free estimate in 60 seconds. We'll show up on time, give you a final quote, and make your junk disappear. It's a piece of cake.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/book">
                <Button size="lg" variant="secondary" className="h-16 px-10 text-lg rounded-2xl shadow-xl shadow-black/20">
                  Book Free Estimate
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
