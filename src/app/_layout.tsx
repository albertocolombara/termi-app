import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { migrar } from '@/data/db/migracoes';
import { queryClient } from '@/data/remote/queryClient';
import { color } from '@/ds';
import { SomDoVoo } from '@/features/voo/SomDoVoo';
import { configurarAvisos } from '@/services/avisos';

export default function RootLayout() {
  useEffect(() => {
    configurarAvisos().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.bg.app }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SQLiteProvider databaseName="termi.db" onInit={(db) => migrar(db).then(() => undefined)}>
            <StatusBar style="light" />
            <SomDoVoo />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg.app } }} />
          </SQLiteProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
