import React, { useState, useEffect, useMemo } from 'react';
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
  LogBox,
  Appearance,
  Keyboard,
  Modal,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
// Datos de tarifario por temporada
import tariffsSummer from './data/tariffs.summer.json';
import tariffsSpring from './data/tariffs.spring.json';
// Componentes de cabañas eliminados

// Ignorar todas las advertencias
LogBox.ignoreAllLogs();

// Sistema de colores para modo claro/oscuro con colores estacionales
const lightTheme = {
  background: '#f6f7fb',
  surface: '#ffffff',
  primary: '#3b82f6',
  text: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  inputBackground: '#ffffff',
  shadow: '#000',
  success: '#16a34a',
  warning: '#f59e0b',
  error: '#dc2626',
  info: '#2563eb',
  // Colores estacionales
  spring: {
    primary: '#ec4899', // Rosa/Fucsia
    secondary: '#f472b6', // Rosa más claro
    accent: '#fce7f3', // Rosa muy claro para fondos
    border: '#f9a8d4' // Rosa para bordes
  },
  summer: {
    primary: '#eab308', // Amarillo
    secondary: '#facc15', // Amarillo más claro
    accent: '#fefce8', // Amarillo muy claro para fondos
    border: '#fde047' // Amarillo para bordes
  }
};

const darkTheme = {
  background: '#0f172a',
  surface: '#1e293b',
  primary: '#60a5fa',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  border: '#334155',
  inputBackground: '#334155',
  shadow: '#000',
  success: '#22c55e',
  warning: '#fbbf24',
  error: '#ef4444',
  info: '#3b82f6',
  // Colores estacionales para modo oscuro
  spring: {
    primary: '#f472b6', // Rosa más brillante para modo oscuro
    secondary: '#ec4899', // Rosa
    accent: '#831843', // Rosa oscuro para fondos
    border: '#be185d' // Rosa para bordes
  },
  summer: {
    primary: '#facc15', // Amarillo más brillante para modo oscuro
    secondary: '#eab308', // Amarillo
    accent: '#713f12', // Amarillo oscuro para fondos
    border: '#ca8a04' // Amarillo para bordes
  }
};

// Utilidades de formato (sin decimales)
const formatARS = (valueInCents) => {
  const pesos = Math.round((valueInCents || 0) / 100);
  const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return formatter.format(pesos);
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
    // Formato AR: puntos como miles, coma como decimal
    normalized = s.replace(/\./g, '').replace(/,/g, '.');
  } else if (hasComma) {
    // Solo coma -> decimal
    normalized = s.replace(/,/g, '.');
  } else if (hasDot) {
    // Solo punto -> tratar como separador de miles (remover)
    normalized = s.replace(/\./g, '');
  } else {
    // Solo dígitos
    normalized = s;
  }

  const num = Number.parseFloat(normalized);
  if (Number.isNaN(num)) return 0;
  // Redondeo exacto a centavos mediante enteros
  return Math.round(num * 100);
};

// Seleccionar la banda de precio por cantidad de personas
const pickBandForPeople = (tariffs, people) => {
  if (!tariffs || !Array.isArray(tariffs.peopleBands)) return null;
  const bands = [...tariffs.peopleBands].sort((a, b) => a.people - b.people);
  // Exacta
  const exact = bands.find(b => b.people === people);
  if (exact) return exact;
  // La primera banda cuyo people sea >= solicitado
  const higher = bands.find(b => b.people >= people);
  if (higher) return higher;
  // Si no hay, usar la banda mayor
  return bands[bands.length - 1] || null;
};

