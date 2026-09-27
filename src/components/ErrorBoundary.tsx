import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography, buttonHeight } from '../theme/colors';
import { trackError } from '../services/analytics';

interface State {
  hasError: boolean;
}

// Last line of defense: a render crash shows a calm recovery screen instead
// of a white screen, and is reported (anonymously) to the admin console.
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    trackError(error, 'render');
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>Sorry about that. Your focus history is safe on this device.</Text>
        <Pressable style={styles.btn} onPress={() => this.setState({ hasError: false })} accessibilityRole="button">
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { ...typography.heading, color: colors.text, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  btn: { height: buttonHeight, paddingHorizontal: 28, borderRadius: radius.card, backgroundColor: colors.primary, justifyContent: 'center' },
  btnText: { ...typography.title, color: colors.white },
});
