// src/screens/settings/LanguageScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../../config/i18n';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'hi', label: 'हिन्दी' },
];

export default function LanguageScreen({ navigation }) {
  const currentLanguage = i18n.locale.split('-')[0];

  const selectLanguage = async (langCode) => {
    try {
      i18n.locale = langCode;
      await AsyncStorage.setItem('@user_language', langCode);
      navigation.goBack();
    } catch (e) {
      console.error('Failed to save language preference.', e);
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = currentLanguage === item.code;
    return (
      <TouchableOpacity style={styles.row} onPress={() => selectLanguage(item.code)}>
        <Text style={[styles.label, isSelected && styles.labelSelected]}>{item.label}</Text>
        {isSelected && <Ionicons name="checkmark-circle" size={24} color="#7A5AF8" />}
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={LANGUAGES}
      renderItem={renderItem}
      keyExtractor={(item) => item.code}
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  label: { fontSize: 16 },
  labelSelected: { fontWeight: 'bold', color: '#7A5AF8' },
});
