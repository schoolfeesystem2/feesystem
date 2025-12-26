import { Loader2 } from "lucide-react";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

const PullToRefreshIndicator = ({ 
  pullDistance, 
  isRefreshing, 
  threshold = 80 
}: PullToRefreshIndicatorProps) => {
  const progress = Math.min(pullDistance / threshold, 1);
  const shouldShow = pullDistance > 10 || isRefreshing;

  if (!shouldShow) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-transform duration-200"
      style={{ 
        transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`,
        opacity: isRefreshing ? 1 : progress 
      }}
    >
      <div className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg">
        <Loader2 
          className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ 
            transform: isRefreshing ? 'none' : `rotate(${progress * 360}deg)` 
          }}
        />
      </div>
    </div>
  );
};

export default PullToRefreshIndicator;
