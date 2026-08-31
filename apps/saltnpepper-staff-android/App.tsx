import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import * as api from './src/api';
import { POLL_MS } from './src/config';
import {
  formatChf,
  formatZurichDateTime,
  fulfillmentLabel,
  localizedSnapshot,
  paymentMethodLabel,
  paymentStatusLabel,
  sortOrdersByLatestActivity,
  statusLabel,
  totalItemQuantity,
  type Language,
} from './src/presentation';
import {
  getBondedPrinters,
  printReceipt,
  type BondedPrinter,
  type PrinterConfig,
} from './src/printer/adapter';
import { playNewOrderAlert } from './src/push';
import {
  loadCachedOrders,
  loadLanguage,
  loadPrinterConfig,
  loadSession,
  saveCachedOrders,
  saveLanguage,
  savePrinterConfig,
  saveSession,
} from './src/storage';
import type { Order, Session } from './src/types';
import { Button, Field, Loading, colors, styles } from './src/ui';

type Screen = 'queue' | 'settings';
type AuthorizedRequest = <T>(
  operation: (accessToken: string) => Promise<T>,
) => Promise<T>;

const words = {
  de: {
    title: 'Bestellungen',
    settings: 'Einstellungen',
    queue: 'Bestellungen',
    offline:
      'Offline – gespeicherte Bestellungen sind verfügbar, Aktionen sind deaktiviert.',
    live: 'Live · Aktualisierung alle 10 Sekunden',
    empty: 'Keine aktiven Bestellungen',
    retry: 'Erneut versuchen',
    items: 'Artikel',
    placed: 'Bestellt',
    products: 'Bestellte Artikel',
    totals: 'Beträge',
    customer: 'Kunde & Lieferung',
    payment: 'Zahlung',
    timeline: 'Verlauf',
    note: 'Bestellhinweis',
    actions: 'Bestellung bearbeiten',
    receipt: 'Beleg',
    subtotal: 'Zwischensumme',
    discount: 'Rabatt',
    deliveryFee: 'Liefergebühr',
    tax: 'Steuer',
    total: 'Gesamt',
    print: 'Beleg drucken',
    cash: 'Barzahlung bestätigen',
    close: 'Zurück',
    danger: 'Gefahrenbereich',
    cancel: 'Bestellung stornieren',
    refund: 'Erstatten & stornieren',
    reason: 'Grund',
    confirmCancel: 'Stornierung bestätigen',
    confirmRefund: 'Erstattung & Stornierung bestätigen',
    language: 'Sprache',
    printer: 'Drucker',
    printMode: 'Druckmethode',
    systemPrint: 'Android-Druckdienst',
    bluetooth: 'Bluetooth ESC/POS',
    paired: 'Gekoppelte Drucker',
    refreshPrinters: 'Drucker aktualisieren',
    testPrint: 'Testbeleg',
    width: 'Papierbreite',
    autoCut: 'Automatisch schneiden',
    signOut: 'Abmelden',
    signOutConfirm: 'Möchten Sie sich wirklich abmelden?',
    cancelAction: 'Abbrechen',
    confirm: 'Abmelden',
    noPrinter: 'Koppeln Sie den Drucker zuerst in den Android-Einstellungen.',
    loading: 'Wird geladen…',
    more: 'weitere',
    contact: 'Kontakt',
  },
  en: {
    title: 'Orders',
    settings: 'Settings',
    queue: 'Orders',
    offline: 'Offline – cached orders remain available; actions are disabled.',
    live: 'Live · refreshes every 10 seconds',
    empty: 'No active orders',
    retry: 'Retry',
    items: 'items',
    placed: 'Placed',
    products: 'Ordered items',
    totals: 'Totals',
    customer: 'Customer & fulfillment',
    payment: 'Payment',
    timeline: 'Timeline',
    note: 'Order note',
    actions: 'Order actions',
    receipt: 'Receipt',
    subtotal: 'Subtotal',
    discount: 'Discount',
    deliveryFee: 'Delivery fee',
    tax: 'Tax',
    total: 'Total',
    print: 'Print receipt',
    cash: 'Confirm cash paid',
    close: 'Back',
    danger: 'Danger zone',
    cancel: 'Cancel order',
    refund: 'Refund & cancel',
    reason: 'Reason',
    confirmCancel: 'Confirm cancellation',
    confirmRefund: 'Confirm refund & cancellation',
    language: 'Language',
    printer: 'Printer',
    printMode: 'Print method',
    systemPrint: 'Android print service',
    bluetooth: 'Bluetooth ESC/POS',
    paired: 'Paired printers',
    refreshPrinters: 'Refresh printers',
    testPrint: 'Test receipt',
    width: 'Paper width',
    autoCut: 'Automatic cutter',
    signOut: 'Sign out',
    signOutConfirm: 'Are you sure you want to sign out?',
    cancelAction: 'Cancel',
    confirm: 'Sign out',
    noPrinter: 'Pair the printer in Android Settings first.',
    loading: 'Loading…',
    more: 'more',
    contact: 'Contact',
  },
} as const;

