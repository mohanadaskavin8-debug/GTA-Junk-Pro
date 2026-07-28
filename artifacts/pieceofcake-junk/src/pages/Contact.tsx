import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, MapPin, Phone } from "lucide-react";
import { useCreateBooking, useGetPublicSettings } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";

const contactSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().min(10, "Valid phone is required"),
  notes: z.string().min(10, "Please provide more details about your inquiry"),
});

export default function Contact() {
  const [success, setSuccess] = useState(false);
  const createBooking = useCreateBooking();
  const { data: settings } = useGetPublicSettings();
  const phone = settings?.businessPhone ?? "437-775-9626";
  const email = settings?.businessEmail ?? "info@pieceofcakejunk.com";
  const serviceArea = settings?.serviceArea ?? "Greater Toronto Area";

  const form = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = (data: z.infer<typeof contactSchema>) => {
    // A simple contact form creates a pending booking without a service
    createBooking.mutate({
      data: {
        ...data,
        address: "TBD", // Dummy data to pass schema since contact form doesn't ask for it
        serviceDate: format(new Date(), "yyyy-MM-dd"), // Today as dummy date
        serviceTime: "TBD",
        loadSize: "small",
      }
    }, {
      onSuccess: () => {
        setSuccess(true);
        form.reset();
      }
    });
  };

  return (
    <div className="flex-1">
      {/* Header */}
      <section className="bg-primary text-primary-foreground py-24 text-center px-4">
        <h1 className="text-5xl md:text-6xl font-black font-display mb-6">Get in Touch</h1>
        <p className="text-xl max-w-2xl mx-auto opacity-90">
          Have a question about our services or need a custom quote? We're here to help.
        </p>
      </section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
            
            {/* Contact Info */}
            <div>
              <h2 className="text-3xl font-black font-display mb-8">Contact Information</h2>
              
              <div className="space-y-8 mb-12">
                <div className="flex items-start gap-4">
                  <div className="bg-secondary/20 p-4 rounded-2xl text-secondary-foreground">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Call Us Directly</h3>
                    <p className="text-muted-foreground mb-2">Available Mon-Sat, 8am to 6pm</p>
                    <a href={`tel:${phone}`} className="text-xl font-bold hover:text-primary transition-colors">
                      {phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-secondary/20 p-4 rounded-2xl text-secondary-foreground">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Email Us</h3>
                    <p className="text-muted-foreground mb-2">For inquiries and free estimates</p>
                    <a href={`mailto:${email}`} className="font-medium hover:text-primary transition-colors">
                      {email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-secondary/20 p-4 rounded-2xl text-secondary-foreground">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Service Area</h3>
                    <p className="text-muted-foreground">
                      {serviceArea}<br/>
                      Toronto, Mississauga, Markham, Richmond Hill, Vaughan, and more.
                    </p>
                  </div>
                </div>
              </div>

              {/* Map Concept */}
              <div className="bg-muted rounded-3xl overflow-hidden border h-64 relative flex items-center justify-center">
                <div className="absolute inset-0 opacity-10 bg-[url('https://upload.wikimedia.org/wikipedia/commons/4/4f/Toronto_neighborhoods_map.png')] bg-cover bg-center" />
                <div className="relative z-10 bg-background/90 backdrop-blur px-6 py-3 rounded-full font-bold border shadow-sm">
                  Proudly serving the GTA
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="bg-card border rounded-3xl p-8 md:p-10 shadow-xl">
              <h2 className="text-2xl font-bold font-display mb-6">Send a Message</h2>
              
              {success ? (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-6 rounded-2xl border border-green-200 dark:border-green-800 text-center py-12">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
                  <p>We'll get back to you as soon as possible.</p>
                  <Button 
                    variant="outline" 
                    className="mt-6"
                    onClick={() => setSuccess(false)}
                  >
                    Send Another
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="customerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="you@example.com" {...field} />
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
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="(555) 123-4567" {...field} />
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
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="How can we help you?" 
                              className="min-h-[150px] resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" size="lg" className="w-full h-14 text-lg rounded-xl" disabled={createBooking.isPending}>
                      {createBooking.isPending ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </Form>
              )}
            </div>
            
          </div>
        </div>
      </section>
    </div>
  );
}
