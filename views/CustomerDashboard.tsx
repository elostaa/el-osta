
import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDocs, deleteDoc } from 'firebase/firestore';
import { db, rtdb } from '../firebase';
import { ref, push, set, onValue } from 'firebase/database';
import { User, Order } from '../types';

interface CustomerDashboardProps {
  user: User | null;
  onLogout: () => void;
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user, onLogout }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [favoriteTechs, setFavoriteTechs] = useState<User[]>([]);
  
  // Client details & persistence
  const [guestPhone, setGuestPhone] = useState(localStorage.getItem('alOstaCustomerPhone') || '');
  const initialName = user?.name || localStorage.getItem('alOstaCustomerName') || 'عميل زائر';
  const initialPhone = user?.phone || localStorage.getItem('alOstaCustomerPhone') || '';
  
  const defaultUser: User = {
    id: user?.id || 'guest',
    name: initialName,
    phone: initialPhone,
    role: 'customer',
    securityQuestion: '',
    securityAnswer: '',
    createdAt: Date.now(),
    favoriteTechIds: JSON.parse(localStorage.getItem('alOstaFavoriteTechIds') || '[]')
  };
  
  const [currentUserData, setCurrentUserData] = useState<User>(defaultUser);
  const [serviceType, setServiceType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [detailedLocation, setDetailedLocation] = useState('');
  const [timing, setTiming] = useState('اليوم');
  const [hourIndex, setHourIndex] = useState(2);
  const [isOrdering, setIsOrdering] = useState(false);
  const [activeTab, setActiveTab] = useState<'new-order' | 'history'>('new-order');
  const [selectedTechForOrder, setSelectedTechForOrder] = useState<User | null>(null);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [hasRevealedStep3, setHasRevealedStep3] = useState(false);
  
  const mainContentRef = useRef<HTMLElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const [paymentMethod, setPaymentMethod] = useState<'instapay_orange' | 'vodafone_cash' | null>(null);
  
  // OTP Verification States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingArgs, setPendingArgs] = useState<{ directTech: User | null; emergency: boolean } | null>(null);
  const [otpStep, setOtpStep] = useState<'info' | 'verify'>('info');
  const [clientName, setClientName] = useState(localStorage.getItem('alOstaCustomerName') || '');
  const [clientPhone, setClientPhone] = useState(localStorage.getItem('alOstaCustomerPhone') || '');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [actualOtp, setActualOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSentDocId, setOtpSentDocId] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [loyalty, setLoyalty] = useState<{ completedCount: number; currentDiscountLevel: number } | null>(null);
  
  // States and constants for Cloudinary Image Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Speech Recognition state and handler
  const [isListening, setIsListening] = useState(false);
  const [isListeningAddress, setIsListeningAddress] = useState(false);

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("إملاء الصوت غير مدعوم في هذا المتصفح.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        alert("لم يتم كشف أي صوت. يرجى التحدث بوضوح في الميكروفون 🎤");
      } else if (event.error === 'not-allowed') {
        alert("يرجى السماح بالوصول إلى الميكروفون لتتمكن من استخدام الإملاء الصوتي 🔒");
      } else {
        alert("حدث خطأ أثناء التعرف على الصوت. يرجى المحاولة مرة أخرى.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDescription((prev) => prev ? prev + " " + transcript : transcript);
    };

    recognition.start();
  };

  const startSpeechRecognitionAddress = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("إملاء الصوت غير مدعوم في هذا المتصفح.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListeningAddress(true);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListeningAddress(false);
      if (event.error === 'no-speech') {
        alert("لم يتم كشف أي صوت. يرجى التحدث بوضوح في الميكروفون 🎤");
      } else if (event.error === 'not-allowed') {
        alert("يرجى السماح بالوصول إلى الميكروفون لتتمكن من استخدام الإملاء الصوتي 🔒");
      } else {
        alert("حدث خطأ أثناء التعرف على الصوت. يرجى المحاولة مرة أخرى.");
      }
    };

    recognition.onend = () => {
      setIsListeningAddress(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDetailedLocation((prev) => prev ? prev + " " + transcript : transcript);
    };

    recognition.start();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const hourOptions = [
    { label: 'صباحاً', range: '8ص - 11ص' },
    { label: 'ظهراً', range: '12ظ - 2م' },
    { label: 'عصراً', range: '3م - 5م' },
    { label: 'مساءً', range: '6م - 9م' },
    { label: 'ليلاً', range: '10م - 12ل' }
  ];

  // OTP resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  // Smooth scroll to step 2 when serviceType is selected
  useEffect(() => {
    if (serviceType) {
      const timer = setTimeout(() => {
        step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [serviceType]);

  // Smooth scroll to step 3 when description is filled (non-empty for the first time)
  useEffect(() => {
    if (description.trim() !== '') {
      if (!hasRevealedStep3) {
        setHasRevealedStep3(true);
        const timer = setTimeout(() => {
          step3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
        return () => clearTimeout(timer);
      }
    } else {
      if (hasRevealedStep3) {
        setHasRevealedStep3(false);
      }
    }
  }, [description, hasRevealedStep3]);

  // Smooth scroll on activeTab change to 'new-order'
  useEffect(() => {
    if (activeTab === 'new-order') {
      const timer = setTimeout(() => {
        mainContentRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Realtime Database Loyalty listener
  useEffect(() => {
    const phoneVal = currentUserData.phone || user?.phone || guestPhone;
    if (!phoneVal) return;
    const cleanPhone = phoneVal.trim().replace(/[\s\+\-\(\)]/g, '');
    if (!cleanPhone) return;

    const rtdbRef = ref(rtdb, `loyalty/${cleanPhone}`);
    const unsub = onValue(rtdbRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setLoyalty({
          completedCount: typeof data.completedCount === 'number' ? data.completedCount : 0,
          currentDiscountLevel: typeof data.currentDiscountLevel === 'number' ? data.currentDiscountLevel : 5
        });
      } else {
        setLoyalty({
          completedCount: 0,
          currentDiscountLevel: 5
        });
      }
    }, (err) => {
      console.warn("Customer loyalty listener error:", err);
    });

    return () => unsub();
  }, [currentUserData.phone, user?.phone, guestPhone]);

  // Load guest orders and dynamically update VIP & suspension from customers collection
  useEffect(() => {
    // Load favorite techs initially
    const localFavsS = localStorage.getItem('alOstaFavoriteTechIds') || '[]';
    let localFavs: string[] = [];
    try {
      localFavs = JSON.parse(localFavsS);
    } catch (e) {}
    fetchFavoriteTechs(localFavs);

    let unsubCust = () => {};
    if (guestPhone) {
      const custQ = query(collection(db, 'customers'), where('phone', '==', guestPhone));
      unsubCust = onSnapshot(custQ, (snap) => {
        if (!snap.empty) {
          const docData = snap.docs[0].data();
          setCurrentUserData({
            id: snap.docs[0].id,
            name: docData.name,
            phone: docData.phone,
            role: 'customer',
            isVIP: !!docData.isVIP,
            isSuspended: !!docData.isSuspended,
            createdAt: docData.createdAt || Date.now(),
            securityQuestion: '',
            securityAnswer: ''
          });
        }
      }, (err) => {
        console.warn("Customer data listener error:", err);
      });
    }

    let unsubscribeOrders = () => {};
    if (guestPhone) {
      const q = query(collection(db, 'orders'), where('customerPhone', '==', guestPhone));
      unsubscribeOrders = onSnapshot(q, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(ordersData.sort((a, b) => b.createdAt - a.createdAt));
      }, (err) => {
        console.error('Error fetching orders:', err);
      });
    } else if (user?.id) {
      const q = query(collection(db, 'orders'), where('customerId', '==', user.id));
      unsubscribeOrders = onSnapshot(q, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(ordersData.sort((a, b) => b.createdAt - a.createdAt));
      }, (err) => {
        console.error('Error fetching orders:', err);
      });
    }

    return () => { unsubCust(); unsubscribeOrders(); };
  }, [guestPhone, user?.id]);

  const fetchFavoriteTechs = async (ids: string[]) => {
    if (ids.length === 0) {
      setFavoriteTechs([]);
      return;
    }
    const q = query(collection(db, 'users'), where('__name__', 'in', ids));
    const snap = await getDocs(q);
    setFavoriteTechs(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
  };

  const toggleFavorite = async (techId: string) => {
    const localFavsS = localStorage.getItem('alOstaFavoriteTechIds') || '[]';
    let localFavs: string[] = [];
    try {
      localFavs = JSON.parse(localFavsS);
    } catch (e) {}

    const isFav = localFavs.includes(techId);
    let newFavs: string[];
    if (isFav) {
      newFavs = localFavs.filter(id => id !== techId);
    } else {
      newFavs = [...localFavs, techId];
    }
    localStorage.setItem('alOstaFavoriteTechIds', JSON.stringify(newFavs));
    fetchFavoriteTechs(newFavs);

    setCurrentUserData(prev => ({
      ...prev,
      favoriteTechIds: newFavs
    }));
  };

  // Intercept order form submission, validate details & trigger OTP verification
  const handleCreateOrder = async (e: React.FormEvent, directTech: User | null = null, emergency: boolean = false) => {
    e.preventDefault();
    const finalServiceType = directTech ? directTech.specialty : serviceType;
    if (!finalServiceType) {
      alert('⚠️ يرجى اختيار نوع الخدمة أو الفني (سباك، كهربائي، إلخ) أولاً قبل تأكيد الحجز!');
      return;
    }
    if (!description.trim()) return alert('يرجى كتابة وصف المشكلة أولاً');
    if (!detailedLocation.trim()) return alert('يرجى كتابة العنوان بالتفصيل أولاً');

    setPendingArgs({ directTech, emergency });
    setOtpStep('info');
    setOtpError('');
    setEnteredOtp('');
    setShowOtpModal(true);
  };

  // Step B - Sending Random 6-digit OTP Code via WhatsApp
  const sendVerificationOtp = async (phoneNumber: string) => {
    const cleanedPhone = phoneNumber.trim();
    if (!clientName.trim()) {
      setOtpError('يرجى إدخال الاسم بالكامل');
      return;
    }
    const phoneDigits = cleanedPhone.replace(/\D/g, '');
    if (!/^01\d{9}$/.test(phoneDigits)) {
      setOtpError('يرجى إدخال رقم هاتف مصري صحيح (11 رقم يبدأ بـ 01)');
      return;
    }

    setIsSendingOtp(true);
    setOtpError('');
    try {
      // 1. Generate 6 random digits
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

      // 2. Save OTP into Firestore database "otpVerifications"
      const otpVerifyRef = await addDoc(collection(db, 'otpVerifications'), {
        phone: cleanedPhone,
        code: generatedCode,
        createdAt: Date.now(),
        status: 'unused'
      });
      setOtpSentDocId(otpVerifyRef.id);
      setActualOtp(generatedCode);

      // 3. Format Phone format for International request (Egypt "20")
      const formattedNumber = cleanedPhone.startsWith('0') ? '20' + cleanedPhone.slice(1) : cleanedPhone;

      // 4. Send API message
      const response = await fetch('https://unfailing-nuclei-length.ngrok-free.dev/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          secret: 'bd22f32c017afe0296e0ba31319bcd507ab6f9d4521c5553',
          number: formattedNumber,
          message: `كود تفعيل طلبك في الأسطى هو: ${generatedCode}`
        })
      });

      if (!response.ok) {
        throw new Error('API Send Failure');
      }

      setOtpStep('verify');
      setResendTimer(60);
    } catch (err) {
      console.error('OTP delivery error:', err);
      setOtpError('تعذر إرسال كود التحقق، حاول مرة أخرى');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step C - Verify input OTP
  const verifyOtp = async () => {
    if (!enteredOtp.trim()) {
      setOtpError('يرجى إدخال كود التحقق أولاً');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');
    try {
      const q = query(
        collection(db, 'otpVerifications'),
        where('phone', '==', clientPhone.trim()),
        where('code', '==', enteredOtp.trim()),
        where('status', '==', 'unused')
      );
      
      const snap = await getDocs(q);
      if (snap.empty) {
        setOtpError('الكود غير صحيح');
        setIsVerifyingOtp(false);
        return;
      }

      const otpDoc = snap.docs[0];
      const otpData = otpDoc.data();
      const expiryPeriod = 5 * 60 * 1000; // 5 minutes

      if (Date.now() - otpData.createdAt > expiryPeriod) {
        setOtpError('انتهت صلاحية الكود (صالح لمدة 5 دقائق فقط)');
        try {
          await deleteDoc(doc(db, 'otpVerifications', otpDoc.id));
        } catch (e) {}
        setIsVerifyingOtp(false);
        return;
      }

      // Cleanup OTP
      try {
        await deleteDoc(doc(db, 'otpVerifications', otpDoc.id));
      } catch (e) {}

      // Verification succeeds! Cache user info
      const finalNameVal = clientName.trim();
      const finalPhoneVal = clientPhone.trim();
      localStorage.setItem('alOstaCustomerName', finalNameVal);
      localStorage.setItem('alOstaCustomerPhone', finalPhoneVal);

      // Save/Update Customer in 'customers' collection
      const custQuery = query(collection(db, 'customers'), where('phone', '==', finalPhoneVal));
      const custSnap = await getDocs(custQuery);
      let customerRecordId = '';

      if (!custSnap.empty) {
        const existingCustDoc = custSnap.docs[0];
        customerRecordId = existingCustDoc.id;
        const previousOrderCount = existingCustDoc.data().orderCount || 0;
        await updateDoc(doc(db, 'customers', customerRecordId), {
          name: finalNameVal,
          orderCount: previousOrderCount + 1,
          lastOrderAt: Date.now()
        });
      } else {
        const newCustDocRef = await addDoc(collection(db, 'customers'), {
          name: finalNameVal,
          phone: finalPhoneVal,
          orderCount: 1,
          createdAt: Date.now(),
          lastOrderAt: Date.now()
        });
        customerRecordId = newCustDocRef.id;
      }

      // Finalize saving order in firestore & RTDB
      await executeCreateOrder(finalNameVal, finalPhoneVal, customerRecordId, pendingArgs?.directTech || null, pendingArgs?.emergency || false);

      setShowOtpModal(false);
      setOtpStep('info');
      setEnteredOtp('');
      setPendingArgs(null);
    } catch (err) {
      console.error('Error during verification:', err);
      setOtpError('حدث خطأ أثناء التحقق، يرجى المحاولة مرة أخرى');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Execution function that actually creates orders
  const executeCreateOrder = async (
    name: string,
    phone: string,
    verifiedCustId: string,
    directTech: User | null = null,
    emergency: boolean = false
  ) => {
    const finalServiceType = directTech ? directTech.specialty : serviceType;
    setIsOrdering(true);
    let secure_url = "";

    try {
      if (selectedFile) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("upload_preset", "OSTAAa");
        try {
          const res = await fetch("https://api.cloudinary.com/v1_1/dxf8uss82/image/upload", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data && data.secure_url) {
            secure_url = data.secure_url;
          } else {
            throw new Error("Failed to upload image to Cloudinary");
          }
        } catch (cloudinaryErr) {
          console.error(cloudinaryErr);
          alert("فشل رفع الصورة إلى Cloudinary");
          setIsUploadingImage(false);
          setIsOrdering(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      const generatedOrderNumber = Math.floor(10000 + Math.random() * 90000);

      const orderPayload: any = {
        customerId: verifiedCustId,
        customerName: name,
        customerPhone: phone,
        address: detailedLocation,
        detailedLocation,
        serviceType: finalServiceType,
        description,
        preferredTiming: emergency ? 'فوري (طوارئ)' : timing,
        specificTime: emergency ? 'الآن (حالة طارئة)' : `${hourOptions[hourIndex].label} (${hourOptions[hourIndex].range})`,
        status: directTech ? 'assigned' : 'pending',
        isDirect: !!directTech,
        isEmergency: emergency,
        paymentConfirmed: true, // Auto-confirm payment as per instructions
        paymentStatus: 'confirmed',
        createdAt: Date.now(),
        adminResolved: true,
        imageUrl: secure_url,
        orderNumber: generatedOrderNumber
      };

      if (directTech) {
        orderPayload.technicianId = directTech.id;
        orderPayload.technicianName = directTech.name;
        orderPayload.technicianSpecialty = directTech.specialty;
        orderPayload.technicianPhone = directTech.phone;
      }

      const docRef = await addDoc(collection(db, 'orders'), orderPayload);
      const docId = docRef.id;

      // Save order request details to Firebase Realtime Database
      try {
        const rtdbOrderRef = ref(rtdb, `orders/${docId}`);
        const rtdbOrderPayload = {
          id: docId,
          customerId: verifiedCustId,
          customerName: name,
          customerPhone: phone,
          address: detailedLocation,
          detailedLocation,
          serviceType: finalServiceType,
          problemDescription: description,
          description: description,
          preferredTiming: emergency ? 'فوري (طوارئ)' : timing,
          specificTime: emergency ? 'الآن (حالة طارئة)' : `${hourOptions[hourIndex].label} (${hourOptions[hourIndex].range})`,
          status: directTech ? 'assigned' : 'Pending',
          isDirect: !!directTech,
          isEmergency: emergency,
          createdAt: Date.now(),
          imageUrl: secure_url,
          paymentConfirmed: true,
          technicianId: directTech ? directTech.id : null,
          technicianName: directTech ? directTech.name : null,
          technicianPhone: directTech ? directTech.phone : null,
          technicianSpecialty: directTech ? directTech.specialty : null,
          orderNumber: generatedOrderNumber
        };
        await set(rtdbOrderRef, rtdbOrderPayload);
      } catch (rtdbErr) {
        console.error('Realtime Database write failed:', rtdbErr);
      }

      setServiceType('');
      setDescription('');
      setDetailedLocation('');
      setSelectedTechForOrder(null);
      setIsEmergencyMode(false);
      setSelectedFile(null);

      // Refresh guest customer phone number to load orders log
      setGuestPhone(phone);
      setActiveTab('history');
      alert('تم إرسال طلبك بنجاح! سيتم التواصل معك الآن 👷‍♂️');
    } catch (err) {
      alert('فشل إرسال الطلب');
    } finally {
      setIsOrdering(false);
    }
  };

  const submitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingOrder || !ratingOrder.technicianId) return;
    try {
      await updateDoc(doc(db, 'orders', ratingOrder.id), {
        rating: ratingValue,
        feedback: ratingFeedback
      });

      // Update Technician Average Rating
      const techRef = doc(db, 'users', ratingOrder.technicianId);
      const techSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', ratingOrder.technicianId)));
      if (!techSnap.empty) {
        const techData = techSnap.docs[0].data() as User;
        const currentCount = techData.ratingCount || 0;
        const currentAvg = techData.averageRating || 0;
        const newCount = currentCount + 1;
        const newAvg = ((currentAvg * currentCount) + ratingValue) / newCount;

        await updateDoc(techRef, {
          averageRating: Number(newAvg.toFixed(1)),
          ratingCount: newCount
        });
      }

      alert('شكراً لتقييمك! ❤️');
      setRatingOrder(null);
      setRatingValue(5);
      setRatingFeedback('');
    } catch (err) { alert('فشل إرسال التقييم'); }
  };

  const serviceOptions = [
    { name: 'سباك', icon: '🚰' },
    { name: 'كهربائي', icon: '⚡' },
    { name: 'نجار', icon: '🪚' },
    { name: 'فني دش', icon: '📡' },
    { name: 'نقاش', icon: '🎨' },
    { name: 'فني تكييف', icon: '❄️' },
    { name: 'صيانة اجهزة منزلية', icon: '🔌' },
    { name: 'فني الوميتال', icon: '🪟' }
  ];

  if (currentUserData.isSuspended) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/20 rounded-full blur-[100px] -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -ml-48 -mb-48"></div>
        <div className="bg-white/10 backdrop-blur-2xl border border-white/10 max-w-xl w-full p-8 md:p-16 rounded-3xl md:rounded-[4rem] shadow-2xl animate-fadeIn relative z-10">
          <div className="w-20 h-20 md:w-28 md:h-28 bg-red-500 text-white rounded-2xl md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 md:mb-10 shadow-2xl animate-pulse">
            <span className="text-4xl md:text-6xl">🛑</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white mb-4 md:mb-6 tracking-tight leading-tight">يتم مراجعة <br /> حسابك حالياً</h1>
          <p className="text-white/60 font-bold leading-relaxed mb-8 md:mb-12 text-base md:text-lg">
            عذراً <span className="text-red-400">{currentUserData.name}</span>، تم إيقاف حسابك مؤقتاً للمراجعة من قبل الإدارة. 
            يرجى التواصل مع الدعم الفني لمزيد من التفاصيل.
          </p>
          <button onClick={onLogout} className="w-full py-4 md:py-5 rounded-2xl md:rounded-[2rem] bg-white/10 text-white font-black hover:bg-white hover:text-slate-900 transition-all border border-white/20">
            {user ? 'تسجيل خروج آمن' : 'العودة للرئيسية 🏠'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans relative">
      
      {/* Modal - Emergency Order */}
      {isEmergencyMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-red-900/40 backdrop-blur-xl animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-y-auto max-h-[90vh] border border-red-100 custom-scroll">
            <div className="bg-red-600 p-8 text-white text-center relative">
               <button onClick={() => setIsEmergencyMode(false)} className="absolute left-8 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/10 rounded-full flex items-center justify-center hover:bg-black/20 transition">✕</button>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">طلب طوارئ فوري</p>
               <h3 className="text-3xl font-black mt-1">حالة طارئة 🚨</h3>
            </div>
            <form onSubmit={(e) => handleCreateOrder(e, null, true)} className="p-10 space-y-6">
               <div>
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase">نوع الخدمة المطلوبة</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {serviceOptions.map(opt => (
                      <button 
                        key={opt.name} 
                        type="button" 
                        onClick={() => setServiceType(opt.name)}
                        className={`p-3 rounded-2xl border-2 font-black text-[10px] transition-all ${serviceType === opt.name ? 'bg-red-50 border-red-500 text-red-600' : 'bg-slate-50 border-transparent text-slate-400'}`}
                      >
                        {opt.icon} {opt.name}
                      </button>
                    ))}
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase">وصف الحالة</label>
                  <textarea required value={description} onChange={e => setDescription(e.target.value)} placeholder="مثلاً: ماس كهربائي، انفجار ماسورة..." className="w-full bg-slate-50 p-5 rounded-3xl border-2 border-transparent focus:border-red-500 focus:bg-white outline-none font-bold text-sm min-h-[100px] transition-all" />
               </div>
               <div>
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase">العنوان</label>
                  <input required value={detailedLocation} onChange={e => setDetailedLocation(e.target.value)} placeholder="الحي، الشارع، الشقة..." className="w-full bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus:border-red-500 focus:bg-white outline-none font-bold text-sm transition-all" />
               </div>
               <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsEmergencyMode(false)} className="flex-1 bg-slate-100 text-slate-400 font-black py-5 rounded-[2rem] hover:bg-slate-200 transition">إلغاء</button>
                  <button type="submit" disabled={isOrdering} className="flex-[2] bg-red-600 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-red-600/30 hover:bg-red-700 transition transform active:scale-95">
                    {isOrdering ? 'جاري الإرسال...' : 'إرسال نداء استغاثة 🚨'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Direct Order */}
      {selectedTechForOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-xl animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-y-auto max-h-[90vh] border border-white/50 custom-scroll">
            <div className="bg-amber-500 p-8 text-slate-900 text-center relative">
               <button onClick={() => setSelectedTechForOrder(null)} className="absolute left-8 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/10 rounded-full flex items-center justify-center hover:bg-black/20 transition">✕</button>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">طلب أسطى بالاسم</p>
               <h3 className="text-3xl font-black mt-1">{selectedTechForOrder.name}</h3>
               {selectedTechForOrder.averageRating && (
                 <div className="flex items-center justify-center gap-1 mt-2">
                   <span className="text-sm font-black">⭐ {selectedTechForOrder.averageRating}</span>
                   <span className="text-[10px] opacity-60">({selectedTechForOrder.ratingCount} تقييم)</span>
                 </div>
               )}
            </div>
            <form onSubmit={(e) => handleCreateOrder(e, selectedTechForOrder)} className="p-10 space-y-8">
               <div className="grid grid-cols-2 gap-6">
                 <div>
                    <label className="block text-xs font-black text-slate-400 mb-2 uppercase">التخصص</label>
                    <div className="bg-slate-50 p-4 rounded-2xl font-black text-slate-800 border border-slate-100">{selectedTechForOrder.specialty}</div>
                 </div>
                 <div>
                    <label className="block text-xs font-black text-slate-400 mb-2 uppercase">الخبرة</label>
                    <div className="bg-slate-50 p-4 rounded-2xl font-black text-amber-600 border border-slate-100">{selectedTechForOrder.experience} سنة</div>
                 </div>
               </div>
               <div>
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase">وصف المشكلة</label>
                  <textarea required value={description} onChange={e => setDescription(e.target.value)} placeholder="مثلاً: تغيير طقم الحمام أو إصلاح عطل..." className="w-full bg-slate-50 p-5 rounded-3xl border-2 border-transparent focus:border-amber-500 focus:bg-white outline-none font-bold text-sm min-h-[120px] transition-all" />
               </div>
               <div>
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase">العنوان</label>
                  <input required value={detailedLocation} onChange={e => setDetailedLocation(e.target.value)} placeholder="الحي، الشارع، الشقة..." className="w-full bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus:border-amber-500 focus:bg-white outline-none font-bold text-sm transition-all" />
               </div>

               <div className="space-y-4 pt-4">
                  <div className="flex gap-4">
                    <button type="button" onClick={() => { setSelectedTechForOrder(null); setPaymentMethod(null); }} className="flex-1 bg-slate-100 text-slate-400 font-black py-5 rounded-[2rem] hover:bg-slate-200 transition">تراجع</button>
                    <button type="submit" disabled={isOrdering} className="flex-[2] bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-slate-900/30 hover:bg-slate-800 transition transform active:scale-95">
                      {isOrdering ? 'جاري الإرسال...' : 'تأكيد الحجز 👷‍♂️'}
                    </button>
                  </div>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Rating */}
      {ratingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-xl animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border border-white/50">
            <div className="bg-amber-500 p-8 text-slate-900 text-center relative">
               <button onClick={() => setRatingOrder(null)} className="absolute left-8 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/10 rounded-full flex items-center justify-center hover:bg-black/20 transition">✕</button>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">تقييم الخدمة</p>
               <h3 className="text-2xl font-black mt-1">كيف كانت تجربتك مع {ratingOrder.technicianName}؟</h3>
            </div>
            <form onSubmit={submitRating} className="p-8 space-y-6">
               <div className="flex justify-center gap-2">
                 {[1, 2, 3, 4, 5].map(star => (
                   <button 
                    key={star} 
                    type="button" 
                    onClick={() => setRatingValue(star)}
                    className={`text-4xl transition-all transform hover:scale-110 ${ratingValue >= star ? 'grayscale-0' : 'grayscale opacity-30'}`}
                   >
                     ⭐
                   </button>
                 ))}
               </div>
               <div>
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase">رأيك يهمنا</label>
                  <textarea 
                    value={ratingFeedback} 
                    onChange={e => setRatingFeedback(e.target.value)} 
                    placeholder="اكتب تعليقك هنا..." 
                    className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-transparent focus:border-amber-500 focus:bg-white outline-none font-bold text-sm min-h-[100px] transition-all" 
                  />
               </div>
               <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-slate-800 transition transform active:scale-95">
                 إرسال التقييم ⭐
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Modern Sidebar */}
      <aside className="w-full md:w-80 bg-white border-l border-slate-100 flex flex-col shadow-sm z-40">
        <div className="p-3 md:p-10 text-center border-b border-slate-50">
           <div className="relative inline-block">
             <div className="w-12 h-12 md:w-24 md:h-24 bg-gradient-to-tr from-slate-900 to-slate-700 rounded-xl md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-2 md:mb-4 text-xl md:text-4xl shadow-2xl transform -rotate-6">👤</div>
             {currentUserData.isVIP && (
               <div className="absolute -bottom-1 -right-1 w-5 h-5 md:w-8 md:h-8 bg-amber-500 rounded-full border md:border-4 border-white flex items-center justify-center text-[7px] md:text-[10px] font-black shadow-lg animate-bounce">VIP</div>
             )}
           </div>
           <h2 className="text-base md:text-2xl font-black text-slate-900 tracking-tight">{currentUserData.name}</h2>
           <p className="text-slate-400 font-bold text-[8px] md:text-xs uppercase tracking-widest mt-0.5">
             {currentUserData.isVIP ? 'العميل المتميز 🌟' : 'عميل الأسطى'}
           </p>
        </div>

        <nav className="p-3 md:p-8 space-y-2 md:space-y-4">
           <div className="grid grid-cols-2 gap-2 md:space-y-4 md:grid-cols-1">
              <button onClick={() => setActiveTab('new-order')} className={`w-full text-right p-2.5 md:p-5 rounded-xl md:rounded-[2rem] font-black transition-all flex items-center justify-between group ${activeTab === 'new-order' ? 'bg-amber-500 text-slate-900 shadow-xl shadow-amber-500/20' : 'text-slate-400 hover:bg-slate-50 bg-white border border-slate-100'}`}>
                 <span className="text-xs md:text-base">🆕 حجز جديد</span>
                 <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${activeTab === 'new-order' ? 'bg-slate-900' : 'bg-transparent'}`}></span>
              </button>
              <button onClick={() => setIsEmergencyMode(true)} className="w-full text-right p-2.5 md:p-5 rounded-xl md:rounded-[2rem] font-black transition-all flex items-center justify-between bg-red-50 text-red-600 hover:bg-red-100 shadow-sm border border-red-100">
                 <span className="text-xs md:text-base">🚨 طوارئ</span>
                 <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 animate-ping"></span>
              </button>
           </div>
           <button onClick={() => setActiveTab('history')} className={`w-full text-right p-2.5 md:p-5 rounded-xl md:rounded-[2rem] font-black transition-all flex items-center justify-between group ${activeTab === 'history' ? 'bg-amber-500 text-slate-900 shadow-xl shadow-amber-500/20' : 'text-slate-400 hover:bg-slate-50 bg-white border border-slate-100'}`}>
              <span className="text-xs md:text-base">📜 سجل الطلبات</span>
              <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${activeTab === 'history' ? 'bg-slate-900' : 'bg-transparent'}`}></span>
           </button>
        </nav>

        <div className="flex-1 px-8 overflow-y-auto custom-scroll">
           <div className="flex items-center justify-between mb-6">
             <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">⭐ الصنايعية المفضلة</h3>
             <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-black">{favoriteTechs.length}</span>
           </div>
           <div className="space-y-4 pb-12">
              {favoriteTechs.map(tech => (
                <div key={tech.id} className="p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
                   <div className="flex justify-between items-start">
                      <div onClick={() => setSelectedTechForOrder(tech)} className="cursor-pointer">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black text-slate-900 group-hover:text-amber-600 transition-colors">{tech.name}</p>
                          {tech.averageRating && (
                            <span className="text-[10px] font-black text-amber-500">⭐ {tech.averageRating}</span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400">{tech.specialty}</p>
                      </div>
                      <button onClick={() => toggleFavorite(tech.id)} className="text-red-300 hover:text-red-500 transition scale-125">✕</button>
                   </div>
                   <button 
                    onClick={() => setSelectedTechForOrder(tech)}
                    className="w-full bg-slate-900 text-white py-2 rounded-xl text-[10px] font-black mt-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                   >
                     اطلب الآن 👷‍♂️
                   </button>
                </div>
              ))}
              {favoriteTechs.length === 0 && (
                <div className="py-6 text-center border-2 border-dashed border-slate-100 rounded-xl md:rounded-[2rem]">
                   <p className="text-[10px] text-slate-300 font-black italic">القائمة فارغة</p>
                </div>
              )}
           </div>
        </div>

        <div className="p-4 md:p-8 border-t border-slate-50 space-y-2">
          <button 
            onClick={() => window.open('https://wa.me/201550134227', '_blank')}
            className="w-full bg-amber-50 text-amber-600 font-black py-2.5 md:py-4 rounded-[1.2rem] md:rounded-[1.5rem] hover:bg-amber-100 transition-all duration-300 flex items-center justify-center gap-2 text-xs md:text-base"
          >
            <span>🎧</span> خدمة العملاء
          </button>
          <button onClick={onLogout} className="w-full bg-slate-50 text-slate-400 font-black py-2.5 md:py-4 rounded-[1.2rem] md:rounded-[1.5rem] hover:bg-red-50 hover:text-red-500 transition-all duration-300 text-xs md:text-base">
            {user ? 'تسجيل خروج' : 'العودة للرئيسية 🏠'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main ref={mainContentRef} className="flex-1 p-4 md:p-12 overflow-y-auto">
        {activeTab === 'new-order' ? (
          <div className="max-w-4xl mx-auto animate-fadeIn">
            <header className="mb-8 md:mb-12">
               <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">خلصانة في ثانية.. <br /> محتاج فني إيه؟</h1>
               <p className="text-slate-400 font-bold text-base md:text-lg">اختر الخدمة وسنتولى الباقي عنك بكل احترافية.</p>
            </header>

            <form onSubmit={(e) => handleCreateOrder(e)} className="space-y-8 md:space-y-12">
              {/* Service Selection Bento (الخطوة الأولى) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                 {serviceOptions.map(opt => (
                   <button 
                    key={opt.name} 
                    type="button" 
                    onClick={() => setServiceType(opt.name)} 
                    className={`flex flex-col items-center justify-center p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] transition-all duration-500 border-2 md:border-4 ${serviceType === opt.name ? 'bg-amber-500 border-amber-600 shadow-2xl shadow-amber-500/30 -translate-y-1 md:-translate-y-2' : 'bg-white border-transparent hover:bg-slate-100'}`}
                   >
                     <span className="text-2xl md:text-4xl mb-2 md:mb-3">{opt.icon}</span>
                     <span className={`text-xs md:text-sm font-black ${serviceType === opt.name ? 'text-slate-900' : 'text-slate-500'}`}>{opt.name}</span>
                   </button>
                 ))}
              </div>

              {/* الخطوة الثانية: تفاصيل العطل والمايك (تظهر فقط عند تحديد الخدمة) */}
              {serviceType && (
                <div ref={step2Ref} className="animate-fadeIn space-y-6 md:space-y-8">
                  <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3rem] shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                      <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <span className="bg-amber-500 text-slate-900 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">٢</span>
                        تفاصيل العطل والطلب
                      </h3>
                      <button 
                        type="button" 
                        onClick={startSpeechRecognition} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        className={isListening ? 'text-red-500 animate-pulse' : 'text-amber-500'}
                      >
                        {isListening ? '🎤 جاري الاستماع...' : '🎤 إملاء صوتي'}
                      </button>
                    </div>
                    <textarea 
                      required={!!serviceType} 
                      value={description} 
                      onChange={e => setDescription(e.target.value)} 
                      placeholder="اشرح المشكلة هنا بالتفصيل لنتمكن من مساعدتك..." 
                      className="w-full bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-3xl border-none focus:ring-4 focus:ring-amber-500/10 outline-none font-bold text-slate-700 min-h-[150px] md:min-h-[200px] transition-all" 
                    />
                    
                    {/* Cloudinary Image Upload */}
                    <div className="mt-8 border-t border-slate-100 pt-6">
                      <label className="block text-xs font-black text-slate-400 mb-3 uppercase tracking-wider">صورة العطل المعاينة (اختياري)</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="w-full text-slate-500 font-bold text-sm bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 transition-all"
                      />
                      {isUploadingImage && (
                        <p className="mt-3 text-amber-500 font-black text-xs animate-pulse flex items-center gap-2">
                          <span>⏳</span> جاري رفع الصورة...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* الخطوة الثالثة: المكان والموعد وتأكيد الحجز (تظهر عند تحديد الخدمة وملء حقل التفاصيل) */}
              {serviceType && description.trim() !== '' && (
                <div ref={step3Ref} className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fadeIn">
                   <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3rem] shadow-sm border border-slate-100">
                      <div className="flex items-center justify-between mb-4 md:mb-6">
                        <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <span className="bg-amber-500 text-slate-900 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">٣</span>
                          المكان والموعد
                        </h3>
                        <button 
                          type="button" 
                          onClick={startSpeechRecognitionAddress} 
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          className={isListeningAddress ? 'text-red-500 animate-pulse' : 'text-amber-500'}
                        >
                          {isListeningAddress ? '🎤 جاري الاستماع...' : '🎤 إملاء صوتي'}
                        </button>
                      </div>
                      <input 
                        type="text" 
                        required={serviceType && description.trim() !== ''} 
                        value={detailedLocation} 
                        onChange={e => setDetailedLocation(e.target.value)} 
                        placeholder="العنوان بالتفصيل..." 
                        className="w-full bg-slate-50 p-4 md:p-5 rounded-xl md:rounded-2xl border-none focus:ring-4 focus:ring-amber-500/10 outline-none font-bold text-slate-700 mb-6 md:mb-8 transition-all" 
                      />
                      
                      <div className="bg-slate-900 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] text-white">
                         <div className="flex justify-between items-center mb-4 md:mb-6">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">توقيت العمل</span>
                            <span className="text-amber-500 font-black text-xs md:text-sm">{timing}</span>
                         </div>
                         <div className="grid grid-cols-5 gap-1 md:gap-2 mb-4 md:mb-6">
                           {hourOptions.map((h, idx) => (
                             <button 
                               key={idx} 
                               type="button" 
                               onClick={() => setHourIndex(idx)} 
                               className={`h-10 md:h-12 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black transition-all border-2 ${hourIndex === idx ? 'bg-amber-500 border-amber-500 text-slate-900' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
                             >
                               {h.label}
                             </button>
                           ))}
                         </div>
                         <div className="text-center pt-4 border-t border-slate-800">
                            <p className="text-[10px] md:text-xs font-bold text-slate-400">سيصلك الفني في حدود</p>
                            <p className="text-lg md:text-xl font-black text-amber-500 mt-1">{hourOptions[hourIndex].range}</p>
                         </div>
                      </div>
                   </div>
                   
                   <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-center">
                      <button 
                        type="submit" 
                        disabled={isOrdering} 
                        className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-black py-5 md:py-7 rounded-2xl md:rounded-[3rem] shadow-2xl shadow-amber-500/30 transition-all transform hover:scale-[1.03] active:scale-95 text-xl md:text-2xl cursor-pointer"
                      >
                        {isOrdering ? 'جاري الحجز...' : 'تأكيد الحجز 👷‍♂️'}
                      </button>
                   </div>
                </div>
              )}
            </form>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto animate-fadeIn">
             <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-4">
               <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter">تاريخ عملياتك</h2>
               <div className="text-[10px] md:text-xs font-black text-slate-400 uppercase bg-white px-4 py-2 md:px-6 md:py-3 rounded-full border border-slate-100 shadow-sm w-fit">إجمالي الطلبات: {orders.length}</div>
             </div>

             {/* نظام الولاء والمكافآت الذكي (Loyalty Program) */}
             {loyalty && (
               <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-xl text-white mb-10 border border-slate-700 relative overflow-hidden text-right" style={{ direction: 'rtl' }}>
                 <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
                 <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div className="space-y-2 flex-1">
                     <div className="flex flex-wrap items-center gap-3">
                       <span className="bg-amber-500 text-slate-950 text-[10px] md:text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                         برنامج الولاء والخصومات 🎁
                       </span>
                       <span className="text-xs text-amber-400 font-bold">
                         المستوى الحالي للخصم: {loyalty.currentDiscountLevel}%
                       </span>
                     </div>
                     <h3 className="text-xl md:text-2xl font-black text-white">
                       {8 - loyalty.completedCount === 1 ? (
                         <>فاضلك <span className="text-amber-400 font-black">طلب واحد بس</span> وتاخد خصم {loyalty.currentDiscountLevel}%! 🎁</>
                       ) : (
                         <>فاضلك <span className="text-amber-400 font-black">{8 - loyalty.completedCount} طلبات</span> وتاخد خصم {loyalty.currentDiscountLevel}%! 🎁</>
                       )}
                     </h3>
                     <p className="text-slate-400 text-xs font-bold leading-relaxed">
                       كلما أكملت 8 طلبات بنجاح، تحصل على خصم مميز على طلبك الأخير، ثم ترتفع نسبة خصمك القادم!
                     </p>
                   </div>

                   <div className="w-full md:max-w-xs space-y-3">
                     <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                       <span>التقدم: {loyalty.completedCount} / 8 طلبات مكتملة</span>
                       <span className="text-amber-400 font-black">{Math.round((loyalty.completedCount / 8) * 100)}%</span>
                     </div>
                     {/* Progress Bar Container */}
                     <div className="w-full bg-slate-800 h-4 rounded-full p-0.5 border border-slate-700/80 overflow-hidden flex">
                       <div 
                         style={{ width: `${(loyalty.completedCount / 8) * 100}%` }}
                         className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-500 shadow-md shadow-amber-500/30"
                       />
                     </div>
                     {/* 8 Dot indicators */}
                     <div className="flex justify-between px-1">
                       {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
                         <span 
                           key={step} 
                           className={`w-2.5 h-2.5 rounded-full border transition-all ${
                             step <= loyalty.completedCount 
                               ? 'bg-amber-400 border-amber-300 scale-110 shadow-sm shadow-amber-400/50' 
                               : 'bg-slate-800 border-slate-700'
                           }`}
                           title={`طلب ${step}`}
                         />
                       ))}
                     </div>
                   </div>
                 </div>
               </div>
             )}
             
             <div className="grid grid-cols-1 gap-6 md:gap-8">
                {orders.map(o => (
                  <div key={o.id} className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-10 hover:shadow-xl transition-all group">
                     <div className="flex-1 space-y-3 md:space-y-4">
                        <div className="flex items-center gap-3 md:gap-4">
                           <span className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest ${
                             o.status === 'completed' ? 'bg-emerald-500 text-white' : 
                             o.status === 'assigned' ? 'bg-blue-500 text-white' : 
                             'bg-amber-500 text-slate-900'
                           }`}>
                             {o.status === 'completed' ? 'مكتمل' : o.status === 'assigned' ? 'قيد التنفيذ' : 'في الانتظار'}
                           </span>
                           {o.orderNumber && <span className="text-[8px] md:text-[10px] font-black text-slate-700 bg-slate-100 px-2 md:px-3 py-1 md:py-1.5 rounded-full">طلب رقم: #{o.orderNumber}</span>}
                           {o.isDirect && <span className="text-[8px] md:text-[10px] font-black text-amber-600 bg-amber-50 px-2 md:px-3 py-1 md:py-1.5 rounded-full">طلب مباشر ⭐</span>}
                        </div>
                        <h3 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">{o.serviceType}</h3>
                        <p className="text-slate-400 font-bold leading-relaxed max-w-lg line-clamp-2 text-sm md:text-base">{o.description}</p>
                        <div className="flex flex-wrap items-center gap-3 md:gap-6 pt-1 md:pt-2">
                           <div className="flex items-center gap-2 text-[9px] md:text-[11px] font-black text-slate-500 bg-slate-50 px-3 md:px-4 py-1.5 md:py-2 rounded-full">
                              <span>📅</span>
                              <span>{new Date(o.createdAt).toLocaleDateString('ar-EG')}</span>
                           </div>
                           <div className="flex items-center gap-2 text-[9px] md:text-[11px] font-black text-slate-500 bg-slate-50 px-3 md:px-4 py-1.5 md:py-2 rounded-full">
                              <span>📍</span>
                              <span className="line-clamp-1">{o.detailedLocation}</span>
                           </div>
                           {o.customerPhone && (
                              <div className="flex items-center gap-2 text-[9px] md:text-[11px] font-black text-slate-500 bg-slate-50 px-3 md:px-4 py-1.5 md:py-2 rounded-full">
                                 <span>📞</span>
                                 <span>{o.customerPhone}</span>
                              </div>
                           )}
                        </div>
                     </div>
                     
                     {o.technicianId ? (
                       <div className="bg-slate-900 p-6 md:p-8 rounded-2xl md:rounded-[3rem] text-white w-full md:min-w-[280px] text-center space-y-3 md:space-y-4 shadow-2xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-16 md:w-20 h-16 md:h-20 bg-amber-500/10 rounded-full -mr-8 md:-mr-10 -mt-8 md:-mt-10"></div>
                          <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">الفني المعين</p>
                          <p className="text-xl md:text-2xl font-black text-amber-500">{o.technicianName}</p>
                          <div className="text-[10px] md:text-xs font-bold text-slate-400 border-t border-slate-800 pt-3 md:pt-4">
                             <p>📞 {o.technicianPhone}</p>
                          </div>
                          <button 
                            onClick={() => toggleFavorite(o.technicianId!)}
                            className={`w-full py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black transition-all ${
                              currentUserData.favoriteTechIds?.includes(o.technicianId!) 
                              ? 'bg-amber-500 text-slate-900' 
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {currentUserData.favoriteTechIds?.includes(o.technicianId!) ? '❤️ في المفضلين' : '⭐ إضافة للمفضلين'}
                          </button>
                          {(o.status === 'completed' || (o.status === 'failed' && o.adminResolved)) && !o.rating && (
                             <button 
                               onClick={() => setRatingOrder(o)}
                               className="w-full py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black bg-amber-500 text-slate-900 hover:bg-amber-600 transition-all shadow-lg mt-2"
                             >
                               ⭐ قيم الأسطى
                             </button>
                           )}
                           {o.rating && (
                             <div className="bg-slate-800 p-3 rounded-xl text-center mt-2">
                               <p className="text-[10px] font-black text-amber-500">تقييمك: {o.rating} ⭐</p>
                               {o.feedback && <p className="text-[8px] text-slate-400 mt-1 italic">"{o.feedback}"</p>}
                             </div>
                           )}
                       </div>
                     ) : (
                       <div className="bg-slate-50 p-6 md:p-10 rounded-2xl md:rounded-[3rem] border-2 border-dashed border-slate-200 text-center w-full md:min-w-[280px]">
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 animate-pulse">⏳</div>
                          <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">بانتظار قبول أسطى</p>
                       </div>
                     )}
                  </div>
                ))}
                {orders.length === 0 && (
                  <div className="text-center py-16 md:py-32 bg-white rounded-3xl md:rounded-[4rem] border border-slate-100 shadow-sm">
                     <p className="text-slate-300 font-black italic text-xl md:text-2xl">لم تقم بأي حجز بعد</p>
                     <button onClick={() => setActiveTab('new-order')} className="mt-6 md:mt-8 text-amber-600 font-black border-b-2 border-amber-600 pb-1 text-sm md:text-base">احجز أول أسطى الآن</button>
                  </div>
                )}
             </div>
          </div>
        )}
      </main>

      {/* Step Customer Info & WhatsApp Verification OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fadeIn" style={{ direction: 'rtl' }}>
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="bg-amber-500 bg-gradient-to-r from-amber-500 to-amber-600 p-8 text-white text-center relative">
              <button 
                type="button"
                onClick={() => { setShowOtpModal(false); setPendingArgs(null); }} 
                className="absolute left-8 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/10 rounded-full flex items-center justify-center hover:bg-black/20 transition text-white font-bold"
              >
                ✕
              </button>
              <h3 className="text-2xl font-black text-white">تأكيد طلب حجز أسطى</h3>
              <p className="text-xs font-bold opacity-90 mt-1 text-white">
                {otpStep === 'info' ? 'خطوة 1: إدخال بيانات التواصل' : 'خطوة 2: التحقق عبر كود الواتساب'}
              </p>
            </div>

            <div className="p-8 md:p-10 space-y-6">
              {otpError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-black text-center animate-shake">
                  ❌ {otpError}
                </div>
              )}

              {otpStep === 'info' ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide text-right">الاسم بالكامل</label>
                    <input 
                      type="text" 
                      placeholder="اكتب اسمك الثلاثي أو الثنائي..." 
                      value={clientName} 
                      onChange={e => setClientName(e.target.value)}
                      className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 focus:border-amber-500 focus:bg-white outline-none font-bold text-sm transition-all text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide text-right">رقم الهاتف (الواتساب)</label>
                    <input 
                      type="text" 
                      placeholder="مثال: 01xxxxxxxxx" 
                      value={clientPhone} 
                      onChange={e => {
                        const cleaned = e.target.value.replace(/\D/g, '');
                        setClientPhone(cleaned);
                      }}
                      className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 focus:border-amber-500 focus:bg-white outline-none font-bold text-sm transition-all text-right"
                    />
                  </div>
                  
                  <button
                    type="button"
                    disabled={isSendingOtp}
                    onClick={() => sendVerificationOtp(clientPhone)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-black py-4 rounded-2xl transition transform active:scale-95 shadow-xl shadow-amber-500/20 text-center flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSendingOtp ? (
                      <>
                        <span className="animate-spin">⏳</span> جاري إرسال الكود...
                      </>
                    ) : (
                      'إرسال كود التحقق عبر واتساب 💬'
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="text-center p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 text-xs font-bold leading-relaxed text-right">
                    💬 تم إرسال كود تفعيل طلبك بنجاح للرقم <span className="underline font-black">{clientPhone}</span> عبر تطبيق واتساب. الرجاء تفقد رسائلك وإدخال الكود المكون من 6 أرقام لتأكيد الحجز.
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide text-center">كود تفعيل الطلب (6 أرقام)</label>
                    <input 
                      type="text" 
                      maxLength={6}
                      placeholder="أدخل الـ 6 أرقام هنا..." 
                      value={enteredOtp} 
                      onChange={e => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 focus:border-amber-500 focus:bg-white outline-none font-black text-lg transition-all text-center tracking-[0.5em]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setOtpStep('info')}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-3.5 rounded-2xl transition active:scale-95 text-xs text-center cursor-pointer"
                    >
                      تعديل رقم الهاتف ✏️
                    </button>
                    <button
                      type="button"
                      disabled={isVerifyingOtp}
                      onClick={verifyOtp}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-black py-3.5 rounded-2xl transition transform active:scale-95 text-xs text-center shadow-lg flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {isVerifyingOtp ? 'جاري التحقق...' : 'تأكيد الرمز وإتمام الحجز ✅'}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-center">
                    <button
                      type="button"
                      disabled={resendTimer > 0 || isSendingOtp}
                      onClick={() => sendVerificationOtp(clientPhone)}
                      className={`text-[10px] font-black underline transition-colors cursor-pointer ${resendTimer > 0 ? 'text-slate-300 pointer-events-none' : 'text-amber-600 hover:text-amber-700'}`}
                    >
                      {resendTimer > 0 ? `إعادة إرسال كود التحقق (متاح خلال ${resendTimer} ثانية)` : 'إعادة إرسال كود التحقق الآن 💬'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
