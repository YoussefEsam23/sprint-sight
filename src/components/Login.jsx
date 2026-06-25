import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import '../styling/Login.css';
import logoLight from '/sprint-sight-logo.png';
import logoDark from '/sprint-sight-logo-dark.png';

// --- 1. UPDATED VALIDATION SCHEMAS ---
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z.object({
  fullName: z.string()
    .min(1, "Full name is required")
    .max(100, "Full name cannot exceed 100 characters"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username cannot exceed 50 characters"),
  email: z.string()
    .email("Invalid email address")
    .max(255, "Email cannot exceed 255 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(255, "Password cannot exceed 255 characters"),
});

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const Login = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [theme, setTheme] = useState(localStorage.getItem('sprintSightTheme') || 'system');
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(isLoginView ? loginSchema : signUpSchema),
    mode: "onChange"
  });

    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const logoSrc = isDark ? logoDark : logoLight;

  // Theme Logic
  useEffect(() => {
    const applyTheme = (selectedTheme) => {
      if (selectedTheme === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', systemDark ? 'dark' : 'light');
      } else {
        document.documentElement.setAttribute('data-theme', selectedTheme);
      }
    };
    applyTheme(theme);
    localStorage.setItem('sprintSightTheme', theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => { if (theme === 'system') applyTheme('system'); };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return '☀️';
    if (theme === 'dark') return '🌙';
    return '💻';
  };

  // --- REAL API SUBMISSION LOGIC ---
  const onSubmit = async (data) => {
    setIsLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const token = localStorage.getItem('sprintSightToken');
      if (isLoginView) {
        // --- LOGIN API CALL ---

        const response = await fetch(`api/auth/login`, {
          method: 'POST',
          credentials: 'include', // Fixed: This belongs outside the body
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
          },
          body: JSON.stringify({
            username: data.username,
            password: data.password
          })
        });

        const result = await response.json();

        if (response.ok) {
          localStorage.setItem('sprintSightToken', result.token);
          if (result.data) localStorage.setItem('sprintSightUser', JSON.stringify(result.data));
          
          setIsError(false);
          setMessage('Login successful! Redirecting...');
          setTimeout(() => { navigate('/dashboard'); }, 800);
        } else {
          setIsError(true);
          setMessage(result.message || 'Invalid username or password.');
        }
      } else {

        // --- 2. UPDATED SIGNUP API CALL ---
        const response = await fetch(`api/auth/signup`, {
          method: 'POST',
          credentials: 'include', // Fixed: Ensure cookies work for CORS
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') // Included just in case your backend requires it for signup too
          },
          body: JSON.stringify({
            fullName: data.fullName,
            username: data.username,
            email: data.email,
            password: data.password
          })
        });

        const result = await response.json();

        if (response.ok) {
          reset();
          setIsError(false);
          setMessage('Account created successfully! Please log in.');
          setIsLoginView(true); // Flip back to the login screen
        } else {
          setIsError(true);
          // Safely extract the backend error message if they sent one
          setMessage(result.message || result.error || 'Failed to create account. Username or Email might be taken.');
        }
      }
    } catch (error) {
      console.error("API Error:", error);
      setIsError(true);
      setMessage('Network error. Ensure the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setMessage('');
    reset();
  };

  return (
    <div className="login-wrapper">
      <button className="login-theme-toggle" onClick={cycleTheme} title={`Theme: ${theme}`}>
        {getThemeIcon()}
      </button>

      <div className="bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
        <div className="shape shape-5"></div>
        <div className="shape shape-6"></div>
      </div>

      <div className="login-container">
        <div className="logo-section">
          <img
            src={logoSrc}
            alt="Sprint Sight Logo"
            className="logo-image"
            onError={(e) => { e.target.onerror = null; }}
          />
          <h1 className="app-title">Sprint Sight</h1>
          <h3 style={{ color: 'var(--text-main)', marginTop: '1rem', fontWeight: '600', transition: 'color var(--transition-fast)' }}>
            {isLoginView ? 'Welcome Back' : 'Create an Account'}
          </h3>
        </div>

        <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
          
          {/* --- NEW: EXTRA FIELDS FOR SIGN UP ONLY --- */}
          {!isLoginView && (
            <>
              <div className="input-group" style={{ width: '100%' }}>
                <input
                  type="text"
                  placeholder="Full Name"
                  className={`custom-input ${errors.fullName ? 'input-error' : ''}`}
                  {...register("fullName")}
                />
                {errors.fullName && <span className="error-text">{errors.fullName.message}</span>}
              </div>

              <div className="input-group" style={{ width: '100%' }}>
                <input
                  type="email"
                  placeholder="Email Address"
                  className={`custom-input ${errors.email ? 'input-error' : ''}`}
                  {...register("email")}
                />
                {errors.email && <span className="error-text">{errors.email.message}</span>}
              </div>
            </>
          )}

          {/* --- ALWAYS VISIBLE FIELDS --- */}
          <div className="input-group" style={{ width: '100%' }}>
            <input
              type="text"
              placeholder="Username"
              className={`custom-input ${errors.username ? 'input-error' : ''}`}
              {...register("username")}
            />
            {errors.username && <span className="error-text">{errors.username.message}</span>}
          </div>

          <div className="input-group" style={{ width: '100%' }}>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className={`custom-input ${errors.password ? 'input-error' : ''}`}
                {...register("password")}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "👁️‍🗨️" : "👁️"}
              </button>
            </div>
            {errors.password && <span className="error-text">{errors.password.message}</span>}
          </div>

          {message && (
            <p style={{ color: isError ? '#e74c3c' : '#2ecc71', fontWeight: '600', marginBottom: '1rem', textAlign: 'center' }}>
              {message}
            </p>
          )}

          <button type="submit" className="btn btn-login" disabled={isLoading}>
            {isLoading
              ? 'Please wait...'
              : (isLoginView ? 'Login' : 'Create Account')
            }
          </button>
        </form>

        <div className="signup-section">
          <p>{isLoginView ? "Don't have an account yet?" : "Already have an account?"}</p>
          <button type="button" className="btn btn-signup" onClick={toggleView}>
            {isLoginView ? 'Sign up' : 'Back to Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;