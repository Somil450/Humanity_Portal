import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';

// Main Screens — Employee
import DashboardScreen from '../screens/main/DashboardScreen';
import AttendanceScreen from '../screens/main/AttendanceScreen';
import ProjectsScreen from '../screens/main/ProjectsScreen';
import LeavesScreen from '../screens/main/LeavesScreen';

// Main Screens — Admin
import AdminDashboardScreen from '../screens/main/AdminDashboardScreen';

// Shared / More
import MoreMenuScreen from '../screens/main/MoreMenuScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import UrgentTasksScreen from '../screens/main/UrgentTasksScreen';
import LeaveManagementScreen from '../screens/main/LeaveManagementScreen';
import PeopleScreen from '../screens/main/PeopleScreen';
import EmployeeProfileScreen from '../screens/main/EmployeeProfileScreen';
import CreateEmployeeScreen from '../screens/main/CreateEmployeeScreen';
import CreateProjectScreen from '../screens/main/CreateProjectScreen';
import DailyTasksReviewScreen from '../screens/main/DailyTasksReviewScreen';
import EmployeeOversightScreen from '../screens/main/EmployeeOversightScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import ProjectWorkspaceScreen from '../screens/main/ProjectWorkspaceScreen';

const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const MoreStack = createNativeStackNavigator();

// ─── Tab Icon ─────────────────────────────────────────────────────────────────
const TabIcon = ({
  emoji,
  label,
  focused,
}: {
  emoji: string;
  label: string;
  focused: boolean;
}) => (
  <View style={tabStyles.iconWrap}>
    <Text style={tabStyles.emoji}>{emoji}</Text>
    <Text style={[tabStyles.label, focused && tabStyles.labelFocused]}>{label}</Text>
    {focused && <View style={tabStyles.activeDot} />}
  </View>
);

const tabStyles = StyleSheet.create({
  iconWrap: { alignItems: 'center', paddingTop: 6, minWidth: 52 },
  emoji: { fontSize: 20 },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  labelFocused: { color: COLORS.primary, fontWeight: '700' },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 3,
  },
});

// ─── More Stack ───────────────────────────────────────────────────────────────
function MoreStackNavigator() {
  return (
    <MoreStack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreMenu" component={MoreMenuScreen} />
      <MoreStack.Screen name="Notifications" component={NotificationsScreen} />
      <MoreStack.Screen name="UrgentTasks" component={UrgentTasksScreen} />
      <MoreStack.Screen name="LeaveManagement" component={LeaveManagementScreen} />
      <MoreStack.Screen name="People" component={PeopleScreen} />
      <MoreStack.Screen name="EmployeeProfile" component={EmployeeProfileScreen} />
      <MoreStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <MoreStack.Screen name="CreateEmployee" component={CreateEmployeeScreen} />
      <MoreStack.Screen name="CreateProject" component={CreateProjectScreen} />
      <MoreStack.Screen name="DailyTasksReview" component={DailyTasksReviewScreen} />
      <MoreStack.Screen name="EmployeeOversight" component={EmployeeOversightScreen} />
      <MoreStack.Screen name="ProjectWorkspace" component={ProjectWorkspaceScreen} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} />
    </MoreStack.Navigator>
  );
}

// ─── Admin Tab Navigator ──────────────────────────────────────────────────────
function AdminNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 60 + (insets.bottom > 0 ? insets.bottom - 8 : 0),
          paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 8,
          paddingTop: 4,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderDefault,
          backgroundColor: COLORS.bgCard,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📊" label="Overview" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="People"
        component={PeopleScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👥" label="People" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Leaves"
        component={LeaveManagementScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🌴" label="Leaves" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📁" label="Projects" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="☰" label="More" focused={focused} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('More', { screen: 'MoreMenu' });
          },
        })}
      />
    </Tab.Navigator>
  );
}


// ─── Employee Tab Navigator ───────────────────────────────────────────────────
function EmployeeNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 60 + (insets.bottom > 0 ? insets.bottom - 8 : 0),
          paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 8,
          paddingTop: 4,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderDefault,
          backgroundColor: COLORS.bgCard,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⏰" label="Attendance" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📁" label="Projects" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Leaves"
        component={LeavesScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🌴" label="Leaves" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="☰" label="More" focused={focused} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('More', { screen: 'MoreMenu' });
          },
        })}
      />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────
export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <AuthStack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
      </AuthStack.Navigator>
    );
  }

  if (user.status === 'pending') {
    return (
      <AuthStack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      </AuthStack.Navigator>
    );
  }

  // Role-based navigation
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  return isAdmin ? <AdminNavigator /> : <EmployeeNavigator />;
}
