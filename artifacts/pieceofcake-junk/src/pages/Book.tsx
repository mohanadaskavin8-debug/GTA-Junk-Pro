import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearch } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, ChevronRight, Check } from "lucide-react";

import { useListServices, useCreateBooking, useCreateSubscriber, useGetPublicSettings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const bookingSchema = z.object({
  serviceId: z.number().min(1, "Please select a service"),
  serviceDate: z.date({ required_error: "Please select a date" }),
  serviceTime: z.string().min(1, "Please select a time"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().min(6, "Postal code is required"),
  notes: z.string().optional(),
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().min(10, "Valid phone is required"),
  subscribeToNewsletter: z.boolean().default(false),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

const timeSlots = ["08:00 AM - 10:00 AM", "10:00 AM - 12:00 PM", "12:00 PM - 02:00 PM", "02:00 PM - 04:00 PM", "04:00 PM - 06:00 PM"];

export default function Book() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const initialServiceId = searchParams.get("service") ? parseInt(searchParams.get("service")!) : undefined;

  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  const { data: services, isLoading: isLoadingServices } = useListServices();
  const { data: publicSettings } = useGetPublicSettings();
  const createBooking = useCreateBooking();
  const createSubscriber = useCreateSubscriber();
  const etransferEmail = publicSettings?.etransferEmail ?? "payments@pieceofcakejunk.com";

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      serviceId: initialServiceId,
      subscribeToNewsletter: true,
      city: "Toronto",
    },
    mode: "onChange"
  });

  const onSubmit = (data: BookingFormValues) => {
    // Only submit on the final step
    if (step < 3) {
      nextStep();
      return;
    }

    createBooking.mutate({
      data: {
        ...data,
        serviceDate: format(data.serviceDate, "yyyy-MM-dd"),
      }
    }, {
      onSuccess: (result) => {
        setBookingRef(`POC-${result.id.toString().padStart(4, '0')}`);
        setIsSuccess(true);
        
        // Also subscribe to newsletter if checked
        if (data.subscribeToNewsletter && data.customerEmail) {
          createSubscriber.mutate({
            data: { email: data.customerEmail, name: data.customerName }
          });
        }
      }
    });
  };

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ["serviceId"];
    if (step === 2) fieldsToValidate = ["serviceDate", "serviceTime", "address", "city", "postalCode"];
    
    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) {
      setStep(s => s + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setStep(s => s - 1);
    window.scrollTo(0, 0);
  };

  if (isSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20 py-20 px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full bg-card p-10 rounded-3xl border shadow-xl text-center"
        >
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black font-display mb-4">Booking Confirmed!</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Your booking reference is <strong className="text-foreground">{bookingRef}</strong>
          </p>
          
          <div className="bg-secondary/10 border-2 border-secondary/20 p-8 rounded-2xl mb-8 text-left">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
              <span className="bg-secondary text-secondary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">!</span>
              Payment Instructions
            </h3>
            <p className="mb-4">Please send an Interac e-Transfer to secure your slot:</p>
            <ul className="space-y-3 font-medium">
              <li className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-bold text-foreground">{etransferEmail}</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Message/Notes:</span>
                <span className="font-bold text-foreground">{bookingRef}</span>
              </li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              Once your transfer is received, we will mark your booking as paid. Our team will contact you shortly to confirm the details.
            </p>
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
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-black font-display mb-4">Book Your Cleanout</h1>
          
          {/* Progress Bar */}
          <div className="flex items-center justify-center gap-2 mt-8 max-w-md mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors shrink-0",
                  step === i ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : 
                  step > i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {step > i ? <Check className="w-5 h-5" /> : i}
                </div>
                {i < 3 && (
                  <div className={cn(
                    "flex-1 h-1 rounded-full transition-colors mx-2",
                    step > i ? "bg-primary" : "bg-border"
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
                
                {/* STEP 1: SERVICE */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <h2 className="text-2xl font-bold font-display">1. What do you need removed?</h2>
                    
                    <FormField
                      control={form.control}
                      name="serviceId"
                      render={({ field }) => (
                        <FormItem>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {services?.map(service => (
                              <Card 
                                key={service.id} 
                                className={cn(
                                  "cursor-pointer transition-all hover:border-primary/50",
                                  field.value === service.id ? "ring-2 ring-primary border-primary bg-primary/5" : ""
                                )}
                                onClick={() => field.onChange(service.id)}
                              >
                                <CardContent className="p-5">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-lg">{service.name}</h4>
                                    <div className={cn(
                                      "w-5 h-5 rounded-full border flex items-center justify-center",
                                      field.value === service.id ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                                    )}>
                                      {field.value === service.id && <Check className="w-3 h-3" />}
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{service.description}</p>
                                  <div className="font-bold text-primary">${service.price} <span className="text-xs text-muted-foreground font-normal">/{service.unit}</span></div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {/* STEP 2: DETAILS */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <h2 className="text-2xl font-bold font-display">2. When and where?</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name="serviceDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Service Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full pl-3 text-left font-normal h-12 rounded-xl",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="serviceTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferred Time Window</FormLabel>
                              <div className="grid grid-cols-1 gap-2">
                                {timeSlots.map(slot => (
                                  <div 
                                    key={slot}
                                    onClick={() => field.onChange(slot)}
                                    className={cn(
                                      "p-3 rounded-xl border text-sm font-medium cursor-pointer transition-colors",
                                      field.value === slot ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                                    )}
                                  >
                                    {slot}
                                  </div>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Street Address</FormLabel>
                              <FormControl>
                                <Input placeholder="123 Main St" {...field} />
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
                                  <Input {...field} />
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
                                  <Input placeholder="M1M 1M1" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>What needs to go? (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="E.g., 3 seater sofa, old fridge, and some boxes..." 
                                  className="resize-none" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: CONTACT */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 max-w-xl mx-auto"
                  >
                    <h2 className="text-2xl font-bold font-display text-center">3. Your Information</h2>
                    
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="customerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
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
                            <Input type="tel" placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subscribeToNewsletter"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-xl mt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">
                              Send me special offers and discounts
                            </FormLabel>
                            <p className="text-sm text-muted-foreground">
                              We won't spam you. Usually just one email a month.
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-12 pt-6 border-t">
                {step > 1 ? (
                  <Button type="button" variant="ghost" onClick={prevStep} className="font-bold">
                    Back
                  </Button>
                ) : <div />}
                
                {step < 3 ? (
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
                    {createBooking.isPending ? "Confirming..." : "Confirm Booking"}
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
