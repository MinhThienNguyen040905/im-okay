import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LinkState } from "@/components/LinkState";
import { Shell, webStyles } from "@/components/Shell";
import {
  getPublicProjection,
  postPublicAction,
  type InvitationProjection,
} from "@/publicApi";

export default function InvitationPage() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [projection, setProjection] = useState<InvitationProjection | null>(
    null,
  );
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getPublicProjection<InvitationProjection>("invitations", token)
      .then(setProjection)
      .catch(() => setError("Không thể mở lời mời. Vui lòng thử lại."));
  }, [token]);

  const submit = async (action: "accept" | "decline") => {
    if (!token || (action === "accept" && !consent)) return;
    setBusy(true);
    setError(null);
    try {
      setProjection(await postPublicAction("invitations", token, action));
    } catch {
      setError("Hành động chưa được ghi nhận. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      {!projection && !error ? (
        <Text accessibilityLiveRegion="polite" style={webStyles.body}>
          Đang kiểm tra liên kết…
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={webStyles.error}>
          {error}
        </Text>
      ) : null}
      {projection?.status !== "pending" && projection ? (
        <LinkState status={projection.status} />
      ) : null}
      {projection?.status === "pending" ? (
        <View style={styles.content}>
          <Text style={webStyles.eyebrow}>LỜI MỜI LIÊN HỆ TIN CẬY</Text>
          <Text accessibilityRole="header" style={webStyles.title}>
            {projection.ownerDisplayName} muốn thêm bạn vào danh sách liên hệ
            tin cậy
          </Text>
          <Text style={webStyles.body}>
            Nếu họ không xác nhận an toàn đúng hạn, bạn có thể nhận email để gọi
            hoặc đến kiểm tra.
          </Text>
          <View style={styles.list}>
            <Text style={webStyles.body}>• Nhận cảnh báo khi quá hạn.</Text>
            <Text style={webStyles.body}>• Cho biết bạn đang kiểm tra.</Text>
            <Text style={webStyles.body}>• Cập nhật khi họ an toàn.</Text>
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
            onPress={() => setConsent((value) => !value)}
            style={styles.checkboxRow}
          >
            <View
              style={[styles.checkbox, consent && styles.checkboxChecked]}
            />
            <Text style={styles.checkboxLabel}>
              Tôi hiểu trách nhiệm và đồng ý nhận email cảnh báo.
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || !consent }}
            disabled={busy || !consent}
            onPress={() => void submit("accept")}
            style={[
              webStyles.button,
              (busy || !consent) && webStyles.buttonDisabled,
            ]}
          >
            <Text style={webStyles.buttonText}>
              {busy ? "Đang gửi…" : "Chấp nhận lời mời"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void submit("decline")}
            style={webStyles.secondaryButton}
          >
            <Text style={webStyles.secondaryText}>Từ chối</Text>
          </Pressable>
        </View>
      ) : null}
    </Shell>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    borderColor: "#64748b",
    borderRadius: 5,
    borderWidth: 2,
    height: 22,
    width: 22,
  },
  checkboxChecked: { backgroundColor: "#0f766e", borderColor: "#0f766e" },
  checkboxLabel: { color: "#334155", flex: 1, fontSize: 16, lineHeight: 24 },
  checkboxRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    minHeight: 48,
    paddingVertical: 8,
  },
  content: { gap: 18 },
  list: { backgroundColor: "#f0fdfa", borderRadius: 16, gap: 6, padding: 16 },
});
