let action_type = 'login';
let email = ""
const url = new URL(window.location.href);
const secretToken = url.searchParams.get('secret_token');

logger.log("secretToken:", secretToken);

document.getElementById("button-login").onclick = (event) => btnLoginOnClick(event);
document.getElementById("button-register").onclick = (event) => btnRegisterOnClick(event);

document.querySelector('#loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // This stops the page from reloading
  });
document.querySelector('#registrationForm').addEventListener('submit', function(event) {
    event.preventDefault(); // This stops the page from reloading
  });

// Toggle between login and registration forms
document.getElementById('register-link').addEventListener('click', function(e) {
    e.preventDefault();    
    document.querySelector('.auth-container').style.display = 'none';
    document.getElementById('registration-container').style.display = 'block';    
});

document.getElementById('login-link').addEventListener('click', function(e) {
    e.preventDefault();    
    document.querySelector('.auth-container').style.display = 'block';
    document.getElementById('registration-container').style.display = 'none';
});

if (secretToken) {
    validateSecretToken(secretToken)
}

function btnLoginOnClick(event) {
    const form = document.getElementById("loginForm")
    if (!form.reportValidity()) {
        return;
    }
    action_type = 'login'
    hcaptcha.reset();
    document.getElementById("captchaModal").style.display = "flex";
}


function btnRegisterOnClick(event) {
    const form = document.getElementById("registrationForm")
    if (!form.reportValidity()) {
        return;
    }
    action_type = 'register'
    hcaptcha.reset();
    document.getElementById("captchaModal").style.display = "flex";
}


function onCaptchaSuccess(token) {
    if (!token) {
        showDialog("Validation", "Please complete the CAPTCHA!");
        return;
    }

    document.getElementById("captchaModal").style.display = "none";

    if (action_type == 'login') {
        loginFetch(token);
    } else {
        registerFetch(token);
    }
}

function loginFetch(token) {
    login = document.getElementById("input-login").value;
    password = document.getElementById("input-password").value;
    const jsonBody = JSON.stringify({login: login, password: password, captcha: token});
    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: jsonBody
    })
    .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        return Promise.reject(text); // Properly reject with the error text
                    });
                } else{
                    return response;
                }
            }
        )
    .then(response => response.text())
    .then (tokenString => {
        setCookie("jwtToken", tokenString, {})
        window.location.href= "/";
    })
    .catch(error => {
        logger.error(error);
        showDialog("Login error", error);
    });
}

function registerFetch(token) {
    const username = document.getElementById("input-username").value;
    const login = document.getElementById("input-register-login").value;
    email = document.getElementById("input-email").value;
    const password = document.getElementById("input-register-password").value;
    const confirmPassword = document.getElementById("input-confirm-password").value;

    // Validation rules
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

    // Check all validations
    for (const validation of validations) {
        if (validation.condition) {
            showDialog("Validation Error", validation.message);
            document.getElementById(validation.element).focus();
            return false;
        }
    }

    const jsonBody = JSON.stringify({username: username, login: login, email:email, password: password, captcha: token});
    fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: jsonBody
    })
    .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        return Promise.reject(text); // Properly reject with the error text
                    });
                } else{
                    return response;
                }
            }
        )
    .then(response => response.text())
    .then (response => {
        document.getElementById('info-header').textContent = "Verify Your Email Address";
        document.getElementById('info-message').innerHTML = `<p>We've sent a confirmation email to ${email}.</p><p>Please</p><p>1. check your inbox (and spam/junk folder)</p><p>2. Click the "Confirm Email" button in the email.</p>`;
        document.getElementById('button-info').textContent = "Proceed to Login";

        document.getElementById('button-info').onclick = (event) => {
            document.getElementById('information-container').style.display = 'none';
            document.getElementById('auth-container').style.display = 'block';
        }
        
        document.getElementById('registration-container').style.display = 'none';
        document.getElementById('information-container').style.display = 'block';
        document.getElementById('registrationForm').reset();

    })
    .catch(error => {
        logger.error(error);
        showDialog("Registration error", error);
    });
}

function validateSecretToken(secretToken) {

    const params = new URLSearchParams({
        secret_token: secretToken
      })
    
    fetch(`/api/confirm_email?${params}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    })
    .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        return Promise.reject(text); // Properly reject with the error text
                    });
                } else{
                    return response;
                }
            }
        )
    .then(response => response.json())
    .then (response => {
        document.getElementById('info-header').textContent = response.header;
        document.getElementById('info-message').textContent = response.message;
        document.getElementById('button-info').textContent = "Proceed to Login";

        document.getElementById('button-info').onclick = (event) => {
            document.getElementById('information-container').style.display = 'none';
            document.getElementById('registration-container').style.display = 'none';
            document.getElementById('auth-container').style.display = 'block';
        }

        document.getElementById('registration-container').style.display = 'none';
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('information-container').style.display = 'block';
    })
    .catch(error => {
        logger.error(error);
        showDialog("Validation error", error);
    });
}

function setCookie(name, value, options = {}) {
    let cookieString = encodeURIComponent(name) + "=" + encodeURIComponent(value);
  
    // Опции по умолчанию
    const defaults = {
        expires: 1, // days
        path: '/',
        domain: '', 
        secure: true, // https
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
}

function getCookieByName(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) {
        return match[2];
    }
    return null;
}

// Dialog functions
function showDialog(title, message) {
    document.getElementById('dialog-title').textContent = title;
    document.getElementById('dialog-message').textContent = message;
    document.getElementById('dialog-overlay').style.display = 'flex';
}

function hideDialog() {
    document.getElementById('dialog-overlay').style.display = 'none';
}

// Dialog event listeners
document.getElementById('dialog-close').addEventListener('click', hideDialog);
document.getElementById('dialog-confirm').addEventListener('click', hideDialog);