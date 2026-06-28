const originalFetch = window.fetch;

// Variables to manage the "Waiting Line" for JWT refreshes
let isRefreshing = false;
let failedQueue = [];

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// Process all waiting requests once the token is refreshed
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

window.fetch = async (...args) => {
  let response = await originalFetch(...args);

  // =========================================================================
  // --- NEW: SILENT CSRF RETRY (403 FORBIDDEN) ---
  // =========================================================================
  if (response.status === 403) {
    let init = args[1] || {};
    
    // Check our custom flag to prevent infinite loops (if it truly is a permissions error)
    if (!init._csrfRetried) {
      init._csrfRetried = true; // Mark this request as retried
      args[1] = init;

      const newCsrfToken = getCookie('XSRF-TOKEN');
      
      // If Spring planted the cookie during the 403 rejection, grab it and retry!
      if (newCsrfToken) {
        if (init.headers instanceof Headers) {
          init.headers.set('X-XSRF-TOKEN', newCsrfToken);
        } else if (init.headers) {
          init.headers['X-XSRF-TOKEN'] = newCsrfToken;
        } else {
          init.headers = { 'X-XSRF-TOKEN': newCsrfToken };
        }
        
        // Silently retry the request with the new token
        response = await originalFetch(...args);
      }
    }
  }

  // =========================================================================
  // --- EXISTING: JWT REFRESH RETRY (401 UNAUTHORIZED) ---
  // =========================================================================
  if (response.status === 401) {
    
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    // Prevent infinite loops (don't intercept if the auth endpoints themselves fail)
    if (url.includes('/api/auth/refresh') || url.includes('/api/auth/login') || url.includes('/api/auth/signup')) {
      return response;
    }

    // If we are ALREADY refreshing the token, put this request in the waiting line
    if (isRefreshing) {
      return new Promise(function(resolve, reject) {
        failedQueue.push({ resolve, reject });
      }).then(() => {
        // Once the line moves, grab the latest CSRF token and try again
        if (args[1] && args[1].headers && !(args[1].headers instanceof Headers)) {
          if (args[1].headers['X-XSRF-TOKEN']) {
            args[1].headers['X-XSRF-TOKEN'] = getCookie('XSRF-TOKEN');
          }
        }
        return originalFetch(...args);
      }).catch(err => {
        return Promise.reject(err);
      });
    }

    // Lock the door. We are the first one to get a 401, so we do the refreshing.
    isRefreshing = true;

    try {
      // Ask backend for a new token
      const refreshResponse = await originalFetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
        }
      });

      if (refreshResponse.ok) {
        // Success! The backend planted a fresh cookie.
        isRefreshing = false;
        
        // Tell everyone waiting in the queue to proceed!
        processQueue(null);

        // Update the CSRF token for THIS request and retry it
        if (args[1] && args[1].headers && !(args[1].headers instanceof Headers)) {
          if (args[1].headers['X-XSRF-TOKEN']) {
            args[1].headers['X-XSRF-TOKEN'] = getCookie('XSRF-TOKEN');
          }
        }
        
        return await originalFetch(...args);
      } else {
        // The 7-day refresh token is dead, or the user was deleted. Kick them out.
        isRefreshing = false;
        processQueue(new Error('Session expired'));
        
        localStorage.removeItem('sprintSightUser');
        localStorage.removeItem('sprintSightToken');
        window.location.href = '/';
        return response;
      }
    } catch (err) {
      isRefreshing = false;
      processQueue(err);
      return Promise.reject(err);
    }
  }

  // Return the successful response (or the failed one if it wasn't 401 or 403)
  return response;
};