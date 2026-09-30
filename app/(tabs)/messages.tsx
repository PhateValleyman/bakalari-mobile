import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useBakalariMessages } from "@/hooks/use-bakalari-data";
import type { Message } from "@/shared/bakalari-data";

function ping() {
  if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export default function MessagesScreen() {
  const colors = useColors();
  const { data: messages, loading, refreshing, error, cacheAge, fromCache, refresh, markRead } = useBakalariMessages();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const unreadCount = messages.filter((message) => !message.read).length;
  const visibleMessages = useMemo(
    () => showUnreadOnly ? messages.filter((message) => !message.read) : messages,
    [messages, showUnreadOnly],
  );

  const openMessage = (message: Message) => {
    ping();
    setSelectedMessage(message);
    markRead(message.id);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <Pressable onPress={() => openMessage(item)} style={({ pressed }) => [styles.messageCard, { backgroundColor: colors.surface }, !item.read && { borderLeftColor: colors.primary, borderLeftWidth: 3 }, pressed && styles.pressed]}>
      <View className="flex-row items-start gap-3">
        <View className="rounded-2xl p-2" style={{ backgroundColor: item.read ? `${colors.muted}18` : `${colors.primary}18` }}>
          <IconSymbol name={item.read ? "envelope.open.fill" : "envelope.fill"} size={21} color={item.read ? colors.muted : colors.primary} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text className={`flex-1 text-base ${item.read ? "font-semibold text-foreground" : "font-bold text-foreground"}`} numberOfLines={1}>{item.title}</Text>
            {!item.read ? <View className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: colors.primary }} /> : null}
          </View>
          <Text className="mt-1 text-xs font-semibold text-primary" numberOfLines={1}>{item.senderName}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted" numberOfLines={2}>{item.text}</Text>
          <View className="mt-3 flex-row items-center justify-between gap-2"><Text className="text-[10px] font-semibold text-muted">{item.sentDate} · {item.type}</Text>{item.attachmentsCount > 0 ? <View className="flex-row items-center gap-1"><IconSymbol name="paperclip" size={13} color={colors.muted} /><Text className="text-[10px] font-semibold text-muted">{item.attachmentsCount}</Text></View> : null}</View>
        </View>
      </View>
    </Pressable>
  );

  const emptyState = loading ? (
    <View className="items-center rounded-2xl bg-surface p-6"><ActivityIndicator color={colors.primary} /><Text className="mt-3 text-sm text-muted">Načítám zprávy…</Text></View>
  ) : error ? (
    <View className="rounded-2xl bg-surface p-5"><Text className="text-sm font-bold text-foreground">Zprávy se nepodařilo načíst</Text><Text className="mt-2 text-xs leading-5 text-muted">{error}</Text><Pressable onPress={() => { ping(); refresh(); }} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}><Text className="text-sm font-bold text-primary">Zkusit znovu</Text><IconSymbol name="arrow.clockwise" size={16} color={colors.primary} /></Pressable></View>
  ) : (
    <View className="items-center rounded-2xl bg-surface p-6"><IconSymbol name="envelope.open.fill" size={30} color={colors.success} /><Text className="mt-3 text-base font-bold text-foreground">Žádné zprávy</Text><Text className="mt-1 text-center text-sm text-muted">{showUnreadOnly ? "Nemáš žádné nepřečtené zprávy." : "Přijaté zprávy Komens se zobrazí zde."}</Text></View>
  );

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <FlatList
        data={visibleMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={<View><View className="pt-3"><Text className="text-sm font-semibold text-primary">Komens</Text><View className="mt-1 flex-row items-center justify-between"><View className="flex-1"><Text className="text-3xl font-bold text-foreground">Zprávy</Text><Text className="mt-1 text-sm text-muted">Přijaté zprávy ze školy na jednom místě.</Text></View><Pressable onPress={() => { ping(); refresh(); }} style={({ pressed }) => [styles.iconButton, { backgroundColor: `${colors.primary}16` }, pressed && styles.pressed]}><IconSymbol name="arrow.clockwise" size={20} color={colors.primary} /></Pressable></View>{fromCache ? <Text className="mt-1 text-xs font-semibold text-warning">Offline cache · {cacheAge ?? "uloženo"}</Text> : null}</View><View className="mt-5 flex-row items-center justify-between rounded-3xl bg-primary p-5" style={styles.summaryCard}><View><Text className="text-xs font-bold uppercase tracking-widest" style={{ color: "#DCEAFF" }}>Nepřečtené</Text><Text className="mt-1 text-3xl font-bold text-white">{unreadCount}</Text><Text className="mt-1 text-sm" style={{ color: "#DCEAFF" }}>{unreadCount === 1 ? "nová zpráva" : "nových zpráv"}</Text></View><View className="rounded-2xl p-3" style={{ backgroundColor: "#FFFFFF22" }}><IconSymbol name="envelope.fill" size={28} color="#FFFFFF" /></View></View><View className="mb-4 mt-7 flex-row items-center justify-between"><Text className="text-xl font-bold text-foreground">Přijaté</Text><Pressable onPress={() => { ping(); setShowUnreadOnly((value) => !value); }} style={({ pressed }) => [styles.filterButton, showUnreadOnly && { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text className="text-xs font-bold" style={{ color: showUnreadOnly ? "#FFFFFF" : colors.primary }}>{showUnreadOnly ? "Všechny" : "Jen nepřečtené"}</Text></Pressable></View></View>}
        ListEmptyComponent={emptyState}
        ListFooterComponent={<Text className="mt-5 mb-4 text-center text-xs leading-5 text-muted">Stažením seznamu dolů obnovíš zprávy ze školního systému. Klepnutím otevřeš detail a zpráva se označí jako přečtená.</Text>}
      />

      <Modal visible={Boolean(selectedMessage)} transparent animationType="slide" onRequestClose={() => setSelectedMessage(null)}>
        <View style={styles.modalBackdrop}><View style={[styles.modalCard, { backgroundColor: colors.surface }]}>{selectedMessage ? <><View className="flex-row items-start justify-between gap-3"><View className="flex-1"><Text className="text-xs font-bold uppercase tracking-widest text-primary">{selectedMessage.type}</Text><Text className="mt-1 text-2xl font-bold text-foreground">{selectedMessage.title}</Text></View><Pressable onPress={() => setSelectedMessage(null)} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}><IconSymbol name="close" size={20} color={colors.muted} /></Pressable></View><View className="mt-4 flex-row items-center gap-2"><IconSymbol name="person.crop.circle" size={18} color={colors.primary} /><Text className="text-sm font-semibold text-foreground">{selectedMessage.senderName}</Text></View><Text className="mt-1 text-xs text-muted">{selectedMessage.sentDate}{selectedMessage.attachmentsCount > 0 ? ` · ${selectedMessage.attachmentsCount} příloh` : ""}</Text><View className="mt-5 rounded-2xl p-4" style={{ backgroundColor: `${colors.primary}0A` }}><Text className="text-base leading-6 text-foreground">{selectedMessage.text}</Text></View>{selectedMessage.canConfirm && !selectedMessage.confirmed ? <Pressable onPress={() => setSelectedMessage((message) => message ? { ...message, confirmed: true } : null)} style={({ pressed }) => [styles.confirmButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text className="text-sm font-bold text-white">Potvrdit přečtení</Text></Pressable> : null}</> : null}</View></View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 24 },
  summaryCard: { shadowColor: "#2F7DF6", shadowOpacity: 0.24, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  messageCard: { marginBottom: 10, borderRadius: 18, padding: 16, shadowColor: "#172033", shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  iconButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  filterButton: { borderRadius: 999, backgroundColor: "#E5EEFF", paddingHorizontal: 12, paddingVertical: 8 },
  retryButton: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E5EAF2", paddingTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000066" },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 34, minHeight: 300 },
  closeButton: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF2F8" },
  confirmButton: { marginTop: 18, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
