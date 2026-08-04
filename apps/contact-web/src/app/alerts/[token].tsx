import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LinkState } from "@/components/LinkState";
import { Shell, webStyles } from "@/components/Shell";
import {
  getPublicProjection,
  postPublicAction,
  type AlertProjection,
} from "@/publicApi";

type Screen = "details" | "handling" | "method";
type Method = "call" | "delegate" | "visit";

const formatTime = (value?: string | null): string =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "Chưa có";

export default function AlertPage() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [projection, setProjection] = useState<AlertProjection | null>(null);
  const [screen, setScreen] = useState<Screen>("details");
  const [method, setMethod] = useState<Method | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getPublicProjection<AlertProjection>("alerts", token)
      .then((value) => {
        setProjection(value);
        if (value.responseAction === "acknowledge") setScreen("handling");
      })
      .catch(() => setError("Không thể mở cảnh báo. Vui lòng thử lại."));
  }, [token]);

  const submit = async (action: "acknowledge" | "cannot_help" | "resolve") => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const next = await postPublicAction<AlertProjection>(
        "alerts",
        token,
        action,
      );
      setProjection(next);
      if (action === "acknowledge") setScreen("handling");
    } catch {
      setError("Hành động chưa được ghi nhận. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const terminal = projection && projection.status !== "active";
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
      {terminal ? <LinkState status={projection.status} /> : null}
      {projection?.status === "active" && screen === "details" ? (
        <View style={styles.content}>
          <Text style={webStyles.eyebrow}>
            {projection.source === "drill"
              ? "DIỄN TẬP AN TOÀN"
              : "CẢNH BÁO AN TOÀN"}
          </Text>
          <Text accessibilityRole="header" style={webStyles.title}>
            {projection.ownerDisplayName} chưa xác nhận an toàn
          </Text>
          <Text style={webStyles.body}>
            I’m Okay không nhận được xác nhận trước thời hạn. Hãy thử liên lạc
            trước và không suy diễn rằng đã xảy ra sự cố.
          </Text>
          <View style={styles.details}>
            <Detail
              label="Lần xác nhận gần nhất"
              value={formatTime(projection.lastCheckInAt)}
            />
            <Detail
              label="Thời hạn"
              value={formatTime(projection.deadlineAt)}
            />
            <Detail
              label="Bạn là"
              value={`Liên hệ ưu tiên ${projection.priority ?? "—"}`}
            />
            <Detail
              label="Mã cảnh báo"
              value={`#${projection.alertReference ?? "—"}`}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setScreen("method")}
            style={webStyles.button}
          >
            <Text style={webStyles.buttonText}>Tôi sẽ kiểm tra</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void submit("cannot_help")}
            style={webStyles.secondaryButton}
          >
            <Text style={webStyles.secondaryText}>
              Tôi không thể hỗ trợ lúc này
            </Text>
          </Pressable>
        </View>
      ) : null}
      {projection?.status === "active" && screen === "method" ? (
        <View style={styles.content}>
          <Text style={webStyles.eyebrow}>BƯỚC 1/2</Text>
          <Text accessibilityRole="header" style={webStyles.title}>
            Bạn sẽ kiểm tra bằng cách nào?
          </Text>
          <Text style={webStyles.body}>
            Chọn một hành động. Bạn có thể cập nhật kết quả ở bước tiếp theo.
          </Text>
          <Choice
            active={method === "call"}
            label="Tôi đang gọi"
            onPress={() => setMethod("call")}
          />
          <Choice
            active={method === "visit"}
            label="Tôi sẽ đến kiểm tra"
            onPress={() => setMethod("visit")}
          />
          <Choice
            active={method === "delegate"}
            label="Tôi sẽ nhờ người khác hỗ trợ"
            onPress={() => setMethod("delegate")}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !method || busy }}
            disabled={!method || busy}
            onPress={() =>
              void submit(method === "delegate" ? "cannot_help" : "acknowledge")
            }
            style={[
              webStyles.button,
              (!method || busy) && webStyles.buttonDisabled,
            ]}
          >
            <Text style={webStyles.buttonText}>Xác nhận hành động</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setScreen("details")}
            style={webStyles.secondaryButton}
          >
            <Text style={webStyles.secondaryText}>Quay lại</Text>
          </Pressable>
        </View>
      ) : null}
      {projection?.status === "active" && screen === "handling" ? (
        <View style={styles.content}>
          <Text style={webStyles.eyebrow}>ĐANG XỬ LÝ CẢNH BÁO</Text>
          <Text accessibilityRole="header" style={webStyles.title}>
            Cam kết của bạn đã được ghi nhận
          </Text>
          <Text style={webStyles.body}>
            Hãy cập nhật kết quả chính xác. Email đã gửi hoặc việc tiếp nhận
            không tự kết thúc cảnh báo.
          </Text>
          <View style={styles.details}>
            <Detail
              label="Người cần kiểm tra"
              value={projection.ownerDisplayName ?? "—"}
            />
            <Detail
              label="Bắt đầu"
              value={formatTime(projection.acknowledgedAt)}
            />
            <Detail label="Trạng thái" value="Chưa có cập nhật mới" />
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void submit("resolve")}
            style={webStyles.button}
          >
            <Text style={webStyles.buttonText}>
              {projection.ownerDisplayName} an toàn
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void submit("cannot_help")}
            style={webStyles.secondaryButton}
          >
            <Text style={webStyles.secondaryText}>
              Không liên lạc được / cần người khác hỗ trợ
            </Text>
          </Pressable>
        </View>
      ) : null}
    </Shell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function Choice({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[styles.choice, active && styles.choiceActive]}
    >
      <View style={[styles.radio, active && styles.radioActive]} />
      <Text style={styles.choiceText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: {
    alignItems: "center",
    borderColor: "#cbd5e1",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 58,
    padding: 16,
  },
  choiceActive: {
    backgroundColor: "#f0fdfa",
    borderColor: "#0f766e",
    borderWidth: 2,
  },
  choiceText: { color: "#0f172a", flex: 1, fontSize: 17, fontWeight: "600" },
  content: { gap: 18 },
  detailLabel: { color: "#64748b", fontSize: 14 },
  detailRow: { gap: 4 },
  detailValue: { color: "#0f172a", fontSize: 16, fontWeight: "600" },
  details: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    gap: 14,
    padding: 16,
  },
  radio: {
    borderColor: "#64748b",
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    width: 20,
  },
  radioActive: { backgroundColor: "#0f766e", borderColor: "#0f766e" },
});
