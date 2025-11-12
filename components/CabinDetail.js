import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Share,
  Modal,
  Alert
} from 'react-native';
import { getCabinShareText } from '../data/cabinsData';

const { width, height } = Dimensions.get('window');

const CabinDetail = ({ cabin, theme, seasonalColors, visible, onClose }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleShare = async () => {
    try {
      const shareText = getCabinShareText(cabin);
      await Share.share({
        message: shareText,
        title: cabin.name
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir la información');
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === cabin.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? cabin.images.length - 1 : prev - 1
    );
  };

  if (!cabin) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: seasonalColors.border }]}>
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: seasonalColors.accent }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: seasonalColors.primary }]}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{cabin.name}</Text>
            <Text style={[styles.headerCapacity, { color: seasonalColors.primary }]}>
              👥 {cabin.capacity}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.shareButton, { backgroundColor: seasonalColors.primary }]}
            onPress={handleShare}
          >
            <Text style={styles.shareButtonText}>📤</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Carrusel de imágenes */}
          <View style={styles.imageCarousel}>
            <Image
              source={{ uri: cabin.images[currentImageIndex] }}
              style={styles.carouselImage}
              resizeMode="cover"
            />
            
            {/* Controles del carrusel */}
            {cabin.images.length > 1 && (
              <>
                <TouchableOpacity 
                  style={[styles.carouselButton, styles.prevButton, { backgroundColor: seasonalColors.primary }]}
                  onPress={prevImage}
                >
                  <Text style={styles.carouselButtonText}>‹</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.carouselButton, styles.nextButton, { backgroundColor: seasonalColors.primary }]}
                  onPress={nextImage}
                >
                  <Text style={styles.carouselButtonText}>›</Text>
                </TouchableOpacity>

                {/* Indicadores */}
                <View style={styles.indicators}>
                  {cabin.images.map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.indicator,
                        {
                          backgroundColor: index === currentImageIndex 
                            ? seasonalColors.primary 
                            : 'rgba(255,255,255,0.5)'
                        }
                      ]}
                      onPress={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </View>

                {/* Contador de imágenes */}
                <View style={[styles.imageCounter, { backgroundColor: seasonalColors.primary }]}>
                  <Text style={styles.imageCounterText}>
                    {currentImageIndex + 1} / {cabin.images.length}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Información detallada */}
          <View style={[styles.infoSection, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: seasonalColors.primary }]}>
              📝 Descripción
            </Text>
            <Text style={[styles.description, { color: theme.text }]}>
              {cabin.description}
            </Text>
          </View>

          {/* Comodidades */}
          <View style={[styles.infoSection, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: seasonalColors.primary }]}>
              ✨ Comodidades
            </Text>
            <View style={styles.amenitiesGrid}>
              {cabin.amenities.map((amenity, index) => (
                <View 
                  key={index}
                  style={[styles.amenityItem, { backgroundColor: seasonalColors.accent }]}
                >
                  <Text style={[styles.amenityItemText, { color: seasonalColors.primary }]}>
                    • {amenity}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Botón de compartir grande */}
          <View style={styles.shareSection}>
            <TouchableOpacity
              style={[styles.shareButtonLarge, { backgroundColor: seasonalColors.primary }]}
              onPress={handleShare}
            >
              <Text style={styles.shareButtonLargeText}>
                📤 Compartir esta cabaña
              </Text>
            </TouchableOpacity>
            <Text style={[styles.shareHint, { color: theme.textSecondary }]}>
              Comparte por WhatsApp, email o redes sociales
            </Text>
          </View>

          {/* Espaciado inferior */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerCapacity: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  imageCarousel: {
    height: 300,
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselButton: {
    position: 'absolute',
    top: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
  },
  prevButton: {
    left: 16,
  },
  nextButton: {
    right: 16,
  },
  carouselButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
  },
  indicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  imageCounter: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  amenityItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  shareSection: {
    margin: 16,
    alignItems: 'center',
  },
  shareButtonLarge: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    marginBottom: 8,
  },
  shareButtonLargeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  shareHint: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default CabinDetail;
