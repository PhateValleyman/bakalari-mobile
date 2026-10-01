import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FlatList, StyleSheet, useWindowDimensions, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { getSwipeCardIndex } from "@/lib/swipe-cards";

export type SwipeCard = {
  key: string;
  content: ReactNode;
};

type SwipeCardDeckProps = {
  cards: SwipeCard[];
  accessibilityLabel?: string;
};

export function SwipeCardDeck({ cards, accessibilityLabel = "Karty s přehledem" }: SwipeCardDeckProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(width - 40, 280);
  const cardStyle = useMemo(() => ({ width: cardWidth }), [cardWidth]);
  const [activeIndex, setActiveIndex] = useState(0);
  const safeActiveIndex = Math.min(activeIndex, Math.max(cards.length - 1, 0));

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(cards.length - 1, 0)));
  }, [cards.length]);

  if (!cards.length) return null;

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <FlatList
        data={cards}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        disableIntervalMomentum
        snapToAlignment="start"
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <View style={cardStyle}>{item.content}</View>}
        onMomentumScrollEnd={(event) => {
          setActiveIndex(getSwipeCardIndex(event.nativeEvent.contentOffset.x, cardWidth, cards.length));
        }}
        getItemLayout={(_, index) => ({ length: cardWidth, offset: cardWidth * index, index })}
      />
      <View style={styles.dots} accessibilityLabel={`Karta ${safeActiveIndex + 1} z ${cards.length}`}>
        {cards.map((card, index) => (
          <View key={card.key} style={[styles.dot, { backgroundColor: index === safeActiveIndex ? colors.primary : colors.border }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
