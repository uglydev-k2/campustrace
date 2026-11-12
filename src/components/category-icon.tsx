import {
  Backpack,
  BookOpen,
  IdCard,
  KeyRound,
  Package,
  Shirt,
  Smartphone,
  Wallet,
  Watch,
  type LucideIcon,
} from "lucide-react";
import type { CategoryValue } from "@/lib/constants";

const ICONS: Record<CategoryValue, LucideIcon> = {
  ELECTRONICS: Smartphone,
  ID_AND_BANK_CARDS: IdCard,
  KEYS: KeyRound,
  BAGS: Backpack,
  WALLETS: Wallet,
  BOOKS_AND_NOTES: BookOpen,
  CLOTHING: Shirt,
  JEWELLERY_AND_WATCHES: Watch,
  OTHER: Package,
};

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const Icon = ICONS[category as CategoryValue] ?? Package;
  return <Icon aria-hidden className={className} strokeWidth={1.75} />;
}
