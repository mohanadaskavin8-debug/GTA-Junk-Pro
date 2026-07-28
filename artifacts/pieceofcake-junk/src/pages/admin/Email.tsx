import {
  useListSubscribers,
  useListEmailCampaigns,
  useSendEmailCampaign,
  useDeleteSubscriber,
  getListEmailCampaignsQueryKey,
  getListSubscribersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Users, CheckCircle, AlertTriangle, X } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const deleteSubscriber = useDeleteSubscriber();
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

    const plural = subscribers.length === 1 ? "subscriber" : "subscribers";
    if (!confirm(`Send this to ${subscribers.length} ${plural}? Every email includes an automatic unsubscribe link.`)) return;

    sendEmail.mutate({ data }, {
      onSuccess: (campaign) => {
        queryClient.invalidateQueries({ queryKey: getListEmailCampaignsQueryKey() });
        if (campaign.failedCount > 0) {
          toast({
            title: `Delivered to ${campaign.sentCount} of ${campaign.recipientCount}`,
            description: campaign.failureReason ?? `${campaign.failedCount} emails could not be delivered.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Campaign sent!",
            description: `Delivered to ${campaign.sentCount} ${campaign.sentCount === 1 ? "subscriber" : "subscribers"}.`,
          });
          form.reset();
        }
      },
      onError: () => {
        toast({ title: "Could not send campaign", description: "Something went wrong before any emails were sent. Please try again.", variant: "destructive" });
      },
    });
  };

  const handleRemoveSubscriber = (id: number, email: string) => {
    if (!confirm(`Remove ${email} from the subscriber list?`)) return;
    deleteSubscriber.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Subscriber removed" });
        queryClient.invalidateQueries({ queryKey: getListSubscribersQueryKey() });
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
                  <div className="bg-muted p-4 rounded-xl mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold">Audience</h4>
                        <p className="text-sm text-muted-foreground">All active subscribers</p>
                      </div>
                      <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-lg border font-bold">
                        <Users className="w-4 h-4 text-primary" />
                        {isLoadingSubscribers ? "..." : subscribers?.length || 0} Recipients
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Emails go out one at a time (about a second each) from your configured sender,
                      and every one includes an automatic unsubscribe link.
                    </p>
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
                            placeholder="Write your email here... Blank lines start a new paragraph."
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

        {/* History + Subscribers */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm">
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
                        <span className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-medium text-green-600">
                            <CheckCircle className="w-3 h-3" /> {campaign.sentCount} sent
                          </span>
                          {campaign.failedCount > 0 && (
                            <span className="flex items-center gap-1 font-medium text-red-500">
                              <AlertTriangle className="w-3 h-3" /> {campaign.failedCount} failed
                            </span>
                          )}
                        </span>
                      </div>
                      {campaign.failedCount > 0 && campaign.failureReason && (
                        <p className="text-xs text-red-500/80 mt-2 line-clamp-2">{campaign.failureReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Subscribers
                <Badge variant="secondary">{subscribers?.length ?? 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSubscribers ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                </div>
              ) : !subscribers || subscribers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No subscribers yet. Customers can opt in while booking.</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {subscribers.map(subscriber => (
                    <div key={subscriber.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm bg-background">
                      <span className="truncate" title={subscriber.email}>{subscriber.email}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveSubscriber(subscriber.id, subscriber.email)}
                        disabled={deleteSubscriber.isPending}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
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
