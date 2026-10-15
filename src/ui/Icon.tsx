// The one icon family: Lucide, rounded outline. Icons are imported one file
// at a time so the bundle carries only the ones we use. Add to ICONS to use
// a new one. Game artwork is emoji and SVG (src/games/art), not icons.
import React from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import ArrowDown from 'lucide-react-native/icons/arrow-down';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ArrowUp from 'lucide-react-native/icons/arrow-up';
import Award from 'lucide-react-native/icons/award';
import Baby from 'lucide-react-native/icons/baby';
import Bell from 'lucide-react-native/icons/bell';
import Book from 'lucide-react-native/icons/book-open';
import Bone from 'lucide-react-native/icons/bone';
import Brain from 'lucide-react-native/icons/brain';
import Calendar from 'lucide-react-native/icons/calendar';
import ChartColumn from 'lucide-react-native/icons/chart-column';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import Clock from 'lucide-react-native/icons/clock';
import Cloud from 'lucide-react-native/icons/cloud';
import Compass from 'lucide-react-native/icons/compass';
import Cpu from 'lucide-react-native/icons/cpu';
import CreditCard from 'lucide-react-native/icons/credit-card';
import Crown from 'lucide-react-native/icons/crown';
import Download from 'lucide-react-native/icons/download';
import Eraser from 'lucide-react-native/icons/eraser';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import FlaskConical from 'lucide-react-native/icons/flask-conical';
import Globe from 'lucide-react-native/icons/globe';
import Grid from 'lucide-react-native/icons/layout-grid';
import Hash from 'lucide-react-native/icons/hash';
import Heart from 'lucide-react-native/icons/heart';
import HeartOff from 'lucide-react-native/icons/heart-off';
import House from 'lucide-react-native/icons/house';
import Info from 'lucide-react-native/icons/info';
import Landmark from 'lucide-react-native/icons/landmark';
import Leaf from 'lucide-react-native/icons/leaf';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import Lock from 'lucide-react-native/icons/lock';
import LogOut from 'lucide-react-native/icons/log-out';
import Mail from 'lucide-react-native/icons/mail';
import Moon from 'lucide-react-native/icons/moon';
import Palette from 'lucide-react-native/icons/palette';
import PawPrint from 'lucide-react-native/icons/paw-print';
import Pause from 'lucide-react-native/icons/pause';
import Pencil from 'lucide-react-native/icons/pencil';
import Phone from 'lucide-react-native/icons/phone';
import Play from 'lucide-react-native/icons/play';
import Plus from 'lucide-react-native/icons/plus';
import Puzzle from 'lucide-react-native/icons/puzzle';
import Rocket from 'lucide-react-native/icons/rocket';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import RotateCw from 'lucide-react-native/icons/rotate-cw';
import Scissors from 'lucide-react-native/icons/scissors';
import ScrollText from 'lucide-react-native/icons/scroll-text';
import Search from 'lucide-react-native/icons/search';
import Settings2 from 'lucide-react-native/icons/settings-2';
import Shield from 'lucide-react-native/icons/shield-check';
import Smartphone from 'lucide-react-native/icons/smartphone';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Square from 'lucide-react-native/icons/square';
import Star from 'lucide-react-native/icons/star';
import Sun from 'lucide-react-native/icons/sun';
import Timer from 'lucide-react-native/icons/timer';
import Trash from 'lucide-react-native/icons/trash';
import Trophy from 'lucide-react-native/icons/trophy';
import Undo from 'lucide-react-native/icons/undo-2';
import User from 'lucide-react-native/icons/user';
import UserPlus from 'lucide-react-native/icons/user-plus';
import Users from 'lucide-react-native/icons/users';
import Utensils from 'lucide-react-native/icons/utensils';
import Volume2 from 'lucide-react-native/icons/volume-2';
import VolumeX from 'lucide-react-native/icons/volume-x';
import Waves from 'lucide-react-native/icons/waves-horizontal';
import Wifi from 'lucide-react-native/icons/wifi';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import Wrench from 'lucide-react-native/icons/wrench';
import X from 'lucide-react-native/icons/x';
import Zap from 'lucide-react-native/icons/zap';
import { iconSize, iconStroke } from '../theme/icons';
import { useTheme } from '../theme/ThemeContext';

export const ICONS = {
  arrowDown: ArrowDown,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  arrowUp: ArrowUp,
  award: Award,
  baby: Baby,
  bell: Bell,
  book: Book,
  bone: Bone,
  brain: Brain,
  calendar: Calendar,
  chart: ChartColumn,
  check: Check,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  alert: CircleAlert,
  clock: Clock,
  cloud: Cloud,
  compass: Compass,
  cpu: Cpu,
  creditCard: CreditCard,
  crown: Crown,
  download: Download,
  eraser: Eraser,
  eye: Eye,
  eyeOff: EyeOff,
  flask: FlaskConical,
  globe: Globe,
  grid: Grid,
  hash: Hash,
  heart: Heart,
  heartOff: HeartOff,
  home: House,
  info: Info,
  landmark: Landmark,
  leaf: Leaf,
  lightbulb: Lightbulb,
  lock: Lock,
  logOut: LogOut,
  mail: Mail,
  moon: Moon,
  palette: Palette,
  paw: PawPrint,
  pause: Pause,
  pencil: Pencil,
  phone: Phone,
  play: Play,
  plus: Plus,
  puzzle: Puzzle,
  rocket: Rocket,
  reset: RotateCcw,
  rotate: RotateCw,
  scissors: Scissors,
  scroll: ScrollText,
  search: Search,
  settings: Settings2,
  shield: Shield,
  smartphone: Smartphone,
  sparkles: Sparkles,
  square: Square,
  star: Star,
  sun: Sun,
  timer: Timer,
  trash: Trash,
  trophy: Trophy,
  undo: Undo,
  user: User,
  userPlus: UserPlus,
  users: Users,
  utensils: Utensils,
  volume: Volume2,
  volumeOff: VolumeX,
  waves: Waves,
  wifi: Wifi,
  wifiOff: WifiOff,
  wrench: Wrench,
  close: X,
  zap: Zap,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;
export type IconSize = keyof typeof iconSize | number;

export interface IconProps extends Omit<LucideProps, 'size' | 'color'> {
  name: IconName;
  size?: IconSize;
  /** Colour role, or any colour string. Defaults to the muted icon ink. */
  color?: 'icon' | 'active' | 'text' | 'secondary' | 'onAccent' | 'primary' | 'success' | 'warning' | 'danger' | (string & {});
}

/** A safe lookup for icon names coming from the server (facts, categories). */
export function iconOrDefault(name: string | undefined | null, fallback: IconName = 'sparkles'): IconName {
  return name && name in ICONS ? (name as IconName) : fallback;
}

export function Icon({ name, size = 'md', color = 'icon', strokeWidth = iconStroke, ...rest }: IconProps) {
  const { colors } = useTheme();
  const Component = ICONS[name] ?? Sparkles;
  const px = typeof size === 'number' ? size : iconSize[size];
  const roles: Record<string, string> = {
    icon: colors.icon,
    active: colors.iconActive,
    text: colors.text,
    secondary: colors.textSecondary,
    onAccent: colors.textOnAccent,
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  };
  return <Component size={px} color={roles[color] ?? color} strokeWidth={strokeWidth} absoluteStrokeWidth={false} {...rest} />;
}
