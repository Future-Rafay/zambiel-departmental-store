import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";
import type { Locale } from "./types";
// This device's push token, without prompting; null when notifications were never allowed.
export async function currentPushToken() {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!Device.isDevice || !projectId || !(await Notifications.getPermissionsAsync()).granted) return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}
export async function subscribeToOrders(
  locale: Locale,
  orderNumber?: string,
  trackingToken?: string,
) {
  if (!Device.isDevice) return;
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Order updates",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api.registerPush(token, locale, orderNumber, trackingToken);
}
