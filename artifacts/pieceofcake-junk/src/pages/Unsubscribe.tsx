import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useUnsubscribe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MailX, CheckCircle2, AlertTriangle } from "lucide-react";

export default function Unsubscribe() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const unsubscribe = useUnsubscribe();
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const linkIncomplete = !email || !token;

  const handleUnsubscribe = () => {
    unsubscribe.mutate(
      { data: { email, token } },
      {
        onSuccess: () => setDone(true),
        onError: (err) => {
          const apiError = err as { data?: { error?: string } };
          setErrorMessage(
            apiError?.data?.error ??
              "This unsubscribe link is invalid. Reply to any of our emails and we'll remove you right away."
          );
        },
      }
    );
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-20">
      <Card className="w-full max-w-md border-none shadow-lg">
        <CardContent className="pt-10 pb-10 px-8 text-center">
          {done ? (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold font-display mb-3">You're unsubscribed</h1>
              <p className="text-muted-foreground mb-8">
                <span className="font-medium text-foreground">{email}</span> won't receive any more
                promotional emails from us. If you book a free estimate, you'll still get your
                booking confirmations.
              </p>
              <Link href="/">
                <Button variant="outline" className="rounded-xl">Back to Home</Button>
              </Link>
            </>
          ) : linkIncomplete || errorMessage ? (
            <>
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold font-display mb-3">This link doesn't look right</h1>
              <p className="text-muted-foreground mb-8">
                {errorMessage ??
                  "This unsubscribe link is incomplete. Please use the unsubscribe link at the bottom of one of our emails, or reply to any of our emails and we'll remove you right away."}
              </p>
              <Link href="/">
                <Button variant="outline" className="rounded-xl">Back to Home</Button>
              </Link>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <MailX className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold font-display mb-3">Unsubscribe from our emails?</h1>
              <p className="text-muted-foreground mb-8">
                <span className="font-medium text-foreground">{email}</span> will stop receiving
                promotional emails and offers from Piece of Cake Junk Removal.
              </p>
              <Button
                size="lg"
                className="rounded-xl w-full"
                onClick={handleUnsubscribe}
                disabled={unsubscribe.isPending}
              >
                {unsubscribe.isPending ? "Unsubscribing..." : "Yes, Unsubscribe Me"}
              </Button>
              <Link href="/">
                <Button variant="ghost" className="rounded-xl w-full mt-2">Never mind, keep me subscribed</Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
