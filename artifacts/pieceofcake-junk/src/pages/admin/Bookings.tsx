import { useState } from "react";
import { format } from "date-fns";
import {
  useListBookings,
  useUpdateBooking,
  useDeleteBooking,
  getListBookingsQueryKey,
  getGetDashboardStatsQueryKey,
  type BookingStatus,
  type LoadSize,
  type Booking,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, Trash2, CheckCircle, Clock, XCircle, Search, Download, Building2, Truck, CalendarClock } from "lucide-react";
import { useGetAvailability } from "@workspace/api-client-react";

const LOAD_SIZE_OPTIONS: LoadSize[] = [
  "small", "1/8", "1/6", "1/4", "1/3", "3/8", "1/2", "5/8", "2/3", "3/4", "5/6", "7/8", "full",
];

function loadSizeLabel(size: string): string {
  if (size === "small") return "Small Load";
  if (size === "full") return "Full Load";
  return `${size} Load`;
}

export default function Bookings() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);
  const [rescheduleDraft, setRescheduleDraft] = useState<{ date: string; time: string } | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: availability } = useGetAvailability();

  const queryParams: { status?: BookingStatus } = {};
  if (statusFilter !== "all") queryParams.status = statusFilter as BookingStatus;

  const { data: bookings, isLoading } = useListBookings(queryParams);
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey(queryParams) });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
  };

  const handleUpdateStatus = (id: number, status: BookingStatus) => {
    updateBooking.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: "Status updated" });
        invalidate();
        if (viewBooking?.id === id) {
          setViewBooking({ ...viewBooking, status } as Booking);
        }
      }
    });
  };

  const handleUpdateLoadSize = (id: number, loadSize: LoadSize) => {
    updateBooking.mutate({ id, data: { loadSize } }, {
      onSuccess: () => {
        toast({ title: "Load size updated" });
        invalidate();
        if (viewBooking?.id === id) {
          setViewBooking({ ...viewBooking, loadSize } as Booking);
        }
      }
    });
  };

  const handleReschedule = (id: number) => {
    if (!rescheduleDraft) return;
    updateBooking.mutate(
      { id, data: { serviceDate: rescheduleDraft.date, serviceTime: rescheduleDraft.time } },
      {
        onSuccess: () => {
          toast({ title: "Booking rescheduled", description: "The customer has been emailed their new time." });
          invalidate();
          if (viewBooking?.id === id) {
            setViewBooking({
              ...viewBooking,
              serviceDate: rescheduleDraft.date,
              serviceTime: rescheduleDraft.time,
            } as Booking);
          }
          setRescheduleDraft(null);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this booking?")) return;
    deleteBooking.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Booking deleted" });
        invalidate();
        setViewBooking(null);
      }
    });
  };

  const filteredBookings = bookings?.filter(b =>
    b.customerName.toLowerCase().includes(search.toLowerCase()) ||
    b.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
    (b.businessName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    `POC-${b.id.toString().padStart(4, '0')}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCsv = () => {
    if (!filteredBookings?.length) {
      toast({ title: "Nothing to export", description: "No bookings match the current filters." });
      return;
    }
    const escape = (v: unknown) => {
      let s = String(v ?? "");
      // Neutralize spreadsheet formula injection (=, +, -, @, tab, CR at cell start)
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const headers = ["Reference", "Customer", "Business", "Email", "Phone", "Address", "City", "Postal Code", "Estimate Date", "Arrival Window", "Load Size", "Status", "Notes", "Created"];
    const rows = filteredBookings.map(b => [
      `POC-${b.id.toString().padStart(4, "0")}`,
      b.customerName,
      b.isBusiness ? (b.businessName ?? "Yes") : "",
      b.customerEmail, b.customerPhone,
      b.address, b.city ?? "", b.postalCode ?? "",
      b.serviceDate, b.serviceTime, loadSizeLabel(b.loadSize),
      b.status, b.notes ?? "", b.createdAt,
    ].map(escape).join(","));
    const csv = [headers.map(escape).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${filteredBookings.length} bookings exported to CSV.` });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <Badge variant="warning"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>;
      case 'confirmed': return <Badge variant="default" className="bg-blue-500"><CheckCircle className="w-3 h-3 mr-1"/> Confirmed</Badge>;
      case 'completed': return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1"/> Completed</Badge>;
      case 'cancelled': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/> Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black font-display">Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage estimate requests and jobs.</p>
        </div>
        <Button variant="outline" className="rounded-xl gap-2" onClick={handleExportCsv}>
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-2xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name, business, email, or reference..."
            className="pl-9 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-24">Ref</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Estimate</TableHead>
                <TableHead>Load Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No bookings found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings?.map(booking => (
                  <TableRow key={booking.id} className="group">
                    <TableCell className="font-mono text-sm font-medium">
                      POC-{booking.id.toString().padStart(4, '0')}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold flex items-center gap-1.5">
                        {booking.customerName}
                        {booking.isBusiness && (
                          <span title={booking.businessName ?? "Business"}>
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{booking.customerPhone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{format(new Date(`${booking.serviceDate}T00:00:00`), "MMM d, yyyy")}</div>
                      <div className="text-xs text-muted-foreground">{booking.serviceTime}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold">
                        <Truck className="w-3 h-3 mr-1.5" />
                        {loadSizeLabel(booking.loadSize)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setRescheduleDraft(null); setViewBooking(booking); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* View Booking Dialog */}
      <Dialog open={!!viewBooking} onOpenChange={(open) => { if (!open) { setViewBooking(null); setRescheduleDraft(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Booking Details</span>
              {viewBooking && <span className="text-muted-foreground font-mono text-sm mr-4">POC-{viewBooking.id.toString().padStart(4, '0')}</span>}
            </DialogTitle>
          </DialogHeader>

          {viewBooking && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">Customer</h4>
                  <p className="font-bold text-lg">{viewBooking.customerName}</p>
                  {viewBooking.isBusiness && (
                    <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5" />
                      {viewBooking.businessName || "Business"}
                    </p>
                  )}
                  <p className="text-sm"><a href={`mailto:${viewBooking.customerEmail}`} className="text-primary hover:underline">{viewBooking.customerEmail}</a></p>
                  <p className="text-sm"><a href={`tel:${viewBooking.customerPhone}`} className="text-primary hover:underline">{viewBooking.customerPhone}</a></p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">Location</h4>
                  <p className="text-sm">{viewBooking.address}</p>
                  <p className="text-sm">{viewBooking.city}, {viewBooking.postalCode}</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">Estimate Visit</h4>
                  {rescheduleDraft ? (
                    <div className="space-y-2">
                      <Input
                        type="date"
                        value={rescheduleDraft.date}
                        onChange={(e) => setRescheduleDraft({ ...rescheduleDraft, date: e.target.value })}
                      />
                      <Select
                        value={rescheduleDraft.time}
                        onValueChange={(v) => setRescheduleDraft({ ...rescheduleDraft, time: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(availability?.windows ?? []).map((w) => (
                            <SelectItem key={w.label} value={w.label}>{w.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleReschedule(viewBooking.id)}
                          disabled={!rescheduleDraft.date || updateBooking.isPending}
                        >
                          {updateBooking.isPending ? "Saving..." : "Save & Email Customer"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRescheduleDraft(null)}>
                          Cancel
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Saving instantly emails the customer their new time.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-primary">
                        {format(new Date(`${viewBooking.serviceDate}T00:00:00`), "EEEE, MMMM d, yyyy")}
                      </p>
                      <p className="text-sm font-medium">{viewBooking.serviceTime}</p>
                      {(viewBooking.status === "pending" || viewBooking.status === "confirmed") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 gap-1.5"
                          onClick={() => setRescheduleDraft({ date: viewBooking.serviceDate, time: viewBooking.serviceTime })}
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                          Reschedule
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-muted p-4 rounded-xl">
                  <h4 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">Status Management</h4>
                  <div className="flex gap-2 mb-4">
                    {getStatusBadge(viewBooking.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant={viewBooking.status === "pending" ? "default" : "outline"} onClick={() => handleUpdateStatus(viewBooking.id, "pending")}>Pending</Button>
                    <Button size="sm" variant={viewBooking.status === "confirmed" ? "default" : "outline"} className={viewBooking.status === "confirmed" ? "bg-blue-500" : ""} onClick={() => handleUpdateStatus(viewBooking.id, "confirmed")}>Confirmed</Button>
                    <Button size="sm" variant={viewBooking.status === "completed" ? "default" : "outline"} className={viewBooking.status === "completed" ? "bg-green-500" : ""} onClick={() => handleUpdateStatus(viewBooking.id, "completed")}>Completed</Button>
                    <Button size="sm" variant={viewBooking.status === "cancelled" ? "default" : "outline"} className={viewBooking.status === "cancelled" ? "bg-red-500" : ""} onClick={() => handleUpdateStatus(viewBooking.id, "cancelled")}>Cancelled</Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Marking a booking cancelled instantly emails the customer a cancellation notice.
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-xl border border-border">
                  <h4 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Estimated Load
                  </h4>
                  <Select
                    value={viewBooking.loadSize}
                    onValueChange={(v) => handleUpdateLoadSize(viewBooking.id, v as LoadSize)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOAD_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={size}>{loadSizeLabel(size)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Adjust after the in-person estimate if the actual volume differs.
                  </p>
                </div>
              </div>

              {viewBooking.notes && (
                <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t">
                  <h4 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">Customer Notes</h4>
                  <p className="text-sm bg-muted/50 p-4 rounded-xl italic">"{viewBooking.notes}"</p>
                </div>
              )}

              <div className="col-span-1 md:col-span-2 flex justify-end pt-4 mt-4 border-t">
                <Button variant="destructive" onClick={() => handleDelete(viewBooking.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Booking
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
