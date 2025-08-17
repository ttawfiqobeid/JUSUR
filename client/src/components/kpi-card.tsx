import { motion } from "framer-motion";
import { LucideIcon, ArrowUp, ArrowDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

export default function KPICard({ title, value, icon: Icon, color, change, changeType }: KPICardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="kpi-card glassmorphism bg-white/80 dark:bg-ios-dark-elevated/80 rounded-ios border border-white/20 dark:border-white/10 shadow-ios p-3 transition-all duration-300 min-h-[120px] flex flex-col justify-between"
      data-testid={`card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs text-ios-gray dark:text-gray-400">{title.split(' ').pop()}</span>
      </div>
      <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white break-words overflow-hidden" data-testid={`text-${title.toLowerCase().replace(/\s+/g, '-')}-value`}>
        {value}
      </div>
      <div className="text-xs text-ios-gray dark:text-gray-400 truncate">{title}</div>
      {change && (
        <div className={`text-xs mt-1 flex items-center ${
          changeType === "positive" ? "text-ios-green" : 
          changeType === "negative" ? "text-ios-red" : 
          "text-ios-gray"
        }`}>
          {changeType === "positive" && <ArrowUp className="w-3 h-3 mr-1" />}
          {changeType === "negative" && <ArrowDown className="w-3 h-3 mr-1" />}
          {change}
        </div>
      )}
    </motion.div>
  );
}
