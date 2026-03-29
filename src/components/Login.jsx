import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import '../styling/Login.css';
import logoLight from '/sprint-sight-logo.png';
import logoDark from '/sprint-sight-logo-dark.png';
// --- SET YOUR REAL API URL HERE ---
const API_BASE_URL = 'https://sprintsight-back.onrender.com/api/auth'; // Change this to your actual backend URL

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z.object({
  username: z.string().min(8, "Username must be at least 8 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
      if (isLoginView) {
        // --- 1. REAL LOGIN API CALL ---
        const response = await fetch(`api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': getCookie('XSRF-TOKEN')
           },
          body: JSON.stringify({
            username: data.username,
            password: data.password,
            Credentials: 'include' // Ensure cookies are included for CORS requests
          })
        });

        const result = await response.json();

        if (response.ok) {
          // Success! Save the real JWT token securely
          localStorage.setItem('sprintSightToken', result.token);
          // Optional: Save user data if your API returns it
          if (result.user) {
            localStorage.setItem('sprintSightUser', JSON.stringify(result.user));
          }
          
          setIsError(false);
          setMessage('Login successful! Redirecting...');
          setTimeout(() => { navigate('/dashboard'); }, 800);
        } else {
          // API rejected the login (e.g., wrong password)
          setIsError(true);
          setMessage(result.message || 'Invalid username or password.');
        }
      } else {
        // --- 2. REAL SIGNUP API CALL ---
        const response = await fetch(`${API_BASE_URL}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: data.username,
            password: data.password,
            Credentials: 'include' // Ensure cookies are included for CORS requests
          })
        });

        const result = await response.json();

        if (response.ok) {
          reset();
          setIsError(false);
          setMessage('Account created successfully! Please log in.');
          setIsLoginView(true); // Flip back to the login screen
        } else {
          // API rejected signup (e.g., username already exists)
          setIsError(true);
          setMessage(result.message || 'Failed to create account. Username might be taken.');
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
          <div className="input-group">
            <input
              type="text"
              placeholder="username"
              className={`custom-input ${errors.username ? 'input-error' : ''}`}
              {...register("username")}
            />
            {errors.username && <span className="error-text">{errors.username.message}</span>}
          </div>

          <div className="input-group">
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="password"
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