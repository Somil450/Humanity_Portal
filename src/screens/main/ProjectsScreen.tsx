import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, StatusBar, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getProjects, getTasksForProject } from "../../services/projectService";
import { Project, Task } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { format, isThisWeek, isSameWeek, subWeeks } from "date-fns";
import { getAllUsers } from "../../services/authService";
import { User } from "../../types";

const PROJECT_COLORS = ["#7C3AED", "#059669", "#2563EB", "#D97706", "#DC2626", "#0891B2"];
function getProjectColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
}

export default function ProjectsScreen({ navigation }: any) {
  const { user: currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "internal" | "external">("all");

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";

  useEffect(() => { loadData(); }, [currentUser]);

  const loadData = async () => {
    try {
      const [allProjects, allUsers] = await Promise.all([
        getProjects(isAdmin ? undefined : currentUser?.uid),
        getAllUsers(),
      ]);
      setProjects(allProjects);
      setUsers(allUsers);
    } finally {
      setLoading(false);
    }
  };

  const openProject = async (project: Project) => {
    setSelectedProject(project);
    setShowDetail(true);
    const projectTasks = await getTasksForProject(project.id);
    setTasks(projectTasks);
  };

  const activeProjects = projects.filter(p => p.status !== "archived");
  const archivedProjects = projects.filter(p => p.status === "archived");
  const filteredProjects = activeFilter === "all"
    ? activeProjects
    : activeProjects.filter(p => p.type === activeFilter);

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgTasks = tasks.filter(t => t.status === "in-progress");
  const doneTasks = tasks.filter(t => t.status === "done");
  const totalTasks = tasks.length;
  const progressPct = totalTasks === 0 ? 0 : Math.round((doneTasks.length / totalTasks) * 100);
  const lastWeekDate = subWeeks(new Date(), 1);
  const doneLastWeek = doneTasks.filter(t => t.completedAt && isSameWeek(new Date(t.completedAt), lastWeekDate, { weekStartsOn: 1 })).length;
  const addedThisWeek = tasks.filter(t => t.createdAt && isThisWeek(new Date(t.createdAt), { weekStartsOn: 1 })).length;
  const urgentCount = tasks.filter(t => t.priority === "urgent" && t.status !== "done").length;
  const highCount = tasks.filter(t => t.priority === "high" && t.status !== "done").length;
  const normalCount = tasks.filter(t => (t.priority === "medium" || t.priority === "low") && t.status !== "done").length;
  const projectMembers = selectedProject ? users.filter(u => selectedProject?.members?.includes(u.uid)) : [];

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color="#C8A97E" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#060608" />

      <View style={s.header}>
        <View>
          <Text style={s.headerEyebrow}>WORKSPACE</Text>
          <Text style={s.headerTitle}>Projects</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.statsText}>{activeProjects.length} active</Text>
          {isAdmin && (
            <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate("More", { screen: "CreateProject" })}>
              <Text style={s.addBtnText}>+ New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={s.filterRow}>
        {(["all", "internal", "external"] as const).map(f => (
          <TouchableOpacity key={f} style={[s.filterTab, activeFilter === f && s.filterTabActive]} onPress={() => setActiveFilter(f)}>
            <Text style={[s.filterTabText, activeFilter === f && s.filterTabTextActive]}>{f.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
        {filteredProjects.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📁</Text>
            <Text style={s.emptyText}>No projects found.</Text>
          </View>
        ) : (
          filteredProjects.map(p => {
            const color = getProjectColor(p.name);
            return (
              <TouchableOpacity key={p.id} style={s.projectCard} onPress={() => openProject(p)} activeOpacity={0.75}>
                <View style={[s.projectAvatar, { backgroundColor: color + "22", borderColor: color + "55" }]}>
                  <Text style={[s.projectAvatarText, { color }]}>{p.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={s.projectInfo}>
                  <View style={s.projectTopRow}>
                    <Text style={s.projectName} numberOfLines={1}>{p.name}</Text>
                    <View style={[s.typeBadge, { borderColor: color + "44" }]}>
                      <Text style={[s.typeBadgeText, { color }]}>{(p.type || "OTHER").toUpperCase()}</Text>
                    </View>
                  </View>
                  {p.description ? (
                    <Text style={s.projectDesc} numberOfLines={2}>{p.description}</Text>
                  ) : (
                    <Text style={s.projectDescMuted}>No description added.</Text>
                  )}
                  <View style={s.projectMeta}>
                    <View style={s.greenDot} />
                    <Text style={s.projectMetaText}>ACTIVE</Text>
                    <Text style={s.metaDot}>·</Text>
                    <Text style={s.projectMetaText}>Since {format(new Date(p.createdAt || Date.now()), "d MMM yyyy")}</Text>
                  </View>
                </View>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            );
          })
        )}

        {archivedProjects.length > 0 && (
          <View style={s.archivedSection}>
            <Text style={s.archivedLabel}>ARCHIVED ({archivedProjects.length})</Text>
            {archivedProjects.map(p => (
              <TouchableOpacity key={p.id} style={[s.projectCard, s.projectCardArchived]} onPress={() => openProject(p)}>
                <View style={[s.projectAvatar, { backgroundColor: "#1A1A28", borderColor: "#2A2A40" }]}>
                  <Text style={[s.projectAvatarText, { color: "#555" }]}>{p.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={s.projectInfo}>
                  <Text style={[s.projectName, { color: "#555" }]} numberOfLines={1}>{p.name}</Text>
                  <Text style={s.projectDescMuted}>Archived</Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDetail(false)}>
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity style={s.backBtn} onPress={() => setShowDetail(false)}>
              <Text style={s.backBtnText}>‹ Back</Text>
            </TouchableOpacity>
            <View style={s.modalHeaderCenter}>
              <Text style={s.modalTitle} numberOfLines={1}>{selectedProject?.name}</Text>
            </View>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalContent}>
            {selectedProject && (
              <>
                <View style={s.tagsRow}>
                  <View style={s.tagActive}><Text style={s.tagActiveText}>● Active</Text></View>
                  <View style={s.tagType}><Text style={s.tagTypeText}>{(selectedProject.type || "other").toUpperCase()}</Text></View>
                </View>

                <Text style={s.detailTitle}>{selectedProject.name}</Text>
                <View style={s.metaRow}>
                  <Text style={s.metaText}>📅 Since {format(new Date(selectedProject.createdAt || Date.now()), "d MMM yyyy")}</Text>
                  <Text style={s.metaDot}>·</Text>
                  <Text style={s.metaText}>👥 {projectMembers.length} member{projectMembers.length !== 1 ? "s" : ""}</Text>
                </View>
                {selectedProject.description ? <Text style={s.detailDesc}>{selectedProject.description}</Text> : null}

                <View style={s.progressCard}>
                  <View style={s.progressHeader}>
                    <View>
                      <Text style={s.progressTitle}>📈 OVERALL PROGRESS</Text>
                      <Text style={s.progressSub}>{doneTasks.length} of {totalTasks} tasks completed</Text>
                    </View>
                    <Text style={s.progressPctText}>{progressPct}%</Text>
                  </View>
                  <View style={s.progressBarBg}>
                    <View style={[s.progressBarFill, { width: (progressPct + "%") as any }]} />
                  </View>
                  <View style={s.statusCardsRow}>
                    {[
                      { num: todoTasks.length, label: "TO DO", color: "#EF4444" },
                      { num: inProgTasks.length, label: "IN PROGRESS", color: "#3B82F6" },
                      { num: doneTasks.length, label: "DONE", color: "#22C55E" },
                    ].map(item => (
                      <View key={item.label} style={[s.statusCard, { borderColor: item.color + "33" }]}>
                        <Text style={[s.statusCardNum, { color: item.color }]}>{item.num}</Text>
                        <Text style={s.statusCardLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={s.sectionCard}>
                  <View style={s.sectionCardHeader}>
                    <Text style={s.sectionCardTitle}>👥 TEAM</Text>
                    <View style={s.memberBadge}><Text style={s.memberBadgeText}>{projectMembers.length} MEMBERS</Text></View>
                  </View>
                  {projectMembers.length === 0 ? (
                    <Text style={s.emptyMuted}>No team members assigned.</Text>
                  ) : (
                    <View style={s.teamRow}>
                      {projectMembers.map(m => (
                        <View key={m.uid} style={s.teamAvatar}><Text style={s.teamAvatarText}>{m.fullName[0]}</Text></View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={s.sectionCard}>
                  <Text style={s.sectionCardTitle}>🔥 PRIORITY BREAKDOWN</Text>
                  <View style={{ marginTop: 12, gap: 10 }}>
                    {[
                      { label: "Urgent", count: urgentCount, color: "#EF4444" },
                      { label: "High", count: highCount, color: "#F97316" },
                      { label: "Normal", count: normalCount, color: "#3B82F6" },
                    ].map(item => (
                      <View key={item.label} style={s.prioRow}>
                        <View style={[s.prioDot, { backgroundColor: item.color }]} />
                        <Text style={[s.prioLabel, { color: item.color }]}>{item.label}</Text>
                        <Text style={[s.prioVal, { color: item.color }]}>{item.count}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={s.sectionCard}>
                  <Text style={s.sectionCardTitle}>✨ WEEKLY SUMMARY</Text>
                  <View style={s.weeklyRow}>
                    <View style={s.weeklyCol}>
                      <Text style={s.weeklyColTitle}>LAST WEEK</Text>
                      <Text style={s.weeklyBigNum}>{doneLastWeek}</Text>
                      <Text style={s.weeklySub}>completed</Text>
                    </View>
                    <View style={[s.weeklyCol, { borderLeftWidth: 1, borderLeftColor: "#1A1A28" }]}>
                      <Text style={s.weeklyColTitle}>THIS WEEK</Text>
                      <Text style={s.weeklyBigNum}>{addedThisWeek}</Text>
                      <Text style={s.weeklySub}>tasks added</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={s.openWorkspaceBtn} onPress={() => { setShowDetail(false); navigation.navigate("More", { screen: "ProjectWorkspace", params: { projectId: selectedProject.id, projectName: selectedProject.name } }); }}>
                  <Text style={s.openWorkspaceBtnText}>📂 Open Full Workspace →</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060608" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#1A1A28" },
  headerEyebrow: { fontSize: 10, color: "#666", fontWeight: "800", letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontSize: 22, color: "#FFF", fontWeight: "700" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  statsText: { fontSize: 12, color: "#22C55E", fontWeight: "700" },
  addBtn: { backgroundColor: "#C8A97E", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 7 },
  addBtnText: { color: "#000", fontSize: 12, fontWeight: "800" },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1A1A28", gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#252538" },
  filterTabActive: { backgroundColor: "#C8A97E22", borderColor: "#C8A97E66" },
  filterTabText: { fontSize: 11, color: "#666", fontWeight: "700", letterSpacing: 0.5 },
  filterTabTextActive: { color: "#C8A97E" },
  listContent: { padding: 16 },
  projectCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#0D0D12", borderRadius: 12, borderWidth: 1, borderColor: "#1A1A28", padding: 14, marginBottom: 10, gap: 12 },
  projectCardArchived: { opacity: 0.5 },
  projectAvatar: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  projectAvatarText: { fontSize: 18, fontWeight: "800" },
  projectInfo: { flex: 1 },
  projectTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  projectName: { flex: 1, fontSize: 15, color: "#FFF", fontWeight: "600" },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  typeBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  projectDesc: { fontSize: 12, color: "#666", lineHeight: 17, marginBottom: 6 },
  projectDescMuted: { fontSize: 12, color: "#444", fontStyle: "italic", marginBottom: 6 },
  projectMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  greenDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#22C55E" },
  projectMetaText: { fontSize: 10, color: "#555", fontWeight: "700", letterSpacing: 0.3 },
  metaDot: { color: "#333" },
  chevron: { fontSize: 20, color: "#444" },
  archivedSection: { marginTop: 16 },
  archivedLabel: { fontSize: 10, color: "#444", fontWeight: "800", letterSpacing: 1.5, marginBottom: 10 },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: "#555", fontStyle: "italic" },
  modalContainer: { flex: 1, backgroundColor: "#060608" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1A1A28", paddingTop: 50 },
  backBtn: { width: 60 },
  backBtnText: { color: "#C8A97E", fontSize: 16, fontWeight: "600" },
  modalHeaderCenter: { flex: 1, alignItems: "center" },
  modalTitle: { fontSize: 16, color: "#FFF", fontWeight: "700" },
  modalContent: { padding: 16, paddingBottom: 40 },
  tagsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tagActive: { backgroundColor: "#052E16", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  tagActiveText: { color: "#22C55E", fontSize: 11, fontWeight: "800" },
  tagType: { backgroundColor: "#1C072C", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  tagTypeText: { color: "#A855F7", fontSize: 11, fontWeight: "800" },
  detailTitle: { fontSize: 24, color: "#FFF", fontWeight: "700", marginBottom: 10 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  metaText: { fontSize: 12, color: "#666" },
  detailDesc: { fontSize: 13, color: "#888", lineHeight: 20, marginBottom: 20, fontStyle: "italic" },
  progressCard: { backgroundColor: "#0D0D12", borderWidth: 1, borderColor: "#1A1A28", borderRadius: 12, padding: 16, marginBottom: 14 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
  progressTitle: { color: "#888", fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 4 },
  progressSub: { color: "#555", fontSize: 12 },
  progressPctText: { color: "#FFF", fontSize: 28, fontWeight: "300" },
  progressBarBg: { height: 5, backgroundColor: "#1A1A28", borderRadius: 3, marginBottom: 16 },
  progressBarFill: { height: "100%", backgroundColor: "#22C55E", borderRadius: 3 },
  statusCardsRow: { flexDirection: "row", gap: 10 },
  statusCard: { flex: 1, backgroundColor: "#0A0A0E", borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "center" },
  statusCardNum: { fontSize: 22, fontWeight: "400", marginBottom: 4 },
  statusCardLabel: { fontSize: 9, fontWeight: "800", color: "#888", letterSpacing: 0.8 },
  sectionCard: { backgroundColor: "#0D0D12", borderWidth: 1, borderColor: "#1A1A28", borderRadius: 12, padding: 16, marginBottom: 14 },
  sectionCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionCardTitle: { color: "#888", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  emptyMuted: { color: "#444", fontSize: 12, fontStyle: "italic" },
  teamRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  teamAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" },
  teamAvatarText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  memberBadge: { backgroundColor: "#1A1A28", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  memberBadgeText: { color: "#888", fontSize: 10, fontWeight: "800" },
  prioRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  prioDot: { width: 7, height: 7, borderRadius: 3.5 },
  prioLabel: { flex: 1, fontSize: 13, fontWeight: "600" },
  prioVal: { fontSize: 13, fontWeight: "700" },
  weeklyRow: { flexDirection: "row", marginTop: 14 },
  weeklyCol: { flex: 1, paddingHorizontal: 12 },
  weeklyColTitle: { color: "#22C55E", fontSize: 10, fontWeight: "800", letterSpacing: 1, marginBottom: 8 },
  weeklyBigNum: { color: "#FFF", fontSize: 26, fontWeight: "300", marginBottom: 4 },
  weeklySub: { color: "#666", fontSize: 12 },
  openWorkspaceBtn: { backgroundColor: "#C8A97E", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 8, marginBottom: 16 },
  openWorkspaceBtnText: { color: "#000", fontWeight: "800", fontSize: 14 },
});
