import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { getTasksForProject, getProjects, getMyTasks, updateTaskStatus, archiveTask, createTask } from '../../services/projectService';
import { Task, Project, TaskStatus, TaskPriority } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getAllUsers } from '../../services/authService';
import { User } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusColor(status: TaskStatus) {
  switch (status) {
    case 'done': return '#22C55E';
    case 'in-progress': return '#3B82F6';
    case 'review': return '#F0C040';
    default: return '#555';
  }
}

function statusBg(status: TaskStatus) {
  switch (status) {
    case 'done': return '#052E16';
    case 'in-progress': return '#0C1829';
    case 'review': return '#1C1800';
    default: return '#1A1A1A';
  }
}

function priorityColor(p: TaskPriority) {
  switch (p) {
    case 'urgent': return '#EF4444';
    case 'high': return '#F97316';
    case 'medium': return '#F0C040';
    case 'low': return '#3B82F6';
    default: return '#555';
  }
}

function formatShortDate(d?: string) {
  if (!d) return '';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

function formatShortDateTime(d?: string) {
  if (!d) return '';
  try { return format(new Date(d), 'MMM d, h:mm a'); } catch { return d; }
}

function shortId(id: string) {
  return 'P' + id.substring(0, 7).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// ─── Task Card (right pane / today's tasks view) ──────────────────────────────
function TodayTaskCard({ task, project, onStatusChange, onArchive }: {
  task: Task; project?: Project;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onArchive: (id: string) => void;
}) {
  const isDone = task.status === 'done';
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity style={[s.todayCard, isDone && s.todayCardDone]} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
      {/* Top row: checkbox + name */}
      <View style={s.todayCardTop}>
        <TouchableOpacity
          style={[s.checkbox, isDone && s.checkboxDone]}
          onPress={() => onStatusChange(task.id, isDone ? 'todo' : 'done')}
        >
          {isDone && <Text style={s.checkmark}>✓</Text>}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.todayTaskName, isDone && s.todayTaskNameDone]} numberOfLines={2}>{task.name}</Text>
          {/* Status + project tag */}
          <View style={s.todayTagRow}>
            <View style={[s.statusChip, { backgroundColor: statusBg(task.status), borderColor: statusColor(task.status) + '55' }]}>
              <Text style={[s.statusChipText, { color: statusColor(task.status) }]}>
                {task.status === 'in-progress' ? 'In Progress' : task.status === 'done' ? 'Done' : task.status === 'review' ? 'Review' : 'To Do'}
              </Text>
            </View>
            <View style={s.idChip}><Text style={s.idChipText}>ID {shortId(task.id)}</Text></View>
            {project && (
              <View style={s.projectTag}><Text style={s.projectTagText}>{project.name}</Text></View>
            )}
          </View>
        </View>
      </View>

      {/* Meta row */}
      <View style={s.todayMeta}>
        {task.dueDate && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[s.metaIcon, isOverdue && { color: '#EF4444' }]}>📅</Text>
            <Text style={[s.metaText, isOverdue && s.overdueText]}>Due {formatShortDate(task.dueDate)}</Text>
          </View>
        )}
        <Text style={s.metaText}>📎 Created: {formatShortDateTime(task.createdAt)}</Text>
        {task.completedAt && (
          <Text style={s.metaDoneText}>✓ Completed: {formatShortDateTime(task.completedAt)}</Text>
        )}
      </View>

      {/* Actions row (expanded) */}
      {expanded && (
        <View style={s.actionRow}>
          {!isDone && (
            <TouchableOpacity style={s.actionBtn} onPress={() => onStatusChange(task.id, 'in-progress')}>
              <Text style={[s.actionBtnText, { color: '#3B82F6' }]}>▶ In Progress</Text>
            </TouchableOpacity>
          )}
          {!isDone && (
            <TouchableOpacity style={s.actionBtn} onPress={() => onStatusChange(task.id, 'done')}>
              <Text style={[s.actionBtnText, { color: '#22C55E' }]}>✓ Mark Done</Text>
            </TouchableOpacity>
          )}
          {isDone && (
            <TouchableOpacity style={s.actionBtn} onPress={() => onStatusChange(task.id, 'todo')}>
              <Text style={[s.actionBtnText, { color: '#F0C040' }]}>↺ Reopen</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.actionBtn} onPress={() => onArchive(task.id)}>
            <Text style={[s.actionBtnText, { color: '#EF4444' }]}>🗃 Archive</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── To-Do Task Card (left pane) ──────────────────────────────────────────────
function TodoCard({ task, project, onStatusChange, onArchive }: {
  task: Task; project?: Project;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onArchive: (id: string) => void;
}) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity style={s.todoCard} onPress={() => setExpanded(!expanded)} activeOpacity={0.85}>
      <View style={s.todoCardTop}>
        <View style={[s.todoCheckbox, { borderColor: priorityColor(task.priority) + '88' }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.todoTaskName}>{task.name}</Text>
          {task.dueDate && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Text style={[s.metaIcon, isOverdue && { color: '#EF4444' }]}>📅</Text>
              <Text style={[s.dueLabelText, isOverdue && s.overdueText]}>
                Due {formatShortDate(task.dueDate)}
              </Text>
            </View>
          )}
          <View style={s.todoMetaRow}>
            <Text style={s.idChipText}>{shortId(task.id)}</Text>
            <Text style={s.metaDot}>·</Text>
            <Text style={s.todoMetaText}>Assigned</Text>
            <Text style={s.metaDot}>·</Text>
            <Text style={s.todoMetaText}>{formatShortDateTime(task.createdAt)}</Text>
            {project && (
              <>
                <Text style={s.metaDot}>·</Text>
                <View style={s.projectTag}><Text style={s.projectTagText}>{project.name}</Text></View>
              </>
            )}
          </View>
        </View>
      </View>
      {expanded && (
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={() => onStatusChange(task.id, 'in-progress')}>
            <Text style={[s.actionBtnText, { color: '#3B82F6' }]}>▶ Start</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => onStatusChange(task.id, 'done')}>
            <Text style={[s.actionBtnText, { color: '#22C55E' }]}>✓ Done</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => onArchive(task.id)}>
            <Text style={[s.actionBtnText, { color: '#EF4444' }]}>🗃 Archive</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════════════════════════
type Tab = 'NOTEPAD' | 'LIST' | 'KANBAN' | 'URGENT' | 'ARCHIVE';

export default function ProjectWorkspaceScreen({ route, navigation }: any) {
  const { projectId, projectName } = route.params || {};
  const { user } = useAuth();

  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('LIST');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // Create task modal
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      let tasks: Task[];
      let userProjects: Project[];
      if (projectId) {
        [tasks, userProjects] = await Promise.all([
          getTasksForProject(projectId),
          getProjects(user.uid),
        ]);
      } else {
        [tasks, userProjects] = await Promise.all([
          getMyTasks(user.uid),
          getProjects(user.uid),
        ]);
      }
      setAllTasks(tasks);
      setProjects(userProjects.filter(p => p.status === 'active'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, projectId]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  // ── Filter tasks
  const searchFiltered = allTasks.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );
  const projFiltered = projectFilter === 'all' ? searchFiltered : searchFiltered.filter(t => t.projectId === projectFilter);

  const todoTasks = projFiltered.filter(t => t.status === 'todo');
  const inProgressTasks = projFiltered.filter(t => t.status === 'in-progress');
  const doneTasks = projFiltered.filter(t => t.status === 'done');
  const reviewTasks = projFiltered.filter(t => t.status === 'review');
  const overdueTasks = projFiltered.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done');
  const todayTasks = projFiltered.filter(t => {
    if (!t.dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    const due = t.dueDate.split('T')[0];
    return today === due;
  });

  // ── Actions
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, completedAt: newStatus === 'done' ? new Date().toISOString() : t.completedAt } : t));
    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (e: any) {
      Alert.alert('Error', e.message);
      loadData();
    }
  };

  const handleArchive = async (taskId: string) => {
    if (!user) return;
    Alert.alert('Archive Task', 'Archive this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive', onPress: async () => {
          setAllTasks(prev => prev.filter(t => t.id !== taskId));
          try { await archiveTask(taskId, user.uid); } catch (e: any) { Alert.alert('Error', e.message); loadData(); }
        }
      }
    ]);
  };

  const handleAddTask = async () => {
    if (!newTaskName.trim() || !user) return;
    setAddingTask(true);
    try {
      const targetProjectId = projectId || (projectFilter !== 'all' ? projectFilter : projects[0]?.id);
      if (!targetProjectId) { Alert.alert('Select a project first.'); return; }
      await createTask({
        name: newTaskName.trim(),
        projectId: targetProjectId,
        assignees: [user.uid],
        createdBy: user.uid,
        status: 'todo',
        priority: newTaskPriority,
        dueDate: newTaskDue || undefined,
      });
      setShowAddTask(false);
      setNewTaskName(''); setNewTaskDue(''); setNewTaskPriority('medium');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setAddingTask(false);
    }
  };

  const getProject = (projectId: string) => projects.find(p => p.id === projectId);

  if (loading) {
    return <SafeAreaView style={s.container}><ActivityIndicator size="large" color="#C8A97E" style={{ flex: 1 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── TOP HEADER */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>Tasks</Text>
          <Text style={s.headerSub}>Track urgent works and priorities in one place.</Text>
        </View>
        <TouchableOpacity style={s.projectModeBtn} onPress={() => navigation.navigate('Projects')}>
          <Text style={s.projectModeBtnText}>⊞ Project Mode</Text>
        </TouchableOpacity>
      </View>

      {/* ── SEARCH + FILTER ROW */}
      <View style={s.filterRow}>
        <View style={s.searchBox}>
          <Text style={{ color: '#555', marginRight: 8 }}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search Task..."
            placeholderTextColor="#555"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={s.filterIconBtn}>
            <Text style={{ color: '#888', fontSize: 14 }}>⚙</Text>
          </TouchableOpacity>
        </View>
        {/* Project filter */}
        <View style={{ position: 'relative', zIndex: 10 }}>
          <TouchableOpacity style={s.filterDropdown} onPress={() => setShowProjectDropdown(!showProjectDropdown)}>
            <Text style={s.filterDropdownText}>
              {projectFilter === 'all' ? 'All Projects' : projects.find(p => p.id === projectFilter)?.name || 'Filter'} ▾
            </Text>
          </TouchableOpacity>
          {showProjectDropdown && (
            <View style={s.dropdownMenu}>
              <TouchableOpacity style={s.dropdownItem} onPress={() => { setProjectFilter('all'); setShowProjectDropdown(false); }}>
                <Text style={s.dropdownItemText}>All Projects</Text>
              </TouchableOpacity>
              {projects.map(p => (
                <TouchableOpacity key={p.id} style={s.dropdownItem} onPress={() => { setProjectFilter(p.id); setShowProjectDropdown(false); }}>
                  <Text style={s.dropdownItemText}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ── TABS */}
      <View style={s.tabsBar}>
        {(['NOTEPAD', 'LIST', 'KANBAN', 'URGENT', 'ARCHIVE'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && (tab === 'URGENT' ? s.tabActiveUrgent : s.tabActive)]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && (tab === 'URGENT' ? s.tabTextUrgent : s.tabTextActive)]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C8A97E" />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* LIST VIEW */}
        {activeTab === 'LIST' && (
          <View style={s.splitPane}>
            {/* LEFT: Project To-Do */}
            <View style={s.pane}>
              <View style={s.paneHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 12 }}>📋</Text>
                  <Text style={s.paneTitle}>Project To-Do</Text>
                  <Text style={s.paneFilter}>Assigned by ▾</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={s.iconBtn}><Text style={s.iconBtnText}>✎</Text></TouchableOpacity>
                  <TouchableOpacity style={s.iconBtn}><Text style={s.iconBtnText}>▿</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.addTaskBtn]} onPress={() => setShowAddTask(true)}>
                    <Text style={s.addTaskBtnText}>+ Add Tasks</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {todoTasks.length === 0 && (
                  <View style={s.emptyPane}><Text style={s.emptyPaneText}>No To-Do tasks yet.</Text></View>
                )}
                {todoTasks.map(task => (
                  <TodoCard
                    key={task.id}
                    task={task}
                    project={getProject(task.projectId)}
                    onStatusChange={handleStatusChange}
                    onArchive={handleArchive}
                  />
                ))}
              </ScrollView>
            </View>

            {/* RIGHT: Today's Tasks */}
            <View style={s.pane}>
              <View style={s.paneHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 12 }}>☑</Text>
                  <Text style={s.paneTitle}>Today's Tasks</Text>
                  <Text style={s.paneFilter}>Assigned by ▾</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={s.reopenBtn}>
                    <Text style={s.reopenBtnText}>↺ Reopen all ({allTasks.filter(t => t.status === 'done').length})</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.archiveAllBtn}>
                    <Text style={s.archiveAllBtnText}>🗃 Archive all ({allTasks.filter(t => t.status === 'done').length})</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {allTasks.filter(t => t.status === 'in-progress' || t.status === 'done').length === 0 && (
                  <View style={s.emptyPane}><Text style={s.emptyPaneText}>No active tasks today.</Text></View>
                )}
                {[...inProgressTasks, ...reviewTasks, ...doneTasks].map(task => (
                  <TodayTaskCard
                    key={task.id}
                    task={task}
                    project={getProject(task.projectId)}
                    onStatusChange={handleStatusChange}
                    onArchive={handleArchive}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* URGENT VIEW */}
        {activeTab === 'URGENT' && (
          <View style={{ padding: 16 }}>
            <View style={s.urgentHeader}>
              <Text style={s.urgentTitle}>⚡ Overdue & Urgent</Text>
              <View style={s.urgentCountBadge}><Text style={s.urgentCountText}>{overdueTasks.length}</Text></View>
            </View>
            {overdueTasks.length === 0 ? (
              <View style={s.emptyFull}><Text style={{ color: '#22C55E', fontSize: 14 }}>🎉 All clear! No overdue tasks.</Text></View>
            ) : (
              overdueTasks.map(task => (
                <TodayTaskCard key={task.id} task={task} project={getProject(task.projectId)} onStatusChange={handleStatusChange} onArchive={handleArchive} />
              ))
            )}
          </View>
        )}

        {/* NOTEPAD VIEW */}
        {activeTab === 'NOTEPAD' && (
          <View style={{ padding: 16 }}>
            <View style={s.urgentHeader}>
              <Text style={s.urgentTitle}>📝 All Tasks</Text>
              <View style={[s.urgentCountBadge, { backgroundColor: '#1A1A28', borderColor: '#333' }]}>
                <Text style={[s.urgentCountText, { color: '#AAA' }]}>{allTasks.length}</Text>
              </View>
            </View>
            {allTasks.map(task => (
              <TodayTaskCard key={task.id} task={task} project={getProject(task.projectId)} onStatusChange={handleStatusChange} onArchive={handleArchive} />
            ))}
            {allTasks.length === 0 && <View style={s.emptyFull}><Text style={s.emptyPaneText}>No tasks found.</Text></View>}
          </View>
        )}

        {/* KANBAN VIEW */}
        {activeTab === 'KANBAN' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14 }}>
            {([
              { status: 'todo' as TaskStatus, label: '📋 TO DO', tasks: todoTasks, color: '#555' },
              { status: 'in-progress' as TaskStatus, label: '▶ IN PROGRESS', tasks: inProgressTasks, color: '#3B82F6' },
              { status: 'review' as TaskStatus, label: '🔍 REVIEW', tasks: reviewTasks, color: '#F0C040' },
              { status: 'done' as TaskStatus, label: '✓ DONE', tasks: doneTasks, color: '#22C55E' },
            ]).map(col => (
              <View key={col.status} style={s.kanbanCol}>
                <View style={[s.kanbanColHeader, { borderTopColor: col.color }]}>
                  <Text style={[s.kanbanColTitle, { color: col.color }]}>{col.label}</Text>
                  <View style={[s.kanbanCountBadge, { borderColor: col.color + '44' }]}>
                    <Text style={[s.kanbanCountText, { color: col.color }]}>{col.tasks.length}</Text>
                  </View>
                </View>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {col.tasks.map(task => {
                    const proj = getProject(task.projectId);
                    return (
                      <TouchableOpacity key={task.id} style={s.kanbanCard} onPress={() => handleStatusChange(task.id, col.status === 'todo' ? 'in-progress' : col.status === 'in-progress' ? 'done' : 'todo')} activeOpacity={0.85}>
                        <Text style={s.kanbanTaskName}>{task.name}</Text>
                        {proj && <View style={[s.projectTag, { marginTop: 8 }]}><Text style={s.projectTagText}>{proj.name}</Text></View>}
                        <View style={s.kanbanMeta}>
                          <Text style={s.idChipText}>{shortId(task.id)}</Text>
                          {task.dueDate && <Text style={[s.metaText, new Date(task.dueDate) < new Date() && s.overdueText]}>📅 {formatShortDate(task.dueDate)}</Text>}
                        </View>
                        <View style={[s.priorityBar, { backgroundColor: priorityColor(task.priority) }]} />
                      </TouchableOpacity>
                    );
                  })}
                  {col.tasks.length === 0 && <View style={s.kanbanEmpty}><Text style={s.emptyPaneText}>Empty</Text></View>}
                </ScrollView>
              </View>
            ))}
          </ScrollView>
        )}

        {/* ARCHIVE VIEW */}
        {activeTab === 'ARCHIVE' && (
          <View style={{ padding: 16 }}>
            <View style={s.urgentHeader}>
              <Text style={[s.urgentTitle, { color: '#888' }]}>🗃 Archived Tasks</Text>
            </View>
            <View style={s.emptyFull}><Text style={s.emptyPaneText}>No archived tasks in this view.</Text></View>
          </View>
        )}
      </ScrollView>

      {/* ── ADD TASK MODAL */}
      <Modal visible={showAddTask} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>+ Add Task</Text>
              <TouchableOpacity onPress={() => setShowAddTask(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={s.fieldLabel}>TASK NAME *</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="Enter task name..."
                placeholderTextColor="#444"
                value={newTaskName}
                onChangeText={setNewTaskName}
              />
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>PRIORITY</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[s.priorityOption, { borderColor: priorityColor(p) + '66' }, newTaskPriority === p && { backgroundColor: priorityColor(p) + '22' }]}
                    onPress={() => setNewTaskPriority(p)}
                  >
                    <Text style={[s.priorityOptionText, { color: priorityColor(p) }]}>{p.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>DUE DATE (YYYY-MM-DD)</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="2026-08-01"
                placeholderTextColor="#444"
                value={newTaskDue}
                onChangeText={setNewTaskDue}
              />
            </ScrollView>
            <View style={s.modalFooter}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAddTask(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.addBtn, addingTask && { opacity: 0.6 }]} onPress={handleAddTask} disabled={addingTask}>
                <Text style={s.addBtnText}>{addingTask ? 'Adding...' : '+ Add Task'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060608' },

  // ── Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  headerLeft: {},
  headerTitle: { fontSize: 28, color: '#FFF', fontWeight: '300' },
  headerSub: { fontSize: 11, color: '#555', marginTop: 3 },
  projectModeBtn: { backgroundColor: '#1A1A28', borderWidth: 1, borderColor: '#252540', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  projectModeBtnText: { color: '#888', fontSize: 12, fontWeight: '700' },

  // ── Filter row
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#111' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0D12', borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, color: '#DDD', fontSize: 13 },
  filterIconBtn: { padding: 4 },
  filterDropdown: { backgroundColor: '#0D0D12', borderWidth: 1, borderColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  filterDropdownText: { color: '#888', fontSize: 12 },
  dropdownMenu: { position: 'absolute', top: 44, right: 0, backgroundColor: '#0D0D12', borderWidth: 1, borderColor: '#1A1A28', borderRadius: 8, zIndex: 100, minWidth: 160 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111' },
  dropdownItemText: { color: '#DDD', fontSize: 13 },

  // ── Tabs
  tabsBar: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', backgroundColor: '#060608' },
  tab: { paddingVertical: 12, marginRight: 4, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#C8A97E' },
  tabActiveUrgent: { borderBottomColor: '#00D2CC', backgroundColor: '#00D2CC11', borderRadius: 6 },
  tabText: { color: '#555', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  tabTextActive: { color: '#C8A97E' },
  tabTextUrgent: { color: '#00D2CC' },

  // ── Split pane
  splitPane: { flexDirection: 'row', flex: 1, padding: 14, gap: 14, minHeight: 600 },
  pane: { flex: 1, backgroundColor: '#0D0D12', borderRadius: 12, borderWidth: 1, borderColor: '#1A1A28', overflow: 'hidden' },
  paneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', flexWrap: 'wrap', gap: 8 },
  paneTitle: { fontSize: 13, color: '#FFF', fontWeight: '700' },
  paneFilter: { fontSize: 11, color: '#555', fontWeight: '600' },
  iconBtn: { backgroundColor: '#1A1A1A', padding: 6, borderRadius: 6 },
  iconBtnText: { color: '#888', fontSize: 12 },
  addTaskBtn: { backgroundColor: '#0D0D12', borderWidth: 1, borderColor: '#C8A97E44', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  addTaskBtnText: { color: '#C8A97E', fontSize: 11, fontWeight: '700' },
  reopenBtn: { backgroundColor: '#0C1829', borderWidth: 1, borderColor: '#3B82F633', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  reopenBtnText: { color: '#60A5FA', fontSize: 10, fontWeight: '700' },
  archiveAllBtn: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#33333344', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  archiveAllBtnText: { color: '#888', fontSize: 10, fontWeight: '700' },

  emptyPane: { padding: 24, alignItems: 'center' },
  emptyPaneText: { color: '#555', fontSize: 12, fontStyle: 'italic' },

  // ── To-Do Card
  todoCard: { margin: 10, padding: 14, backgroundColor: '#0A0A0E', borderRadius: 10, borderWidth: 1, borderColor: '#1A1A28' },
  todoCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  todoCheckbox: { width: 16, height: 16, borderRadius: 3, borderWidth: 1.5, marginTop: 2, flexShrink: 0 },
  todoTaskName: { fontSize: 14, color: '#E0E0E0', fontWeight: '500', lineHeight: 20 },
  dueLabelText: { fontSize: 11, color: '#888' },
  todoMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 5, flexWrap: 'wrap' },
  todoMetaText: { fontSize: 10, color: '#666' },
  metaDot: { color: '#444', fontSize: 10 },

  // ── Today Task Card
  todayCard: { marginHorizontal: 10, marginTop: 10, padding: 14, backgroundColor: '#0A0A0E', borderRadius: 10, borderWidth: 1, borderColor: '#1A1A28' },
  todayCardDone: { opacity: 0.65 },
  todayCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#333', alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  checkboxDone: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  checkmark: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  todayTaskName: { fontSize: 14, color: '#E0E0E0', fontWeight: '500', lineHeight: 20 },
  todayTaskNameDone: { textDecorationLine: 'line-through', color: '#666' },
  todayTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  todayMeta: { marginTop: 10, gap: 4, paddingLeft: 28 },
  metaIcon: { fontSize: 11, color: '#666' },
  metaText: { fontSize: 11, color: '#666' },
  overdueText: { color: '#EF4444', fontWeight: '700' },
  metaDoneText: { fontSize: 11, color: '#22C55E' },

  // ── Chips
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  statusChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  idChip: { backgroundColor: '#1A1A28', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  idChipText: { fontSize: 10, color: '#666', fontWeight: '700' },
  projectTag: { backgroundColor: '#12100A', borderWidth: 1, borderColor: '#C8A97E33', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  projectTagText: { fontSize: 10, color: '#C8A97E', fontWeight: '700' },

  // ── Action row
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#111', flexWrap: 'wrap' },
  actionBtn: { backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionBtnText: { fontSize: 11, fontWeight: '700' },

  // ── Urgent view
  urgentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  urgentTitle: { fontSize: 16, color: '#EF4444', fontWeight: '700' },
  urgentCountBadge: { backgroundColor: '#1C0707', borderWidth: 1, borderColor: '#EF444444', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  urgentCountText: { color: '#EF4444', fontWeight: '800', fontSize: 12 },
  emptyFull: { alignItems: 'center', paddingVertical: 60 },

  // ── Kanban
  kanbanCol: { width: 260, backgroundColor: '#0D0D12', borderRadius: 12, borderWidth: 1, borderColor: '#1A1A28', overflow: 'hidden', maxHeight: 600 },
  kanbanColHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderTopWidth: 2, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  kanbanColTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  kanbanCountBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  kanbanCountText: { fontSize: 11, fontWeight: '800' },
  kanbanCard: { margin: 10, padding: 14, backgroundColor: '#0A0A0E', borderRadius: 8, borderWidth: 1, borderColor: '#1A1A1A', position: 'relative', overflow: 'hidden' },
  kanbanTaskName: { fontSize: 13, color: '#DDD', fontWeight: '500' },
  kanbanMeta: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' },
  kanbanEmpty: { padding: 24, alignItems: 'center' },
  priorityBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },

  // ── Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#0D0D12', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: '#1A1A28', maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1A1A28' },
  modalTitle: { fontSize: 18, color: '#FFF', fontWeight: '700' },
  modalClose: { fontSize: 20, color: '#888' },
  fieldLabel: { fontSize: 10, color: '#666', fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  fieldInput: { backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#1A1A28', borderRadius: 8, color: '#FFF', fontSize: 14, paddingHorizontal: 14, paddingVertical: 12 },
  priorityOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#1A1A28' },
  priorityOptionText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#1A1A28' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: '#1A1A28', alignItems: 'center' },
  cancelBtnText: { color: '#AAA', fontWeight: '600', fontSize: 14 },
  addBtn: { flex: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: '#C8A97E', alignItems: 'center' },
  addBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
});