// Sugerir descuento por estadía prolongada
const pickLongStayDiscount = (tariffs, nights) => {
  if (!tariffs || !Array.isArray(tariffs.longStayDiscounts)) return null;
  // Tomar el mayor descuento cuyo minNights <= nights
  const sorted = [...tariffs.longStayDiscounts].sort((a, b) => b.minNights - a.minNights);
  const match = sorted.find(d => nights >= d.minNights);
  return match ? match.discountPercent : null;
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
  const [pricePerNight, setPricePerNight] = useState('');
  const [numberOfNights, setNumberOfNights] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [discount, setDiscount] = useState(0); // 0, 0.10, 0.15
  const [computed, setComputed] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themePreference, setThemePreference] = useState('auto'); // 'auto', 'light', 'dark'
  const [season, setSeason] = useState('summer'); // 'summer', 'spring'
  const [activeTariffs, setActiveTariffs] = useState(tariffsSummer);
  const [suggestedPriceCents, setSuggestedPriceCents] = useState(0);
  const [manualPriceEdited, setManualPriceEdited] = useState(false);
  const [suggestedStayDiscount, setSuggestedStayDiscount] = useState(null); // percent (0-100)
  const [manualDiscountEdited, setManualDiscountEdited] = useState(false);
  const [screen, setScreen] = useState('main'); // 'main' | 'admin'
  const [showMenu, setShowMenu] = useState(false);
  const [overrides, setOverrides] = useState({ spring: null, summer: null });

  const theme = isDarkMode ? darkTheme : lightTheme;
  const seasonalColors = theme[season]; // Colores específicos de la estación actual

  // Cargar preferencia de tema guardada
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Escuchar cambios del tema del sistema
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themePreference === 'auto') {
        setIsDarkMode(colorScheme === 'dark');
      }
    });

    return () => subscription?.remove();
  }, [themePreference]);

  // Recalcular automáticamente cuando cambia el descuento si ya hay un cálculo previo
  useEffect(() => {
    if (computed && canCalculate) {
      onCalculate();
    }
  }, [discount]);

  // Cambiar tarifario activo al cambiar temporada
  useEffect(() => {
    const base = season === 'spring' ? tariffsSpring : tariffsSummer;
    // aplicar overrides si existen
    const ov = overrides?.[season];
    if (ov) {
      const merged = {
        ...base,
        peopleBands: Array.isArray(ov.peopleBands) && ov.peopleBands.length > 0 ? ov.peopleBands : base.peopleBands,
        longStayDiscounts: Array.isArray(ov.longStayDiscounts) ? ov.longStayDiscounts : base.longStayDiscounts,
      };
      setActiveTariffs(merged);
    } else {
      setActiveTariffs(base);
    }
    // Permitir auto-aplicar de nuevo cuando cambie la temporada
    setManualDiscountEdited(false);
  }, [season]);

  // Sugerir precio por día basado en cantidad de personas y temporada.
  useEffect(() => {
    const people = parseInt(numberOfPeople || '0');
    if (!activeTariffs || !people) {
      setSuggestedPriceCents(0);
      return;
    }
    const band = pickBandForPeople(activeTariffs, people);
    setSuggestedPriceCents(band?.pricePerNightCents || 0);
  }, [activeTariffs, numberOfPeople]);

  // Autocompletar precio si aún no fue editado manualmente o si el campo está vacío (sin decimales)
  useEffect(() => {
    if (suggestedPriceCents > 0 && (!manualPriceEdited || !pricePerNight)) {
      const asPesos = Math.round(suggestedPriceCents / 100).toLocaleString('es-AR');
      setPricePerNight(asPesos);
    }
  }, [suggestedPriceCents]);

  // Sugerir descuento por estadía prolongada desde tarifario
  useEffect(() => {
    const nights = parseInt(numberOfNights || '0');
    if (!activeTariffs || !nights) {
      setSuggestedStayDiscount(null);
      return;
    }
    const d = pickLongStayDiscount(activeTariffs, nights);
    setSuggestedStayDiscount(d);
  }, [activeTariffs, numberOfNights]);

  // Cargar overrides almacenados
  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem('tariffOverrides');
        if (s) {
          const parsed = JSON.parse(s);
          setOverrides(parsed || { spring: null, summer: null });
        }
      } catch (e) {
        console.error('Error loading overrides', e);
      }
    })();
  }, []);

  // Reaplicar overrides cuando cambian
  useEffect(() => {
    const base = season === 'spring' ? tariffsSpring : tariffsSummer;
    const ov = overrides?.[season];
    if (ov) {
      const merged = {
        ...base,
        peopleBands: Array.isArray(ov.peopleBands) && ov.peopleBands.length > 0 ? ov.peopleBands : base.peopleBands,
        longStayDiscounts: Array.isArray(ov.longStayDiscounts) ? ov.longStayDiscounts : base.longStayDiscounts,
      };
      setActiveTariffs(merged);
    } else {
      setActiveTariffs(base);
    }
  }, [overrides]);

  const saveOverrides = async (newOverrides) => {
    try {
      await AsyncStorage.setItem('tariffOverrides', JSON.stringify(newOverrides));
      setOverrides(newOverrides);
      setFeedbackMessage('Cambios guardados');
      setTimeout(() => setFeedbackMessage(''), 1500);
    } catch (e) {
      console.error('Error saving overrides', e);
      setFeedbackMessage('Error al guardar');
      setTimeout(() => setFeedbackMessage(''), 1500);
    }
  };

  // En primavera, auto-aplicar el descuento sugerido si no hubo intervención manual
  useEffect(() => {
    if (season === 'spring' && suggestedStayDiscount && !manualDiscountEdited) {
      setDiscount(suggestedStayDiscount / 100);
    }
  }, [season, suggestedStayDiscount, manualDiscountEdited]);

  const loadThemePreference = async () => {
    try {
      const savedPreference = await AsyncStorage.getItem('themePreference');
      if (savedPreference) {
        setThemePreference(savedPreference);
        if (savedPreference === 'auto') {
          const systemTheme = Appearance.getColorScheme();
          setIsDarkMode(systemTheme === 'dark');
        } else {
          setIsDarkMode(savedPreference === 'dark');
        }
      } else {
        // Por defecto usar tema automático
        const systemTheme = Appearance.getColorScheme();
        setIsDarkMode(systemTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const saveThemePreference = async (preference) => {
    try {
      await AsyncStorage.setItem('themePreference', preference);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    let newPreference;
    if (themePreference === 'auto') {
      newPreference = isDarkMode ? 'light' : 'dark';
    } else if (themePreference === 'light') {
      newPreference = 'dark';
    } else {
      newPreference = 'auto';
    }
    
    setThemePreference(newPreference);
    saveThemePreference(newPreference);
    
    if (newPreference === 'auto') {
      const systemTheme = Appearance.getColorScheme();
      setIsDarkMode(systemTheme === 'dark');
    } else {
      setIsDarkMode(newPreference === 'dark');
    }
  };

  const getThemeIcon = () => {
    if (themePreference === 'auto') {
      return '🌓';
    } else if (themePreference === 'light') {
      return '☀️';
    } else {
      return '🌙';
    }
  };

  // Opciones de descuento dinámicas por temporada + botón adicional 20%
  const discountOptions = useMemo(() => {
    const percents = new Set(
      (activeTariffs?.longStayDiscounts || []).map(d => d.discountPercent)
    );
    // Siempre agregar 20%
    percents.add(20);
    // En verano, mostrar siempre 10%, 15% y 20%
    if (season === 'summer') {
      percents.add(10);
      percents.add(15);
    }
    // Filtrar, ordenar y mapear a objetos {label, value}
    const ordered = Array.from(percents)
      .filter(p => typeof p === 'number' && p > 0)
      .sort((a, b) => a - b);
    return ordered.map(p => ({ label: `${p}%`, value: p / 100 }));
  }, [activeTariffs, season]);

  const canCalculate = parseToCents(pricePerNight) > 0 && parseInt(numberOfNights) > 0 && parseInt(numberOfPeople) > 0;

  const onCalculate = () => {
    // Ocultar el teclado al calcular
    Keyboard.dismiss();
    
    try {
      const pricePerNightCents = parseToCents(pricePerNight);
      const nights = parseInt(numberOfNights);
      
      if (pricePerNightCents <= 0 || nights <= 0) {
        setComputed(null);
        return;
      }

      const totalCents = pricePerNightCents * nights;
      const totalWithDiscount = Math.round(totalCents * (1 - discount));
      
      let sena, segundo, saldo;
      
      if (season === 'spring') {
        // Primavera: 50% seña, 50% saldo final
        sena = Math.round(totalWithDiscount * 0.5);
        segundo = 0;
        saldo = totalWithDiscount - sena;
      } else {
        // Verano: 20% seña, 30% segundo, 50% saldo
        sena = Math.round(totalWithDiscount * 0.2);
        segundo = Math.round(totalWithDiscount * 0.3);
        saldo = totalWithDiscount - sena - segundo;
      }

      setComputed({
        totalOriginal: totalCents,
        totalWithDiscount,
        sena,
        segundo,
        saldo,
        nights,
        pricePerNightCents,
        season
      });
    } catch (error) {
      console.error("Error al calcular:", error);
      setFeedbackMessage("Error al calcular");
    }
  };

  const onClear = () => {
    setPricePerNight('');
    setNumberOfNights('');
    setNumberOfPeople('');
    setDiscount(0);
    setComputed(null);
    setManualPriceEdited(false);
    setManualDiscountEdited(false);
  };

  const getSummaryText = () => {
    if (!computed) return '';
    
    // Formatear valores sin decimales para la plantilla
    const formatValue = (valueInCents) => {
      const pesos = Math.round(valueInCents / 100);
      return `$${pesos.toLocaleString('es-AR')}`;
    };
    
    // Construir la sección del total con o sin descuento
    let totalSection = '';
    if (discount === 0) {
      totalSection = `✅ *Total ${formatValue(computed.totalOriginal)}*`;
    } else {
      totalSection = `✅ *Total ${formatValue(computed.totalOriginal)}*
*Descuento ${discount * 100}%: -${formatValue(computed.totalOriginal - computed.totalWithDiscount)}*
*Total final: ${formatValue(computed.totalWithDiscount)}*`;
    }
    
    const seasonEmoji = computed.season === 'spring' ? '🌸' : '🏖️';
    const seasonName = computed.season === 'spring' ? 'Primavera' : 'Verano';
    
    // Construir línea de fechas si están disponibles
    let datesLine = '';
    if (dateFrom && dateTo) {
      datesLine = `📅 Del ${dateFrom} al ${dateTo}\n`;
    }
    
    if (computed.season === 'spring') {
      return `${seasonEmoji} Su Presupuesto\n${datesLine}\n✅ Precio por noche ${formatValue(computed.pricePerNightCents)}\nX ${computed.nights} noche${computed.nights > 1 ? 's' : ''}\n\n${totalSection}\n\n📍1° pago 50% (Seña) dentro de las 72hs de confirmar su reserva\n\n*${formatValue(computed.sena)}*\n\n📍2° pago 50%. Al llegar en efectivo \n\n*${formatValue(computed.saldo)}*\n\n(Por mail enviamos la confirmación de la reserva junto a la factura correspondiente)`;
    } else {
      return `${seasonEmoji} Su Presupuesto\n${datesLine}\n✅ Precio por noche ${formatValue(computed.pricePerNightCents)}\nX ${computed.nights} noche${computed.nights > 1 ? 's' : ''}\n\n${totalSection}\n\n📍1° pago 20% dentro de las 72hs de confirmar su reserva\n\n*${formatValue(computed.sena)}*\n\n📍2° pago 30% ( Octubre - Noviembre - Diciembre) 1 solo pago \n\n*${formatValue(computed.segundo)}*\n\n📍3° pago 50%. Al llegar en efectivo \n\n*${formatValue(computed.saldo)}*\n\n(Por mail enviamos la confirmación de la reserva junto a la factura correspondiente)`;
    }
  };

  const onCopyToClipboard = async (value, label) => {
    try {
      const pesos = Math.round(value / 100);
      const textToCopy = `$${pesos.toLocaleString('es-AR')}`;
      await Clipboard.setStringAsync(textToCopy);
      setFeedbackMessage(`¡${label} copiado!`);
      
      // Limpiar el mensaje después de 2 segundos
      setTimeout(() => {
        setFeedbackMessage('');
      }, 2000);
    } catch (error) {
      console.error("Error al copiar:", error);
      setFeedbackMessage("Error al copiar");
    }
  };

  const onShare = async (value, label) => {
    try {
      if (value) {
        // Compartir un valor específico
        const pesos = Math.round(value / 100);
        const textToShare = `$${pesos.toLocaleString('es-AR')}`;
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

  // Funciones de cabañas eliminadas

  // Función para calcular noches entre fechas
  const calculateNightsBetweenDates = (fromDate, toDate) => {
    if (!fromDate || !toDate) return 0;
    
    try {
      // Parsear fechas en formato DD/MM/YYYY
      const [dayFrom, monthFrom, yearFrom] = fromDate.split('/').map(Number);
      const [dayTo, monthTo, yearTo] = toDate.split('/').map(Number);
      
      const dateFromObj = new Date(yearFrom, monthFrom - 1, dayFrom);
      const dateToObj = new Date(yearTo, monthTo - 1, dayTo);
      
      const timeDiff = dateToObj.getTime() - dateFromObj.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      return Math.max(0, daysDiff);
    } catch {
      return 0;
    }
  };

  // Efecto para calcular noches automáticamente cuando cambian las fechas
  useEffect(() => {
    if (dateFrom && dateTo) {
      const nights = calculateNightsBetweenDates(dateFrom, dateTo);
      setNumberOfNights(nights.toString());
    }
  }, [dateFrom, dateTo]);

  // Función para limpiar valores del formulario
  const clearFormValues = () => {
    setPricePerNight('');
    setNumberOfNights('');
    setNumberOfPeople('');
    setDateFrom('');
    setDateTo('');
    setDiscount(0);
    setComputed(null);
    setFeedbackMessage('');
    setSuggestedPriceCents(0);
    setManualPriceEdited(false);
    setSuggestedStayDiscount(null);
    setManualDiscountEdited(false);
  };

  // Función para cambiar estación con swipe
  const handleSwipeChangeSeason = () => {
    const newSeason = season === 'summer' ? 'spring' : 'summer';
    setSeason(newSeason);
    setActiveTariffs(newSeason === 'summer' ? tariffsSummer : tariffsSpring);
    clearFormValues();
  };

  // Manejador del gesto de swipe
  const onSwipeGestureEvent = (event) => {
    const { translationX, velocityX } = event.nativeEvent;
    
    // Detectar swipe horizontal (izquierda o derecha)
    if (Math.abs(translationX) > 50 && Math.abs(velocityX) > 500) {
      handleSwipeChangeSeason();
    }
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.contentContainer} 
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.configRow, { backgroundColor: theme.background }]}>
            <View style={[styles.seasonSwitchSmall, { backgroundColor: theme.surface, borderColor: seasonalColors.border }]}>
              <TouchableOpacity
                style={[
                  styles.seasonSwitchButtonSmall,
                  { backgroundColor: season === 'summer' ? theme.summer.primary : 'transparent' }
                ]}
                onPress={() => setSeason('summer')}
              >
                <Text style={[styles.seasonSwitchEmojiSmall, { opacity: season === 'summer' ? 1 : 0.5 }]}>🏖️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.seasonSwitchButtonSmall,
                  { backgroundColor: season === 'spring' ? theme.spring.primary : 'transparent' }
                ]}
                onPress={() => setSeason('spring')}
              >
                <Text style={[styles.seasonSwitchEmojiSmall, { opacity: season === 'spring' ? 1 : 0.5 }]}>🌸</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.themeToggleSmall, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => setShowMenu(true)}
              accessibilityLabel="Menú"
            >
              <Text style={styles.themeIconSmall}>☰</Text>
            </TouchableOpacity>
          </View>
          {screen === 'admin' && (
            <View style={[styles.card, { backgroundColor: theme.surface }]}> 
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Admin</Text>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Editar tarifas y descuentos por temporada</Text>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <TouchableOpacity
                  style={[styles.discountBtn, { backgroundColor: season === 'summer' ? theme.primary : theme.surface, borderColor: theme.border }]}
                  onPress={() => setSeason('summer')}
                >
                  <Text style={[styles.discountText, { color: season === 'summer' ? '#fff' : theme.text }]}>Verano</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.discountBtn, { backgroundColor: season === 'spring' ? theme.primary : theme.surface, borderColor: theme.border }]}
                  onPress={() => setSeason('spring')}
                >
                  <Text style={[styles.discountText, { color: season === 'spring' ? '#fff' : theme.text }]}>Primavera</Text>
                </TouchableOpacity>
              </View>

              {/* Editor de tarifas */}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Tarifas</Text>
              {(overrides[season]?.peopleBands || activeTariffs.peopleBands || []).map((b, idx) => (
                <View key={`pb-${idx}`} style={[styles.helperRow, { marginTop: 0 }]}>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                    inputMode="numeric"
                    keyboardType="number-pad"
                    value={String(b.people)}
                    onChangeText={(t) => {
                      const n = parseInt((t || '').replace(/[^0-9]/g, '')) || 0;
                      const next = JSON.parse(JSON.stringify(overrides));
                      const list = (next[season]?.peopleBands) ? next[season].peopleBands : JSON.parse(JSON.stringify(activeTariffs.peopleBands));
                      list[idx] = { ...list[idx], people: n };
                      next[season] = { ...(next[season] || {}), peopleBands: list };
                      setOverrides(next);
                    }}
                    placeholder="Pers."
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                    inputMode="numeric"
                    keyboardType="number-pad"
                    value={String(Math.round((b.pricePerNightCents || 0) / 100))}
                    onChangeText={(t) => {
                      const n = parseInt((t || '').replace(/[^0-9]/g, '')) || 0; // n en PESOS
                      const next = JSON.parse(JSON.stringify(overrides));
                      const list = (next[season]?.peopleBands) ? next[season].peopleBands : JSON.parse(JSON.stringify(activeTariffs.peopleBands));
                      list[idx] = { ...list[idx], pricePerNightCents: Math.round(n * 100) };
                      next[season] = { ...(next[season] || {}), peopleBands: list };
                      setOverrides(next);
                    }}
                    placeholder="$ por noche"
                  />
                  <TouchableOpacity
                    style={[styles.helperBtn, { backgroundColor: isDarkMode ? '#ef444420' : '#fee2e2', borderColor: theme.error }]}
                    onPress={() => {
                      const next = JSON.parse(JSON.stringify(overrides));
                      const list = (next[season]?.peopleBands) ? next[season].peopleBands : JSON.parse(JSON.stringify(activeTariffs.peopleBands));
                      list.splice(idx, 1);
                      next[season] = { ...(next[season] || {}), peopleBands: list };
                      setOverrides(next);
                    }}
                  >
                    <Text style={[styles.helperBtnText, { color: theme.error }]}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, marginBottom: 12 }]}
                onPress={() => {
                  const next = JSON.parse(JSON.stringify(overrides));
                  const list = (next[season]?.peopleBands) ? next[season].peopleBands : JSON.parse(JSON.stringify(activeTariffs.peopleBands));
                  list.push({ people: 1, pricePerNightCents: 0 });
                  next[season] = { ...(next[season] || {}), peopleBands: list };
                  setOverrides(next);
                }}
              >
                <Text style={[styles.btnSecondaryText, { color: theme.text }]}>+</Text>
              </TouchableOpacity>

              {/* Editor de descuentos por estadía */}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Descuentos por estadía</Text>
              {(overrides[season]?.longStayDiscounts || activeTariffs.longStayDiscounts || []).map((d, idx) => (
                <View key={`ld-${idx}`} style={[styles.helperRow, { marginTop: 0 }]}>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                    inputMode="numeric"
                    keyboardType="number-pad"
                    value={String(d.minNights)}
                    onChangeText={(t) => {
                      const n = parseInt((t || '').replace(/[^0-9]/g, '')) || 0;
                      const next = JSON.parse(JSON.stringify(overrides));
                      const list = (next[season]?.longStayDiscounts) ? next[season].longStayDiscounts : JSON.parse(JSON.stringify(activeTariffs.longStayDiscounts || []));
                      list[idx] = { ...list[idx], minNights: n };
                      next[season] = { ...(next[season] || {}), longStayDiscounts: list };
                      setOverrides(next);
                    }}
                    placeholder="Mín. noches"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                    inputMode="numeric"
                    keyboardType="number-pad"
                    value={String(d.discountPercent)}
                    onChangeText={(t) => {
                      const n = parseInt((t || '').replace(/[^0-9]/g, '')) || 0;
                      const next = JSON.parse(JSON.stringify(overrides));
                      const list = (next[season]?.longStayDiscounts) ? next[season].longStayDiscounts : JSON.parse(JSON.stringify(activeTariffs.longStayDiscounts || []));
                      list[idx] = { ...list[idx], discountPercent: n };
                      next[season] = { ...(next[season] || {}), longStayDiscounts: list };
                      setOverrides(next);
                    }}
                    placeholder="% desc."
                  />
                  <TouchableOpacity
                    style={[styles.helperBtn, { backgroundColor: isDarkMode ? '#ef444420' : '#fee2e2', borderColor: theme.error }]}
                    onPress={() => {
                      const next = JSON.parse(JSON.stringify(overrides));
                      const list = (next[season]?.longStayDiscounts) ? next[season].longStayDiscounts : JSON.parse(JSON.stringify(activeTariffs.longStayDiscounts || []));
                      list.splice(idx, 1);
                      next[season] = { ...(next[season] || {}), longStayDiscounts: list };
                      setOverrides(next);
                    }}
                  >
                    <Text style={[styles.helperBtnText, { color: theme.error }]}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, marginBottom: 12 }]}
                onPress={() => {
                  const next = JSON.parse(JSON.stringify(overrides));
                  const list = (next[season]?.longStayDiscounts) ? next[season].longStayDiscounts : JSON.parse(JSON.stringify(activeTariffs.longStayDiscounts || []));
                  list.push({ minNights: 1, discountPercent: 5 });
                  next[season] = { ...(next[season] || {}), longStayDiscounts: list };
                  setOverrides(next);
                }}
              >
                <Text style={[styles.btnSecondaryText, { color: theme.text }]}>+</Text>
              </TouchableOpacity>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.primary }]}
                  onPress={() => saveOverrides(overrides)}
                >
                  <Text style={[styles.btnPrimaryText, { color: '#fff' }]}>Guardar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => setScreen('main')}
                >
                  <Text style={[styles.btnSecondaryText, { color: theme.text }]}>Volver</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View style={[styles.titleRow, { backgroundColor: theme.background }]}>
            <Text style={[styles.title, { color: theme.text }]}>Calcular presupuesto</Text>
            <Text style={[styles.subtitle, { color: seasonalColors.primary }]}>
              {season === 'spring' ? '🌸 Temporada Primavera' : '🏖️ Temporada Verano'}
            </Text>
          </View>

          <PanGestureHandler
            onHandlerStateChange={({ nativeEvent }) => {
              if (nativeEvent.state === State.END) {
                onSwipeGestureEvent({ nativeEvent });
              }
            }}
          >
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: seasonalColors.border, borderWidth: 1 }]}>
            <Text style={[styles.label, { color: theme.text }]}>Cantidad de huéspedes</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.inputBackground, 
                borderColor: theme.border, 
                color: theme.text 
              }]}
              inputMode="numeric"
              keyboardType="number-pad"
              value={numberOfPeople}
              onChangeText={(t) => {
                const cleaned = t.replace(/[^0-9]/g, '');
                setNumberOfPeople(cleaned);
              }}
              placeholder=""
              placeholderTextColor={theme.textSecondary}
            />

            {/* Toggle para mostrar info de cabaña */}
            {numberOfPeople && (
              <TouchableOpacity
                style={[styles.toggleRow, { marginTop: 8, marginBottom: 8 }]}
                onPress={() => setShowCabinInfo(!showCabinInfo)}
              >
                <Text style={[styles.toggleLabel, { color: theme.textSecondary }]}>
                  Incluir "Cabaña para {numberOfPeople}" en presupuesto
                </Text>
                <View style={[
                  styles.toggleSwitch, 
                  { 
                    backgroundColor: showCabinInfo ? seasonalColors.primary : theme.border 
                  }
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    { 
                      backgroundColor: '#ffffff',
                      transform: [{ translateX: showCabinInfo ? 14 : 2 }]
                    }
                  ]} />
                </View>
              </TouchableOpacity>
            )}

            <Text style={[styles.label, { color: theme.text }]}>Precio por noche (ARS)</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.inputBackground, 
                borderColor: theme.border, 
                color: theme.text 
              }]}
              inputMode="decimal"
              keyboardType={Platform.select({ ios: 'numbers-and-punctuation', android: 'decimal-pad' })}
              value={pricePerNight}
              onChangeText={(t) => {
                // Permitir solo números, puntos y comas
                const cleaned = t.replace(/[^0-9.,]/g, '');
                setPricePerNight(cleaned);
                if (!manualPriceEdited) setManualPriceEdited(true);
              }}
              placeholder={suggestedPriceCents > 0 ? Math.round(suggestedPriceCents / 100).toLocaleString('es-AR') : ''}
              placeholderTextColor={theme.textSecondary}
            />
            
            <Text style={[styles.label, { color: theme.text }]}>Cantidad de noches</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.inputBackground, 
                borderColor: theme.border, 
                color: theme.text 
              }]}
              inputMode="numeric"
              keyboardType="number-pad"
              value={numberOfNights}
              onChangeText={(t) => {
                // Permitir solo números enteros
                const cleaned = t.replace(/[^0-9]/g, '');
                setNumberOfNights(cleaned);
                // Limpiar fechas si se edita manualmente
                if (cleaned !== numberOfNights) {
                  setDateFrom('');
                  setDateTo('');
                }
              }}
              placeholder=""
              placeholderTextColor={theme.textSecondary}
            />

            {/* Campos de fecha */}
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={[styles.label, { color: theme.text }]}>Desde</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.inputBackground, 
                    borderColor: theme.border, 
                    color: theme.text 
                  }]}
                  value={dateFrom}
                  onChangeText={(text) => {
                    // Formatear automáticamente DD/MM/YYYY
                    let formatted = text.replace(/\D/g, '');
                    if (formatted.length >= 2) {
                      formatted = formatted.substring(0, 2) + '/' + formatted.substring(2);
                    }
                    if (formatted.length >= 5) {
                      formatted = formatted.substring(0, 5) + '/' + formatted.substring(5, 9);
                    }
                    setDateFrom(formatted);
                  }}
                  placeholder="15/12/2024"
                  placeholderTextColor={theme.textSecondary}
                  maxLength={10}
                />
              </View>
              
              <View style={styles.dateField}>
                <Text style={[styles.label, { color: theme.text }]}>Hasta</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.inputBackground, 
                    borderColor: theme.border, 
                    color: theme.text 
                  }]}
                  value={dateTo}
                  onChangeText={(text) => {
                    // Formatear automáticamente DD/MM/YYYY
                    let formatted = text.replace(/\D/g, '');
                    if (formatted.length >= 2) {
                      formatted = formatted.substring(0, 2) + '/' + formatted.substring(2);
                    }
                    if (formatted.length >= 5) {
                      formatted = formatted.substring(0, 5) + '/' + formatted.substring(5, 9);
                    }
                    setDateTo(formatted);
                  }}
                  placeholder="18/12/2024"
                  placeholderTextColor={theme.textSecondary}
                  maxLength={10}
                />
              </View>
            </View>

            {/* Cartel de noches calculadas eliminado */}

            {suggestedStayDiscount !== null && suggestedStayDiscount > 0 && (
              <View style={[styles.helperRow, { backgroundColor: seasonalColors.accent, padding: 8, borderRadius: 8, marginBottom: 8 }]}>
                <Text style={[styles.helperText, { color: seasonalColors.primary, fontWeight: '600' }]}>Descuento por estadía: {suggestedStayDiscount}%</Text>
                {season !== 'spring' && (
                  <TouchableOpacity
                    style={[styles.helperBtn, { backgroundColor: seasonalColors.primary, borderColor: seasonalColors.primary }]}
                    onPress={() => {
                      setDiscount(suggestedStayDiscount / 100);
                      setManualDiscountEdited(true);
                    }}
                  >
                    <Text style={[styles.helperBtnText, { color: '#ffffff' }]}>Aplicar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            <View style={styles.discountRow}>
              {discountOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.discountBtn,
                    { 
                      backgroundColor: discount === option.value ? seasonalColors.primary : theme.surface,
                      borderColor: discount === option.value ? seasonalColors.primary : seasonalColors.border 
                    }
                  ]}
                  onPress={() => {
                    const newVal = discount === option.value ? 0 : option.value;
                    setDiscount(newVal);
                    setManualDiscountEdited(true);
                  }}
                >
                  <Text
                    style={[
                      styles.discountText,
                      { 
                        color: discount === option.value ? '#ffffff' : theme.text 
                      }
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
                  { 
                    backgroundColor: canCalculate ? seasonalColors.primary : theme.border,
                    opacity: canCalculate ? 1 : 0.6 
                  }
                ]}
                onPress={onCalculate}
                disabled={!canCalculate}
              >
                <Text style={[styles.btnPrimaryText, { color: '#ffffff' }]}>Calcular</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
                onPress={onClear}
              >
                <Text style={[styles.btnSecondaryText, { color: theme.text }]}>Limpiar</Text>
              </TouchableOpacity>
            </View>
          </View>
          </PanGestureHandler>

          {computed && (
            <View style={styles.resultsWrapper}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Resumen</Text>

              <View style={[styles.resultCard, { backgroundColor: theme.surface, borderLeftColor: theme.warning }]}>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: theme.textSecondary }]}> 
                    {formatARS(computed.pricePerNightCents)} × {computed.nights} noche{computed.nights > 1 ? 's' : ''}
                  </Text>
                  {discount === 0 && (
                    <TouchableOpacity
                      style={[styles.copyButton, { backgroundColor: theme.background }]}
                      onPress={() => onCopyToClipboard(computed.totalOriginal, 'Total')}
                    >
                      <Text style={styles.copyIcon}>📋</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={[styles.resultValue, { color: theme.text }]}>Total: {formatARS(computed.totalOriginal)}</Text>
              </View>

              {discount > 0 && (
                <View style={[styles.resultCard, { backgroundColor: theme.surface, borderLeftColor: theme.textSecondary }]}>
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>
                      Total con descuento ({discount * 100}%)
                    </Text>
                    <TouchableOpacity
                      style={[styles.copyButton, { backgroundColor: theme.background }]}
                      onPress={() => onCopyToClipboard(computed.totalWithDiscount, 'Total con descuento')}
                    >
                      <Text style={styles.copyIcon}>📋</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.resultValue, { color: theme.text }]}>{formatARS(computed.totalWithDiscount)}</Text>
                </View>
              )}

              <View style={[styles.resultCard, { backgroundColor: theme.surface, borderLeftColor: seasonalColors.primary }]}>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: seasonalColors.primary }]}>
                    Seña ({computed.season === 'spring' ? '50%' : '20%'})
                  </Text>
                  <TouchableOpacity
                    style={[styles.copyButton, { backgroundColor: seasonalColors.accent }]}
                    onPress={() => onCopyToClipboard(computed.sena, 'Seña')}
                  >
                    <Text style={styles.copyIcon}>📋</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.resultValue, { color: seasonalColors.primary }]}>{formatARS(computed.sena)}</Text>
              </View>
              
              {computed.season === 'summer' && (
                <View style={[styles.resultCard, { backgroundColor: theme.surface, borderLeftColor: seasonalColors.secondary }]}>
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: seasonalColors.secondary }]}>Segundo pago (30%)</Text>
                    <TouchableOpacity
                      style={[styles.copyButton, { backgroundColor: seasonalColors.accent }]}
                      onPress={() => onCopyToClipboard(computed.segundo, 'Segundo pago')}
                    >
                      <Text style={styles.copyIcon}>📋</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.resultValue, { color: seasonalColors.secondary }]}>{formatARS(computed.segundo)}</Text>
                </View>
              )}
              
              <View style={[styles.resultCard, { backgroundColor: theme.surface, borderLeftColor: theme.error }]}>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: theme.error }]}>
                    {computed.season === 'spring' ? 'Segundo pago (50%)' : 'Saldo final (50%)'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.copyButton, { backgroundColor: isDarkMode ? '#ef444420' : '#fee2e2' }]}
                    onPress={() => onCopyToClipboard(computed.saldo, computed.season === 'spring' ? 'Segundo pago' : 'Saldo final')}
                  >
                    <Text style={styles.copyIcon}>📋</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.resultValue, { color: theme.error }]}>{formatARS(computed.saldo)}</Text>
              </View>

              <View style={styles.shareRow}>
                <TouchableOpacity onPress={() => onShare()} style={[styles.btn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}> 
                  <Text style={[styles.btnLightText, { color: theme.text }]}>Compartir todo</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {feedbackMessage ? (
            <View style={[styles.feedbackContainer, { backgroundColor: theme.success }]}>
              <Text style={styles.feedbackText}>{feedbackMessage}</Text>
            </View>
          ) : null}

          {/* Menú hamburguesa */}
          <Modal
            visible={showMenu}
            transparent
            animationType="fade"
            onRequestClose={() => setShowMenu(false)}
          >
            <View style={{ flex:1, backgroundColor: '#00000066', justifyContent:'flex-start' }}>
              <View style={{ backgroundColor: theme.surface, padding: 16, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Menú</Text>
                <TouchableOpacity
                  style={[styles.helperRow, { marginTop: 8 }]}
                  onPress={() => { toggleTheme(); }}
                >
                  <Text style={[styles.label, { color: theme.text }]}>Modo: {themePreference === 'auto' ? 'Auto' : (themePreference === 'light' ? 'Claro' : 'Oscuro')}</Text>
                  <Text style={styles.themeIconSmall}>{getThemeIcon()}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.helperRow, { marginTop: 8 }]}
                  onPress={() => { setScreen('admin'); setShowMenu(false); }}
                >
                  <Text style={[styles.label, { color: theme.text }]}>Admin</Text>
                  <Text style={styles.themeIconSmall}>⚙️</Text>
                </TouchableOpacity>
                <View style={{ alignItems:'flex-end', marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setShowMenu(false)} style={[styles.helperBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
                    <Text style={[styles.helperBtnText, { color: theme.text }]}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1
  },
  container: { 
    flex: 1 
  },
  contentContainer: { 
    padding: 20 
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8
  },
  titleRow: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.02)'
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    marginBottom: 2
  },
  subtitle: { 
    fontSize: 14, 
    marginBottom: 16
  },
  label: { 
    fontSize: 16, 
    marginBottom: 8
  },
  card: {
    borderRadius: 16,
    padding: 16,
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
    borderWidth: 1
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
    borderWidth: 1
  },
  discountText: { 
    fontWeight: '600'
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
    justifyContent: 'center'
  },
  btnPrimaryText: { 
    fontSize: 16, 
    fontWeight: '700'
  },
  btnSecondaryText: { 
    fontSize: 16, 
    fontWeight: '700'
  },
  btnLightText: { 
    fontSize: 14, 
    fontWeight: '700'
  },
  resultsWrapper: { 
    marginTop: 20 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 10
  },
  resultCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
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
    fontSize: 14
  },
  resultValue: { 
    fontSize: 20, 
    fontWeight: '800', 
    marginTop: 4
  },
  shareButton: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8
  },
  shareButtonText: { 
    fontSize: 12, 
    fontWeight: '700'
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  copyIcon: {
    fontSize: 16
  },
  shareRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 8 
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -8,
    marginBottom: 12
  },
  helperText: {
    fontSize: 13
  },
  helperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1
  },
  helperBtnText: {
    fontSize: 12,
    fontWeight: '700'
  },
  feedbackContainer: {
    marginTop: 16,
    padding: 12,
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
    marginBottom: 10
  },
  themeToggleSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1
  },
  themeIconSmall: {
    fontSize: 16
  },
  seasonSwitchSmall: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 2,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  seasonSwitchButtonSmall: {
    width: 28,
    height: 28,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  seasonSwitchEmojiSmall: {
    fontSize: 14
  },
  // Estilos para campos de fecha
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  dateField: {
    flex: 1,
  }
});
