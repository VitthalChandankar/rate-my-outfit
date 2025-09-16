// src/store/useModalStore.js
import { create } from 'zustand';

const useModalStore = create((set) => ({
  isVisible: false,
  title: '',
  message: '',
  buttons: [],
  show: ({ title, message, buttons }) => set({ isVisible: true, title, message, buttons }),
  hide: () => set({ isVisible: false, title: '', message: '', buttons: [] }),
}));

export default useModalStore;