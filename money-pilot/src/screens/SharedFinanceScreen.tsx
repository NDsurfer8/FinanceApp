import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import { useZeroLoading } from "../hooks/useZeroLoading";
import { useTheme } from "../contexts/ThemeContext";
import { StandardHeader } from "../components/StandardHeader";
import {
  getUserSharedGroups,
  getGroupAggregatedData,
  getGroupSharedData,
  createSharedGroup,
  addGroupMember,
  removeGroupMember,
  deleteSharedGroup,
  createInvitation,
  getUserInvitations,
  updateInvitationStatus,
  addUserDataToGroup,
  addSelectiveUserDataToGroup,
  getUserGroupSyncSettings,
  SharedGroup,
  SharedGroupMember,
  SharedInvitation,
} from "../services/userData";
import { ref, onValue, off } from "firebase/database";
import { db } from "../services/firebase";

interface SharedFinanceScreenProps {
  navigation: any;
}

const SharedFinanceScreen: React.FC<SharedFinanceScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { goals: userGoals, updateDataOptimistically } = useZeroLoading();
  const { colors } = useTheme();
  const [groups, setGroups] = useState<SharedGroup[]>([]);
  const [invitations, setInvitations] = useState<SharedInvitation[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SharedGroup | null>(null);
  const [groupData, setGroupData] = useState<any>(null);
  const [groupGoals, setGroupGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInvitationsModal, setShowInvitationsModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showSelectiveSyncModal, setShowSelectiveSyncModal] = useState(false);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  // Selective sync state
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [syncTransactions, setSyncTransactions] = useState(true);
  const [currentSyncSettings, setCurrentSyncSettings] = useState<any>(null);

  // Form states
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    type: "couple" as const,
  });

  // Delete group function
  const handleDeleteGroup = async (group: SharedGroup) => {
    const userId = user?.uid;
    if (!userId) return;

    // Check if user is the owner
    const isOwner = group.members.some(
      (member) => member.id === userId && member.role === "owner"
    );

    if (!isOwner) {
      Alert.alert(
        "Cannot Delete Group",
        "Only group owners can delete groups."
      );
      return;
    }

    Alert.alert(
      "Delete Group",
      `Are you sure you want to delete "${group.name}"? This action cannot be undone and will remove the group for all members.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (group.id) {
                await deleteSharedGroup(group.id, userId as string);
                Alert.alert("Success", "Group deleted successfully");
                loadData(); // Refresh the groups list
              }
            } catch (error) {
              console.error("Error deleting group:", error);
              Alert.alert("Error", "Failed to delete group. Please try again.");
            }
          },
        },
      ]
    );
  };
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "viewer">("member");

  useEffect(() => {
    loadData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadData();
        // Also refresh selected group data if one is selected
        if (selectedGroup) {
          loadGroupData(selectedGroup);
        }
      }
    }, [user]) // Removed selectedGroup dependency to prevent conflicts
  );

  // Real-time listener for selected group data
  useEffect(() => {
    if (!selectedGroup?.id) return;

    const groupDataRef = ref(db, `sharedGroups/${selectedGroup.id}/sharedData`);

    const unsubscribe = onValue(groupDataRef, async (snapshot) => {
      if (snapshot.exists()) {
        // Refresh the aggregated data when shared data changes
        try {
          const data = await getGroupAggregatedData(selectedGroup.id!);
          setGroupData(data);
        } catch (error) {
          console.error("Error refreshing group data:", error);
        }
      }
    });

    return () => {
      off(groupDataRef, "value", unsubscribe);
    };
  }, [selectedGroup?.id]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [userGroups, userInvitations] = await Promise.all([
        getUserSharedGroups(user.uid),
        getUserInvitations(user.email || ""),
      ]);
      setGroups(userGroups);
      setInvitations(userInvitations);
    } catch (error) {
      console.error("Error loading shared finance data:", error);
      Alert.alert("Error", "Failed to load shared finance data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!user) return;

    if (!newGroup.name.trim()) {
      Alert.alert("Error", "Please enter a group name");
      return;
    }

    try {
      const group: SharedGroup = {
        name: newGroup.name,
        description: newGroup.description,
        type: newGroup.type,
        ownerId: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        members: [
          {
            id: user.uid,
            userId: user.uid,
            displayName: user.displayName || "Unknown",
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
      };

      await createSharedGroup(group);
      await loadData();
      setShowCreateModal(false);
      setNewGroup({ name: "", description: "", type: "couple" });
      Alert.alert("Success", "Group created successfully!");
    } catch (error) {
      console.error("Error creating group:", error);
      Alert.alert("Error", "Failed to create group");
    }
  };

  const handleInviteMember = async () => {
    if (!selectedGroup || !user) return;

    if (!inviteEmail.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    try {
      const invitation: SharedInvitation = {
        groupId: selectedGroup.id!,
        groupName: selectedGroup.name,
        inviterId: user.uid,
        inviterName: user.displayName || "Unknown",
        inviteeEmail: inviteEmail.trim(),
        role: inviteRole,
        status: "pending",
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
      };

      await createInvitation(invitation);
      await loadData(); // Refresh the data to show the new invitation
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("member");
      Alert.alert("Success", "Invitation sent successfully!");
    } catch (error) {
      console.error("Error sending invitation:", error);
      Alert.alert("Error", "Failed to send invitation");
    }
  };

  const handleInvitationResponse = async (
    invitation: SharedInvitation,
    response: "accepted" | "declined"
  ) => {
    try {
      await updateInvitationStatus(invitation.id!, response);

      if (response === "accepted" && user) {
        // Add user to the group
        const member: SharedGroupMember = {
          id: user.uid,
          userId: user.uid,
          displayName: user.displayName || "Unknown",
          email: user.email || "",
          role: invitation.role,
          joinedAt: Date.now(),
          permissions: {
            canAddTransactions: invitation.role === "member",
            canEditTransactions: invitation.role === "member",
            canAddAssets: invitation.role === "member",
            canEditAssets: invitation.role === "member",
            canAddDebts: invitation.role === "member",
            canEditDebts: invitation.role === "member",
            canAddGoals: invitation.role === "member",
            canEditGoals: invitation.role === "member",
            canInviteMembers: false,
            canRemoveMembers: false,
            canViewAllData: true,
          },
        };

        await addGroupMember(invitation.groupId, member);
      }

      await loadData();
      Alert.alert("Success", `Invitation ${response} successfully!`);
    } catch (error) {
      console.error("Error responding to invitation:", error);
      Alert.alert("Error", "Failed to respond to invitation");
    }
  };

  const loadGroupData = async (group: SharedGroup) => {
    try {
      const data = await getGroupAggregatedData(group.id!);
      setGroupData(data);
      setSelectedGroup(group);
    } catch (error) {
      console.error("Error loading group data:", error);
      Alert.alert("Error", "Failed to load group data");
    }
  };

  const loadGroupGoals = async (groupId: string) => {
    try {
      const sharedData = await getGroupSharedData(groupId);
      setGroupGoals(sharedData.goals);
      setShowGoalsModal(true);
    } catch (error) {
      console.error("Error loading group goals:", error);
      Alert.alert("Error", "Failed to load group goals");
    }
  };

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoalId(expandedGoalId === goalId ? null : goalId);
  };

  const handleAddMonthlyContribution = async (goal: any) => {
    if (!user || !selectedGroup) return;

    try {
      // Calculate new amount by adding monthly contribution
      const newAmount = goal.currentAmount + goal.monthlyContribution;

      // Find the goal to update
      const goalToUpdate = groupGoals.find((g) => g.id === goal.id);
      if (!goalToUpdate) {
        Alert.alert("Error", "Goal not found");
        return;
      }

      // Import the updateGoal function
      const { updateGoal } = await import("../services/userData");

      // Create contribution record
      const contribution = {
        userId: user.uid,
        displayName: user.displayName || "Unknown",
        amount: goal.monthlyContribution,
        timestamp: Date.now(),
        previousAmount: goal.currentAmount,
        newAmount: newAmount,
      };

      // Initialize or update contribution history
      const contributionHistory = goal.contributionHistory || [];
      contributionHistory.push(contribution);

      const updatedGoal = {
        ...goalToUpdate,
        currentAmount: newAmount,
        updatedAt: Date.now(),
        lastUpdatedBy: {
          userId: user.uid,
          displayName: user.displayName || "Unknown",
          timestamp: Date.now(),
        },
        contributionHistory: contributionHistory,
      };

      // Update the goal in the database
      await updateGoal(updatedGoal);

      // Optimistic update - update UI immediately
      const updatedGoals = groupGoals.map((g) =>
        g.id === goal.id ? updatedGoal : g
      );
      setGroupGoals(updatedGoals);

      // Also update the local context so personal goals screen reflects the change
      const updatedUserGoals = userGoals.map((g) =>
        g.id === goal.id ? updatedGoal : g
      );
      updateDataOptimistically({ goals: updatedUserGoals });

      Alert.alert(
        "Success",
        `Added ${formatCurrency(goal.monthlyContribution)} to ${goal.name}!`
      );
    } catch (error) {
      console.error("Error updating goal:", error);
      Alert.alert("Error", "Failed to add monthly contribution");
    }
  };

  const syncUserDataToGroup = async (groupId: string) => {
    if (!user) return;

    try {
      await addUserDataToGroup(groupId, user.uid);
      Alert.alert("Success", "Your data has been synced to the group!");
      // Refresh the group data to show updated totals
      if (selectedGroup) {
        await loadGroupData(selectedGroup);
      }
    } catch (error) {
      console.error("Error syncing user data to group:", error);
      Alert.alert("Error", "Failed to sync data to group");
    }
  };

  const openSelectiveSyncModal = async (groupId: string) => {
    if (!user) return;

    try {
      // Load current sync settings
      const settings = await getUserGroupSyncSettings(groupId, user.uid);
      setCurrentSyncSettings(settings);

      // Set current selections
      if (settings) {
        setSelectedGoals(settings.goals || []);
        setSyncTransactions(settings.transactions !== false);
      } else {
        setSelectedGoals([]);
        setSyncTransactions(true);
      }

      setShowSelectiveSyncModal(true);
    } catch (error) {
      console.error("Error loading sync settings:", error);
      Alert.alert("Error", "Failed to load sync settings");
    }
  };

  const handleSelectiveSync = async () => {
    if (!user || !selectedGroup) return;

    try {
      await addSelectiveUserDataToGroup(selectedGroup.id!, user.uid, {
        goals: selectedGoals,
        transactions: syncTransactions,
      });

      Alert.alert("Success", "Selected data has been synced to the group!");
      setShowSelectiveSyncModal(false);

      // Refresh the group data
      await loadGroupData(selectedGroup);
    } catch (error) {
      console.error("Error selective syncing data to group:", error);
      Alert.alert("Error", "Failed to sync selected data to group");
    }
  };

  const toggleGoalSelection = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getGroupTypeIcon = (type: string) => {
    switch (type) {
      case "couple":
        return "heart";
      case "family":
        return "people";
      case "business":
        return "business";
      case "investment":
        return "trending-up";
      default:
        return "people";
    }
  };

  const getGroupTypeColor = (type: string) => {
    switch (type) {
      case "couple":
        return "#ec4899";
      case "family":
        return "#3b82f6";
      case "business":
        return "#10b981";
      case "investment":
        return "#f59e0b";
      default:
        return "#6b7280";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 16, color: colors.textSecondary }}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1, padding: 20 }}>
        {/* Header */}
        <StandardHeader
          title="Shared Finance"
          subtitle="Manage shared financial groups"
          onBack={() => navigation.goBack()}
        />

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: colors.primary,
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
            }}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={20} color={colors.buttonText} />
            <Text
              style={{
                color: colors.buttonText,
                fontWeight: "600",
                marginTop: 4,
              }}
            >
              Create Group
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: colors.info,
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
            }}
            onPress={() => setShowInvitationsModal(true)}
          >
            <Ionicons name="mail" size={20} color={colors.buttonText} />
            <Text
              style={{
                color: colors.buttonText,
                fontWeight: "600",
                marginTop: 4,
              }}
            >
              Invitations ({invitations.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Groups List */}
        {groups.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 40,
              alignItems: "center",
              shadowColor: colors.shadow,
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <Ionicons name="people" size={48} color={colors.textTertiary} />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.text,
                marginTop: 16,
              }}
            >
              No Shared Groups
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
                marginTop: 8,
                marginBottom: 20,
              }}
            >
              Create a shared group to start tracking finances together
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
              }}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={{ color: colors.buttonText, fontWeight: "600" }}>
                Create Group
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 20,
                padding: 24,
                marginBottom: 16,
                shadowColor: colors.shadow,
                shadowOpacity: 0.08,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 4,
              }}
              onPress={() => loadGroupData(group)}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    backgroundColor: `${getGroupTypeColor(group.type)}20`,
                    padding: 12,
                    borderRadius: 12,
                    marginRight: 16,
                  }}
                >
                  <Ionicons
                    name={getGroupTypeIcon(group.type) as any}
                    size={24}
                    color={getGroupTypeColor(group.type)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {group.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {group.type.charAt(0).toUpperCase() + group.type.slice(1)} •{" "}
                    {group.members.length} member
                    {group.members.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedGroup(group);
                      setShowInviteModal(true);
                    }}
                  >
                    <Ionicons
                      name="person-add"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                  {group.members.some(
                    (member) =>
                      member.id === user?.uid && member.role === "owner"
                  ) && (
                    <TouchableOpacity onPress={() => handleDeleteGroup(group)}>
                      <Ionicons name="trash" size={20} color="#dc2626" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {group.description && (
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    marginBottom: 16,
                  }}
                >
                  {group.description}
                </Text>
              )}

              {/* Group Stats Preview */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Members
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {group.members.length}
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Created
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {new Date(group.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Type
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {group.type.charAt(0).toUpperCase() + group.type.slice(1)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Selected Group Details */}
        {selectedGroup && groupData && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              marginTop: 16,
              shadowColor: colors.shadow,
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text
                style={{ fontSize: 20, fontWeight: "700", color: colors.text }}
              >
                {selectedGroup.name} Overview
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  onPress={() => loadGroupData(selectedGroup)}
                  style={{ marginRight: 12 }}
                >
                  <Ionicons name="refresh" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedGroup(null)}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Enhanced Group Stats Overview */}
            <View style={{ marginBottom: 24 }}>
              {/* Net Worth Card - Hero Metric */}
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  shadowColor:
                    groupData.netWorth >= 0 ? colors.success : colors.error,
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 4,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      backgroundColor:
                        groupData.netWorth >= 0
                          ? colors.successLight
                          : colors.errorLight,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    }}
                  >
                    <Ionicons
                      name={
                        groupData.netWorth >= 0
                          ? "trending-up"
                          : "trending-down"
                      }
                      size={22}
                      color={
                        groupData.netWorth >= 0 ? colors.success : colors.error
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.textSecondary,
                        fontWeight: "600",
                        marginBottom: 4,
                      }}
                    >
                      Group Net Worth
                    </Text>
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: "700",
                        color: colors.text,
                      }}
                    >
                      {formatCurrency(groupData.netWorth)}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingTop: 16,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        fontWeight: "500",
                        marginBottom: 6,
                      }}
                    >
                      Assets
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.success,
                      }}
                    >
                      {formatCurrency(groupData.totalAssets)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        fontWeight: "500",
                        marginBottom: 6,
                      }}
                    >
                      Debts
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.error,
                      }}
                    >
                      {formatCurrency(groupData.totalDebts)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Monthly Cash Flow Card */}
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  shadowColor: colors.primary,
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 4,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: colors.primaryLight,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    }}
                  >
                    <Ionicons name="cash" size={22} color={colors.primary} />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: colors.textSecondary,
                    }}
                  >
                    Monthly Cash Flow
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        fontWeight: "500",
                        marginBottom: 6,
                      }}
                    >
                      Income
                    </Text>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: colors.success,
                      }}
                    >
                      {formatCurrency(groupData.totalIncome)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        fontWeight: "500",
                        marginBottom: 6,
                      }}
                    >
                      Expenses
                    </Text>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: colors.error,
                      }}
                    >
                      {formatCurrency(groupData.totalExpenses)}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: 16,
                    borderTopWidth: 1,
                    borderTopColor: "#f3f4f6",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#6b7280",
                      fontWeight: "600",
                    }}
                  >
                    Net Monthly
                  </Text>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "700",
                      color:
                        groupData.totalIncome - groupData.totalExpenses >= 0
                          ? "#16a34a"
                          : "#dc2626",
                    }}
                  >
                    {formatCurrency(
                      groupData.totalIncome - groupData.totalExpenses
                    )}
                  </Text>
                </View>
              </View>
            </View>

            {/* Enhanced Action Buttons */}
            <View style={{ marginBottom: 24 }}>
              {/* View Group Goals Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: "#f59e0b",
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  marginBottom: 12,
                  shadowColor: "#f59e0b",
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 3,
                }}
                onPress={() => loadGroupGoals(selectedGroup.id!)}
              >
                <Ionicons name="flag" size={20} color="#fff" />
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "600",
                    fontSize: 14,
                    marginTop: 4,
                  }}
                >
                  Contribute to Group Goals ({groupData.totalGoals})
                </Text>
              </TouchableOpacity>

              {/* Selective Sync Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: "#6366f1",
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  marginBottom: 20,
                  shadowColor: "#6366f1",
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 3,
                }}
                onPress={() => openSelectiveSyncModal(selectedGroup.id!)}
              >
                <Ionicons name="sync" size={20} color="#fff" />
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "600",
                    fontSize: 14,
                    marginTop: 4,
                  }}
                >
                  Selective Sync
                </Text>
              </TouchableOpacity>
            </View>

            {/* Info Section */}
            <View
              style={{
                backgroundColor: colors.infoLight,
                borderWidth: 1,
                borderColor: colors.info,
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={colors.info}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.info,
                    marginLeft: 8,
                  }}
                >
                  Selective Data Syncing
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.text,
                  lineHeight: 18,
                  fontWeight: "500",
                }}
              >
                Choose which specific goals and data to share with this group.
                Use "Selective Sync" to customize what financial information is
                visible to group members.
              </Text>
            </View>

            {/* Members List */}
            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 12,
                }}
              >
                Members
              </Text>
              {selectedGroup.members.map((member) => (
                <View
                  key={member.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: colors.surfaceSecondary,
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: colors.textSecondary,
                      }}
                    >
                      {member.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: colors.text,
                      }}
                    >
                      {member.displayName}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {member.role.charAt(0).toUpperCase() +
                        member.role.slice(1)}
                    </Text>
                  </View>
                  {member.role === "owner" && (
                    <View
                      style={{
                        backgroundColor: "#fef3c7",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "600",
                          color: "#d97706",
                        }}
                      >
                        Owner
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              width: "90%",
              maxWidth: 400,
              padding: 24,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 20,
                color: colors.text,
              }}
            >
              Create Shared Group
            </Text>

            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Group Name *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 16,
                backgroundColor: colors.surfaceSecondary,
                color: colors.text,
              }}
              value={newGroup.name}
              onChangeText={(text) => setNewGroup({ ...newGroup, name: text })}
              placeholder="Enter group name"
              placeholderTextColor={colors.textSecondary}
            />

            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Description
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 16,
                backgroundColor: colors.surfaceSecondary,
                color: colors.text,
              }}
              value={newGroup.description}
              onChangeText={(text) =>
                setNewGroup({ ...newGroup, description: text })
              }
              placeholder="Enter description (optional)"
              placeholderTextColor={colors.textSecondary}
            />

            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Group Type
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {["couple", "family", "business", "investment"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor:
                      newGroup.type === type
                        ? getGroupTypeColor(type)
                        : colors.border,
                    backgroundColor:
                      newGroup.type === type
                        ? `${getGroupTypeColor(type)}10`
                        : colors.surface,
                    alignItems: "center",
                  }}
                  onPress={() =>
                    setNewGroup({ ...newGroup, type: type as any })
                  }
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color:
                        newGroup.type === type
                          ? getGroupTypeColor(type)
                          : colors.textSecondary,
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: colors.surfaceSecondary,
                }}
                onPress={() => setShowCreateModal(false)}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: colors.textSecondary,
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: colors.primary,
                }}
                onPress={handleCreateGroup}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: colors.buttonText,
                    fontWeight: "600",
                  }}
                >
                  Create Group
                </Text>
              </TouchableOpacity>
            </View>
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
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              width: "90%",
              maxWidth: 400,
              padding: 24,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 20,
                color: colors.text,
              }}
            >
              Invite Member
            </Text>

            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Email Address *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 16,
                backgroundColor: colors.surfaceSecondary,
                color: colors.text,
              }}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="Enter email address"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Role
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {[
                {
                  key: "member",
                  label: "Member",
                  description: "Can add/edit data",
                },
                { key: "viewer", label: "Viewer", description: "View only" },
              ].map((role) => (
                <TouchableOpacity
                  key={role.key}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor:
                      inviteRole === role.key ? colors.primary : colors.border,
                    backgroundColor:
                      inviteRole === role.key
                        ? colors.primaryLight
                        : colors.surface,
                  }}
                  onPress={() => setInviteRole(role.key as any)}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color:
                        inviteRole === role.key
                          ? colors.primary
                          : colors.textSecondary,
                    }}
                  >
                    {role.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: inviteRole === role.key ? "#6366f1" : "#9ca3af",
                      marginTop: 2,
                    }}
                  >
                    {role.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: "#f3f4f6",
                }}
                onPress={() => setShowInviteModal(false)}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: "#6b7280",
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: "#6366f1",
                }}
                onPress={handleInviteMember}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: "#fff",
                    fontWeight: "600",
                  }}
                >
                  Send Invite
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invitations Modal */}
      <Modal
        visible={showInvitationsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInvitationsModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              width: "90%",
              maxWidth: 400,
              maxHeight: "80%",
              padding: 24,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text
                style={{ fontSize: 20, fontWeight: "700", color: "#1f2937" }}
              >
                Invitations
              </Text>
              <TouchableOpacity onPress={() => setShowInvitationsModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {invitations.length === 0 ? (
              <View style={{ alignItems: "center", padding: 40 }}>
                <Ionicons name="mail" size={48} color="#d1d5db" />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#374151",
                    marginTop: 16,
                  }}
                >
                  No Pending Invitations
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#6b7280",
                    textAlign: "center",
                    marginTop: 8,
                  }}
                >
                  You don't have any pending invitations
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {invitations.map((invitation) => (
                  <View
                    key={invitation.id}
                    style={{
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      {invitation.groupName}
                    </Text>
                    <Text
                      style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}
                    >
                      Invited by {invitation.inviterName}
                    </Text>
                    <Text style={{ fontSize: 14, color: "#6b7280" }}>
                      Role:{" "}
                      {invitation.role.charAt(0).toUpperCase() +
                        invitation.role.slice(1)}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}
                    >
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </Text>

                    <View
                      style={{ flexDirection: "row", gap: 8, marginTop: 12 }}
                    >
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          padding: 8,
                          borderRadius: 6,
                          backgroundColor: "#dc2626",
                        }}
                        onPress={() =>
                          handleInvitationResponse(invitation, "declined")
                        }
                      >
                        <Text
                          style={{
                            textAlign: "center",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          Decline
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          padding: 8,
                          borderRadius: 6,
                          backgroundColor: "#16a34a",
                        }}
                        onPress={() =>
                          handleInvitationResponse(invitation, "accepted")
                        }
                      >
                        <Text
                          style={{
                            textAlign: "center",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          Accept
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Group Goals Modal */}
      <Modal
        visible={showGoalsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGoalsModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              width: "90%",
              maxWidth: 400,
              maxHeight: "85%",
              padding: 24,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text
                style={{ fontSize: 20, fontWeight: "700", color: colors.text }}
              >
                Group Goals
              </Text>
              <TouchableOpacity onPress={() => setShowGoalsModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Editable Indicator */}

            {groupGoals.length === 0 ? (
              <View style={{ alignItems: "center", padding: 40 }}>
                <Ionicons
                  name="flag-outline"
                  size={48}
                  color={colors.textTertiary}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.text,
                    marginTop: 16,
                  }}
                >
                  No Group Goals
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    textAlign: "center",
                    marginTop: 8,
                  }}
                >
                  Group members haven't shared any goals yet
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {groupGoals.map((goal, index) => {
                  const progress =
                    goal.targetAmount > 0
                      ? (goal.currentAmount / goal.targetAmount) * 100
                      : 0;

                  const getProgressColor = (progress: number) => {
                    if (progress >= 100) return "#16a34a";
                    if (progress >= 75) return "#d97706";
                    if (progress >= 50) return "#f59e0b";
                    return "#dc2626";
                  };

                  return (
                    <View
                      key={goal.id || index}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 16,
                        padding: 20,
                        marginBottom: 16,
                        backgroundColor: colors.surface,
                        shadowColor: colors.shadow,
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 12,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "700",
                            color: colors.text,
                            flex: 1,
                          }}
                        >
                          {goal.name}
                        </Text>
                        <View
                          style={{
                            backgroundColor: `${getProgressColor(progress)}20`,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 12,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "700",
                              color: getProgressColor(progress),
                            }}
                          >
                            {progress.toFixed(1)}%
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={{
                          fontSize: 15,
                          color: colors.textSecondary,
                          marginBottom: 12,
                          fontWeight: "500",
                        }}
                      >
                        {goal.category?.charAt(0).toUpperCase() +
                          goal.category?.slice(1) || "Other"}
                      </Text>

                      {/* Progress Bar */}
                      <View
                        style={{
                          height: 8,
                          backgroundColor: colors.surfaceSecondary,
                          borderRadius: 4,
                          overflow: "hidden",
                          marginBottom: 16,
                        }}
                      >
                        <View
                          style={{
                            height: "100%",
                            backgroundColor: getProgressColor(progress),
                            width: `${Math.min(progress, 100)}%`,
                          }}
                        />
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <View>
                          <Text
                            style={{
                              fontSize: 12,
                              color: colors.textSecondary,
                              marginBottom: 8,
                            }}
                          >
                            Current
                          </Text>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "700",
                              color: colors.text,
                              marginBottom: 8,
                            }}
                          >
                            {formatCurrency(goal.currentAmount)}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleAddMonthlyContribution(goal)}
                            style={{
                              backgroundColor: colors.primary,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "600",
                                color: colors.buttonText,
                              }}
                            >
                              +{formatCurrency(goal.monthlyContribution)}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View>
                          <Text
                            style={{
                              fontSize: 12,
                              color: colors.textSecondary,
                              marginBottom: 4,
                            }}
                          >
                            Target
                          </Text>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "700",
                              color: colors.text,
                            }}
                          >
                            {formatCurrency(goal.targetAmount)}
                          </Text>
                        </View>
                        <View>
                          <Text
                            style={{
                              fontSize: 12,
                              color: colors.textSecondary,
                              marginBottom: 4,
                            }}
                          >
                            Monthly
                          </Text>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "700",
                              color: "#16a34a",
                            }}
                          >
                            {formatCurrency(goal.monthlyContribution)}
                          </Text>
                        </View>
                      </View>

                      {goal.targetDate && (
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.textSecondary,
                            marginTop: 12,
                            textAlign: "center",
                            fontWeight: "500",
                          }}
                        >
                          Target Date:{" "}
                          {new Date(goal.targetDate).toLocaleDateString()}
                        </Text>
                      )}

                      <View
                        style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                        }}
                      >
                        {goal.lastUpdatedBy && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              marginBottom: 8,
                            }}
                          >
                            <Ionicons
                              name="time"
                              size={14}
                              color={colors.textTertiary}
                            />
                            <Text
                              style={{
                                fontSize: 12,
                                color: colors.textTertiary,
                                marginLeft: 6,
                                fontWeight: "500",
                              }}
                            >
                              Last updated by {goal.lastUpdatedBy.displayName}{" "}
                              on{" "}
                              {new Date(
                                goal.lastUpdatedBy.timestamp
                              ).toLocaleDateString()}
                            </Text>
                          </View>
                        )}

                        {/* Contribution History Toggle */}
                        <TouchableOpacity
                          onPress={() => toggleGoalExpansion(goal.id)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            paddingVertical: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: colors.primary,
                              marginRight: 4,
                            }}
                          >
                            {expandedGoalId === goal.id ? "Hide" : "Show"}{" "}
                            Contribution History
                          </Text>
                          <Ionicons
                            name={
                              expandedGoalId === goal.id
                                ? "chevron-up"
                                : "chevron-down"
                            }
                            size={14}
                            color={colors.primary}
                          />
                        </TouchableOpacity>

                        {/* Expanded Contribution History */}
                        {expandedGoalId === goal.id && (
                          <View style={{ marginTop: 8 }}>
                            {goal.contributionHistory &&
                            goal.contributionHistory.length > 0 ? (
                              goal.contributionHistory
                                .slice()
                                .reverse()
                                .map((contribution: any, index: number) => (
                                  <View
                                    key={index}
                                    style={{
                                      backgroundColor: colors.surfaceSecondary,
                                      padding: 12,
                                      borderRadius: 8,
                                      marginBottom: 8,
                                      borderLeftWidth: 3,
                                      borderLeftColor: colors.primary,
                                    }}
                                  >
                                    <View
                                      style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 4,
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: 14,
                                          fontWeight: "700",
                                          color: "#16a34a",
                                        }}
                                      >
                                        +{formatCurrency(contribution.amount)}
                                      </Text>
                                      <Text
                                        style={{
                                          fontSize: 11,
                                          color: colors.textSecondary,
                                        }}
                                      >
                                        {new Date(
                                          contribution.timestamp
                                        ).toLocaleDateString()}
                                      </Text>
                                    </View>
                                    <Text
                                      style={{
                                        fontSize: 12,
                                        fontWeight: "600",
                                        color: colors.text,
                                        marginBottom: 2,
                                      }}
                                    >
                                      {contribution.displayName}
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: 10,
                                        color: colors.textSecondary,
                                      }}
                                    >
                                      {new Date(
                                        contribution.timestamp
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </Text>
                                  </View>
                                ))
                            ) : (
                              <View
                                style={{
                                  padding: 16,
                                  alignItems: "center",
                                  backgroundColor: colors.surfaceSecondary,
                                  borderRadius: 8,
                                }}
                              >
                                <Ionicons
                                  name="time-outline"
                                  size={24}
                                  color={colors.textTertiary}
                                  style={{ marginBottom: 8 }}
                                />
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: colors.textSecondary,
                                    textAlign: "center",
                                  }}
                                >
                                  No contributions yet
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 10,
                                    color: colors.textTertiary,
                                    textAlign: "center",
                                    marginTop: 2,
                                  }}
                                >
                                  Tap + button to contribute
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Selective Sync Modal */}
      <Modal
        visible={showSelectiveSyncModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSelectiveSyncModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              width: "90%",
              maxWidth: 400,
              maxHeight: "85%",
              padding: 24,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text
                style={{ fontSize: 20, fontWeight: "700", color: colors.text }}
              >
                Selective Sync
              </Text>
              <TouchableOpacity
                onPress={() => setShowSelectiveSyncModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Transactions Toggle */}
              <View style={{ marginBottom: 24 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: colors.text,
                      }}
                    >
                      Share Transactions
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.textSecondary,
                      }}
                    >
                      Include your income and expenses
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSyncTransactions(!syncTransactions)}
                    style={{
                      backgroundColor: syncTransactions
                        ? colors.primary
                        : colors.border,
                      width: 48,
                      height: 24,
                      borderRadius: 12,
                      justifyContent: "center",
                      alignItems: syncTransactions ? "flex-end" : "flex-start",
                      paddingHorizontal: 2,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: colors.buttonText,
                      }}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Goals Selection */}
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.text,
                    marginBottom: 12,
                  }}
                >
                  Select Goals to Share
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    marginBottom: 16,
                  }}
                >
                  Choose which goals to share with this group
                </Text>

                {userGoals.length === 0 ? (
                  <View
                    style={{
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: 12,
                      padding: 20,
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="flag-outline"
                      size={32}
                      color={colors.textTertiary}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.textSecondary,
                        marginTop: 8,
                        textAlign: "center",
                      }}
                    >
                      No goals available to sync
                    </Text>
                  </View>
                ) : (
                  userGoals.map((goal) => (
                    <TouchableOpacity
                      key={goal.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 12,
                        borderWidth: 1,
                        borderColor: selectedGoals.includes(goal.id!)
                          ? colors.primary
                          : colors.border,
                        borderRadius: 12,
                        marginBottom: 8,
                        backgroundColor: selectedGoals.includes(goal.id!)
                          ? colors.primaryLight
                          : colors.surface,
                      }}
                      onPress={() => toggleGoalSelection(goal.id!)}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor: selectedGoals.includes(goal.id!)
                            ? colors.primary
                            : colors.border,
                          backgroundColor: selectedGoals.includes(goal.id!)
                            ? colors.primary
                            : colors.surface,
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 12,
                        }}
                      >
                        {selectedGoals.includes(goal.id!) && (
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color={colors.buttonText}
                          />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: colors.text,
                          }}
                        >
                          {goal.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.textSecondary,
                          }}
                        >
                          {goal.category} • {formatCurrency(goal.currentAmount)}{" "}
                          / {formatCurrency(goal.targetAmount)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {/* Sync Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  marginTop: 16,
                }}
                onPress={handleSelectiveSync}
              >
                <Text
                  style={{
                    color: colors.buttonText,
                    fontWeight: "600",
                    fontSize: 16,
                  }}
                >
                  Sync Selected Data
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SharedFinanceScreen;
