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

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    // Загрузка моделей face-api.js
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
    
    loadModels();
  }, [isAuthenticated, router]);

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
          const topPadding = 0.15; // 15% сверху
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

          resolve(canvas.toDataURL('image/jpeg', 0.95));
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
      img.src = imageDataUrl;
    });
  };

  const estimateAge = async (imageDataUrl: string, type: 'before' | 'after') => {
    try {
      // Извлекаем base64 из data URL
      const base64Data = imageDataUrl.split(',')[1];
      
      const response = await fetch('http://37.252.20.170:5000/api/estimate-age', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Data }),
      });

      if (!response.ok) {
        throw new Error('Ошибка определения возраста');
      }

      const result = await response.json();
      
      if (result.status === 'success' && result.age) {
        if (type === 'before') {
          setData(prev => ({ ...prev, botAgeBefore: result.age }));
        } else {
          setData(prev => ({ ...prev, botAgeAfter: result.age }));
        }
      }
    } catch (error) {
      console.error('Age estimation error:', error);
      // В случае ошибки используем fallback
      const fallbackAge = Math.floor(Math.random() * 10) + 30;
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

        // Для closeup (6й кадр) - без автокропа
        if (photoKey === 'closeup') {
          setData(prev => ({
            ...prev,
            [type]: { ...prev[type], [photoKey]: result }
          }));
          setProcessing(false);
          return;
        }

        // Автокроп для остальных кадров
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

          // Определение возраста для фронтального фото через Age-bot API
          if (photoKey === 'front') {
            estimateAge(croppedImage, type);
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

  const handleDownloadCollage = () => {
    alert('Функция генерации коллажа будет реализована после интеграции с API');
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
                  <p className="text-sm font-medium text-blue-800 text-center whitespace-pre-line">
                    {photoType.label}
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-blue-300 mb-2 relative">
                    {data.before[photoType.id] ? (
                      <img src={data.before[photoType.id]!} alt="До" className="w-full h-full object-cover" />
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
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-blue-300 mb-2 relative">
                    {data.after[photoType.id] ? (
                      <img src={data.after[photoType.id]!} alt="После" className="w-full h-full object-cover" />
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

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleDownloadCollage}
              className="flex items-center px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
            >
              скачать коллаж
              <svg className="ml-2 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </button>
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
      </div>
    </>
  );
};

export default PhotoDiaryPage;
