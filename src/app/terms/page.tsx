import { AppSidebar } from "@/components/AppSidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function TermsPage() {
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
                <BreadcrumbPage>Terms of Service</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Terms of Service</h1>
            <p className="text-muted-foreground mt-2">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                By accessing or using DayGo ("the Service"), you agree to be bound by these Terms of Service ("Terms"). 
                If you disagree with any part of these terms, then you may not access the Service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Description of Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                DayGo is a digital journaling platform that helps you create structured journal templates, 
                track your daily progress, and build consistent habits through intentional reflection and planning.
              </p>
              <p>
                Our service includes features such as:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Custom journal templates</li>
                <li>Daily journaling and reflection tools</li>
                <li>Progress tracking and analytics</li>
                <li>AI-powered insights and suggestions</li>
                <li>Community templates and sharing</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                To use certain features of the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Provide accurate and complete information during registration</li>
                <li>Maintain the security of your password and account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                You retain ownership of all content you create and submit to the Service, including journal entries, 
                templates, and other personal data. By using our Service, you grant us a limited license to use, 
                store, and process your content solely for the purpose of providing and improving the Service.
              </p>
              <p>
                You are responsible for your content and agree not to post content that:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Violates any laws or regulations</li>
                <li>Infringes on intellectual property rights</li>
                <li>Contains harmful, threatening, or offensive material</li>
                <li>Attempts to compromise the security of the Service</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy and Data Protection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Your privacy is important to us. Our use of your personal information is governed by our{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                , which forms part of these Terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prohibited Uses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Transmit any harmful or malicious code</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use the Service for any commercial purposes without permission</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Create multiple accounts to circumvent restrictions</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                While we strive to maintain high availability, we do not guarantee that the Service will be 
                uninterrupted or error-free. We may suspend or terminate the Service at any time for maintenance, 
                updates, or other operational reasons.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                To the fullest extent permitted by law, DayGo shall not be liable for any indirect, incidental, 
                special, or consequential damages arising from your use of the Service. Our total liability 
                shall not exceed the amount paid by you for the Service in the twelve months preceding the claim.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Termination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                You may terminate your account at any time by contacting us. We may terminate or suspend your 
                account if you violate these Terms. Upon termination, your right to use the Service will cease 
                immediately, and we may delete your account and data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We reserve the right to modify these Terms at any time. We will notify you of any material 
                changes by posting the new Terms on this page and updating the "Last updated" date. 
                Your continued use of the Service after such changes constitutes acceptance of the new Terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                If you have any questions about these Terms of Service, please contact us at{" "}
                <Link href="mailto:legal@daygo.app" className="text-primary hover:underline">
                  legal@daygo.app
                </Link>
              </p>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </>
  );
} 