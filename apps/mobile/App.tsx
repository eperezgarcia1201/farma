import { SafeAreaView, Text, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <View>
        <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 8 }}>Farma Mobile</Text>
        <Text>Ready for mobile inventory and sales workflows.</Text>
      </View>
    </SafeAreaView>
  );
}