export default function App() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [screen, setScreen] = useState<Screen>('queue');
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [language, setLanguage] = useState<Language>('de');
  const [printer, setPrinter] = useState<PrinterConfig>({
    paperWidth: 58,
    connection: 'android-print-service',
    autoCut: false,
  });
  const knownOrderNumbers = useRef<Set<string> | null>(null);

  useEffect(() => {
    Promise.all([
      loadSession(),
      loadCachedOrders(),
      loadLanguage(),
      loadPrinterConfig(),
    ]).then(([savedSession, cached, savedLanguage, savedPrinter]) => {
      setSession(savedSession);
      setOrders(cached);
      setLanguage(savedLanguage);
      setPrinter(savedPrinter);
      setBooting(false);
    });
  }, []);

  const runAuthorized = useCallback(
    async <T,>(operation: (token: string) => Promise<T>) => {
      if (!session) throw new api.ApiError(401, 'TOKEN_REQUIRED');
      try {
        return await operation(session.accessToken);
      } catch (error) {
        if (!(error instanceof api.ApiError) || error.status !== 401)
          throw error;
        const refreshed = await api.refresh(session.refreshToken);
        setSession(refreshed);
        await saveSession(refreshed);
        return operation(refreshed.accessToken);
      }
    },
    [session],
  );

  const loadOrders = useCallback(
    async (showRefresh = false) => {
      if (!session) return;
      if (showRefresh) setRefreshing(true);
      try {
        const next = await runAuthorized(api.getOrders);
        const nextOrderNumbers = new Set(next.map(order => order.orderNumber));
        if (
          knownOrderNumbers.current &&
          next.some(order => !knownOrderNumbers.current!.has(order.orderNumber))
        )
          playNewOrderAlert();
        knownOrderNumbers.current = nextOrderNumbers;
        setOrders(next);
        setSelected(current =>
          current
            ? (next.find(order => order.orderNumber === current.orderNumber) ??
              null)
            : null,
        );
        setOffline(false);
        await saveCachedOrders(next);
      } catch {
        setOffline(true);
      } finally {
        setRefreshing(false);
      }
    },
    [runAuthorized, session],
  );

  useEffect(() => {
    knownOrderNumbers.current = null;
  }, [session?.user.id]);

  useEffect(() => {
    void loadOrders();
    const timer = setInterval(loadOrders, POLL_MS);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void loadOrders();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [loadOrders]);

  if (booting) return <Loading />;
  if (!session)
    return (
      <LoginScreen
        language={language}
        onLogin={async next => {
          setSession(next);
          await saveSession(next);
        }}
      />
    );
  const w = words[language];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      {selected ? (
        <OrderDetail
          language={language}
          order={selected}
          offline={offline}
          printer={printer}
          runAuthorized={runAuthorized}
          onClose={() => setSelected(null)}
          onChanged={async () => {
            setSelected(null);
            await loadOrders();
          }}
        />
      ) : (
        <>
          <View style={appStyles.header}>
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={styles.title}>
                Salt<Text style={{ color: colors.saffron }}>N</Text>Pepper ·{' '}
                {screen === 'queue' ? w.title : w.settings}
              </Text>
              <Text accessibilityLiveRegion="polite" style={styles.subtitle}>
                {offline ? w.offline : w.live}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={screen === 'queue' ? w.settings : w.queue}
              onPress={() =>
                setScreen(screen === 'queue' ? 'settings' : 'queue')
              }
              style={({ pressed }) => [
                appStyles.headerButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={appStyles.headerButtonText}>
                {screen === 'queue' ? w.settings : w.queue}
              </Text>
            </Pressable>
          </View>
          {offline ? (
            <View style={appStyles.offline}>
              <Text style={appStyles.offlineText}>{w.offline}</Text>
            </View>
          ) : null}
          {screen === 'settings' ? (
            <SettingsScreen
              language={language}
              setLanguage={async value => {
                setLanguage(value);
                await saveLanguage(value);
              }}
              session={session}
              printer={printer}
              setPrinter={async value => {
                setPrinter(value);
                await savePrinterConfig(value);
              }}
              onLogout={() =>
                Alert.alert(w.signOut, w.signOutConfirm, [
                  { text: w.cancelAction, style: 'cancel' },
                  {
                    text: w.confirm,
                    style: 'destructive',
                    onPress: async () => {
                      await api.logout(session.refreshToken).catch(() => null);
                      await saveSession(null);
                      setSession(null);
                    },
                  },
                ])
              }
            />
          ) : (
            <QueueScreen
              language={language}
              orders={orders}
              offline={offline}
              refreshing={refreshing}
              onRefresh={() => loadOrders(true)}
              onSelect={async order => {
                setSelected(order);
                if (!offline)
                  try {
                    setSelected(
                      await runAuthorized(token =>
                        api.getOrder(token, order.orderNumber),
                      ),
                    );
                  } catch {}
              }}
            />
          )}
        </>
      )}
    </View>
  );
}

function LoginScreen({
  language,
  onLogin,
}: {
  language: Language;
  onLogin: (session: Session) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { flexGrow: 1, justifyContent: 'center' },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          accessibilityRole="header"
          style={[styles.wordmark, { alignSelf: 'center' }]}
        >
          Zambiel
        </Text>
        <Text style={styles.title}>
          {language === 'de' ? 'Mitarbeiter-Anmeldung' : 'Staff login'}
        </Text>
        <Text style={styles.subtitle}>
          {language === 'de'
            ? 'Mit einem Eigentümer- oder Mitarbeiterkonto anmelden.'
            : 'Sign in with an owner or staff account.'}
        </Text>
        <Field
          label="Email"
          value={email}
          keyboardType="email-address"
          autoComplete="email"
          onChangeText={setEmail}
        />
        <Field
          label={language === 'de' ? 'Passwort' : 'Password'}
          value={password}
          secureTextEntry
          autoComplete="current-password"
          onChangeText={setPassword}
        />
        <Button
          label={
            loading
              ? words[language].loading
              : language === 'de'
                ? 'Anmelden'
                : 'Sign in'
          }
          loading={loading}
          disabled={!email || !password}
          onPress={async () => {
            setLoading(true);
            try {
              await onLogin(
                await api.login(email.trim(), password, 'Zambiel Android'),
              );
            } catch {
              Alert.alert(
                language === 'de' ? 'Anmeldung fehlgeschlagen' : 'Login failed',
                language === 'de'
                  ? 'E-Mail und Passwort prüfen.'
                  : 'Check the email and password.',
              );
            } finally {
              setLoading(false);
            }
          }}
        />
      </ScrollView>
    </View>
  );
}

function QueueScreen({
  language,
  orders,
  offline,
  refreshing,
  onRefresh,
  onSelect,
}: {
  language: Language;
  orders: Order[];
  offline: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onSelect: (order: Order) => void;
}) {
  const w = words[language];
  return (
    <FlatList
      data={sortOrdersByLatestActivity(orders)}
      keyExtractor={item => item.orderNumber}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.saffron]}
        />
      }
      ListEmptyComponent={
        <View style={[styles.center, { minHeight: 420, gap: 12 }]}>
          <Text style={styles.title}>{w.empty}</Text>
          <Text style={styles.subtitle}>
            {formatZurichDateTime(new Date().toISOString(), language)}
          </Text>
          {offline ? (
            <Button secondary label={w.retry} onPress={onRefresh} />
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <OrderCard
          language={language}
          order={item}
          offline={offline}
          onPress={() => onSelect(item)}
        />
      )}
    />
  );
}

