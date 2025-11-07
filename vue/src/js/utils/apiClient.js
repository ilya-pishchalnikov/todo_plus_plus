import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api', 
    withCredentials: true, 
});

let isRefreshing = false; 
let failedQueue = [];

const processQueue = (error) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error); 
        } else {
            prom.resolve(); 
        }
    });
    failedQueue = [];
};


apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (isRefreshing) {            
            return new Promise(function(resolve, reject) {
                failedQueue.push({ resolve, reject });
            })
            .then(() => {                 
                 return apiClient(originalRequest);
            })
            .catch(err => {
                 return Promise.reject(err);
            });
        }

        isRefreshing = true;

        try {
            const response = await axios.get('/api/token_renew', { withCredentials: true }); 
            
            isRefreshing = false;
            processQueue(null); 
            return apiClient(originalRequest);

        } catch (refreshError) {
            isRefreshing = false;
            processQueue(refreshError); 
            
            const isCheckAuth = originalRequest.url.includes('check_auth');

            if (isCheckAuth) {
                console.log("Not performing window reload because the original request was check_auth.");
            } else {
                console.log("Renew form for login form")
                window.location.href = '/'; 
            }
            
            return Promise.reject(refreshError);
        }
    }
);

export default apiClient;