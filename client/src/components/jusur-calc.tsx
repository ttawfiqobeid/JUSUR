import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area } from "recharts";
import { Download, RefreshCcw, Calculator, TrendingUp, Moon, Sun, Settings, HelpCircle, Share } from "lucide-react";
import jusurLogo from "@/assets/jusur-logo-new.png";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import KPICard from "@/components/kpi-card";
import ChartSelector from "@/components/chart-selector";

const formatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
  notation: "compact",
  compactDisplay: "short"
});
const nf = (n: number) => {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1000000) {
    return `EGP ${(n / 1000000).toFixed(1)}M`;
  } else if (Math.abs(n) >= 1000) {
    return `EGP ${(n / 1000).toFixed(0)}K`;
  }
  return `EGP ${n.toLocaleString()}`;
};

const COLORS = ["#007AFF", "#5AC8FA", "#34C759", "#FF9500", "#FF3B30"];

const defaultInputs = {
  buyPrice: 0,
  sellPrice: 0,
  buyCommPct: 0,
  sellCommPct: 0,
  holdingMonths: 0,
  flatPct: 0,
  roiTier1: 0,
  roiTier2: 0,
  roiPct1: 0,
  roiPct2: 0,
  roiPct3: 0,
  agentCommPct: 0,
  agentCommAmount: 0,
  useAgentPct: true,
  targetROI: 10,
  retTaxPct: 2.5,
  useRetTax: false,
  otherExpenses: 0,
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("jusur_dark");
      return saved === "1";
    }
    return false;
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", dark);
      window.localStorage.setItem("jusur_dark", dark ? "1" : "0");
    }
  }, [dark]);

  return [dark, setDark] as const;
}

interface ComputeResults {
  buyPrice: number;
  sellPrice: number;
  buyCommPct: number;
  sellCommPct: number;
  buyCommAmount: number;
  costToBuy: number;
  sellCommAmount: number;
  agentCommAmount: number;
  retTaxAmount: number;
  otherExpenses: number;
  netSaleRevenue: number;
  totalProfit: number;
  jusurPct: number;
  jusurProfitCut: number;
  investorProfit: number;
  investorFinalReturn: number;
  jusurTotalRevenue: number;
  yourShare: number;
  partnerShare: number;
  investorROI: number;
  investorProfitPercent: number;
}

function computeResults(model: string, p: typeof defaultInputs): ComputeResults {
  const buyCommAmount = (p.buyPrice || 0) * (p.buyCommPct || 0) / 100;
  const costToBuy = (p.buyPrice || 0) + buyCommAmount;
  const sellCommAmount = (p.sellPrice || 0) * (p.sellCommPct || 0) / 100;

  // Calculate agent commission
  const agentCommAmount = p.useAgentPct
    ? (p.sellPrice || 0) * (p.agentCommPct || 0) / 100
    : (p.agentCommAmount || 0);

  // Calculate RET Tax (Real Estate Transactions Tax)
  const retTaxAmount = p.useRetTax ? (p.sellPrice || 0) * (p.retTaxPct || 0) / 100 : 0;

  // Calculate other expenses
  const otherExpenses = p.otherExpenses || 0;

  const netSaleRevenue = (p.sellPrice || 0) - sellCommAmount - agentCommAmount - retTaxAmount - otherExpenses;
  const totalProfit = netSaleRevenue - costToBuy;

  // Jusur % per selected model
  let jusurPct = 0;
  if (totalProfit <= 0) {
    jusurPct = 0; // no profit, no cut
  } else if (model === "SLIDING") {
    // Sliding: 20% + (profit/2,000,000)*25%, capped 45%
    jusurPct = clamp(0.20 + (totalProfit / 2000000) * 0.25, 0.20, 0.45);
  } else if (model === "PROGRESSIVE") {
    // Progressive tiers, tax-style on profit chunks: 25% up to 500k, 35% next 500k, 45% remainder
    const tier1 = Math.min(totalProfit, 500000);
    const tier2 = Math.min(Math.max(totalProfit - 500000, 0), 500000);
    const tier3 = Math.max(totalProfit - 1000000, 0);
    const jusurCut = tier1 * 0.25 + tier2 * 0.35 + tier3 * 0.45;
    jusurPct = jusurCut / totalProfit;
  } else if (model === "FLAT") {
    jusurPct = clamp((p.flatPct || 0) / 100, 0, 0.9);
  } else if (model === "ROI") {
    // ROI tiers based on investor ROI against costToBuy
    const investorROI = costToBuy > 0 ? (totalProfit / costToBuy) * 100 : 0;
    if (investorROI <= (p.roiTier1 || 0)) jusurPct = (p.roiPct1 || 0) / 100;
    else if (investorROI <= (p.roiTier2 || 0)) jusurPct = (p.roiPct2 || 0) / 100;
    else jusurPct = (p.roiPct3 || 0) / 100;
  }

  const jusurProfitCut = Math.max(0, totalProfit * jusurPct);
  const investorProfit = Math.max(0, totalProfit - jusurProfitCut);
  const investorFinalReturn = costToBuy + investorProfit;
  const jusurTotalRevenue = buyCommAmount + jusurProfitCut;
  const yourShare = jusurTotalRevenue / 2;
  const partnerShare = jusurTotalRevenue / 2;
  const investorROI = costToBuy > 0 ? (investorProfit / costToBuy) * 100 : 0;
  const investorProfitPercent = totalProfit > 0 ? (investorProfit / totalProfit) * 100 : 0;

  return {
    // echo inputs for CSV
    buyPrice: p.buyPrice,
    sellPrice: p.sellPrice,
    buyCommPct: p.buyCommPct,
    sellCommPct: p.sellCommPct,

    // computed
    buyCommAmount,
    costToBuy,
    sellCommAmount,
    agentCommAmount,
    retTaxAmount,
    otherExpenses,
    netSaleRevenue,
    totalProfit,
    jusurPct,
    jusurProfitCut,
    investorProfit,
    investorFinalReturn,
    jusurTotalRevenue,
    yourShare,
    partnerShare,
    investorROI,
    investorProfitPercent,
  };
}

