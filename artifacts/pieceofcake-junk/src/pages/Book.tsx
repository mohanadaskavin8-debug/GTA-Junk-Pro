import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  CheckCircle2,
  ChevronRight,
  Check,
  MapPin,
  Clock,
  Pencil,
  Building2,
  Mail,
} from "lucide-react";

import { useCreateBooking, useCreateSubscriber } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import LoadTruckVisual from "@/components/booking/LoadTruckVisual";

const ARRIVAL_WINDOWS = [
  "08:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 02:00 PM",
  "02:00 PM - 04:00 PM",
  "04:00 PM - 06:00 PM",
];

export const LOAD_STOPS = [
  { value: "small", label: "Small Load", desc: "Just a few items — a chair, a TV, or a couple of boxes", fraction: 0.05 },
  { value: "1/8", label: "1/8 Load", desc: "About the size of a loveseat", fraction: 0.125 },
  { value: "1/6", label: "1/6 Load", desc: "A couch, or a washer and dryer", fraction: 0.167 },
  { value: "1/4", label: "1/4 Load", desc: "Furniture from a small room", fraction: 0.25 },
  { value: "1/3", label: "1/3 Load", desc: "Contents of a bachelor apartment", fraction: 0.333 },
  { value: "3/8", label: "3/8 Load", desc: "A packed walk-in closet or shed", fraction: 0.375 },
  { value: "1/2", label: "1/2 Load", desc: "Furniture from a one-bedroom apartment", fraction: 0.5 },
  { value: "5/8", label: "5/8 Load", desc: "A garage's worth of clutter", fraction: 0.625 },
  { value: "2/3", label: "2/3 Load", desc: "Contents of a two-bedroom apartment", fraction: 0.667 },
  { value: "3/4", label: "3/4 Load", desc: "A full basement cleanout", fraction: 0.75 },
  { value: "5/6", label: "5/6 Load", desc: "A small house's worth of items", fraction: 0.833 },
  { value: "7/8", label: "7/8 Load", desc: "Nearly a full truck — big cleanout", fraction: 0.875 },
  { value: "full", label: "Full Load", desc: "A complete home or estate cleanout", fraction: 1 },
] as const;

const bookingSchema = z
  .object({
    address: z.string().min(5, "Street address is required"),
    city: z.string().min(2, "City is required"),
    postalCode: z.string().min(6, "Postal code is required"),
    serviceDate: z.date({ required_error: "Please pick a date" }),
    serviceTime: z.string().min(1, "Please choose an arrival window"),
    loadSize: z.string().min(1, "Please choose a load size"),
    customerName: z.string().min(2, "Full name is required"),
    customerEmail: z.string().email("A valid email is required"),
    customerPhone: z.string().min(10, "A valid phone number is required"),
    isBusiness: z.boolean().default(false),
    businessName: z.string().optional(),
    notes: z.string().optional(),
    subscribeToNewsletter: z.boolean().default(false),
  })
  .refine((d) => !d.isBusiness || (d.businessName ?? "").trim().length >= 2, {
    message: "Business name is required",
    path: ["businessName"],
  });

type BookingFormValues = z.infer<typeof bookingSchema>;

const STEPS = [
  { id: 1, name: "Address" },
  { id: 2, name: "Date" },
  { id: 3, name: "Arrival" },
  { id: 4, name: "Load Size" },
  { id: 5, name: "Details" },
];

const STEP_FIELDS: Record<number, (keyof BookingFormValues)[]> = {
  1: ["address", "city", "postalCode"],
  2: ["serviceDate"],
  3: ["serviceTime"],
  4: ["loadSize"],
};

