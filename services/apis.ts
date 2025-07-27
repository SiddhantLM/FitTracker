const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const authEndpoints = {
  LOGIN: `${BASE_URL}/auth/login`,
  REGISTER: `${BASE_URL}/auth/register`,
  // FORGOT_PASSWORD:`${BASE_URL}/auth/forgot-password`,
  // RESET_PASSWORD:`${BASE_URL}/auth/reset-password`,
  FETCH_USER: `${BASE_URL}/auth/user`,
};

export const activityEndpoints = {
  ADD_ACTIVITY: `${BASE_URL}/activity/day`,
  DELETE_ACTIVITY: `${BASE_URL}/activity`,
  GET_DAY: `${BASE_URL}/progress/day`,
  GET_ACTIVITY_PROGREss: `${BASE_URL}/progress/activity`,
  UPDATE_SETS_COMPLETED: `${BASE_URL}/progress/activity`,
  RESET_SETS: `${BASE_URL}/progress/activity`,
};