function OrderCard({
  language,
  order,
  offline,
  onPress,
}: {
  language: Language;
  order: Order;
  offline: boolean;
  onPress: () => void;
}) {
  const w = words[language];
  const preview = order.items[0];
  const remaining = order.items.length - 1;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${order.orderNumber}, ${statusLabel(order.status, language)}, ${order.customerName}`}
      accessibilityHint={offline ? w.offline : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        appStyles.orderCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        <Text style={appStyles.orderNumber}>{order.orderNumber}</Text>
        <Text style={styles.status}>{statusLabel(order.status, language)}</Text>
      </View>
      <Text style={appStyles.customer}>{order.customerName}</Text>
      <Text style={styles.muted}>
        {fulfillmentLabel(order.fulfillmentType, language)} ·{' '}
        {w.placed} {formatZurichDateTime(order.createdAt, language)}
      </Text>
      {preview ? (
        <Text numberOfLines={1} style={styles.label}>
          {preview.quantity}×{' '}
          {localizedSnapshot(
            preview.productNameDe,
            preview.productNameEn,
            language,
          )}
          {preview.variantNameDe || preview.variantNameEn
            ? ` · ${localizedSnapshot(preview.variantNameDe, preview.variantNameEn, language)}`
            : ''}
        </Text>
      ) : null}
      {remaining > 0 ? (
        <Text style={styles.muted}>
          +{remaining} {w.more}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Text style={styles.muted}>
          {totalItemQuantity(order)} {w.items} ·{' '}
          {paymentStatusLabel(order.payment?.status ?? null, language)}
        </Text>
        <Text style={appStyles.total}>
          {formatChf(order.totalRappen, language)}
        </Text>
      </View>
    </Pressable>
  );
}

function OrderDetail({
  language,
  order,
  offline,
  printer,
  runAuthorized,
  onClose,
  onChanged,
}: {
  language: Language;
  order: Order;
  offline: boolean;
  printer: PrinterConfig;
  runAuthorized: AuthorizedRequest;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const w = words[language];
  const [busy, setBusy] = useState('');
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => listener.remove();
  }, [onClose]);
  const perform = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await action();
      await onChanged();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Action failed. Retry.',
      );
    } finally {
      setBusy('');
    }
  };
  const call = () =>
    Linking.openURL(`tel:${order.customerPhone.replace(/\s/g, '')}`);
  const map = order.address
    ? () =>
        Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.address!.street}, ${order.address!.postalCode} ${order.address!.city}`)}`,
        )
    : undefined;
  return (
    <View style={styles.screen}>
      <View style={appStyles.detailHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={appStyles.headerButton}
        >
          <Text style={appStyles.headerButtonText}>‹ {w.close}</Text>
        </Pressable>
        <Text
          numberOfLines={1}
          style={[appStyles.orderNumber, appStyles.detailOrderNumber]}
        >
          {order.orderNumber}
        </Text>
        <Text numberOfLines={1} style={styles.status}>
          {statusLabel(order.status, language)}
        </Text>
      </View>
      <ScrollView
        style={appStyles.detailScroll}
        contentContainerStyle={[styles.content, appStyles.detailContent]}
      >
        <View style={[styles.card, appStyles.heroCard]}>
          <Text style={appStyles.heroStatus}>
            {fulfillmentLabel(order.fulfillmentType, language)}
          </Text>
          <Text style={appStyles.heroMeta}>
            {w.placed} · {formatZurichDateTime(order.createdAt, language)}
          </Text>
        </View>
        <Section title={w.products}>
          {order.items.map((item, index) => (
            <View key={index} style={appStyles.product}>
              <View style={appStyles.productRow}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={appStyles.productImage}
                    accessibilityLabel={localizedSnapshot(
                      item.productNameDe,
                      item.productNameEn,
                      language,
                    )}
                  />
                ) : (
                  <View style={[appStyles.productImage, appStyles.placeholder]}>
                    <Text style={appStyles.placeholderText}>SNP</Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={appStyles.productTitle}>
                    {item.quantity}×{' '}
                    {localizedSnapshot(
                      item.productNameDe,
                      item.productNameEn,
                      language,
                    )}
                  </Text>
                  {item.variantNameDe || item.variantNameEn ? (
                    <Text style={styles.muted}>
                      {localizedSnapshot(
                        item.variantNameDe,
                        item.variantNameEn,
                        language,
                      )}
                    </Text>
                  ) : null}
                  <Text style={styles.muted}>
                    {formatChf(item.unitPriceRappen, language)} /{' '}
                    {language === 'de' ? 'Stück' : 'each'}
                  </Text>
                </View>
                <Text style={appStyles.total}>
                  {formatChf(item.lineSubtotalRappen, language)}
                </Text>
              </View>
              {item.options.map((option, optionIndex) => (
                <Text key={optionIndex} style={appStyles.option}>
                  + {localizedSnapshot(option.nameDe, option.nameEn, language)}
                  {option.priceDeltaRappen
                    ? ` (${formatChf(option.priceDeltaRappen, language)})`
                    : ''}
                </Text>
              ))}
            </View>
          ))}
        </Section>
        <Section title={w.totals}>
          <MoneyRow
            label={w.subtotal}
            value={order.subtotalRappen}
            language={language}
          />
          {order.discountRappen > 0 ? (
            <MoneyRow
              label={w.discount}
              value={-order.discountRappen}
              language={language}
            />
          ) : null}
          {order.deliveryFeeRappen > 0 ? (
            <MoneyRow
              label={w.deliveryFee}
              value={order.deliveryFeeRappen}
              language={language}
            />
          ) : null}
          {order.taxAmountRappen > 0 ? (
            <MoneyRow
              label={w.tax}
              value={order.taxAmountRappen}
              language={language}
            />
          ) : null}
          <View style={styles.divider} />
          <MoneyRow
            label={w.total}
            value={order.totalRappen}
            language={language}
            strong
          />
        </Section>
        <Section title={w.customer}>
          <Text style={appStyles.customer}>{order.customerName}</Text>
          <Pressable
            accessibilityRole="link"
            onPress={call}
            style={appStyles.link}
          >
            <Text style={appStyles.linkText}>{order.customerPhone}</Text>
          </Pressable>
          <Text style={styles.muted}>{order.customerEmail}</Text>
          {order.address ? (
            <Pressable
              accessibilityRole="link"
              onPress={map}
              style={appStyles.link}
            >
              <Text style={appStyles.linkText}>
                {order.address.recipientName}
                {'\n'}
                {order.address.street}
                {order.address.streetExtra
                  ? `, ${order.address.streetExtra}`
                  : ''}
                {'\n'}
                {order.address.postalCode} {order.address.city}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.muted}>
              {fulfillmentLabel(order.fulfillmentType, language)}
            </Text>
          )}
        </Section>
        <Section title={w.payment}>
          <Text style={styles.label}>
            {paymentStatusLabel(order.payment?.status ?? null, language)}
          </Text>
          <Text style={styles.muted}>
            {paymentMethodLabel(order.paymentMethod, language)}
          </Text>
        </Section>
        {order.note ? (
          <Section title={w.note}>
            <Text style={styles.muted}>{order.note}</Text>
          </Section>
        ) : null}
        {order.statusEvents.length ? (
          <Section title={w.timeline}>
            {order.statusEvents.map((event, index) => (
              <View key={index} style={appStyles.timeline}>
                <View style={appStyles.dot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>
                    {statusLabel(event.toStatus, language)}
                  </Text>
                  <Text style={styles.muted}>
                    {formatZurichDateTime(event.createdAt, language)}
                    {event.actorName ? ` · ${event.actorName}` : ''}
                  </Text>
                  {event.reason ? (
                    <Text style={styles.muted}>{event.reason}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </Section>
        ) : null}
        <Section title={w.actions}>
          {order.allowedActions.nextStatus ? (
            <Button
              loading={busy === 'advance'}
              label={statusLabel(order.allowedActions.nextStatus, language)}
              disabled={offline}
              onPress={() =>
                perform('advance', () =>
                  runAuthorized(token => api.advanceOrder(token, order)),
                )
              }
            />
          ) : null}
          {order.allowedActions.canConfirmCash ? (
            <Button
              secondary
              loading={busy === 'cash'}
              label={w.cash}
              disabled={offline}
              onPress={() =>
                perform('cash', () =>
                  runAuthorized(token =>
                    api.confirmCash(token, order.orderNumber),
                  ),
                )
              }
            />
          ) : null}
        </Section>
        <Section title={w.receipt}>
          <Button
            secondary
            loading={busy === 'print'}
            label={w.print}
            onPress={() =>
              perform('print', async () => {
                const result = await printReceipt(order, printer);
                Alert.alert(w.print, result.message);
              })
            }
          />
        </Section>
        {order.allowedActions.canCancel ||
        order.allowedActions.canRefundAndCancel ? (
          <View style={appStyles.dangerZone}>
            <Text style={appStyles.dangerTitle}>{w.danger}</Text>
            <Button
              danger
              label={
                order.allowedActions.canRefundAndCancel
                  ? `${w.refund} · ${formatChf(order.remainingRefundableRappen, language)}`
                  : w.cancel
              }
              disabled={offline || !!busy}
              onPress={() => setReasonOpen(true)}
            />
            {reasonOpen ? (
              <View style={{ gap: 12 }}>
                <Field
                  label={w.reason}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  error={
                    reason.length > 0 && reason.trim().length < 3
                      ? language === 'de'
                        ? 'Mindestens 3 Zeichen'
                        : 'Use at least 3 characters'
                      : undefined
                  }
                />
                <Button
                  danger
                  loading={busy === 'cancel'}
                  label={
                    order.allowedActions.canRefundAndCancel
                      ? w.confirmRefund
                      : w.confirmCancel
                  }
                  disabled={reason.trim().length < 3}
                  onPress={() =>
                    perform('cancel', () =>
                      order.allowedActions.canRefundAndCancel
                        ? runAuthorized(token =>
                            api.refundAndCancelOrder(
                              token,
                              order,
                              reason.trim(),
                            ),
                          )
                        : runAuthorized(token =>
                            api.cancelOrder(
                              token,
                              order.orderNumber,
                              reason.trim(),
                            ),
                          ),
                    )
                  }
                />
                <Button
                  secondary
                  label={w.cancelAction}
                  onPress={() => {
                    setReasonOpen(false);
                    setReason('');
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.divider} />
      {children}
    </View>
  );
}
function MoneyRow({
  label,
  value,
  language,
  strong,
}: {
  label: string;
  value: number;
  language: Language;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={strong ? appStyles.customer : styles.muted}>{label}</Text>
      <Text style={strong ? appStyles.totalStrong : appStyles.total}>
        {formatChf(value, language)}
      </Text>
    </View>
  );
}

function SettingsScreen({
  language,
  setLanguage,
  session,
  printer,
  setPrinter,
  onLogout,
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  session: Session;
  printer: PrinterConfig;
  setPrinter: (printer: PrinterConfig) => void;
  onLogout: () => void;
}) {
  const w = words[language];
  const [printers, setPrinters] = useState<BondedPrinter[]>([]);
  const [printerError, setPrinterError] = useState('');
  const refresh = async () => {
    setPrinterError('');
    try {
      setPrinters(await getBondedPrinters());
    } catch (error) {
      setPrinterError(error instanceof Error ? error.message : w.noPrinter);
    }
  };
  return (
    <ScrollView
      style={appStyles.settings}
      contentContainerStyle={styles.content}
    >
      <Section title={session.user.name ?? session.user.email}>
        <Text style={styles.muted}>
          {session.user.email} · {session.user.role}
        </Text>
      </Section>
      <Section title={w.language}>
        <View style={appStyles.choiceRow}>
          <Choice
            selected={language === 'de'}
            label="Deutsch"
            onPress={() => setLanguage('de')}
          />
          <Choice
            selected={language === 'en'}
            label="English"
            onPress={() => setLanguage('en')}
          />
        </View>
      </Section>
      <Section title={w.printer}>
        <Text style={styles.label}>{w.printMode}</Text>
        <View style={appStyles.choiceRow}>
          <Choice
            selected={printer.connection === 'android-print-service'}
            label={w.systemPrint}
            onPress={() =>
              setPrinter({ ...printer, connection: 'android-print-service' })
            }
          />
          <Choice
            selected={printer.connection === 'bluetooth-escpos'}
            label={w.bluetooth}
            onPress={() =>
              setPrinter({ ...printer, connection: 'bluetooth-escpos' })
            }
          />
        </View>
        <Text style={styles.label}>{w.width}</Text>
        <View style={appStyles.choiceRow}>
          <Choice
            selected={printer.paperWidth === 58}
            label="58 mm"
            onPress={() => setPrinter({ ...printer, paperWidth: 58 })}
          />
          <Choice
            selected={printer.paperWidth === 80}
            label="80 mm"
            onPress={() => setPrinter({ ...printer, paperWidth: 80 })}
          />
        </View>
        <Choice
          selected={!!printer.autoCut}
          label={w.autoCut}
          onPress={() => setPrinter({ ...printer, autoCut: !printer.autoCut })}
        />
        {printer.connection === 'bluetooth-escpos' ? (
          <>
            <Button secondary label={w.refreshPrinters} onPress={refresh} />
            {printerError ? (
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {printerError}
              </Text>
            ) : null}
            {printers.length ? (
              <FlatList
                scrollEnabled={false}
                data={printers}
                keyExtractor={item => item.address}
                renderItem={({ item }) => (
                  <Choice
                    selected={printer.address === item.address}
                    label={`${item.name}\n${item.address}`}
                    onPress={() =>
                      setPrinter({ ...printer, address: item.address })
                    }
                  />
                )}
              />
            ) : (
              <Text style={styles.muted}>{w.noPrinter}</Text>
            )}
          </>
        ) : null}
      </Section>
      <View style={appStyles.settingsDanger}>
        <Button danger label={w.signOut} onPress={onLogout} />
      </View>
    </ScrollView>
  );
}

function Choice({
  selected,
  label,
  onPress,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        appStyles.choice,
        selected && appStyles.choiceSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, selected && { color: '#FFFFFF' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const appStyles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  headerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 72,
    paddingHorizontal: 12,
  },
  headerButtonText: { color: colors.plum, fontSize: 15, fontWeight: '800' },
  offline: {
    backgroundColor: '#FFF3CD',
    borderBottomColor: '#E6C65A',
    borderBottomWidth: 1,
    padding: 10,
  },
  offlineText: {
    color: '#664D03',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  orderCard: {
    borderLeftColor: colors.saffron,
    borderLeftWidth: 5,
    gap: 6,
    padding: 12,
  },
  orderNumber: { color: colors.text, fontSize: 18, fontWeight: '900' },
  customer: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
  },
  total: {
    color: colors.text,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  totalStrong: {
    color: colors.saffron,
    fontSize: 19,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  detailHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detailOrderNumber: { flex: 1, textAlign: 'center' },
  detailScroll: { flex: 1 },
  detailContent: { paddingBottom: 48 },
  heroCard: { backgroundColor: colors.plum },
  heroStatus: { color: '#F7CBBE', fontSize: 19, fontWeight: '900' },
  heroMeta: { color: 'white', fontSize: 15, lineHeight: 22 },
  product: { gap: 8, paddingVertical: 6 },
  productRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  productImage: {
    backgroundColor: colors.subtle,
    borderRadius: 12,
    height: 64,
    width: 64,
  },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: colors.saffron, fontWeight: '900' },
  productTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  option: { color: colors.muted, fontSize: 13, lineHeight: 19, marginLeft: 76 },
  link: { justifyContent: 'center', minHeight: 48 },
  linkText: {
    color: colors.saffron,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  timeline: { flexDirection: 'row', gap: 12, paddingVertical: 6 },
  dot: {
    backgroundColor: colors.saffron,
    borderRadius: 6,
    height: 12,
    marginTop: 4,
    width: 12,
  },
  dangerZone: {
    borderColor: colors.danger,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    marginTop: 24,
    padding: 16,
  },
  dangerTitle: { color: colors.danger, fontSize: 18, fontWeight: '900' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 96,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceSelected: { backgroundColor: colors.plum, borderColor: colors.plum },
  settings: { flex: 1 },
  settingsDanger: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 24,
  },
});
