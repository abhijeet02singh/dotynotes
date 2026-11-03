import React, { Component } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';

/**
 * Production-ready React Error Boundary for DotyNotes.
 *
 * Catches unhandled JavaScript render errors anywhere in the component tree,
 * logs them for debugging, prevents application white-screens/crashes,
 * and displays a clean, user-friendly recovery interface.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log without silently swallowing the error
    console.error('[DotyNotes ErrorBoundary] Uncaught render error:', error);
    if (errorInfo?.componentStack) {
      console.error('[DotyNotes ErrorBoundary] Component stack:', errorInfo.componentStack);
    }
    this.setState({ errorInfo });

    if (typeof this.props.onError === 'function') {
      try {
        this.props.onError(error, errorInfo);
      } catch (_) {}
    }
  }

  handleReload = () => {
    if (typeof this.props.onReset === 'function') {
      try {
        this.props.onReset();
      } catch (_) {}
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          resetError: this.handleReload,
        });
      }

      const errorMessage =
        this.state.error?.message ||
        (typeof this.state.error === 'string' ? this.state.error : 'An unexpected error occurred');

      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFF8FA" />
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>⚠️</Text>
              </View>

              <Text style={styles.title}>Something went wrong</Text>
              <Text style={styles.subtitle}>
                DotyNotes encountered an unexpected issue while displaying this screen.
                Your notes and data remain safely preserved in the database.
              </Text>

              <View style={styles.errorBox}>
                <Text style={styles.errorLabel}>Error Details:</Text>
                <Text style={styles.errorText} numberOfLines={4}>
                  {errorMessage}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.handleReload}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Reload application"
              >
                <Text style={styles.retryButtonText}>↺ Reload App</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8FA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0DCE4',
    shadowColor: '#E85D8E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FCE7EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#29212A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#786A73',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#FFF8FA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0DCE4',
    marginBottom: 24,
  },
  errorLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9B8C96',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#D84378',
    fontFamily: 'monospace',
  },
  retryButton: {
    width: '100%',
    backgroundColor: '#E85D8E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E85D8E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

