import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ProductDetailDialog } from './ProductDetailDialog';
import { productService, Product, Category } from '../services/productService';
import { orderService } from '../services/orderService';

interface MenuViewProps {
  tableId: number;
  diners: number;
  isModifying?: boolean;
  currentOrder?: any[];
  loadingCurrentOrder?: boolean;
  onBack: () => void;
  onConfirmOrder: (items: any[]) => void;
  tableRealId?: string;
  onRefresh?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const categoryIcons: Record<string, string> = {
  'all': 'restaurant',
  'Entrantes': 'wine',
  'Platos principales': 'restaurant',
  'Postres': 'ice-cream',
  'Bebidas': 'beer',
};

export const MenuView: React.FC<MenuViewProps> = ({
  tableId,
  diners,
  isModifying = false,
  currentOrder = [],
  loadingCurrentOrder = false,
  onBack,
  onConfirmOrder,
  tableRealId,
  onRefresh,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(() => {
    if (isModifying && currentOrder.length > 0) {
      console.log('Modificando pedido actual:', currentOrder);
      const initialItems: Record<string, number> = {};
      currentOrder.forEach(item => {
        const uniqueId = `${item.id}-${item.status || 'pending'}`;
        initialItems[uniqueId] = item.quantity;
      });
      return initialItems;
    }
    return {};
  });
  
  // Almacenar customizations por productId
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, string[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Starting to load data...');
        
        const [productsData, categoriesData] = await Promise.all([
          productService.getProducts(),
          productService.getCategories()
        ]);
        
        console.log('📦 Products loaded:', productsData.length);
        console.log('📂 Categories loaded:', categoriesData);
        
        setProducts(productsData);
        setCategories(categoriesData);
        
        console.log('✅ Data loaded successfully');
      } catch (error) {
        console.error('❌ Error loading menu data:', error);
        Alert.alert('Error', 'No se pudieron cargar los productos');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const allCategories = ['all', ...categories.map(cat => cat.name)];
  
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => {
        const productCategory = categories.find(cat => cat.id === product.category_id);
        return productCategory?.name === selectedCategory;
      });

  const addItem = (itemId: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newItems = { ...prev };
      if (newItems[itemId] > 1) {
        newItems[itemId] -= 1;
      } else {
        delete newItems[itemId];
      }
      return newItems;
    });
  };

  const removeItemCompletely = (itemId: string) => {
    setSelectedItems(prev => {
      const newItems = { ...prev };
      delete newItems[itemId];
      return newItems;
    });
    
    // También limpiar customizations
    setSelectedCustomizations(prev => {
      const newCustomizations = { ...prev };
      delete newCustomizations[itemId];
      return newCustomizations;
    });
  };
  
  const validateSelectedItems = () => {
    const items = getSelectedItemsList();
    for (const item of items) {
      const product = products.find(p => p.id === item.id);
      if (product && product.customizations && product.customizations.length > 0) {
        const hasRequiredCustomizations = product.customizations.some(c => c.is_required);
        if (hasRequiredCustomizations && (!item.customizations || item.customizations.length === 0)) {
          return { valid: false, message: `"${product.name}" requiere personalización` };
        }
      }
    }
    return { valid: true, message: '' };
  };

  const handleProductPress = (product: Product) => {
    console.log('🎯 Product pressed:', product.name, product.id);
    setSelectedProduct(product);
    setShowProductDetail(true);
  };

