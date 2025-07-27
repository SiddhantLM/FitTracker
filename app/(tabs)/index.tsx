import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator, // Added for better loading indicator
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@/context/UserContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import AddActivityFAB from "@/components/home/AddActivity";
import CollapsibleActivityCard, {
  renderCollapsibleActivityCard,
} from "@/components/home/ActivityCard";
import { getUser } from "@/services/operations/auth";
import axios from "axios";
import { activityEndpoints } from "@/services/apis";
import { fetchDayProgress } from "@/services/operations/progress";

const { width } = Dimensions.get("window");

// Constants
const DAYS_OF_WEEK: WeekDay[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// --- Type Definitions (Corrected and Expanded) ---

type WeekDay =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

// This interface should match your Mongoose User schema (populated)
interface User {
  _id: string; // Ensure user ID is available
  name: string;
  email: string;
  role: "user" | "admin";
  days: Day[]; // Array of populated Day objects
  createdAt: string;
  updatedAt: string;
}

// Matches Mongoose Activity schema
interface Activity {
  _id: string;
  name: string;
  description?: string; // Made optional as per schema
  referenceUrl?: string; // Made optional
  sets: number;
  reps?: number;
  time?: number; // in seconds
  type: "reps" | "time";
  createdAt: string;
  updatedAt: string;
  setsCompleted: number;
}

// Matches Mongoose Day schema (populated with Activities)
interface Day {
  _id: string;
  day: WeekDay; // Corrected type to WeekDay
  activities: Activity[]; // Array of populated Activity objects
  user: string; // The ID of the user
}

// Matches Mongoose Progress schema for relevant fields
interface ProgressData {
  _id: string; // Progress document ID
  activity: string; // Activity ID
  user: string; // User ID
  day: string; // Day ID
  date: string; // Date of progress (e.g., "2025-06-28T...")
  setsCompleted: number;
  // Add other progress fields if needed, e.g., repsAchieved, timeAchieved
}

// Local state for UI: aggregated progress per activity
interface ActivityProgressState {
  [activityId: string]: {
    setsCompleted: number;
    setsPercentage: number;
    // weightedPercentage?: number; // Keep if you use it for display
  };
}

export default function HomeScreen() {
  const { user, setUser } = useUser(); // Get loading state from context
  const [selectedDay, setSelectedDay] = useState<WeekDay>("Monday");
  const [weekDaysData, setWeekDaysData] = useState<Day[]>([]); // Renamed to avoid conflict with Day type
  const [currentDayActivities, setCurrentDayActivities] = useState<Activity[]>(
    []
  );
  const [selectedDayData, setSelectedDayData] = useState<Day | null>(null);
  const [progress, setProgress] = useState<ActivityProgressState>({});
  const [loadingActivities, setLoadingActivities] = useState<boolean>(true); // Loading for activities and progress
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);

  const onEditActivity = () => {
    setEdit(true);
  };

  // --- Effects ---

  const fetchProgressData = useCallback(async () => {
    if (!selectedDayData?._id) return;

    setLoadingActivities(true);
    try {
      const progressData = await fetchDayProgress(selectedDayData._id);
      setProgress(progressData);
    } catch (error) {
      console.error("Failed to fetch progress:", error);
      // setError(error.message);
    } finally {
      setLoadingActivities(false);
    }
  }, [selectedDayData?._id]);

  // Call this in useEffect when selectedDay changes
  useEffect(() => {
    fetchProgressData();
  }, [fetchProgressData]);

  // Set current day as selected by default when the component mounts
  useEffect(() => {
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    }) as WeekDay;
    setSelectedDay(today);
  }, []);

  // Effect to populate weekDaysData when the user object is available or changes.
  useEffect(() => {
    if (user && user.days) {
      setWeekDaysData(user.days);
      setCurrentDayActivities(
        user.days.find((day) => day.day === selectedDay)?.activities || []
      );
      setSelectedDayData(
        user.days.find((day) => day.day === selectedDay) || null
      );
      setLoadingActivities(false); // User data loaded, so initial loading is done
    } else if (!user) {
      // If user is null and not loading, something went wrong or no user logged in
      setError("User data not available. Please log in.");
      setLoadingActivities(false);
    }
  }, [user, selectedDay]);

  // --- Data Fetching Functions ---

  // This function would make an API call to your backend

  // --- Helper Functions ---

  const onProgressUpdate = () => {};

  const refreshActivities = useCallback(async () => {
    if (!user?._id) return;

    setLoadingActivities(true);
    try {
      // Re-fetch user data or just the specific day's activities
      // This depends on your backend API structure
      const response = await getUser();
      // Update your user context or local state
      setUser(response);
      // const calculateOverallProgress = () => {
      const currentDay = response.days.find((d: any) => d.day === selectedDay);
      if (currentDay.activities.length === 0) return;
      const totalActivities = currentDay.activities.length;

      const completedActivities = currentDay.activities.filter(
        (activity: any) => activity.setsCompleted === activity.sets
      ).length;

      const progressPercentage =
        totalActivities > 0
          ? parseFloat(
              ((completedActivities / totalActivities) * 100).toFixed(2)
            )
          : 0;
      setOverallProgress(progressPercentage);
      // };
      // calculateOverallProgress();
    } catch (error) {
      console.error("Error refreshing activities:", error);
    } finally {
      setLoadingActivities(false);
    }
  }, [user?._id, setUser, selectedDay]);

  const onDeleteActivity = async (
    sactivityId: string,
    selectedDayId: string
  ) => {
    try {
      await axios.delete(
        `${activityEndpoints.DELETE_ACTIVITY}/day/${selectedDayId}/activity/${sactivityId}`
      );
      refreshActivities();
    } catch (error) {
      console.error("Error deleting activity:", error);
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return "#4CAF50"; // Green
    if (percentage >= 75) return "#8BC34A"; // Light Green
    if (percentage >= 50) return "#FFC107"; // Amber (changed from orange for better contrast)
    if (percentage >= 25) return "#FF9800"; // Deep Orange (changed from a lighter red)
    return "#9E9E9E"; // Grey
  };

  const handleActivityPress = (activity: Activity) => {
    Alert.alert(
      activity.name,
      `Start ${activity.name}?\n\n${
        activity.description || "No description available"
      }`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Start", onPress: () => startActivity(activity) },
      ]
    );
  };

  const startActivity = (activity: Activity) => {
    // Navigate to activity tracking screen or start workout flow
    // Example using a hypothetical navigation library:
    // navigation.navigate("ActivityDetail", { activityId: activity._id });
    Alert.alert("Activity Started", `Starting ${activity.name}!`);
    // In a real app, this would navigate to a screen to track sets/reps/time
  };

  const renderDayTab = ({ item: dayItem }: { item: WeekDay }) => {
    const isSelected = selectedDay === dayItem;
    const isToday =
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
      }) === dayItem;

    return (
      <TouchableOpacity
        style={[styles.dayTab, isSelected && styles.selectedDayTab]}
        onPress={() => setSelectedDay(dayItem)}
      >
        <Text
          style={[styles.dayTabText, isSelected && styles.selectedDayTabText]}
        >
          {dayItem.substring(0, 3)}
        </Text>
        {isToday && <View style={styles.todayIndicator} />}
      </TouchableOpacity>
    );
  };

  const calculateOverallProgress = (): number => {
    if (currentDayActivities.length === 0) return 0;
    const totalPercentage = currentDayActivities.reduce((sum, activity) => {
      const activityProgress = progress[activity._id];
      return sum + (activityProgress?.setsPercentage || 0);
    }, 0);
    return Math.round(totalPercentage / currentDayActivities.length);
  };

  const [overallProgress, setOverallProgress] = useState<number>(
    calculateOverallProgress()
  );

  // --- Render Logic ---

  if (loadingActivities) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <ThemedText>Loading your schedule...</ThemedText>
      </ThemedView>
    );
  }

  // if (error) {
  //   return (
  //     <ThemedView style={styles.errorContainer}>
  //       <Ionicons name="alert-circle-outline" size={64} color="#FF5722" />
  //       <ThemedText style={styles.errorText}>{error}</ThemedText>
  //       <TouchableOpacity
  //         style={styles.retryButton}
  //         onPress={() => {
  //           // Attempt to re-fetch user data and then day data
  //           // This might require a refresh function from UserContext or manually triggering effects
  //           // For simplicity, we'll just clear error and let effects re-run on relevant state changes
  //           setError(null);
  //           // If you have a refresh function in UserContext, call it here
  //           // For now, setting selectedDay or a dummy state might re-trigger effects
  //           setSelectedDay(selectedDay); // Re-trigger day fetching
  //         }}
  //       >
  //         <Text style={styles.retryButtonText}>Retry</Text>
  //       </TouchableOpacity>
  //     </ThemedView>
  //   );
  // }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || "User"}!</Text>
          </View>

          <View style={styles.overallProgress}>
            <View style={styles.progressCircleLarge}>
              <Text style={styles.progressTextLarge}>{overallProgress}%</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.dayNavigation}>
          <FlatList
            data={DAYS_OF_WEEK}
            renderItem={renderDayTab}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayTabsContainer}
          />
        </View>

        <View style={styles.dayHeader}>
          <Text style={styles.selectedDayTitle}>{selectedDay}</Text>
          <Text style={styles.activitiesCount}>
            {currentDayActivities.length}{" "}
            {currentDayActivities.length === 1 ? "activity" : "activities"}
          </Text>
        </View>

        <FlatList
          data={currentDayActivities}
          renderItem={renderCollapsibleActivityCard(
            progress,
            onProgressUpdate,
            getProgressColor,
            formatTime,
            styles,
            handleActivityPress,
            // formatTime,
            onEditActivity,
            onDeleteActivity,
            selectedDayData!._id,
            refreshActivities
          )}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.activitiesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>
                No activities for {selectedDay}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Enjoy your rest day or add some activities!
              </Text>
            </View>
          }
        />
      </View>

      {user?._id && (
        <AddActivityFAB
          selectedDay={selectedDay}
          userId={user._id}
          onActivityAdded={refreshActivities}
          selectedDayData={selectedDayData}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9ff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 30,
    alignItems: "center",
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    color: "#fff",
    fontSize: 16,
    opacity: 0.9,
  },
  userName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  overallProgress: {
    alignItems: "center",
  },
  progressCircleLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  progressTextLarge: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  progressLabel: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    backgroundColor: "#f8f9ff",
  },
  dayNavigation: {
    backgroundColor: "#fff",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e5f2",
  },
  dayTabsContainer: {
    paddingHorizontal: 20,
  },
  dayTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 15,
    borderRadius: 20,
    backgroundColor: "#f8f9ff",
    alignItems: "center",
    minWidth: 60,
  },
  selectedDayTab: {
    backgroundColor: "#667eea",
  },
  dayTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  selectedDayTabText: {
    color: "#fff",
  },
  todayIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF5722",
    marginTop: 4,
    position: "absolute",
    bottom: -8,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#fff",
  },
  selectedDayTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  activitiesCount: {
    fontSize: 14,
    color: "#666",
  },
  activitiesList: {
    padding: 20,
  },
  activityCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f8f9ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  activityProgress: {
    alignItems: "center",
  },
  progressCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9ff",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  activityDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  activityStat: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e1e5f2",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
  expandIcon: {
    marginLeft: 8,
  },
  expandedContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  timerSection: {
    marginBottom: 20,
  },
  timerDisplay: {
    alignItems: "center",
    marginBottom: 16,
  },
  timerText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#667eea",
  },
  timerControls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  timerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#667eea",
    alignItems: "center",
    justifyContent: "center",
  },
  repsSection: {
    marginBottom: 20,
  },
  repsControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  repsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#667eea",
    alignItems: "center",
    justifyContent: "center",
  },
  repsDisplay: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    minWidth: 80,
    textAlign: "center",
  },
  progressControls: {
    marginBottom: 8,
  },
  setControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  setButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#667eea",
  },
  setButtonText: {
    color: "white",
    fontWeight: "600",
  },
  currentSetDisplay: {
    flex: 1,
    alignItems: "center",
  },
  currentSetText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    gap: 3,
    justifyContent: "center",
    // width: "100%",
    // alignContent: "center",
  },
  actionButton: {
    padding: 12,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: "#e1e5f2",
    marginTop: 15,
    // color: "White",
  },
});
