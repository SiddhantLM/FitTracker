import React, { createContext, useContext, useState, ReactNode } from "react";

interface Activity {
  _id: string;
  name: string;
  description?: string;
  referenceUrl?: string;
  sets: number;
  reps?: number;
  time?: number;
  type: "time" | "reps";
  createdAt: string;
  updatedAt: string;
  setsCompleted: number;
}

export enum WeekDay {
  Monday = "Monday",
  Tuesday = "Tuesday",
  Wednesday = "Wednesday",
  Thursday = "Thursday",
  Friday = "Friday",
  Saturday = "Saturday",
  Sunday = "Sunday",
}

interface Day {
  _id: string;
  day: WeekDay; // Corrected type to WeekDay
  activities: Activity[]; // Array of populated Activity objects
  user: string; // The ID of the user
}

interface User {
  _id: string;
  name: string;
  email: string;
  days: Day[];
  createdAt: Date;
  updatedAt: Date;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used inside UserProvider");
  return context;
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
