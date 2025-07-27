import React, { useEffect, useState } from "react";
import { Stack, router, Slot } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { getUser } from "@/services/operations/auth";
import { UserProvider, useUser } from "@/context/UserContext";

function AppLayout() {
  const { user, setUser } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        router.replace("/auth");
        return;
      }

      const response = await getUser();
      if (!response) {
        router.replace("/auth");
        return;
      }

      setUser(response);
      setLoading(false);
    };

    fetchUserData();
  }, [setUser]);

  if (loading || !user) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Slot is needed to render matched routes */}
      <Slot />
    </Stack>
  );
}

export default function LayoutWrapper() {
  return (
    <UserProvider>
      <AppLayout />
    </UserProvider>
  );
}
