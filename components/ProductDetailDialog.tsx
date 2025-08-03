import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Product } from '../services/productService';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface ProductDetailDialogProps {
  product: Product | null;
  isVisible: boolean;
  onClose: () => void;
  onAddToOrder: (productId: string, quantity: number, customizations: string[]) => void;
}

function groupCustomizations(customizations: Product['customizations']) {
  if (!customizations) return {};
  const groups: Record<string, typeof customizations> = {};
  customizations.forEach((c) => {
    const group = c.customizations.customization_group || 'Otro';
    if (!groups[group]) groups[group] = [];
    groups[group].push(c);
  });
  return groups;
}

export const ProductDetailDialog: React.FC<ProductDetailDialogProps> = ({
  product,
  isVisible,
  onClose,
  onAddToOrder,
}) => {
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  // Reset state when product changes or dialog opens
  useEffect(() => {
    if (product && isVisible) {
      setSelectedCustomizations({});
      setQuantity(1);
    }
  }, [product?.id, isVisible]);

  if (!product || !isVisible) return null;

  const groupedCustomizations = groupCustomizations(product.customizations);

  const handleCustomizationChange = (group: string, value: string) => {
    setSelectedCustomizations(prev => ({
      ...prev,
      [group]: value
    }));
  };

  const handleAddToOrder = () => {
    try {
      if (!product.customizations || product.customizations.length === 0) {
        onAddToOrder(product.id, quantity, []);
        onClose();
        return;
      }

      const requiredGroups = Object.entries(groupedCustomizations).filter(([, groupCustoms]) => 
        groupCustoms.some(c => c.is_required)
      );
      const missingRequired = requiredGroups.some(([group]) => !selectedCustomizations[group]);
      
      if (missingRequired) {
        Alert.alert('Error', 'Por favor selecciona todas las opciones requeridas');
        return;
      }

      const customizations = Object.values(selectedCustomizations).filter(Boolean);
      onAddToOrder(product.id, quantity, customizations);
      onClose();
    } catch (error) {
      console.error('❌ Error al agregar al pedido:', error);
      Alert.alert('Error', 'Error al agregar al pedido');
    }
  };

  const totalPrice = product.price + (Object.entries(selectedCustomizations).reduce((total, [group, customizationId]) => {
    const groupCustoms = groupedCustomizations[group];
    const customization = groupCustoms?.find(c => c.customization_id === customizationId);
    return total + (customization?.customizations.price_adjustment || 0);
  }, 0));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={isTablet ? 28 : 24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{product.name}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {product.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>
        )}

        {/* Customizaciones */}
        {Object.entries(groupedCustomizations).map(([group, groupCustoms]) => (
          <Card key={group} style={styles.customizationCard}>
            <CardContent style={styles.customizationContent}>
              <Text style={styles.customizationTitle}>{group}</Text>
              <View style={styles.customizationOptions}>
                {groupCustoms.map((customization) => (
                  <TouchableOpacity
                    key={customization.customization_id}
                    style={[
                      styles.customizationOption,
                      selectedCustomizations[group] === customization.customization_id && 
                      styles.selectedCustomizationOption
                    ]}
                    onPress={() => handleCustomizationChange(group, customization.customization_id)}
                  >
                    <View style={styles.customizationOptionContent}>
                      <Text style={[
                        styles.customizationOptionText,
                        selectedCustomizations[group] === customization.customization_id && 
                        styles.selectedCustomizationOptionText
                      ]}>
                        {customization.customizations.name}
                      </Text>
                      {customization.customizations.price_adjustment > 0 && (
                        <Text style={[
                          styles.priceAdjustment,
                          selectedCustomizations[group] === customization.customization_id && 
                          styles.selectedPriceAdjustment
                        ]}>
                          (+€{customization.customizations.price_adjustment.toFixed(2)})
                        </Text>
                      )}
                    </View>
                    {selectedCustomizations[group] === customization.customization_id && (
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </CardContent>
          </Card>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.quantitySection}>
          <Text style={styles.quantityLabel}>Cantidad:</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Ionicons name="remove" size={isTablet ? 24 : 20} color="#ef4444" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Ionicons name="add" size={isTablet ? 24 : 20} color="#10b981" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Precio total:</Text>
          <Text style={styles.priceText}>€{(totalPrice * quantity).toFixed(2)}</Text>
        </View>
        
        <Button
          title="Agregar al pedido"
          onPress={handleAddToOrder}
          style={styles.addButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isTablet ? 24 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: isTablet ? 24 : 16,
  },
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: isTablet ? 16 : 14,
    color: '#6b7280',
    lineHeight: 22,
  },
  customizationCard: {
    marginBottom: 16,
  },
  customizationContent: {
    padding: isTablet ? 20 : 16,
  },
  customizationTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  customizationOptions: {
    gap: 8,
  },
  customizationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isTablet ? 16 : 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  selectedCustomizationOption: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  customizationOptionContent: {
    flex: 1,
  },
  customizationOptionText: {
    fontSize: isTablet ? 16 : 14,
    color: '#374151',
    fontWeight: '500',
  },
  selectedCustomizationOptionText: {
    color: '#10b981',
    fontWeight: '600',
  },
  priceAdjustment: {
    fontSize: isTablet ? 14 : 12,
    color: '#10b981',
    marginTop: 2,
  },
  selectedPriceAdjustment: {
    color: '#059669',
  },
  footer: {
    padding: isTablet ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quantityLabel: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#374151',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: isTablet ? 40 : 32,
    height: isTablet ? 40 : 32,
    borderRadius: isTablet ? 20 : 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#374151',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: isTablet ? 16 : 14,
    color: '#6b7280',
  },
  priceText: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  addButton: {
    backgroundColor: '#FF6B6B',
  },
}); 