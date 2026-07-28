import { useState } from "react";
import { 
  useListServices, 
  useCreateService, 
  useUpdateService, 
  useDeleteService,
  getListServicesQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit2, Trash2, Box, Truck, Recycle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.coerce.number().min(0),
  unit: z.string().min(1, "Unit is required"),
  iconName: z.string().optional(),
  isActive: z.boolean().default(true),
});

export default function Services() {
  const { data: services, isLoading } = useListServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      unit: "per load",
      iconName: "box",
      isActive: true,
    }
  });

  const openNew = () => {
    setEditingId(null);
    form.reset({ name: "", description: "", price: 0, unit: "per load", iconName: "box", isActive: true });
    setIsOpen(true);
  };

  const openEdit = (service: any) => {
    setEditingId(service.id);
    form.reset({
      name: service.name,
      description: service.description,
      price: service.price,
      unit: service.unit,
      iconName: service.iconName || "box",
      isActive: service.isActive,
    });
    setIsOpen(true);
  };

  const onSubmit = (data: z.infer<typeof serviceSchema>) => {
    if (editingId) {
      updateService.mutate({ id: editingId, data }, {
        onSuccess: () => {
          toast({ title: "Service updated" });
          queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
          setIsOpen(false);
        }
      });
    } else {
      createService.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Service created" });
          queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
          setIsOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    deleteService.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Service deleted" });
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
      }
    });
  };

  const getIcon = (name?: string | null) => {
    switch(name) {
      case 'truck': return <Truck className="w-5 h-5" />;
      case 'recycle': return <Recycle className="w-5 h-5" />;
      default: return <Box className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black font-display">Services Menu</h1>
          <p className="text-muted-foreground mt-1">Manage what customers can book on the site.</p>
        </div>
        <Button onClick={openNew} size="lg" className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Add Service
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services?.map(service => (
            <div key={service.id} className={`bg-card border rounded-2xl p-6 shadow-sm flex flex-col ${!service.isActive && 'opacity-60 grayscale-[0.5]'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  {getIcon(service.iconName)}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(service)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(service.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <h3 className="font-bold text-xl mb-2">{service.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3">{service.description}</p>
              
              <div className="flex justify-between items-end border-t pt-4">
                <div className="font-black text-2xl">${service.price} <span className="text-sm font-medium text-muted-foreground">/{service.unit}</span></div>
                <div className="text-xs font-bold uppercase tracking-wider">{service.isActive ? <span className="text-green-500">Active</span> : <span className="text-red-500">Hidden</span>}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Service" : "New Service"}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea className="resize-none h-24" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <FormControl><Input placeholder="e.g. per load, starting at" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="iconName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select icon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="box">Box/Package</SelectItem>
                          <SelectItem value="truck">Truck</SelectItem>
                          <SelectItem value="recycle">Recycle</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 h-[72px] mt-[26px]">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createService.isPending || updateService.isPending}>
                  Save Service
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
