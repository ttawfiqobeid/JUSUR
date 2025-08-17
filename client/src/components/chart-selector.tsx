import { Button } from "@/components/ui/button";
import { PieChart, BarChart3, TrendingUp, Activity } from "lucide-react";

interface ChartSelectorProps {
  chartType: string;
  onChartTypeChange: (type: string) => void;
}

export default function ChartSelector({ chartType, onChartTypeChange }: ChartSelectorProps) {
  const chartTypes = [
    { id: "PIE", label: "Pie", icon: PieChart },
    { id: "BAR", label: "Bar", icon: BarChart3 },
    { id: "LINE", label: "Line", icon: TrendingUp },
    { id: "AREA", label: "Area", icon: Activity },
  ];

  return (
    <div className="flex bg-gray-100 dark:bg-ios-dark rounded-xl p-1" data-testid="chart-selector">
      {chartTypes.map((type) => (
        <Button
          key={type.id}
          onClick={() => onChartTypeChange(type.id)}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
            chartType === type.id
              ? "bg-white dark:bg-ios-dark-elevated text-ios-blue shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
          data-testid={`button-chart-${type.id.toLowerCase()}`}
        >
          <type.icon className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">{type.label}</span>
        </Button>
      ))}
    </div>
  );
}
