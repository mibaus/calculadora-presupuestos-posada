import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>App Test - Funcionando</Text>
      <Text style={{ fontSize: 16, marginTop: 10 }}>Si ves esto, la app carga correctamente</Text>
    </SafeAreaView>
  );
}
