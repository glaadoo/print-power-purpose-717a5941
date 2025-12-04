import { useState } from "react";
import { ChevronDown, ChevronRight, LayoutDashboard, BarChart3, Package, Settings2, Heart, GraduationCap, Building2, ShoppingCart, DollarSign, AlertCircle, BookOpen, RefreshCw, Video, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabGroup {
  name: string;
  icon: React.ReactNode;
  tabs: { value: string; label: string; icon: React.ReactNode }[];
}

const tabGroups: TabGroup[] = [
  {
    name: "Overview",
    icon: <LayoutDashboard className="h-4 w-4" />,
    tabs: [
      { value: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { value: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    name: "Content",
    icon: <Package className="h-4 w-4" />,
    tabs: [
      { value: "products", label: "Products", icon: <Package className="h-4 w-4" /> },
      { value: "prices", label: "Configuration", icon: <Settings2 className="h-4 w-4" /> },
      { value: "causes", label: "Causes", icon: <Heart className="h-4 w-4" /> },
      { value: "schools", label: "Schools", icon: <GraduationCap className="h-4 w-4" /> },
      { value: "nonprofits", label: "Nonprofits", icon: <Building2 className="h-4 w-4" /> },
      { value: "pages", label: "Pages", icon: <FileText className="h-4 w-4" /> },
      { value: "videos", label: "Videos", icon: <Video className="h-4 w-4" /> },
    ],
  },
  {
    name: "Commerce",
    icon: <ShoppingCart className="h-4 w-4" />,
    tabs: [
      { value: "orders", label: "Orders", icon: <ShoppingCart className="h-4 w-4" /> },
      { value: "donations", label: "Donations", icon: <DollarSign className="h-4 w-4" /> },
      { value: "sync", label: "Sync", icon: <RefreshCw className="h-4 w-4" /> },
    ],
  },
  {
    name: "System",
    icon: <Settings className="h-4 w-4" />,
    tabs: [
      { value: "errors", label: "Errors", icon: <AlertCircle className="h-4 w-4" /> },
      { value: "stories", label: "Stories", icon: <BookOpen className="h-4 w-4" /> },
      { value: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

interface AdminTabNavProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export default function AdminTabNav({ activeTab, onTabChange }: AdminTabNavProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    // Start with all groups expanded that contain the active tab
    tabGroups
      .filter((group) => group.tabs.some((tab) => tab.value === activeTab))
      .map((group) => group.name)
  );

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupName)
        ? prev.filter((name) => name !== groupName)
        : [...prev, groupName]
    );
  };

  const isGroupExpanded = (groupName: string) => expandedGroups.includes(groupName);

  return (
    <div className="bg-[#5a5a5a] p-3 rounded-2xl max-w-4xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {tabGroups.map((group) => (
          <div key={group.name} className="space-y-1">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.name)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/90"
            >
              <div className="flex items-center gap-2">
                {group.icon}
                <span className="text-sm font-medium">{group.name}</span>
              </div>
              {isGroupExpanded(group.name) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {/* Group Tabs */}
            {isGroupExpanded(group.name) && (
              <div className="space-y-1 pl-2">
                {group.tabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => onTabChange(tab.value)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
                      activeTab === tab.value
                        ? "bg-white text-black font-medium"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
