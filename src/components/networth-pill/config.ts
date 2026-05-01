import type { PillImages, PillColors, TextStyles, SpecialLabels, SizeConfig } from "./types"

export const PILL_IMAGES: PillImages = {
  admin: "https://www.twocents.money/pills/andi2.png",
  mod: "https://www.twocents.money/pills/mod.png",
  evil: "https://www.twocents.money/pills/evil2.png",
  news: "https://www.twocents.money/pills/news2.png",
  bronze: "https://www.twocents.money/pills/bronze2.png",
  silver: "https://www.twocents.money/pills/silver2.png",
  gold: "https://www.twocents.money/pills/gold4.png",
  platinum: "https://www.twocents.money/pills/infiniteSafe2.png",
  ultra: "https://www.twocents.money/pills/ultra.png",
  penny: "https://www.twocents.money/pills/penny.png",
  unverified: "",
}

export const PILL_COLORS: PillColors = {
  bronze: "#3F1815",
  gold: "#3D2319",
  silver: "#1F2225",
  platinum: "#002A4B",
  admin: "#07080A",
  evil: "#FF4E5A",
  mod: "#FFB34B",
  news: "#FF525B",
  unverified: "#ACC4C1",
  ultra: "#9590c4",
  penny: "#8B4513",
}

export const TEXT_STYLES: TextStyles = {
  bronze: {
    backgroundImage: "linear-gradient(180deg, #3F1815 0%, #6E3839 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  },
  gold: {
    backgroundImage: "linear-gradient(180deg, #3D2319 0%, #6D3629 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  },
  silver: {
    backgroundImage: "linear-gradient(180deg, #1F2225 0%, #38484D 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  },
  platinum: {
    backgroundImage: "linear-gradient(180deg, #002A4B 0%, #653676 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  },
  admin: {
    backgroundImage: "linear-gradient(180deg, #07080A 0%, #22272B 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  },
  evil: {
    backgroundImage: "linear-gradient(180deg, #FF4E5A 0%, #ED3341 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  },
  mod: {
    backgroundImage: "linear-gradient(180deg, #FFC294 0%, #FFB34B 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  },
  news: {
    backgroundImage: "linear-gradient(180deg, #FF7075 0%, #FF525B 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  },
  unverified: {
    color: "#ffffff",
  },
  ultra: {
    backgroundImage: "linear-gradient(180deg, #232323 0%, #1D1668 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  },
  penny: {
    color: "#3D1A08",
    textShadow: "0 0.75px 0.5px rgba(255, 255, 255, 0.20)",
  },
}

export const SPECIAL_LABELS: SpecialLabels = {
  admin: "ANDI",
  mod: "MOD",
  news: "NEWS",
  penny: "PENNY",
}

export const SIZE_CONFIG: Record<string, SizeConfig> = {
  small: {
    height: "h-8",
    text: "text-sm",
    borderWidth: 6,
    iconSize: "w-4 h-4",
    iconText: "text-xs",
  },
  default: {
    height: "h-8",
    text: "text-sm",
    borderWidth: 6,
    iconSize: "w-5 h-5",
    iconText: "text-xs",
  },
  huge: {
    height: "h-10",
    text: "text-base",
    borderWidth: 20,
    iconSize: "w-6 h-6",
    iconText: "text-base",
  },
}
