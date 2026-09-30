import { useMemo, useState, type ReactNode } from "react";
import { FlatList, StyleSheet, useWindowDimensions, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { getSwipeCardIndex } from "@/lib/swipe-cards";

export type SwipeCard = {
  key: string;
  content: ReactNode;
};

export function SwipeCardDeck({ cards }: { cards: SwipeCard[] }) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(width - 40, 280);
  const [activeIndex, setActiveIndex] = useState(0);
  const safeActiveIndex = Math.min(activeIndex, Math.max(cards.length - 1, 0));
  const pageOffsets = useMemo(() => ({ paddingHorizontal: 0 }), []);

  if (!cards.length) return null;

  return (
    <View>
      <FlatList
        data={cards}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        keyExtractor={(item) => item.key}
        contentContainerStyle={pageOffsets}
        renderItem={({ item }) => <View style={{ width: cardWidth }}>{item.content}</View>}
        onMomentumScrollEnd={(event) => {
          setActiveIndex(getSwipeCardIndex(event.nativeEvent.contentOffset.x, cardWidth, cards.length));
        }}
        getItemLayout={(_, index) => ({ length: cardWidth, offset: cardWidth * index, index })}
        accessibilityLabel="Karty s přehledem"
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
