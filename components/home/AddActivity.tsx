import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { activityEndpoints } from "@/services/apis";

type WeekDay =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

type ActivityType = "reps" | "time";
interface Activity {
  _id: string;
  name: string;
  description?: string;
  referenceUrl?: string;
  sets: number;
  reps?: number;
  time?: number;
  type: ActivityType;
  createdAt: string;
  updatedAt: string;
}
interface Day {
  _id: string;
  day: WeekDay; // Corrected type to WeekDay
  activities: Activity[]; // Array of populated Activity objects
  user: string; // The ID of the user
}

interface AddActivityFABProps {
  selectedDay: WeekDay;
  userId: string;
  selectedDayData: Day | null;
  onActivityAdded: () => void; // Callback to refresh activities after adding
}

interface NewActivity {
  name: string;
  description: string;
  sets: string;
  reps: string;
  time: string; // in seconds (will be converted from minutes)
  type: "reps" | "time";
  referenceUrl: string;
}

const AddActivityFAB: React.FC<AddActivityFABProps> = ({
  selectedDay,
  userId,
  selectedDayData,
  onActivityAdded,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newActivity, setNewActivity] = useState<NewActivity>({
    name: "",
    description: "",
    sets: "",
    reps: "",
    time: "",
    type: "reps",
    referenceUrl: "",
  });

  const resetForm = () => {
    setNewActivity({
      name: "",
      description: "",
      sets: "",
      reps: "",
      time: "",
      type: "reps",
      referenceUrl: "",
    });
  };

  const validateForm = (): boolean => {
    if (!newActivity.name.trim()) {
      Alert.alert("Validation Error", "Activity name is required");
      return false;
    }

    if (!newActivity.sets || parseInt(newActivity.sets) <= 0) {
      Alert.alert("Validation Error", "Sets must be a positive number");
      return false;
    }

    if (newActivity.type === "reps") {
      if (!newActivity.reps || parseInt(newActivity.reps) <= 0) {
        Alert.alert("Validation Error", "Reps must be a positive number");
        return false;
      }
    } else {
      if (!newActivity.time || parseInt(newActivity.time) <= 0) {
        Alert.alert(
          "Validation Error",
          "Time must be a positive number (in minutes)"
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || selectedDayData === null) return;

    setIsSubmitting(true);

    try {
      // Prepare the activity data
      const activityData = {
        name: newActivity.name.trim(),
        description: newActivity.description.trim() || undefined,
        sets: parseInt(newActivity.sets),
        type: newActivity.type,
        referenceUrl: newActivity.referenceUrl.trim() || undefined,
        ...(newActivity.type === "reps"
          ? { reps: parseInt(newActivity.reps) }
          : { time: parseInt(newActivity.time) * 60 }), // Convert minutes to seconds
      };

      // API call to add activity to the selected day
      await axios.post(
        `${activityEndpoints.ADD_ACTIVITY}/${selectedDayData?._id}/activity`,
        activityData
      );

      //   const result = await response.json();

      Alert.alert(
        "Success!",
        `Activity "${newActivity.name}" added to ${selectedDay}`,
        [
          {
            text: "OK",
            onPress: () => {
              setIsModalVisible(false);
              resetForm();
              onActivityAdded(); // Trigger refresh in parent component
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error adding activity:", error);
      Alert.alert(
        "Error",
        "Failed to add activity. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    resetForm();
  };

  return (
    <>
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal Form */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancel}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Activity to {selectedDay}</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#667eea" />
              ) : (
                <Text style={styles.saveButton}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Activity Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Activity Name *</Text>
              <TextInput
                style={styles.textInput}
                value={newActivity.name}
                onChangeText={(text) =>
                  setNewActivity((prev) => ({ ...prev, name: text }))
                }
                placeholder="e.g., Push-ups, Squats, Plank"
                maxLength={50}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newActivity.description}
                onChangeText={(text) =>
                  setNewActivity((prev) => ({ ...prev, description: text }))
                }
                placeholder="Optional description or notes"
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            {/* Activity Type Toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Activity Type</Text>
              <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Reps-based</Text>
                <Switch
                  value={newActivity.type === "time"}
                  onValueChange={(value) =>
                    setNewActivity((prev) => ({
                      ...prev,
                      type: value ? "time" : "reps",
                      reps: "",
                      time: "",
                    }))
                  }
                  trackColor={{ false: "#e1e5f2", true: "#667eea" }}
                  thumbColor="#fff"
                />
                <Text style={styles.toggleLabel}>Time-based</Text>
              </View>
            </View>

            {/* Sets */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sets *</Text>
              <TextInput
                style={styles.numberInput}
                value={newActivity.sets}
                onChangeText={(text) =>
                  setNewActivity((prev) => ({ ...prev, sets: text }))
                }
                placeholder="3"
                keyboardType="numeric"
                maxLength={2}
              />
            </View>

            {/* Conditional: Reps or Time */}
            {newActivity.type === "reps" ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Reps per Set *</Text>
                <TextInput
                  style={styles.numberInput}
                  value={newActivity.reps}
                  onChangeText={(text) =>
                    setNewActivity((prev) => ({ ...prev, reps: text }))
                  }
                  placeholder="10"
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Time per Set (minutes) *</Text>
                <TextInput
                  style={styles.numberInput}
                  value={newActivity.time}
                  onChangeText={(text) =>
                    setNewActivity((prev) => ({ ...prev, time: text }))
                  }
                  placeholder="2"
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
            )}

            {/* Reference URL */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reference URL</Text>
              <TextInput
                style={styles.textInput}
                value={newActivity.referenceUrl}
                onChangeText={(text) =>
                  setNewActivity((prev) => ({ ...prev, referenceUrl: text }))
                }
                placeholder="https://example.com/exercise-guide"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f8f9ff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e5f2",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#667eea",
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginTop: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1e5f2",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  numberInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1e5f2",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    width: 100,
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1e5f2",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: "#333",
    marginHorizontal: 12,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default AddActivityFAB;
