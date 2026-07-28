import { motion } from "framer-motion";
import { Link } from "wouter";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import truckImg from "@assets/image_1785195883268.png";

const REMOVAL_ITEMS = [
  "Fridges", "Freezers", "Renovation Debris", "Mattresses", "Box Springs",
  "Fences", "Televisions", "Hot Tubs", "Electronics", "Furnaces",
  "Clutter", "Pianos", "Sheds", "Tires", "Pallets",
  "Cardboard", "E-Waste", "Books", "Paper", "Satellite Dishes",
  "Couches", "Sofa Beds", "Carpet", "Appliances", "Decks",
  "Computers", "Scrap Metal", "Lawnmowers", "Furniture", "Brush",
  "Ceiling Tiles", "Monitors", "Shingles", "Concrete", "Gravel",
  "Plaster", "Patio Stones", "Asphalt", "Ceramic Tiles", "Bricks",
  "Wood", "Chairs", "Tables", "Garbage", "Desks",
  "Dressers", "Cabinets", "Doors", "Drywall", "Washers",
  "Dryers", "Lumber", "BBQs", "Exercise Equipment", "Trampolines",
  "...and more!",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.015 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export function RemovalItemsSection() {
  return (
    <section id="what-we-take" className="py-24 bg-[#1d1235] relative overflow-hidden">
      {/* Decorative glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-3xl mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black font-display text-white mb-4"
          >
            We Remove, Pick Up <span className="text-secondary">&amp; Haul:</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-white/70"
          >
            If it's not hazardous, we'll take it — from a single item to a full property cleanout.
          </motion.p>
        </div>

        <motion.ul
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3.5 mb-14"
        >
          {REMOVAL_ITEMS.map((item) => (
            <motion.li key={item} variants={itemVariants} className="flex items-start gap-2.5">
              <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" strokeWidth={3.5} />
              <span className="text-white font-semibold text-sm md:text-base leading-snug">{item}</span>
            </motion.li>
          ))}
        </motion.ul>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/book">
            <Button size="lg" variant="secondary" className="h-14 px-8 text-lg rounded-2xl shadow-xl shadow-black/30 group w-full sm:w-auto">
              Book Free Estimate
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/services">
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-lg rounded-2xl bg-transparent border-2 border-white/25 text-white hover:bg-white/10 hover:text-white w-full sm:w-auto"
            >
              View All Services
            </Button>
          </Link>
        </motion.div>

        <motion.img
          src={truckImg}
          alt="Piece of Cake Junk Removal truck"
          className="mx-auto mt-14 w-full max-w-sm md:max-w-md object-contain drop-shadow-2xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </section>
  );
}
