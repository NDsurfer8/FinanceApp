import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "react-i18next";
import { SharedGroup, removeGroupMember } from "../services/userData";
import { StandardHeader } from "../components/StandardHeader";

interface GroupMembersScreenProps {
  navigation: any;
  route: {
    params: {
      groupId: string;
      group: SharedGroup;
    };
  };
}

export default function GroupMembersScreen({
  navigation,
  route,
}: GroupMembersScreenProps) {
  const { groupId, group } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const isOwner = group?.members?.some(
    (member) => member.userId === user?.uid && member.role === "owner"
  );

  const handleRemoveMember = async (member: any) => {
    if (!user?.uid || !group) return;

    // Don't allow removing yourself
    if (member.userId === user.uid) {
      Alert.alert(
        t("group_detail.cannot_remove_self"),
        t("group_detail.cannot_remove_self_message")
      );
      return;
    }

    Alert.alert(
      t("group_detail.remove_member"),
      t("group_detail.remove_member_confirmation", {
        memberName: member.displayName,
        groupName: group.name,
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("group_detail.remove_member"),
          style: "destructive",
          onPress: async () => {
            try {
              setRemovingMember(member.userId);

              // Note: Real-time data sharing cleanup will be handled when implementing the new sync system

              // Remove the member
              await removeGroupMember(groupId, member.userId);

              Alert.alert(
                t("common.success"),
                t("group_detail.member_removed_successfully", {
                  memberName: member.displayName,
                })
              );
              navigation.goBack();
            } catch (error) {
              console.error("Error removing member:", error);
              Alert.alert(
                t("common.error"),
                t("group_detail.error_removing_member")
              );
            } finally {
              setRemovingMember(null);
            }
          },
        },
      ]
    );
  };

  const renderMember = (member: any) => (
    <View
      key={member.userId}
      style={[styles.memberCard, { backgroundColor: colors.surface }]}
    >
      <View style={styles.memberInfo}>
        <View
          style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}
        >
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {member.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberDetails}>
          <Text style={[styles.memberName, { color: colors.text }]}>
            {member.displayName}
          </Text>
          <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
            {member.role === "owner"
              ? t("group_members.owner")
              : t("group_members.member")}
          </Text>
          <Text style={[styles.memberEmail, { color: colors.textTertiary }]}>
            {member.email}
          </Text>
        </View>
      </View>

      {isOwner && member.role !== "owner" && (
        <TouchableOpacity
          style={[
            styles.removeButton,
            { backgroundColor: colors.error + "20" },
            removingMember === member.userId && { opacity: 0.5 },
          ]}
          onPress={() => handleRemoveMember(member)}
          disabled={removingMember === member.userId}
        >
          <Ionicons name="trash" size={16} color={colors.error} />
          <Text style={[styles.removeButtonText, { color: colors.error }]}>
            {removingMember === member.userId
              ? t("group_members.removing")
              : t("group_members.remove")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StandardHeader
        title={t("group_members.title")}
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.groupInfo}>
          <Text style={[styles.groupName, { color: colors.text }]}>
            {group.name}
          </Text>
          <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
            {t("group_members.members_count", {
              count: group.members?.length || 0,
            })}
          </Text>
        </View>

        <View style={styles.membersList}>
          {group.members?.map(renderMember) || (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t("group_members.no_members_found")}
              </Text>
            </View>
          )}
        </View>

        {isOwner && (
          <View style={styles.ownerNote}>
            <Ionicons name="information-circle" size={20} color={colors.info} />
            <Text style={[styles.ownerNoteText, { color: colors.info }]}>
              {t("group_members.owner_note")}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 20,
    padding: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  groupInfo: {
    alignItems: "center",
    paddingVertical: 24,
  },
  groupName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  memberCount: {
    fontSize: 16,
  },
  membersList: {
    marginBottom: 24,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "600",
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
  ownerNote: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.05)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  ownerNoteText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
});
