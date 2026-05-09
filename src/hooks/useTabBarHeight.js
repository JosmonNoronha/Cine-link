import { useSafeAreaInsets } from "react-native-safe-area-context";

const BAR_H_MARGIN = 20;
const BAR_VERTICAL_PADDING = 4; // paddingVertical in tabsRow
const TAB_MIN_HEIGHT = 52; // minHeight of tabTouchable
const BAR_BOTTOM_OFFSET = 8; // the +8 added in FloatingTabBar

export const FLOATING_BAR_HEIGHT = TAB_MIN_HEIGHT + BAR_VERTICAL_PADDING * 2; // ~60px

export function useTabBarHeight() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  // mirrors: Math.max(insets.bottom, 10) + 8 + bar height + breathing room
  return bottomInset + BAR_BOTTOM_OFFSET + FLOATING_BAR_HEIGHT + 12;
}

export default useTabBarHeight;
