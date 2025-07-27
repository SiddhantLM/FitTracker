import { UserProvider, useUser } from "@/context/UserContext";
import { getUser } from "@/services/operations/auth";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Text } from "react-native";

export default function AuthLayoutWrapper() {
  return (
    <UserProvider>
      <AuthLayout />
    </UserProvider>
  );
}

function AuthLayout() {
  const { user, setUser } = useUser();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        setLoading(false);
        return;
      }
      const response = await getUser();
      if (!response) {
        setLoading(false);
        return;
      }

      setUser(response);
      router.replace("/");
      setLoading(false);
    };
    fetchUserData();
  }, [setUser]);

  if (user) {
    router.replace("/");
    return;
  }

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
