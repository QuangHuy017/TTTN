import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Laptop,
  Menu,
  Monitor,
  Printer,
  Projector,
  Search,
  Server,
  ShieldCheck,
  Truck,
  X,
  PackageCheck,
  ClipboardCheck,
  CalendarDays,
} from "lucide-react";
const icons = {
  arrow: ArrowRight,
  check: Check,
  verified: CheckCircle2,
  down: ChevronDown,
  left: ChevronLeft,
  right: ChevronRight,
  support: Headphones,
  laptop: Laptop,
  menu: Menu,
  monitor: Monitor,
  printer: Printer,
  projector: Projector,
  search: Search,
  server: Server,
  shield: ShieldCheck,
  truck: Truck,
  close: X,
  package: PackageCheck,
  clipboard: ClipboardCheck,
  calendar: CalendarDays,
};
export default function Icon({ name, size = 20, ...props }) {
  const Component = icons[name] || Monitor;
  return (
    <Component size={size} strokeWidth={1.8} aria-hidden="true" {...props} />
  );
}
