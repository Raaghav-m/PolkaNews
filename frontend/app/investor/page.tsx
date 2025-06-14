"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import Link from "next/link";
import {
  getActiveSources,
  getInvestorSources,
  getInvestorRewards,
  getSourceDetails,
  addSource,
  claimRewards,
  challengeSource,
} from "@/lib/sources";

const InvestorPage = () => {
  const { address } = useAccount();
  const [newSourceName, setNewSourceName] = useState("");
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [investorSources, setInvestorSources] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [sourceDetails, setSourceDetails] = useState<any>(null);
  const [pendingRewards, setPendingRewards] = useState("0");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!address) return;
      try {
        setIsLoading(true);
        const [activeSourcesData, investorSourcesData, rewardsData] =
          await Promise.all([
            getActiveSources(),
            getInvestorSources(address),
            getInvestorRewards(address),
          ]);
        setActiveSources(activeSourcesData as string[]);
        setInvestorSources(investorSourcesData as string[]);
        setPendingRewards(ethers.formatEther(rewardsData as bigint));
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Failed to fetch data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [address]);

  // Fetch source details when selected
  useEffect(() => {
    const fetchSourceDetails = async () => {
      if (!selectedSource) return;
      try {
        const details = await getSourceDetails(selectedSource);
        setSourceDetails(details);
      } catch (error) {
        console.error("Error fetching source details:", error);
        alert("Failed to fetch source details");
      }
    };

    fetchSourceDetails();
  }, [selectedSource]);

  // Handlers
  const handleAddSource = async () => {
    if (!newSourceName) {
      alert("Please enter a source name");
      return;
    }
    try {
      setIsLoading(true);
      await addSource(newSourceName);
      setNewSourceName("");
      alert("Source added successfully");
    } catch (error) {
      alert("Failed to add source");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    try {
      setIsLoading(true);
      await claimRewards();
      alert("Rewards claimed successfully");
    } catch (error) {
      alert("Failed to claim rewards");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChallengeSource = async (sourceName: string) => {
    try {
      setIsLoading(true);
      await challengeSource(sourceName);
      alert("Source challenged successfully");
    } catch (error) {
      alert("Failed to challenge source");
    } finally {
      setIsLoading(false);
    }
  };

  const showSourceDetails = (sourceName: string) => {
    setSelectedSource(sourceName);
    setIsModalVisible(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-gray-800">
                  PolkaNews
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Home
                </Link>
                <Link
                  href="/investor"
                  className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Investor Dashboard
                </Link>
                <Link
                  href="/news"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  News
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Your Sources: {investorSources.length}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Pending Rewards: {pendingRewards} TRUTH
                </p>
              </div>
              <button
                onClick={handleClaimRewards}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isLoading ? "Claiming..." : "Claim Rewards"}
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add New Source
              </h3>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="Enter source name"
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <button
                  onClick={handleAddSource}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isLoading ? "Adding..." : "Add Source"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeSources.map((name) => (
                    <tr key={name}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        Active
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => showSourceDetails(name)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleChallengeSource(name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Challenge
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {isModalVisible && sourceDetails && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Source Details
              </h3>
              <button
                onClick={() => setIsModalVisible(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>×
              </button>
            </div>
            <div className="space-y-4">
              <p>
                <span className="font-medium">Name:</span> {sourceDetails.name}
              </p>
              <p>
                <span className="font-medium">Investor:</span>{" "}
                {sourceDetails.investor}
              </p>
              <p>
                <span className="font-medium">Status:</span>{" "}
                {sourceDetails.isActive ? "Active" : "Inactive"}
              </p>
              <p>
                <span className="font-medium">Stake Amount:</span>{" "}
                {ethers.formatEther(sourceDetails.stakeAmount)} TRUTH
              </p>
              <p>
                <span className="font-medium">Total Rewards:</span>{" "}
                {ethers.formatEther(sourceDetails.totalRewards)} TRUTH
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorPage;
