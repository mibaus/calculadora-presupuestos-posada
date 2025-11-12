import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Share,
  Alert
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { cabins, getCabinQuickShareText } from '../data/cabinsData';

const { width } = Dimensions.get('window');

const CabinsScreen = ({ theme, seasonalColors, onBack, onAdminPress }) => {
  
  // Colores elegantes sin blancos para la sección de cabañas
  const cabinsColors = {
    primary: '#5b21b6',      // Púrpura profundo elegante
    secondary: '#7c3aed',    // Púrpura vibrante
    accent: '#ddd6fe',       // Púrpura muy claro para bordes
    border: '#c4b5fd',       // Púrpura suave para bordes
    surface: '#f3f4f6',      // Superficie gris neutro
    cardBg: '#f8fafc',       // Fondo gris azulado muy suave (sin blanco)
    text: '#1f2937',         // Texto gris oscuro
    textSecondary: '#6b7280' // Texto secundario gris
  };
  
  // Función para compartir cabaña con fotos y texto
  const handleShareCabin = async (cabin) => {
    try {
      const shareText = getCabinQuickShareText(cabin);
      
      // Si hay imágenes, intentar compartir la primera imagen con texto
      if (cabin.images && cabin.images.length > 0) {
        // Verificar si el dispositivo soporta compartir
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          try {
            // Descargar la primera imagen temporalmente
            const imageUri = cabin.images[0];
            const filename = `${cabin.name.replace(/\s+/g, '_')}_image.jpg`;
            const fileUri = FileSystem.documentDirectory + filename;
            
            // Descargar la imagen
            const downloadResult = await FileSystem.downloadAsync(imageUri, fileUri);
            
            if (downloadResult.status === 200) {
              // Compartir la imagen descargada con el texto
              await Sharing.shareAsync(downloadResult.uri, {
                mimeType: 'image/jpeg',
                dialogTitle: `Compartir ${cabin.name}`,
                UTI: 'public.jpeg'
              });
              return;
            }
          } catch (imageError) {
            console.log('Error descargando imagen:', imageError);
            // Si falla la descarga de imagen, compartir solo texto
          }
        }
      }
      
      // Fallback: compartir solo texto usando Share nativo
      await Share.share({
        message: shareText,
        title: cabin.name
      });
      
    } catch (error) {
      console.log('Error compartiendo:', error);
      Alert.alert('Error', 'No se pudo compartir la información');
    }
  };

  // Función para ir a administrar cabañas
  const handleAdminCabins = () => {
    if (onAdminPress) {
      onAdminPress();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header minimalista */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onBack}
          >
            <Text style={[styles.backButtonText, { color: theme.text }]}>← Volver</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.adminButton, { backgroundColor: cabinsColors.primary }]}
            onPress={handleAdminCabins}
          >
            <Text style={styles.adminButtonText}>⚙️ Administrar</Text>
          </TouchableOpacity>
        </View>
        {/* <Text style={[styles.headerTitle, { color: theme.text }]}>Cabañas</Text> */}
      </View>

      {/* Lista de cabañas */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {cabins.map((cabin) => (
          <View
            key={cabin.id}
            style={[
              styles.cabinCard, 
              { 
                backgroundColor: cabin.id === 0 ? '#4c1d95' : '#374151',
                borderColor: cabin.id === 0 ? '#7c3aed' : '#4b5563'
              }
            ]}
          >
            {/* Información básica */}
            <View style={styles.cabinHeader}>
              <View style={styles.cabinInfo}>
                <Text style={[styles.cabinName, { color: '#f9fafb' }]}>
                  {cabin.id === 0 ? '📸 ' : ''}{cabin.name}
                </Text>
                <Text style={[styles.cabinCapacity, { color: '#a78bfa' }]}>{cabin.capacity}</Text>
                {cabin.description && (
                  <Text style={[styles.cabinDescription, { color: '#d1d5db' }]} numberOfLines={2}>
                    {cabin.description}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: cabinsColors.primary }]}
                onPress={() => handleShareCabin(cabin)}
              >
                <Text style={styles.shareButtonText}>Compartir</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Espaciado final */}
        <View style={{ height: 20 }} />
      </ScrollView>
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
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  adminButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  adminButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  cabinCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#4f46e5',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cabinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cabinInfo: {
    flex: 1,
    paddingRight: 16,
  },
  cabinName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cabinCapacity: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    opacity: 0.8,
  },
  cabinDescription: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.7,
  },
  shareButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 85,
    shadowColor: '#4f46e5',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default CabinsScreen;
