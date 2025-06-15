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
  useReadContract,
  useWatchContractEvent,
  getContractEvents,
  usePublicClient,
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
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
import { formatEther } from "viem";
import {
  getSourceDetails,
  getActiveSources,
  getInvestorSources,
  getInvestorRewards,
  getStakeAmount,
  addSource,
  challengeSource,
  claimRewards,
  distributeRewards,
  approveTokens,
  getSourceRewards,
} from "@/lib/sources";
import SourcesABI from "@/lib/abi/SourcesABI.json";
import TruthTokenABI from "@/lib/abi/TruthTokenABI.json";

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

// Helper functions for contract interactions
const useContractRead = (config: any) => {
  const { data, isError, isLoading } = useReadContract(config);
  return { data, isError, isLoading };
};

interface IPFSContent {
  id?: string;
  name: string;
  content: string;
  reporter: string;
  timestamp: string;
}

interface NewsArticle {
  contentHash: string;
  reporter: string;
  timestamp: string;
  isVerified: boolean;
  title: string;
  content: string;
}

interface SubscriptionDetails {
  isSubscribed: boolean;
  expiryDate: string;
  subscriptionType: string;
}

export default function PolkaNewsDashboard() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("home");
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [isOwner, setIsOwner] = useState(true);
  const [isRegisteredReporter, setIsRegisteredReporter] = useState(true);
  const [truthTokenBalance, setTruthTokenBalance] = useState(1250.75);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [isLoadingClaim, setIsLoadingClaim] = useState(false);
  const [isLoadingAddSource, setIsLoadingAddSource] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] =
    useState<SubscriptionDetails | null>(null);
  const [subscriptionFee, setSubscriptionFee] = useState<bigint | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);

  // Contract write hook
  const { writeContract, isPending: isContractPending } = useWriteContract();
  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: pendingHash,
  });

  // Contract read hooks
  const { data: subscriptionFeeData } = useReadContract({
    address: process.env
      .NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS as `0x${string}`,
    abi: SubscriptionManagerABI,
    functionName: "subscriptionFee",
  });

  const { data: stakeAmountData } = useReadContract({
    address: process.env.NEXT_PUBLIC_SOURCES_ADDRESS as `0x${string}`,
    abi: SourcesABI,
    functionName: "STAKE_AMOUNT",
  });

  const { data: tokenBalanceData } = useReadContract({
    address: process.env.NEXT_PUBLIC_TRUTH_TOKEN_ADDRESS as `0x${string}`,
    abi: TruthTokenABI,
    functionName: "balanceOf",
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  const provider = usePublicClient();

  // Add this hook at the component level
  const { data: newsData } = useReadContract({
    address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
    abi: PolkaNewsABI,
    functionName: "getNewsArticles",
    args: [0, 10], // Get first 10 articles
    query: {
      enabled: !!address,
    },
  });

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

            return {
              ...article,
              title: ipfsContent.name,
              content: ipfsContent.content,
            };
          } catch (error) {
            console.error("Error processing article:", error);
            return null;
          }
        })
      );

      const filteredArticles = articles.filter(
        (article): article is NewsArticle => article !== null
      );
      setNewsArticles(filteredArticles);
    } catch (error) {
      console.error("Error processing news data:", error);
    }
  };

  // Add this hook at the component level
  const { data: isReporterData } = useReadContract({
    address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
    abi: PolkaNewsABI,
    functionName: "isReporter",
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  // Update handleSubmitNews
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
      const hash = await writeContract({
        address: process.env.NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
        abi: PolkaNewsABI,
        functionName: "submitNews",
        args: [ipfsHash],
      });

      if (hash) {
        setPendingHash(hash);
        setNewsTitle("");
        setNewsContent("");
      }
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

  // Helper functions
  const checkTokenBalance = async (address: string, amount: bigint) => {
    const { data: balance } = await useContractRead({
      address: process.env.NEXT_PUBLIC_TRUTH_TOKEN_ADDRESS as `0x${string}`,
      abi: TruthTokenABI,
      functionName: "balanceOf",
      args: [address],
    });
    return (balance as bigint) >= amount;
  };

  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [investorSources, setInvestorSources] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [sourceDetails, setSourceDetails] = useState<any>(null);
  const [pendingRewards, setPendingRewards] = useState<bigint>(0n);

  // Add these hooks at the top level of the component
  const { data: activeSourcesData } = useReadContract({
    ...sourcesConfig,
    functionName: "getActiveSources",
    query: {
      enabled: activeTab === "investor" && !!address,
    },
  });

  const { data: investorSourcesData } = useReadContract({
    ...sourcesConfig,
    functionName: "getInvestorSources",
    args: [address],
    query: {
      enabled: activeTab === "investor" && !!address,
    },
  });

  const { data: rewardsData } = useReadContract({
    ...sourcesConfig,
    functionName: "getInvestorRewards",
    args: [address],
    query: {
      enabled: activeTab === "investor" && !!address,
    },
  });

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
  const { data: sourceDetailsData } = useReadContract({
    ...sourcesConfig,
    functionName: "getSourceDetails",
    args: [selectedSource],
    query: {
      enabled: !!selectedSource,
    },
  });

  useEffect(() => {
    if (sourceDetailsData) {
      setSourceDetails(sourceDetailsData);
    }
  }, [sourceDetailsData]);

  // Add this hook at the component level
  const { data: sourceRewardsData } = useReadContract({
    ...sourcesConfig,
    functionName: "getSourceTotalRewards",
    args: [selectedSource],
    query: {
      enabled: !!selectedSource,
    },
  });

  // Update handleAddSource
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
      setNewSourceUrl("");
      toast({
        title: "Success",
        description: "Source added successfully",
        variant: "default",
      });
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

  // Add effect to handle successful transaction
  useEffect(() => {
    if (isSuccess && pendingHash) {
      setNewSourceUrl("");
      toast({
        title: "Success",
        description: "Source added successfully",
        variant: "default",
      });
      setPendingHash(undefined);
      setIsLoading(false);
    }
  }, [isSuccess, pendingHash]);

  const handleClaimRewards = async () => {
    try {
      setIsLoadingClaim(true);
      await claimRewards();
      toast({
        title: "Success",
        description: "Rewards claimed successfully",
        variant: "default",
      });
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
      toast({
        title: "Success",
        description: "Source challenged successfully",
        variant: "default",
      });
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

  // Add state for source rewards
  const [sourceRewards, setSourceRewards] = useState<Record<string, bigint>>(
    {}
  );

  // Add effect to fetch rewards for all sources
  useEffect(() => {
    const fetchSourceRewards = async () => {
      if (!activeSources.length) return;

      const rewards: Record<string, bigint> = {};
      for (const source of activeSources) {
        try {
          const reward = (await sourceRewardsData)
            ? (sourceRewardsData as bigint)
            : await getInvestorRewards(source);
          rewards[source] = reward;
        } catch (error) {
          console.error(`Error fetching rewards for source ${source}:`, error);
        }
      }
      setSourceRewards(rewards);
    };

    fetchSourceRewards();
  }, [activeSources, sourceRewardsData]);

  // Add state for source details
  const [sourcesDetails, setSourcesDetails] = useState<Record<string, any>>({});

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

  // Update useEffect to handle token balance
  useEffect(() => {
    if (tokenBalanceData !== undefined) {
      setTokenBalance(tokenBalanceData as bigint);
    }
  }, [tokenBalanceData]);

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
                    {newsArticles.map((article, index) => (
                      <div
                        key={index}
                        className="border-b pb-4 mb-4 last:border-b-0 last:mb-0"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">
                              {article.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {article.content}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono">
                                {article.reporter.slice(0, 6)}...
                                {article.reporter.slice(-4)}
                              </span>
                              <span>•</span>
                              <span>{formatTimestamp(article.timestamp)}</span>
                            </div>
                          </div>
                          <Badge
                            variant={
                              article.isVerified ? "default" : "secondary"
                            }
                            className="shrink-0"
                          >
                            {article.isVerified ? "Verified" : "Pending"}
                          </Badge>
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
                              ? `${sourcesDetails[name].investor.slice(0, 6)}...${sourcesDetails[name].investor.slice(-4)}`
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
