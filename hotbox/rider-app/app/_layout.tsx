import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { brand } from "@/lib/brand"
import "@/lib/location-task" // register the foreground location task

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor={brand.shellBg} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: brand.shellBg },
          headerTintColor: brand.shellFg,
          headerTitleStyle: {
            fontWeight: "800",
            color: brand.yellow,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: brand.shellBg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "HOT BOX RIDER" }} />
        <Stack.Screen name="login" options={{ title: "Sign in" }} />
        <Stack.Screen name="setup" options={{ title: "First-time setup" }} />
      </Stack>
    </>
  )
}
