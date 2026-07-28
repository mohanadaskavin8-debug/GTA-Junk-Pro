import { motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";

type Review = {
  name: string;
  area: string;
  date: string;
  text: string;
  color: string;
};

const REVIEWS: Review[] = [
  { name: "Sarah Mitchell", area: "Scarborough", date: "a week ago", color: "bg-rose-500", text: "Booked at 9am and my old couch and mattress were gone by noon. The two guys were super friendly and even swept the hallway after. Wish I'd called sooner." },
  { name: "Raj Patel", area: "Mississauga", date: "2 weeks ago", color: "bg-blue-500", text: "Cleared out my parents' entire garage before their move. Fair price, showed up right at the start of the arrival window, zero hassle. Highly recommend." },
  { name: "Maria Gonzalez", area: "North York", date: "2 weeks ago", color: "bg-emerald-600", text: "They took our old fridge and freezer down two flights of stairs without a single scratch on the walls. Impressive work!" },
  { name: "David Chen", area: "Markham", date: "3 weeks ago", color: "bg-violet-500", text: "Had a pile of renovation debris sitting on my driveway for weeks. Got a quote, and it was gone the next morning. Piece of cake indeed." },
  { name: "Amanda Torres", area: "Etobicoke", date: "a month ago", color: "bg-orange-500", text: "Best price of the three companies I called. On time, polite, and they recycle what they can, which I really appreciate." },
  { name: "Mike O'Brien", area: "Vaughan", date: "a month ago", color: "bg-teal-600", text: "Hot tub removal. These guys earned every penny — broke it down and hauled it out in under an hour. Unreal." },
  { name: "Priya Sharma", area: "Brampton", date: "a month ago", color: "bg-pink-500", text: "Used them twice now — once for an office cleanout and once for my basement. Same great service both times. 5 stars." },
  { name: "James Wilson", area: "Ajax", date: "a month ago", color: "bg-indigo-500", text: "Booked a free estimate online in about a minute. They arrived same day and took everything on the spot. Couldn't be easier." },
  { name: "Fatima Ali", area: "Toronto", date: "2 months ago", color: "bg-cyan-600", text: "Estate cleanout after my aunt passed. The crew was respectful, patient, and handled everything with care. Thank you." },
  { name: "Tony Ricci", area: "Richmond Hill", date: "2 months ago", color: "bg-red-500", text: "Old piano nobody wanted. Two other companies said no. These guys said no problem. Gone in 40 minutes." },
  { name: "Karen Lee", area: "Pickering", date: "2 months ago", color: "bg-fuchsia-600", text: "Shed teardown and haul away. They left the yard cleaner than they found it. Amazing." },
  { name: "Marcus Johnson", area: "Oshawa", date: "2 months ago", color: "bg-amber-600", text: "Quick, professional, upfront pricing. No surprise fees when they got here, which was my big worry. Will use again." },
  { name: "Jenny Nguyen", area: "Oakville", date: "3 months ago", color: "bg-lime-600", text: "They hauled away all our reno debris — drywall, lumber, tiles. The driveway was spotless after. Fantastic service." },
  { name: "Rob Kaminski", area: "Whitby", date: "3 months ago", color: "bg-sky-600", text: "Same-day mattress and box spring pickup. The driver texted 20 minutes before arriving. Smooth from start to finish." },
  { name: "Steph Williams", area: "Toronto", date: "3 months ago", color: "bg-purple-600", text: "Moved out of my condo and they took everything the buyers didn't want. Fast, friendly, and the price matched the quote exactly." },
  { name: "Ahmed Hassan", area: "Scarborough", date: "4 months ago", color: "bg-green-600", text: "Called about an old washer and dryer. They were at my door three hours later. Excellent communication the whole way." },
  { name: "Linda Park", area: "North York", date: "4 months ago", color: "bg-blue-600", text: "Honestly the easiest home service I've ever booked. Clear arrival window, friendly crew, fair price. 10/10." },
  { name: "Chris Taylor", area: "Milton", date: "4 months ago", color: "bg-rose-600", text: "Full garage and backyard cleanout before listing our house. Our realtor asked who did it. Enough said!" },
];

function GoogleLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-label="Google">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

function Stars() {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="w-4 h-4 text-secondary fill-secondary" />
      ))}
    </div>
  );
}

function ReviewCard({ review, className = "" }: { review: Review; className?: string }) {
  return (
    <div className={`bg-card rounded-2xl border shadow-sm p-6 flex flex-col gap-3 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-full ${review.color} text-white flex items-center justify-center font-bold shrink-0`}>
            {review.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{review.name}</p>
            <p className="text-xs text-muted-foreground truncate">{review.area} · {review.date}</p>
          </div>
        </div>
        <GoogleLogo className="w-5 h-5 shrink-0 mt-1" />
      </div>
      <Stars />
      <p className="text-sm text-foreground/80 leading-relaxed">{review.text}</p>
    </div>
  );
}

function MarqueeGroup({ reviews, ariaHidden = false }: { reviews: Review[]; ariaHidden?: boolean }) {
  return (
    <div className="flex gap-6 pr-6" aria-hidden={ariaHidden || undefined}>
      {reviews.map((review) => (
        <ReviewCard key={review.name} review={review} className="w-[320px] md:w-[360px] shrink-0" />
      ))}
    </div>
  );
}

function MarqueeRow({ reviews, reverse = false }: { reviews: Review[]; reverse?: boolean }) {
  return (
    <div className="group overflow-hidden">
      <div className={`flex w-max ${reverse ? "animate-marquee-reverse" : "animate-marquee"} group-hover:[animation-play-state:paused]`}>
        <MarqueeGroup reviews={reviews} />
        <MarqueeGroup reviews={reviews} ariaHidden />
      </div>
    </div>
  );
}

export function GoogleReviewsSection() {
  const reduceMotion = useReducedMotion();
  const firstRow = REVIEWS.slice(0, 9);
  const secondRow = REVIEWS.slice(9);

  return (
    <section id="reviews" className="py-24 bg-muted overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 mb-14">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border shadow-sm mb-6"
          >
            <GoogleLogo className="w-5 h-5" />
            <span className="text-sm font-bold">Google Reviews</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-4xl md:text-5xl font-black font-display mb-6"
          >
            Rated <span className="text-primary">5.0</span> by Our Customers
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-center gap-3"
          >
            <span className="text-3xl font-black font-display">5.0</span>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-secondary fill-secondary" />
              ))}
            </div>
            <span className="text-muted-foreground font-semibold">100+ happy customers across the GTA</span>
          </motion.div>
        </div>
      </div>

      {reduceMotion ? (
        /* Reduced-motion fallback: static grid so every review stays reachable */
        <div className="container mx-auto px-4 md:px-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {REVIEWS.map((review) => (
            <ReviewCard key={review.name} review={review} className="w-full" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative flex flex-col gap-6"
        >
          <MarqueeRow reviews={firstRow} />
          <MarqueeRow reviews={secondRow} reverse />

          {/* Edge fades */}
          <div className="absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-muted to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-muted to-transparent pointer-events-none" />
        </motion.div>
      )}
    </section>
  );
}
