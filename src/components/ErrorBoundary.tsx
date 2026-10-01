import React from 'react';
import { StyleSheet, View } from 'react-native';
import { trackError } from '../services/analytics';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { lightColors } from '../theme/colors';
import { space } from '../theme/spacing';

interface State {
  hasError: boolean;
}

// Last line of defense: a render crash shows a calm recovery screen instead
// of a white screen, and is reported (anonymously) to the admin console.
// Sits above ThemeProvider, so it paints with the light palette.
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
        <View style={styles.badge}>
          <Icon name="leaf" size="lg" color={lightColors.growth} />
        </View>
        <AppText variant="heading" align="center">Something went wrong</AppText>
        <AppText variant="body" tone="secondary" align="center" style={styles.body}>
          Sorry about that. Your focus history is safe on this device.
        </AppText>
        <Button label="Try again" icon="reset" onPress={() => this.setState({ hasError: false })} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightColors.background, alignItems: 'center', justifyContent: 'center', padding: space.xxxl },
  badge: { width: 64, height: 64, borderRadius: 32, backgroundColor: lightColors.growthSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  body: { marginTop: space.sm, marginBottom: space.xxl },
});
