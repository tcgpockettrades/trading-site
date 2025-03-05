"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { isValidFriendCode, formatFriendCode } from "@/lib/utils/index";

const formSchema = z.object({
  friendCode: z
    .string()
    .min(1, { message: "Friend code is required" })
    .refine((val) => isValidFriendCode(val), {
      message: "Invalid friend code format. Should be 16 digits (e.g. 1234-5678-9012-3456)",
    }),
  username: z
    .string()
    .min(1, { message: "Pokemon TCG Pocket username is required" }),
});

export default function FriendCodePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      friendCode: "",
      username: "",
    },
  });

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      
      if (!data.user) {
        // If no user is logged in, redirect to login
        router.push("/login");
        return;
      }
      
      setUser(data.user);
    };

    getUser();
  }, [supabase.auth, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Format the friend code to remove any non-numeric characters
      const cleanedFriendCode = values.friendCode.replace(/\D/g, "");
      
      // Check if the user exists in the users table first
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id, email")
        .eq("id", user.id) // Check by ID, not email
        .single();
      
      if (checkError) {
        console.error("Error checking for user:", checkError);
        
        // If user doesn't exist in the table, create it
        if (checkError.code === 'PGRST116') { // No rows found error
          const { data: newUser, error: createError } = await supabase
            .from("users")
            .insert({
              id: user.id, // Explicitly set the ID to match auth.users
              email: user.email,
              friend_code: cleanedFriendCode,
              tcg_pocket_username: values.username,
              notification_preference: { email: false, text: false },
              notification_contact: { email: null, phone: null }
            })
            .select();
          
          if (createError) {
            throw createError;
          }
          
          console.log("Created new user record:", newUser);
          toast.success("Profile created", {
            description: "Your friend code has been saved!"
          });
          
          // Redirect to dashboard
          router.push("/dashboard");
          return;
        } else {
          throw checkError;
        }
      }
      
      console.log("Found existing user:", existingUser);
      
      // Update the user's profile with the friend code
      const { data: updateData, error: updateError } = await supabase
        .from("users")
        .update({
          friend_code: cleanedFriendCode,
          tcg_pocket_username: values.username,
        })
        .eq("id", user.id) // Update by ID, not email
        .select();
  
      if (updateError) {
        throw updateError;
      }
      
      console.log("Update result:", updateData);
  
      toast.success("Profile updated", {
        description: "Your friend code has been saved!"
      });
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Update failed", {
        description: "An unexpected error occurred. Please try again."
      });
    } finally {
      setLoading(false);
    }
  }

  const handleFriendCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format the friend code as the user types
    let value = e.target.value.replace(/\D/g, "");
    
    if (value.length > 16) {
      value = value.slice(0, 16);
    }
    
    if (value.length > 12) {
        value = `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}-${value.slice(12)}`;
    } else if (value.length > 8) {
        value = `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}`;
    } else if (value.length > 4) {
        value = `${value.slice(0, 4)}-${value.slice(4)}`;  
    }
    
    form.setValue("friendCode", value);
  };

  if (!user) {
    return <div className="container flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="container flex h-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Add Your Friend Code
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your Pokemon TCG Pocket friend code to enable trading
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="friendCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Friend Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1234-5678-9012"
                      {...field}
                      onChange={handleFriendCodeChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Your 16-digit Pokemon TCG Pocket friend code
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TCG Pocket Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your in-game username"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Your username in Pokemon TCG Pocket
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Save and Continue"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}