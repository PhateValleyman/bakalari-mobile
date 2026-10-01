import * as Haptics from "expo-haptics";
import { useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useBakalariMessages } from "@/hooks/use-bakalari-data";
import type { BakalariMessage } from "@/shared/bakalari-data";

function ping() { if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
function formatMessageDate(value: string): string { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return date.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }); }

export default function MessagesScreen() {
  const colors = useColors();
  const { data: messages, loading, refreshing, error, refresh } = useBakalariMessages();
  const [openId, setOpenId] = useState<string | null>(null);
  const unreadCount = messages.filter((message) => !message.read).length;

  const renderMessage = ({ item }: { item: BakalariMessage }) => {
    const open = openId === item.id;
    return (
      <Pressable onPress={() => { ping(); setOpenId(open ? null : item.id); }} style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: item.read ? colors.border : colors.primary }, !item.read && styles.unreadCard, pressed && styles.pressed]}>
        <View className="flex-row items-start gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: item.read ? colors.background : "#E5EEFF" }}>
            <IconSymbol name="bubble.left.fill" size={20} color={item.read ? colors.muted : colors.primary} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-start justify-between gap-2">
              <Text className={`flex-1 text-base font-bold ${item.read ? "text-foreground" : "text-primary"}`}>{item.title}</Text>
              <Text className="text-xs font-semibold text-muted">{formatMessageDate(item.sentDate)}</Text>
            </View>
            <Text className="mt-1 text-sm font-semibold text-foreground">{item.sender}</Text>
            {item.senderType ? <Text className="mt-0.5 text-xs text-muted">{item.senderType}</Text> : null}
            {!open ? <Text className="mt-2 text-sm leading-5 text-muted" numberOfLines={2}>{item.text || "Bez textu"}</Text> : <Text className="mt-3 text-sm leading-6 text-foreground">{item.text || "Bez textu"}</Text>}
            {open && item.attachments.length ? <View className="mt-3 gap-2">{item.attachments.map((attachment) => <View key={attachment.id} className="flex-row items-center gap-2 rounded-xl bg-background px-3 py-2"><IconSymbol name="paperclip" size={15} color={colors.primary} /><Text className="flex-1 text-xs font-semibold text-foreground">{attachment.name}</Text></View>)}</View> : null}
            <View className="mt-3 flex-row items-center justify-between"><Text className="text-xs font-semibold text-primary">{open ? "Skrýt zprávu" : "Otevřít zprávu"}</Text>{!item.read ? <View className="rounded-full bg-primary px-2 py-1"><Text className="text-[10px] font-bold text-white">NOVÁ</Text></View> : null}</View>
          </View>
        </View>
      </Pressable>
    );
  };

  const emptyState = loading ? <View className="items-center rounded-2xl bg-surface p-6"><ActivityIndicator color={colors.primary} /><Text className="mt-3 text-sm text-muted">Načítám zprávy…</Text></View> : error ? <View className="rounded-2xl bg-surface p-5"><Text className="text-sm font-bold text-foreground">Zprávy se nepodařilo načíst</Text><Text className="mt-2 text-xs leading-5 text-muted">{error}</Text><Pressable onPress={() => { ping(); refresh(); }} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}><Text className="text-sm font-bold text-primary">Zkusit znovu</Text><IconSymbol name="arrow.clockwise" size={16} color={colors.primary} /></Pressable></View> : <View className="items-center rounded-2xl bg-surface p-6"><IconSymbol name="bubble.left.and.bubble.right.fill" size={30} color={colors.muted} /><Text className="mt-3 text-base font-bold text-foreground">Žádné zprávy</Text><Text className="mt-1 text-center text-sm text-muted">V Komens zatím nejsou žádné přijaté zprávy.</Text></View>;

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => { ping(); refresh(); }}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<View><View className="pt-3"><View className="flex-row items-center justify-between"><View><Text className="text-sm font-semibold text-primary">Komens</Text><Text className="mt-1 text-3xl font-bold text-foreground">Zprávy</Text></View><Pressable onPress={() => { ping(); refresh(); }} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><IconSymbol name="arrow.clockwise" size={20} color={colors.primary} /></Pressable></View><Text className="mt-1 text-sm text-muted">Přijaté zprávy od školy a učitelů.</Text></View><View className="mt-6 flex-row items-center justify-between rounded-3xl bg-primary p-5" style={styles.summaryCard}><View><Text className="text-xs font-bold uppercase tracking-widest" style={{ color: "#DCEAFF" }}>Nepřečtené</Text><Text className="mt-1 text-3xl font-bold text-white">{loading ? "…" : unreadCount}</Text><Text className="mt-1 text-sm" style={{ color: "#DCEAFF" }}>{unreadCount === 1 ? "nová zpráva" : "nové zprávy"}</Text></View><View className="rounded-2xl p-3" style={{ backgroundColor: "#FFFFFF22" }}><IconSymbol name="bubble.left.and.bubble.right.fill" size={28} color="#FFFFFF" /></View></View><View className="mb-4 mt-7 flex-row items-center justify-between"><Text className="text-xl font-bold text-foreground">Doručená pošta</Text><Text className="text-xs font-semibold text-muted">{messages.length} celkem</Text></View></View>}
        ListEmptyComponent={emptyState}
        ListFooterComponent={messages.length ? <Text className="mb-4 mt-5 text-center text-xs leading-5 text-muted">Potáhni seznam dolů pro obnovení · klepnutím zprávu rozbalíš.</Text> : null}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 24 },
  card: { marginBottom: 10, borderRadius: 18, borderWidth: 1, padding: 16, shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  unreadCard: { borderWidth: 1.5 },
  summaryCard: { shadowColor: "#2F7DF6", shadowOpacity: 0.24, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#E5EEFF", alignItems: "center", justifyContent: "center" },
  retryButton: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E5EAF2", paddingTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