// Number formatting helper
const formatNumberInput = (value: string): string => {
  // Remove all non-numeric characters
  const numericValue = value.replace(/[^\d]/g, '');
  // Add commas for thousands separator
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const parseNumberInput = (value: string): number => {
  return parseFloat(value.replace(/,/g, '')) || 0;
};

interface SavedDeal {
  id: string;
  date: string;
  name: string;
  model: string;
  inputs: typeof defaultInputs;
  results: ComputeResults;
}

interface SavedProfile {
  id: string;
  name: string;
  inputs: typeof defaultInputs;
  model: string;
  createdAt: string;
}

export default function JusurCalcApp() {
  const [dark, setDark] = useDarkMode();
  const [model, setModel] = useState("SLIDING");
  const [chartType, setChartType] = useState("PIE");
  const [inputs, setInputs] = useState(defaultInputs);
  const [activeTab, setActiveTab] = useState("calculator");
  const [dealName, setDealName] = useState("");
  const [savedDeals, setSavedDeals] = useState<SavedDeal[]>([]);
  const [sortField, setSortField] = useState<keyof SavedDeal>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [profileName, setProfileName] = useState("");
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const { toast } = useToast();

  // Load saved deals from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("jusur_saved_deals");
    if (saved) {
      try {
        setSavedDeals(JSON.parse(saved));
      } catch (error) {
        console.error("Error loading saved deals:", error);
      }
    }
  }, []);

  // Load saved profiles from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("jusur_saved_profiles");
    if (saved) {
      try {
        setSavedProfiles(JSON.parse(saved));
      } catch (error) {
        console.error("Error loading saved profiles:", error);
      }
    }
  }, []);

  // Save deals to localStorage whenever savedDeals changes
  useEffect(() => {
    localStorage.setItem("jusur_saved_deals", JSON.stringify(savedDeals));
  }, [savedDeals]);

  // Save profiles to localStorage whenever savedProfiles changes
  useEffect(() => {
    localStorage.setItem("jusur_saved_profiles", JSON.stringify(savedProfiles));
  }, [savedProfiles]);

  const onChangeNum = (key: keyof typeof defaultInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (key === 'buyPrice' || key === 'sellPrice' || key === 'agentCommAmount') {
      // For price fields, format with commas
      const formattedValue = formatNumberInput(rawValue);
      e.target.value = formattedValue;
      setInputs((s) => ({ ...s, [key]: parseNumberInput(formattedValue) }));
    } else {
      setInputs((s) => ({ ...s, [key]: parseFloat(rawValue) || 0 }));
    }
  };

  const onChangeAgentType = (usePercent: boolean) => {
    setInputs((s) => ({ ...s, useAgentPct: usePercent }));
  };

  const results = useMemo(() => computeResults(model, inputs), [model, inputs]);

  // Scenario comparison - compute results for all models
  const scenarioResults = useMemo(() => {
    const models = ["SLIDING", "PROGRESSIVE", "FLAT", "ROI"];
    return models.map(modelType => ({
      model: modelType,
      ...computeResults(modelType, inputs)
    }));
  }, [inputs]);

  // Break-even analysis - calculate minimum sell price for target ROI
  const breakEvenPrice = useMemo(() => {
    const targetROI = inputs.targetROI / 100;
    const buyCommAmount = (inputs.buyPrice || 0) * (inputs.buyCommPct || 0) / 100;
    const costToBuy = (inputs.buyPrice || 0) + buyCommAmount;
    const targetProfit = costToBuy * targetROI;

    // Calculate required net sale revenue
    const requiredNetRevenue = costToBuy + targetProfit;

    // Account for sell commission, agent commission, RET tax, and other expenses
    const sellCommRate = (inputs.sellCommPct || 0) / 100;
    const agentCommRate = inputs.useAgentPct ? (inputs.agentCommPct || 0) / 100 : 0;
    const retTaxRate = inputs.useRetTax ? (inputs.retTaxPct || 0) / 100 : 0;
    const fixedAgentComm = inputs.useAgentPct ? 0 : (inputs.agentCommAmount || 0);
    const otherExpenses = inputs.otherExpenses || 0;

    // Solve for sell price: sellPrice * (1 - sellCommRate - agentCommRate - retTaxRate) - fixedAgentComm - otherExpenses = requiredNetRevenue
    const breakEven = (requiredNetRevenue + fixedAgentComm + otherExpenses) / (1 - sellCommRate - agentCommRate - retTaxRate);

    return Math.max(0, breakEven);
  }, [inputs]);

  // Sensitivity analysis data
  const sensitivityData = useMemo(() => {
    if (results.totalProfit <= 0) return [];

    const baseProfit = results.totalProfit;
    const baseSellPrice = inputs.sellPrice || 0;
    const variations = [];

    // Generate data points from 50% to 150% of current profit
    for (let i = 50; i <= 150; i += 10) {
      const profitMultiplier = i / 100;
      const adjustedProfit = baseProfit * profitMultiplier;

      // Calculate corresponding sell price
      const buyCommAmount = (inputs.buyPrice || 0) * (inputs.buyCommPct || 0) / 100;
      const costToBuy = (inputs.buyPrice || 0) + buyCommAmount;
      const sellCommRate = (inputs.sellCommPct || 0) / 100;
      const agentCommRate = inputs.useAgentPct ? (inputs.agentCommPct || 0) / 100 : 0;
      const retTaxRate = inputs.useRetTax ? (inputs.retTaxPct || 0) / 100 : 0;
      const fixedAgentComm = inputs.useAgentPct ? 0 : (inputs.agentCommAmount || 0);
      const otherExpenses = inputs.otherExpenses || 0;

      const requiredNetRevenue = costToBuy + adjustedProfit;
      const adjustedSellPrice = (requiredNetRevenue + fixedAgentComm + otherExpenses) / (1 - sellCommRate - agentCommRate - retTaxRate);

      // Calculate results for each model at this profit level
      const testInputs = { ...inputs, sellPrice: adjustedSellPrice };
      const slidingResults = computeResults("SLIDING", testInputs);
      const progressiveResults = computeResults("PROGRESSIVE", testInputs);
      const flatResults = computeResults("FLAT", testInputs);
      const roiResults = computeResults("ROI", testInputs);

      variations.push({
        profitMultiplier: i,
        sellPrice: adjustedSellPrice,
        totalProfit: adjustedProfit,
        slidingJusur: slidingResults.jusurProfitCut,
        slidingInvestor: slidingResults.investorProfit,
        progressiveJusur: progressiveResults.jusurProfitCut,
        progressiveInvestor: progressiveResults.investorProfit,
        flatJusur: flatResults.jusurProfitCut,
        flatInvestor: flatResults.investorProfit,
        roiJusur: roiResults.jusurProfitCut,
        roiInvestor: roiResults.investorProfit,
      });
    }

    return variations;
  }, [inputs, results]);

  const exportCSV = () => {
    const formatCurrency = (amount: number) => {
      return `"EGP ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}"`;
    };

    const formatPercentage = (pct: number) => {
      return `"${pct.toFixed(2)}%"`;
    };

    const dealName = dealName || `${model}_Deal_${new Date().toISOString().split('T')[0]}`;

    const rows = [
      // Header Information
      ["JUSUR INVESTMENTS - CALCULATION REPORT"],
      [""],
      ["Deal Name", `"${dealName}"`],
      ["Calculation Model", `"${model}"`],
      ["Export Date", `"${new Date().toLocaleString()}"`],
      [""],

      // INPUT PARAMETERS
      ["=== INPUT PARAMETERS ==="],
      ["Purchase Price", formatCurrency(results.buyPrice)],
      ["Expected Sale Price", formatCurrency(results.sellPrice)],
      ["Holding Period (Months)", inputs.holdingMonths.toString()],
      [""],

      // COMMISSION & FEES
      ["=== COMMISSIONS & FEES ==="],
      ["Buy Commission Rate", formatPercentage(results.buyCommPct)],
      ["Buy Commission Amount", formatCurrency(results.buyCommAmount)],
      ["Sell Commission Rate", formatPercentage(results.sellCommPct)],
      ["Sell Commission Amount", formatCurrency(results.sellCommAmount)],
      [""],

      // OPTIONAL COSTS
      ["=== OPTIONAL COSTS ==="],
      ["Agent Commission", inputs.useAgentPct ? formatPercentage(inputs.agentCommPct) : formatCurrency(inputs.agentCommAmount)],
      ["Agent Commission Amount", formatCurrency(results.agentCommAmount)],
      ["RET Tax Rate", inputs.useRetTax ? formatPercentage(inputs.retTaxPct) : "Not Applied"],
      ["RET Tax Amount", formatCurrency(results.retTaxAmount)],
      ["Other Expenses", formatCurrency(results.otherExpenses)],
      [""],

      // CALCULATION RESULTS
      ["=== CALCULATION RESULTS ==="],
      ["Total Cost to Buy", formatCurrency(results.costToBuy)],
      ["Gross Sale Revenue", formatCurrency(results.sellPrice)],
      ["Total Selling Costs", formatCurrency(results.sellCommAmount + results.agentCommAmount + results.retTaxAmount + results.otherExpenses)],
      ["Net Sale Revenue", formatCurrency(results.netSaleRevenue)],
      ["Total Profit", formatCurrency(results.totalProfit)],
      [""],

      // PROFIT DISTRIBUTION
      ["=== PROFIT DISTRIBUTION ==="],
      ["Jusur Profit Share Rate", formatPercentage(results.jusurPct * 100)],
      ["Jusur Profit Cut", formatCurrency(results.jusurProfitCut)],
      ["Investor Profit", formatCurrency(results.investorProfit)],
      ["Investor Profit Percentage", formatPercentage(results.investorProfitPercent)],
      [""],

      // JUSUR REVENUE BREAKDOWN
      ["=== JUSUR REVENUE BREAKDOWN ==="],
      ["Total Jusur Revenue", formatCurrency(results.jusurTotalRevenue)],
      ["Your Share (50%)", formatCurrency(results.yourShare)],
      ["Partner Share (50%)", formatCurrency(results.partnerShare)],
      [""],

      // INVESTOR RETURNS
      ["=== INVESTOR RETURNS ==="],
      ["Initial Investment", formatCurrency(results.costToBuy)],
      ["Final Return", formatCurrency(results.investorFinalReturn)],
      ["Investor ROI", formatPercentage(results.investorROI)],
      [""],

      // BREAK-EVEN ANALYSIS
      ["=== BREAK-EVEN ANALYSIS ==="],
      ["Target ROI", formatPercentage(inputs.targetROI)],
      ["Minimum Sell Price for Target ROI", formatCurrency(breakEvenPrice)],
      ["Current vs Break-even", formatCurrency(results.sellPrice - breakEvenPrice)],
      [""],

      // MODEL-SPECIFIC PARAMETERS
      ["=== MODEL-SPECIFIC PARAMETERS ==="],
    ];

    // Add model-specific parameters
    if (model === "FLAT") {
      rows.push(["Flat Jusur Percentage", formatPercentage(inputs.flatPct)]);
    } else if (model === "ROI") {
      rows.push(
        ["ROI Tier 1 Threshold", formatPercentage(inputs.roiTier1)],
        ["ROI Tier 2 Threshold", formatPercentage(inputs.roiTier2)],
        ["Jusur % for ROI ≤ Tier 1", formatPercentage(inputs.roiPct1)],
        ["Jusur % for Tier 1 < ROI ≤ Tier 2", formatPercentage(inputs.roiPct2)],
        ["Jusur % for ROI > Tier 2", formatPercentage(inputs.roiPct3)]
      );
    } else if (model === "SLIDING") {
      rows.push(["Model Description", '"20% base + (profit/2M)*25%, capped at 45%"']);
    } else if (model === "PROGRESSIVE") {
      rows.push(["Model Description", '"25% up to 500K, 35% next 500K, 45% remainder"']);
    }

    rows.push(
      [""],
      ["=== SUMMARY ==="],
      ["Total Investment Required", formatCurrency(results.costToBuy)],
      ["Expected Total Return", formatCurrency(results.investorFinalReturn)],
      ["Expected Profit", formatCurrency(results.investorProfit)],
      ["Expected ROI", formatPercentage(results.investorROI)],
      [""],
      ["Generated by Jusur Calc", `"${window.location.href}"`]
    );

    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `JusurCalc_${model}_${dealName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Comprehensive CSV report has been downloaded successfully.",
    });
  };

  const reset = () => {
    setInputs(defaultInputs);
    toast({
      title: "Form Reset",
      description: "All values have been reset to defaults.",
    });
  };

  const shareResults = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Jusur Calc Results',
        text: `Investment ROI: ${results.investorROI.toFixed(2)}%, Total Profit: ${nf(results.totalProfit)}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(`Investment ROI: ${results.investorROI.toFixed(2)}%, Total Profit: ${nf(results.totalProfit)}`);
      toast({
        title: "Results Copied",
        description: "Investment summary copied to clipboard.",
      });
    }
  };

  const saveDeal = () => {
    if (!dealName.trim()) {
      toast({
        title: "Deal Name Required",
        description: "Please enter a name for this deal.",
        variant: "destructive",
      });
      return;
    }

    const newDeal: SavedDeal = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      name: dealName.trim(),
      model,
      inputs: { ...inputs },
      results: { ...results },
    };

    setSavedDeals(prev => [newDeal, ...prev]);
    setDealName("");
    toast({
      title: "Deal Saved",
      description: `"${newDeal.name}" has been saved to your history.`,
    });
  };

  const loadDeal = (deal: SavedDeal) => {
    setInputs(deal.inputs);
    setModel(deal.model);
    setActiveTab("calculator");
    toast({
      title: "Deal Loaded",
      description: `"${deal.name}" has been loaded.`,
    });
  };

  const deleteDeal = (id: string) => {
    setSavedDeals(prev => prev.filter(deal => deal.id !== id));
    toast({
      title: "Deal Deleted",
      description: "Deal has been removed from history.",
    });
  };

  const saveProfile = () => {
    if (!profileName.trim()) {
      toast({
        title: "Profile Name Required",
        description: "Please enter a name for this profile.",
        variant: "destructive",
      });
      return;
    }

    const newProfile: SavedProfile = {
      id: Date.now().toString(),
      name: profileName.trim(),
      inputs: { ...inputs },
      model,
      createdAt: new Date().toISOString(),
    };

    setSavedProfiles(prev => [newProfile, ...prev]);
    setProfileName("");
    toast({
      title: "Profile Saved",
      description: `"${newProfile.name}" profile has been saved.`,
    });
  };

  const loadProfile = (profileId: string) => {
    const profile = savedProfiles.find(p => p.id === profileId);
    if (profile) {
      setInputs(profile.inputs);
      setModel(profile.model);
      setSelectedProfile(profileId);
      toast({
        title: "Profile Loaded",
        description: `"${profile.name}" profile has been loaded.`,
      });
    }
  };

  const deleteProfile = (id: string) => {
    setSavedProfiles(prev => prev.filter(profile => profile.id !== id));
    if (selectedProfile === id) {
      setSelectedProfile("");
    }
    toast({
      title: "Profile Deleted",
      description: "Profile has been removed.",
    });
  };

  const sortDeals = (field: keyof SavedDeal) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedDeals = useMemo(() => {
    return [...savedDeals].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "results") {
        aVal = a.results.totalProfit;
        bVal = b.results.totalProfit;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      const numA = Number(aVal) || 0;
      const numB = Number(bVal) || 0;
      return sortDirection === "asc" ? numA - numB : numB - numA;
    });
  }, [savedDeals, sortField, sortDirection]);

  const pieData = useMemo(() => ([
    { name: "Investor Profit", value: Math.max(0, results.investorProfit) },
    { name: "Jusur Profit Cut", value: Math.max(0, results.jusurProfitCut) },
  ]), [results]);

  const barData = useMemo(() => ([
    { name: "Total Profit", amount: results.totalProfit },
    { name: "Investor Profit", amount: results.investorProfit },
    { name: "Jusur Profit", amount: results.jusurProfitCut },
  ]), [results]);

  const timelineData = useMemo(() => {
    const months = Math.max(1, inputs.holdingMonths);
    return Array.from({ length: months + 1 }, (_, i) => ({
      month: i,
      roi: i === 0 ? 0 : (results.investorROI * i) / months,
      profit: i === 0 ? 0 : (results.totalProfit * i) / months,
    }));
  }, [results, inputs.holdingMonths]);

  const kpiData = [
    {
      title: "Investor ROI",
      value: `${results.investorROI.toFixed(2)}%`,
      icon: TrendingUp,
      color: "from-ios-green to-emerald-400",
      change: "+2.1% from target",
      changeType: "positive" as const,
    },
    {
      title: "Jusur Share",
      value: `${(results.jusurPct * 100).toFixed(2)}%`,
      icon: Calculator,
      color: "from-ios-blue to-ios-light-blue",
    },
    {
      title: "Total Profit",
      value: nf(results.totalProfit),
      icon: TrendingUp,
      color: "from-ios-orange to-yellow-400",
    },
    {
      title: "Break-even Price",
      value: nf(breakEvenPrice),
      icon: TrendingUp,
      color: "from-purple-500 to-purple-400",
      change: `For ${inputs.targetROI}% ROI`,
      changeType: "neutral" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-ios-light-gray via-white to-ios-light-gray dark:from-ios-dark dark:via-ios-dark-elevated dark:to-ios-dark">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 glassmorphism bg-white/80 dark:bg-ios-dark/80 backdrop-blur-ios border-b border-white/20 dark:border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-white rounded-xl flex items-center justify-center shadow-ios p-1">
                <img
                  src={jusurLogo}
                  alt="Jusur Investments Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white font-ios">Jusur Calc</h1>
                <p className="text-xs sm:text-sm text-ios-gray dark:text-gray-400">Investment Calculator</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button
                variant="outline"
                onClick={shareResults}
                className="ios-button px-3 py-2 bg-white/80 dark:bg-ios-dark-elevated/80 backdrop-blur-ios rounded-full border border-white/20 dark:border-white/10 text-sm font-medium shadow-ios hover:bg-white dark:hover:bg-ios-dark-elevated"
                data-testid="button-share"
              >
                <Share className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Share</span>
              </Button>

              <Button
                variant="outline"
                onClick={exportCSV}
                className="ios-button px-3 py-2 bg-white/80 dark:bg-ios-dark-elevated/80 backdrop-blur-ios rounded-full border border-white/20 dark:border-white/10 text-sm font-medium shadow-ios hover:bg-white dark:hover:bg-ios-dark-elevated"
                data-testid="button-export"
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>

              <Button
                variant="outline"
                onClick={reset}
                className="ios-button px-3 py-2 bg-white/80 dark:bg-ios-dark-elevated/80 backdrop-blur-ios rounded-full border border-white/20 dark:border-white/10 text-sm font-medium shadow-ios hover:bg-white dark:hover:bg-ios-dark-elevated"
                data-testid="button-reset"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Reset</span>
              </Button>

              {/* Dark Mode Toggle */}
              <div className="flex items-center space-x-2 px-2">
                <Sun className="w-4 h-4 text-ios-gray dark:text-gray-400" />
                <Switch checked={dark} onCheckedChange={setDark} data-testid="switch-darkmode" />
                <Moon className="w-4 h-4 text-ios-gray dark:text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tab Navigation */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="glassmorphism bg-white/80 dark:bg-ios-dark-elevated/80 rounded-ios-xl border border-white/20 dark:border-white/10 grid grid-cols-2 md:grid-cols-4 w-full">
              <TabsTrigger value="calculator" className="rounded-lg">Calculator</TabsTrigger>
              <TabsTrigger value="scenarios" className="rounded-lg">Scenarios</TabsTrigger>
              <TabsTrigger value="sensitivity" className="rounded-lg">Sensitivity</TabsTrigger>
              <TabsTrigger value="history" className="rounded-lg">History</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {activeTab === "calculator" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Input Panel */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-4 space-y-6"
            >
              {/* Model Selection Card */}
              <Card className="glassmorphism bg-white/80 dark:bg-ios-dark-elevated/80 rounded-ios-xl border border-white/20 dark:border-white/10 shadow-ios">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-ios-blue" />
                    Calculation Model
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="ios-input" data-testid="select-model">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SLIDING">Sliding Scale (20% → 45%)</SelectItem>
                      <SelectItem value="PROGRESSIVE">Progressive Tiers</SelectItem>
                      <SelectItem value="FLAT">Flat Percentage</SelectItem>
                      <SelectItem value="ROI">ROI-Based</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Input Form Card */}
              <Card className="glassmorphism bg-white/80 dark:bg-ios-dark-elevated/80 rounded-ios-xl border border-white/20 dark:border-white/10 shadow-ios">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-ios-green" />
                    Investment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="flex items-center text-gray-700 dark:text-gray-300 mb-2">
                      Purchase Price
                      <HelpCircle className="w-4 h-4 ml-1 text-ios-gray" />
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">EGP</span>
                      <Input
                        type="text"
                        className="ios-input pl-12"
                        value={inputs.buyPrice ? formatNumberInput(inputs.buyPrice.toString()) : ''}
                        onChange={onChangeNum("buyPrice")}
                        placeholder="0"
                        data-testid="input-buyprice"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="flex items-center text-gray-700 dark:text-gray-300 mb-2">
                      Expected Sale Price
                      <HelpCircle className="w-4 h-4 ml-1 text-ios-gray" />
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">EGP</span>
                      <Input
                        type="text"
                        className="ios-input pl-12"
                        value={inputs.sellPrice ? formatNumberInput(inputs.sellPrice.toString()) : ''}
                        onChange={onChangeNum("sellPrice")}
                        placeholder="0"
                        data-testid="input-sellprice"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300 mb-2">Buy Commission %</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          className="ios-input pr-8"
                          value={inputs.buyCommPct || ''}
                          onChange={onChangeNum("buyCommPct")}
                          placeholder="0.0"
                          data-testid="input-buycomm"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-700 dark:text-gray-300 mb-2">Sell Commission %</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          className="ios-input pr-8"
                          value={inputs.sellCommPct || ''}
                          onChange={onChangeNum("sellCommPct")}
                          placeholder="0.0"
                          data-testid="input-sellcomm"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300 mb-2">
                        Holding Period
                        <span className="text-ios-gray text-xs ml-1">(months)</span>
                      </Label>
                      <Input
                        type="number"
                        className="ios-input"
                        value={inputs.holdingMonths || ''}
                        onChange={onChangeNum("holdingMonths")}
                        placeholder="0"
                        data-testid="input-holdingperiod"
                      />
                      <p className="text-xs text-ios-gray dark:text-gray-400 mt-1">Used for ROI calculations</p>
                    </div>

                    <div>
                      <Label className="text-gray-700 dark:text-gray-300 mb-2">
                        Target ROI
                        <span className="text-ios-gray text-xs ml-1">(%)</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.5"
                          className="ios-input pr-8"
                          value={inputs.targetROI || ''}
                          onChange={onChangeNum("targetROI")}
                          placeholder="10"
                          data-testid="input-targetroi"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                      </div>
                      <p className="text-xs text-ios-gray dark:text-gray-400 mt-1">For break-even analysis</p>
                    </div>
                  </div>

                  {/* Agent Commission Section */}
                  <div className="space-y-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-700 dark:text-gray-300">Outside Agent Commission (Optional)</Label>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">%</span>
                        <Switch
                          checked={inputs.useAgentPct}
                          onCheckedChange={onChangeAgentType}
                        />
                        <span className="text-xs text-gray-500">Amount</span>
                      </div>
                    </div>

                    {inputs.useAgentPct ? (
                      <div>
                        <Label className="text-gray-700 dark:text-gray-300 mb-2">Agent Commission %</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.1"
                            className="ios-input pr-8"
                            value={inputs.agentCommPct || ''}
                            onChange={onChangeNum("agentCommPct")}
                            placeholder="0.0"
                            data-testid="input-agentcommpct"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                        </div>
                        <p className="text-xs text-ios-gray dark:text-gray-400 mt-1">Percentage of total sale price</p>
                      </div>
                    ) : (
                      <div>
                        <Label className="text-gray-700 dark:text-gray-300 mb-2">Agent Commission Amount</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">EGP</span>
                          <Input
                            type="text"
                            className="ios-input pl-12"
                            value={inputs.agentCommAmount ? formatNumberInput(inputs.agentCommAmount.toString()) : ''}
                            onChange={onChangeNum("agentCommAmount")}
                            placeholder="0"
                            data-testid="input-agentcommamount"
                          />
                        </div>
                        <p className="text-xs text-ios-gray dark:text-gray-400 mt-1">Fixed commission amount</p>
                      </div>
                    )}
                  </div>

                  {/* RET Tax Section */}
                  <div className="space-y-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-700 dark:text-gray-300">Real Estate Transactions Tax (Optional)</Label>
                      <Switch
                        checked={inputs.useRetTax}
                        onCheckedChange={(checked) => setInputs(s => ({ ...s, useRetTax: checked }))}
                      />
                    </div>

                    {inputs.useRetTax && (
                      <div>
                        <Label className="text-gray-700 dark:text-gray-300 mb-2">RET Tax %</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.1"
                            className="ios-input pr-8"
                            value={inputs.retTaxPct || ''}
                            onChange={onChangeNum("retTaxPct")}
                            placeholder="2.5"
                            data-testid="input-rettaxpct"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                        </div>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Default 2.5% - paid by investor on sale</p>
                      </div>
                    )}
                  </div>

                  {/* Other Expenses Section */}
                  <div className="space-y-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                    <Label className="text-gray-700 dark:text-gray-300">Other Expenses (Optional)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">EGP</span>
                      <Input
                        type="text"
                        className="ios-input pl-12"
                        value={inputs.otherExpenses ? formatNumberInput(inputs.otherExpenses.toString()) : ''}
                        onChange={onChangeNum("otherExpenses")}
                        placeholder="0"
                        data-testid="input-otherexpenses"
                      />
                    </div>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Legal fees, maintenance, inspection costs, etc.</p>
                  </div>

                  {model === "FLAT" && (
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300 mb-2">Flat % for Jusur</Label>
                      <Input
                        type="number"
                        step="0.5"
                        className="ios-input"
                        value={inputs.flatPct}
                        onChange={onChangeNum("flatPct")}
                        placeholder="30"
                        data-testid="input-flatpct"
                      />
                    </div>
                  )}

                  {model === "ROI" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-700 dark:text-gray-300 mb-2">ROI Tier 1 (%)</Label>
                          <Input
                            type="number"
                            className="ios-input"
                            value={inputs.roiTier1}
                            onChange={onChangeNum("roiTier1")}
                            placeholder="10"
                            data-testid="input-roitier1"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-700 dark:text-gray-300 mb-2">ROI Tier 2 (%)</Label>
                          <Input
                            type="number"
                            className="ios-input"
                            value={inputs.roiTier2}
                            onChange={onChangeNum("roiTier2")}
                            placeholder="20"
                            data-testid="input-roitier2"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-gray-700 dark:text-gray-300 mb-2">Jusur % ≤ Tier1</Label>
                          <Input
                            type="number"
                            className="ios-input"
                            value={inputs.roiPct1}
                            onChange={onChangeNum("roiPct1")}
                            placeholder="20"
                            data-testid="input-roipct1"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-700 dark:text-gray-300 mb-2">Jusur % within Tier2</Label>
                          <Input
                            type="number"
                            className="ios-input"
                            value={inputs.roiPct2}
                            onChange={onChangeNum("roiPct2")}
                            placeholder="30"
                            data-testid="input-roipct2"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-700 dark:text-gray-300 mb-2">Jusur % {">"} Tier2</Label>
                          <Input
                            type="number"
                            className="ios-input"
                            value={inputs.roiPct3}
                            onChange={onChangeNum("roiPct3")}
                            placeholder="40"
                            data-testid="input-roipct3"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Save/Load Profiles Section */}
                  <div className="space-y-4 p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <Label className="text-gray-700 dark:text-gray-300">Input Profiles</Label>

                    {/* Load Profile Dropdown */}
                    {savedProfiles.length > 0 && (
                      <div>
                        <Label className="text-gray-700 dark:text-gray-300 mb-2 text-sm">Load Saved Profile</Label>
                        <Select value={selectedProfile} onValueChange={loadProfile}>
                          <SelectTrigger className="ios-input">
                            <SelectValue placeholder="Select a profile..." />
                          </SelectTrigger>
                          <SelectContent>
                            {savedProfiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{profile.name}</span>
                                  <span className="text-xs text-gray-500 ml-2">({profile.model})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Save Profile */}
                    <div className="flex space-x-2">
                      <Input
                        type="text"
                        className="ios-input flex-1"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Enter profile name..."
                        data-testid="input-profilename"
                      />
                      <Button
                        onClick={saveProfile}
                        className="ios-button bg-green-600 hover:bg-green-700 text-white"
                        disabled={!profileName.trim()}
                      >
                        Save Profile
                      </Button>
                    </div>

                    {/* Profile Management */}
                    {savedProfiles.length > 0 && (
                      <div className="mt-4">
                        <Label className="text-gray-700 dark:text-gray-300 mb-2 text-sm">Manage Profiles</Label>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {savedProfiles.map((profile) => (
                            <div key={profile.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                              <div className="flex-1">
                                <span className="text-sm font-medium">{profile.name}</span>
                                <span className="text-xs text-gray-500 ml-2">({profile.model})</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteProfile(profile.id)}
                                className="text-xs text-red-600 hover:text-red-700 ml-2"
                              >
                                Delete
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-green-600 dark:text-green-400">Save input configurations for quick reuse across different properties</p>
                  </div>

                  {/* Save Deal Section */}
                  <div className="space-y-4 p-4 rounded-lg bg-gradient-to-r from-ios-blue/10 to-ios-light-blue/10 border border-ios-blue/20">
                    <Label className="text-gray-700 dark:text-gray-300">Save This Deal</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="text"
                        className="ios-input flex-1"
                        value={dealName}
                        onChange={(e) => setDealName(e.target.value)}
                        placeholder="Enter deal name..."
                        data-testid="input-dealname"
                      />
                      <Button
                        onClick={saveDeal}
                        className="ios-button bg-ios-blue hover:bg-ios-blue/90 text-white"
                        disabled={!dealName.trim()}
                      >
                        Save Deal
                      </Button>
                    </div>
                    <p className="text-xs text-ios-gray dark:text-gray-400">Save your calculations for future reference and comparison</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Results Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-8 space-y-6"
            >
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiData.map((kpi, index) => (
                  <KPICard key={index} {...kpi} />
                ))}
              </div>

              {/* Chart Section */}
              <Card className="glassmorphism bg-white/80 dark:bg-ios-dark-elevated/80 rounded-ios-xl border border-white/20 dark:border-white/10 shadow-ios">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-gray-900 dark:text-white">Analytics</CardTitle>
                  <ChartSelector chartType={chartType} onChartTypeChange={setChartType} />
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-80 w-full bg-white dark:bg-gray-900 rounded-lg p-2">
                    {chartType === "PIE" && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ReTooltip
                            formatter={(value) => nf(value as number)}
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}

                    {chartType === "BAR" && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                          />
                          <YAxis
                            tickFormatter={(value) => `${Math.round(value / 1000)}K`}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                          />
                          <ReTooltip
                            formatter={(value) => nf(value as number)}
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                            {barData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}

                    {chartType === "LINE" && (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                          />
                          <ReTooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="roi" stroke={COLORS[0]} strokeWidth={3} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="profit" stroke={COLORS[1]} strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}

                    {chartType === "AREA" && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                          />
                          <ReTooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="profit"
                            stackId="1"
                            stroke={COLORS[0]}
                            fill={COLORS[0]}
                            fillOpacity={0.7}
                          />
                          <Area
                            type="monotone"
                            dataKey="roi"
                            stackId="2"
                            stroke={COLORS[1]}
                            fill={COLORS[1]}
                            fillOpacity={0.7}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Results */}
              <Card className="glassmorphism bg-white/80 dark:bg-ios-dark-elevated/80 rounded-ios-xl border border-white/20 dark:border-white/10 shadow-ios">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Detailed Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DetailItem label="Cost to Buy" value={nf(results.costToBuy)} />
                    <DetailItem label="Net Sale Revenue" value={nf(results.netSaleRevenue)} />
                    <DetailItem label="Total Profit" value={nf(results.totalProfit)} highlight />
                    <DetailItem label="Buy Commission" value={nf(results.buyCommAmount)} />
                    <DetailItem label="Sell Commission" value={nf(results.sellCommAmount)} />
                    <DetailItem label="Agent Commission" value={nf(results.agentCommAmount)} />
                    <DetailItem label="RET Tax" value={nf(results.retTaxAmount)} />
                    <DetailItem label="Other Expenses" value={nf(results.otherExpenses)} />
                    <DetailItem label="Jusur Profit Cut" value={nf(results.jusurProfitCut)} />
                    <DetailItem label="Investor Profit" value={nf(results.investorProfit)} />
                    <DetailItem label="Jusur Total Revenue" value={nf(results.jusurTotalRevenue)} />
                    <DetailItem label="Partner Share" value={nf(results.partnerShare)} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {activeTab === "scenarios" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="glassmorphism bg-white/80 dark:bg-ios-dark-elevated/80 rounded-ios-xl border border-white/20 dark:border-white/10 shadow-ios">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Model Comparison</CardTitle>
                <p className="text-sm text-ios-gray dark:text-gray-400">Compare all calculation models with your current inputs</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {scenarioResults.map((scenario, index) => (
                    <Card key={scenario.model} className={`border-2 ${scenario.model === model ? 'border-ios-blue bg-ios-blue/5' : 'border-gray-200 dark:border-gray-700'}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                          {scenario.model === "SLIDING" && "Sliding Scale"}
                          {scenario.model === "PROGRESSIVE" && "Progressive"}
                          {scenario.model === "FLAT" && "Flat Rate"}
                          {scenario.model === "ROI" && "ROI-Based"}
                          {scenario.model === model && <span className="text-xs bg-ios-blue text-white px-2 py-1 rounded-full">Current</span>}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Total Profit</span>
                            <span className="font-semibold">{nf(scenario.totalProfit)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Jusur %</span>
                            <span className="font-semibold text-ios-blue">{(scenario.jusurPct * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Investor Profit</span>
                            <span className="font-semibold text-ios-green">{nf(scenario.investorProfit)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Investor ROI</span>
                            <span className="font-semibold">{scenario.investorROI.toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Your Share</span>
                            <span className="font-semibold text-ios-orange">{nf(scenario.yourShare)}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => {
                            setModel(scenario.model);
                            setActiveTab("calculator");
                          }}
                          disabled={scenario.model === model}
                        >
                          {scenario.model === model ? "Current Model" : "Switch to This Model"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "sensitivity" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="glassmorphism bg-white/80 dark:bg-ios-dark-elevated/80 rounded-ios-xl border border-white/20 dark:border-white/10 shadow-ios">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Sensitivity Analysis</CardTitle>
                <p className="text-sm text-ios-gray dark:text-gray-400">How profit distributions change with different sale prices and profit levels</p>
              </CardHeader>
              <CardContent>
                {sensitivityData.length > 0 ? (
                  <div className="space-y-6">
                    {/* Jusur Profit Sensitivity */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Jusur Profit by Model</h3>
                      <div className="h-80 w-full bg-white dark:bg-gray-900 rounded-lg p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sensitivityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="profitMultiplier"
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                              axisLine={{ stroke: '#d1d5db' }}
                              label={{ value: 'Profit Level (%)', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis
                              tickFormatter={(value) => nf(value)}
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                              axisLine={{ stroke: '#d1d5db' }}
                              label={{ value: 'Jusur Profit', angle: -90, position: 'insideLeft' }}
                            />
                            <ReTooltip
                              formatter={(value) => nf(value as number)}
                              labelFormatter={(label) => `${label}% of Current Profit`}
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px'
                              }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="slidingJusur" stroke={COLORS[0]} strokeWidth={3} name="Sliding Scale" />
                            <Line type="monotone" dataKey="progressiveJusur" stroke={COLORS[1]} strokeWidth={3} name="Progressive" />
                            <Line type="monotone" dataKey="flatJusur" stroke={COLORS[2]} strokeWidth={3} name="Flat Rate" />
                            <Line type="monotone" dataKey="roiJusur" stroke={COLORS[3]} strokeWidth={3} name="ROI-Based" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Investor Profit Sensitivity */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Investor Profit by Model</h3>
                      <div className="h-80 w-full bg-white dark:bg-gray-900 rounded-lg p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sensitivityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="profitMultiplier"
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                              axisLine={{ stroke: '#d1d5db' }}
                              label={{ value: 'Profit Level (%)', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis
                              tickFormatter={(value) => nf(value)}
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                              axisLine={{ stroke: '#d1d5db' }}
                              label={{ value: 'Investor Profit', angle: -90, position: 'insideLeft' }}
                            />
                            <ReTooltip
                              formatter={(value) => nf(value as number)}
                              labelFormatter={(label) => `${label}% of Current Profit`}
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px'
                              }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="slidingInvestor" stroke={COLORS[0]} strokeWidth={3} name="Sliding Scale" />
                            <Line type="monotone" dataKey="progressiveInvestor" stroke={COLORS[1]} strokeWidth={3} name="Progressive" />
                            <Line type="monotone" dataKey="flatInvestor" stroke={COLORS[2]} strokeWidth={3} name="Flat Rate" />
                            <Line type="monotone" dataKey="roiInvestor" stroke={COLORS[3]} strokeWidth={3} name="ROI-Based" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">Enter investment details to see sensitivity analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "history" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="glassmorphism bg-white/80 dark:bg-ios-dark-elevated/80 rounded-ios-xl border border-white/20 dark:border-white/10 shadow-ios">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
                  Investment History
                  <span className="text-sm text-ios-gray dark:text-gray-400 font-normal">
                    {savedDeals.length} deal{savedDeals.length !== 1 ? 's' : ''} saved
                  </span>
                </CardTitle>
                <p className="text-sm text-ios-gray dark:text-gray-400">Your saved calculations and deals</p>
              </CardHeader>
              <CardContent>
                {savedDeals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th
                            className="text-left py-3 px-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                            onClick={() => sortDeals("date")}
                          >
                            <div className="flex items-center space-x-1">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</span>
                              {sortField === "date" && (
                                <span className="text-ios-blue">{sortDirection === "asc" ? "↑" : "↓"}</span>
                              )}
                            </div>
                          </th>
                          <th
                            className="text-left py-3 px-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                            onClick={() => sortDeals("name")}
                          >
                            <div className="flex items-center space-x-1">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</span>
                              {sortField === "name" && (
                                <span className="text-ios-blue">{sortDirection === "asc" ? "↑" : "↓"}</span>
                              )}
                            </div>
                          </th>
                          <th className="text-left py-3 px-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Model</span>
                          </th>
                          <th className="text-left py-3 px-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Buy Price</span>
                          </th>
                          <th className="text-left py-3 px-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sell Price</span>
                          </th>
                          <th
                            className="text-left py-3 px-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                            onClick={() => sortDeals("results")}
                          >
                            <div className="flex items-center space-x-1">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Profit</span>
                              {sortField === "results" && (
                                <span className="text-ios-blue">{sortDirection === "asc" ? "↑" : "↓"}</span>
                              )}
                            </div>
                          </th>
                          <th className="text-left py-3 px-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ROI</span>
                          </th>
                          <th className="text-left py-3 px-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedDeals.map((deal) => (
                          <tr key={deal.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-400">
                              {new Date(deal.date).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-2 text-sm font-medium text-gray-900 dark:text-white">
                              {deal.name}
                            </td>
                            <td className="py-3 px-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-ios-blue/10 text-ios-blue">
                                {deal.model}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-400">
                              {nf(deal.inputs.buyPrice)}
                            </td>
                            <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-400">
                              {nf(deal.inputs.sellPrice)}
                            </td>
                            <td className="py-3 px-2 text-sm font-medium text-ios-green">
                              {nf(deal.results.totalProfit)}
                            </td>
                            <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-400">
                              {deal.results.investorROI.toFixed(2)}%
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => loadDeal(deal)}
                                  className="text-xs"
                                >
                                  Load
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteDeal(deal.id)}
                                  className="text-xs text-red-600 hover:text-red-700"
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No saved deals yet</p>
                    <p className="text-sm text-ios-gray dark:text-gray-400">
                      Save your calculations in the Calculator tab to track your investment history.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}

interface DetailItemProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function DetailItem({ label, value, highlight = false }: DetailItemProps) {
  return (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-ios-blue/10 border border-ios-blue/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-semibold ${highlight ? 'text-ios-blue' : 'text-gray-900 dark:text-white'}`} data-testid={`text-${label.toLowerCase().replace(/\s+/g, '-')}`}>
        {value}
      </div>
    </div>
  );
}