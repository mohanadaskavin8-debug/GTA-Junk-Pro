import { 
  useListSubscribers, 
  useListEmailCampaigns, 
  useSendEmailCampaign,
  getListEmailCampaignsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Users, CheckCircle } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  body: z.string().min(20, "Email body must be at least 20 characters"),
});

export default function Email() {
  const { data: subscribers, isLoading: isLoadingSubscribers } = useListSubscribers();
  const { data: campaigns, isLoading: isLoadingCampaigns } = useListEmailCampaigns();
  const sendEmail = useSendEmailCampaign();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { subject: "", body: "" }
  });

  const onSubmit = (data: z.infer<typeof emailSchema>) => {
    if (!subscribers || subscribers.length === 0) {
      toast({ title: "No subscribers", description: "You need at least one subscriber to send an email.", variant: "destructive" });
      return;
    }
    
    if (!confirm(`Are you sure you want to send this to ${subscribers.length} subscribers?`)) return;

    sendEmail.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Campaign Sent Successfully!" });
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListEmailCampaignsQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black font-display">Email Marketing</h1>
          <p className="text-muted-foreground mt-1">Send updates and offers to your subscriber list.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Compose Email */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" /> Compose Broadcast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="bg-muted p-4 rounded-xl mb-6 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold">Audience</h4>
                      <p className="text-sm text-muted-foreground">All active subscribers</p>
                    </div>
                    <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-lg border font-bold">
                      <Users className="w-4 h-4 text-primary" /> 
                      {isLoadingSubscribers ? "..." : subscribers?.length || 0} Recipients
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject Line</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g., Spring Cleaning Special! Get 15% Off" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message Body</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Write your email here..." 
                            className="min-h-[300px] resize-y" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="rounded-xl px-8"
                      disabled={sendEmail.isPending || !subscribers || subscribers.length === 0}
                    >
                      {sendEmail.isPending ? "Sending..." : "Send Campaign Now"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg">Recent Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingCampaigns ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : campaigns?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Mail className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>No campaigns sent yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns?.map(campaign => (
                    <div key={campaign.id} className="p-4 border rounded-xl bg-background">
                      <h4 className="font-bold text-sm mb-1 line-clamp-1">{campaign.subject}</h4>
                      <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                        <span>{format(new Date(campaign.sentAt), "MMM d, yyyy")}</span>
                        <span className="flex items-center gap-1 font-medium text-green-600">
                          <CheckCircle className="w-3 h-3" /> {campaign.recipientCount} sent
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
