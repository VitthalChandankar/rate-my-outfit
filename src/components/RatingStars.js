// File: src/components/RatingStars.js
// Description: 1-5 interactive star component

import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';

export default function RatingStars({ value = 0, onChange = () => {}, readonly = false, size = 22 }) {
  const renderStar = (i) => {
    const filled = i <= value;
    return (
      <TouchableOpacity key={i} onPress={() => !readonly && onChange(i)} activeOpacity={0.7}>
        <Ionicons name={filled ? 'star' : 'star-outline'} size={size} color={filled ? '#FFC107' : '#999'} style={{ marginHorizontal: 4 }} />
      </TouchableOpacity>
    );
  };

  return <View style={{ flexDirection: 'row', alignItems: 'center' }}>{[1, 2, 3, 4, 5].map(renderStar)}</View>;
}
