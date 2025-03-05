"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatFriendCode, isValidFriendCode } from "@/lib/utils/index";
import Header from "@/components/header";
import Footer from "@/components/footer";

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
  emailNotifications: z.boolean(),
  emailAddress: z.string().email().optional().or(z.literal("")),
  textNotifications: z.boolean(),
  phoneNumber: z.string().optional().or(z.literal("")),
}).refine(
  (data) => {
    // If email notifications are enabled, email address must be provided
    return !data.emailNotifications || (data.emailAddress && data.emailAddress.length > 0);
  },
  {
    message: "Email address is required for email notifications",
    path: ["emailAddress"],
  }
).refine(
  (data) => {
    // If text notifications are enabled, phone number must be provided
    return !data.textNotifications || (data.phoneNumber && data.phoneNumber.length > 0);
  },
  {
    message: "Phone number is required for text notifications",
    path: ["phoneNumber"],
  }
);

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      friendCode: "",
      username: "",
      emailNotifications: false,
      emailAddress: "",
      textNotifications: false,
      phoneNumber: "",
    },
  });

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      
      if (!data.user) {
        router.push("/login");
        return;
      }
      
      setUser(data.user);
      
      if (data.user.email) {
        loadUserProfile(data.user.email);
      } else {
        setProfileError("User email not found. Please logout and login again.");
        setLoading(false);
      }
    };

    getUser();
  }, [supabase.auth, router]);

  const loadUserProfile = async (email: string) => {
    setLoading(true);
    setProfileError(null);
    
    try {
      const { data: profileData, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          setProfileError("Your profile information is missing. Please complete your profile setup.");
        } else {
          throw error;
        }
      } else {
        setUserProfile(profileData);
        
        // Set form values
        form.setValue("friendCode", formatFriendCode(profileData?.friend_code || ""));
        form.setValue("username", profileData?.tcg_pocket_username || "");
        form.setValue("emailNotifications", profileData?.notification_preference?.email || false);
        form.setValue("emailAddress", profileData?.notification_contact?.email || "");
        form.setValue("textNotifications", profileData?.notification_preference?.text || false);
        form.setValue("phoneNumber", profileData?.notification_contact?.phone || "");
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      setProfileError("Failed to load your profile. Please try again later.");
      toast.error("Failed to load user profile");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    
    setSaving(true);
    
    try {
      // Format friend code to remove dashes
      const cleanedFriendCode = values.friendCode.replace(/\D/g, "");
      
      // Either update or create user profile
      if (userProfile) {
        // Update existing profile
        const { error } = await supabase
          .from("users")
          .update({
            friend_code: cleanedFriendCode,
            tcg_pocket_username: values.username,
            notification_preference: {
              email: values.emailNotifications,
              text: values.textNotifications,
            },
            notification_contact: {
              email: values.emailAddress || null,
              phone: values.phoneNumber || null,
            },
          })
          .eq("id", userProfile.id);

        if (error) {
          throw error;
        }
      } else {
        // Create new profile if missing
        const { error } = await supabase
          .from("users")
          .insert({
            email: user.email,
            friend_code: cleanedFriendCode,
            tcg_pocket_username: values.username,
            notification_preference: {
              email: values.emailNotifications,
              text: values.textNotifications,
            },
            notification_contact: {
              email: values.emailAddress || null,
              phone: values.phoneNumber || null,
            },
          });

        if (error) {
          throw error;
        }
        
        // Reload the user profile
        if (user.email) {
          loadUserProfile(user.email);
        }
      }

      toast.success("Profile updated", {
        description: "Your profile has been updated successfully"
      });
      
      // Clear any errors
      setProfileError(null);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Update failed", {
        description: "An error occurred while updating your profile"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFriendCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format the friend code as the user types
    let value = e.target.value.replace(/\D/g, "");
    
    if (value.length > 16) {
      value = value.slice(0, 16);
    }


    // Format as XXXX-XXXX-XXXX-XXXX
    if (value.length > 12) {
        value = `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}-${value.slice(12)}`;
    } else if (value.length > 8) {
        value = `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}`;
    } else if (value.length > 4) {
        value = `${value.slice(0, 4)}-${value.slice(4)}`;
    }
    
    form.setValue("friendCode", value);
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-6 max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-center h-full">
            <p>Loading profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

          {profileError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{profileError}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Update your personal information and notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Personal Information</h3>
                    <FormField
                      control={form.control}
                      name="friendCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Friend Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="1234-5678-9012-3456"
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
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Notification Preferences (Coming soon if I have the motivation)</h3>
                    <FormField
                      control={form.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Email Notifications <span className="text-sm text-muted-foreground">(coming soon)</span>
                            </FormLabel>
                            <FormDescription>
                              Receive email notifications when someone is interested in your trade
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={true}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("emailNotifications") && (
                      <FormField
                        control={form.control}
                        name="emailAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="your@email.com"
                                {...field}
                                disabled={true}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="textNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              SMS Notifications <span className="text-sm text-muted-foreground">(coming soon)</span>
                            </FormLabel>
                            <FormDescription>
                              Receive text message notifications when someone is interested in your trade
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={true}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("textNotifications") && (
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="+1 (123) 456-7890"
                                {...field}
                                disabled={true}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? "Saving..." : profileError ? "Create Profile" : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href="/profile/missing-cards">
                  Manage Missing Cards
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  Back to Dashboard
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}