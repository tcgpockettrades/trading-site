"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { User } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Menu, Moon, Sun, X, Coffee } from "lucide-react";
import { useTheme } from "next-themes";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="top-0 z-50 w-full border-b bg-background/95 backdrop-blur px-4">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center">
            <Image 
                src="/logo.svg" 
                alt="TCG Pocket Trader Logo" 
                width={30} 
                height={30} 
                className="mr-2"
            />
          <span className="text-xl font-bold">TCG Pocket Trader</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden ml-auto md:flex md:items-center md:space-x-4 lg:space-x-6">
          <Link
            href="/trades"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/trades") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Trades
          </Link>

          {user ? (
            <>
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/dashboard") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/my-trades"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/my-trades") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                My Trades
              </Link>
              <Link
                href="/profile"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/profile") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Profile
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/login") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Login
              </Link>
              <Link href="/register">
                <Button>Register</Button>
              </Link>
            </>
          )}

          {/* Support Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSupportDialogOpen(true)}
            className="flex items-center gap-1"
          >
            <Coffee className="h-4 w-4" />
            <span className="hidden sm:inline">Support</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </nav>

        {/* Mobile navigation toggle */}
        <div className="flex ml-auto md:hidden">
          {/* Mobile Support Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSupportDialogOpen(true)}
            className="mr-1"
          >
            <Coffee className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="mr-1"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile navigation menu */}
        {menuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-background border-b md:hidden">
            <div className="container py-4 space-y-4">
              <Link
                href="/trades"
                className="block text-sm font-medium hover:text-primary"
                onClick={() => setMenuOpen(false)}
              >
                Trades
              </Link>
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="block text-sm font-medium hover:text-primary"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/my-trades"
                    className="block text-sm font-medium hover:text-primary"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Trades
                  </Link>
                  <Link
                    href="/profile"
                    className="block text-sm font-medium hover:text-primary"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block text-sm font-medium hover:text-primary"
                    onClick={() => setMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="block"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Button className="w-full">Register</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Support Dialog */}
      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Support This Project</DialogTitle>
            <DialogDescription>
              Thank you for using TCG Pocket Trader. This application is developed and maintained independently.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="mb-3">
              This site is not free to run, and I am a college student who created this tool. If you find value in using this platform, your support would be greatly appreciated.
            </p>
            <p className="text-sm text-muted-foreground">
              All contributions help cover hosting costs and enable new features.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline">Maybe Later</Button>
            </DialogClose>
            <Button 
              onClick={() => window.open("https://www.venmo.com/u/Charles-Spehl", "_blank")}
              className="gap-2"
            >
              <Coffee className="h-4 w-4" />
              Support via Venmo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}