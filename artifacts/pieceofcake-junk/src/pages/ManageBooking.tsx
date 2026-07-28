import { useState } from "react";
import { Link, useSearch } from "wouter";
import { format } from "date-fns";
import { useGetBooking, useManageBooking } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, CalendarClock, X, AlertTriangle, ArrowLeft } from "lucide-react";
import { ARRIVAL_WINDOWS } from "@/lib/constants";

type View = "details" | "reschedule" | "confirm-cancel" | "cancelled" | "rescheduled" | "error";

export default function ManageBooking() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const idRaw = params.get("id");
  const token = params.get("token") ?? "";
  const id = idRaw ? parseInt(idRaw, 10) : NaN;

  const { data: booking, isLoading, isError } = useGetBooking(
    isNaN(id) ? 0 : id,
    { query: { enabled: !isNaN(id) } as any }
  );

  const manage = useManageBooking();

  const [view, setView] = useState<View>("details");
  const [reschedDate, setReschedDate] = useState<Date | undefined>(undefined);
  const [reschedTime, setReschedTime] = useState("");
  const [pastDateError, setPastDateError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (isNaN(id) || !token) {
    return <InvalidLink />;
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !booking) return <InvalidLink />;

  const ref = `POC-${booking.id.toString().padStart(4, "0")}`;
  const dateLabel = format(new Date(`${booking.serviceDate}T00:00:00`), "EEE, MMM d, yyyy");
  const isActive = booking.status === "pending" || booking.status === "confirmed";

  const doCancel = () => {
    manage.mutate(
      { id: booking.id, data: { token, action: "cancel" } },
      {
        onSuccess: () => setView("cancelled"),
        onError: (err: any) => {
          setErrorMsg(err?.data?.error ?? "Something went wrong. Please try again or call us.");
          setView("error");
        },
      }
    );
  };

  const doReschedule = () => {
    if (!reschedDate || !reschedTime) return;
    manage.mutate(
      {
        id: booking.id,
        data: {
          token,
          action: "reschedule",
          serviceDate: format(reschedDate, "yyyy-MM-dd"),
          serviceTime: reschedTime,
        },
      },
      {
        onSuccess: () => setView("rescheduled"),
        onError: (err: any) => {
          setErrorMsg(err?.data?.error ?? "Something went wrong. Please try again or call us.");
          setView("error");
        },
      }
    );
  };

  // ── Cancelled success ────────────────────────────────────────────────────
  if (view === "cancelled") {
    return (
      <Page>
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <X className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-black font-display mb-2">Booking Cancelled</h1>
        <p className="text-muted-foreground mb-8">
          Your estimate for <strong>{dateLabel}</strong> has been cancelled. Nothing owed.
        </p>
        <Link href="/book">
          <Button className="rounded-xl w-full">Book a New Free Estimate</Button>
        </Link>
        <Link href="/">
          <Button variant="ghost" className="rounded-xl w-full mt-2">Back to Home</Button>
        </Link>
      </Page>
    );
  }

  // ── Rescheduled success ──────────────────────────────────────────────────
  if (view === "rescheduled") {
    const newLabel = reschedDate ? format(reschedDate, "EEE, MMM d, yyyy") : "";
    return (
      <Page>
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-black font-display mb-2">All Set!</h1>
        <p className="text-muted-foreground mb-2">Your estimate has been moved to:</p>
        <p className="text-xl font-bold text-primary mb-1">{newLabel}</p>
        <p className="text-muted-foreground mb-8">{reschedTime}</p>
        <p className="text-sm text-muted-foreground mb-6">We've sent you an updated confirmation email.</p>
        <Link href="/">
          <Button variant="outline" className="rounded-xl w-full">Back to Home</Button>
        </Link>
      </Page>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (view === "error") {
    return (
      <Page>
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-black font-display mb-3">Something Went Wrong</h1>
        <p className="text-muted-foreground mb-8">{errorMsg}</p>
        <Button variant="outline" className="rounded-xl w-full" onClick={() => setView("details")}>
          Try Again
        </Button>
      </Page>
    );
  }

  // ── Confirm cancel dialog ────────────────────────────────────────────────
  if (view === "confirm-cancel") {
    return (
      <Page>
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <X className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-black font-display mb-3">Cancel this estimate?</h1>
        <div className="bg-muted/50 rounded-xl p-4 text-left mb-8 text-sm">
          <p className="font-bold">{ref}</p>
          <p className="text-muted-foreground">{dateLabel} · {booking.serviceTime}</p>
          <p className="text-muted-foreground">{booking.address}</p>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Nothing is owed. You can rebook anytime.</p>
        <Button
          variant="destructive"
          className="rounded-xl w-full"
          onClick={doCancel}
          disabled={manage.isPending}
        >
          {manage.isPending ? "Cancelling..." : "Yes, Cancel My Booking"}
        </Button>
        <Button variant="ghost" className="rounded-xl w-full mt-2" onClick={() => setView("details")}>
          Keep My Booking
        </Button>
      </Page>
    );
  }

  // ── Reschedule view ──────────────────────────────────────────────────────
  if (view === "reschedule") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <Page wide>
        <button
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 mx-auto"
          onClick={() => setView("details")}
        >
          <ArrowLeft className="w-4 h-4" /> Back to booking
        </button>
        <h1 className="text-2xl font-black font-display mb-2">Pick a new date & time</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Currently: <span className="font-semibold text-foreground">{dateLabel} · {booking.serviceTime}</span>
        </p>

        <div className="flex flex-col items-center gap-6">
          <Calendar
            mode="single"
            selected={reschedDate}
            onSelect={(d) => { setPastDateError(false); setReschedDate(d); }}
            onDayClick={(d) => { if (d < today) { setPastDateError(true); } else { setPastDateError(false); } }}
            disabled={(d) => d < today}
            className="rounded-2xl border shadow-sm p-4"
            classNames={{
              day: "h-9 w-9 p-0 font-bold aria-selected:opacity-100",
              day_selected: "bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary hover:text-primary-foreground",
              day_today: "ring-2 ring-primary ring-offset-1 rounded-full font-bold",
              day_disabled: "text-muted-foreground/40 font-normal cursor-not-allowed",
              day_outside: "text-muted-foreground/30 font-normal",
            }}
          />

          {pastDateError && (
            <p className="text-sm text-destructive font-medium -mt-4">
              That date has already passed — please pick an upcoming date.
            </p>
          )}

          {reschedDate && (
            <div className="w-full max-w-xs space-y-3">
              <Select value={reschedTime} onValueChange={setReschedTime}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Pick an arrival window" />
                </SelectTrigger>
                <SelectContent>
                  {ARRIVAL_WINDOWS.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                className="rounded-xl w-full"
                disabled={!reschedTime || manage.isPending}
                onClick={doReschedule}
              >
                {manage.isPending ? "Saving..." : "Confirm New Time"}
              </Button>
            </div>
          )}
        </div>
      </Page>
    );
  }

  // ── Main details view ────────────────────────────────────────────────────
  return (
    <Page>
      <h1 className="text-2xl font-black font-display mb-1">Manage Your Booking</h1>
      <p className="text-muted-foreground text-sm mb-6">Reference <span className="font-mono font-bold text-foreground">{ref}</span></p>

      <div className="bg-muted/50 rounded-xl p-5 text-left mb-6 space-y-2 text-sm w-full">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date</span>
          <span className="font-semibold">{dateLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Arrival Window</span>
          <span className="font-semibold">{booking.serviceTime}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Address</span>
          <span className="font-semibold text-right max-w-[60%]">{booking.address}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <span className={`font-bold capitalize ${booking.status === "cancelled" ? "text-red-500" : booking.status === "confirmed" ? "text-green-600" : "text-primary"}`}>
            {booking.status}
          </span>
        </div>
      </div>

      {isActive ? (
        <div className="w-full space-y-3">
          <Button
            className="rounded-xl w-full gap-2"
            onClick={() => setView("reschedule")}
          >
            <CalendarClock className="w-4 h-4" /> Reschedule
          </Button>
          <Button
            variant="outline"
            className="rounded-xl w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => setView("confirm-cancel")}
          >
            <X className="w-4 h-4" /> Cancel Booking
          </Button>
        </div>
      ) : (
        <div className="w-full space-y-3">
          <p className="text-sm text-muted-foreground">
            {booking.status === "cancelled"
              ? "This booking has been cancelled."
              : "This booking has been completed."}
          </p>
          <Link href="/book">
            <Button className="rounded-xl w-full">Book a New Free Estimate</Button>
          </Link>
        </div>
      )}

      <Link href="/">
        <Button variant="ghost" className="rounded-xl w-full mt-2 text-muted-foreground text-sm">
          Back to Home
        </Button>
      </Link>
    </Page>
  );
}

function InvalidLink() {
  return (
    <Page>
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
        <AlertTriangle className="w-8 h-8 text-amber-600" />
      </div>
      <h1 className="text-2xl font-black font-display mb-3">Link not valid</h1>
      <p className="text-muted-foreground mb-8">
        This manage link is incomplete or has expired. Use the link from your confirmation email,
        or call us and we'll sort it out.
      </p>
      <Link href="/">
        <Button variant="outline" className="rounded-xl w-full">Back to Home</Button>
      </Link>
    </Page>
  );
}

function Page({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-20">
      <Card className={`w-full border-none shadow-lg ${wide ? "max-w-lg" : "max-w-md"}`}>
        <CardContent className="pt-10 pb-10 px-8 text-center flex flex-col items-center">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
