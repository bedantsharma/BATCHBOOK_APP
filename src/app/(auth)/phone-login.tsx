import { View, Text } from 'react-native';
import C from '../../constants/colors';

export default function PhoneLoginScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: C.text }}>Phone Login Screen (placeholder)</Text>
    </View>
  );
}
