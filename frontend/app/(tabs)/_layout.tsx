import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import { theme } from '@/constants/Colors';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';


function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.buttonDark,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.cardBackground,
          borderTopColor: theme.colors.border,
          height: 70,
          paddingBottom: 9,
          paddingTop: 7,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Nunito_700Bold',
        },
        headerStyle: {
          backgroundColor: theme.colors.cardBackground,
        },
        headerTitleStyle: {
          fontFamily: 'Nunito_800ExtraBold',
        },

        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Planner',
          tabBarIcon: ({ color }) => <TabBarIcon name="list-ul" color={color} />,
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="magic"
                    size={25}
                    color={theme.colors.buttonDark}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="overview"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color }) => <TabBarIcon name="pie-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Users',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
