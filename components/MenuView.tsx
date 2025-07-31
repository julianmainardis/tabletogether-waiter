import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
}

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

const mockMenuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Jamón Ibérico',
    description: 'Jamón ibérico de bellota de 24 meses',
    price: 18.50,
    category: 'Entrantes',
    available: true,
  },
  {
    id: '2',
    name: 'Paella Valenciana',
    description: 'Paella tradicional con pollo y conejo',
    price: 22.00,
    category: 'Platos principales',
    available: true,
  },
  {
    id: '3',
    name: 'Ensalada César',
    description: 'Lechuga, crutones, parmesano y aderezo César',
    price: 12.50,
    category: 'Entrantes',
    available: true,
  },
  {
    id: '4',
    name: 'Solomillo a la parrilla',
    description: 'Solomillo de ternera con patatas y verduras',
    price: 28.00,
    category: 'Platos principales',
    available: true,
  },
  {
    id: '5',
    name: 'Tiramisú',
    description: 'Postre italiano con café y mascarpone',
    price: 8.50,
    category: 'Postres',
    available: true,
  },
];

export const MenuView: React.FC<MenuViewProps> = ({
  tableId,
  diners,
  isModifying = false,
  currentOrder = [],
  onBack,
  onConfirmOrder,
}) => {
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

  const categories = ['all', ...Array.from(new Set(mockMenuItems.map(item => item.category)))];
  
  const filteredItems = selectedCategory === 'all' 
    ? mockMenuItems 
    : mockMenuItems.filter(item => item.category === selectedCategory);

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

  const getTotalPrice = () => {
    return Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
      const item = mockMenuItems.find(i => i.id === itemId);
      return total + (item?.price || 0) * quantity;
    }, 0);
  };

  const getSelectedItemsList = () => {
    return Object.entries(selectedItems).map(([itemId, quantity]) => {
      const item = mockMenuItems.find(i => i.id === itemId);
      return {
        ...item,
        quantity,
      };
    }).filter(Boolean);
  };

  const renderMenuItem = (item: MenuItem) => {
    const quantity = selectedItems[item.id] || 0;
    
    return (
      <Card key={item.id} style={styles.menuItem}>
        <CardContent style={styles.menuItemContent}>
          <View style={styles.menuItemHeader}>
            <View style={styles.menuItemInfo}>
              <Text style={styles.menuItemName}>{item.name}</Text>
              <Text style={styles.menuItemDescription}>{item.description}</Text>
              <Text style={styles.menuItemPrice}>€{item.price.toFixed(2)}</Text>
            </View>
            <View style={styles.quantityControls}>
              {quantity > 0 && (
                <TouchableOpacity
                  onPress={() => removeItem(item.id)}
                  style={styles.quantityButton}
                >
                  <Ionicons name="remove" size={isTablet ? 24 : 20} color="#ef4444" />
                </TouchableOpacity>
              )}
              {quantity > 0 && (
                <Text style={styles.quantityText}>{quantity}</Text>
              )}
              <TouchableOpacity
                onPress={() => addItem(item.id)}
                style={styles.quantityButton}
              >
                <Ionicons name="add" size={isTablet ? 24 : 20} color="#10b981" />
              </TouchableOpacity>
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

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

      <View style={styles.mainContent}>
        {/* Panel izquierdo con categorías */}
        <View style={styles.leftPanel}>
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
          
          <View style={styles.categoriesSection}>
            <Text style={styles.categoriesTitle}>Categorías</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryItem,
                    selectedCategory === category && styles.selectedCategoryItem,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === category && styles.selectedCategoryText,
                  ]}>
                    {category === 'all' ? 'Todos los productos' : category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Panel derecho con productos */}
        <View style={styles.rightPanel}>
          <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
            <View style={styles.menuGrid}>
              {filteredItems.map(renderMenuItem)}
            </View>
          </ScrollView>
        </View>
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
  mainContent: {
    flex: 1,
    flexDirection: isTablet ? 'row' : 'column',
  },
  leftPanel: {
    width: isTablet ? 250 : '100%',
    backgroundColor: '#ffffff',
    borderRightWidth: isTablet ? 1 : 0,
    borderRightColor: '#e5e7eb',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  categoriesSection: {
    padding: isTablet ? 20 : 16,
  },
  categoriesTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  categoryItem: {
    paddingVertical: isTablet ? 16 : 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  selectedCategoryItem: {
    backgroundColor: '#3b82f6',
  },
  categoryText: {
    fontSize: isTablet ? 16 : 14,
    color: '#374151',
  },
  selectedCategoryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  menuList: {
    flex: 1,
    padding: isTablet ? 24 : 16,
  },
  menuGrid: {
    flexDirection: isTablet ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: isTablet ? '48%' : '100%',
    marginBottom: 16,
    marginRight: isTablet ? 0 : 0,
  },
  menuItemContent: {
    padding: isTablet ? 20 : 16,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    fontSize: isTablet ? 14 : 14,
    color: '#6b7280',
    marginBottom: 8,
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
}); 