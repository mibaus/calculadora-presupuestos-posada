import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { cabins } from '../data/cabinsData';

const AdminCabinsScreen = ({ theme, seasonalColors, onBack }) => {
  const [selectedCabin, setSelectedCabin] = useState(null);
  const [editingCabin, setEditingCabin] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [localCabins, setLocalCabins] = useState(cabins); // Estado local para mantener cambios

  // Colores estándar para la sección de cabañas (azul slate moderno)
  const cabinsColors = {
    primary: '#475569',      // Azul slate elegante
    secondary: '#64748b',    // Azul slate más claro
    accent: '#f1f5f9',       // Gris azulado muy claro para fondos
    border: '#cbd5e1'        // Gris azulado suave para bordes
  };

  // Función para seleccionar una cabaña para editar
  const handleEditCabin = (cabin) => {
    setEditingCabin({...cabin});
    setShowEditModal(true);
  };

  // Función para agregar foto
  const handleAddPhoto = async (cabinId) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permiso requerido', 'Necesitas dar permiso para acceder a las fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        Alert.alert('Éxito', 'Foto agregada correctamente');
        // Aquí implementarías la lógica para guardar la foto
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar la foto');
    }
  };

  // Función para guardar cambios
  const handleSaveCabin = () => {
    if (editingCabin) {
      // Actualizar la cabaña en el estado local
      const updatedCabins = localCabins.map(cabin => 
        cabin.id === editingCabin.id ? editingCabin : cabin
      );
      setLocalCabins(updatedCabins);
      
      Alert.alert('Guardado', 'Cambios guardados correctamente');
      setShowEditModal(false);
      setEditingCabin(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={[styles.backButtonText, { color: theme.text }]}>← Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Administrar Cabañas</Text>
      </View>

      {/* Lista de cabañas para administrar */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {localCabins.map((cabin) => (
          <View key={cabin.id} style={[styles.cabinCard, { backgroundColor: theme.surface }]}>
            <View style={styles.cabinHeader}>
              <View style={styles.cabinInfo}>
                <Text style={[styles.cabinName, { color: theme.text }]}>{cabin.name}</Text>
                <Text style={[styles.cabinCapacity, { color: theme.textSecondary }]}>{cabin.capacity}</Text>
                <Text style={[styles.cabinDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                  {cabin.description}
                </Text>
              </View>
              <Image
                source={{ uri: cabin.thumbnail }}
                style={styles.cabinThumbnail}
                resizeMode="cover"
              />
            </View>

            {/* Información de fotos */}
            <View style={styles.photoInfo}>
              <Text style={[styles.photoCount, { color: theme.textSecondary }]}>
                📸 {cabin.images.length} fotos • 🎥 {cabin.videos.length} videos
              </Text>
            </View>

            {/* Botones de administración */}
            <View style={styles.adminActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.border }]}
                onPress={() => handleAddPhoto(cabin.id)}
              >
                <Text style={[styles.actionButtonText, { color: theme.text }]}>+ Foto</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: cabinsColors.primary }]}
                onPress={() => handleEditCabin(cabin)}
              >
                <Text style={styles.actionButtonTextPrimary}>✏️ Editar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal de edición */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.surface }]}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={[styles.modalCloseButton, { color: theme.text }]}>✕</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Editar {editingCabin?.name}
            </Text>
            <TouchableOpacity onPress={handleSaveCabin}>
              <Text style={[styles.modalSaveButton, { color: cabinsColors.primary }]}>Guardar</Text>
            </TouchableOpacity>
          </View>

          {editingCabin && (
            <ScrollView style={styles.modalContent}>
              {/* Editar nombre */}
              <View style={styles.editSection}>
                <Text style={[styles.editLabel, { color: theme.text }]}>Nombre:</Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  value={editingCabin.name}
                  onChangeText={(text) => setEditingCabin({...editingCabin, name: text})}
                  placeholder="Nombre de la cabaña"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              {/* Editar capacidad */}
              <View style={styles.editSection}>
                <Text style={[styles.editLabel, { color: theme.text }]}>Capacidad:</Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  value={editingCabin.capacity}
                  onChangeText={(text) => setEditingCabin({...editingCabin, capacity: text})}
                  placeholder="Ej: 4-6 personas"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              {/* Editar descripción */}
              <View style={styles.editSection}>
                <Text style={[styles.editLabel, { color: theme.text }]}>Descripción:</Text>
                <TextInput
                  style={[styles.editTextArea, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  value={editingCabin.description}
                  onChangeText={(text) => setEditingCabin({...editingCabin, description: text})}
                  placeholder="Descripción de la cabaña"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Galería de fotos */}
              <View style={styles.editSection}>
                <Text style={[styles.editLabel, { color: theme.text }]}>Fotos:</Text>
                <ScrollView horizontal style={styles.photoGallery}>
                  {editingCabin.images.map((image, index) => (
                    <View key={index} style={styles.photoItem}>
                      <Image source={{ uri: image }} style={styles.photoPreview} />
                      <TouchableOpacity 
                        style={[styles.deletePhotoButton, { backgroundColor: '#ff4444' }]}
                        onPress={() => {
                          const newImages = editingCabin.images.filter((_, i) => i !== index);
                          setEditingCabin({...editingCabin, images: newImages});
                        }}
                      >
                        <Text style={styles.deletePhotoText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity 
                    style={[styles.addPhotoButton, { backgroundColor: cabinsColors.primary }]}
                    onPress={() => handleAddPhoto(editingCabin.id)}
                  >
                    <Text style={styles.addPhotoText}>+</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  cabinCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cabinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cabinInfo: {
    flex: 1,
  },
  cabinName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  cabinCapacity: {
    fontSize: 14,
    marginBottom: 4,
  },
  cabinDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  cabinThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginLeft: 12,
  },
  photoInfo: {
    marginBottom: 12,
  },
  photoCount: {
    fontSize: 12,
  },
  adminActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonTextPrimary: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCloseButton: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSaveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  editSection: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  editTextArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoGallery: {
    flexDirection: 'row',
    paddingVertical: 8, // Espacio para los botones de eliminar
  },
  photoItem: {
    position: 'relative',
    marginRight: 16, // Más espacio entre fotos
    marginTop: 8, // Espacio superior para el botón
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  deletePhotoText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 10,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8, // Mismo margen que las fotos
  },
  addPhotoText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
  },
});

export default AdminCabinsScreen;
