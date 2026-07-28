import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSettings,
  useUpdateSettings,
  useChangeAdminPassword,
  getGetSettingsQueryKey,
  getGetPublicSettingsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Banknote, KeyRound } from "lucide-react";

const businessSchema = z.object({
  etransferEmail: z.string().email("Enter a valid email"),
  businessPhone: z.string().min(1, "Required"),
  businessEmail: z.string().email("Enter a valid email"),
  serviceArea: z.string().min(1, "Required"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z.string().min(6, "At least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function Settings() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const changePassword = useChangeAdminPassword();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const businessForm = useForm<z.infer<typeof businessSchema>>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      etransferEmail: "",
      businessPhone: "",
      businessEmail: "",
      serviceArea: "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    // Populate the form from the server, but never clobber in-progress edits
    if (settings && !businessForm.formState.isDirty) {
      businessForm.reset(settings);
    }
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSaveBusiness = (values: z.infer<typeof businessSchema>) => {
    updateSettings.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: "Settings saved", description: "Business settings have been updated." });
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetPublicSettingsQueryKey() });
        },
        onError: () => {
          toast({ title: "Save failed", description: "Could not save settings.", variant: "destructive" });
        },
      }
    );
  };

  const onChangePassword = (values: z.infer<typeof passwordSchema>) => {
    changePassword.mutate(
      { data: { currentPassword: values.currentPassword, newPassword: values.newPassword } },
      {
        onSuccess: () => {
          toast({ title: "Password changed", description: "Use your new password next time you log in." });
          passwordForm.reset();
        },
        onError: (error: any) => {
          const message =
            error?.status === 401
              ? "Current password is incorrect."
              : "Could not change password.";
          toast({ title: "Change failed", description: message, variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-black font-display">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your business details and admin access.</p>
      </div>

      {/* Business Settings */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display">Business Details</h2>
              <p className="text-sm text-muted-foreground">
                These appear on the customer site — payment instructions, header, and footer.
              </p>
            </div>
          </div>

          <Form {...businessForm}>
            <form onSubmit={businessForm.handleSubmit(onSaveBusiness)} className="space-y-5">
              <FormField
                control={businessForm.control}
                name="etransferEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interac e-Transfer Email</FormLabel>
                    <FormControl>
                      <Input placeholder="payments@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField
                  control={businessForm.control}
                  name="businessPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="437-775-9626" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={businessForm.control}
                  name="businessEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Email</FormLabel>
                      <FormControl>
                        <Input placeholder="info@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={businessForm.control}
                name="serviceArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Area</FormLabel>
                    <FormControl>
                      <Input placeholder="Greater Toronto Area" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="rounded-xl" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Saving..." : "Save Business Details"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display">Change Admin Password</h2>
              <p className="text-sm text-muted-foreground">
                Update the password used to access this admin portal.
              </p>
            </div>
          </div>

          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-5">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="At least 6 characters" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Repeat new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="rounded-xl" disabled={changePassword.isPending}>
                {changePassword.isPending ? "Updating..." : "Change Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