  const handleAddToOrder = (productId: string, quantity: number, customizations: string[]) => {
    console.log('📦 Adding to order:', productId, quantity, customizations);
    
    // Buscar el producto para verificar si tiene customizations obligatorias
    const product = products.find(p => p.id === productId);
    if (product && product.customizations && product.customizations.length > 0) {
      const hasRequiredCustomizations = product.customizations.some(c => c.is_required);
      
      if (hasRequiredCustomizations && customizations.length === 0) {
        Alert.alert('Error', 'Este producto requiere personalización. Por favor selecciona las opciones requeridas.');
        return;
      }
    }
    
    setSelectedItems(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + quantity,
    }));
    
    // Almacenar customizations si las hay
    if (customizations.length > 0) {
      setSelectedCustomizations(prev => ({
        ...prev,
        [productId]: customizations,
      }));
    }
  };

  const getTotalPrice = () => {
    const total = Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
      const item = products.find(i => i.id === itemId);
      return total + (item?.price || 0) * quantity;
    }, 0);
    return Math.round(total * 100) / 100;
  };

  const getSelectedItemsList = () => {
    return Object.entries(selectedItems).map(([itemId, quantity]) => {
      const item = products.find(i => i.id === itemId);
      if (!item) return null;
      return {
        ...item,
        quantity,
        customizations: selectedCustomizations[itemId] || [],
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  };

  const renderMenuItem = (product: Product) => {
    const quantity = selectedItems[product.id] || 0;
    
    // Verificar si el producto tiene customizations obligatorias
    const hasRequiredCustomizations = product.customizations && 
      product.customizations.length > 0 && 
      product.customizations.some(c => c.is_required);
    
    return (
      <TouchableOpacity
        key={product.id}
        onPress={() => handleProductPress(product)}
        activeOpacity={0.7}
        style={styles.menuItemTouchable}
      >
        <Card style={styles.menuItem}>
          <CardContent style={styles.menuItemContent}>
            <View style={styles.menuItemHeader}>
              <View style={styles.menuItemInfo}>
                <View style={styles.productNameContainer}>
                  <Text style={styles.menuItemName}>{product.name}</Text>
                  {hasRequiredCustomizations && (
                    <View style={styles.requiredBadge}>
                      <Ionicons name="settings" size={12} color="#f59e0b" />
                    </View>
                  )}
                </View>
                {product.description && (
                  <Text style={styles.menuItemDescription} numberOfLines={2}>
                    {product.description}
                  </Text>
                )}
                <Text style={styles.menuItemPrice}>${formatCurrency(product.price)}</Text>
                {hasRequiredCustomizations && (
                  <Text style={styles.customizationHint}>Toca para personalizar</Text>
                )}
              </View>
              <View style={styles.quantityControls}>
                {quantity > 0 && (
                  <TouchableOpacity
                    onPress={() => removeItem(product.id)}
                    style={styles.quantityButton}
                  >
                    <Ionicons name="remove" size={isTablet ? 24 : 20} color="#ef4444" />
                  </TouchableOpacity>
                )}
                {quantity > 0 && (
                  <Text style={styles.quantityText}>{quantity}</Text>
                )}
              </View>
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderCurrentOrderItem = (item: any, index: number) => {
    const isPending = item.status === 'pending';
    const isProcessing = item.status === 'processing';
    const statusColor = item.status === 'pending' ? '#f59e0b' : 
                       item.status === 'processing' ? '#3b82f6' : 
                       item.status === 'completed' ? '#10b981' : '#6b7280';
    
    const statusText = item.status === 'pending' ? 'Pendiente' :
                      item.status === 'processing' ? 'En preparación' :
                      item.status === 'completed' ? 'Listo' : 'Entregado';

    const handleRemoveItem = async () => {
      try {
        if (!tableRealId || !item.orderId || !item.itemId) {
          Alert.alert('Error', 'No se puede eliminar este producto en este momento');
          return;
        }

        // Eliminar el producto del pedido
        await orderService.removeItem(tableRealId, item.orderId, item.itemId);
        
        Alert.alert('Éxito', 'Producto eliminado del pedido');
        
        // Llamar a onRefresh para actualizar la vista principal
        if (onRefresh) {
          onRefresh();
        }
        
        // Recargar el pedido actual
        if (onConfirmOrder) {
          onConfirmOrder([]);
        }
        
      } catch (error: any) {
        console.error('Error eliminando producto:', error);
        Alert.alert('Error', error.message || 'No se pudo eliminar el producto');
      }
    };

    return (
      <View style={styles.currentOrderItem}>
        <View style={styles.currentOrderItemContent}>
          <Text style={styles.currentOrderItemText}>
            {item.name} x{item.quantity} - ${formatCurrency(item.price * item.quantity)}
          </Text>
          <View style={styles.currentOrderItemStatus}>
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>
        {isPending && isModifying && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Eliminar producto',
                `¿Estás seguro de que quieres eliminar "${item.name}" del pedido?`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { 
                    text: 'Eliminar', 
                    style: 'destructive',
                    onPress: handleRemoveItem
                  }
                ]
              );
            }}
            style={styles.removeCurrentOrderButton}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={isTablet ? 28 : 24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {isModifying ? 'Modificar Pedido' : 'Menú'} - Mesa {tableId}
            </Text>
            <Text style={styles.headerSubtitle}>{diners} comensales</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={isTablet ? 28 : 24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {isModifying ? 'Modificar Pedido' : 'Menú'} - Mesa {tableId}
          </Text>
          <Text style={styles.headerSubtitle}>{diners} comensales</Text>
        </View>
      </View>

      {isModifying && (
        <View style={styles.currentOrderSection}>
          <Text style={styles.currentOrderTitle}>Pedido Actual</Text>
          {loadingCurrentOrder ? (
            <View style={styles.currentOrderLoadingContainer}>
              <Text style={styles.currentOrderLoadingText}>Cargando pedido actual...</Text>
            </View>
          ) : (
            currentOrder.length > 0 ? (
              <ScrollView 
                style={styles.currentOrderScrollView}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                <View style={styles.currentOrderGrid}>
                  {currentOrder.map((item, index) => (
                    <View key={`${item.id}-${item.status}-${index}`} style={styles.currentOrderItemWrapper}>
                      {renderCurrentOrderItem(item, index)}
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.noOrderText}>No hay pedido actual</Text>
            )
          )}
        </View>
      )}

      <View style={styles.categoriesSection}>
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollContainer}
        >
          {allCategories.map((category, index) => {
            const isSelected = selectedCategory === category;
            const categoryName = category === 'all' ? 'Todos' : category;
            const iconName = categoryIcons[category] || 'restaurant';
            
            return (
              <TouchableOpacity
                key={`category-${category}`}
                style={[
                  styles.categoryButton,
                  isSelected && styles.selectedCategoryButton,
                ]}
                onPress={() => {
                  setSelectedCategory(category);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  <Ionicons 
                    name={iconName as any} 
                    size={isTablet ? 16 : 14} 
                    color={isSelected ? '#ffffff' : '#FF6B6B'} 
                  />
                  <Text 
                    style={[
                      styles.categoryButtonText,
                      isSelected && styles.selectedCategoryButtonText,
                    ]}
                  >
                    {categoryName}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.productsContainer}>
        <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
          <View style={styles.menuGrid}>
            {filteredProducts.map((product, index) => (
              <View key={product.id} style={styles.menuItemWrapper}>
                {renderMenuItem(product)}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {Object.keys(selectedItems).length > 0 && (
        <View style={styles.orderSummary}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderTitle}>Resumen del pedido</Text>
            <Text style={styles.orderTotal}>${formatCurrency(getTotalPrice())}</Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedItems}>
            {getSelectedItemsList().map(item => (
              <View key={item.id} style={styles.selectedItemContainer}>
                <Badge variant="secondary" style={styles.selectedItem}>
                  {item.name} x{item.quantity}
                </Badge>
                <TouchableOpacity
                  onPress={() => removeItemCompletely(item.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          
          <Button
            title={isModifying ? "Confirmar modificación" : "Confirmar pedido"}
            onPress={() => {
              const validation = validateSelectedItems();
              if (!validation.valid) {
                Alert.alert('Error', validation.message);
                return;
              }
              
              onConfirmOrder(getSelectedItemsList());
              // Llamar a onRefresh para actualizar la vista principal (igual que cuando se elimina)
              if (onRefresh) {
                onRefresh();
              }
            }}
            style={styles.confirmButton}
          />
        </View>
      )}

      <ProductDetailDialog
        product={selectedProduct}
        isVisible={showProductDetail}
        onClose={() => {
          console.log('🔒 Closing ProductDetailDialog');
          setShowProductDetail(false);
          setSelectedProduct(null);
        }}
        onAddToOrder={handleAddToOrder}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isTablet ? 24 : 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: isTablet ? 24 : 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: isTablet ? 16 : 14,
    color: '#6b7280',
  },
  categoriesSection: {
    padding: isTablet ? 20 : 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoriesScrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTablet ? 12 : 8,
    paddingHorizontal: isTablet ? 16 : 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    width: isTablet ? 140 : 120,
    height: isTablet ? 50 : 44,
    minHeight: isTablet ? 50 : 44,
    maxHeight: isTablet ? 50 : 44,
    flexWrap: 'wrap',
  },
  selectedCategoryButton: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  categoryButtonText: {
    fontSize: isTablet ? 12 : 11,
    color: '#FF6B6B',
    fontWeight: '500',
    marginLeft: 4,
    textAlign: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
    alignSelf: 'center',
    textAlignVertical: 'center',
  },
  selectedCategoryButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  productsContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  menuList: {
    flex: 1,
    padding: isTablet ? 20 : 12,
  },
  menuGrid: {
    flexDirection: isTablet ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuItemWrapper: {
    width: isTablet ? '48%' : '100%',
    marginBottom: 12,
  },
  menuItem: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    height: isTablet ? 100 : 80,
    minHeight: isTablet ? 100 : 80,
    maxHeight: isTablet ? 100 : 80,
  },
  menuItemContent: {
    padding: isTablet ? 16 : 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flex: 1,
    height: '100%',
  },
  menuItemInfo: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'space-between',
    height: '100%',
  },
  menuItemName: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: isTablet ? 12 : 10,
    color: '#6b7280',
    marginBottom: 4,
    lineHeight: 16,
    flex: 1,
  },
  menuItemPrice: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 'auto',
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
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  orderSummary: {
    backgroundColor: '#ffffff',
    padding: isTablet ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#111827',
  },
  orderTotal: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  selectedItems: {
    marginBottom: 16,
  },
  selectedItem: {
    marginRight: 8,
  },
  selectedItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  removeButton: {
    marginLeft: 8,
  },
  confirmButton: {
    marginTop: 8,
  },
  currentOrderSection: {
    padding: isTablet ? 20 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  currentOrderTitle: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  currentOrderItem: {
    backgroundColor: '#ffffff',
    padding: 6,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  currentOrderItemContent: {
    flex: 1,
    marginLeft: 8,
  },
  currentOrderItemText: {
    fontSize: isTablet ? 14 : 12,
    color: '#374151',
    marginBottom: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  currentOrderItemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: isTablet ? 13 : 11,
    fontWeight: '600',
  },
  removeCurrentOrderButton: {
    padding: 10,
    marginLeft: 6,
    marginRight: 8,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  noOrderText: {
    fontSize: isTablet ? 14 : 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    fontSize: 18,
    color: '#6b7280',
  },
  menuItemTouchable: {
    width: '100%',
    marginBottom: 16,
  },
  currentOrderLoadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentOrderLoadingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  currentOrderScrollView: {
    maxHeight: 150,
  },
  moreProductsIndicator: {
    width: '100%',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginTop: 8,
  },
  moreProductsText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  currentOrderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  currentOrderItemWrapper: {
    width: '48%',
    marginBottom: 6,
  },
  productNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  requiredBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 2,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  customizationHint: {
    fontSize: isTablet ? 10 : 9,
    color: '#f59e0b',
    fontStyle: 'italic',
    marginTop: 2,
  },
}); 