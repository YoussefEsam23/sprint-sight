import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import './Login.css';

// --- 1. DEFINE OUR ZOD SCHEMAS (The Blueprints) ---

// Schema for when they are logging in (just checks that fields aren't empty)
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Schema for when they are signing up (enforces strict length rules)
const signUpSchema = z.object({
  username: z.string().min(8, "Username must be at least 8 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const Login = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [message, setMessage] = useState(''); 
  const [isError, setIsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [/* isLoading */, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  // --- 2. INITIALIZE REACT HOOK FORM ---
  const {
    register,           // Wires up the inputs to the form
    handleSubmit,       // Intercepts the submit button to run validation
    formState: { errors }, // Holds any validation errors automatically
    reset               // Easily clears the form
  } = useForm({
    // Dynamically switch the blueprint based on which view we are in
    resolver: zodResolver(isLoginView ? loginSchema : signUpSchema),
    mode: "onChange"    // Magic setting: Validates in real-time as they type!
  });

  useEffect(() => {
    const existingData = localStorage.getItem('sprintSightUser');
    if (!existingData) {
      const fakeDatabaseUser = { username: 'admin', password: 'password123' };
      localStorage.setItem('sprintSightUser', JSON.stringify(fakeDatabaseUser));
    }
  }, []);

  // Notice the "async" keyword here!
  const onSubmit = async (data) => {
    setIsLoading(true); // Disable the button and show loading state
    setMessage('');
    setIsError(false);

    try {
      if (isLoginView) {
        // --- 1. REAL API LOGIN ---
        // Replace this URL with your actual backend Login endpoint
        const response = await fetch('https://sprintsight-back.onrender.com/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: data.username,
            password: data.password
          })
        });

        const result = await response; // Convert the server's response to JSON
        // Check if the server responded with a success status (like 200 OK)
        if (response.ok) {
          // Real APIs usually return a security token (JWT). Save that instead of the password!
          localStorage.setItem('sprintSightToken', result.token); 
          
          setIsError(false);
          setMessage('Login successful! Redirecting...');
          setTimeout(() => { navigate('/home'); }, 1000); 
        } else {
          // If the server says 401 Unauthorized or 404 Not Found
          setIsError(true);
          // Try to use the error message sent by your backend, or a default one
          setMessage(result.message || 'Invalid username or password.'); 
        }

      } else {
        // --- 2. REAL API SIGN UP ---
        // Replace this URL with your actual backend Sign Up endpoint
        const response = await fetch('http://localhost:5000/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: data.username,
            password: data.password
          })
        });

        const result = await response.json();
        
        if (response.ok) {
          reset(); // Clear the form
          setIsError(false);
          setMessage('Account created successfully! Please log in.');
          setIsLoginView(true); // Flip back to login screen
        } else {
          setIsError(true);
          setMessage(result.message || 'Failed to create account. Username might be taken.');
        }
      }
    } catch (error) {
      // --- 3. NETWORK ERRORS ---
      // This catches issues like the server being completely offline
      console.error("API Connection Error:", error);
      setIsError(true);
      setMessage('Network error. Cannot connect to the server.');
    } finally {
      // Whether it succeeded or failed, turn off the loading state
      setIsLoading(false); 
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setMessage('');
    reset(); // Clears any typed text and hides all errors instantly
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        
        <div className="logo-section">
          <img 
            src="/sprint-sight-logo.png" 
            alt="Sprint Sight Logo" 
            className="logo-image" 
            onError={(e) => { e.target.onerror = null; // <-- THIS IS THE MAGIC LINE! It stops the loop.
                              /* e.target.src = 'https://via.placeholder.com/100x100?text=Logo'; */ }}
          />
          <h1 className="app-title">Sprint Sight</h1>
          <h3 style={{ color: '#1a2238', marginTop: '1rem', fontWeight: '600' }}>
            {isLoginView ? 'Welcome Back' : 'Create an Account'}
          </h3>
        </div>

        {/* Notice we wrap onSubmit inside hook form's handleSubmit */}
        <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
          
          {/* Username Input Group */}
          <div className="input-group">
            <input
              type="text"
              placeholder="username"
              className={`custom-input ${errors.username ? 'input-error' : ''}`}
              {...register("username")} // This links the input to Zod
            />
            {/* Display automatic errors */}
            {errors.username && <span className="error-text">{errors.username.message}</span>}
          </div>
          
          {/* Password Input Group */}
          <div className="input-group">
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="password"
                className={`custom-input ${errors.password ? 'input-error' : ''}`}
                {...register("password")} // This links the input to Zod
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️‍🗨️" : "👁️"}
              </button>
            </div>
            {/* Display automatic errors */}
            {errors.password && <span className="error-text">{errors.password.message}</span>}
          </div>
          
          {message && (
            <p style={{ color: isError ? '#e74c3c' : '#2ecc71', fontWeight: '600', marginBottom: '1rem', textAlign: 'center' }}>
              {message}
            </p>
          )}

          <button type="submit" className="btn btn-login">
            {isLoginView ? 'Login' : 'Create Account'}
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