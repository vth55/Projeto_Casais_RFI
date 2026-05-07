import { useState, useCallback } from 'react';

export const useFormState = (initialData, onSave) => {
  const [formData, setFormData] = useState(initialData);

  const handleFieldChange = useCallback((field) => (e) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSave(formData);
  }, [formData, onSave]);

  const reset = useCallback(() => {
    setFormData(initialData);
  }, [initialData]);

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  return {
    formData,
    setFormData,
    handleFieldChange,
    handleSubmit,
    reset,
    updateField,
  };
};
