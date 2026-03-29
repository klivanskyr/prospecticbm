interface BadgeProps {
  variant?:
    | "blue"
    | "yellow"
    | "green"
    | "gray"
    | "red";
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  blue: "bg-blue-100 text-blue-700",
  yellow: "bg-yellow-100 text-yellow-800",
  green: "bg-green-100 text-green-700",
  gray: "bg-gray-100 text-gray-600",
  red: "bg-red-100 text-red-700",
};

export function Badge({ variant = "gray", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Helper maps for prospect/campaign status -> badge variant
export const prospectStatusVariant: Record<string, NonNullable<BadgeProps["variant"]>> = {
  new: "blue",
  contacted: "yellow",
  interested: "green",
  not_interested: "gray",
  do_not_contact: "red",
};

export const campaignStatusVariant: Record<string, NonNullable<BadgeProps["variant"]>> = {
  draft: "gray",
  active: "green",
  paused: "yellow",
  completed: "blue",
};
