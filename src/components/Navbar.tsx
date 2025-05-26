'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Menu, 
  Book, 
  FileText, 
  File, 
  Bot, 
  Users, 
  Plus, 
  User, 
  ShieldCheck, 
  LogOut,
  Search 
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getAuth, User as FirebaseUser } from "firebase/auth";
import { signOut } from "@/lib/authUtils";
import { toast } from "sonner";

/**
 * Navbar component - Provides mobile navigation for the application
 * Only visible on mobile devices (hidden on md+ breakpoints)
 * Matches the desktop sidebar structure and styling
 */
export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("You have been signed out");
      router.replace("/login");
      setIsOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  const getInitials = (displayName: string | null) => {
    if (!displayName) return "U";
    return displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push("/journal");
      setIsOpen(false);
    }
  };

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  // Navigation sections configuration matching desktop sidebar
  const mainMenuItems = [
    { href: "/home", label: "Home", icon: FileText },
    { href: "/journal", label: "Journal", icon: File },
    { href: "/templates", label: "Templates", icon: FileText },
    { href: "/ai-chat", label: "Talk to Daygo AI", icon: Bot },
    { href: "/community", label: "Community", icon: Users },
  ];

  const actionItems = [
    { href: "/journal/select-template", label: "New Journal Entry", icon: Plus },
    { href: "/templates/new", label: "New Template", icon: Plus },
  ];

  const accountItems = [
    { href: "/account", label: "Account Settings", icon: User },
    { href: "/privacy", label: "Privacy", icon: ShieldCheck },
  ];

  return (
    // Sticky header that stays at top of viewport
    <header className="sticky top-0 z-50 w-full border-b bg-background md:hidden">
      <div className="flex h-14 items-center px-4">
        {/* Mobile menu sheet/drawer */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="mr-2"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[18rem] p-0 flex flex-col">
            {/* Header section with logo */}
            <div className="flex h-14 items-center px-4 border-b">
              <Link
                href="/"
                className="flex items-center gap-2 font-semibold"
                onClick={handleLinkClick}
              >
                <Book className="h-6 w-6" />
                <span className="text-lg font-semibold">Daygo</span>
              </Link>
            </div>

            {/* Content section */}
            <div className="flex-1 overflow-auto">
              {/* Search form */}
              <div className="p-2">
                <form onSubmit={handleSearchSubmit}>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="search" 
                      placeholder="Search journal entries..." 
                      className="pl-8 h-9" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </form>
              </div>

              {/* Main Menu */}
              <div className="px-2 py-2">
                <h3 className="px-2 py-2 text-sm font-medium text-muted-foreground">Main Menu</h3>
                <nav className="space-y-1">
                  {mainMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                        pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href))
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground/80"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Actions */}
              <div className="px-2 py-2">
                <h3 className="px-2 py-2 text-sm font-medium text-muted-foreground">Actions</h3>
                <nav className="space-y-1">
                  {actionItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-foreground/80"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Account */}
              <div className="px-2 py-2">
                <h3 className="px-2 py-2 text-sm font-medium text-muted-foreground">Account</h3>
                <nav className="space-y-1">
                  {accountItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                        pathname === item.href
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground/80"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* Footer section with user info */}
            {user && (
              <div className="border-t p-4">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium leading-none truncate">
                      {user.displayName || user.email}
                    </p>
                    {user.displayName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    className="h-8 w-8"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Log out</span>
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Centered logo in header */}
        <div className="flex flex-1 items-center justify-center">
          <Link href="/" className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            <span className="font-bold">Daygo</span>
          </Link>
        </div>
      </div>
    </header>
  );
} 