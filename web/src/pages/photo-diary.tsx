import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAppSelector } from '../store/hooks';
import Head from 'next/head';
import * as faceapi from 'face-api.js';

interface PhotoSet {
  front: string | null;
  left34: string | null;
  leftProfile: string | null;
  right34: string | null;
  rightProfile: string | null;
  closeup: string | null;
}

interface PhotoDiaryData {
  before: PhotoSet;
  after: PhotoSet;
  botAgeBefore: number | null;
  botAgeAfter: number | null;
  realAgeBefore: number | null;
  realAgeAfter: number | null;
  weightBefore: number | null;
  weightAfter: number | null;
  heightBefore: number | null;
  heightAfter: number | null;
  commentBefore: string;
  commentAfter: string;
}

const photoTypes: Array<{ id: keyof PhotoSet; label: string }> = [
  { id: 'front', label: 'Вид спереди' },
  { id: 'left34', label: '3/4 слева' },
  { id: 'leftProfile', label: 'Профиль слева' },
  { id: 'right34', label: '3/4 справа' },
  { id: 'rightProfile', label: 'Профиль справа' },
  { id: 'closeup', label: 'твоё\nпроблемное\nместо\nкрупный план' },
];

const PhotoDiaryPage: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [showRules, setShowRules] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const isDataLoadedRef = useRef(false); // Синхронный флаг что данные загружены
  
  // State для ручной обрезки
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImage, setCropImage] = useState<{
    dataUrl: string;
    period: 'before' | 'after';
    photoType: keyof PhotoSet;
  } | null>(null);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 300, height: 300 });
  const [zoom, setZoom] = useState(1);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [data, setData] = useState<PhotoDiaryData>({
    before: { front: null, left34: null, leftProfile: null, right34: null, rightProfile: null, closeup: null },
    after: { front: null, left34: null, leftProfile: null, right34: null, rightProfile: null, closeup: null },
    botAgeBefore: null,
    botAgeAfter: null,
    realAgeBefore: null,
    realAgeAfter: null,
    weightBefore: null,
    weightAfter: null,
    heightBefore: null,
    heightAfter: null,
    commentBefore: '',
    commentAfter: '',
  });

  // Оригинальные фото (необрезанные) - хранятся ТОЛЬКО в памяти текущей сессии
  const [originalPhotos, setOriginalPhotos] = useState<{
    before: PhotoSet;
    after: PhotoSet;
  }>({
    before: { front: null, left34: null, leftProfile: null, right34: null, rightProfile: null, closeup: null },
    after: { front: null, left34: null, leftProfile: null, right34: null, rightProfile: null, closeup: null },
  });
  
  // Координаты обрезки для восстановления из оригиналов с сервера
  const [cropCoordinates, setCropCoordinates] = useState<{
    before: { [K in keyof PhotoSet]?: { x: number; y: number; width: number; height: number } };
    after: { [K in keyof PhotoSet]?: { x: number; y: number; width: number; height: number } };
  }>({
    before: {},
    after: {},
  });
  
  // Метаданные фотографий (даты, EXIF)
  const [photoMetadata, setPhotoMetadata] = useState<{
    before: { [K in keyof PhotoSet]?: { uploadDate: string; exifData?: any } };
    after: { [K in keyof PhotoSet]?: { uploadDate: string; exifData?: any } };
  }>({
    before: {},
    after: {},
  });

  // Функция сжатия изображения для localStorage
  const compressImageForStorage = (dataUrl: string | null, quality: number = 0.4): string | null => {
    if (!dataUrl) return null;
    
    try {
      const img = new Image();
      img.src = dataUrl;
      
      // Ждём загрузки изображения
      if (!img.complete) {
        // Если изображение ещё не загружено, возвращаем как есть
        return dataUrl;
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return dataUrl;
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Сжимаем с указанным качеством
      return canvas.toDataURL('image/jpeg', quality);
    } catch (error) {
      console.error('Failed to compress image:', error);
      return dataUrl; // Возвращаем оригинал если не удалось сжать
    }
  };

  // Async функция сжатия оригиналов для preview (50% качество)
  const compressOriginalForPreview = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0);
        // Сжимаем оригинал до 50% для preview в модалке обрезки
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Сохранение оригинала на сервер (100% качество, хранится 1 месяц)
  const saveOriginalToServer = async (imageDataUrl: string, type: 'before' | 'after', photoKey: keyof PhotoSet) => {
    if (!user?.id) {
      console.log('⚠️ No user ID, skipping server upload');
      return;
    }
    
    try {
      console.log(`📤 Saving original to server: ${photoKey} for ${type}`);
      
      const response = await fetch('https://api.seplitza.ru/api/save-original', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          period: type,
          photoType: photoKey,
          imageData: imageDataUrl, // Полный data URL
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`✅ Original saved to server: ${result.fileId}`, result.exifData);
      
      // Сохраняем метаданные (дата загрузки, EXIF)
      setPhotoMetadata(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          [photoKey]: {
            uploadDate: result.uploadDate,
            exifData: result.exifData
          }
        }
      }));
    } catch (error) {
      console.error('❌ Failed to save original to server:', error);
      // Не блокируем загрузку если сервер недоступен
    }
  };

  // Автосохранение в localStorage при изменении данных (с сжатием)
  useEffect(() => {
    // НЕ сохраняем пока данные не загружены из localStorage
    if (isAuthenticated && user?.id && isDataLoadedRef.current) {
      const storageKey = `photo_diary_${user.id}`;
      const cropCoordsKey = `photo_diary_crop_coords_${user.id}`;
      try {
        // Создаём копию данных со сжатыми изображениями для localStorage
        const compressedData = {
          ...data,
          before: {
            front: compressImageForStorage(data.before.front),
            left34: compressImageForStorage(data.before.left34),
            leftProfile: compressImageForStorage(data.before.leftProfile),
            right34: compressImageForStorage(data.before.right34),
            rightProfile: compressImageForStorage(data.before.rightProfile),
            closeup: compressImageForStorage(data.before.closeup),
          },
          after: {
            front: compressImageForStorage(data.after.front),
            left34: compressImageForStorage(data.after.left34),
            leftProfile: compressImageForStorage(data.after.leftProfile),
            right34: compressImageForStorage(data.after.right34),
            rightProfile: compressImageForStorage(data.after.rightProfile),
            closeup: compressImageForStorage(data.after.closeup),
          },
        };
        
        localStorage.setItem(storageKey, JSON.stringify(compressedData));
        
        // Сохраняем координаты обрезки (очень маленький размер!)
        localStorage.setItem(cropCoordsKey, JSON.stringify(cropCoordinates));
        
        // Сохраняем метаданные (даты, EXIF)
        const metadataKey = `photo_diary_metadata_${user.id}`;
        localStorage.setItem(metadataKey, JSON.stringify(photoMetadata));
        
        console.log('💾 Photo diary auto-saved (40% quality display + crop coords + metadata)');
      } catch (error: any) {
        if (error.name === 'QuotaExceededError') {
          console.error('❌ LocalStorage quota exceeded! Clearing display photos...');
          localStorage.removeItem(storageKey);
          console.log('🗑️ Cleared display photos storage');
        } else {
          console.error('❌ LocalStorage save error:', error);
        }
      }
    }
  }, [data, cropCoordinates, photoMetadata, isAuthenticated, user]);

  // Проверка авторизации (только redirect)
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // Загрузка данных из localStorage (только один раз при монтировании)
  useEffect(() => {
    if (user?.id && !isDataLoadedRef.current) {
      const storageKey = `photo_diary_${user.id}`;
      const originalsKey = `photo_diary_originals_${user.id}`;
      const versionKey = `photo_diary_version_${user.id}`;
      const CURRENT_VERSION = '2.0'; // Версия с server-side originals
      
      // Проверяем версию данных (мягкая миграция - НЕ удаляем фото!)
      const savedVersion = localStorage.getItem(versionKey);
      if (savedVersion !== CURRENT_VERSION) {
        console.log(`🔄 Data version update (${savedVersion} → ${CURRENT_VERSION}), migrating data...`);
        // Не удаляем данные! Только обновляем версию
        // В будущем здесь можно добавить логику миграции структуры данных
        localStorage.setItem(versionKey, CURRENT_VERSION);
      }
      
      const savedData = localStorage.getItem(storageKey);
      console.log(`🔍 Looking for saved data with key: ${storageKey}`);
      
      let loadedData = null;
      
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          console.log('📂 Loaded saved photo diary from localStorage:', {
            hasBefore: !!parsed.before?.front,
            hasAfter: !!parsed.after?.front
          });
          loadedData = parsed;
        } catch (error) {
          console.error('❌ Failed to load saved data:', error);
        }
      } else {
        console.log('ℹ️ No saved data found in localStorage');
      }
      
      // Загружаем координаты обрезки
      const cropCoordsKey = `photo_diary_crop_coords_${user.id}`;
      const savedCropCoords = localStorage.getItem(cropCoordsKey);
      if (savedCropCoords) {
        try {
          const parsed = JSON.parse(savedCropCoords);
          setCropCoordinates(parsed);
          console.log('📐 Loaded crop coordinates from localStorage');
        } catch (error) {
          console.error('❌ Failed to load crop coordinates:', error);
        }
      }
      
      // Загружаем метаданные (даты, EXIF)
      const metadataKey = `photo_diary_metadata_${user.id}`;
      const savedMetadata = localStorage.getItem(metadataKey);
      if (savedMetadata) {
        try {
          const parsed = JSON.parse(savedMetadata);
          setPhotoMetadata(parsed);
          console.log('📅 Loaded photo metadata from localStorage');
        } catch (error) {
          console.error('❌ Failed to load metadata:', error);
        }
      }
      
      // Применяем загруженные данные
      if (loadedData) {
        setData(loadedData);
        console.log('📂 Restored display photos from localStorage');
      }
      
      // TODO: Загрузить оригиналы с сервера если есть crop coordinates
      // if (savedCropCoords && Object.keys(parsed.before).length > 0) {
      //   await loadOriginalsFromServer(user.id);
      // }
      
      // Данные загружены (даже если было пусто) - СИНХРОННО
      isDataLoadedRef.current = true;
      console.log('✅ Data load complete, auto-save now enabled');
    }
  }, [user?.id]);
  
  // Загрузка моделей face-api.js (только один раз)
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/rejuvena/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
        console.log('✅ Face-api models loaded');
      } catch (error) {
        console.error('❌ Failed to load face-api models:', error);
      }
    };
    
    if (!modelsLoaded) {
      loadModels();
    }
  }, [modelsLoaded]);

  const cropFaceImage = async (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          // Детекция лица
          const detection = await faceapi.detectSingleFace(
            img,
            new faceapi.TinyFaceDetectorOptions()
          ).withFaceLandmarks();

          if (!detection) {
            reject(new Error('Лицо не найдено на фотографии'));
            return;
          }

          const { box } = detection.detection;
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;

          // Расчет кропа с учетом отступов
          const topPadding = 0.30; // 30% сверху (увеличено для лучшей детекции InsightFace)
          const bottomPadding = 0.15; // 15% снизу
          
          // Высота области от верха лица до низа с отступами
          const totalHeight = box.height / (1 - topPadding - bottomPadding);
          const cropTop = box.y - (totalHeight * topPadding);
          
          // Квадратный кроп - берем размер по высоте
          const cropSize = totalHeight;
          
          // Горизонтально - центрируем относительно лица
          const faceCenterX = box.x + box.width / 2;
          const cropLeft = faceCenterX - cropSize / 2;

          // Установка размера canvas (квадрат)
          canvas.width = cropSize;
          canvas.height = cropSize;

          // Отрисовка кропнутого изображения
          ctx.drawImage(
            img,
            cropLeft, cropTop, cropSize, cropSize,
            0, 0, cropSize, cropSize
          );

          // Высокое качество для коллажа
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
      img.src = imageDataUrl;
    });
  };

  const savePhotoToServer = async (imageDataUrl: string, type: 'before' | 'after', photoKey: keyof PhotoSet) => {
    // Эта функция для старого API - не используется
    // Фото сохраняются через saveOriginalToServer
    return Promise.resolve();
    
    /* ВРЕМЕННО ОТКЛЮЧЕНО - backend endpoint не готов
    try {
      console.log(`💾 Saving ${photoKey} photo for ${type} to server...`);
      
      // Извлекаем base64 из data URL
      const base64Data = imageDataUrl.split(',')[1];
      
      // Определяем тип фото для API (photoType: 0-5 для 6 кадров)
      const photoTypeMap: { [key in keyof PhotoSet]: number } = {
        front: 0,
        left34: 1,
        leftProfile: 2,
        right34: 3,
        rightProfile: 4,
        closeup: 5,
      };
      
      const photoType = photoTypeMap[photoKey];
      const isBeforePhoto = type === 'before';
      
      // Сохраняем фото на сервер
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contest/uploadcontestimages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          image: base64Data,
          photoType: photoType,
          isBeforePhoto: isBeforePhoto,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка сохранения фото');
      }

      const result = await response.json();
      console.log(`✅ Photo saved:`, result);
      
      return result;
    } catch (error) {
      console.error('❌ Photo save error:', error);
      // Не критичная ошибка - фото остаётся в локальном состоянии
    }
    */
  };

  const estimateAge = async (imageDataUrl: string, type: 'before' | 'after') => {
    console.log(`🎯 Calling estimateAge for ${type}...`);
    try {
      // Извлекаем base64 из data URL
      const base64Data = imageDataUrl.split(',')[1];
      console.log(`📸 Image size: ${base64Data.length} chars`);
      
      // Используем Age-bot API через Cloudflare с SSL
      const response = await fetch('https://api.seplitza.ru/api/estimate-age', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Data }),
      });

      console.log(`📡 API response status: ${response.status}`);

      if (!response.ok) {
        throw new Error('Ошибка определения возраста');
      }

      const result = await response.json();
      
      console.log('✅ Age API response:', result);
      
      if (result.success && result.age) {
        console.log(`🎂 Setting age ${result.age} for ${type}`);
        if (type === 'before') {
          setData(prev => ({ ...prev, botAgeBefore: result.age }));
        } else {
          setData(prev => ({ ...prev, botAgeAfter: result.age }));
        }
      } else {
        console.error('❌ Age estimation failed:', result.message);
      }
    } catch (error) {
      console.error('❌ Age estimation error:', error);
      // В случае ошибки используем fallback (130-140 для определения что это не реальная оценка)
      const fallbackAge = Math.floor(Math.random() * 11) + 130;
      if (type === 'before') {
        setData(prev => ({ ...prev, botAgeBefore: fallbackAge }));
      } else {
        setData(prev => ({ ...prev, botAgeAfter: fallbackAge }));
      }
    }
  };

  const handleFileUpload = async (type: 'before' | 'after', photoKey: keyof PhotoSet, file: File) => {
    setCropError(null);
    setProcessing(true);

    try {
      // Читаем файл
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        
        // 1. Сохраняем оригинал на СЕРВЕР (100% качество, хранится 1 месяц)
        await saveOriginalToServer(result, type, photoKey);
        
        // 2. Сохраняем сжатый оригинал в браузер для preview (50% качество, 24 часа)
        const compressedOriginal = await compressOriginalForPreview(result);
        setOriginalPhotos(prev => ({
          ...prev,
          [type]: { ...prev[type], [photoKey]: compressedOriginal }
        }));

        // Для профилей и closeup - сразу ручная обрезка
        if (photoKey === 'leftProfile' || photoKey === 'rightProfile' || photoKey === 'closeup') {
          // Сохраняем сжатый для отображения (60%)
          const compressedForDisplay = compressImageForStorage(result, 0.4);
          setData(prev => ({
            ...prev,
            [type]: { ...prev[type], [photoKey]: compressedForDisplay }
          }));
          setProcessing(false);
          
          // Открываем модалку ручной обрезки сразу
          setTimeout(() => openCropModal(type, photoKey), 100);
          return;
        }

        // Автокроп только для front, left34, right34
        if (!modelsLoaded) {
          setCropError('Модели распознавания лиц еще загружаются. Попробуйте через несколько секунд.');
          setProcessing(false);
          return;
        }

        try {
          const croppedImage = await cropFaceImage(result);
          
          setData(prev => ({
            ...prev,
            [type]: { ...prev[type], [photoKey]: croppedImage }
          }));

          // Сохраняем обрезанное фото на сервер
          await savePhotoToServer(croppedImage, type, photoKey);

          // Определение возраста для фронтального фото через Age-bot API
          // Отправляем КРОПНУТОЕ фото с 30% padding - InsightFace видит всё лицо
          console.log(`📷 Photo uploaded: ${photoKey} for ${type}`);
          if (photoKey === 'front') {
            console.log(`🔍 Front photo detected - calling estimateAge`);
            await estimateAge(croppedImage, type);
          } else {
            console.log(`⏭️ Skipping age estimation for ${photoKey}`);
          }

          setProcessing(false);
        } catch (error: any) {
          console.error('Crop error:', error);
          setCropError(error.message || 'Не удалось обработать фото');
          
          // Предлагаем загрузить без кропа
          if (confirm('Не удалось автоматически обрезать фото. Загрузить как есть?')) {
            setData(prev => ({
              ...prev,
              [type]: { ...prev[type], [photoKey]: result }
            }));
          }
          setProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File upload error:', error);
      setProcessing(false);
    }
  };

  // Открыть модальное окно ручной обрезки
  const openCropModal = (period: 'before' | 'after', photoType: keyof PhotoSet) => {
    // Используем ОРИГИНАЛ (необрезанный) если он есть, иначе текущее фото
    const originalPhoto = originalPhotos[period][photoType];
    const photoData = originalPhoto || data[period][photoType];
    
    if (photoData) {
      // Загружаем изображение чтобы узнать его реальные размеры
      const img = new Image();
      img.onload = () => {
        const imgWidth = img.width;
        const imgHeight = img.height;
        
        // Устанавливаем начальный размер области обрезки (min размера изображения)
        const initialSize = Math.min(imgWidth, imgHeight, 400);
        const centerX = (imgWidth - initialSize) / 2;
        const centerY = (imgHeight - initialSize) / 2;
        
        setCropImage({ dataUrl: photoData, period, photoType });
        setCropArea({ 
          x: Math.max(0, centerX), 
          y: Math.max(0, centerY), 
          width: initialSize, 
          height: initialSize 
        });
        setZoom(1);
        setShowCropModal(true);
        
        if (originalPhoto) {
          console.log(`📷 Opening crop modal with ORIGINAL photo for ${photoType} (${imgWidth}x${imgHeight})`);
        } else {
          console.log(`⚠️ No original found, using current photo for ${photoType} (${imgWidth}x${imgHeight})`);
        }
      };
      img.src = photoData;
    }
  };

  // Применить ручную обрезку - отправляем координаты на сервер
  const handleApplyCrop = async () => {
    if (!cropImage) return;

    setProcessing(true);
    
    try {
      // TODO: Отправить координаты на сервер для обрезки оригинала
      // Пока временно обрезаем локально из preview
      const img = new Image();
      img.onload = async () => {
        // Вычисляем соотношение между preview и оригинальным размером
        // Preview сжат до 50%, но размеры пропорциональны
        const previewWidth = img.naturalWidth;  // Реальная ширина изображения
        const previewHeight = img.naturalHeight; // Реальная высота изображения
        
        // ВАЖНО: cropArea содержит координаты относительно отображаемого размера в браузере
        // Нужно найти элемент img в модальном окне чтобы узнать displayed размер
        const modalImg = document.querySelector('.crop-modal-image') as HTMLImageElement;
        if (!modalImg) {
          console.error('❌ Modal image not found');
          return;
        }
        
        const displayedWidth = modalImg.width;   // Размер на экране
        const displayedHeight = modalImg.height;
        
        // Вычисляем масштаб между displayed и actual размерами
        const scaleX = previewWidth / displayedWidth;
        const scaleY = previewHeight / displayedHeight;
        
        // Пересчитываем координаты обрезки в реальные пиксели изображения
        const actualCropX = Math.round(cropArea.x * scaleX);
        const actualCropY = Math.round(cropArea.y * scaleY);
        const actualCropWidth = Math.round(cropArea.width * scaleX);
        const actualCropHeight = Math.round(cropArea.height * scaleY);
        
        console.log(`🔍 Crop coordinates:
          Display: (${cropArea.x}, ${cropArea.y}) ${cropArea.width}x${cropArea.height}
          Image: ${displayedWidth}x${displayedHeight} → ${previewWidth}x${previewHeight}
          Scale: ${scaleX.toFixed(2)}x, ${scaleY.toFixed(2)}x
          Actual: (${actualCropX}, ${actualCropY}) ${actualCropWidth}x${actualCropHeight}`);
        
        // Создаём canvas для обрезанного изображения из preview
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = actualCropWidth;
        cropCanvas.height = actualCropHeight;
        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) return;

        // Вырезаем область из preview используя РЕАЛЬНЫЕ координаты
        cropCtx.drawImage(
          img,
          actualCropX,
          actualCropY,
          actualCropWidth,
          actualCropHeight,
          0,
          0,
          actualCropWidth,
          actualCropHeight
        );

        // Конвертируем в base64 с качеством 95% (высокое качество для сервера)
        const croppedHighQuality = cropCanvas.toDataURL('image/jpeg', 0.95);
        
        // Создаём уменьшенную версию для отображения (максимум 400x400px под размер окошка)
        const maxDisplaySize = 400;
        const scale = Math.min(1, maxDisplaySize / Math.max(actualCropWidth, actualCropHeight));
        const displayWidth = Math.round(actualCropWidth * scale);
        const displayHeight = Math.round(actualCropHeight * scale);
        
        const displayCanvas = document.createElement('canvas');
        displayCanvas.width = displayWidth;
        displayCanvas.height = displayHeight;
        const displayCtx = displayCanvas.getContext('2d');
        if (!displayCtx) return;
        
        displayCtx.drawImage(cropCanvas, 0, 0, displayWidth, displayHeight);
        
        // Сжимаем до 40% для отображения в сетке (экономия места)
        const croppedDataUrl = displayCanvas.toDataURL('image/jpeg', 0.4);

        /* TODO: Реализовать на сервере endpoint /api/crop-original
        // Отправляем координаты на сервер для обрезки оригинала
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/crop-original`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({
            userId: user?.id,
            period: cropImage.period,
            photoType: cropImage.photoType,
            cropX: cropArea.x,
            cropY: cropArea.y,
            cropWidth: cropArea.width,
            cropHeight: cropArea.height,
            // Передаём размеры preview для пересчёта координат на стороне сервера
            previewWidth: previewWidth,
            previewHeight: previewHeight,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to crop original on server');
        }
        
        const result = await response.json();
        croppedDataUrl = result.croppedImage; // Получаем обрезанный оригинал с сервера
        */

        // Обновляем данные
        setData(prev => ({
          ...prev,
          [cropImage.period]: {
            ...prev[cropImage.period],
            [cropImage.photoType]: croppedDataUrl
          }
        }));
        
        // Сохраняем координаты обрезки для восстановления из оригинала с сервера
        setCropCoordinates(prev => ({
          ...prev,
          [cropImage.period]: {
            ...prev[cropImage.period],
            [cropImage.photoType]: {
              x: actualCropX,
              y: actualCropY,
              width: actualCropWidth,
              height: actualCropHeight
            }
          }
        }));

        // Закрываем модальное окно
        setShowCropModal(false);
        setCropImage(null);
        setProcessing(false);
        
        console.log('✂️ Manual crop applied & coordinates saved:', {
          x: actualCropX,
          y: actualCropY,
          width: actualCropWidth,
          height: actualCropHeight
        });
      };
      img.src = cropImage.dataUrl;
    } catch (error) {
      console.error('Crop failed:', error);
      alert('Не удалось обрезать изображение');
      setProcessing(false);
    }
  };

  const handleDownloadCollage = async () => {
    try {
      setProcessing(true);
      
      // Проверяем что все фото загружены
      const beforePhotos = Object.values(data.before);
      const afterPhotos = Object.values(data.after);
      
      const missingBefore = beforePhotos.filter(p => !p).length;
      const missingAfter = afterPhotos.filter(p => !p).length;
      
      if (missingBefore > 0 || missingAfter > 0) {
        alert(`Загрузите все фотографии!\nНе хватает: ${missingBefore} фото "До" и ${missingAfter} фото "После"`);
        setProcessing(false);
        return;
      }
      
      console.log('🎨 Creating collage...');
      
      // Отправляем запрос на создание коллажа
      const response = await fetch('https://api.seplitza.ru/api/create-collage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          beforePhotos: beforePhotos,
          afterPhotos: afterPhotos,
          metadata: photoMetadata,
          userInfo: {
            username: user?.email?.split('@')[0] || user?.name || 'Пользователь',
            realAgeBefore: data.realAgeBefore,
            realAgeAfter: data.realAgeAfter,
            weightBefore: data.weightBefore,
            weightAfter: data.weightAfter,
            heightBefore: data.heightBefore,
            heightAfter: data.heightAfter,
            commentsBefore: data.commentBefore,
            commentsAfter: data.commentAfter,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка создания коллажа');
      }

      const result = await response.json();
      
      if (result.success && result.collage) {
        // Скачиваем коллаж с уникальным именем (как в заголовке)
        const username = user?.email?.split('@')[0] || user?.name || 'Пользователь';
        const downloadDate = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
        const filename = `Фотодневник_${username}_${downloadDate}.jpg`;
        
        const link = document.createElement('a');
        link.href = result.collage;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ Collage downloaded:', filename);
      } else {
        throw new Error('Не удалось создать коллаж');
      }
      
      setProcessing(false);
    } catch (error) {
      console.error('❌ Collage error:', error);
      alert('Ошибка при создании коллажа. Попробуйте еще раз.');
      setProcessing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Фотодневник - Rejuvena</title>
      </Head>
      
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-blue-700 hover:text-blue-800"
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full mr-3 flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-blue-800">Rejuvena</h1>
            </div>
            
            <button className="text-gray-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          <div className="border-b">
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between py-2">
              <h2 className="text-xl font-bold text-blue-800">Фотодневник</h2>
              <button 
                onClick={() => setShowRules(true)}
                className="text-blue-700 underline font-medium"
              >
                правила
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6 text-blue-800 space-y-3 text-sm leading-relaxed">
            <p className="font-bold">Время загрузить твои новые фото!</p>
            <p>
              Сделай 6 снимков, как показано в примерах. После окончания каждого курса возвращайся сюда с новым 
              набором из 6 фотографий и зафиксируй изменения «До» и «После».
            </p>
            <p>
              Ты сможешь скачать коллаж с результатами, чтобы поделиться им или оставить себе на память.
            </p>
            <p className="font-bold">Удачи!</p>
          </div>

          <div className="mb-6 bg-pink-50 border border-pink-200 rounded-lg p-3 flex items-center">
            <div className="flex-shrink-0 mr-3">
              <span className="text-2xl">💡</span>
            </div>
            <p className="text-sm text-blue-800 flex-1">
              <span className="font-bold">Tip!</span> When taking pictures, keep your camera horizontally
            </p>
            <div className="flex-shrink-0 flex items-center space-x-2">
              <div className="w-12 h-10 bg-white border-2 border-blue-800 rounded flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-gray-300"></div>
              </div>
              <span className="text-2xl">👌</span>
              <div className="w-10 h-12 bg-white border-2 border-red-500 rounded flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-gray-300"></div>
              </div>
              <span className="text-2xl">❌</span>
            </div>
          </div>

          {/* Якорь на условия хранения */}
          <div className="mb-6 bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <button
              onClick={() => {
                const element = document.getElementById('storage-policy');
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="w-full flex items-center justify-between hover:bg-blue-100 transition-colors rounded p-2"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-bold text-base text-blue-800">Условия хранения фотографий</p>
              </div>
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-blue-800">Пример</h3>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-blue-800">До</h3>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-blue-800">После</h3>
            </div>
          </div>

          {/* Processing/Error Messages */}
          {processing && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Обработка фото...</span>
            </div>
          )}
          
          {cropError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{cropError}</p>
            </div>
          )}

          <div className="space-y-4">
            {photoTypes.map((photoType) => (
              <div key={photoType.id} className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-full aspect-square bg-gray-200 rounded-lg overflow-hidden border-2 border-gray-300 mb-2">
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <span className="text-gray-400 text-sm">Пример</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-blue-300 mb-2 relative group">
                    {data.before[photoType.id] ? (
                      <div className="w-full h-full relative">
                        <img src={data.before[photoType.id]!} alt="До" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex flex-col items-center justify-center gap-2">
                          <label className="text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer hover:underline">
                            Изменить
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={processing}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload('before', photoType.id, file);
                              }}
                            />
                          </label>
                          <button
                            onClick={() => openCropModal('before', photoType.id)}
                            className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:underline"
                            disabled={processing}
                          >
                            Корректировать
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={processing}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload('before', photoType.id, file);
                          }}
                        />
                        <span className="text-blue-600 font-medium">
                          {processing ? 'Обработка...' : 'загрузить'}
                        </span>
                      </label>
                    )}
                  </div>
                  {photoMetadata.before[photoType.id] && (
                    <div className="text-xs text-gray-600 text-center w-full px-1">
                      <div className="truncate">
                        {photoMetadata.before[photoType.id]?.exifData?.captureDate 
                          ? `📷 ${new Date(photoMetadata.before[photoType.id]!.exifData.captureDate).toLocaleDateString('ru-RU')}`
                          : photoMetadata.before[photoType.id]?.exifData?.reason 
                            ? `⚠️ ${photoMetadata.before[photoType.id]!.exifData.reason}`
                            : '📷 Дата съемки неизвестна'}
                      </div>
                      <div className="truncate">
                        📤 {new Date(photoMetadata.before[photoType.id]!.uploadDate).toLocaleDateString('ru-RU', { 
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  )}
                  <p className="text-sm font-medium text-blue-800 text-center whitespace-pre-line">
                    {photoType.label}
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-blue-300 mb-2 relative group">
                    {data.after[photoType.id] ? (
                      <div className="w-full h-full relative">
                        <img src={data.after[photoType.id]!} alt="После" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex flex-col items-center justify-center gap-2">
                          <label className="text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer hover:underline">
                            Изменить
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={processing}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload('after', photoType.id, file);
                              }}
                            />
                          </label>
                          <button
                            onClick={() => openCropModal('after', photoType.id)}
                            className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:underline"
                            disabled={processing}
                          >
                            Корректировать
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={processing}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload('after', photoType.id, file);
                          }}
                        />
                        <span className="text-blue-600 font-medium">
                          {processing ? 'Обработка...' : 'загрузить'}
                        </span>
                      </label>
                    )}
                  </div>
                  {photoMetadata.after[photoType.id] && (
                    <div className="text-xs text-gray-600 text-center w-full px-1">
                      <div className="truncate">
                        {photoMetadata.after[photoType.id]?.exifData?.captureDate 
                          ? `📷 ${new Date(photoMetadata.after[photoType.id]!.exifData.captureDate).toLocaleDateString('ru-RU')}`
                          : photoMetadata.after[photoType.id]?.exifData?.reason 
                            ? `⚠️ ${photoMetadata.after[photoType.id]!.exifData.reason}`
                            : '📷 Дата съемки неизвестна'}
                      </div>
                      <div className="truncate">
                        📤 {new Date(photoMetadata.after[photoType.id]!.uploadDate).toLocaleDateString('ru-RU', { 
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  )}
                  <p className="text-sm font-medium text-blue-800 text-center whitespace-pre-line">
                    {photoType.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm font-medium text-blue-800">Бот определил возраст</div>
              <input type="text" value={data.botAgeBefore || ''} readOnly placeholder="..." className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-center" />
              <input type="text" value={data.botAgeAfter || ''} readOnly placeholder="..." className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-center" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm font-medium text-blue-800">возраст</div>
              <input type="number" value={data.realAgeBefore || ''} onChange={(e) => setData(prev => ({ ...prev, realAgeBefore: parseInt(e.target.value) || null }))} placeholder="..." className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-center" />
              <input type="number" value={data.realAgeAfter || ''} onChange={(e) => setData(prev => ({ ...prev, realAgeAfter: parseInt(e.target.value) || null }))} placeholder="..." className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-center" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm font-medium text-blue-800">вес</div>
              <input type="number" value={data.weightBefore || ''} onChange={(e) => setData(prev => ({ ...prev, weightBefore: parseInt(e.target.value) || null }))} placeholder="..." className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-center" />
              <input type="number" value={data.weightAfter || ''} onChange={(e) => setData(prev => ({ ...prev, weightAfter: parseInt(e.target.value) || null }))} placeholder="..." className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-center" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm font-medium text-blue-800">рост</div>
              <input type="number" value={data.heightBefore || ''} onChange={(e) => setData(prev => ({ ...prev, heightBefore: parseInt(e.target.value) || null }))} placeholder="..." className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-center" />
              <input type="number" value={data.heightAfter || ''} onChange={(e) => setData(prev => ({ ...prev, heightAfter: parseInt(e.target.value) || null }))} placeholder="..." className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-center" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm font-medium text-blue-800">комментарий</div>
              <textarea value={data.commentBefore} onChange={(e) => setData(prev => ({ ...prev, commentBefore: e.target.value }))} placeholder="..." rows={3} className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg resize-none" />
              <textarea value={data.commentAfter} onChange={(e) => setData(prev => ({ ...prev, commentAfter: e.target.value }))} placeholder="..." rows={3} className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg resize-none" />
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleDownloadCollage}
                disabled={processing}
                className="flex items-center px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition"
              >
                скачать коллаж
                <svg className="ml-2 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </button>
              
              <button
                onClick={() => {
                  if (confirm('Удалить все загруженные фотографии? Это действие нельзя отменить.')) {
                    setData({
                      before: { front: null, left34: null, leftProfile: null, right34: null, rightProfile: null, closeup: null },
                      after: { front: null, left34: null, leftProfile: null, right34: null, rightProfile: null, closeup: null },
                      botAgeBefore: null,
                      botAgeAfter: null,
                      realAgeBefore: null,
                      realAgeAfter: null,
                      weightBefore: null,
                      weightAfter: null,
                      heightBefore: null,
                      heightAfter: null,
                      commentBefore: '',
                      commentAfter: '',
                    });
                    if (user?.id) {
                      localStorage.removeItem(`photo_diary_${user.id}`);
                    }
                    alert('Все фотографии удалены');
                  }
                }}
                className="flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition"
              >
                Очистить всё
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            
            <div className="text-sm text-gray-500 flex items-center">
              <svg className="h-4 w-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Фотографии автоматически сохраняются
            </div>
          </div>

          {/* Подробные условия хранения фотографий */}
          <div id="storage-policy" className="mt-8 bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 text-sm text-blue-800 space-y-2">
                <p className="font-bold text-base">Хранение фотографий и автосохранение:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><span className="font-semibold">В браузере:</span> финальные фото (40% качество) + координаты обрезки. Оригиналы в текущей сессии для ре-обрезки</li>
                  <li><span className="font-semibold">На сервере - оригиналы:</span> необрезанные фото (100% качество) хранятся 1 месяц для возможности ре-обрезки и использования в рекламе</li>
                  <li><span className="font-semibold">На сервере - обрезанные:</span> финальные фото для коллажа</li>
                  <li><span className="font-semibold">С оплаченным курсом:</span> на всё время курса + 1 месяц после окончания</li>
                  <li><span className="font-semibold">Уведомления:</span> мы пришлём напоминания о удалении фото за 7, 3 и 1 день. Вы сможете продлить хранение, оформив курс</li>
                </ul>
              </div>
            </div>
          </div>
        </main>

        {showRules && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-blue-800">Правила фотодневника</h2>
                <button
                  onClick={() => setShowRules(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4 text-blue-800">
                <p className="font-bold">Проверьте, как вы выглядите сейчас. Сделайте снимок и загрузите его, посмотрите результат.</p>
                <p>Наш Age-bot угадает, сколько лет выглядит ваше лицо сейчас. Точность работы Age-bot очень высока - 95% результатов корректны.</p>
                <p>Можно ли обмануть его? Нет... и да. Age-bot видит возрастные изменения в структуре костей - это невозможно подделать! Но он также проверяет состояние и расположение ваших мягких тканей. Это мы можем улучшить в приложении Rejuvena.</p>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowRules(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                >
                  Понятно
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно ручной обрезки */}
        {showCropModal && cropImage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-auto">
            <div className="bg-white rounded-lg p-4 w-auto max-w-[95vw] max-h-[95vh] flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold text-blue-800">Корректировать обрезку</h2>
                <button
                  onClick={() => {
                    setShowCropModal(false);
                    setCropImage(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-3 overflow-auto flex-shrink">
                <div className="relative inline-block">
                  <img
                    src={cropImage.dataUrl}
                    alt="Crop preview"
                    className="border-2 border-gray-300 crop-modal-image"
                    style={{ 
                      display: 'block',
                      maxWidth: '85vw',
                      maxHeight: '60vh',
                      width: 'auto',
                      height: 'auto'
                    }}
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement;
                      // Обновляем максимальные границы для перетаскивания
                      const maxX = img.width - cropArea.width;
                      const maxY = img.height - cropArea.height;
                      if (cropArea.x > maxX) setCropArea(prev => ({ ...prev, x: Math.max(0, maxX) }));
                      if (cropArea.y > maxY) setCropArea(prev => ({ ...prev, y: Math.max(0, maxY) }));
                    }}
                  />
                  {/* Область обрезки */}
                  <div
                    className="absolute border-4 border-blue-500 cursor-move"
                    style={{
                      left: `${cropArea.x}px`,
                      top: `${cropArea.y}px`,
                      width: `${cropArea.width}px`,
                      height: `${cropArea.height}px`,
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const imgElement = e.currentTarget.parentElement?.querySelector('img');
                      if (!imgElement) return;
                      
                      const imgWidth = imgElement.width;
                      const imgHeight = imgElement.height;
                      const rect = imgElement.getBoundingClientRect();
                      const startX = e.clientX - rect.left - cropArea.x;
                      const startY = e.clientY - rect.top - cropArea.y;
                      
                      const handleMove = (e: MouseEvent) => {
                        const newX = Math.max(0, Math.min(imgWidth - cropArea.width, e.clientX - rect.left - startX));
                        const newY = Math.max(0, Math.min(imgHeight - cropArea.height, e.clientY - rect.top - startY));
                        setCropArea(prev => ({ ...prev, x: newX, y: newY }));
                      };
                      
                      const handleUp = () => {
                        document.removeEventListener('mousemove', handleMove);
                        document.removeEventListener('mouseup', handleUp);
                      };
                      
                      document.addEventListener('mousemove', handleMove);
                      document.addEventListener('mouseup', handleUp);
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold" style={{ textShadow: '0 0 4px black' }}>
                      Перетащите
                    </div>
                  </div>
                </div>
              </div>

              {/* Управление */}
              <div className="space-y-3 mb-4 flex-shrink-0">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Размер области обрезки: {cropArea.width}×{cropArea.height}px (квадрат)
                  </label>
                  <input
                    type="range"
                    min="100"
                    max={(() => {
                      const img = document.querySelector('.relative.inline-block img') as HTMLImageElement;
                      if (img) {
                        return Math.min(img.width, img.height);
                      }
                      return 1000;
                    })()}
                    step="10"
                    value={cropArea.width}
                    onChange={(e) => {
                      const img = document.querySelector('.relative.inline-block img') as HTMLImageElement;
                      if (!img) return;
                      
                      const newSize = parseInt(e.target.value);
                      const maxSize = Math.min(img.width, img.height);
                      const finalSize = Math.min(newSize, maxSize);
                      
                      setCropArea(prev => ({
                        ...prev,
                        width: finalSize,
                        height: finalSize,
                        x: Math.min(prev.x, img.width - finalSize),
                        y: Math.min(prev.y, img.height - finalSize)
                      }));
                    }}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Область обрезки всегда остаётся квадратной</p>
                </div>
              </div>

              {/* Кнопки */}
              <div className="flex justify-end gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowCropModal(false);
                    setCropImage(null);
                  }}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleApplyCrop}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PhotoDiaryPage;
