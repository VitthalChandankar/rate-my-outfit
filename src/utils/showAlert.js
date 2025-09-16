// src/utils/showAlert.js
import useModalStore from '../store/useModalStore';

/**
 * Shows a global custom alert.
 * @param {string} title - The title of the alert.
 * @param {string} [message] - The message body of the alert.
 * @param {Array<Object>} [buttons] - An array of button objects, similar to Alert.alert.
 *   Each button is an object with `text`, `onPress`, and `style` ('default', 'cancel', 'destructive').
 */
const showAlert = (title, message, buttons) => {
  const alertButtons = Array.isArray(buttons) && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  useModalStore.getState().show({ title, message, buttons: alertButtons });
};

export default showAlert;