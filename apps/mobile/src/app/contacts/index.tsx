import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  AppIcon,
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  Screen,
} from "@/components";
import { env } from "@/config/env";
import { useAuth } from "@/features/auth/AuthProvider";
import type { AuthSession } from "@/features/auth/types";
import {
  translate,
  useI18n,
  type AppLocale,
} from "@/features/i18n/I18nProvider";
import { createTrustedContactsApi } from "@/features/trusted-contacts/api";
import {
  useResendCooldown,
  useTrustedContactsRefresh,
} from "@/features/trusted-contacts/hooks";
import {
  formatResendCooldown,
  invitationStatusCopy,
  moveContactIds,
} from "@/features/trusted-contacts/presentation";
import { trustedContactsQueryKey } from "@/features/trusted-contacts/query";
import {
  TrustedContactsApiError,
  type TrustedContact,
  type TrustedContactsSnapshot,
} from "@/features/trusted-contacts/types";
import { colors, radii, sizes, spacing, typography } from "@/theme";

const getErrorMessage = (_error: unknown, locale: AppLocale) =>
  translate(
    "contacts.requestFailed",
    "Máy chủ chưa thể xử lý yêu cầu. Danh sách chưa thay đổi.",
    {},
    locale,
  );

type ContactCardProps = {
  clockOffsetMs: number;
  contact: TrustedContact;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  mutationPending: boolean;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
  onResend: () => void;
};

