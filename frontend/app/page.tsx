"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  XCircle,
  FileText,
  Shield,
  Users,
  Home,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Header } from "@/components/Header";
import { submitNews } from "@/lib/contracts";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { ipfsService } from "@/lib/ipfs";
import { type IPFSContent } from "@/lib/types";
import { ethers } from "ethers";
import { useNewsVerification } from "@/lib/hooks/useNewsVerification";

// Mock data
const mockNewsData = [
  {
    id: 1,
    contentHash: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    reporter: "0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4",
    verified: true,
    timestamp: "2024-01-15 14:30:22",
    title: "Breaking: New Blockchain Protocol Announced",
  },
  {
    id: 2,
    contentHash: "0x9876543210fedcba0987654321fedcba09876543",
    reporter: "0x8ba1f109551bD432803012645Hac136c0532925a",
    verified: false,
    timestamp: "2024-01-15 12:15:45",
    title: "Market Analysis: Crypto Trends Q1 2024",
  },
  {
    id: 3,
    contentHash: "0xabcdef1234567890abcdef1234567890abcdef12",
    reporter: "0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4",
    verified: true,
    timestamp: "2024-01-14 16:45:10",
    title: "DeFi Protocol Security Audit Results",
  },
];

const sidebarItems = [
  { title: "Home", icon: Home, id: "home" },
  { title: "Submit News", icon: FileText, id: "submit" },
  { title: "Admin Panel", icon: Users, id: "admin" },
];

function AppSidebar({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">PolkaNews</span>
            <span className="truncate text-xs text-muted-foreground">
              Decentralized Verification
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.id)}
                    isActive={activeTab === item.id}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-4 text-xs text-muted-foreground">
          <p>Connected to Polkadot Network</p>
          <p className="mt-1">Block: #2,847,392</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function PolkaNewsDashboard() {
  const [activeTab, setActiveTab] = useState("home");
  const [isOwner, setIsOwner] = useState(true);
  const [isRegisteredReporter, setIsRegisteredReporter] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { address } = useAccount();

  // Add the news verification hook and get startListening
  const { startListening } = useNewsVerification();

  const [reporterAddress, setReporterAddress] = useState("");
  const [newsContentHash, setNewsContentHash] = useState("");
  const [newsTitle, setNewsTitle] = useState("");
  const [newsContent, setNewsContent] = useState("");

  const handleRegisterReporter = () => {
    console.log("Registering reporter:", reporterAddress);
    setReporterAddress("");
  };

  const handleSubmitNews = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!newsTitle || !newsContent) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare content for IPFS
      const content: Omit<IPFSContent, "id"> = {
        name: newsTitle,
        description: newsContent,
        tags: ["news", "blockchain"],
        postedBy: address,
        timestamp: new Date().toISOString(),
      };

      // Upload to IPFS
      toast.info("Uploading content to IPFS...");
      const ipfsHash = await ipfsService.uploadContent(content);
      console.log("Content uploaded to IPFS:", ipfsHash);

      // Calculate content hash for blockchain
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes(ipfsHash));
      console.log("Content hash for blockchain:", contentHash);

      // Submit to blockchain
      toast.info("Submitting to blockchain...");
      const tx = await submitNews(contentHash);
      toast.success("News submitted successfully! Waiting for verification...");
      console.log("Transaction:", tx);

      // Start listening for verification
      startListening();

      // Reset form
      setNewsContentHash("");
      setNewsTitle("");
      setNewsContent("");
    } catch (error) {
      console.error("Error submitting news:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit news. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    News Submitted
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">23</div>
                  <p className="text-xs text-muted-foreground">+3 this week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Verification Rate
                  </CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">87.5%</div>
                  <p className="text-xs text-muted-foreground">Above average</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent News Submissions</CardTitle>
                <CardDescription>
                  Latest news articles submitted for verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Content Hash</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockNewsData.map((news) => (
                      <TableRow key={news.id}>
                        <TableCell className="font-medium">
                          {news.title}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {news.contentHash.slice(0, 10)}...
                          {news.contentHash.slice(-8)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {news.reporter.slice(0, 6)}...
                          {news.reporter.slice(-4)}
                        </TableCell>
                        <TableCell>
                          {news.verified ? (
                            <Badge
                              variant="default"
                              className="bg-green-100 text-green-800"
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge
                              variant="default"
                              className="bg-yellow-100 text-yellow-800"
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {news.timestamp}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case "submit":
        return (
          <div className="space-y-6">
            {isRegisteredReporter ? (
              <Card>
                <CardHeader>
                  <CardTitle>Submit News Article</CardTitle>
                  <CardDescription>
                    Submit a news article for community verification
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="news-title">Article Title</Label>
                    <Input
                      id="news-title"
                      placeholder="Enter article title"
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="news-content">Article Content</Label>
                    <textarea
                      id="news-content"
                      className="w-full min-h-[200px] p-2 border rounded-md"
                      placeholder="Enter article content"
                      value={newsContent}
                      onChange={(e) => setNewsContent(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleSubmitNews}
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit News Article"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Reporter Registration Required</CardTitle>
                  <CardDescription>
                    You must be a registered reporter to submit news articles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Please contact the admin to register as a reporter or wait
                    for your registration to be approved.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "admin":
        return (
          <div className="space-y-6">
            {isOwner ? (
              <Card>
                <CardHeader>
                  <CardTitle>Register New Reporter</CardTitle>
                  <CardDescription>
                    Add a new reporter to the platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reporter-address">
                      Reporter Wallet Address
                    </Label>
                    <Input
                      id="reporter-address"
                      placeholder="0x..."
                      value={reporterAddress}
                      onChange={(e) => setReporterAddress(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleRegisterReporter} className="w-full">
                    Register Reporter
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Access Denied</CardTitle>
                  <CardDescription>
                    Only the contract owner can access admin functions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    You do not have permission to access the admin panel.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-full w-full">
        <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 flex flex-col w-full">
          <Header />
          <main className="flex-1 p-6 overflow-auto w-full">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
