import { API_BASE_URL } from "./config";
import type { Order, Session } from "./types";

export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new ApiError(response.status, body?.error ?? `HTTP_${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function login(email: string, password: string, deviceName: string) {
  return request<Session>("/api/v1/staff/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, deviceName, platform: "android" }),
  });
}

export function refresh(refreshToken: string) {
  return request<Session>("/api/v1/staff/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function logout(refreshToken: string) {
  return request<{ ok: true }>("/api/v1/staff/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function registerPushToken(accessToken: string, pushToken: string | null) {
  return request<{ pushToken: string | null }>("/api/v1/staff/devices/current/push-token", {
    method: "PUT",
    body: JSON.stringify({ pushToken }),
  }, accessToken);
}

export function getOrders(accessToken: string) {
  return request<Order[]>("/api/v1/staff/orders", {}, accessToken);
}

export function getOrder(accessToken: string, orderNumber: string) {
  return request<Order>(`/api/v1/staff/orders/${orderNumber}`, {}, accessToken);
}

export function advanceOrder(accessToken: string, order: Pick<Order, "orderNumber" | "version">) {
  return request<{ status: string; version: number }>(`/api/v1/staff/orders/${order.orderNumber}/status`, {
    method: "PATCH",
    body: JSON.stringify({ version: order.version }),
  }, accessToken);
}

export function confirmCash(accessToken: string, orderNumber: string) {
  return request<{ paymentStatus: "PAID" }>(`/api/v1/staff/orders/${orderNumber}/cash-payment`, { method: "PATCH" }, accessToken);
}

export function cancelOrder(accessToken: string, orderNumber: string, reason: string) {
  return request<{ status: "CANCELLED" }>(`/api/v1/staff/orders/${orderNumber}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  }, accessToken);
}

export function refundAndCancelOrder(accessToken: string, order: Pick<Order, "orderNumber" | "version">, reason: string) {
  return request<{ refundStatus: "PENDING" | "SUCCEEDED" | "FAILED" }>(`/api/v1/staff/orders/${order.orderNumber}/refund-cancel`, {
    method: "POST",
    body: JSON.stringify({ reason, refundKey: `${order.orderNumber}-${order.version}-full-cancel` }),
  }, accessToken);
}
