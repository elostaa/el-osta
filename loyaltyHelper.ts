import { ref, get, set, push } from 'firebase/database';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, rtdb } from './firebase';

export interface LoyaltyData {
  phone: string;
  name: string;
  completedCount: number;
  currentDiscountLevel: number;
}

export const getCleanPhone = (phone: string): string => {
  if (!phone) return '';
  return phone.trim().replace(/[\s\+\-\(\)]/g, '');
};

// Function to increment completed orders count and handle loyalty stages
export const incrementCompletedOrders = async (customerPhone: string, customerName: string) => {
  const cleanPhone = getCleanPhone(customerPhone);
  if (!cleanPhone) return null;

  try {
    // 1. Fetch current loyalty data from Realtime Database
    const rtdbRef = ref(rtdb, `loyalty/${cleanPhone}`);
    const snapshot = await get(rtdbRef);
    
    let completedCount = 0;
    let currentDiscountLevel = 5; // Default starts at 5% discount phase

    if (snapshot.exists()) {
      const data = snapshot.val();
      completedCount = typeof data.completedCount === 'number' ? data.completedCount : 0;
      currentDiscountLevel = typeof data.currentDiscountLevel === 'number' ? data.currentDiscountLevel : 5;
    }

    // Increment count
    let newCompletedCount = completedCount + 1;
    let earnedDiscount = 0;
    let newDiscountLevel = currentDiscountLevel;

    // Check if customer reached 8 completed orders
    if (newCompletedCount >= 8) {
      earnedDiscount = currentDiscountLevel; // Trigger the discount
      newCompletedCount = 0; // Reset counter

      // Determine next stage
      if (currentDiscountLevel === 5) {
        newDiscountLevel = 10;
      } else if (currentDiscountLevel === 10) {
        newDiscountLevel = 15;
      } else if (currentDiscountLevel === 15) {
        newDiscountLevel = 20;
      } else if (currentDiscountLevel === 20) {
        newDiscountLevel = 5;
      }

      // Send Instant In-App Notification to Admin
      const notifRef = ref(rtdb, 'adminNotifications');
      const newNotifRef = push(notifRef);
      await set(newNotifRef, {
        id: newNotifRef.key,
        message: `🎉 العميل (${customerName || customerPhone}) وصل لهدفه واستحق خصم ${earnedDiscount}% الآن!`,
        type: 'success',
        timestamp: Date.now()
      });
    }

    // Update RTDB
    const updatedData = {
      phone: cleanPhone,
      name: customerName || '',
      completedCount: newCompletedCount,
      currentDiscountLevel: newDiscountLevel,
      lastUpdated: Date.now()
    };
    await set(rtdbRef, updatedData);

    // 2. Sync with Firestore 'customers' collection
    const custQuery = query(collection(db, 'customers'), where('phone', '==', customerPhone));
    const custSnap = await getDocs(custQuery);
    
    if (!custSnap.empty) {
      const custDoc = custSnap.docs[0];
      await updateDoc(doc(db, 'customers', custDoc.id), {
        completedCount: newCompletedCount,
        currentDiscountLevel: newDiscountLevel
      });
    }

    return {
      completedCount: newCompletedCount,
      currentDiscountLevel: newDiscountLevel,
      earnedDiscount
    };
  } catch (error) {
    console.error('Error in incrementCompletedOrders:', error);
    return null;
  }
};
