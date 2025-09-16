// src/components/GlobalAlert.js
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, Button, Surface } from 'react-native-paper';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import useModalStore from '../store/useModalStore';

const GlobalAlert = () => {
  const { isVisible, title, message, buttons, hide } = useModalStore();
  const progress = useSharedValue(0);

  useEffect(() => {
    // Use a spring animation for a more physical and pleasing effect.
    progress.value = withSpring(isVisible ? 1 : 0, {
      damping: 15,
      stiffness: 250,
    });
  }, [isVisible, progress]);

  const handleButtonPress = (onPress) => {
    // Provide haptic feedback for a premium feel.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Hide the modal immediately to start the closing animation.
    hide();

    // If there's an action, execute it after a short delay.
    // This allows the modal's closing animation to run smoothly
    // without being blocked by the onPress action (e.g., an async logout).
    if (typeof onPress === 'function') {
      setTimeout(() => {
        onPress();
      }, 200); // A small delay is enough for the spring animation to start.
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.9 + progress.value * 0.1 }],
  }));

  // Automatically switch to a vertical layout for 3+ buttons or long text
  const isVerticalLayout = buttons.length > 2 || buttons.some(b => b.text.length > 15);

  return (
    <Portal>
      <Modal
        visible={isVisible}
        onDismiss={hide}
        contentContainerStyle={styles.modalContainer}
        dismissable={false}
      >
        <Animated.View style={animatedStyle}>
          <Surface style={styles.surface} elevation={5}>
            <Text style={styles.title}>{title}</Text>
            {message && <Text style={styles.message}>{message}</Text>}
            <View style={[styles.buttonContainer, isVerticalLayout && styles.buttonContainerVertical]}>
              {buttons.map((button, index) => {
                // The primary button is the last one in the array, unless it's a 'cancel' button.
                const isPrimary = !isVerticalLayout && index === buttons.length - 1 && button.style !== 'cancel';
                const mode = button.style === 'destructive' ? 'contained' : (isPrimary ? 'contained' : 'text');
                const buttonColor = button.style === 'destructive' ? '#D92D20' : (isPrimary ? '#7A5AF8' : undefined);
                const textColor = mode === 'text' ? '#7A5AF8' : '#fff';

                return (
                  <Button
                    key={button.text}
                    mode={mode}
                    onPress={() => handleButtonPress(button.onPress)}
                    style={[styles.button, isVerticalLayout && styles.buttonVertical]}
                    labelStyle={styles.buttonLabel}
                    buttonColor={buttonColor}
                    textColor={textColor}
                    contentStyle={styles.buttonContent}
                  >
                    {button.text}
                  </Button>
                );
              })}
            </View>
          </Surface>
        </Animated.View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20, // Give it breathing room from screen edges
  },
  surface: {
    padding: 20,
    paddingTop: 24,
    borderRadius: 28, // More rounded, modern look
    width: '100%',
    maxWidth: 360, // Consistent max width on all devices
    alignItems: 'center', // Center content
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'flex-end', // Aligns buttons to the right
    gap: 8,
  },
  buttonContainerVertical: {
    flexDirection: 'column-reverse', // Stacks buttons and puts primary on top
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1, // For horizontal layout to share space
    borderRadius: 12,
  },
  buttonVertical: {
    flex: 0, // Reset flex for vertical layout
    width: '100%',
  },
  buttonContent: {
    paddingVertical: 6,
  },
  buttonLabel: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default GlobalAlert;