"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getTokenBalance } from "@/lib/subscription";
import { truthTokenConfig } from "@/lib/subscription";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins,
  Droplets,
  FileText,
  Shield,
  CheckCircle2,
  ArrowRight,
  Wallet,
  Star,
  Zap,
  Gift,
  Users,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Enhanced animated card component
const AnimatedCard = ({ children, className, delay = 0, ...props }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{
      duration: 0.5,
      delay,
      type: "spring",
      stiffness: 100,
      damping: 15,
    }}
    whileHover={{
      y: -2,
      transition: { duration: 0.2 },
    }}
    className={className}
    {...props}
  >
    <Card className="relative overflow-hidden border-0 bg-white/80 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50" />
      <div className="relative z-10">{children}</div>
    </Card>
  </motion.div>
);

// Gradient button component
const GradientButton = ({
  children,
  variant = "default",
  className,
  disabled,
  ...props
}: any) => (
  <motion.div
    whileHover={{ scale: disabled ? 1 : 1.02 }}
    whileTap={{ scale: disabled ? 1 : 0.98 }}
    transition={{ type: "spring", stiffness: 400, damping: 17 }}
  >
    <Button
      disabled={disabled}
      className={cn(
        "relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300",
        variant === "default" &&
          "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 text-white disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "outline" &&
          "bg-white/80 backdrop-blur-sm border border-gray-200/50 hover:bg-white/90 text-gray-700",
        variant === "success" &&
          "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {!disabled && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      )}
    </Button>
  </motion.div>
);

// Floating particles background
const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(20)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20"
        initial={{
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
        }}
        animate={{
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
        }}
        transition={{
          duration: Math.random() * 10 + 10,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear",
        }}
      />
    ))}
  </div>
);

