import { useState, useRef } from "react";
import { format } from "date-fns";
import { 
  useListBookings, 
  useUpdateBooking, 
  useDeleteBooking,
  getListBookingsQueryKey,
  getGetDashboardStatsQueryKey,
  BookingStatus,
  BookingPaymentStatus,
  type Booking
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
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Eye, Trash2, CheckCircle, Clock, XCircle, Search, DollarSign, Download } from "lucide-react";

export default function Bookings() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Need to correctly type the query params based on generated API
  const queryParams: any = {};
  if (statusFilter !== "all") queryParams.status = statusFilter;
  if (paymentFilter !== "all") queryParams.paymentStatus = paymentFilter;

  const { data: bookings, isLoading } = useListBookings(queryParams);
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();

  const handleUpdateStatus = (id: number, status: BookingStatus) => {
    updateBooking.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: "Status updated" });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey(queryParams) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        if (viewBooking?.id === id) {
          setViewBooking({ ...viewBooking, status } as Booking);
        }
      }
    });
  };

  const handleUpdatePayment = (id: number, paymentStatus: BookingPaymentStatus) => {
    updateBooking.mutate({ id, data: { paymentStatus } }, {
      onSuccess: () => {
        toast({ title: "Payment status updated" });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey(queryParams) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        if (viewBooking?.id === id) {
          setViewBooking({ ...viewBooking, paymentStatus } as Booking);
        }
      }
    });
  };
  
  const handleUpdateAmount = (id: number, amountStr: string) => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return;
    
    updateBooking.mutate({ id, data: { totalAmount: amount } }, {
      onSuccess: () => {
        toast({ title: "Final amount updated" });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey(queryParams) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this booking?")) return;
    deleteBooking.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Booking deleted" });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey(queryParams) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        setViewBooking(null);
      }
    });
  };

  const filteredBookings = bookings?.filter(b => 
    b.customerName.toLowerCase().includes(search.toLowerCase()) ||
    b.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
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
    const headers = ["Reference", "Customer", "Email", "Phone", "Address", "City", "Postal Code", "Service", "Date", "Time", "Status", "Payment", "Amount", "Notes", "Created"];
    const rows = filteredBookings.map(b => [
      `POC-${b.id.toString().padStart(4, "0")}`,
      b.customerName, b.customerEmail, b.customerPhone,
      b.address, b.city ?? "", b.postalCode ?? "",
      b.serviceName ?? "", b.serviceDate, b.serviceTime,
      b.status, b.paymentStatus, b.totalAmount ?? "", b.notes ?? "", b.createdAt,
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

  const getPaymentBadge = (status: string) => {
    if (status === 'paid') return <Badge variant="success">Paid</Badge>;
    return <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50">Unpaid</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black font-display">Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage customer jobs and payments.</p>
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
            placeholder="Search by name, email, or reference..." 
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
        <div className="w-full sm:w-48">
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
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
                <TableHead>Service / Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
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
                      <div className="font-bold">{booking.customerName}</div>
                      <div className="text-xs text-muted-foreground">{booking.customerPhone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{booking.serviceName || "Custom Inquiry"}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(booking.serviceDate), "MMM d, yyyy")} • {booking.serviceTime}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        {getPaymentBadge(booking.paymentStatus)}
                        {booking.totalAmount && (
                          <span className="text-xs font-bold">{formatCurrency(booking.totalAmount)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setViewBooking(booking)}>
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
      <Dialog open={!!viewBooking} onOpenChange={(open) => !open && setViewBooking(null)}>
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
                  <p className="text-sm"><a href={`mailto:${viewBooking.customerEmail}`} className="text-primary hover:underline">{viewBooking.customerEmail}</a></p>
                  <p className="text-sm"><a href={`tel:${viewBooking.customerPhone}`} className="text-primary hover:underline">{viewBooking.customerPhone}</a></p>
                </div>
                
                <div>
                  <h4 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">Location</h4>
                  <p className="text-sm">{viewBooking.address}</p>
                  <p className="text-sm">{viewBooking.city}, {viewBooking.postalCode}</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">Schedule</h4>
                  <p className="font-medium text-primary">
                    {format(new Date(viewBooking.serviceDate), "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="text-sm font-medium">{viewBooking.serviceTime}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-muted p-4 rounded-xl">
                  <h4 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">Status Management</h4>
                  <div className="flex gap-2 mb-4">
                    {getStatusBadge(viewBooking.status)}
                    {getPaymentBadge(viewBooking.paymentStatus)}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant={viewBooking.status === "pending" ? "default" : "outline"} onClick={() => handleUpdateStatus(viewBooking.id, "pending")}>Pending</Button>
                      <Button size="sm" variant={viewBooking.status === "confirmed" ? "default" : "outline"} className={viewBooking.status === "confirmed" ? "bg-blue-500" : ""} onClick={() => handleUpdateStatus(viewBooking.id, "confirmed")}>Confirmed</Button>
                      <Button size="sm" variant={viewBooking.status === "completed" ? "default" : "outline"} className={viewBooking.status === "completed" ? "bg-green-500" : ""} onClick={() => handleUpdateStatus(viewBooking.id, "completed")}>Completed</Button>
                      <Button size="sm" variant={viewBooking.status === "cancelled" ? "default" : "outline"} className={viewBooking.status === "cancelled" ? "bg-red-500" : ""} onClick={() => handleUpdateStatus(viewBooking.id, "cancelled")}>Cancelled</Button>
                    </div>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-xl border border-border">
                  <h4 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider flex items-center justify-between">
                    Payment
                  </h4>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input 
                        type="number" 
                        placeholder="Final Amount" 
                        defaultValue={viewBooking.totalAmount || ""}
                        className="pl-9 bg-background"
                        onBlur={(e) => handleUpdateAmount(viewBooking.id, e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm" 
                      variant={viewBooking.paymentStatus === "unpaid" ? "default" : "outline"} 
                      onClick={() => handleUpdatePayment(viewBooking.id, "unpaid")}
                      className={viewBooking.paymentStatus === "unpaid" ? "bg-amber-500" : ""}
                    >
                      Unpaid
                    </Button>
                    <Button 
                      size="sm" 
                      variant={viewBooking.paymentStatus === "paid" ? "default" : "outline"} 
                      className={viewBooking.paymentStatus === "paid" ? "bg-green-500" : ""}
                      onClick={() => handleUpdatePayment(viewBooking.id, "paid")}
                    >
                      Mark Paid
                    </Button>
                  </div>
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
