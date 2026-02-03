import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

const LoadingState = ({ message = "Chargement...", size = "md" }: LoadingStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Loader2 className={`${sizes[size]} text-primary animate-spin mb-4`} />
      <p className="text-sm text-muted-foreground font-sans">{message}</p>
    </div>
  );
};

export default LoadingState;
