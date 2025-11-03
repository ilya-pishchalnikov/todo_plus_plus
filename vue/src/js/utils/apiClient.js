import axios from 'axios';

// 1. Создаем базовый экземпляр Axios
const apiClient = axios.create({
    // Важно: если ваш backend Go слушает на том же домене, /api уже будет работать.
    // Если нет, замените на полный URL: 'https://yourdomain.com/api'
    baseURL: '/api', 
    withCredentials: true, 
});

// Флаг для контроля процесса обновления
let isRefreshing = false; 
// Массив промисов для запросов, ожидающих новый токен
let failedQueue = [];

// Функция для обработки очереди ожидающих запросов
const processQueue = (error) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error); // Отклоняем, если обновление не удалось
        } else {
            prom.resolve(); // Разрешаем, чтобы они повторились
        }
    });
    failedQueue = [];
};

// 2. Добавляем перехватчик ответов
apiClient.interceptors.response.use(
    (response) => {
        // Успешные ответы пропускаем
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Если это не 401 ошибка, или мы уже повторно отправляем запрос, 
        // или это сам запрос на обновление, возвращаем ошибку сразу
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // Помечаем запрос как повторенный
        originalRequest._retry = true;

        if (isRefreshing) {
            // Если токен уже обновляется, ставим текущий запрос в очередь
            return new Promise(function(resolve, reject) {
                failedQueue.push({ resolve, reject });
            })
            .then(() => {
                 // Токен обновлен, повторяем оригинальный запрос
                 return apiClient(originalRequest);
            })
            .catch(err => {
                 return Promise.reject(err);
            });
        }

        // Начинаем процесс обновления токена
        isRefreshing = true;

        try {
            // Вызов эндпоинта обновления токена
            const response = await axios.get('/api/token_renew', { withCredentials: true }); 
            
            // Если сервер вернул 200 OK, токен в Cookie обновлен
            isRefreshing = false;
            
            // Уведомляем запросы в очереди, что можно продолжать
            processQueue(null); 
            
            // Повторно отправляем исходный запрос (он автоматически возьмет новый Cookie)
            return apiClient(originalRequest);

        } catch (refreshError) {
            // Обновление токена не удалось (например, refresh-токен истек)
            isRefreshing = false;
            processQueue(refreshError); // Отклоняем все ожидающие запросы
            
            // 🚨 Логика выхода: перенаправляем на логин
            console.error("Token renewal failed. Refresh token might be expired.");
            // Поскольку ваш App.vue управляет состоянием, лучше всего выполнить принудительный выход
            // Здесь может быть вызов глобального хранилища (Vuex/Pinia) или прямой редирект
            window.location.reload(); 
            
            return Promise.reject(refreshError);
        }
    }
);

export default apiClient;