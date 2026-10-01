// The one icon family (PHASE 3): Lucide, rounded outline, 1.75 stroke.
// Icons are imported one file at a time so the bundle carries only the
// ~60 we use, not the whole set. Add to ICONS to use a new one — never
// mix in emoji, Material or ad-hoc SVGs.
import React from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import Armchair from 'lucide-react-native/icons/armchair';
import Bell from 'lucide-react-native/icons/bell';
import Bird from 'lucide-react-native/icons/bird';
import Camera from 'lucide-react-native/icons/camera';
import ChartColumn from 'lucide-react-native/icons/chart-column';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import CloudRain from 'lucide-react-native/icons/cloud-rain';
import Coins from 'lucide-react-native/icons/coins';
import Droplets from 'lucide-react-native/icons/droplets';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import Flame from 'lucide-react-native/icons/flame';
import Flower2 from 'lucide-react-native/icons/flower-2';
import Heart from 'lucide-react-native/icons/heart';
import House from 'lucide-react-native/icons/house';
import Image from 'lucide-react-native/icons/image';
import Images from 'lucide-react-native/icons/images';
import Info from 'lucide-react-native/icons/info';
import Lamp from 'lucide-react-native/icons/lamp';
import Landmark from 'lucide-react-native/icons/landmark';
import Leaf from 'lucide-react-native/icons/leaf';
import Library from 'lucide-react-native/icons/library';
import Lock from 'lucide-react-native/icons/lock';
import LogOut from 'lucide-react-native/icons/log-out';
import Mail from 'lucide-react-native/icons/mail';
import Moon from 'lucide-react-native/icons/moon';
import Mountain from 'lucide-react-native/icons/mountain';
import Move from 'lucide-react-native/icons/move';
import Music from 'lucide-react-native/icons/music';
import Palette from 'lucide-react-native/icons/palette';
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import Plus from 'lucide-react-native/icons/plus';
import Puzzle from 'lucide-react-native/icons/puzzle';
import Quote from 'lucide-react-native/icons/quote';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import Search from 'lucide-react-native/icons/search';
import Settings2 from 'lucide-react-native/icons/settings-2';
import Shield from 'lucide-react-native/icons/shield';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Sprout from 'lucide-react-native/icons/sprout';
import Star from 'lucide-react-native/icons/star';
import Store from 'lucide-react-native/icons/store';
import Sun from 'lucide-react-native/icons/sun';
import Timer from 'lucide-react-native/icons/timer';
import Trash from 'lucide-react-native/icons/trash';
import Trees from 'lucide-react-native/icons/trees';
import Trophy from 'lucide-react-native/icons/trophy';
import User from 'lucide-react-native/icons/user';
import Volume2 from 'lucide-react-native/icons/volume-2';
import VolumeX from 'lucide-react-native/icons/volume-x';
import Wind from 'lucide-react-native/icons/wind';
import X from 'lucide-react-native/icons/x';
import { iconSize, iconStroke } from '../theme/icons';
import { useTheme } from '../theme/ThemeContext';

export const ICONS = {
  armchair: Armchair,
  bell: Bell,
  bird: Bird,
  camera: Camera,
  chart: ChartColumn,
  check: Check,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  alert: CircleAlert,
  rain: CloudRain,
  coins: Coins,
  droplets: Droplets,
  eye: Eye,
  eyeOff: EyeOff,
  flame: Flame,
  flower: Flower2,
  heart: Heart,
  home: House,
  image: Image,
  images: Images,
  info: Info,
  lamp: Lamp,
  landmark: Landmark,
  leaf: Leaf,
  library: Library,
  lock: Lock,
  logOut: LogOut,
  mail: Mail,
  moon: Moon,
  mountain: Mountain,
  move: Move,
  music: Music,
  palette: Palette,
  pause: Pause,
  play: Play,
  plus: Plus,
  puzzle: Puzzle,
  quote: Quote,
  reset: RotateCcw,
  search: Search,
  settings: Settings2,
  shield: Shield,
  sparkles: Sparkles,
  sprout: Sprout,
  star: Star,
  store: Store,
  sun: Sun,
  timer: Timer,
  trash: Trash,
  trees: Trees,
  trophy: Trophy,
  user: User,
  volume: Volume2,
  volumeOff: VolumeX,
  wind: Wind,
  close: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;
export type IconSize = keyof typeof iconSize | number;

export interface IconProps extends Omit<LucideProps, 'size' | 'color'> {
  name: IconName;
  size?: IconSize;
  /** Colour role, or any colour string. Defaults to the muted icon ink. */
  color?: 'icon' | 'active' | 'text' | 'secondary' | 'onAccent' | 'primary' | 'success' | 'warning' | 'danger' | (string & {});
}

export function Icon({ name, size = 'md', color = 'icon', strokeWidth = iconStroke, ...rest }: IconProps) {
  const { colors } = useTheme();
  const Component = ICONS[name];
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
