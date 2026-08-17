import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index"><Icon sf={{ default: 'stopwatch', selected: 'stopwatch.fill' }} /><Label>Crono</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="history"><Icon sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }} /><Label>Historial</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="athletes"><Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} /><Label>Deportistas</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats"><Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} /><Label>Gráficas</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings"><Icon sf={{ default: 'gear', selected: 'gear.badge.checkmark' }} /><Label>Ajustes</Label></NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.mutedForeground,
      headerShown: false,
      tabBarLabelStyle: { fontSize: 10 },
      tabBarStyle: {
        position: 'absolute',
        backgroundColor: isIOS ? 'transparent' : colors.background,
        borderTopWidth: isWeb ? 1 : StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        elevation: 0,
        ...(isWeb ? { height: 84 } : {}),
      },
      tabBarBackground: () => isIOS ? <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : isWeb ? <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} /> : null,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Crono', tabBarIcon: ({ color, focused }) => isIOS ? <SymbolView name={focused ? 'stopwatch.fill' : 'stopwatch'} tintColor={color} size={24} /> : <Ionicons name={focused ? 'stopwatch' : 'stopwatch-outline'} size={23} color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: 'Historial', tabBarIcon: ({ color, focused }) => isIOS ? <SymbolView name={focused ? 'list.bullet.rectangle.fill' : 'list.bullet.rectangle'} tintColor={color} size={24} /> : <Ionicons name={focused ? 'list' : 'list-outline'} size={23} color={color} /> }} />
      <Tabs.Screen name="athletes" options={{ title: 'Deportistas', tabBarIcon: ({ color, focused }) => isIOS ? <SymbolView name={focused ? 'person.2.fill' : 'person.2'} tintColor={color} size={24} /> : <Ionicons name={focused ? 'people' : 'people-outline'} size={23} color={color} /> }} />
      <Tabs.Screen name="stats" options={{ title: 'Gráficas', tabBarIcon: ({ color, focused }) => isIOS ? <SymbolView name={focused ? 'chart.bar.fill' : 'chart.bar'} tintColor={color} size={24} /> : <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={23} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: ({ color, focused }) => isIOS ? <SymbolView name={focused ? 'gearshape.fill' : 'gearshape'} tintColor={color} size={24} /> : <Ionicons name={focused ? 'settings' : 'settings-outline'} size={23} color={color} /> }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />;
}
