export const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const handleError = (error) => {
  console.error(error);
  return error?.response?.data?.message || 'Something went wrong';
};