export default function Book() {
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  const createBooking = useCreateBooking();
  const createSubscriber = useCreateSubscriber();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      address: "",
      city: "Toronto",
      postalCode: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      loadSize: "1/4",
      isBusiness: false,
      businessName: "",
      notes: "",
      subscribeToNewsletter: false,
    },
    mode: "onChange",
  });

  const loadSizeValue = form.watch("loadSize");
  const loadIndex = Math.max(
    LOAD_STOPS.findIndex((s) => s.value === loadSizeValue),
    0
  );
  const activeLoad = LOAD_STOPS[loadIndex];
  const isBusiness = form.watch("isBusiness");
  const watchedAddress = form.watch(["address", "city", "postalCode"]);

  const onSubmit = (data: BookingFormValues) => {
    if (step < 5) {
      nextStep();
      return;
    }

    createBooking.mutate(
      {
        data: {
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          address: data.address,
          city: data.city,
          postalCode: data.postalCode,
          serviceDate: format(data.serviceDate, "yyyy-MM-dd"),
          serviceTime: data.serviceTime,
          loadSize: data.loadSize as (typeof LOAD_STOPS)[number]["value"],
          isBusiness: data.isBusiness,
          businessName: data.isBusiness ? data.businessName : undefined,
          notes: data.notes || undefined,
        },
      },
      {
        onSuccess: (result) => {
          setBookingRef(`POC-${result.id.toString().padStart(4, "0")}`);
          setIsSuccess(true);
          window.scrollTo(0, 0);

          if (data.subscribeToNewsletter && data.customerEmail) {
            createSubscriber.mutate({
              data: { email: data.customerEmail, name: data.customerName },
            });
          }
        },
      }
    );
  };

  const nextStep = async () => {
    const fields = STEP_FIELDS[step] ?? [];
    const valid = await form.trigger(fields);
    if (valid) {
      setStep((s) => Math.min(s + 1, 5));
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo(0, 0);
  };

  if (isSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20 py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="max-w-2xl w-full bg-card p-10 rounded-3xl border shadow-xl text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 16 }}
            className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8"
          >
            <CheckCircle2 className="w-12 h-12" />
          </motion.div>
          <h1 className="text-4xl font-black font-display mb-3">Your Free Estimate is Booked!</h1>
          <p className="text-muted-foreground mb-8">
            Reference <strong className="text-foreground font-mono">{bookingRef}</strong>
          </p>

          <div className="bg-primary/5 border-2 border-primary/15 p-8 rounded-2xl mb-8 text-left flex gap-4">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <p className="text-base leading-relaxed">
              You'll receive an instant email confirming your no-obligation in-person estimate.
              We always come ready to provide same-day removal if you'd like us to proceed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left text-sm mb-8">
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">Estimate Date</div>
              <div className="font-bold">{form.getValues("serviceDate") ? format(form.getValues("serviceDate"), "EEE, MMM d, yyyy") : ""}</div>
              <div className="text-muted-foreground">{form.getValues("serviceTime")}</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">Estimated Size</div>
              <div className="font-bold">{activeLoad.label}</div>
              <div className="text-muted-foreground truncate">{form.getValues("address")}</div>
            </div>
          </div>

          <Link href="/">
            <Button size="lg" className="rounded-2xl">Return to Homepage</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-muted/20 py-12 md:py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black font-display mb-3">Book Your Free Estimate</h1>
          <p className="text-muted-foreground text-lg">
            No obligation — we come to you, size it up, and quote an exact price on the spot.
          </p>

          {/* Progress */}
          <div className="flex items-center justify-center gap-1.5 mt-8 max-w-lg mx-auto">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors shrink-0",
                      step === s.id
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : step > s.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {step > s.id ? <Check className="w-5 h-5" /> : s.id}
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wide hidden sm:block",
                    step >= s.id ? "text-primary" : "text-muted-foreground"
                  )}>
                    {s.name}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-1 rounded-full transition-colors mx-1.5 sm:-mt-5",
                    step > s.id ? "bg-primary" : "bg-border"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-3xl shadow-xl border overflow-hidden">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-10">
              <AnimatePresence mode="wait">
                {/* STEP 1: ADDRESS */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 max-w-xl mx-auto"
                  >
                    <div className="text-center">
                      <h2 className="text-2xl font-bold font-display">Where's the junk?</h2>
                      <p className="text-muted-foreground mt-1">We'll send our team to this address.</p>
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St" className="h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input className="h-12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="M1M 1M1" className="h-12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: DATE */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <h2 className="text-2xl font-bold font-display">When should we come by?</h2>
                      <p className="text-muted-foreground mt-1">Pick a date for your free in-person estimate.</p>
                    </div>

                    <FormField
                      control={form.control}
                      name="serviceDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col items-center">
                          <FormControl>
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              className="rounded-2xl border shadow-sm p-4"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {/* STEP 3: ARRIVAL WINDOW */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 max-w-xl mx-auto"
                  >
                    <div className="text-center">
                      <h2 className="text-2xl font-bold font-display">Pick a 2-hour arrival window</h2>
                      <p className="text-muted-foreground mt-1">
                        {form.getValues("serviceDate") && format(form.getValues("serviceDate"), "EEEE, MMMM d")} — we'll call when we're on our way.
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="serviceTime"
                      render={({ field }) => (
                        <FormItem>
                          <div className="grid grid-cols-1 gap-3">
                            {ARRIVAL_WINDOWS.map((slot) => (
                              <button
                                type="button"
                                key={slot}
                                onClick={() => field.onChange(slot)}
                                className={cn(
                                  "p-4 rounded-2xl border-2 font-bold text-base transition-all flex items-center gap-3",
                                  field.value === slot
                                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                    : "hover:border-primary/40 hover:bg-muted/50 border-border"
                                )}
                              >
                                <Clock className={cn("w-5 h-5", field.value === slot ? "" : "text-muted-foreground")} />
                                {slot}
                                {field.value === slot && <Check className="w-5 h-5 ml-auto" />}
                              </button>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {/* STEP 4: LOAD SIZE */}
                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-2 max-w-2xl mx-auto"
                  >
                    <div className="text-center mb-2">
                      <h2 className="text-2xl font-bold font-display">How much are we hauling?</h2>
                      <p className="text-muted-foreground mt-1">
                        Your best guess is perfect — we confirm the exact size (and price) in person.
                      </p>
                    </div>

                    <LoadTruckVisual fraction={activeLoad.fraction} label={activeLoad.label} />

                    <div className="text-center h-16">
                      <AnimatePresence mode="popLayout">
                        <motion.div
                          key={activeLoad.value}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.18 }}
                        >
                          <div className="text-2xl font-black font-display text-primary">{activeLoad.label}</div>
                          <div className="text-sm text-muted-foreground">{activeLoad.desc}</div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <FormField
                      control={form.control}
                      name="loadSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="px-2 pt-2 pb-1">
                              <Slider
                                value={[loadIndex]}
                                min={0}
                                max={LOAD_STOPS.length - 1}
                                step={1}
                                onValueChange={([v]) => field.onChange(LOAD_STOPS[v].value)}
                                aria-label="Load size"
                              />
                              <div className="flex justify-between mt-3">
                                {LOAD_STOPS.map((stop, i) => (
                                  <button
                                    key={stop.value}
                                    type="button"
                                    aria-label={stop.label}
                                    onClick={() => field.onChange(stop.value)}
                                    className={cn(
                                      "w-2.5 h-2.5 rounded-full transition-all",
                                      i === loadIndex
                                        ? "bg-secondary scale-150 ring-2 ring-secondary/30"
                                        : i < loadIndex
                                          ? "bg-primary/50"
                                          : "bg-border hover:bg-primary/30"
                                    )}
                                  />
                                ))}
                              </div>
                              <div className="flex justify-between mt-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                <span>Small</span>
                                <span>Full Truck</span>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {/* STEP 5: DETAILS & CONFIRM */}
                {step === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 max-w-xl mx-auto"
                  >
                    <div className="text-center">
                      <h2 className="text-2xl font-bold font-display">Almost done!</h2>
                      <p className="text-muted-foreground mt-1">Where should we send your confirmation?</p>
                    </div>

                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" className="h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" className="h-12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="customerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="(437) 555-0123" className="h-12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Address confirmation */}
                    <div className="border-2 border-border rounded-2xl p-4 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                          Pickup Address
                        </div>
                        <div className="font-bold truncate">{watchedAddress[0]}</div>
                        <div className="text-sm text-muted-foreground">
                          {watchedAddress[1]}, {watchedAddress[2]}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-primary font-bold shrink-0"
                        onClick={() => setStep(1)}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1.5" />
                        Change
                      </Button>
                    </div>

                    {/* Business toggle */}
                    <FormField
                      control={form.control}
                      name="isBusiness"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between border rounded-2xl p-4 space-y-0">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <FormLabel className="cursor-pointer font-bold">This is a business</FormLabel>
                              <p className="text-xs text-muted-foreground">Commercial pickup or office cleanout</p>
                            </div>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <AnimatePresence>
                      {isBusiness && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <FormField
                            control={form.control}
                            name="businessName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Acme Inc." className="h-12" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Anything we should know? (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="E.g., items are in the basement, parking is around back..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subscribeToNewsletter"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-2xl">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">Send me promotional emails</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Occasional deals and seasonal offers. Unsubscribe anytime.
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex justify-between items-center mt-10 pt-6 border-t">
                {step > 1 ? (
                  <Button type="button" variant="ghost" onClick={prevStep} className="font-bold">
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                {step < 5 ? (
                  <Button type="button" onClick={nextStep} size="lg" className="rounded-xl px-8 h-12">
                    Next Step <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="lg"
                    className="rounded-xl px-8 h-12 shadow-lg"
                    disabled={createBooking.isPending}
                  >
                    {createBooking.isPending ? "Booking..." : "Book My Free Estimate"}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
