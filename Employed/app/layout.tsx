import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUserRole } from '@/hooks/useUserRole';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { role, loading } = useUserRole();

  if (loading) return null;
if (role === 'manager'){
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      {role === 'manager' && (
        <Tabs.Screen
          name="manager"
          options={{
            title: 'Demandes',
            tabBarIcon: ({ color }) => (
              <Ionicons name="checkmark-circle" size={28} color={color} />
            ),
          }}
        />
      )}
      {role === 'manager' && (
        <Tabs.Screen
          name="remplacement_manager"
          options={{
            title: 'Remplacements',
            tabBarIcon: ({ color }) => (
              <Ionicons name="swap-horizontal" size={28} color={color} />
            ),
          }}
        />
      )}
    </Tabs>
  );
}

if (role !== 'manager' ) {
  return (
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      {(role === 'agent' || role === 'enseignant') && (
        <Tabs.Screen
          name="mes-demandes"
          options={{
            title: 'Mes demandes',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list" size={size} color={color} />
            ),
          }}
        />
      )}

      <Tabs.Screen
        name="MonProfil"
        options={{
          title: 'Mon Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
  }
}