import { useEffect } from "react";
import { useAdminLogin, useGetAuthMe, getGetAuthMeQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Cake } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { data: auth, isLoading } = useGetAuthMe();
  const loginMutation = useAdminLogin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: "" },
  });

  // Redirect if already logged in — in an effect, never during render
  useEffect(() => {
    if (!isLoading && auth?.isAdmin) {
      setLocation("/admin/dashboard");
    }
  }, [isLoading, auth?.isAdmin, setLocation]);

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({
      data: { password: data.password }
    }, {
      onSuccess: () => {
        // Invalidate auth query to reflect new state
        queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
        setLocation("/admin/dashboard");
      },
      onError: () => {
        toast({
          title: "Login Failed",
          description: "Invalid password. Please try again.",
          variant: "destructive",
        });
        form.setValue("password", "");
      }
    });
  };

  if (isLoading || auth?.isAdmin) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
      <div className="max-w-md w-full bg-card border rounded-3xl p-8 md:p-10 shadow-xl">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-lg">
            <Cake className="w-8 h-8" />
          </div>
        </div>
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black font-display mb-2">Admin Portal</h1>
          <p className="text-muted-foreground">Piece of Cake Junk</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              size="lg" 
              className="w-full h-14 rounded-xl text-lg" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Verifying..." : "Secure Login"}
            </Button>
          </form>
        </Form>

        <div className="mt-8 pt-6 border-t text-center">
          <Link href="/">
            <Button variant="ghost" className="text-muted-foreground gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Main Site
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