const ContactCard = ({
  clockOffsetMs,
  contact,
  index,
  isFirst,
  isLast,
  mutationPending,
  onMove,
  onRemove,
  onResend,
}: ContactCardProps) => {
  const { locale, t } = useI18n();
  const status = invitationStatusCopy(contact.invitation.status, locale);
  const cooldownMs = useResendCooldown(
    contact.invitation.resendAvailableAt,
    clockOffsetMs,
  );
  const cooldown = formatResendCooldown(cooldownMs, locale);
  const canResend = ["pending", "declined", "expired"].includes(
    contact.invitation.status,
  );

  return (
    <Card>
      <View style={styles.contactHeader}>
        <View style={styles.contactCopy}>
          <View style={styles.nameRow}>
            <Text style={styles.contactName}>{contact.displayName}</Text>
            <Text style={styles.priority}>
              {t("contacts.priority", "Ưu tiên {number}", {
                number: index + 1,
              })}
            </Text>
          </View>
          <Text selectable style={styles.email}>
            {contact.email}
          </Text>
          <Badge label={status.label} variant={status.variant} />
        </View>
      </View>

      <View
        accessibilityLabel={t("contacts.reorderA11y", "Đổi thứ tự ưu tiên")}
        style={styles.orderRow}
      >
        <Pressable
          accessibilityLabel={t(
            "contacts.moveUpA11y",
            "Đưa {name} lên một bậc",
            { name: contact.displayName },
          )}
          accessibilityRole="button"
          accessibilityState={{ disabled: isFirst || mutationPending }}
          disabled={isFirst || mutationPending}
          onPress={() => onMove("up")}
          style={({ pressed }) => [
            styles.iconButton,
            (isFirst || mutationPending) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon color={colors.primary} name="arrow-upward" />
        </Pressable>
        <Pressable
          accessibilityLabel={t(
            "contacts.moveDownA11y",
            "Đưa {name} xuống một bậc",
            { name: contact.displayName },
          )}
          accessibilityRole="button"
          accessibilityState={{ disabled: isLast || mutationPending }}
          disabled={isLast || mutationPending}
          onPress={() => onMove("down")}
          style={({ pressed }) => [
            styles.iconButton,
            (isLast || mutationPending) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon color={colors.primary} name="arrow-downward" />
        </Pressable>
        <Text style={styles.orderHint}>
          {t("contacts.reorder", "Đổi thứ tự")}
        </Text>
      </View>

      {canResend ? (
        <Button
          accessibilityLabel={
            cooldown
              ? t(
                  "contacts.resendAfterA11y",
                  "Có thể gửi lại lời mời sau {time}",
                  { time: cooldown },
                )
              : t("contacts.resendA11y", "Gửi lại lời mời cho {name}", {
                  name: contact.displayName,
                })
          }
          disabled={Boolean(cooldown) || mutationPending}
          label={
            cooldown
              ? t("contacts.resendAfter", "Gửi lại sau {time}", {
                  time: cooldown,
                })
              : t("contacts.resend", "Gửi lại lời mời")
          }
          onPress={onResend}
          variant="secondary"
        />
      ) : null}

      <Button
        accessibilityLabel={t(
          "contacts.removeA11y",
          "Xóa {name} khỏi liên hệ tin cậy",
          { name: contact.displayName },
        )}
        disabled={mutationPending}
        label={t("contacts.remove", "Xóa liên hệ")}
        onPress={onRemove}
        variant="danger"
      />
    </Card>
  );
};

const ContactsContent = ({ session }: { session: AuthSession }) => {
  const { locale, t } = useI18n();
  const api = useMemo(() => createTrustedContactsApi(session), [session]);
  const queryClient = useQueryClient();
  const router = useRouter();
  const queryKey = trustedContactsQueryKey(session.user.id);
  const contactsQuery = useQuery({
    queryKey,
    queryFn: api.getContacts,
    retry: (failureCount, error) =>
      failureCount < 1 &&
      (!(error instanceof TrustedContactsApiError) || error.retryable),
  });
  const { refetch } = contactsQuery;
  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  useTrustedContactsRefresh(refresh);

  const commit = (next: TrustedContactsSnapshot) => {
    queryClient.setQueryData(queryKey, next);
    void refetch();
  };

  const reorderMutation = useMutation({
    mutationFn: api.reorderContacts,
    onSuccess: commit,
  });
  const resendMutation = useMutation({
    mutationFn: api.resendInvitation,
    onSuccess: commit,
  });
  const removeMutation = useMutation({
    mutationFn: api.removeContact,
    onSuccess: commit,
  });

  if (contactsQuery.isPending) {
    return (
      <Screen scrollable={false}>
        <LoadingState
          label={t("contacts.loading", "Đang tải liên hệ tin cậy…")}
        />
      </Screen>
    );
  }

  const snapshot = contactsQuery.data;
  if (!snapshot) {
    return (
      <Screen scrollable={false}>
        <ErrorState
          message={getErrorMessage(contactsQuery.error, locale)}
          onRetry={refresh}
          title={t(
            "contacts.serverListUnavailable",
            "Chưa có danh sách từ máy chủ",
          )}
        />
      </Screen>
    );
  }

  const contacts = [...snapshot.projection.contacts].sort(
    (left, right) => left.priority - right.priority,
  );
  const acceptedCount = contacts.filter(
    ({ invitation }) => invitation.status === "accepted",
  ).length;
  const isMutating =
    reorderMutation.isPending ||
    resendMutation.isPending ||
    removeMutation.isPending;
  const mutationError =
    reorderMutation.error ?? resendMutation.error ?? removeMutation.error;

  const confirmRemove = (contact: TrustedContact) => {
    Alert.alert(
      t("contacts.removeTitle", "Xóa {name}?", { name: contact.displayName }),
      t(
        "contacts.removeBody",
        "Liên hệ sẽ không còn nhận cảnh báo. Lời mời còn hiệu lực cũng phải được máy chủ thu hồi.",
      ),
      [
        { text: t("contacts.keep", "Giữ lại"), style: "cancel" },
        {
          text: t("contacts.remove", "Xóa liên hệ"),
          style: "destructive",
          onPress: () => removeMutation.mutate(contact.id),
        },
      ],
    );
  };

  return (
    <Screen>
      <Text style={styles.intro}>
        {t(
          "contacts.alertOrder",
          "Khi cảnh báo được kích hoạt, hệ thống sẽ liên hệ theo thứ tự dưới đây.",
        )}
      </Text>

      {env.dataMode === "fixture" ? (
        <Badge
          label={t(
            "contacts.fixtureNoEmail",
            "Dữ liệu mẫu · không gửi email thật",
          )}
          variant="warning"
        />
      ) : null}

      <Card muted>
        <View style={styles.summaryRow}>
          <Text style={styles.summary}>
            {t("contacts.readySummary", "{ready}/{total} liên hệ đã sẵn sàng", {
              ready: acceptedCount,
              total: snapshot.projection.maxContacts,
            })}
          </Text>
          <AppIcon color={colors.success} name="check-circle-outline" />
        </View>
        <View
          accessibilityLabel={t(
            "contacts.readySummaryA11y",
            "{ready} trên {total} liên hệ đã sẵn sàng",
            { ready: acceptedCount, total: snapshot.projection.maxContacts },
          )}
          accessibilityRole="progressbar"
          accessibilityValue={{
            max: snapshot.projection.maxContacts,
            min: 0,
            now: acceptedCount,
          }}
          style={styles.progressTrack}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${(acceptedCount / snapshot.projection.maxContacts) * 100}%`,
              },
            ]}
          />
        </View>
      </Card>

      {contacts.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <AppIcon color={colors.primary} name="group-add" size={32} />
          </View>
          <Text accessibilityRole="header" style={styles.emptyTitle}>
            {t("contacts.emptyTitle", "Chưa có liên hệ tin cậy")}
          </Text>
          <Text style={styles.emptyBody}>
            {t(
              "contacts.emptyBody",
              "Thêm người bạn tin tưởng. Họ chỉ được tính là sẵn sàng sau khi tự chấp nhận lời mời.",
            )}
          </Text>
        </Card>
      ) : (
        contacts.map((contact, index) => (
          <ContactCard
            clockOffsetMs={snapshot.clockOffsetMs}
            contact={contact}
            index={index}
            isFirst={index === 0}
            isLast={index === contacts.length - 1}
            key={contact.id}
            mutationPending={isMutating}
            onMove={(direction) =>
              reorderMutation.mutate(
                moveContactIds(contacts, contact.id, direction),
              )
            }
            onRemove={() => confirmRemove(contact)}
            onResend={() => resendMutation.mutate(contact.id)}
          />
        ))
      )}

      {mutationError ? (
        <Card style={styles.errorCard}>
          <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
            {getErrorMessage(mutationError, locale)}{" "}
            {t(
              "contacts.listChangesAfterConfirmation",
              "Danh sách chỉ thay đổi sau khi máy chủ xác nhận.",
            )}
          </Text>
          <Button
            accessibilityLabel={t(
              "contacts.refreshA11y",
              "Đồng bộ lại danh sách liên hệ",
            )}
            label={t("contacts.refresh", "Đồng bộ lại")}
            onPress={() => {
              reorderMutation.reset();
              resendMutation.reset();
              removeMutation.reset();
              refresh();
            }}
            variant="secondary"
          />
        </Card>
      ) : null}

      {contactsQuery.isError ? (
        <Card muted>
          <Text accessibilityLiveRegion="polite" style={styles.staleText}>
            {t(
              "contacts.listStale",
              "Chưa thể làm mới. Đây là danh sách từ lần đồng bộ gần nhất.",
            )}
          </Text>
        </Card>
      ) : null}

      <Button
        accessibilityLabel={
          contacts.length >= snapshot.projection.maxContacts
            ? t("contacts.maximumA11y", "Đã đạt tối đa 3 liên hệ")
            : t("contacts.addA11y", "Thêm liên hệ tin cậy")
        }
        disabled={
          contacts.length >= snapshot.projection.maxContacts || isMutating
        }
        label={
          contacts.length >= snapshot.projection.maxContacts
            ? t("contacts.maximum", "Đã đủ 3 liên hệ")
            : t("contacts.add", "Thêm liên hệ")
        }
        leadingIcon={<AppIcon color={colors.primary} name="add" />}
        onPress={() => router.push("/contacts/add")}
        variant="secondary"
      />

      <Card muted>
        <View style={styles.guidanceRow}>
          <AppIcon color={colors.primary} name="info-outline" />
          <Text style={styles.guidance}>
            {t(
              "contacts.guidance",
              "Nên có ít nhất hai người đã xác nhận để giảm nguy cơ bỏ lỡ cảnh báo.",
            )}
          </Text>
        </View>
      </Card>
    </Screen>
  );
};

export default function ContactsScreen() {
  const { session } = useAuth();
  if (!session) return <Redirect href="/" />;
  return <ContactsContent session={session} />;
}

const styles = StyleSheet.create({
  intro: { ...typography.bodyMedium, color: colors.textSecondary },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summary: { ...typography.label, color: colors.textPrimary },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    height: 8,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: "100%",
  },
  contactHeader: { flexDirection: "row" },
  contactCopy: { flex: 1, gap: spacing.xs },
  nameRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  contactName: { ...typography.label, color: colors.textPrimary, flex: 1 },
  priority: { ...typography.caption, color: colors.textSecondary },
  email: { ...typography.caption, color: colors.textSecondary },
  orderRow: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    height: sizes.minimumTouchTarget,
    justifyContent: "center",
    width: sizes.minimumTouchTarget,
  },
  orderHint: { ...typography.caption, color: colors.textSecondary },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  emptyCard: { alignItems: "center" },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.pill,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  emptyTitle: { ...typography.headingMedium, color: colors.textPrimary },
  emptyBody: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
  },
  errorCard: {
    backgroundColor: colors.dangerContainer,
    borderColor: colors.danger,
  },
  errorText: { ...typography.bodyMedium, color: colors.danger },
  staleText: { ...typography.bodyMedium, color: colors.textSecondary },
  guidanceRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  guidance: { ...typography.bodyMedium, color: colors.textSecondary, flex: 1 },
});
