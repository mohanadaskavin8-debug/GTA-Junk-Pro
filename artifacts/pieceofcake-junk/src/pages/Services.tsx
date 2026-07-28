import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Package, Truck, Recycle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListServices } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

// Assets
import servicesBg from "@assets/services-bg.jpg";

export default function Services() {
  const { data: services, isLoading } = useListServices();

  const getIcon = (name?: string | null) => {
    switch(name) {
      case 'truck': return <Truck className="w-8 h-8" />;
      case 'recycle': return <Recycle className="w-8 h-8" />;
      default: return <Package className="w-8 h-8" />;
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen">
      {/* Page Header */}
      <section className="relative pt-32 pb-20 bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${servicesBg})` }}
        />
        <div className="container mx-auto px-4 md:px-6 relative z-20 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-black font-display text-white mb-4"
          >
            Clear Transparent Pricing
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-white/90 max-w-2xl mx-auto"
          >
            No hidden fees. No surprises. Just straightforward pricing based on volume and item type.
          </motion.p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-72 rounded-3xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services?.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-3xl p-8 border shadow-sm flex flex-col hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                      {getIcon(service.iconName)}
                    </div>
                    {service.isActive ? (
                      <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold px-3 py-1 rounded-full">Available</span>
                    ) : (
                      <span className="bg-muted text-muted-foreground text-xs font-bold px-3 py-1 rounded-full">Coming Soon</span>
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-bold font-display mb-3">{service.name}</h3>
                  <p className="text-muted-foreground mb-8 flex-1">{service.description}</p>
                  
                  <div className="flex items-center justify-between pt-6 border-t">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{service.unit}</span>
                      <span className="text-3xl font-black text-primary">${service.price}</span>
                    </div>
                    <Link href={`/book?service=${service.id}`}>
                      <Button variant="outline" className="rounded-full">Book</Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black font-display mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Three simple steps to reclaim your space.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-1 bg-border -z-10" />
            
            {[
              { title: "Book Online", desc: "Select a service and pick a time slot that works for you." },
              { title: "We Arrive", desc: "Our team arrives on time, reviews the items, and provides a final quote." },
              { title: "Junk Removed", desc: "We haul everything away and sweep up the area. Piece of cake." }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-24 h-24 rounded-full bg-background border-4 border-background flex items-center justify-center mb-6 shadow-xl text-3xl font-black text-primary font-display">
                  {i + 1}
                </div>
                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Footer Banner CTA */}
      <section className="py-16 bg-secondary text-secondary-foreground text-center px-4">
        <h2 className="text-3xl font-black font-display mb-6">Need something not listed?</h2>
        <p className="mb-8 font-medium max-w-lg mx-auto">We can handle almost anything (except hazardous materials). Give us a call for a custom quote.</p>
        <a href="tel:437-775-9626">
          <Button size="lg" className="rounded-2xl h-14 px-8 bg-black text-white hover:bg-black/80">Call 437-775-9626</Button>
        </a>
      </section>
    </div>
  );
}
