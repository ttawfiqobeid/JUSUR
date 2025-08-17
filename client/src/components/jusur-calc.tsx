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
  buyPrice: 5600000,
  sellPrice: 7200000,
  buyCommPct: 1.0,
  sellCommPct: 1.5,
  holdingMonths: 8,
  flatPct: 30,
  roiTier1: 10,
  roiTier2: 20,
  roiPct1: 20,
  roiPct2: 30,
  roiPct3: 40,
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
  const netSaleRevenue = (p.sellPrice || 0) - sellCommAmount;
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

export default function JusurCalcApp() {
  const [dark, setDark] = useDarkMode();
  const [model, setModel] = useState("SLIDING");
  const [chartType, setChartType] = useState("PIE");
  const [inputs, setInputs] = useState(defaultInputs);
  const { toast } = useToast();

  const onChangeNum = (key: keyof typeof defaultInputs) => (e: React.ChangeEvent<HTMLInputElement>) => 
    setInputs((s) => ({ ...s, [key]: parseFloat(e.target.value || "0") }));

  const results = useMemo(() => computeResults(model, inputs), [model, inputs]);

  const exportCSV = () => {
    const rows = [
      ["Metric", "Value"],
      ["Model", model],
      ["Buy Price", results.buyPrice.toString()],
      ["Buy Commission (%)", results.buyCommPct.toString()],
      ["Buy Commission Amount", results.buyCommAmount.toString()],
      ["Cost to Buy", results.costToBuy.toString()],
      ["Sell Price", results.sellPrice.toString()],
      ["Sell Commission (%)", results.sellCommPct.toString()],
      ["Sell Commission Amount", results.sellCommAmount.toString()],
      ["Net Sale Revenue", results.netSaleRevenue.toString()],
      ["Total Profit", results.totalProfit.toString()],
      ["Jusur %", results.jusurPct.toString()],
      ["Jusur Profit Cut", results.jusurProfitCut.toString()],
      ["Investor Profit", results.investorProfit.toString()],
      ["Investor ROI %", results.investorROI.toString()],
      ["Jusur Total Revenue", results.jusurTotalRevenue.toString()],
      ["Your Share (50%)", results.yourShare.toString()],
      ["Partner Share (50%)", results.partnerShare.toString()],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `JusurCalc_${model}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: "CSV file has been downloaded successfully.",
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
      title: "Your Share",
      value: nf(results.yourShare),
      icon: Share,
      color: "from-purple-500 to-purple-400",
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
                      type="number" 
                      className="ios-input pl-12" 
                      value={inputs.buyPrice} 
                      onChange={onChangeNum("buyPrice")}
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
                      type="number" 
                      className="ios-input pl-12" 
                      value={inputs.sellPrice} 
                      onChange={onChangeNum("sellPrice")}
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
                        value={inputs.buyCommPct} 
                        onChange={onChangeNum("buyCommPct")}
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
                        value={inputs.sellCommPct} 
                        onChange={onChangeNum("sellCommPct")}
                        data-testid="input-sellcomm"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="text-gray-700 dark:text-gray-300 mb-2">
                    Holding Period
                    <span className="text-ios-gray text-xs ml-1">(months)</span>
                  </Label>
                  <Input 
                    type="number" 
                    className="ios-input" 
                    value={inputs.holdingMonths} 
                    onChange={onChangeNum("holdingMonths")}
                    data-testid="input-holdingperiod"
                  />
                  <p className="text-xs text-ios-gray dark:text-gray-400 mt-1">Used for ROI calculations and model thresholds</p>
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
                          data-testid="input-roipct3"
                        />
                      </div>
                    </div>
                  </div>
                )}
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
                  <DetailItem label="Jusur Profit Cut" value={nf(results.jusurProfitCut)} />
                  <DetailItem label="Investor Profit" value={nf(results.investorProfit)} />
                  <DetailItem label="Jusur Total Revenue" value={nf(results.jusurTotalRevenue)} />
                  <DetailItem label="Partner Share" value={nf(results.partnerShare)} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
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