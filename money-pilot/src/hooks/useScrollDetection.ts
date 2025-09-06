import { useState, useRef, useCallback } from "react";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

export const useScrollDetection = () => {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScrollBegin = useCallback(() => {
    setIsScrolling(true);

    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  }, []);

  const handleScrollEnd = useCallback(() => {
    // Set a timeout to hide the scroll state after scrolling stops
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150); // Small delay to prevent flickering
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // This can be used for more complex scroll detection if needed
      // For now, we'll rely on onScrollBeginDrag and onScrollEndDrag
    },
    []
  );

  return {
    isScrolling,
    handleScrollBegin,
    handleScrollEnd,
    handleScroll,
  };
};
