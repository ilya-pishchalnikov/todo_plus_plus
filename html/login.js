document.getElementById("button-login").onclick = (event) => btnLoginOnClick(event);

document.querySelector('form').addEventListener('submit', function(event) {
    event.preventDefault(); // This stops the page from reloading
  });

function btnLoginOnClick(event) {
    login = document.getElementById("input-login").value;
    password = document.getElementById("input-password").value;
    const jsonBody = JSON.stringify({login: login, password: password});
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
        console.error(error);
        alert(error);
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