"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, User, FileText } from "lucide-react";
import { ipfsService } from "@/lib/ipfs";
import { useAccount } from "wagmi";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useNewsArticles } from "@/lib/contracts";

interface NewsArticle {
  contentHash: string;
  reporter: string;
  timestamp: string;
  isVerified: boolean;
  title: string;
  content: string;
}

export default function NewsDetailPage() {
  const params = useParams();
  const { address } = useAccount();
  const { toast } = useToast();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: newsData } = useNewsArticles();

  useEffect(() => {
    const loadArticle = async () => {
      try {
        setIsLoading(true);
        if (!newsData) return;

        const foundArticle = (newsData as NewsArticle[]).find(
          (a) => a.contentHash === params.hash
        );

        if (foundArticle) {
          const ipfsContent = await ipfsService.getContent(
            foundArticle.contentHash
          );
          if (ipfsContent) {
            setArticle({
              ...foundArticle,
              title: ipfsContent.name,
              content: ipfsContent.content,
            });
          }
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
  }, [params.hash, newsData]);

  const handleVerify = async () => {
    // TODO: Implement verification logic
    toast({
      title: "Verification",
      description: "Verification feature coming soon",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Article not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{article.title}</CardTitle>
            <Badge variant={article.isVerified ? "default" : "secondary"}>
              {article.isVerified ? "Verified" : "Pending Verification"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span className="font-mono">
                {article.reporter.slice(0, 6)}...{article.reporter.slice(-4)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {new Date(Number(article.timestamp) * 1000).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{article.content}</p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Verification Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Verification Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {article.isVerified
                      ? "This article has been verified using zero-knowledge proofs"
                      : "This article is pending verification"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    ZK Proof
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {article.isVerified ? (
                    <p className="text-sm text-muted-foreground">
                      Verification proof available
                    </p>
                  ) : (
                    <Button onClick={handleVerify} className="w-full">
                      Verify Now
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}
