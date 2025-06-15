"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Sparkles,
  TrendingUp,
  Activity,
  Star,
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
  {
    title: "Home",
    icon: Home,
    id: "home",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    title: "Submit News",
    icon: FileText,
    id: "submit",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    title: "Register as Reporter",
    icon: Users,
    id: "admin",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    title: "Subscription",
    icon: CreditCard,
    id: "subscription",
    gradient: "from-orange-500 to-red-500",
  },
  {
    title: "Investor",
    icon: Coins,
    id: "investor",
    gradient: "from-yellow-500 to-amber-500",
  },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const cardHoverVariants = {
  hover: {
    y: -8,
    scale: 1.02,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

function AnimatedCard({ children, className, delay = 0, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      whileHover="hover"
      variants={cardHoverVariants}
    >
      <Card
        className={cn(
          "backdrop-blur-xl bg-white/90 border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 relative overflow-hidden group",
          className
        )}
        {...props}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">{children}</div>
      </Card>
    </motion.div>
  );
}

function GradientButton({
  children,
  className,
  variant = "default",
  ...props
}) {
  const gradients = {
    default:
      "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
    success:
      "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700",
    destructive:
      "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700",
    outline:
      "border-2 border-gradient bg-transparent hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Button
        className={cn(
          "relative overflow-hidden transition-all duration-300 shadow-lg hover:shadow-xl",
          variant !== "outline" && gradients[variant],
          className
        )}
        {...props}
      >
        <span className="relative z-10">{children}</span>
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      </Button>
    </motion.div>
  );
}

function AppSidebar({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  return (
    <Sidebar className="border-r border-white/10 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <SidebarHeader>
        <motion.div
          className="flex items-center gap-3 px-4 py-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg"
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.6 }}
          >
            <Shield className="h-5 w-5 text-white" />
          </motion.div>
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate font-bold text-xl bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              PolkaNews
            </span>
            <span className="truncate text-sm text-gray-400">
              Decentralized Verification
            </span>
          </div>
        </motion.div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 font-semibold">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveTab(item.id)}
                      isActive={activeTab === item.id}
                      className={cn(
                        "group relative overflow-hidden transition-all duration-300 hover:bg-white/10",
                        activeTab === item.id &&
                          "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-r-2 border-blue-400"
                      )}
                    >
                      <motion.div
                        className="flex items-center gap-3 relative z-10"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div
                          className={cn(
                            "p-2 rounded-lg transition-all duration-300",
                            activeTab === item.id
                              ? `bg-gradient-to-br ${item.gradient} shadow-lg`
                              : "bg-white/10 group-hover:bg-white/20"
                          )}
                        >
                          <item.icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-white font-medium">
                          {item.title}
                        </span>
                      </motion.div>
                      {activeTab === item.id && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"
                          layoutId="activeTab"
                          transition={{ duration: 0.3 }}
                        />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </motion.div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <motion.div
          className="p-4 text-xs text-gray-400 bg-white/5 rounded-lg mx-4 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <p className="font-medium">Connected to Polkadot</p>
          </div>
          <p className="text-gray-500">Block: #2,847,392</p>
        </motion.div>
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
  timestamp: number;
  isProofVerified: boolean;
  binaryDecision: boolean;
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
            let isProofVerified = false;
            let binaryDecision = false;
            try {
              const [proofResult, decisionResult] = await Promise.all([
                provider?.readContract({
                  address: process.env
                    .NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
                  abi: PolkaNewsABI,
                  functionName: "isProofVerified",
                  args: [Number(article.requestId)],
                }),
                provider?.readContract({
                  address: process.env
                    .NEXT_PUBLIC_POLKANEWS_ADDRESS as `0x${string}`,
                  abi: PolkaNewsABI,
                  functionName: "binaryDecision",
                  args: [Number(article.requestId)],
                }),
              ]);
              isProofVerified = proofResult as boolean;
              binaryDecision = decisionResult as boolean;
            } catch (error) {
              console.error("Error checking verification:", error);
            }
            console.log(isProofVerified, binaryDecision);
            return {
              requestId: Number(article.requestId),
              contentHash: article.contentHash,
              reporter: article.reporter,
              timestamp: article.timestamp,
              isProofVerified,
              binaryDecision,
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
          <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Hero Section */}
            <motion.div
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8 text-white"
              variants={itemVariants}
            >
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
                    <Sparkles className="h-8 w-8" />
                    Welcome to PolkaNews
                  </h1>
                  <p className="text-xl opacity-90 mb-6">
                    Decentralized news verification powered by blockchain
                    technology
                  </p>
                  <div className="flex gap-4">
                    <GradientButton
                      onClick={() => setActiveTab("submit")}
                      className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                    >
                      Submit News
                    </GradientButton>
                    <GradientButton
                      onClick={() => setActiveTab("subscription")}
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      Subscribe Now
                    </GradientButton>
                  </div>
                </motion.div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            </motion.div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <AnimatedCard delay={0.1}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    News Submitted
                  </CardTitle>
                  <motion.div
                    className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <FileText className="h-4 w-4 text-white" />
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <motion.div
                    className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    {newsArticles.length}
                  </motion.div>
                  <p className="text-xs text-gray-500 mt-1">Total articles</p>
                </CardContent>
              </AnimatedCard>

              <AnimatedCard delay={0.2}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Verification Rate
                  </CardTitle>
                  <motion.div
                    className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg"
                    variants={pulseVariants}
                    animate="pulse"
                  >
                    <Shield className="h-4 w-4 text-white" />
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <motion.div
                    className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    {newsArticles.length > 0
                      ? `${Math.round(
                          (newsArticles.filter((n) => n.isProofVerified)
                            .length /
                            newsArticles.length) *
                            100
                        )}%`
                      : "0%"}
                  </motion.div>
                  <p className="text-xs text-gray-500 mt-1">
                    Verified articles
                  </p>
                </CardContent>
              </AnimatedCard>

              <AnimatedCard delay={0.3}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Active Sources
                  </CardTitle>
                  <motion.div
                    className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Activity className="h-4 w-4 text-white" />
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <motion.div
                    className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    {activeSources.length}
                  </motion.div>
                  <p className="text-xs text-gray-500 mt-1">Trusted sources</p>
                </CardContent>
              </AnimatedCard>

              <AnimatedCard delay={0.4}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Rewards Pool
                  </CardTitle>
                  <motion.div
                    className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg"
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Coins className="h-4 w-4 text-white" />
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <motion.div
                    className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    {formatEther(pendingRewards).slice(0, 6)}
                  </motion.div>
                  <p className="text-xs text-gray-500 mt-1">TRUTH tokens</p>
                </CardContent>
              </AnimatedCard>
            </div>

            {/* Latest News Section */}
            <AnimatedCard delay={0.5}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold flex items-center gap-3">
                      <TrendingUp className="h-6 w-6 text-blue-500" />
                      Latest News
                    </CardTitle>
                    {!isSubscribedState && (
                      <CardDescription className="text-red-500 font-medium mt-2">
                        🔒 Subscribe to unlock full access to news articles
                      </CardDescription>
                    )}
                  </div>
                  {isSubscribedState && (
                    <motion.div
                      className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Star className="h-4 w-4" />
                      Premium Access
                    </motion.div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingNews ? (
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  </div>
                ) : newsError ? (
                  <motion.div
                    className="text-red-500 text-center py-8 bg-red-50 rounded-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {newsError}
                  </motion.div>
                ) : newsArticles.length > 0 ? (
                  <div className="space-y-6">
                    {!isSubscribedState && (
                      <motion.div
                        className="flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-200"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="text-center">
                          <motion.div
                            className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
                            whileHover={{ scale: 1.1, rotate: 360 }}
                            transition={{ duration: 0.6 }}
                          >
                            <Lock className="h-8 w-8 text-white" />
                          </motion.div>
                          <h3 className="text-xl font-bold text-gray-800 mb-2">
                            Premium Content Awaits
                          </h3>
                          <p className="text-gray-600 mb-4">
                            Subscribe to read full articles and access exclusive
                            content
                          </p>
                          <GradientButton
                            onClick={() => setActiveTab("subscription")}
                            className="px-6 py-3"
                          >
                            Subscribe Now
                          </GradientButton>
                        </div>
                      </motion.div>
                    )}
                    <AnimatePresence>
                      {newsArticles.map((article, index) => (
                        <motion.div
                          key={article.contentHash}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          whileHover={{ y: isSubscribedState ? -4 : 0 }}
                          className={cn(
                            "cursor-pointer",
                            !isSubscribedState && "cursor-not-allowed"
                          )}
                          onClick={() =>
                            isSubscribedState && handleNewsClick(article)
                          }
                        >
                          <Card
                            className={cn(
                              "overflow-hidden hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-br from-white to-gray-50",
                              !isSubscribedState && "hover:shadow-none"
                            )}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-500" />
                            <CardHeader className="relative z-10">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <CardTitle className="text-xl font-bold mb-3 text-gray-800 hover:text-blue-600 transition-colors duration-300">
                                    {article.title}
                                  </CardTitle>
                                  <CardDescription className="text-sm text-gray-500 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                                    {new Date(
                                      Number(article.timestamp) * 1000
                                    ).toLocaleString()}
                                  </CardDescription>
                                </div>
                                <div className="flex items-center gap-3">
                                  <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <Badge
                                      variant={
                                        article.isProofVerified
                                          ? "default"
                                          : "secondary"
                                      }
                                      className={cn(
                                        "font-medium",
                                        article.isProofVerified
                                          ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                                          : "bg-gray-200 text-gray-700"
                                      )}
                                    >
                                      {article.isProofVerified
                                        ? "Proof Verified"
                                        : "Proof Pending"}
                                    </Badge>
                                  </motion.div>
                                  <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <Badge
                                      variant={
                                        article.binaryDecision
                                          ? "default"
                                          : "destructive"
                                      }
                                      className={cn(
                                        "font-medium",
                                        article.binaryDecision
                                          ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
                                          : "bg-gradient-to-r from-red-500 to-pink-600 text-white"
                                      )}
                                    >
                                      {article.binaryDecision
                                        ? "Verified"
                                        : "Unverified"}
                                    </Badge>
                                  </motion.div>
                                  {isSubscribedState ? (
                                    <motion.div
                                      whileHover={{ x: 4 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <ChevronRight className="h-5 w-5 text-gray-400" />
                                    </motion.div>
                                  ) : (
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <Lock className="h-5 w-5 text-gray-400" />
                                    </motion.div>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="relative z-10">
                              <div
                                className={cn(
                                  "text-gray-700 line-clamp-3 leading-relaxed",
                                  !isSubscribedState && "blur-sm select-none"
                                )}
                              >
                                {article.content}
                              </div>
                              {!isSubscribedState && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent to-white/50">
                                  <Badge
                                    variant="outline"
                                    className="bg-white/80 backdrop-blur-sm"
                                  >
                                    Subscribe to read more
                                  </Badge>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <motion.div
                    className="text-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No news articles found</p>
                  </motion.div>
                )}
              </CardContent>
            </AnimatedCard>
          </motion.div>
        );

      case "submit":
        return (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <AnimatedCard>
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  Submit News Article
                </CardTitle>
                <CardDescription className="text-lg">
                  Submit your news article for verification on the blockchain
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Label
                    htmlFor="title"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Article Title
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter a compelling news title..."
                    value={newsTitle}
                    onChange={(e) => setNewsTitle(e.target.value)}
                    className="h-12 text-lg border-2 focus:border-blue-500 transition-colors duration-300"
                  />
                </motion.div>
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Label
                    htmlFor="content"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Article Content
                  </Label>
                  <motion.textarea
                    id="content"
                    className="w-full min-h-[300px] p-4 border-2 rounded-lg focus:border-blue-500 transition-colors duration-300 resize-none text-base leading-relaxed"
                    placeholder="Write your news article content here..."
                    value={newsContent}
                    onChange={(e) => setNewsContent(e.target.value)}
                    whileFocus={{ scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <GradientButton
                    onClick={handleSubmitNews}
                    className="w-full h-14 text-lg font-semibold"
                    disabled={isLoading || !address}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                        Submitting to Blockchain...
                      </div>
                    ) : (
                      "Submit News Article"
                    )}
                  </GradientButton>
                </motion.div>
              </CardContent>
            </AnimatedCard>
          </motion.div>
        );

      case "admin":
        return (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <AnimatedCard>
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  Register as Reporter
                </CardTitle>
                <CardDescription className="text-lg">
                  Join our network of trusted news reporters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!address ? (
                  <motion.div
                    className="text-center py-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 text-lg">
                      Please connect your wallet to register as a reporter
                    </p>
                  </motion.div>
                ) : isReporterData ? (
                  <motion.div
                    className="flex items-center gap-4 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <CheckCircle className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-semibold text-green-800">
                        Registration Complete!
                      </h3>
                      <p className="text-green-600">
                        You are already registered as a reporter and can submit
                        news articles.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    className="space-y-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Reporter Benefits
                      </h3>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Submit news articles for verification
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Earn rewards for verified content
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Build your reputation on-chain
                        </li>
                      </ul>
                    </div>
                    <GradientButton
                      onClick={handleRegisterReporter}
                      className="w-full h-14 text-lg font-semibold"
                      disabled={isContractPending || !address}
                    >
                      {isContractPending ? (
                        <div className="flex items-center gap-3">
                          <motion.div
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                          Registering...
                        </div>
                      ) : (
                        "Register as Reporter"
                      )}
                    </GradientButton>
                  </motion.div>
                )}
              </CardContent>
            </AnimatedCard>
          </motion.div>
        );

      case "subscription":
        if (!subscriptionDetails) {
          return (
            <div className="flex items-center justify-center py-12">
              <motion.div
                className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
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
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <AnimatedCard>
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  Subscription Management
                </CardTitle>
                <CardDescription className="text-lg">
                  Manage your premium news subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <motion.div
                      className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  </div>
                ) : (
                  <motion.div
                    className="space-y-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    {/* Status Card */}
                    <div
                      className={cn(
                        "p-6 rounded-2xl border-2 transition-all duration-500",
                        isSubscribedState
                          ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
                          : "bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200"
                      )}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Subscription Status
                        </h3>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Badge
                            variant={
                              isSubscribedState ? "default" : "secondary"
                            }
                            className={cn(
                              "px-3 py-1 text-sm font-medium",
                              isSubscribedState
                                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                                : "bg-gray-200 text-gray-700"
                            )}
                          >
                            {isSubscribedState ? "✓ Active" : "○ Inactive"}
                          </Badge>
                        </motion.div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {subscriptionDetails.data && (
                          <>
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-gray-600">
                                Start Date
                              </span>
                              <p className="text-gray-800 font-mono text-sm">
                                {new Date(
                                  Number(subscriptionDetails.data[0]) * 1000
                                ).toLocaleString()}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-gray-600">
                                End Date
                              </span>
                              <p className="text-gray-800 font-mono text-sm">
                                {new Date(
                                  Number(subscriptionDetails.data[1]) * 1000
                                ).toLocaleString()}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-gray-600">
                                Time Remaining
                              </span>
                              <p className="text-gray-800 font-semibold">
                                {Math.floor(
                                  (Number(subscriptionDetails.data[1]) * 1000 -
                                    Date.now()) /
                                    (1000 * 60 * 60)
                                )}{" "}
                                hours
                              </p>
                            </div>
                          </>
                        )}
                        <div className="space-y-1">
                          <span className="text-sm font-medium text-gray-600">
                            Subscription Fee
                          </span>
                          <p className="text-gray-800 font-semibold">
                            {subscriptionFee
                              ? `${formatEther(subscriptionFee)} TRUTH`
                              : "Loading..."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Balance Card */}
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">
                            Your TRUTH Balance
                          </h3>
                          <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                            {tokenBalance !== null
                              ? `${formatEther(tokenBalance)} TRUTH`
                              : "Loading..."}
                          </p>
                        </div>
                        <motion.div
                          className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center"
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <Coins className="h-8 w-8 text-white" />
                        </motion.div>
                      </div>
                    </div>

                    {!isSubscribedState && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      >
                        {!hasEnoughTokens && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                            <p className="text-red-700 font-medium">
                              ⚠️ Insufficient TRUTH tokens. You need more tokens
                              to purchase a subscription.
                            </p>
                          </div>
                        )}
                        <GradientButton
                          onClick={handlePurchaseSubscription}
                          className="w-full h-14 text-lg font-semibold"
                          disabled={isLoading || !address || !hasEnoughTokens}
                        >
                          {isLoading ? (
                            <div className="flex items-center gap-3">
                              <motion.div
                                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                              />
                              Processing Payment...
                            </div>
                          ) : (
                            "Purchase Premium Subscription"
                          )}
                        </GradientButton>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </AnimatedCard>
          </motion.div>
        );

      case "investor":
        return (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <AnimatedCard>
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg">
                    <Coins className="h-6 w-6 text-white" />
                  </div>
                  Investor Dashboard
                </CardTitle>
                <CardDescription className="text-lg">
                  Manage your news sources and track rewards
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats Overview */}
                <div className="grid gap-4 md:grid-cols-3">
                  <motion.div
                    className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Your Sources
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {investorSources.length}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Pending Rewards
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatEther(pendingRewards).slice(0, 6)}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Active Sources
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          {activeSources.length}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Claim Rewards Button */}
                <motion.div
                  className="flex justify-end"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <GradientButton
                    onClick={handleClaimRewards}
                    disabled={isLoadingClaim}
                    className="px-6 py-3"
                    variant="success"
                  >
                    {isLoadingClaim ? (
                      <div className="flex items-center gap-2">
                        <motion.div
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                        Claiming...
                      </div>
                    ) : (
                      "Claim All Rewards"
                    )}
                  </GradientButton>
                </motion.div>

                {/* Add New Source */}
                <motion.div
                  className="p-6 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-200"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">+</span>
                    </div>
                    Add New Source
                  </h3>
                  <div className="flex gap-4">
                    <Input
                      value={newSourceUrl}
                      onChange={(e) => setNewSourceUrl(e.target.value)}
                      placeholder="Enter source Name (e.g., The Hindu)"
                      className="flex-1 h-12 border-2 focus:border-blue-500 transition-colors duration-300"
                    />
                    <GradientButton
                      onClick={handleAddSource}
                      disabled={
                        isLoadingAddSource || isContractPending || isConfirming
                      }
                      className="px-6 h-12"
                    >
                      {isLoadingAddSource ||
                      isContractPending ||
                      isConfirming ? (
                        <div className="flex items-center gap-2">
                          <motion.div
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                          Adding...
                        </div>
                      ) : (
                        "Add Source"
                      )}
                    </GradientButton>
                  </div>
                </motion.div>

                {/* Sources Table */}
                <motion.div
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className="p-6 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Active Sources
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="font-semibold">
                            Source Name
                          </TableHead>
                          <TableHead className="font-semibold">Owner</TableHead>
                          <TableHead className="font-semibold">
                            Total Rewards
                          </TableHead>
                          <TableHead className="font-semibold">
                            Status
                          </TableHead>
                          <TableHead className="font-semibold">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {activeSources.map((name, index) => (
                            <motion.tr
                              key={name}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                              className="hover:bg-gray-50/50 transition-colors duration-200"
                            >
                              <TableCell className="font-medium text-gray-800">
                                {name}
                              </TableCell>
                              <TableCell className="font-mono text-sm text-gray-600">
                                {sourcesDetails[name]?.investor
                                  ? `${sourcesDetails[name].investor.slice(
                                      0,
                                      6
                                    )}...${sourcesDetails[name].investor.slice(-4)}`
                                  : "Loading..."}
                              </TableCell>
                              <TableCell className="font-semibold text-green-600">
                                {sourceRewards[name] !== undefined
                                  ? `${formatEther(sourceRewards[name])} TRUTH`
                                  : "Loading..."}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="default"
                                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium"
                                >
                                  Active
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleChallengeSource(name)}
                                    className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
                                  >
                                    Challenge
                                  </Button>
                                </motion.div>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                </motion.div>
              </CardContent>
            </AnimatedCard>

            {/* Source Details Modal */}
            <AnimatePresence>
              {selectedSource && sourceDetails && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                  onClick={() => setSelectedSource(null)}
                >
                  <motion.div
                    className="bg-white rounded-2xl p-6 max-w-md w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-800">
                        Source Details
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSource(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">
                          Name
                        </Label>
                        <p className="text-gray-800 font-medium">
                          {sourceDetails.name}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">
                          Investor
                        </Label>
                        <p className="font-mono text-sm text-gray-600 break-all">
                          {sourceDetails.investor}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">
                          Status
                        </Label>
                        <div className="mt-1">
                          <Badge
                            variant={
                              sourceDetails.isActive ? "default" : "secondary"
                            }
                            className={
                              sourceDetails.isActive
                                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                                : "bg-gray-200 text-gray-700"
                            }
                          >
                            {sourceDetails.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">
                          Stake Amount
                        </Label>
                        <p className="text-gray-800 font-semibold">
                          {formatEther(sourceDetails.stakeAmount)} TRUTH
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">
                          Total Rewards
                        </Label>
                        <p className="text-green-600 font-semibold">
                          {formatEther(sourceDetails.totalRewards)} TRUTH
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1">
          <motion.header
            className="border-b border-white/20 backdrop-blur-xl bg-white/80"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="container mx-auto px-6 py-4">
              <nav className="flex items-center justify-between">
                <div className="flex items-center space-x-8">
                  <Link
                    href="/"
                    className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                  >
                    PolkaNews
                  </Link>
                  <div className="flex items-center space-x-2">
                    {sidebarItems.slice(0, 3).map((item) => (
                      <motion.div
                        key={item.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant={activeTab === item.id ? "default" : "ghost"}
                          onClick={() => setActiveTab(item.id)}
                          className={cn(
                            "transition-all duration-300",
                            activeTab === item.id
                              ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
                              : "hover:bg-white/50"
                          )}
                        >
                          {item.title}
                        </Button>
                      </motion.div>
                    ))}
                    <Link href="/faucet">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          className="border-2 hover:bg-blue-50 transition-colors duration-300"
                        >
                          Get Test Tokens
                        </Button>
                      </motion.div>
                    </Link>
                  </div>
                </div>
                <motion.div
                  className="flex items-center space-x-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <ConnectButton />
                </motion.div>
              </nav>
            </div>
          </motion.header>
          <main className="flex-1 p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
