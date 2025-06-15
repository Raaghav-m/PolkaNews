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
  Coins,
  FileText,
  Shield,
  Users,
  Home,
  CreditCard,
  Lock,
  ChevronRight,
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
} from "@/components/ui/sidebar";
import Link from "next/link";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import PolkaNewsABI from "@/lib/abi/PolkaNewsABI.json";
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
  isSubscribed,
} from "@/lib/subscription";
import { ConnectButton } from "@/components/ui/connect-button";
import { ipfsService } from "@/lib/ipfs";
import { formatEther } from "viem";
import {
  getSourceDetails,
  getInvestorRewards,
  getStakeAmount,
  addSource,
  challengeSource,
  claimRewards,
  approveTokens,
  getSourceRewards,
} from "@/lib/sources";
import SourcesABI from "@/lib/abi/SourcesABI.json";
import TruthTokenABI from "@/lib/abi/TruthTokenABI.json";
import { useNewsArticles, useIsReporter } from "@/lib/contracts";
import {
  useActiveSources,
  useInvestorSources,
  useInvestorRewards,
  useSourceDetails,
  useSourceRewards,
  useStakeAmount,
} from "@/lib/sources";
import {
  useSubscriptionDetails,
  useSubscriptionFee,
  useTokenBalance,
  useTokenAllowance,
} from "@/lib/subscription";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const sidebarItems = [
  { title: "Home", icon: Home, id: "home" },
  { title: "Submit News", icon: FileText, id: "submit" },
  { title: "Register as Reporter", icon: Users, id: "admin" },
  { title: "Subscription", icon: CreditCard, id: "subscription" },
  { title: "Investor", icon: Coins, id: "investor" },
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

// Add Sources contract config
export const sourcesConfig = {
  address: process.env.NEXT_PUBLIC_SOURCES_ADDRESS as `0x${string}`,
  abi: SourcesABI,
} as const;

interface NewsArticle {
  requestId: number;
  contentHash: string;
  reporter: string;
  timestamp: string;
  isVerified: boolean;
  title: string;
  content: string;
}

interface SubscriptionDetails {
  data?: [bigint, bigint, boolean];
  startTime?: bigint;
  endTime?: bigint;
  isActive?: boolean;
}

export default function PolkaNewsDashboard() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("home");
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [isLoadingClaim, setIsLoadingClaim] = useState(false);
  const [isLoadingAddSource, setIsLoadingAddSource] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] =
    useState<SubscriptionDetails | null>(null);
  const [subscriptionFee, setSubscriptionFee] = useState<bigint | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [investorSources, setInvestorSources] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [sourceDetails, setSourceDetails] = useState<any>(null);
  const [pendingRewards, setPendingRewards] = useState<bigint>(0n);
  const [sourceRewards, setSourceRewards] = useState<Record<string, bigint>>(
    {}
  );
  const [sourcesDetails, setSourcesDetails] = useState<Record<string, any>>({});

  // Contract write hook
  const { writeContract, isPending: isContractPending } = useWriteContract();
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: pendingHash,
  });

  // Use the new hooks
  const { data: newsData } = useNewsArticles();
  const { data: isReporterData } = useIsReporter(address);
  const { data: activeSourcesData } = useActiveSources();
  const { data: investorSourcesData } = useInvestorSources(address);
  const { data: rewardsData } = useInvestorRewards(address);
  const { data: sourceDetailsData } = useSourceDetails(selectedSource);
  const { data: sourceRewardsData } = useSourceRewards(selectedSource);
  const { data: subscriptionDetailsData } = useSubscriptionDetails(address);
  const { data: subscriptionFeeData } = useSubscriptionFee();
  const { data: tokenBalanceData } = useTokenBalance(address);

  const provider = usePublicClient();
  const router = useRouter();

  // Update useEffect to use the hook data
  useEffect(() => {
    const loadNews = async () => {
      if (!address) return;

      try {
        setIsLoadingNews(true);
        setNewsError(null);

        if (newsData) {
          await processNewsData(newsData as NewsArticle[]);
        }
      } catch (error) {
        console.error("Error loading news:", error);
        setNewsError("Failed to load news articles");
        toast({
          title: "Error",
          description: "Failed to load news articles",
          variant: "destructive",
        });
      } finally {
        setIsLoadingNews(false);
      }
    };

    loadNews();
  }, [address, newsData]);

  // Process news data
  const processNewsData = async (newsData: NewsArticle[]) => {
    try {
      const articles = await Promise.all(
        newsData.map(async (article) => {
          try {
            const ipfsContent = await ipfsService.getContent(
              article.contentHash
            );
            if (!ipfsContent) return null;

            // Check verification status using requestId
            let isVerified = false;
            try {
              const result = await provider?.readContract({
                address: process.env
                  .NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
                abi: PolkaNewsABI,
                functionName: "isNewsVerified",
                args: [Number(article.requestId)],
              });
              isVerified = result as boolean;
            } catch (error) {
              console.error("Error checking verification:", error);
            }
            console.log(isVerified);
            return {
              requestId: Number(article.requestId),
              contentHash: article.contentHash,
              reporter: article.reporter,
              timestamp: article.timestamp,
              isVerified,
              title: ipfsContent.name,
              content: ipfsContent.content,
            };
          } catch (error) {
            console.error("Error processing article:", error);
            return null;
          }
        })
      );
      console.log(articles);
      const filteredArticles = articles.filter(
        (article): article is NewsArticle => article !== null
      );
      setNewsArticles(filteredArticles);
    } catch (error) {
      console.error("Error processing news data:", error);
    }
  };

  // Update useEffect to handle token balance
  useEffect(() => {
    if (tokenBalanceData !== undefined) {
      setTokenBalance(tokenBalanceData as bigint);
    }
  }, [tokenBalanceData]);

  // Update useEffect to handle subscription details
  useEffect(() => {
    if (subscriptionDetailsData) {
      setSubscriptionDetails(subscriptionDetailsData as SubscriptionDetails);
    }
  }, [subscriptionDetailsData]);

  // Update useEffect to handle subscription fee
  useEffect(() => {
    if (subscriptionFeeData) {
      setSubscriptionFee(subscriptionFeeData as bigint);
    }
  }, [subscriptionFeeData]);

  // Add effect to handle successful transaction
  useEffect(() => {
    if (isSuccess && pendingHash) {
      // Reload subscription details
      if (address) {
        getSubscriptionDetails(address).then(setSubscriptionDetails);
      }
      toast({
        title: "Success",
        description: "Transaction confirmed successfully",
        variant: "default",
      });
      setPendingHash(undefined);
      setIsLoading(false);
    }
  }, [isSuccess, pendingHash, address]);

  const handleSubmitNews = async () => {
    if (!address || !newsTitle || !newsContent) {
      toast({
        title: "Error",
        description: "Please connect your wallet and fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Check if user is registered reporter
      if (!isReporterData) {
        toast({
          title: "Error",
          description: "You must be a registered reporter to submit news",
          variant: "destructive",
        });
        return;
      }

      // Upload to IPFS
      const ipfsHash = await ipfsService.uploadContent({
        name: newsTitle,
        content: newsContent,
        reporter: address,
        timestamp: new Date().toISOString(),
      });

      // Submit news
      await writeContract({
        address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
        abi: PolkaNewsABI,
        functionName: "submitNews",
        args: [ipfsHash],
      });
    } catch (error: any) {
      console.error("Error submitting news:", error);
      let errorMessage = "Failed to submit news";

      if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas";
      } else if (error.message.includes("user rejected")) {
        errorMessage = "Transaction was rejected";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
        }
      }
      // Purchase subscription
      await purchaseSubscription();
    } catch (error) {
      console.error("Failed to purchase subscription:", error);
      toast({
        title: "Error",
        description: "Failed to purchase subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add shared function for subscription check
  const checkSubscriptionStatus = async (address: string | undefined) => {
    if (!address) return false;
    try {
      const isSubscribedResult = await isSubscribed(address);
      console.log("Subscription status check:", {
        address,
        isSubscribed: isSubscribedResult,
      });
      return isSubscribedResult;
    } catch (error) {
      console.error("Error checking subscription status:", error);
      return false;
    }
  };

  // Add state for subscription status
  const [isSubscribedState, setIsSubscribedState] = useState(false);

  // Update useEffect to check subscription status
  useEffect(() => {
    if (address) {
      checkSubscriptionStatus(address).then(setIsSubscribedState);
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

  const handleConnect = () => {
    connect({ connector: connectors[0] });
  };

  // Update the useEffect to use the hook data
  useEffect(() => {
    if (activeTab === "investor" && address) {
      if (activeSourcesData) {
        setActiveSources(activeSourcesData as string[]);
      }
      if (investorSourcesData) {
        setInvestorSources(investorSourcesData as string[]);
      }
      if (rewardsData) {
        setPendingRewards(rewardsData as bigint);
      }
    }
  }, [activeTab, address, activeSourcesData, investorSourcesData, rewardsData]);

  // Update source details fetching
  useEffect(() => {
    if (sourceDetailsData) {
      setSourceDetails(sourceDetailsData);
    }
  }, [sourceDetailsData]);

  const handleAddSource = async () => {
    if (!address || !isConnected) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!newSourceUrl) {
      toast({
        title: "Error",
        description: "Please enter a source URL",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoadingAddSource(true);
      const stakeAmount = await getStakeAmount();

      // Check balance
      const balance = await getTokenBalance(address);
      if (balance < stakeAmount) {
        toast({
          title: "Error",
          description: "Insufficient TRUTH tokens for staking",
          variant: "destructive",
        });
        return;
      }

      // Check and handle allowance
      const allowance = await getAllowance(address);
      if (allowance < stakeAmount) {
        try {
          await approveTokens(stakeAmount);
        } catch (error) {
          console.error("Error approving tokens:", error);
          toast({
            title: "Error",
            description: "Failed to approve tokens",
            variant: "destructive",
          });
          return;
        }
      }

      // Add source with stake amount
      await addSource(newSourceUrl, stakeAmount);
    } catch (error: any) {
      console.error("Error adding source:", error);
      let errorMessage = "Failed to add source";

      if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas";
      } else if (error.message.includes("user rejected")) {
        errorMessage = "Transaction was rejected";
      } else if (error.message.includes("already exists")) {
        errorMessage = "Source URL already exists";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingAddSource(false);
    }
  };

  const handleClaimRewards = async () => {
    try {
      setIsLoadingClaim(true);
      await claimRewards();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to claim rewards",
        variant: "destructive",
      });
    } finally {
      setIsLoadingClaim(false);
    }
  };

  const handleChallengeSource = async (sourceName: string) => {
    try {
      setIsLoading(true);
      await challengeSource(sourceName);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to challenge source",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add this helper function for formatting timestamps
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  // Add effect to fetch rewards for all sources
  useEffect(() => {
    const fetchSourceRewards = async () => {
      if (!activeSources.length) return;

      const rewards: Record<string, bigint> = {};
      for (const source of activeSources) {
        try {
          const reward = await getSourceRewards(source);
          rewards[source] = reward;
        } catch (error) {
          console.error(`Error fetching rewards for source ${source}:`, error);
        }
      }
      setSourceRewards(rewards);
    };

    fetchSourceRewards();
  }, [activeSources]);

  // Add effect to fetch details and rewards for all sources
  useEffect(() => {
    const fetchSourceDetails = async () => {
      if (!activeSources.length || !provider) return;

      const details: Record<string, any> = {};
      const rewards: Record<string, bigint> = {};

      for (const source of activeSources) {
        try {
          // Fetch source details
          const sourceDetail = await getSourceDetails(source);
          details[source] = sourceDetail;

          // Fetch source rewards
          const reward = await getSourceRewards(source);
          rewards[source] = reward;
        } catch (error) {
          console.error(`Error fetching data for source ${source}:`, error);
        }
      }
      setSourcesDetails(details);
      setSourceRewards(rewards);
    };

    fetchSourceDetails();
  }, [activeSources]);

  const handleNewsClick = (article: NewsArticle) => {
    router.push(`/news/${article.contentHash}`);
  };

  const renderContent = () => {
    // Move declarations outside switch
    const endTime = subscriptionDetails?.data?.[1]
      ? new Date(Number(subscriptionDetails.data[1]) * 1000).toLocaleString()
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
                          (newsArticles.filter((n) => n.isVerified).length /
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
                <CardTitle>Latest News</CardTitle>
                {!isSubscribedState && (
                  <CardDescription className="text-destructive">
                    Subscribe to unlock full access to news articles
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {isLoadingNews ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : newsError ? (
                  <div className="text-red-500 text-center py-4">
                    {newsError}
                  </div>
                ) : newsArticles.length > 0 ? (
                  <div className="space-y-4">
                    {!isSubscribedState && (
                      <div className="flex items-center justify-center p-4 mb-4 bg-muted rounded-lg">
                        <div className="text-center">
                          <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium">
                            Subscribe to read full articles
                          </p>
                          <Button
                            variant="default"
                            size="sm"
                            className="mt-2"
                            onClick={() => setActiveTab("subscription")}
                          >
                            Subscribe Now
                          </Button>
                        </div>
                      </div>
                    )}
                    {newsArticles.map((article, index) => (
                      <div
                        key={index}
                        className={cn(
                          "border-b pb-4 mb-4 last:border-b-0 last:mb-0 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg p-4",
                          !isSubscribedState && "relative"
                        )}
                        onClick={() => handleNewsClick(article)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3
                              className={cn(
                                "text-lg font-semibold mb-2",
                                !isSubscribedState && "blur-sm"
                              )}
                            >
                              {article.title}
                            </h3>
                            <div
                              className={cn(
                                "text-sm text-muted-foreground mb-2 line-clamp-2",
                                !isSubscribedState && "blur-sm"
                              )}
                            >
                              {article.content}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono">
                                {article.reporter.slice(0, 6)}...
                                {article.reporter.slice(-4)}
                              </span>
                              <span>•</span>
                              <span>{formatTimestamp(article.timestamp)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                article.isVerified ? "default" : "secondary"
                              }
                              className={cn(
                                "shrink-0",
                                !isSubscribedState && "blur-sm"
                              )}
                            >
                              {article.isVerified ? "Verified" : "Pending"}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4">No news articles found</p>
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
                {!address ? (
                  <div className="text-sm text-muted-foreground">
                    Please connect your wallet to register as a reporter.
                  </div>
                ) : isReporterData ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>You are already registered as a reporter.</span>
                  </div>
                ) : (
                  <>
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
                      disabled={isContractPending || !address}
                    >
                      {isContractPending
                        ? "Registering..."
                        : "Register as Reporter"}
                    </Button>
                  </>
                )}
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

        // Log subscription details when tab is active
        console.log("Subscription Tab - Full Details:", {
          rawData: subscriptionDetails,
          parsedData: subscriptionDetails.data
            ? {
                startTime: new Date(
                  Number(subscriptionDetails.data[0]) * 1000
                ).toLocaleString(),
                endTime: new Date(
                  Number(subscriptionDetails.data[1]) * 1000
                ).toLocaleString(),
                isActive: subscriptionDetails.data[2],
                currentTime: new Date().toLocaleString(),
                timeRemaining:
                  Math.floor(
                    (Number(subscriptionDetails.data[1]) * 1000 - Date.now()) /
                      (1000 * 60 * 60)
                  ) + " hours",
              }
            : null,
          isSubscribed: isSubscribedState,
        });

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
                        <Badge
                          variant={isSubscribedState ? "default" : "secondary"}
                        >
                          {isSubscribedState ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {subscriptionDetails.data && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Start Date:
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(
                                Number(subscriptionDetails.data[0]) * 1000
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              End Date:
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(
                                Number(subscriptionDetails.data[1]) * 1000
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Time Remaining:
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {Math.floor(
                                (Number(subscriptionDetails.data[1]) * 1000 -
                                  Date.now()) /
                                  (1000 * 60 * 60)
                              )}{" "}
                              hours
                            </span>
                          </div>
                        </>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Subscription Fee:
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {subscriptionFee
                            ? `${formatEther(subscriptionFee)} TRUTH`
                            : "Loading..."}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Your TRUTH Balance:
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {tokenBalance !== null
                            ? `${formatEther(tokenBalance)} TRUTH`
                            : "Loading..."}
                        </span>
                      </div>
                    </div>
                    {!isSubscribedState && (
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

      case "investor":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Investor Dashboard</CardTitle>
                <CardDescription>
                  Manage your news sources and rewards
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">
                      Your Sources: {investorSources.length}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Pending Rewards: {formatEther(pendingRewards)} TRUTH
                    </p>
                  </div>
                  <Button
                    onClick={handleClaimRewards}
                    disabled={isLoadingClaim}
                  >
                    {isLoadingClaim ? "Claiming..." : "Claim Rewards"}
                  </Button>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Add New Source</h3>
                  <div className="flex gap-4">
                    <Input
                      value={newSourceUrl}
                      onChange={(e) => setNewSourceUrl(e.target.value)}
                      placeholder="Enter source URL"
                    />
                    <Button
                      onClick={handleAddSource}
                      disabled={
                        isLoadingAddSource || isContractPending || isConfirming
                      }
                    >
                      {isLoadingAddSource || isContractPending || isConfirming
                        ? "Adding..."
                        : "Add Source"}
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source Name</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Total Rewards</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeSources.map((name) => (
                        <TableRow key={name}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {sourcesDetails[name]?.investor
                              ? `${sourcesDetails[name].investor.slice(
                                  0,
                                  6
                                )}...${sourcesDetails[name].investor.slice(-4)}`
                              : "Loading..."}
                          </TableCell>
                          <TableCell>
                            {sourceRewards[name] !== undefined
                              ? `${formatEther(sourceRewards[name])} TRUTH`
                              : "Loading..."}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="default"
                              className="bg-green-100 text-green-800"
                            >
                              Active
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              onClick={() => handleChallengeSource(name)}
                            >
                              Challenge
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {selectedSource && sourceDetails && (
              <Card>
                <CardHeader>
                  <CardTitle>Source Details</CardTitle>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedSource(null)}
                    className="absolute right-4 top-4"
                  >
                    ×
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <Label>Name</Label>
                      <p>{sourceDetails.name}</p>
                    </div>
                    <div>
                      <Label>Investor</Label>
                      <p className="font-mono text-sm">
                        {sourceDetails.investor}
                      </p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Badge
                        variant={
                          sourceDetails.isActive ? "default" : "secondary"
                        }
                      >
                        {sourceDetails.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div>
                      <Label>Stake Amount</Label>
                      <p>{formatEther(sourceDetails.stakeAmount)} TRUTH</p>
                    </div>
                    <div>
                      <Label>Total Rewards</Label>
                      <p>{formatEther(sourceDetails.totalRewards)} TRUTH</p>
                    </div>
                  </div>
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
                      variant={activeTab === "investor" ? "default" : "ghost"}
                      onClick={() => setActiveTab("investor")}
                    >
                      Investor
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
