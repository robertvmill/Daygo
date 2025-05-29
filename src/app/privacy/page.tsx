import { AppSidebar } from "@/components/AppSidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <header className="flex sticky top-0 z-10 h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Privacy Policy</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground mt-2">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                At DayGo, we collect information you provide directly to us, such as when you create an account, 
                write journal entries, or contact us for support.
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Account information (name, email address)</li>
                <li>Journal entries and personal reflections</li>
                <li>Usage data and analytics</li>
                <li>Device and browser information</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Provide, maintain, and improve our journaling services</li>
                <li>Process your journal entries and provide insights</li>
                <li>Send you important updates about your account</li>
                <li>Respond to your support requests</li>
                <li>Analyze usage patterns to improve our service</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We take the security of your personal information seriously. Your journal entries are encrypted 
                and stored securely using industry-standard practices. We implement appropriate technical and 
                organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Sharing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, 
                except as described in this policy. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>With service providers who assist us in operating our platform</li>
                <li>When required by law or to protect our rights</li>
                <li>In connection with a business transfer or acquisition</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Access and update your personal information</li>
                <li>Delete your account and associated data</li>
                <li>Export your journal entries</li>
                <li>Opt out of certain communications</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                If you have any questions about this Privacy Policy, please contact us at{" "}
                <Link href="mailto:privacy@daygo.app" className="text-primary hover:underline">
                  privacy@daygo.app
                </Link>
              </p>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </>
  );
} 