"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Clock,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Hash,
  Calendar,
  Eye,
  Share2,
  Loader2,
  Newspaper,
  ExternalLink,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { getNewsDetails, verifyArticleProof } from "@/lib/contracts";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NewsArticle {
  contentHash: string;
  reporter: string;
  timestamp: string;
  isProofVerified: boolean;
  binaryDecision: boolean;
  title: string;
  content: string;
}

interface VerificationStep {
  id: string;
  label: string;
  completed: boolean;
  active: boolean;
}

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

// Enhanced badge component
const AnimatedBadge = ({ children, variant, className, ...props }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", stiffness: 200, damping: 15 }}
    whileHover={{ scale: 1.05 }}
  >
    <Badge
      variant={variant}
      className={cn(
        "px-3 py-1 text-xs font-medium shadow-sm border-0 backdrop-blur-sm",
        variant === "success" &&
          "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-200",
        variant === "destructive" &&
          "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-200",
        variant === "secondary" &&
          "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-gray-200",
        className
      )}
      {...props}
    >
      {children}
    </Badge>
  </motion.div>
);

// Verification Animation Component
const VerificationAnimation = ({ isVisible }: { isVisible: boolean }) => {
  const [steps, setSteps] = useState<VerificationStep[]>([
    { id: "compile", label: "Compile model", completed: false, active: false },
    {
      id: "verifyKey",
      label: "Generate verification key",
      completed: false,
      active: false,
    },
    {
      id: "provingKey",
      label: "Generate proving key",
      completed: false,
      active: false,
    },
    {
      id: "circuit",
      label: "Create a circuit",
      completed: false,
      active: false,
    },
    { id: "inputs", label: "Give inputs", completed: false, active: false },
    { id: "proof", label: "Generate a proof", completed: false, active: false },
    { id: "verify", label: "Verify onchain", completed: false, active: false },
  ]);

  useEffect(() => {
    if (!isVisible) {
      // Reset steps when animation is not visible
      setSteps((prev) =>
        prev.map((step) => ({ ...step, completed: false, active: false }))
      );
      return;
    }

    let currentStepIndex = 0;

    const processNextStep = () => {
      if (currentStepIndex >= steps.length) return;

      // Set current step as active
      setSteps((prev) =>
        prev.map((step, index) => ({
          ...step,
          active: index === currentStepIndex,
          completed: index < currentStepIndex,
        }))
      );

      // After 1.5 seconds, complete current step and move to next
      setTimeout(() => {
        setSteps((prev) =>
          prev.map((step, index) => ({
            ...step,
            active: false,
            completed: index <= currentStepIndex,
          }))
        );

        currentStepIndex++;

        if (currentStepIndex < steps.length) {
          setTimeout(processNextStep, 300);
        }
      }, 1500);
    };

    // Start the animation after a brief delay
    const timer = setTimeout(processNextStep, 500);

    return () => clearTimeout(timer);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="bg-white rounded-2xl p-8 mx-4 max-w-md w-full shadow-2xl"
      >
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
          />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Verifying Zero-Knowledge Proof
          </h3>
          <p className="text-gray-600 text-sm">
            Processing verification steps...
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: step.active ? 1.02 : 1,
              }}
              transition={{
                delay: index * 0.1,
                type: "spring",
                stiffness: 200,
                damping: 15,
              }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
                step.active && "bg-blue-50 shadow-sm",
                step.completed && "bg-green-50"
              )}
            >
              <div className="relative">
                <AnimatePresence mode="wait">
                  {step.completed ? (
                    <motion.div
                      key="completed"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </motion.div>
                  ) : step.active ? (
                    <motion.div
                      key="active"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="pending"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center"
                    >
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.span
                className={cn(
                  "text-sm font-medium transition-colors duration-300",
                  step.completed
                    ? "text-green-700"
                    : step.active
                      ? "text-blue-700"
                      : "text-gray-500"
                )}
                animate={{
                  scale: step.active ? 1.02 : 1,
                }}
              >
                {step.label}
              </motion.span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-6 text-center"
        >
          <div className="text-xs text-gray-500">
            This process ensures cryptographic verification without revealing
            sensitive data
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
      />
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-gray-600 font-medium"
      >
        Loading article...
      </motion.p>
    </motion.div>
  </div>
);

export default function NewsDetailPage() {
  const params = useParams();
  const { address } = useAccount();
  const { toast } = useToast();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [readingTime, setReadingTime] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const loadArticle = async () => {
      try {
        setIsLoading(true);
        const articleData = await getNewsDetails(params.hash as string);
        console.log(articleData);
        if (articleData) {
          setArticle(articleData);
          // Calculate reading time (average 200 words per minute)
          const wordCount = articleData.content.split(" ").length;
          setReadingTime(Math.ceil(wordCount / 200));
        }
      } catch (error) {
        console.error("Error loading article:", error);
        toast({
          title: "Error",
          description: "Failed to load article details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [params.hash]);

  const handleVerify = async () => {
    // setIsVerifying(true);

    try {
      console.log(article);
      const result = await verifyArticleProof(1);

      // Simulate verification process - the animation will run for about 12 seconds
      setTimeout(() => {
        setIsVerifying(false);
        toast({
          title: "Verification Complete",
          description:
            "Zero-knowledge proof verification completed successfully",
        });
      }, 12000);
    } catch (error) {
      console.error("Error verifying article:", error);
      setIsVerifying(false);
      toast({
        title: "Error",
        description: "Failed to verify article",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: article?.title,
        text: `Check out this news article: ${article?.title}`,
        url: window.location.href,
      });
    } catch (error) {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Article link copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!article) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <FileText className="w-8 h-8 text-white" />
          </motion.div>
          <p className="text-gray-600 font-medium text-lg">Article not found</p>
          <Link href="/">
            <GradientButton variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </GradientButton>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Article Header */}
        <AnimatedCard delay={0.2}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: 0.3,
                    type: "spring",
                    stiffness: 200,
                  }}
                >
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <Newspaper className="h-5 w-5 text-white" />
                  </div>
                </motion.div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {article?.title || "Loading..."}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {article?.timestamp
                      ? new Date(
                          Number(article.timestamp) * 1000
                        ).toLocaleString()
                      : "Loading..."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <GradientButton
                  onClick={() => window.history.back()}
                  variant="outline"
                  className="text-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </GradientButton>
                <GradientButton
                  onClick={() =>
                    window.open(
                      `https://ipfs.io/ipfs/${article?.contentHash}`,
                      "_blank"
                    )
                  }
                  className="text-sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on IPFS
                </GradientButton>
              </div>
            </div>
          </CardHeader>
        </AnimatedCard>

        {/* Article Content */}
        <AnimatedCard delay={0.4}>
          <CardContent className="pt-6">
            <div className="prose prose-lg max-w-none">
              {!article ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              ) : !article.content ? (
                <div className="text-gray-500 italic">No content available</div>
              ) : (
                article.content.split("\n").map((paragraph, index) => (
                  <motion.p
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.5 + index * 0.1,
                      duration: 0.5,
                    }}
                    className="mb-4 text-gray-700"
                  >
                    {paragraph}
                  </motion.p>
                ))
              )}
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Verification Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Verification Details
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Zero-Knowledge Proof Card */}
            <AnimatedCard delay={0.7}>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  Zero-Knowledge Proof
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.8,
                      type: "spring",
                      stiffness: 200,
                    }}
                  >
                    {article.isProofVerified ? (
                      <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                    ) : (
                      <div className="p-2 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full">
                        <XCircle className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </motion.div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {article.isProofVerified
                        ? "Proof Verified"
                        : "Verification Pending"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {article.isProofVerified
                        ? "Zero-knowledge proof has been successfully verified"
                        : "Waiting for zero-knowledge proof verification"}
                    </p>
                  </div>
                </div>
                <GradientButton
                  onClick={handleVerify}
                  className="w-full"
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Verify Proof
                    </>
                  )}
                </GradientButton>
              </CardContent>
            </AnimatedCard>

            {/* Content Verification Card */}
            <AnimatedCard delay={0.8}>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  Content Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.9,
                      type: "spring",
                      stiffness: 200,
                    }}
                  >
                    {article.binaryDecision ? (
                      <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                    ) : (
                      <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-full">
                        <XCircle className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </motion.div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {article.binaryDecision
                        ? "Content Verified"
                        : "Verification Failed"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {article.binaryDecision
                        ? "News content has been verified as authentic"
                        : "Content verification is pending or failed"}
                    </p>
                  </div>
                </div>

                {/* Verification Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Verification Progress</span>
                    <span className="font-medium">
                      {article.binaryDecision
                        ? "100%"
                        : article.isProofVerified
                          ? "50%"
                          : "25%"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: article.binaryDecision
                          ? "100%"
                          : article.isProofVerified
                            ? "50%"
                            : "25%",
                      }}
                      transition={{ delay: 1, duration: 1, ease: "easeOut" }}
                      className={cn(
                        "h-2 rounded-full",
                        article.binaryDecision
                          ? "bg-gradient-to-r from-emerald-500 to-green-600"
                          : "bg-gradient-to-r from-blue-500 to-purple-600"
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </AnimatedCard>
          </div>
        </motion.div>

        {/* Technical Details */}
        <AnimatedCard delay={0.9}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Hash className="h-5 w-5 text-gray-600" />
              Technical Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Content Hash
                </p>
                <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                  {article.contentHash}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Reporter Address
                </p>
                <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                  {article.reporter}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Timestamp</p>
                <p className="text-xs bg-gray-100 p-2 rounded">
                  {new Date(Number(article.timestamp) * 1000).toISOString()}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Word Count</p>
                <p className="text-xs bg-gray-100 p-2 rounded">
                  {article.content.split(" ").length} words
                </p>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>
      </div>
      <Toaster />
    </div>
  );
}
