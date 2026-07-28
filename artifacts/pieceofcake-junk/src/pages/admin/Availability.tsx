import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAvailability,
  useUpdateAvailability,
  getGetAvailabilityQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Clock, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = [
  { value: 0, short: "Sun", full: "Sunday" },
  { value: 1, short: "Mon", full: "Monday" },
  { value: 2, short: "Tue", full: "Tuesday" },
  { value: 3, short: "Wed", full: "Wednesday" },
  { value: 4, short: "Thu", full: "Thursday" },
  { value: 5, short: "Fri", full: "Friday" },
  { value: 6, short: "Sat", full: "Saturday" },
];

interface WindowDraft {
  start: string;
  end: string;
}

function to12h(hhmm: string): string {
  const [hStr = "0", m = "00"] = hhmm.split(":");
  let h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${suffix}`;
}

function windowError(w: WindowDraft): string | null {
  if (!w.start || !w.end) return "Both times are required";
  if (w.start >= w.end) return "End must be after start";
  return null;
}

/** Add two hours to an HH:MM time, capped at 23:59. */
function plusTwoHours(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const total = Math.min(h * 60 + m + 120, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function Availability() {
  const { data, isLoading } = useGetAvailability();
  const update = useUpdateAvailability();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [days, setDays] = useState<number[]>([]);
  const [windows, setWindows] = useState<WindowDraft[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    // Populate from the server, but never clobber in-progress edits
    if (data && !dirty) {
      setDays(data.days);
      setWindows(data.windows.map(({ start, end }) => ({ start, end })));
    }
  }, [data, dirty]);

  const toggleDay = (d: number) => {
    setDirty(true);
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  };

  const setWindowField = (index: number, field: keyof WindowDraft, value: string) => {
    setDirty(true);
    setWindows((prev) => prev.map((w, i) => (i === index ? { ...w, [field]: value } : w)));
  };

  const addWindow = () => {
    setDirty(true);
    setWindows((prev) => {
      const last = prev[prev.length - 1];
      const start = last?.end || "08:00";
      return [...prev, { start, end: plusTwoHours(start) }];
    });
  };

  const removeWindow = (index: number) => {
    setDirty(true);
    setWindows((prev) => prev.filter((_, i) => i !== index));
  };

  const hasDuplicates =
    new Set(windows.map((w) => `${w.start}-${w.end}`)).size !== windows.length;
  const windowsValid = windows.length > 0 && windows.every((w) => !windowError(w)) && !hasDuplicates;
  const canSave = days.length > 0 && windowsValid && !update.isPending;

  const onSave = () => {
    update.mutate(
      { data: { days, windows } },
      {
        onSuccess: () => {
          setDirty(false);
          toast({
            title: "Availability saved",
            description: "Customers will now see the updated days and arrival windows.",
          });
          queryClient.invalidateQueries({ queryKey: getGetAvailabilityQueryKey() });
        },
        onError: () => {
          toast({
            title: "Save failed",
            description: "Could not save availability. Check the times and try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-black font-display">Availability</h1>
        <p className="text-muted-foreground mt-1">
          Choose which days you take bookings and the arrival windows customers can pick.
        </p>
      </div>

      {/* Days of the week */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display">Available Days</h2>
              <p className="text-sm text-muted-foreground">
                Unavailable days are greyed out on the customer's booking calendar.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const active = days.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  aria-pressed={active}
                  title={d.full}
                  className={cn(
                    "px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {d.short}
                </button>
              );
            })}
          </div>
          {days.length === 0 && (
            <p className="text-sm font-medium text-destructive mt-3">Pick at least one day.</p>
          )}
        </CardContent>
      </Card>

      {/* Arrival windows */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display">Arrival Windows</h2>
              <p className="text-sm text-muted-foreground">
                Set times in 24-hour format — customers see the 12-hour version on the right.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {windows.map((w, i) => {
              const error = windowError(w);
              return (
                <div key={i}>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Input
                      type="time"
                      value={w.start}
                      onChange={(e) => setWindowField(i, "start", e.target.value)}
                      className="w-32 tabular-nums"
                      aria-label={`Window ${i + 1} start time`}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      value={w.end}
                      onChange={(e) => setWindowField(i, "end", e.target.value)}
                      className="w-32 tabular-nums"
                      aria-label={`Window ${i + 1} end time`}
                    />
                    <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      {!error ? `${to12h(w.start)} - ${to12h(w.end)}` : "—"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive ml-auto"
                      onClick={() => removeWindow(i)}
                      disabled={windows.length <= 1}
                      aria-label={`Remove window ${i + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {error && <p className="text-xs font-medium text-destructive mt-1">{error}</p>}
                </div>
              );
            })}
          </div>

          {hasDuplicates && (
            <p className="text-sm font-medium text-destructive mt-3">
              Two windows have the same start and end time.
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            className="rounded-xl mt-4"
            onClick={addWindow}
            disabled={windows.length >= 12}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Window
          </Button>
        </CardContent>
      </Card>

      <Button className="rounded-xl" disabled={!canSave} onClick={onSave}>
        {update.isPending ? "Saving..." : "Save Availability"}
      </Button>
    </div>
  );
}
