import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useFocusEffect } from "@react-navigation/native";
import { useSubscription } from "../contexts/SubscriptionContext";
import { usePaywall } from "../hooks/usePaywall";
import {
  createSharedGroup,
  createInvitation,
  getUserSharedGroups,
  getUserInvitations,
  updateInvitationStatus,
  addGroupMember,
  getUserProfile,
  saveUserProfile,
  SharedGroup,
  SharedGroupMember,
  SharedInvitation,
  cleanupOrphanedSharedData,
} from "../services/userData";
import { TourGuide } from "../components/TourGuide";
import { StandardHeader } from "../components/StandardHeader";

interface SharedFinanceScreenProps {
  navigation: any;
}

export default function SharedFinanceScreen({
  navigation,
}: SharedFinanceScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { hasPremiumAccess } = useSubscription();
  const { presentPaywall } = usePaywall();
  const [groups, setGroups] = useState<SharedGroup[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SharedGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupType, setGroupType] = useState<
    "couple" | "family" | "investment" | "business"
  >("couple");
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<SharedInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadSharedGroups();
      // Clean up any orphaned shared data
      cleanupOrphanedSharedData().catch((error) => {
        console.error("Error during cleanup:", error);
      });
    }
    if (user?.email) {
      loadInvitations();
    }
  }, [user?.uid, user?.email]);

  // Refresh groups when screen comes into focus (e.g., after deleting a group)
  useFocusEffect(
    React.useCallback(() => {
      if (user?.uid) {
        loadSharedGroups();
      }
    }, [user?.uid])
  );

  // No more real-time listeners - users will manually sync when needed

  const loadSharedGroups = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const userGroups = await getUserSharedGroups(user.uid);
      setGroups(userGroups);
    } catch (error) {
      console.error("Error loading shared groups:", error);
      Alert.alert("Error", "Failed to load shared groups");
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    if (!user?.email) return;

    try {
      setLoadingInvitations(true);
      const userInvitations = await getUserInvitations(user.email);
      setInvitations(userInvitations);
    } catch (error) {
      console.error("Error loading invitations:", error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !user?.uid) return;

    // Check if user has premium access for creating groups
    if (!hasPremiumAccess()) {
      Alert.alert(
        "Premium Feature",
        "Creating shared finance groups requires a premium subscription. Upgrade to start collaborating on your finances with family, partners, or business associates.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Upgrade",
            onPress: () => presentPaywall(),
          },
        ]
      );
      return;
    }

    try {
      // Get the user's profile to get their actual display name
      let userProfile = await getUserProfile(user.uid);

      // If no profile exists, create one with basic info
      if (!userProfile) {
        const basicProfile = {
          uid: user.uid,
          email: user.email || "",
          displayName: user.email?.split("@")[0] || "User",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        try {
          await saveUserProfile(basicProfile);
          userProfile = basicProfile;
          console.log("✅ Created basic user profile for group creation");
        } catch (error) {
          console.error("❌ Error creating basic profile:", error);
        }
      }

      const displayName =
        userProfile?.displayName || user.email?.split("@")[0] || "User";
      console.log("🔍 Using display name for group creation:", displayName);

      const newGroup: SharedGroup = {
        name: groupName.trim(),
        description: groupDescription.trim(),
        ownerId: user.uid,
        type: groupType,
        members: [
          {
            id: user.uid,
            userId: user.uid,
            displayName: displayName,
            email: user.email || "",
            role: "owner",
            joinedAt: Date.now(),
            permissions: {
              canAddTransactions: true,
              canEditTransactions: true,
              canAddAssets: true,
              canEditAssets: true,
              canAddDebts: true,
              canEditDebts: true,
              canAddGoals: true,
              canEditGoals: true,
              canInviteMembers: true,
              canRemoveMembers: true,
              canViewAllData: true,
            },
          },
        ],
        settings: {
          shareTransactions: true,
          shareAssets: true,
          shareDebts: true,
          shareGoals: true,
          shareBudgetSettings: false,
          allowMemberInvites: true,
          requireApprovalForJoining: false,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const groupId = await createSharedGroup(newGroup);

      // Set up default real-time data sharing for the group creator
      try {
        const defaultSharingSettings = {
          shareNetWorth: true,
          shareMonthlyIncome: true,
          shareMonthlyExpenses: true,
          shareTransactions: true,
          shareRecurringTransactions: true,
          shareAssets: false,
          shareDebts: false,
          shareGoals: false,
        };

        // No more automatic real-time sharing - users will manually sync when needed
        console.log(
          "✅ Group created - user can configure sharing settings when ready"
        );
      } catch (error) {
        console.error("❌ Error during group creation:", error);
        // Continue with group creation
      }

      // Reload groups to get the updated list with proper IDs
      await loadSharedGroups();

      setShowCreateModal(false);
      setGroupName("");
      setGroupDescription("");
      setGroupType("couple");
      Alert.alert("Success", "Group created successfully!");
    } catch (error) {
      console.error("Error creating group:", error);
      Alert.alert("Error", "Failed to create group. Please try again.");
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedGroup || !user?.uid) return;

    try {
      // Get the user's profile to get their actual display name
      const userProfile = await getUserProfile(user.uid);
      const inviterName =
        userProfile?.displayName || user.email?.split("@")[0] || "User";

      const invitation: SharedInvitation = {
        groupId: selectedGroup.id!,
        groupName: selectedGroup.name,
        inviterId: user.uid,
        inviterName: inviterName,
        inviteeEmail: inviteEmail.trim(),
        role: "member",
        status: "pending",
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      await createInvitation(invitation);
      setShowInviteModal(false);
      setInviteEmail("");
      setSelectedGroup(null);
      Alert.alert("Success", "Invitation sent successfully!");
    } catch (error) {
      console.error("Error sending invitation:", error);
      Alert.alert("Error", "Failed to send invitation. Please try again.");
    }
  };

  const handleInvitationResponse = async (
    invitationId: string,
    status: "accepted" | "declined"
  ) => {
    try {
      // Find the invitation to get group details
      const invitation = invitations.find((inv) => inv.id === invitationId);
      if (!invitation) {
        throw new Error("Invitation not found");
      }

      // Update invitation status first
      await updateInvitationStatus(invitationId, status);

      if (status === "accepted") {
        // Get current user's profile to create member object
        if (!user?.uid) {
          throw new Error("User not authenticated");
        }

        const userProfile = await getUserProfile(user.uid);
        if (!userProfile) {
          throw new Error("User profile not found");
        }

        // Create the member object
        const newMember: SharedGroupMember = {
          id: user.uid,
          userId: user.uid,
          displayName: userProfile.displayName || user.email || "Unknown User",
          email: user.email || "",
          role: invitation.role,
          joinedAt: Date.now(),
          permissions: {
            canAddTransactions: true,
            canEditTransactions: false,
            canAddAssets: true,
            canEditAssets: false,
            canAddDebts: true,
            canEditDebts: false,
            canAddGoals: true,
            canEditGoals: false,
            canInviteMembers: false,
            canRemoveMembers: false,
            canViewAllData: true,
          },
        };

        // Add user to the shared group
        await addGroupMember(invitation.groupId, newMember);

        // Set up default real-time data sharing for new members
        try {
          const defaultSharingSettings = {
            shareNetWorth: true,
            shareMonthlyIncome: true,
            shareMonthlyExpenses: true,
            shareTransactions: true,
            shareRecurringTransactions: true,
            shareAssets: false,
            shareDebts: false,
            shareGoals: false,
          };

          // No more automatic real-time sharing - users will manually sync when needed
          console.log(
            "✅ Member joined - they can configure sharing settings when ready"
          );
        } catch (error) {
          console.error("❌ Error during invitation acceptance:", error);
          // Continue with invitation acceptance
        }

        // Show data sharing prompt
        Alert.alert(
          "Welcome to the group!",
          "You can now configure what financial data to share with the group. Set up your sharing preferences to get started.",
          [
            {
              text: "Not Now",
              style: "cancel",
            },
            {
              text: "Configure Sharing",
              onPress: () =>
                navigation.navigate("GroupDataSharing", {
                  groupId: invitation.groupId,
                }),
            },
          ]
        );

        // Reload groups to show the new group
        await loadSharedGroups();
      }

      // Reload invitations to remove the responded one
      await loadInvitations();

      Alert.alert("Success", `Invitation ${status} successfully!`);
    } catch (error) {
      console.error("Error responding to invitation:", error);
      Alert.alert(
        "Error",
        "Failed to respond to invitation. Please try again."
      );
    }
  };

  const openGroup = (group: SharedGroup) => {
    navigation.navigate("SharedGroupDetailFixed", {
      groupId: group.id,
      onGroupDeleted: (deletedGroupId: string) => {
        // Remove the deleted group from local state immediately
        setGroups((prevGroups) =>
          prevGroups.filter((g) => g.id !== deletedGroupId)
        );
      },
      onGroupLeft: (leftGroupId: string) => {
        // Remove the group the user left from local state immediately
        setGroups((prevGroups) =>
          prevGroups.filter((g) => g.id !== leftGroupId)
        );
      },
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View
        style={[styles.emptyIcon, { backgroundColor: colors.primary + "20" }]}
      >
        <Ionicons name="people" size={48} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Start Sharing Finances
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Create a group to share net worth, income, and transactions with trusted
        people
      </Text>
      <TouchableOpacity
        style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={20} color={colors.buttonText} />
        <Text style={[styles.createButtonText, { color: colors.buttonText }]}>
          Create Your First Group
        </Text>
        {!hasPremiumAccess() && (
          <Ionicons
            name="star"
            size={16}
            color={colors.buttonText}
            style={{ marginLeft: 8 }}
          />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderGroupCard = (group: SharedGroup) => {
    const memberCount = group.members.length;
    const isOwner = group.ownerId === user?.uid;

    return (
      <TouchableOpacity
        key={group.id}
        style={[styles.groupCard, { backgroundColor: colors.surface }]}
        onPress={() => openGroup(group)}
      >
        <View style={styles.groupHeader}>
          <View style={styles.groupInfo}>
            <Text style={[styles.groupName, { color: colors.text }]}>
              {group.name}
            </Text>
            <Text
              style={[styles.groupDescription, { color: colors.textSecondary }]}
            >
              {group.description}
            </Text>
          </View>
          <View
            style={[
              styles.groupBadge,
              { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Text style={[styles.groupBadgeText, { color: colors.primary }]}>
              {group.type}
            </Text>
          </View>
        </View>

        <View style={styles.groupStats}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={16} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {memberCount} member{memberCount !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons
              name="shield-checkmark"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {isOwner ? "Owner" : "Member"}
            </Text>
          </View>
        </View>

        <View style={styles.groupActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.primary + "20" },
            ]}
            onPress={() => {
              setSelectedGroup(group);
              setShowInviteModal(true);
            }}
          >
            <Ionicons name="person-add" size={16} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              Invite
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.warning + "20" },
            ]}
            onPress={() =>
              navigation.navigate("GroupDataSharing", { groupId: group.id! })
            }
          >
            <Ionicons name="share" size={16} color={colors.warning} />
            <Text style={[styles.actionButtonText, { color: colors.warning }]}>
              Share Data
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.success + "20" },
            ]}
            onPress={() => openGroup(group)}
          >
            <Ionicons name="open" size={16} color={colors.success} />
            <Text style={[styles.actionButtonText, { color: colors.success }]}>
              Open
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <StandardHeader
        title="Shared Finances"
        onBack={() => navigation.goBack()}
        rightComponent={
          <TourGuide zone={2} screen="SharedFinance">
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                padding: 12,
                borderRadius: 12,
                marginRight: 20,
              }}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={20} color={colors.buttonText} />
              {!hasPremiumAccess() && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    backgroundColor: colors.warning,
                    borderRadius: 8,
                    width: 16,
                    height: 16,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="star" size={10} color={colors.buttonText} />
                </View>
              )}
            </TouchableOpacity>
          </TourGuide>
        }
      />

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Invitations Section */}
        {invitations.length > 0 && (
          <View style={styles.invitationsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Pending Invitations ({invitations.length})
            </Text>
            {invitations.map((invitation) => (
              <View
                key={invitation.id}
                style={[
                  styles.invitationCard,
                  { backgroundColor: colors.surface },
                ]}
              >
                <View style={styles.invitationInfo}>
                  <Text
                    style={[styles.invitationTitle, { color: colors.text }]}
                  >
                    {invitation.groupName}
                  </Text>
                  <Text
                    style={[
                      styles.invitationSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Invited by {invitation.inviterName}
                  </Text>
                  <Text
                    style={[
                      styles.invitationRole,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Role: {invitation.role}
                  </Text>
                </View>
                <View style={styles.invitationActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.success + "20" },
                    ]}
                    onPress={() =>
                      handleInvitationResponse(invitation.id!, "accepted")
                    }
                  >
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.success}
                    />
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: colors.success },
                      ]}
                    >
                      Accept
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.error + "20" },
                    ]}
                    onPress={() =>
                      handleInvitationResponse(invitation.id!, "declined")
                    }
                  >
                    <Ionicons name="close" size={16} color={colors.error} />
                    <Text
                      style={[styles.actionButtonText, { color: colors.error }]}
                    >
                      Decline
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Groups Section */}
        <TourGuide zone={3} screen="SharedFinance">
          {groups.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.groupsContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Your Groups ({groups.length})
              </Text>
              {groups.map(renderGroupCard)}
            </View>
          )}
        </TourGuide>
      </ScrollView>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Create New Group
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Group name"
              placeholderTextColor={colors.textSecondary}
              value={groupName}
              onChangeText={setGroupName}
            />

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textSecondary}
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
            />

            {/* Group Type Selector */}
            <View style={styles.typeSelectorContainer}>
              <Text style={[styles.typeSelectorLabel, { color: colors.text }]}>
                Group Type
              </Text>
              <View style={styles.typeSelectorGrid}>
                {[
                  { type: "couple", label: "Couple", icon: "heart" },
                  { type: "family", label: "Family", icon: "people" },
                  {
                    type: "investment",
                    label: "Investment",
                    icon: "trending-up",
                  },
                  { type: "business", label: "Business", icon: "business" },
                ].map((typeOption) => (
                  <TouchableOpacity
                    key={typeOption.type}
                    style={[
                      styles.typeOption,
                      {
                        backgroundColor:
                          groupType === typeOption.type
                            ? colors.primary + "20"
                            : colors.background,
                        borderColor:
                          groupType === typeOption.type
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() => setGroupType(typeOption.type as any)}
                  >
                    <Ionicons
                      name={typeOption.icon as any}
                      size={20}
                      color={
                        groupType === typeOption.type
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.typeOptionLabel,
                        {
                          color:
                            groupType === typeOption.type
                              ? colors.primary
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {typeOption.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor: groupName.trim()
                    ? colors.primary
                    : colors.border,
                  opacity: groupName.trim() ? 1 : 0.5,
                },
              ]}
              onPress={handleCreateGroup}
              disabled={!groupName.trim()}
            >
              <Text
                style={[styles.modalButtonText, { color: colors.buttonText }]}
              >
                Create Group
              </Text>
              {!hasPremiumAccess() && (
                <Ionicons
                  name="star"
                  size={16}
                  color={colors.buttonText}
                  style={{ marginLeft: 8 }}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Invite Member Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Invite Member
              </Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text
              style={[styles.modalSubtitle, { color: colors.textSecondary }]}
            >
              Invite someone to join "{selectedGroup?.name}"
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Email address"
              placeholderTextColor={colors.textSecondary}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor: inviteEmail.trim()
                    ? colors.primary
                    : colors.border,
                  opacity: inviteEmail.trim() ? 1 : 0.5,
                },
              ]}
              onPress={handleInviteMember}
              disabled={!inviteEmail.trim()}
            >
              <Text
                style={[styles.modalButtonText, { color: colors.buttonText }]}
              >
                Send Invitation
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dataSharingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  backButton: {
    marginRight: 20,
    padding: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  loadingText: {
    fontSize: 12,
    marginTop: 2,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  typeSelectorContainer: {
    marginBottom: 8,
  },
  typeSelectorLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  typeSelectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  typeOption: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  typeOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 20,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 280,
  },
  groupsContainer: {
    paddingVertical: 20,
    gap: 16,
  },
  invitationsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  invitationCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  invitationInfo: {
    marginBottom: 12,
  },
  invitationTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  invitationSubtitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  invitationRole: {
    fontSize: 12,
    fontStyle: "italic",
  },
  invitationActions: {
    flexDirection: "row",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  groupCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  groupInfo: {
    flex: 1,
    marginRight: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  groupBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  groupStats: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 20,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 14,
  },
  groupActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    gap: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  modalButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
