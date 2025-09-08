"use client";

import React from "react";
import { Layers, PanelsLeftBottom } from "lucide-react";
import { Button } from "./ui/button";

interface NavItem {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  drawerType: string;
}

const navItems: NavItem[] = [
  { icon: PanelsLeftBottom, label: "Layouts", drawerType: "layouts" },
  { icon: Layers, label: "Frames", drawerType: "frames" },
];

interface BottomNavigationProps {
  showDrawerWithType: (type: string) => void;
}

export default function BottomNavigation({
  showDrawerWithType,
}: BottomNavigationProps) {
  return (
    <div>
      <div className="flex items-center justify-around">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Button
              key={`nav-item-${index}`}
              variant="ghost"
              className="h-auto"
              onClick={() => showDrawerWithType(item.drawerType)}
            >
              <div className="flex flex-col items-center justify-center gap-1">
                <Icon />
                {item.label}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
