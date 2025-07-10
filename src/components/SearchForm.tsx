"use client"

import { Search } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar"

export function SearchForm() {
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      // Navigate to journal page with search query
      router.push(`/journal?search=${encodeURIComponent(searchTerm.trim())}`)
      // Clear the search input after submitting
      setSearchTerm("")
    } else {
      // Navigate to journal page without search
      router.push("/journal")
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <SidebarGroup className="py-0">
        <SidebarGroupContent className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search journal entries..." 
            className="pl-8 h-9" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  )
} 