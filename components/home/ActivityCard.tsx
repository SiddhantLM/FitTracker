import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { activityEndpoints } from "@/services/apis";
import * as SecureStore from "expo-secure-store";
import { Button } from "@react-navigation/elements";

interface Activity {
  _id: string;
  name: string;
  description?: string;
  referenceUrl?: string;
  sets: number;
  reps?: number;
  time?: number; // in seconds
  type: "reps" | "time";
  createdAt: string;
  updatedAt: string;
  setsCompleted: number;
}

interface ActivityProgress {
  setsCompleted: number;
  setsPercentage: number;
}

interface CollapsibleActivityCardProps {
  item: Activity;
  progress: { [key: string]: ActivityProgress };
  onProgressUpdate: (activityId: string, newProgress: ActivityProgress) => void;
  onActivityPress?: (activity: Activity) => void;
  onEditActivity?: (activity: Activity) => void;
  onDeleteActivity?: (activityId: string, selectedDayId: string) => void;
  getProgressColor: (percentage: number) => string;
  formatTime: (seconds: number) => string;
  styles: any; // Your existing styles object
  selectedDayId: string;
  refreshActivities: () => Promise<void>;
}

const CollapsibleActivityCard: React.FC<CollapsibleActivityCardProps> = ({
  item: activity,
  progress,
  onProgressUpdate,
  onActivityPress,
  onEditActivity,
  onDeleteActivity,
  getProgressColor,
  formatTime,
  styles,
  selectedDayId,
  refreshActivities,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTimer, setCurrentTimer] = useState(activity.time || 0);
  const [currentReps, setCurrentReps] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [loading, setLoading] = useState(false);
  const [sets, setSets] = useState(activity.setsCompleted ?? 0);

  const [progressPercentage, setProgressPercentage] = useState(
    parseFloat(((activity.setsCompleted / activity.sets) * 100).toFixed(2))
  );
  const progressColor = getProgressColor(progressPercentage);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Reset timer when activity changes
  useEffect(() => {
    setCurrentTimer(activity.time || 0);
    setSets(activity.setsCompleted ?? 0);
    setProgressPercentage(
      parseFloat(((activity.setsCompleted / activity.sets) * 100).toFixed(2))
    );
    setCurrentReps(0);
    setIsTimerRunning(false);
  }, [activity.time, activity.setsCompleted]);

  const handleSetUpdate = async (type: "increment" | "decrement") => {
    setLoading(true);
    try {
      console.log(
        `${activityEndpoints.UPDATE_SETS_COMPLETED}/${activity._id}/set`
      );
      const response = await axios.post(
        `${activityEndpoints.UPDATE_SETS_COMPLETED}/${activity._id}/set`,
        {
          sets: type === "increment" ? sets + 1 : sets - 1,
        },
        {
          headers: {
            Authorization: `Bearer ${await SecureStore.getItemAsync("token")}`,
          },
        }
      );
      //   setSets(response.data.sets);
      //   setProgressPercentage((response.data.sets / activity.sets) * 100);
      refreshActivities();
    } catch (error: any) {
      console.log(error.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    if (isTimerRunning || currentTimer <= 0) return;

    setIsTimerRunning(true);
    timerRef.current = setInterval(() => {
      setCurrentTimer((prev) => {
        if (prev <= 1) {
          // Timer completed
          setIsTimerRunning(false);
          completeSet();
          return activity.time || 0; // Reset timer
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetTimer = () => {
    pauseTimer();
    setCurrentTimer(activity.time || 0);
  };

  const completeSet = () => {
    const newSetsCompleted = Math.min(activity.sets);
    const newPercentage = Math.round((newSetsCompleted / activity.sets) * 100);

    const newProgress: ActivityProgress = {
      setsCompleted: newSetsCompleted,
      setsPercentage: newPercentage,
    };

    onProgressUpdate(activity._id, newProgress);

    // Reset reps for next set
    setCurrentReps(0);

    // Show completion message
    if (newSetsCompleted === activity.sets) {
      Alert.alert(
        "Congratulations!",
        "You have completed all sets for this activity!"
      );
    } else {
      Alert.alert(
        "Set Complete!",
        `Set ${newSetsCompleted} completed. Ready for the next set?`
      );
    }
  };

  //   const updateProgress = (increment: number) => {
  //     // const newSetsCompleted = Math.max(
  //     //   0,
  //     //   Math.min(activityProgress.setsCompleted + increment, activity.sets)
  //     // );
  //     const newPercentage = Math.round((newSetsCompleted / activity.sets) * 100);

  //     const newProgress: ActivityProgress = {
  //       setsCompleted: newSetsCompleted,
  //       setsPercentage: newPercentage,
  //     };

  //     onProgressUpdate(activity._id, newProgress);
  //   };

  const handleCardPress = () => {
    setIsExpanded(!isExpanded);
  };

  const resetSet = async () => {
    try {
      await axios.post(
        `${activityEndpoints.RESET_SETS}/${activity._id}/set`,
        {},
        {
          headers: {
            Authorization: `Bearer ${await SecureStore.getItemAsync("token")}`,
          },
        }
      );
      //   setSets(0);
      //   setProgressPercentage(0);
      refreshActivities();
    } catch (error: any) {
      console.log(error.response.data.message);
    }
  };

  const handleEditPress = (event: any) => {
    event.stopPropagation(); // Prevent card expansion
    if (onEditActivity) {
      onEditActivity(activity);
    }
  };

  const handleDeletePress = (event: any) => {
    event.stopPropagation(); // Prevent card expansion
    Alert.alert(
      "Delete Activity",
      `Are you sure you want to delete "${activity.name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (onDeleteActivity) {
              onDeleteActivity(activity._id, selectedDayId);
            }
          },
        },
      ]
    );
  };

  const canStartTimer =
    activity.type === "time" && !isTimerRunning && currentTimer > 0;
  const canCompleteSet = sets < activity.sets;

  return (
    <View style={styles.activityCard}>
      <TouchableOpacity onPress={handleCardPress}>
        <View style={styles.activityHeader}>
          <View style={styles.activityIcon}>
            <Ionicons
              name={activity.type === "reps" ? "fitness" : "timer"}
              size={24}
              color="#667eea"
            />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityName}>{activity.name}</Text>
            <Text style={styles.activityDescription} numberOfLines={2}>
              {activity.description || "No description"}
            </Text>
          </View>
          <View style={styles.activityProgress}>
            <View
              style={[styles.progressCircle, { borderColor: progressColor }]}
            >
              <Text style={[styles.progressText, { color: progressColor }]}>
                {progressPercentage}%
              </Text>
            </View>
          </View>

          {/* Action Buttons */}

          <View style={styles.expandIcon}>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#666"
            />
          </View>
        </View>

        <View style={styles.activityDetails}>
          <View style={styles.activityStat}>
            <Ionicons name="repeat" size={16} color="#666" />
            <Text style={styles.statText}>{activity.sets} sets</Text>
          </View>

          {activity.type === "reps" ? (
            <View style={styles.activityStat}>
              <Ionicons name="add" size={16} color="#666" />
              <Text style={styles.statText}>
                {activity.reps !== undefined ? activity.reps : "N/A"} reps
              </Text>
            </View>
          ) : (
            <View style={styles.activityStat}>
              <Ionicons name="time" size={16} color="#666" />
              <Text style={styles.statText}>
                {formatTime(activity.time || 0)}
              </Text>
            </View>
          )}

          <View style={styles.activityStat}>
            <Ionicons name="checkmark-circle" size={16} color={progressColor} />
            <Text style={[styles.statText, { color: progressColor }]}>
              {activity.setsCompleted}/{activity.sets}
            </Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercentage}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Timer Section (for time-based activities) */}
          {activity.type === "time" && (
            <View style={styles.timerSection}>
              <Text style={styles.sectionTitle}>Timer</Text>
              <View style={styles.timerDisplay}>
                <Text style={styles.timerText}>{formatTime(currentTimer)}</Text>
              </View>
              <View style={styles.timerControls}>
                <TouchableOpacity
                  style={[
                    styles.timerButton,
                    { backgroundColor: canStartTimer ? "#4CAF50" : "#ccc" },
                  ]}
                  onPress={startTimer}
                  disabled={!canStartTimer}
                >
                  <Ionicons name="play" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.timerButton,
                    { backgroundColor: isTimerRunning ? "#FF9800" : "#ccc" },
                  ]}
                  onPress={pauseTimer}
                  disabled={!isTimerRunning}
                >
                  <Ionicons name="pause" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timerButton}
                  onPress={resetTimer}
                >
                  <Ionicons name="refresh" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Reps Section (for rep-based activities) */}
          {activity.type === "reps" && (
            <View style={styles.repsSection}>
              <Text style={styles.sectionTitle}>Current Set Reps</Text>
              <View style={styles.repsControls}>
                <TouchableOpacity
                  style={styles.repsButton}
                  onPress={() => setCurrentReps(Math.max(0, currentReps - 1))}
                >
                  <Ionicons name="remove" size={20} color="white" />
                </TouchableOpacity>
                <Text style={styles.repsDisplay}>
                  {currentReps} / {activity.reps || 0}
                </Text>
                <TouchableOpacity
                  style={styles.repsButton}
                  onPress={() =>
                    setCurrentReps(
                      Math.min(activity.reps || 0, currentReps + 1)
                    )
                  }
                >
                  <Ionicons name="add" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Progress Controls */}
          <View style={styles.progressControls}>
            <Text style={styles.sectionTitle}>Set Progress</Text>
            {sets === activity.sets ? (
              <Button onPress={resetSet}>Reset</Button>
            ) : (
              <View style={styles.setControls}>
                <TouchableOpacity
                  style={[
                    styles.setButton,
                    {
                      backgroundColor: sets > 0 ? "#F44336" : "#ccc",
                    },
                  ]}
                  onPress={() => handleSetUpdate("decrement")}
                  disabled={sets <= 0 || loading}
                >
                  <Text style={styles.setButtonText}>-1</Text>
                </TouchableOpacity>

                <View style={styles.currentSetDisplay}>
                  <Text style={styles.currentSetText}>
                    Set {sets + 1} of {activity.sets}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.setButton,
                    { backgroundColor: canCompleteSet ? "#4CAF50" : "#ccc" },
                  ]}
                  onPress={() => handleSetUpdate("increment")}
                  disabled={!canCompleteSet || loading}
                >
                  <Text style={styles.setButtonText}>+1</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleEditPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="pencil" size={16} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDeletePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash" size={16} color="#ff4444" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export const renderCollapsibleActivityCard = (
  progress: { [key: string]: ActivityProgress },
  onProgressUpdate: (activityId: string, newProgress: ActivityProgress) => void,
  getProgressColor: (percentage: number) => string,
  formatTime: (seconds: number) => string,
  styles: any,
  onActivityPress: (activity: Activity) => void,
  onEditActivity: (activity: Activity) => void,
  onDeleteActivity: (activityId: string, selectedDayId: string) => void,
  selectedDayId: string,
  refreshActivities: () => Promise<void>
) => {
  const RenderItem = ({ item }: { item: Activity }) => (
    <CollapsibleActivityCard
      item={item}
      progress={progress}
      onProgressUpdate={onProgressUpdate}
      onActivityPress={onActivityPress}
      onEditActivity={onEditActivity}
      onDeleteActivity={onDeleteActivity}
      getProgressColor={getProgressColor}
      formatTime={formatTime}
      styles={styles}
      selectedDayId={selectedDayId}
      refreshActivities={refreshActivities}
    />
  );

  RenderItem.displayName = "CollapsibleActivityCardRenderItem";

  return RenderItem;
};

export default CollapsibleActivityCard;
