// File: src/utils/formatDate.js
// Description: Simple timestamp -> "2h ago" formatter.

export default function formatDate(value) {
  if (!value) return '';
  const date = value.seconds ? new Date(value.seconds * 1000) : new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}
