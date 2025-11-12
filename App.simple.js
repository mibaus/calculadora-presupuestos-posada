import React, { useState } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Share,
  Platform,
  LogBox
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Ignorar todas las advertencias
LogBox.ignoreAllLogs();

// Utilidades de formato
const formatARS = (valueInCents) => {
  const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return formatter.format((valueInCents || 0) / 100);
};

// Parseo robusto para aceptar "." y "," con formato argentino
// Retorna un entero en centavos
const parseToCents = (raw) => {
  if (!raw) return 0;
  const s = String(raw).trim().replace(/[^0-9.,]/g, '');
  if (!s) return 0;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  let normalized = s;
  if (hasComma && hasDot) {
    // Asumir formato argentino: puntos como miles, coma como decimal
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    // Solo coma -> decimal
    normalized = s.replace(',', '.');
  } else {
    // Solo punto o solo dígitos -> dejar como está
    normalized = s;
  }

  const num = Number.parseFloat(normalized);
  if (Number.isNaN(num)) return 0;
  // Redondeo exacto a centavos mediante enteros
  return Math.round(num * 100);
};

// Componente para manejar errores globales
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Error en la aplicación:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#000' }}>Algo salió mal</Text>
          <Text style={{ textAlign: 'center', marginBottom: 20, color: '#333' }}>La aplicación encontró un problema. Por favor, intenta de nuevo.</Text>
          <TouchableOpacity 
            onPress={() => this.setState({ hasError: false })}
            style={{ backgroundColor: '#2196F3', padding: 10, borderRadius: 5 }}
          >
            <Text style={{ color: 'white' }}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [inputTotal, setInputTotal] = useState('');
  const [discount, setDiscount] = useState(0); // 0, 0.10, 0.15
  const [computed, setComputed] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const discountOptions = [
    { label: 'Sin desc.', value: 0 },
    { label: '10%', value: 0.1 },
    { label: '15%', value: 0.15 },
  ];

  const canCalculate = parseToCents(inputTotal) > 0;

  const onCalculate = () => {
    try {
      const totalCents = parseToCents(inputTotal);
      if (totalCents <= 0) {
        setComputed(null);
        return;
      }

      const totalWithDiscount = Math.round(totalCents * (1 - discount));
      const sena = Math.round(totalWithDiscount * 0.2);
      const segundo = Math.round(totalWithDiscount * 0.3);
      const saldo = totalWithDiscount - sena - segundo; // garantiza suma exacta

      setComputed({
        totalWithDiscount,
        sena,
        segundo,
        saldo,
      });
    } catch (error) {
      console.error("Error al calcular:", error);
      setFeedbackMessage("Error al calcular");
    }
  };

  const onClear = () => {
    setInputTotal('');
    setDiscount(0);
    setComputed(null);
  };

  const getSummaryText = () => {
    if (!computed) return '';
    return [
      `${discount === 0 ? 'Total' : `Total con descuento (${discount * 100}%)`}: ${formatARS(computed.totalWithDiscount)}`,
      `Seña (20%): ${formatARS(computed.sena)}`,
      `Segundo pago (30%): ${formatARS(computed.segundo)}`,
      `Saldo final (50%): ${formatARS(computed.saldo)}`,
    ].join('\n');
  };

  const onShare = async (value, label) => {
    try {
      if (value) {
        // Compartir un valor específico
        const numericValue = value / 100;
        const textToShare = `$${numericValue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        await Share.share({ message: textToShare });
        setFeedbackMessage(`¡${label} compartido!`);
      } else {
        // Compartir todo el resumen
        await Share.share({ message: getSummaryText() });
        setFeedbackMessage("Resumen compartido");
      }
      
      // Limpiar el mensaje después de 2 segundos
      setTimeout(() => {
        setFeedbackMessage('');
      }, 2000);
    } catch (error) {
      console.error("Error al compartir:", error);
      setFeedbackMessage("Error al compartir");
    }
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.contentContainer} 
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Señas-Calc</Text>
              <Text style={styles.subtitle}>Cálculo rápido • Offline</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Total de la reserva (ARS)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 150.000,50 o 150000.50"
              placeholderTextColor="#999"
              inputMode="decimal"
              keyboardType={Platform.select({ ios: 'numbers-and-punctuation', android: 'decimal-pad' })}
              value={inputTotal}
              onChangeText={(t) => {
                // Permitir solo números, puntos y comas
                const cleaned = t.replace(/[^0-9.,]/g, '');
                setInputTotal(cleaned);
              }}
            />
            
            <View style={styles.discountRow}>
              {discountOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.discountBtn,
                    discount === option.value && styles.discountBtnActive
                  ]}
                  onPress={() => setDiscount(option.value)}
                >
                  <Text
                    style={[
                      styles.discountText,
                      discount === option.value && styles.discountTextActive
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  !canCalculate && styles.btnDisabled
                ]}
                onPress={onCalculate}
                disabled={!canCalculate}
              >
                <Text style={styles.btnPrimaryText}>Calcular</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={onClear}
              >
                <Text style={styles.btnSecondaryText}>Limpiar</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {computed && (
            <View style={styles.resultsWrapper}>
              <Text style={styles.sectionTitle}>Resumen</Text>

              <View style={[styles.resultCard, { borderLeftColor: '#ccc' }]}>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>
                    {discount === 0 ? 'Total' : `Total con descuento (${discount * 100}%)`}
                  </Text>
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={() => onShare(computed.totalWithDiscount, 'Total')}
                  >
                    <Text style={styles.shareButtonText}>Compartir</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.resultValue}>{formatARS(computed.totalWithDiscount)}</Text>
              </View>

              <View style={[styles.resultCard, { borderLeftColor: '#16a34a' }]}>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: '#16a34a' }]}>Seña (20%)</Text>
                  <TouchableOpacity
                    style={[styles.shareButton, { backgroundColor: '#dcfce7' }]}
                    onPress={() => onShare(computed.sena, 'Seña')}
                  >
                    <Text style={[styles.shareButtonText, { color: '#16a34a' }]}>Compartir</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.resultValue, { color: '#16a34a' }]}>{formatARS(computed.sena)}</Text>
              </View>

              <View style={[styles.resultCard, { borderLeftColor: '#2563eb' }]}>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: '#2563eb' }]}>Segundo pago (30%)</Text>
                  <TouchableOpacity
                    style={[styles.shareButton, { backgroundColor: '#dbeafe' }]}
                    onPress={() => onShare(computed.segundo, 'Segundo pago')}
                  >
                    <Text style={[styles.shareButtonText, { color: '#2563eb' }]}>Compartir</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.resultValue, { color: '#2563eb' }]}>{formatARS(computed.segundo)}</Text>
              </View>

              <View style={[styles.resultCard, { borderLeftColor: '#dc2626' }]}>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: '#dc2626' }]}>Saldo final (50%)</Text>
                  <TouchableOpacity
                    style={[styles.shareButton, { backgroundColor: '#fee2e2' }]}
                    onPress={() => onShare(computed.saldo, 'Saldo final')}
                  >
                    <Text style={[styles.shareButtonText, { color: '#dc2626' }]}>Compartir</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.resultValue, { color: '#dc2626' }]}>{formatARS(computed.saldo)}</Text>
              </View>

              <View style={styles.shareRow}>
                <TouchableOpacity onPress={() => onShare()} style={styles.btn}> 
                  <Text style={styles.btnLightText}>Compartir todo</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {feedbackMessage ? (
            <View style={styles.feedbackContainer}>
              <Text style={styles.feedbackText}>{feedbackMessage}</Text>
            </View>
          ) : null}

          <Text style={styles.footer}>Offline • Sin datos personales • Cálculo local</Text>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1,
    backgroundColor: '#f6f7fb'
  },
  container: { 
    flex: 1 
  },
  contentContainer: { 
    padding: 20 
  },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 16 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    marginBottom: 2,
    color: '#111827'
  },
  subtitle: { 
    fontSize: 14, 
    marginBottom: 16,
    color: '#6b7280'
  },
  label: { 
    fontSize: 16, 
    marginBottom: 8,
    color: '#111827'
  },
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 16
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 14, android: 10 }),
    fontSize: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    color: '#111827'
  },
  discountRow: { 
    flexDirection: 'row', 
    gap: 10,
    marginBottom: 16
  },
  discountBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6'
  },
  discountBtnActive: {
    backgroundColor: '#3b82f6'
  },
  discountText: { 
    fontWeight: '600',
    color: '#111827'
  },
  discountTextActive: {
    color: '#ffffff'
  },
  actionRow: { 
    flexDirection: 'row', 
    gap: 12
  },
  btn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6'
  },
  btnPrimary: {
    backgroundColor: '#3b82f6'
  },
  btnSecondary: {
    backgroundColor: '#f3f4f6'
  },
  btnPrimaryText: { 
    fontSize: 16, 
    fontWeight: '700',
    color: '#ffffff'
  },
  btnSecondaryText: { 
    fontSize: 16, 
    fontWeight: '700',
    color: '#111827'
  },
  btnLightText: { 
    fontSize: 14, 
    fontWeight: '700',
    color: '#111827'
  },
  btnDisabled: { 
    opacity: 0.6 
  },
  resultsWrapper: { 
    marginTop: 20 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 10,
    color: '#111827'
  },
  resultCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderLeftWidth: 4
  },
  resultRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  resultLabel: { 
    fontSize: 14,
    color: '#6b7280'
  },
  resultValue: { 
    fontSize: 20, 
    fontWeight: '800', 
    marginTop: 4,
    color: '#111827'
  },
  shareButton: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8,
    backgroundColor: '#f3f4f6'
  },
  shareButtonText: { 
    fontSize: 12, 
    fontWeight: '700',
    color: '#4b5563'
  },
  shareRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 8 
  },
  feedbackContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#10b981',
    borderRadius: 8,
    alignItems: 'center'
  },
  feedbackText: {
    color: 'white',
    fontWeight: '600'
  },
  footer: { 
    textAlign: 'center', 
    marginTop: 24, 
    marginBottom: 10,
    color: '#6b7280'
  }
});
