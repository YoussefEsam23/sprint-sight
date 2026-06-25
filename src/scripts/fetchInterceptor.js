const originalFetch = window.fetch;

// Variables to manage the "Waiting Line"
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

  // If the backend returns 401 Unauthorized, the 15-minute token expired!
  if (response.status === 401) {
    
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    // Prevent infinite loops (don't intercept if the auth endpoints themselves fail)
    if (url.includes('/api/auth/refresh') || url.includes('/api/auth/login') || url.includes('/api/auth/signup')) {
      return response;
    }

    // --- RACE CONDITION FIX ---
    // If we are ALREADY refreshing the token, put this request in the waiting line!
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => {
        // Once the queue is processed (refresh is successful), retry THIS request
        if (args[1] && args[1].headers && !(args[1].headers instanceof Headers)) {
          if (args[1].headers['X-XSRF-TOKEN']) args[1].headers['X-XSRF-TOKEN'] = getCookie('XSRF-TOKEN');
        }
        return originalFetch(...args);
      }).catch(err => {
        return response; // Return the original 401 if the refresh failed entirely
      });
    }

    // We are the FIRST request to get a 401! Lock the door.
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
    } catch (error) {
      isRefreshing = false;
      processQueue(error);
      return response;
    }
  }

  // If it wasn't a 401, just return the response normally
  return response;
};