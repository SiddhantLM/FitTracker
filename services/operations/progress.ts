import axios from "axios";
import { activityEndpoints } from "@/services/apis";
import * as SecureStore from "expo-secure-store";

export interface Activity {
  _id: string;
  name: string;
  type: string;
  sets: number;
  reps?: number;
  time?: number;
}

export interface SetEntry {
  setNumber: number;
  reps?: number;
  time?: number;
}

export interface ActivityProgressData {
  setsCompleted: number;
  setsPercentage: number;
  weightedPercentage: number;
  isCompleted: boolean;
  totalSets: number;
  setsData: SetEntry[];
}

export const fetchDayProgress = async (
  dayId: string
): Promise<Record<string, ActivityProgressData>> => {
  if (!dayId) throw new Error("Day ID is required");

  const response = await axios.get(`${activityEndpoints.GET_DAY}/${dayId}`, {
    headers: {
      Authorization: `Bearer ${await SecureStore.getItemAsync("token")}`,
    },
  });

  const { progress } = response.data;

  const progressByActivity: Record<string, ActivityProgressData> = {};

  progress.forEach((item: any) => {
    const activityId = item._id || item.activity._id; // Depending on your backend structure
    progressByActivity[activityId] = {
      setsCompleted: item.setsCompleted?.length || 0,
      setsPercentage: item.setsPercentage || 0,
      weightedPercentage: item.weightedPercentage || 0,
      isCompleted: item.isCompleted || false,
      totalSets: item.totalSets || item.sets || 0,
      setsData: item.setsCompleted || [],
    };
  });

  return progressByActivity;
};
export const fetchActivityProgress = async (
  activityId: string,
  dayId: string
): Promise<ActivityProgressData> => {
  if (!activityId || !dayId) {
    throw new Error("Both activity ID and day ID are required");
  }

  try {
    const response = await axios.get(
      `${activityEndpoints.GET_ACTIVITY_PROGREss}/${activityId}/day/${dayId}`,
      {
        headers: {
          Authorization: `Bearer ${await SecureStore.getItemAsync("token")}`,
        },
      }
    );

    const progress = response.data.progress;

    return {
      setsCompleted: progress.setsCompleted?.length || 0,
      setsPercentage: progress.setsPercentage || 0,
      weightedPercentage: progress.weightedPercentage || 0,
      isCompleted: progress.isCompleted || false,
      totalSets: progress.totalSets || progress.sets || 0,
      setsData: progress.setsCompleted || [],
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return {
        setsCompleted: 0,
        setsPercentage: 0,
        weightedPercentage: 0,
        isCompleted: false,
        totalSets: 0,
        setsData: [],
      };
    }

    throw new Error(
      error.response?.data?.message || "Failed to fetch activity progress"
    );
  }
};
