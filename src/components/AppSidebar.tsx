"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Sidebar, 
  SidebarContent,
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail
} from "@/components/ui/sidebar"
import { File, FileText, LogOut, Plus, ShieldCheck, User, Book, Users, Bot, BarChart3, Clock, Crown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getAuth, User as FirebaseUser } from "firebase/auth"
import { useEffect, useState } from "react"
import { signOut } from "@/lib/authUtils"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { SearchForm } from "./SearchForm"

export function AppSidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const router = useRouter()

  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser)
    })
    return () => unsubscribe()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success("You have been signed out")
      router.replace("/login")
    } catch (error) {
      console.error("Error signing out:", error)
      toast.error("Failed to sign out")
    }
  }

  const getInitials = (displayName: string | null) => {
    if (!displayName) return "U"
    return displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex h-14 items-center px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Book className="h-6 w-6" />
            <span className="text-lg font-semibold">Daygo</span>
          </Link>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SearchForm />
        
        <SidebarMenu>
          <h3 className="px-4 py-2 text-sm font-medium">Main Menu</h3>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/home"}>
              <Link href="/home">
                <FileText className="mr-2 h-4 w-4" />
                <span>Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith("/journal")}>
              <Link href="/journal">
                <File className="mr-2 h-4 w-4" />
                <span>Journal</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith("/dayscore")}>
              <Link href="/dayscore">
                <BarChart3 className="mr-2 h-4 w-4" />
                <span>DayScore</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith("/countdown")}>
              <Link href="/countdown">
                <Clock className="mr-2 h-4 w-4" />
                <span>Countdowns</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith("/templates")}>
              <Link href="/templates">
                <FileText className="mr-2 h-4 w-4" />
                <span>Templates</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith("/ai-chat")}>
              <Link href="/ai-chat">
                <Bot className="mr-2 h-4 w-4" />
                <span>Talk to Daygo AI</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith("/community")}>
              <Link href="/community">
                <Users className="mr-2 h-4 w-4" />
                <span>Community</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        <SidebarMenu className="mt-6">
          <h3 className="px-4 py-2 text-sm font-medium">Actions</h3>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/journal/select-template">
                <Plus className="mr-2 h-4 w-4" />
                <span>New Journal Entry</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/templates/new">
                <Plus className="mr-2 h-4 w-4" />
                <span>New Template</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/countdown/new">
                <Plus className="mr-2 h-4 w-4" />
                <span>New Countdown</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        <SidebarMenu className="mt-6">
          <h3 className="px-4 py-2 text-sm font-medium">Account</h3>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/upgrade" className="text-primary font-medium">
                <Crown className="mr-2 h-4 w-4" />
                <span>Upgrade to Pro</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/account">
                <User className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/privacy">
                <ShieldCheck className="mr-2 h-4 w-4" />
                <span>Privacy</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter>
        {user && (
          <div className="flex items-center gap-2 px-4 py-3 border-t">
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
            
            <SidebarMenuItem className="ml-auto">
              <SidebarMenuButton onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Log out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </div>
        )}
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
} 