// Token balance display component
const TokenBalanceDisplay = ({ balance }: { balance: bigint | null }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", stiffness: 200, damping: 15 }}
    className="relative"
  >
    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl p-6 border border-blue-200/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
          >
            <Coins className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <p className="text-sm font-medium text-gray-600">Your Balance</p>
            <motion.p
              key={balance?.toString()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              {balance ? `${Number(balance) / 1e18}` : "0"} TRUTH
            </motion.p>
          </div>
        </div>
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-right"
        >
          <div className="text-xs text-gray-500">Token Value</div>
          <div className="text-sm font-semibold text-green-600">Active</div>
        </motion.div>
      </div>
    </div>
  </motion.div>
);

// Feature card component
const FeatureCard = ({ icon: Icon, title, description, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: "spring", stiffness: 200, damping: 15 }}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    className="relative group"
  >
    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 hover:border-blue-300/50 transition-all duration-300 hover:shadow-lg">
      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:shadow-lg transition-shadow duration-300"
      >
        <Icon className="w-6 h-6 text-white" />
      </motion.div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

// Success animation component
const SuccessAnimation = ({ isVisible }: { isVisible: boolean }) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full shadow-2xl"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-8 h-8 text-white" />
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-bold text-gray-900 mb-2"
          >
            Tokens Received!
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600"
          >
            Your TRUTH tokens have been successfully added to your wallet.
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function FaucetPage() {
  const { address } = useAccount();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Read if user has used faucet
  const { data: hasUsedFaucet } = useReadContract({
    ...truthTokenConfig,
    functionName: "hasUsedFaucet",
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  // Read faucet amount
  const { data: faucetAmount } = useReadContract({
    ...truthTokenConfig,
    functionName: "FAUCET_AMOUNT",
  });

  // Write contract for using faucet
  const { writeContract, isPending } = useWriteContract();

  // Fetch token balance
  useEffect(() => {
    async function fetchBalance() {
      if (!address) return;
      try {
        const balance = await getTokenBalance(address);
        setTokenBalance(balance);
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    }
    fetchBalance();
  }, [address]);

  const handleUseFaucet = async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!faucetAmount) {
      toast({
        title: "Error",
        description: "Failed to get faucet amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const hash = await writeContract({
        ...truthTokenConfig,
        functionName: "faucet",
        args: [faucetAmount],
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      toast({
        title: "Success",
        description: `You've received ${Number(faucetAmount) / 1e18} TRUTH tokens!`,
      });
      // Refresh balance
      const balance = await getTokenBalance(address);
      setTokenBalance(balance);
    } catch (error) {
      console.error("Error using faucet:", error);
      toast({
        title: "Error",
        description: "Failed to get test tokens. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative">
      <FloatingParticles />

      {/* Success Animation */}
      <AnimatePresence>
        <SuccessAnimation isVisible={showSuccess} />
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 pt-8 pb-4"
      >
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-4"
          >
            <Gift className="w-4 h-4" />
            Free TRUTH Tokens
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
          >
            Get Your{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TRUTH Tokens
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Earn tokens by contributing to our decentralized news verification
            platform
          </motion.p>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Token Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <TokenBalanceDisplay balance={tokenBalance} />
          </motion.div>

          {/* Main Faucet Card */}
          <AnimatedCard delay={0.4}>
            <CardHeader className="text-center pb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Droplets className="w-8 h-8 text-white" />
              </motion.div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                TRUTH Token Faucet
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Get free tokens to start your journey in decentralized news
                verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Faucet Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200/30"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      One-Time Bonus
                    </h3>
                    <p className="text-sm text-gray-600">
                      Get {faucetAmount ? Number(faucetAmount) / 1e18 : 100}{" "}
                      TRUTH tokens instantly
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>No fees required</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Instant delivery</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>One per wallet</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Ready to use</span>
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                {!hasUsedFaucet ? (
                  <GradientButton
                    className="flex-1 h-12"
                    onClick={handleUseFaucet}
                    disabled={isLoading || isPending}
                  >
                    {isLoading || isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Getting Tokens...
                      </>
                    ) : (
                      <>
                        <Gift className="w-5 h-5 mr-2" />
                        Claim Free Tokens
                      </>
                    )}
                  </GradientButton>
                ) : (
                  <GradientButton
                    variant="success"
                    className="flex-1 h-12"
                    disabled
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Faucet Already Used
                  </GradientButton>
                )}
                <Link href="/?tab=reporter" className="flex-1">
                  <GradientButton variant="outline" className="w-full h-12">
                    <FileText className="w-5 h-5 mr-2" />
                    Become a Reporter
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </GradientButton>
                </Link>
              </motion.div>
            </CardContent>
          </AnimatedCard>

          {/* How to Earn More Tokens */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              How to Earn More TRUTH Tokens
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={FileText}
                title="Submit Articles"
                description="Write and submit news articles as a verified reporter to earn tokens for each publication."
                delay={0.9}
              />
              <FeatureCard
                icon={Shield}
                title="Verify Content"
                description="Help verify the authenticity of news articles and earn rewards for accurate verification."
                delay={1.0}
              />
              <FeatureCard
                icon={Users}
                title="Build Reputation"
                description="Maintain high-quality submissions and build your reputation to unlock bonus rewards."
                delay={1.1}
              />
            </div>
          </motion.div>

          {/* Token Usage */}
          <AnimatedCard delay={1.2}>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                What You Can Do With TRUTH Tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg mt-1">
                      <Star className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Premium Access
                      </h4>
                      <p className="text-sm text-gray-600">
                        Purchase subscriptions to access verified premium news
                        content.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg mt-1">
                      <Shield className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Verification Rewards
                      </h4>
                      <p className="text-sm text-gray-600">
                        Stake tokens to participate in the verification process
                        and earn rewards.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg mt-1">
                      <Wallet className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Platform Governance
                      </h4>
                      <p className="text-sm text-gray-600">
                        Use tokens to vote on platform decisions and feature
                        updates.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg mt-1">
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Trading & Exchange
                      </h4>
                      <p className="text-sm text-gray-600">
                        Trade tokens with other users or exchange for other
                        cryptocurrencies.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>
        </div>
      </div>
    </div>
  );
}
