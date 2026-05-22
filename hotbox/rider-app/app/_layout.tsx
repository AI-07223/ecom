import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import "@/lib/location-task" // register the foreground location task

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#cf3a1f" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#cf3a1f" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "700", letterSpacing: 1 },
          contentStyle: { backgroundColor: "#fffaf6" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "HOTBOX RIDER" }} />
        <Stack.Screen name="login" options={{ title: "Sign in" }} />
        <Stack.Screen name="setup" options={{ title: "First-time setup" }} />
      </Stack>
    </>
  )
}
