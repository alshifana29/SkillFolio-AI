import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  description?: string;
  trend?: string;
  trendColor?: string;
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  iconColor, 
  iconBgColor, 
  description,
  trend,
  trendColor = "text-green-600"
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground" data-testid={`stats-title-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground" data-testid={`stats-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
            {trend && (
              <p className={`text-sm ${trendColor} mt-1`}>
                {trend}
              </p>
            )}
          </div>
          <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
            <Icon className={`${iconColor} text-xl`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
