"use client";

import { useState, useEffect } from "react";
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
  Wallet,
  Coins,
  FileText,
  Shield,
  Users,
  Home,
  CreditCard,
  Calendar,
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
import Link from "next/link";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useContractRead,
  useReadContract,
  useWatchContractEvent,
  getContractEvents,
} from "wagmi";
import { metaMask } from "wagmi/connectors";
import { WalletConnect } from "@/components/WalletConnect";
import { Header } from "@/components/Header";
import PolkaNewsABI from "@/lib/abi/PolkaNewsABI.json";
import SubscriptionManagerABI from "../lib/abi/SubscriptionManagerABI.json";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  getSubscriptionDetails,
  getSubscriptionFee,
  purchaseSubscription,
  approveToken,
  getAllowance,
  getTokenBalance,
  type SubscriptionDetails,
} from "@/lib/subscription";
import { ConnectButton } from "@/components/ui/connect-button";
import { ipfsService } from "@/lib/ipfs";
import { submitNews } from "@/lib/contracts";
import { config } from "@/lib/wagmi-config";

const sidebarItems = [
  { title: "Home", icon: Home, id: "home" },
  { title: "Submit News", icon: FileText, id: "submit" },
  { title: "Register as Reporter", icon: Users, id: "admin" },
  { title: "Subscription", icon: CreditCard, id: "subscription" },
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
  const { address } = useAccount();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("home");
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [isOwner, setIsOwner] = useState(true);
  const [isRegisteredReporter, setIsRegisteredReporter] = useState(true);
  const [truthTokenBalance, setTruthTokenBalance] = useState(1250.75);

  const [reporterAddress, setReporterAddress] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [newsTitle, setNewsTitle] = useState("");

  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] =
    useState<SubscriptionDetails | null>(null);
  const [subscriptionFee, setSubscriptionFee] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);

  const { writeContract, isPending: isRegistering } = useWriteContract();
  const { readContract } = useReadContract();

  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [newsHashes, setNewsHashes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Get news count
  const { data: newsCount, isLoading: isLoadingCount } = useReadContract({
    address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
    abi: PolkaNewsABI,
    functionName: "getNewsCount",
  });

  // Get paginated news articles
  const {
    data: newsData,
    isLoading: isLoadingNews,
    error: newsError,
  } = useReadContract({
    address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
    abi: PolkaNewsABI,
    functionName: "getNewsArticles",
    args: [(page - 1) * ITEMS_PER_PAGE, ITEMS_PER_PAGE],
  });

  // Watch for new news submissions
  useWatchContractEvent({
    address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
    abi: PolkaNewsABI,
    eventName: "NewsSubmitted",
    onLogs: (logs) => {
      // Refresh the current page when new news is submitted
      if (page === 1) {
        // Trigger a refetch of the current page
        setPage((prev) => prev);
      }
    },
  });

  // Process news data when it changes
  useEffect(() => {
    const processNewsData = async () => {
      if (!newsData) return;

      try {
        const articles = await Promise.all(
          newsData.map(async (article: any) => {
            try {
              const ipfsContent = await ipfsService.getContent(
                article.contentHash
              );
              return {
                contentHash: article.contentHash,
                reporter: article.reporter,
                verified: article.isVerified,
                timestamp: new Date(
                  Number(article.timestamp) * 1000
                ).toLocaleString(),
                title: ipfsContent.name,
                content: ipfsContent.content,
              };
            } catch (error) {
              console.error(
                `Error fetching IPFS content for ${article.contentHash}:`,
                error
              );
              return null;
            }
          })
        );

        setNewsArticles(articles.filter((article) => article !== null));
      } catch (error) {
        console.error("Error processing news data:", error);
        toast({
          title: "Error",
          description: "Failed to process news articles",
          variant: "destructive",
        });
      }
    };

    processNewsData();
  }, [newsData]);

  // Load subscription details and token balance
  useEffect(() => {
    if (address) {
      const loadDetails = async () => {
        try {
          setIsLoading(true);
          const [details, fee, balance] = await Promise.all([
            getSubscriptionDetails(address),
            getSubscriptionFee(),
            getTokenBalance(address),
          ]);
          setSubscriptionDetails(details);
          setSubscriptionFee(fee);
          setTokenBalance(balance);
        } catch (error) {
          console.error("Error loading details:", error);
        } finally {
          setIsLoading(false);
        }
      };
      loadDetails();
    }
  }, [address]);

  const handleRegisterReporter = async () => {
    if (!address) {
      toast({
        title: "Wallet Not Connected",
        description:
          "Please connect your wallet first to register as a reporter.",
        variant: "destructive",
      });
      return;
    }
    try {
      console.log("Attempting to register reporter with address:", address);
      await writeContract({
        address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
        abi: PolkaNewsABI,
        functionName: "registerReporter",
      });
      toast({
        title: "Registration Successful",
        description:
          "You have been registered as a reporter. You can now submit news articles.",
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to register reporter:", error);
      toast({
        title: "Registration Failed",
        description: "Failed to register as reporter. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitNews = async () => {
    if (!address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first to submit news.",
        variant: "destructive",
      });
      return;
    }

    if (!newsTitle || !newsContent) {
      toast({
        title: "Missing Information",
        description:
          "Please provide both title and content for your news article.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log("Uploading news content to IPFS...");

      // Upload content to IPFS
      const ipfsHash = await ipfsService.uploadContent({
        name: newsTitle,
        content: newsContent,
        reporter: address,
        timestamp: new Date().toISOString(),
      });

      console.log("Content uploaded to IPFS:", ipfsHash);

      // Submit news to blockchain using shared contract function
      await submitNews(ipfsHash);

      toast({
        title: "News Submitted",
        description:
          "Your news article has been submitted and is pending verification.",
        variant: "default",
      });

      // Reset form
      setNewsTitle("");
      setNewsContent("");
    } catch (error) {
      console.error("Failed to submit news:", error);
      let errorMessage = "Failed to submit news article. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes("IPFS")) {
          errorMessage = "Failed to upload content to IPFS. Please try again.";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected. Please try again.";
        }
      }

      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    connect({ connector: connectors[0] });
  };

  const handlePurchaseSubscription = async () => {
    if (!address) {
      toast({
        title: "Wallet Not Connected",
        description:
          "Please connect your wallet first to purchase a subscription.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log("Attempting to purchase subscription");

      // Check if we need to approve tokens
      if (subscriptionFee) {
        const allowance = await getAllowance(address);
        if (allowance < subscriptionFee) {
          console.log("Approving tokens...");
          await approveToken(subscriptionFee);
          toast({
            title: "Token Approval Successful",
            description:
              "Please confirm the subscription purchase transaction.",
            variant: "default",
          });
        }
      }

      // Purchase subscription
      await purchaseSubscription();
      toast({
        title: "Subscription Successful",
        description:
          "Your subscription has been activated. You can now view news articles.",
        variant: "default",
      });
      // Reload subscription details
      const details = await getSubscriptionDetails(address);
      setSubscriptionDetails(details);
    } catch (error) {
      console.error("Failed to purchase subscription:", error);
      toast({
        title: "Subscription Failed",
        description: "Failed to purchase subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add shared function for subscription check
  const checkSubscriptionStatus = (details: SubscriptionDetails | null) => {
    if (!details) return false;
    return details.isActive && Number(details.endTime) * 1000 > Date.now();
  };

  const renderContent = () => {
    // Move declarations outside switch
    const isSubscribed = checkSubscriptionStatus(subscriptionDetails);
    const endTime = subscriptionDetails?.endTime
      ? new Date(Number(subscriptionDetails.endTime) * 1000).toLocaleString()
      : "N/A";
    const hasEnoughTokens =
      tokenBalance && subscriptionFee ? tokenBalance >= subscriptionFee : false;

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
                  <div className="text-2xl font-bold">
                    {newsArticles.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total articles
                  </p>
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
                  <div className="text-2xl font-bold">
                    {newsArticles.length > 0
                      ? `${Math.round(
                          (newsArticles.filter((n) => n.verified).length /
                            newsArticles.length) *
                            100
                        )}%`
                      : "0%"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Verified articles
                  </p>
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
                {isLoadingNews ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : newsError ? (
                  <div className="text-center text-destructive">
                    Failed to load news articles. Please try again.
                  </div>
                ) : (
                  <>
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
                        {newsArticles.map((news, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              <div
                                className={`${!isSubscribed ? "blur-sm" : ""}`}
                              >
                                {news.title}
                              </div>
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
                                  variant="secondary"
                                  className="bg-yellow-100 text-yellow-800"
                                >
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {news.timestamp}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex justify-between items-center mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setPage((prev) => prev + 1)}
                        disabled={newsArticles.length < ITEMS_PER_PAGE}
                      >
                        Next
                      </Button>
                    </div>
                  </>
                )}
                {!isSubscribed && (
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    Subscribe to view full article content
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "submit":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit News Article</CardTitle>
                <CardDescription>
                  Submit your news article for verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter news title"
                    value={newsTitle}
                    onChange={(e) => setNewsTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <textarea
                    id="content"
                    className="w-full min-h-[200px] p-2 border rounded-md"
                    placeholder="Enter news content"
                    value={newsContent}
                    onChange={(e) => setNewsContent(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleSubmitNews}
                  className="w-full"
                  disabled={isLoading || !address}
                >
                  {isLoading ? "Submitting..." : "Submit News"}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "admin":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Register as Reporter</CardTitle>
                <CardDescription>
                  Register yourself as a reporter to submit news articles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Click the button below to register your connected wallet
                    address as a reporter. You will be able to submit news
                    articles after registration.
                  </p>
                </div>
                <Button
                  onClick={handleRegisterReporter}
                  className="w-full"
                  disabled={isRegistering || !address}
                >
                  {isRegistering ? "Registering..." : "Register as Reporter"}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "subscription":
        if (!subscriptionDetails) {
          return (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Status</CardTitle>
                <CardDescription>Manage your news subscription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={isSubscribed ? "default" : "secondary"}>
                          {isSubscribed ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Expires:</span>
                        <span className="text-sm text-muted-foreground">
                          {endTime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Subscription Fee:
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {subscriptionFee
                            ? `${Number(subscriptionFee) / 1e18} TRUTH`
                            : "Loading..."}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Your TRUTH Balance:
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {tokenBalance
                            ? `${Number(tokenBalance) / 1e18} TRUTH`
                            : "Loading..."}
                        </span>
                      </div>
                    </div>
                    {!isSubscribed && (
                      <>
                        {!hasEnoughTokens && (
                          <div className="text-sm text-destructive">
                            You need more TRUTH tokens to purchase a
                            subscription. Please acquire TRUTH tokens first.
                          </div>
                        )}
                        <Button
                          onClick={handlePurchaseSubscription}
                          className="w-full"
                          disabled={isLoading || !address || !hasEnoughTokens}
                        >
                          {isLoading
                            ? "Processing..."
                            : "Purchase Subscription"}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1">
          <header className="border-b">
            <div className="container mx-auto px-4 py-4">
              <nav className="flex items-center justify-between">
                <div className="flex items-center space-x-8">
                  <Link href="/" className="text-xl font-bold">
                    PolkaNews
                  </Link>
                  <div className="flex items-center space-x-4">
                    <Button
                      variant={activeTab === "home" ? "default" : "ghost"}
                      onClick={() => setActiveTab("home")}
                    >
                      Home
                    </Button>
                    <Button
                      variant={
                        activeTab === "subscription" ? "default" : "ghost"
                      }
                      onClick={() => setActiveTab("subscription")}
                    >
                      Subscription
                    </Button>
                    <Button
                      variant={activeTab === "reporter" ? "default" : "ghost"}
                      onClick={() => setActiveTab("reporter")}
                    >
                      Reporter
                    </Button>
                    <Link href="/faucet">
                      <Button variant="outline">Get Test Tokens</Button>
                    </Link>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <ConnectButton />
                </div>
              </nav>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-6">{renderContent()}</main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
