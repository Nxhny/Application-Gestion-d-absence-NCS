import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';


export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#eeccffff',
        tabBarInactiveTintColor: 'white',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#1d2452',
        },
      }}>
      
      <Tabs.Screen
        name="manager"
        options={{
          title: 'Manager',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="checkmark-circle"
              size={size}
              color={ color} 
            />
          ),
       }}
      />

      <Tabs.Screen
        name="MonProfil"
        options={{
          title: 'Mon Profil',
          tabBarIcon: ({ color,size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
            
          ),
        }}
      />
        <Tabs.Screen
        name="demande"
        options={{
          title: 'Demandes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create-outline" size={size} color={color} />
          ),
        
      }}
/>

      <Tabs.Screen
        name="mes-demandes"
        options={{
          title: 'Mes demandes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={ color} />
          ),
        
        }}
      />

      <Tabs.Screen
        name="remplacement"
        options={{
          title: 'Remplacement',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="repeat-outline" size={size} color={ color} />
          ),
        
        }}
      />

    </Tabs> 
  );
}