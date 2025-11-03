<template>
  <div class="login-body">
    <!-- Login Form -->
    <div class="auth-container" v-if="currentView === 'login'">
      <h1 class="header-main">Login</h1>
      <div class="div-login">
        <form @submit.prevent="handleLogin">
          <p class="label">login</p>
          <input 
            class="login-input" 
            type="text" 
            v-model="loginForm.login" 
            placeholder="login" 
            required 
            autocomplete="username"
          /> 
          <p class="label">password</p>
          <input 
            class="login-input" 
            type="password" 
            v-model="loginForm.password" 
            placeholder="password" 
            required 
            autocomplete="current-password"
          />
          <div class="div-button-login">
            <button type="submit" class="button-login">Login</button>
          </div>
          <div class="div-register-link">
            <p>Don't have an account? <a href="#" @click.prevent="switchToRegister">Register here</a></p>
            <p><a href="#" @click.prevent="switchToForgotPassword">Forgot password?</a></p>
          </div>
        </form>
      </div>
    </div>

    <!-- Registration Form -->
    <div class="auth-container" v-if="currentView === 'register'">
      <h1 class="header-main">Register</h1>
      <div class="div-login">
        <form @submit.prevent="handleRegister">
          <p class="label">username</p>
          <input 
            class="login-input" 
            type="text" 
            v-model="registerForm.username" 
            placeholder="username" 
            required
          />
          <p class="label">login</p>
          <input 
            class="login-input" 
            type="text" 
            v-model="registerForm.login" 
            placeholder="login" 
            required 
            autocomplete="username"
          />
          <p class="label">email</p>
          <input 
            class="login-input" 
            type="email" 
            v-model="registerForm.email" 
            placeholder="email" 
            required 
            autocomplete="email"
          />
          <p class="label">password</p>
          <input 
            class="login-input" 
            type="password" 
            v-model="registerForm.password" 
            placeholder="password" 
            required 
            autocomplete="new-password"
          />
          <p class="label">confirm password</p>
          <input 
            class="login-input" 
            type="password" 
            v-model="registerForm.confirmPassword" 
            placeholder="confirm password" 
            required 
            autocomplete="new-password"
          />
          <div class="div-button-login">
            <button type="submit" class="button-register">Register</button>
          </div>
          <div class="div-register-link">
            <p>Already have an account? <a href="#" @click.prevent="switchToLogin">Login here</a></p>
          </div>
        </form>
      </div>
    </div>

    <div class="auth-container" v-if="currentView === 'forgot'">
      <h1 class="header-main">Forgot Password</h1>
      <div class="div-login">
        <form @submit.prevent="handleForgotPassword">
          <p class="label">login or email</p>
          <input 
            class="login-input" 
            type="text" 
            v-model="forgotForm.login" 
            placeholder="login or email" 
            required 
            autocomplete="email"
          /> 
          <div class="div-button-login">
            <button type="submit" class="button-login">Reset Password</button>
          </div>
          <div class="div-register-link">
            <p><a href="#" @click.prevent="switchToLogin">Back to Login</a></p>
          </div>
        </form>
      </div>
    </div>

    <div class="auth-container" v-if="currentView === 'reset-sent'">
      <h1 class="header-main">Check Your Email</h1>
      <p class="message-success">A password reset link has been sent to your email address (if the account exists). Please check your inbox.</p>
      <div class="div-register-link">
        <p><a href="#" @click.prevent="switchToLogin">Back to Login</a></p>
      </div>
    </div>

    <div class="auth-container" v-if="currentView === 'reset-form'">
      <h1 class="header-main">Set New Password</h1>
      <div class="div-login">
        <form @submit.prevent="handleResetPassword">
          <p class="label">New password</p>
          <input 
            class="login-input" 
            type="password" 
            v-model="resetForm.password" 
            placeholder="new password" 
            required 
          /> 
          <div class="div-button-login">
            <button type="submit" class="button-login">Set Password</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Information Window -->
    <div class="auth-container" v-if="currentView === 'info'">
      <h1 class="header-main">{{ infoHeader }}</h1>
      <div class="div-info">
        <p v-html="infoMessage"></p>
      </div>
      <button class="button-info" @click="handleInfoOk">{{ infoButtonText }}</button>
    </div>

    <!-- hCaptcha Modal -->
    <div id="captchaModal" class="dialog-overlay" v-if="showCaptchaModal">
      <div class="modal-content">
        <div 
          class="h-captcha" 
          ref="captchaContainer"
          id="hcaptcha-container"
        ></div>
      </div>
    </div>

    <!-- Error Dialog -->
    <div class="dialog-overlay" v-if="showErrorDialog">
      <div class="dialog-container">
        <div class="dialog-header">
          <h3>{{ dialogTitle }}</h3>
          <button class="dialog-close" @click="hideDialog">&times;</button>
        </div>
        <div class="dialog-content">
          <p>{{ dialogMessage }}</p>
        </div>
        <div class="dialog-actions">
          <button class="button-dialog" @click="hideDialog">OK</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AuthComponent',
  data() {
    return {
      currentView: 'login',
      actionType: 'login',
      email: '',
      
      // Формы
      loginForm: {
        login: '',
        password: ''
      },
      registerForm: {
        username: '',
        login: '',
        email: '',
        password: '',
        confirmPassword: ''
      },
      forgotForm: {
        login: '',
        captcha: '' 
      },
      resetForm: {
        token: '',
        password: ''
      },
      
      // Модальные окна
      showCaptchaModal: false,
      captchaWidgetId: null,
      showErrorDialog: false,
      
      // Диалоговые данные
      dialogTitle: 'Error',
      dialogMessage: 'Invalid username or password. Please try again.',
      
      // Информационное окно
      infoHeader: 'INFO',
      infoMessage: '',
      infoButtonText: 'OK'
    }
  },
  
  mounted() {
    // Загрузка hCaptcha
    this.loadHCaptcha();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('secret_token')) {
        this.resetForm.token = urlParams.get('secret_token');
    }

    // Проверка secret token из URL
    this.checkSecretToken();
  },
  
  methods: {
    // Переключение между формами
    switchToRegister() {
      this.currentView = 'register';
    },
    
    switchToLogin() {
      this.currentView = 'login';
    },
    switchToForgotPassword() {
        this.currentView = 'forgot';
        this.resetCaptchaLogic();
    },
    switchToLogin() {
        this.currentView = 'login';
        this.resetCaptchaLogic();
    },
    resetCaptchaLogic() {
        if (window.hcaptcha && this.captchaWidgetId) {
            window.hcaptcha.remove(this.captchaWidgetId);
            this.captchaWidgetId = null; 
        }
    },
    handleForgotPassword() {
        this.actionType = 'forgot'; 
        this.showCaptchaModal = true;
    },
    handleResetPassword() {
        if (this.resetForm.password.length < 8) {
            this.showDialog('Error', 'The new password must be at least 8 characters long.');
            return;
        }

        fetch('/api/reset_password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.resetForm)
        })
        .then(response => {
            if (response.ok) {
                this.showDialog('Success', 'Your password has been successfully reset. You can now log in.', this.switchToLogin);
                this.switchToLogin();
            } else {
                return response.json().then(error => {
                    this.showDialog('Error', error.message || 'Invalid or expired token. Please request a new link.');
                    this.switchToLogin();
                });
            }
        })
        .catch(error => {
            console.error('Password reset error:', error);
            this.showDialog('Error', 'An unknown error occurred. Please try again later.');
        });
    },
    
    // Обработка логина
    handleLogin() {
      if (!this.validateForm('login')) {
        return;
      }
      this.actionType = 'login';
      this.showCaptchaModal = true;
      // if (window.hcaptcha) {
      //   window.hcaptcha.reset();
      // }
    },
    
    // Обработка регистрации
    handleRegister() {
      if (!this.validateForm('register')) {
        return;
      }
      this.actionType = 'register';
      this.showCaptchaModal = true;
      if (window.hcaptcha) {
        window.hcaptcha.reset();
      }
    },
    
    // Валидация форм
    validateForm(formType) {
      if (formType === 'login') {
        return this.loginForm.login && this.loginForm.password;
      } else {
        return this.validateRegistrationForm();
      }
    },
    
    // Валидация формы регистрации
    validateRegistrationForm() {
      const { username, login, email, password, confirmPassword } = this.registerForm;
      
      const validations = [
        {
          condition: username.length < 2,
          element: "input-username",
          message: "Username must be at least 2 characters long"
        },
        {
          condition: !/^[a-zA-Z][a-zA-Z0-9_@.]{1,}$/.test(login),
          element: "input-register-login",
          message: "Login must start with a letter, contain only Latin letters, numbers, and underscores, and be at least 2 characters long"
        },
        {
          condition: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
          element: "input-email",
          message: "Please enter a valid email address"
        },
        {
          condition: password.length < 8 || 
                  !/[a-z]/.test(password) || 
                  !/[A-Z]/.test(password) || 
                  !/[0-9]/.test(password) || 
                  !/[^a-zA-Z0-9]/.test(password),
          element: "input-register-password",
          message: "Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters"
        },
        {
          condition: password !== confirmPassword,
          element: "input-confirm-password",
          message: "Passwords do not match"
        }
      ];

      for (const validation of validations) {
        if (validation.condition) {
          this.showDialog("Validation Error", validation.message);
          return false;
        }
      }
      
      return true;
    },
    
    // Успешное прохождение капчи
    onCaptchaSuccess(token) {
      if (!token) {
        this.showDialog("Validation", "Please complete the CAPTCHA!");
        return;
      }

      this.showCaptchaModal = false;

      if (this.actionType === 'login') {
        this.loginFetch(token);
      } else if (this.actionType === 'forgot') { 
        this.forgotForm.captcha = token;
        this.executeForgotPassword();
      } else {
        this.registerFetch(token);
      }

      if (window.hcaptcha && this.captchaWidgetId) {
        window.hcaptcha.reset(this.captchaWidgetId);
      }
    },

    executeForgotPassword() {
        fetch('/api/forgot_password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.forgotForm)
        })
        .then(response => {
            // Бэкенд всегда возвращает 200/сообщение об успехе
            if (response.ok || response.status === 401) {
                this.forgotForm.login = ''; 
                this.currentView = 'reset-sent'; // Показать сообщение "Проверьте почту"
            } else {
                this.showDialog('Error', 'An unknown error occurred. Please try again later.');
            }
        })
        .catch(error => {
            console.error('Forgot password error:', error);
            this.showDialog('Error', 'An unknown error occurred. Please try again later.');
        });
    },
    
    // Логин запрос
    async loginFetch(token) {
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            login: this.loginForm.login,
            password: this.loginForm.password,
            captcha: token
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }

        const tokenString = await response.text();
        this.setCookie("jwtToken", tokenString, {});
        this.$emit('login-success')
        //window.location.href = "/";
      } catch (error) {
        console.error("Login error:", error);
        this.showDialog("Login error", error.message);
      }
    },
    
    // Регистрация запрос
    async registerFetch(token) {
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            username: this.registerForm.username,
            login: this.registerForm.login,
            email: this.registerForm.email,
            password: this.registerForm.password,
            captcha: token
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }

        await response.text();
        
        // Показ информационного окна после успешной регистрации
        this.infoHeader = "Verify Your Email Address";
        this.infoMessage = `<p>We've sent a confirmation email to ${this.registerForm.email}.</p><p>Please</p><p>1. check your inbox (and spam/junk folder)</p><p>2. Click the "Confirm Email" button in the email.</p>`;
        this.infoButtonText = "Proceed to Login";
        this.currentView = 'info';
        this.registerForm = {
          username: '',
          login: '',
          email: '',
          password: '',
          confirmPassword: ''
        };
      } catch (error) {
        console.error("Registration error:", error);
        this.showDialog("Registration error", error.message);
      }
    },
    
    // Проверка secret token
    async checkSecretToken() {
      const url = new URL(window.location.href);
      const secretToken = url.searchParams.get('secret_token');
      
      if (secretToken) {
        await this.validateSecretToken(secretToken);
      }
    },
    
    // Валидация secret token
    async validateSecretToken(secretToken) {
      try {
        const params = new URLSearchParams({ secret_token: secretToken });
        const response = await fetch(`/api/secret_token?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }

        const data = await response.json();

        console.log("Token validation response:", data);
        
        if (data.target == "email_confirmation") {
          this.infoHeader = data.header;
          this.infoMessage = data.message;
          this.infoButtonText = "Proceed to Login";
          this.currentView = 'info';
        } else if (data.target == "password_reset") {
          this.currentView = 'reset-form';
        } else {
          throw new Error("Unknown token target");
        }
      } catch (error) {
        console.error("Validation error:", error);
        this.showDialog("Validation error", error.message);
      }
    },
    
    // Обработка кнопки OK в информационном окне
    handleInfoOk() {
      this.currentView = 'login';
    },
    
    // Диалоговые функции
    showDialog(title, message) {
      this.dialogTitle = title;
      this.dialogMessage = message;
      this.showErrorDialog = true;
    },
    
    hideDialog() {
      this.showErrorDialog = false;
    },
    
    // Вспомогательные функции
    setCookie(name, value, options = {}) {
      let cookieString = encodeURIComponent(name) + "=" + encodeURIComponent(value);
      
      const defaults = {
        expires: 1,
        path: '/',
        domain: '',
        secure: true,
        sameSite: 'none'
      };
      
      const optionsToUse = { ...defaults, ...options };
      const expiresDate = new Date(Date.now() + optionsToUse.expires * 24 * 60 * 60 * 1000);
      
      cookieString += "; expires=" + expiresDate.toUTCString();
      cookieString += "; path=" + optionsToUse.path;
      cookieString += "; domain=" + optionsToUse.domain;
      if (optionsToUse.secure) cookieString += "; secure";
      if (optionsToUse.sameSite === 'none') cookieString += "; samesite=none";
      
      document.cookie = cookieString;
    },
    
    loadHCaptcha() {
      if (!document.querySelector('script[src="https://js.hcaptcha.com/1/api.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://js.hcaptcha.com/1/api.js';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }
  },

  watch: {
    showCaptchaModal(newVal) {
      if (newVal) {
        this.$nextTick(() => { 
            
            const container = this.$refs.captchaContainer;
            
            if (window.hcaptcha && container) {
                
                // !!! ГЛАВНОЕ ИЗМЕНЕНИЕ: Если виджет уже существует, удаляем его из DOM/hCaptcha
                if (this.captchaWidgetId) {
                    window.hcaptcha.remove(this.captchaWidgetId);
                    this.captchaWidgetId = null; // Сбросить ID виджета
                    console.log("hCaptcha widget removed and ready for new render.");
                }

                // Теперь всегда вызываем render, так как мы знаем, что DOM-элемент новый
                this.captchaWidgetId = window.hcaptcha.render(
                    container, { 
                        sitekey: 'f1d8ae8c-549a-43dc-a636-8a82ae0aaed8',
                        callback: this.onCaptchaSuccess
                    }
                );
                console.log("hCaptcha widget rendered with ID:", this.captchaWidgetId);
            }
        });
      }
      // Если окно закрывается, можно ничего не делать, так как v-if удалит элемент
    }
  }
}
</script>

<style scoped>
/* Стили наследуются из вашего style.css */
/* Для полной совместимости можно импортировать ваш существующий CSS */
</style>