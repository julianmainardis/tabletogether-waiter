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

interface MenuViewProps {
  tableId: number;
  diners: number;
  isModifying?: boolean;
  currentOrder?: any[];
  onBack: () => void;
  onConfirmOrder: (items: any[]) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

// Definir iconos para cada categoría
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
  onBack,
  onConfirmOrder,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(() => {
    // Si estamos modificando, inicializar con el pedido actual
    if (isModifying && currentOrder.length > 0) {
      console.log('Modificando pedido actual:', currentOrder);
      const initialItems: Record<string, number> = {};
      currentOrder.forEach(item => {
        initialItems[item.id] = item.quantity;
      });
      return initialItems;
    }
    return {};
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);

  // Cargar productos y categorías
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
        console.log('📂 Categories names:', categoriesData.map(cat => cat.name));
        
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
  console.log('🏷️ All categories:', allCategories);
  console.log('🔍 Selected category:', selectedCategory);
  console.log('📦 Total products:', products.length);
  console.log('📂 Categories from backend:', categories.map(cat => ({ id: cat.id, name: cat.name })));
  console.log('🎯 About to render', allCategories.length, 'category buttons');
  
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => {
        const productCategory = categories.find(cat => cat.id === product.category_id);
        const matches = productCategory?.name === selectedCategory;
        console.log(`Product ${product.name} - category_id: ${product.category_id} - category_name: ${productCategory?.name} - selected: ${selectedCategory} - matches: ${matches}`);
        return matches;
      });
  
  console.log('📋 Filtered products count:', filteredProducts.length);
  console.log('📋 Filtered products:', filteredProducts.map(p => p.name));

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
  };

  const handleProductPress = (product: Product) => {
    console.log('🎯 Product pressed:', product.name, product.id);
    setSelectedProduct(product);
    setShowProductDetail(true);
  };

  const handleAddToOrder = (productId: string, quantity: number, customizations: string[]) => {
    console.log('📦 Adding to order:', productId, quantity, customizations);
    setSelectedItems(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + quantity,
    }));
  };

  const getTotalPrice = () => {
    return Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
      const item = products.find(i => i.id === itemId);
      return total + (item?.price || 0) * quantity;
    }, 0);
  };

  const getSelectedItemsList = () => {
    return Object.entries(selectedItems).map(([itemId, quantity]) => {
      const item = products.find(i => i.id === itemId);
      if (!item) return null;
      return {
        ...item,
        quantity,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  };

  const renderMenuItem = (product: Product) => {
    const quantity = selectedItems[product.id] || 0;
    
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
                <Text style={styles.menuItemName}>{product.name}</Text>
                {product.description && (
                  <Text style={styles.menuItemDescription} numberOfLines={2}>
                    {product.description}
                  </Text>
                )}
                <Text style={styles.menuItemPrice}>€{product.price.toFixed(2)}</Text>
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
                <TouchableOpacity
                  onPress={() => addItem(product.id)}
                  style={styles.quantityButton}
                >
                  <Ionicons name="add" size={isTablet ? 24 : 20} color="#10b981" />
                </TouchableOpacity>
              </View>
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
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

      {/* Sección de pedido actual (solo cuando se está modificando) */}
      {isModifying && (
        <View style={styles.currentOrderSection}>
          <Text style={styles.currentOrderTitle}>Pedido Actual</Text>
          {currentOrder.length > 0 ? (
            currentOrder.map(item => (
              <View key={item.id} style={styles.currentOrderItem}>
                <Text style={styles.currentOrderItemText}>
                  {item.name} x{item.quantity} - €{(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noOrderText}>No hay pedido actual</Text>
          )}
        </View>
      )}

      {/* Barra de categorías */}
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
                  console.log(`Category clicked: ${category}`);
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

      {/* Lista de productos */}
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
            <Text style={styles.orderTotal}>€{getTotalPrice().toFixed(2)}</Text>
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
            onPress={() => onConfirmOrder(getSelectedItemsList())}
            style={styles.confirmButton}
          />
        </View>
      )}

      {/* Product Detail Dialog */}
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
    padding: isTablet ? 24 : 16,
  },
  menuGrid: {
    flexDirection: isTablet ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuItemWrapper: {
    width: isTablet ? '48%' : '100%',
    marginBottom: 16,
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
  },
  menuItemContent: {
    padding: isTablet ? 20 : 16,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: isTablet ? 80 : 60,
  },
  menuItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  menuItemName: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: isTablet ? 14 : 12,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  menuItemPrice: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: 'bold',
    color: '#10b981',
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
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  currentOrderItemText: {
    fontSize: isTablet ? 14 : 12,
    color: '#374151',
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
}); 